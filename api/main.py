import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import base64
import cv2
import numpy as np

from api.config import CORS_ORIGINS, API_HOST, API_PORT, DEBUG, LOG_LEVEL
from api.utils import model_loader, initialize_models
from api.hand_detection import get_hand_detector, initialize_hand_detector
from api.schemas import (
    VerificationRequest,
    VerificationResponse,
    HealthResponse,
    ModelsListResponse,
    SetActiveModelResponse,
    ErrorResponse,
    APIInfoResponse
)
from api.inference import verify_signatures

logging.basicConfig(
    level=LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Aerosign API",
    description="Real-time signature verification using Siamese LSTM neural networks",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

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
    info = model_loader.get_model_info()
    return HealthResponse(
        status="ok",
        models_loaded=info["total_models"],
        active_model=info["active_model"]
    )


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


if DEBUG:
    
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
