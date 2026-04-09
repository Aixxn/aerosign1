import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import base64
import cv2
import numpy as np

from api.config import CORS_ORIGINS, API_HOST, API_PORT, DEBUG, LOG_LEVEL, PRODUCTION_MODE
from api.utils import model_loader, initialize_models
from api.hand_detection import get_hand_detector, initialize_hand_detector
from api.schemas import (
    VerificationRequest,
    VerificationResponse,
    HealthResponse,
    ModelsListResponse,
    SetActiveModelResponse,
    ErrorResponse,
    APIInfoResponse,
    SignatureSaveRequest,
    SignatureSaveResponse,
    UserSignaturesListResponse,
    VerifyAgainstUserRequest,
    VerifyAgainstUserResponse
)
from api.inference import verify_signatures
from api.storage import get_signature_storage
from api.security import rate_limit_middleware, validate_request_data, input_validator

logging.basicConfig(
    level=LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Aerosign API",
    description="Real-time signature verification using Siamese LSTM neural networks",
    version="1.0.0",
    docs_url="/docs" if not PRODUCTION_MODE else None,  # Disable Swagger UI in production
    redoc_url="/redoc" if not PRODUCTION_MODE else None,  # Disable ReDoc in production  
    openapi_url="/openapi.json" if not PRODUCTION_MODE else None  # Disable OpenAPI schema in production
)

# Security middleware (must be added before CORS)
# app.middleware("http")(rate_limit_middleware)  # Disabled for PoC testing

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS configured for origins: {CORS_ORIGINS}")

@app.on_event("startup")
async def startup_event():
    """
    Initialize models and resources on application startup.
    """
    logger.info("=" * 70)
    logger.info("STARTING AEROSIGN API")
    logger.info("=" * 70)
    
    try:
        if not initialize_models():
            logger.error("Failed to initialize models on startup!")
            raise RuntimeError("Model initialization failed")
        
        # Initialize hand detection for camera frame processing
        initialize_hand_detector()
        
        logger.info("✓ API startup complete")
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """
    Cleanup on application shutdown.
    """
    logger.info("Shutting down Aerosign API")

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle ValueError with proper response"""
    logger.warning(f"Validation error: {str(exc)}")
    return JSONResponse(
        status_code=400,
        content=ErrorResponse(
            status="validation_error",
            message=str(exc)
        ).model_dump()
    )


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request, exc):
    """Handle RuntimeError with proper response"""
    logger.error(f"Runtime error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            status="error",
            message="An error occurred during processing",
            detail=str(exc)
        ).model_dump()
    )


@app.get("/", response_model=APIInfoResponse)
async def root():
    """
    Root endpoint - returns API information.
    """
    info = model_loader.get_model_info()
    return APIInfoResponse(
        app_name="Aerosign API",
        version="1.0.0",
        description="Real-time signature verification using Siamese LSTM",
        endpoints={
            "health": "GET /health",
            "info": "GET /",
            "list_models": "GET /api/models",
            "verify": "POST /api/verify",
            "set_model": "POST /api/set-active-model/{model_name}",
            "docs": "GET /docs",
            "redoc": "GET /redoc"
        },
        models_loaded=info["total_models"],
        active_model=info["active_model"]
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    
    Returns status of API and loaded models.
    
    **Returns:**
    - `status`: "ok" if healthy
    - `models_loaded`: Number of trained models in memory  
    - `active_model`: Currently active model name
    """
    try:
        info = model_loader.get_model_info()
        return HealthResponse(
            status="ok",
            models_loaded=info["total_models"],
            active_model=info["active_model"]
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        # In production, don't expose internal error details
        if PRODUCTION_MODE:
            raise HTTPException(status_code=503, detail="Service unavailable")
        else:
            raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")


@app.get("/api/models", response_model=ModelsListResponse)
async def list_models():
    """
    List all available trained models.
    
    Returns information about all loaded models and which one is currently active.
    
    **Returns:**
    - `available_models`: List of model names (combo_1, combo_2, etc.)
    - `active_model`: Name of the currently active model
    
    **Example:**
    ```json
    {
      "available_models": ["combo_1", "combo_2", "combo_3", "combo_4", "combo_5", "combo_6"],
      "active_model": "combo_1"
    }
    ```
    """
    logger.debug("Fetching list of available models")
    return ModelsListResponse(
        available_models=model_loader.list_models(),
        active_model=model_loader.active_model
    )


@app.post("/api/set-active-model/{model_name}", response_model=SetActiveModelResponse)
async def set_active_model(model_name: str):
    """
    Switch to a different trained model.
    
    Subsequent verification requests will use this model.
    
    **Parameters:**
    - `model_name`: Name of model to activate (e.g., "combo_1", "combo_2")
    
    **Returns:**
    - `status`: "success" or error message
    - `active_model`: The newly active model name
    
    **Example:**
    ```
    POST /api/set-active-model/combo_2
    ```
    
    **Response:**
    ```json
    {
      "status": "success",
      "active_model": "combo_2"
    }
    ```
    """
    logger.info(f"Attempting to set active model: {model_name}")
    
    if model_loader.set_active_model(model_name):
        logger.info(f"✓ Active model changed to: {model_name}")
        return SetActiveModelResponse(
            status="success",
            active_model=model_loader.active_model
        )
    else:
        available = model_loader.list_models()
        logger.warning(f"Model '{model_name}' not found. Available: {available}")
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_name}' not found. Available models: {available}"
        )


@app.post("/api/verify", response_model=VerificationResponse)
async def verify(request: VerificationRequest):
    """
    Verify if two signatures match.
    
    Compares two signatures and returns whether they are from the same person
    with a confidence score.
    
    **Request Body:**
    - `signature1`: First signature as array of [x, y, timestamp] tuples
    - `signature2`: Second signature as array of [x, y, timestamp] tuples
    - `model_name`: (optional) Which model to use. Defaults to active model.
    
    **Returns:**
    - `match`: Boolean - True if signatures match (same person)
    - `confidence`: Float 0-100 - Confidence percentage
    - `distance`: Float 0-2 - Cosine distance (lower = more similar)
    - `threshold`: Float - Decision threshold used
    - `model_used`: String - Which model was used
    
    **Example Request:**
    ```json
    {
      "signature1": [
        [100.0, 200.0, 0.0],
        [105.0, 195.0, 0.05],
        [110.0, 190.0, 0.10]
      ],
      "signature2": [
        [100.0, 200.0, 0.0],
        [105.0, 195.0, 0.05],
        [110.0, 190.0, 0.10]
      ],
      "model_name": "combo_1"
    }
    ```
    
    **Example Response (Match):**
    ```json
    {
      "match": true,
      "confidence": 92.5,
      "distance": 0.15,
      "threshold": 0.75,
      "model_used": "combo_1"
    }
    ```
    
    **Errors:**
    - 400: Invalid signature format or too few points
    - 404: Model not found
    - 500: Inference error
    """
    logger.info("Received verification request")
    logger.debug(f"  Signature 1: {len(request.signature1)} points")
    logger.debug(f"  Signature 2: {len(request.signature2)} points")
    logger.debug(f"  Model: {request.model_name or 'default (active)'}")
    
    try:
        # Call inference function
        result = verify_signatures(
            signature1=request.signature1,
            signature2=request.signature2,
            model_name=request.model_name if request.model_name else None
        )
        
        logger.info(f"✓ Verification successful: match={result.match}, confidence={result.confidence}%")
        return result
    
    except ValueError as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except RuntimeError as e:
        logger.error(f"Inference error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )


@app.post("/api/process-frame")
async def process_frame(request: dict):
    """
    Process a video frame to detect hand landmarks.
    Used by frontend to get hand detection without running MediaPipe client-side.
    
    **Request:**
    ```json
    {
      "frame": "base64_encoded_image_data"
    }
    ```
    
    **Response:**
    ```json
    {
      "detected": true,
      "index_finger": [320, 240],
      "middle_finger": [330, 245],
      "finger_distance": 15.5,
      "in_signature_area": true,
      "landmarks": [[x1, y1], [x2, y2], ...]
    }
    ```
    
    **Errors:**
    - 400: Invalid frame format or encoding
    - 500: Processing error
    """
    try:
        # Decode base64 frame
        if 'frame' not in request or not request['frame']:
            raise ValueError("Missing 'frame' field in request")
        
        # Remove data URI prefix if present (data:image/jpeg;base64,...)
        frame_data = request['frame']
        if ',' in frame_data:
            frame_data = frame_data.split(',')[1]
        
        # Decode from base64
        frame_bytes = base64.b64decode(frame_data)
        frame_array = np.frombuffer(frame_bytes, dtype=np.uint8)
        frame = cv2.imdecode(frame_array, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise ValueError("Failed to decode image data")
        
        # Process frame with hand detector
        detector = get_hand_detector()
        result = detector.process_frame(frame)
        
        # Remove landmarks from response (too large to send frequently)
        # Only return it if landmarks are needed for debugging
        if 'landmarks' in result:
            result.pop('landmarks')
        
        logger.debug(f"Frame processed: detected={result['detected']}, distance={result['finger_distance']:.1f}")
        return result
    
    except ValueError as e:
        logger.warning(f"Frame processing validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Frame processing error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Frame processing failed: {str(e)}"
        )


@app.post("/api/signatures/save", response_model=SignatureSaveResponse)
async def save_signature(request: SignatureSaveRequest):
    """
    Save a captured signature for later verification.
    
    Stores the signature data associated with a user and session for future
    'same person' verification attempts.
    
    **Request Body:**
    - `signature_data`: Signature as [x, y, timestamp] tuples (5-1000 points)
    - `user_id`: Unique identifier for the user (1-100 chars)
    - `session_id`: Session identifier (1-100 chars)
    - `metadata`: Optional metadata dictionary
    
    **Returns:**
    - `signature_id`: Unique identifier for the saved signature
    - `saved_successfully`: Boolean success indicator
    - `message`: Success or error message
    - `user_signature_count`: Total signatures for this user
    
    **Example Request:**
    ```json
    {
      "signature_data": [
        [100.0, 200.0, 0.0],
        [105.0, 195.0, 0.05],
        [110.0, 190.0, 0.10]
      ],
      "user_id": "user_12345", 
      "session_id": "session_67890",
      "metadata": {
        "device": "desktop",
        "browser": "chrome"
      }
    }
    ```
    
    **Errors:**
    - 400: Invalid signature data or user/session ID
    - 500: Storage error
    """
    logger.info(f"Received save signature request for user {request.user_id}")
    logger.debug(f"  Signature points: {len(request.signature_data)}")
    logger.debug(f"  Session: {request.session_id}")
    
    try:
        # Additional security validation
        validation_error = validate_request_data({
            "user_id": request.user_id,
            "session_id": request.session_id,
            "signature_data": request.signature_data,
            "metadata": request.metadata
        }, "save")
        
        if validation_error:
            logger.warning(f"Security validation failed: {validation_error}")
            raise ValueError(validation_error)
        
        # Validate signature data (basic validation)
        if len(request.signature_data) < 5:
            raise ValueError("Signature must have at least 5 points")
        
        if len(request.signature_data) > 1000:
            raise ValueError("Signature cannot exceed 1000 points")
        
        # Validate point format
        for i, point in enumerate(request.signature_data):
            if len(point) != 3:
                raise ValueError(f"Point {i} must have exactly 3 values [x, y, timestamp]")
            
            x, y, timestamp = point
            if not all(isinstance(val, (int, float)) for val in [x, y, timestamp]):
                raise ValueError(f"Point {i} contains non-numeric values")
        
        # Sanitize metadata strings
        sanitized_metadata = {}
        if request.metadata:
            for key, value in request.metadata.items():
                if isinstance(value, str):
                    sanitized_metadata[key] = input_validator.sanitize_string(value)
                else:
                    sanitized_metadata[key] = value
        
        # Save to storage
        storage = get_signature_storage()
        signature_id, success = storage.save_signature(
            user_id=request.user_id,
            session_id=request.session_id,
            signature_data=[[float(x), float(y), float(t)] for x, y, t in request.signature_data],
            metadata=sanitized_metadata
        )
        
        if success:
            user_count = storage.get_user_signature_count(request.user_id)
            logger.info(f"✓ Signature saved: {signature_id} (user now has {user_count} signatures)")
            
            return SignatureSaveResponse(
                signature_id=signature_id,
                saved_successfully=True,
                message="Signature saved successfully",
                user_signature_count=user_count
            )
        else:
            logger.error("Failed to save signature to storage")
            raise HTTPException(
                status_code=500,
                detail="Failed to save signature to storage"
            )
    
    except ValueError as e:
        logger.warning(f"Signature save validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Signature save error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save signature: {str(e)}"
        )


@app.get("/api/users/{user_id}/signatures", response_model=UserSignaturesListResponse)
async def get_user_signatures(user_id: str):
    """
    Get all saved signatures for a user.
    
    Returns metadata about all signatures saved for the specified user,
    including signature IDs, save timestamps, and point counts.
    
    **Parameters:**
    - `user_id`: User identifier
    
    **Returns:**
    - `user_id`: The user identifier
    - `signatures`: List of signature metadata
    - `total_count`: Total number of signatures
    
    **Example Response:**
    ```json
    {
      "user_id": "user_12345",
      "total_count": 2,
      "signatures": [
        {
          "signature_id": "sig_abc123",
          "saved_at": "2024-01-15T10:30:00Z",
          "point_count": 45,
          "session_id": "session_67890"
        }
      ]
    }
    ```
    """
    logger.info(f"Fetching signatures for user: {user_id}")
    
    try:
        # Validate user_id parameter
        validation_error = validate_request_data({"user_id": user_id}, "user_id")
        if validation_error:
            logger.warning(f"Security validation failed for user_id: {validation_error}")
            raise ValueError(validation_error)
        
        storage = get_signature_storage()
        signatures = storage.get_user_signatures(user_id)
        
        signature_list = [sig.to_dict() for sig in signatures]
        
        logger.info(f"✓ Found {len(signatures)} signatures for user {user_id}")
        
        return UserSignaturesListResponse(
            user_id=user_id,
            signatures=signature_list,
            total_count=len(signature_list)
        )
    
    except Exception as e:
        logger.error(f"Error fetching user signatures: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch signatures: {str(e)}"
        )


@app.post("/api/users/{user_id}/verify", response_model=VerifyAgainstUserResponse)
async def verify_against_user(user_id: str, request: VerifyAgainstUserRequest):
    """
    Verify a signature against all saved signatures for a user.
    
    Compares the provided signature against all saved signatures for the
    specified user and returns the best match result.
    
    **Parameters:**
    - `user_id`: User to verify against
    
    **Request Body:**
    - `signature_data`: Signature to verify as [x, y, timestamp] tuples
    - `threshold_override`: Optional custom threshold (0.0-2.0)
    
    **Returns:**
    - `is_same_person`: Whether signature matches any saved signature
    - `best_match_confidence`: Confidence of best match (0-100%)
    - `matched_signature_id`: ID of best matching signature if any
    - `total_signatures_checked`: Number of signatures checked
    - `verification_details`: Detailed results for debugging
    
    **Errors:**
    - 400: Invalid signature data
    - 404: User has no saved signatures
    - 500: Verification error
    """
    logger.info(f"Verifying signature against user {user_id}")
    logger.debug(f"  Signature points: {len(request.signature_data)}")
    
    try:
        # Validate user_id and request data
        validation_error = validate_request_data({"user_id": user_id}, "user_id")
        if validation_error:
            logger.warning(f"Security validation failed for user_id: {validation_error}")
            raise ValueError(validation_error)
            
        validation_error = validate_request_data({"signature_data": request.signature_data}, "verify")
        if validation_error:
            logger.warning(f"Security validation failed for signature_data: {validation_error}")
            raise ValueError(validation_error)
        
        # Get user's saved signatures
        storage = get_signature_storage()
        saved_signatures = storage.get_user_signatures(user_id)
        
        if not saved_signatures:
            logger.warning(f"No saved signatures found for user {user_id}")
            raise HTTPException(
                status_code=404,
                detail=f"No saved signatures found for user {user_id}"
            )
        
        # Verify against each saved signature
        best_match = None
        highest_confidence = 0.0
        best_signature_id = None
        verification_results = []
        
        input_signature = [[float(x), float(y), float(t)] for x, y, t in request.signature_data]
        
        for saved_sig in saved_signatures:
            try:
                # Run verification
                result = verify_signatures(
                    signature1=input_signature,
                    signature2=saved_sig.signature_data
                )
                
                verification_results.append({
                    "signature_id": saved_sig.signature_id,
                    "confidence": result.confidence,
                    "distance": result.distance,
                    "match": result.match
                })
                
                # Track best match
                if result.confidence > highest_confidence:
                    highest_confidence = result.confidence
                    best_match = result
                    best_signature_id = saved_sig.signature_id
                
                logger.debug(f"  vs {saved_sig.signature_id}: confidence={result.confidence:.1f}%, match={result.match}")
                
            except Exception as e:
                logger.warning(f"Verification failed against {saved_sig.signature_id}: {str(e)}")
                verification_results.append({
                    "signature_id": saved_sig.signature_id,
                    "error": str(e)
                })
        
        # Apply custom threshold if provided
        is_same_person = False
        if best_match:
            if request.threshold_override is not None:
                # Use custom threshold
                is_same_person = best_match.distance < request.threshold_override
            else:
                # Use model's threshold decision
                is_same_person = best_match.match
        
        logger.info(f"✓ Verification complete: is_same_person={is_same_person}, "
                   f"best_confidence={highest_confidence:.1f}%")
        
        return VerifyAgainstUserResponse(
            is_same_person=is_same_person,
            best_match_confidence=highest_confidence,
            matched_signature_id=best_signature_id,
            total_signatures_checked=len(saved_signatures),
            verification_details={
                "all_results": verification_results,
                "threshold_used": request.threshold_override or (best_match.threshold if best_match else None),
                "best_distance": best_match.distance if best_match else None
            }
        )
    
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Verification validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Verification error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Verification failed: {str(e)}"
        )


if DEBUG and not PRODUCTION_MODE:
    
    @app.get("/debug/models-detailed")
    async def debug_models():
        """
        (DEBUG ONLY) Get detailed information about all loaded models.
        """
        logger.debug("Getting detailed model information")
        info = model_loader.get_model_info()
        return {
            "total_models": info["total_models"],
            "available_models": info["available_models"],
            "active_model": info["active_model"],
            "device": info["device"],
            "models_fully_loaded": info["models_fully_loaded"],
            "timestamp": str(__import__('datetime').datetime.now())
        }
    
    @app.get("/debug/config")
    async def debug_config():
        """
        (DEBUG ONLY) Get current API configuration.
        """
        logger.debug("Getting API configuration")
        from api import config
        return {
            "API_HOST": config.API_HOST,
            "API_PORT": config.API_PORT,
            "DEBUG": config.DEBUG,
            "CORS_ORIGINS": config.CORS_ORIGINS,
            "MIN_SIGNATURE_POINTS": config.MIN_SIGNATURE_POINTS,
            "MAX_SIGNATURE_POINTS": config.MAX_SIGNATURE_POINTS,
        }



if __name__ == "__main__":
    import uvicorn
    
    logger.info("=" * 70)
    logger.info(f"Starting Aerosign API server on {API_HOST}:{API_PORT}")
    logger.info(f"Debug mode: {DEBUG}")
    logger.info(f"API Docs: http://localhost:{API_PORT}/docs")
    logger.info("=" * 70)
    
    uvicorn.run(
        "api.main:app",
        host=API_HOST,
        port=API_PORT,
        reload=DEBUG,
        log_level=LOG_LEVEL.lower()
    )
