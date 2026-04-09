from pydantic import BaseModel, Field
from typing import List, Tuple
from enum import Enum


class ModelName(str, Enum):
    """Available model combinations"""
    COMBO_1 = "combo_1"
    COMBO_2 = "combo_2"
    COMBO_3 = "combo_3"
    COMBO_4 = "combo_4"
    COMBO_5 = "combo_5"
    COMBO_6 = "combo_6"

class SignatureData(BaseModel):
    """
    Complete signature as a sequence of points.
    Each point is [x, y, timestamp_seconds].
    """
    points: List[Tuple[float, float, float]] = Field(
        ...,
        description="List of [x, y, timestamp] tuples representing the signature path",
        example=[[100.5, 200.3, 0.0], [105.2, 198.7, 0.05], [110.8, 195.2, 0.10]]
    )

    class Config:
        json_schema_extra = {
            "example": {
                "points": [
                    [100.0, 200.0, 0.00],
                    [105.0, 198.0, 0.05],
                    [110.0, 195.0, 0.10],
                    [115.0, 190.0, 0.15],
                    [120.0, 185.0, 0.20]
                ]
            }
        }

class VerificationRequest(BaseModel):
    """
    Request to verify if two signatures match.
    Compares signature1 and signature2 using the specified model.
    """
    signature1: List[Tuple[float, float, float]] = Field(
        ...,
        description="First signature as list of [x, y, timestamp] tuples",
        example=[[100, 200, 0], [105, 195, 0.1], [110, 190, 0.2]]
    )
    signature2: List[Tuple[float, float, float]] = Field(
        ...,
        description="Second signature as list of [x, y, timestamp] tuples",
        example=[[101, 201, 0], [106, 196, 0.1], [111, 191, 0.2]]
    )
    model_name: str = Field(
        default="combo_1",
        description="Which trained model to use for verification"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "signature1": [
                    [100.0, 200.0, 0.00],
                    [105.0, 195.0, 0.05],
                    [110.0, 190.0, 0.10]
                ],
                "signature2": [
                    [101.0, 201.0, 0.00],
                    [106.0, 196.0, 0.05],
                    [111.0, 191.0, 0.10]
                ],
                "model_name": "combo_1"
            }
        }


class SetActiveModelRequest(BaseModel):
    """Request to switch to a different model"""
    model_name: str = Field(
        ...,
        description="Model name to activate (e.g., combo_1, combo_2, etc.)"
    )

class VerificationResponse(BaseModel):
    """
    Result of signature verification.
    Indicates whether two signatures match and confidence level.
    """
    match: bool = Field(
        ...,
        description="True if signatures match (same person), False otherwise"
    )
    confidence: float = Field(
        ...,
        ge=0,
        le=100,
        description="Confidence percentage (0-100%)"
    )
    distance: float = Field(
        ...,
        ge=0,
        le=2,
        description="Cosine distance between embeddings (0-2 range, lower=more similar)"
    )
    threshold: float = Field(
        ...,
        description="Threshold value used for decision making"
    )
    model_used: str = Field(
        ...,
        description="Which model was used for this verification"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "match": True,
                "confidence": 85.5,
                "distance": 0.291,
                "threshold": 0.500,
                "model_used": "combo_1"
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(
        default="ok",
        description="Status indicator"
    )
    models_loaded: int = Field(
        ...,
        description="Number of trained models currently loaded"
    )
    active_model: str = Field(
        ...,
        description="Name of the currently active model"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "status": "ok",
                "models_loaded": 6,
                "active_model": "combo_1"
            }
        }


class ModelsListResponse(BaseModel):
    """Response listing all available models"""
    available_models: List[str] = Field(
        ...,
        description="List of all loaded model names"
    )
    active_model: str = Field(
        ...,
        description="Currently active model"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "available_models": ["combo_1", "combo_2", "combo_3", "combo_4", "combo_5", "combo_6"],
                "active_model": "combo_1"
            }
        }


class SetActiveModelResponse(BaseModel):
    """Response after switching models"""
    status: str = Field(
        default="success",
        description="Operation status"
    )
    active_model: str = Field(
        ...,
        description="The newly active model"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "active_model": "combo_2"
            }
        }


# ============================================================================
# SIGNATURE STORAGE MODELS
# ============================================================================

class SignatureSaveRequest(BaseModel):
    """Request to save a captured signature"""
    signature_data: List[Tuple[float, float, float]] = Field(
        ...,
        description="Signature as list of [x, y, timestamp] tuples",
        min_items=5,
        max_items=1000
    )
    user_id: str = Field(
        ...,
        description="Unique identifier for the user",
        min_length=1,
        max_length=100
    )
    session_id: str = Field(
        ..., 
        description="Session identifier",
        min_length=1,
        max_length=100
    )
    metadata: dict = Field(
        default={},
        description="Optional metadata (device info, timestamp, etc.)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "signature_data": [
                    [100.0, 200.0, 0.00],
                    [105.0, 195.0, 0.05],
                    [110.0, 190.0, 0.10]
                ],
                "user_id": "user_12345",
                "session_id": "session_67890",
                "metadata": {
                    "device": "desktop",
                    "browser": "chrome",
                    "timestamp": "2024-01-15T10:30:00Z"
                }
            }
        }


class SignatureSaveResponse(BaseModel):
    """Response after saving a signature"""
    signature_id: str = Field(
        ...,
        description="Unique identifier for the saved signature"
    )
    saved_successfully: bool = Field(
        ...,
        description="Whether the signature was saved successfully"
    )
    message: str = Field(
        ...,
        description="Success or error message"
    )
    user_signature_count: int = Field(
        default=0,
        description="Total number of signatures for this user"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "signature_id": "sig_abc123def456",
                "saved_successfully": True,
                "message": "Signature saved successfully",
                "user_signature_count": 3
            }
        }


class UserSignaturesListResponse(BaseModel):
    """Response listing user's saved signatures"""
    user_id: str = Field(..., description="User identifier")
    signatures: List[dict] = Field(
        ...,
        description="List of saved signatures with metadata"
    )
    total_count: int = Field(..., description="Total number of signatures")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_12345",
                "total_count": 2,
                "signatures": [
                    {
                        "signature_id": "sig_abc123",
                        "saved_at": "2024-01-15T10:30:00Z",
                        "point_count": 45,
                        "session_id": "session_67890"
                    },
                    {
                        "signature_id": "sig_def456", 
                        "saved_at": "2024-01-15T11:15:00Z",
                        "point_count": 52,
                        "session_id": "session_67891"
                    }
                ]
            }
        }


class VerifyAgainstUserRequest(BaseModel):
    """Request to verify signature against user's saved signatures"""
    signature_data: List[Tuple[float, float, float]] = Field(
        ...,
        description="Signature to verify",
        min_items=5,
        max_items=1000
    )
    threshold_override: float = Field(
        default=None,
        description="Override default threshold for matching",
        ge=0.0,
        le=2.0
    )


class VerifyAgainstUserResponse(BaseModel):
    """Response from verifying against user's signatures"""
    is_same_person: bool = Field(
        ...,
        description="Whether signature matches any of user's saved signatures"
    )
    best_match_confidence: float = Field(
        ...,
        ge=0,
        le=100,
        description="Confidence of best match (0-100%)"
    )
    matched_signature_id: str = Field(
        default=None,
        description="ID of best matching signature if any"
    )
    total_signatures_checked: int = Field(
        ...,
        description="Number of saved signatures checked against"
    )
    verification_details: dict = Field(
        default={},
        description="Detailed results for debugging"
    )


# ============================================================================
# ERROR MODELS
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response"""
    status: str = Field(
        default="error",
        description="Error status indicator"
    )
    message: str = Field(
        ...,
        description="Error message describing what went wrong"
    )
    detail: str = Field(
        default=None,
        description="Optional additional details about the error"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "status": "error",
                "message": "Signature validation failed",
                "detail": "Signature must have at least 5 points"
            }
        }


class ValidationErrorResponse(BaseModel):
    """Validation error response"""
    status: str = Field(
        default="validation_error",
        description="Validation error status"
    )
    message: str = Field(
        default="Input validation failed"
    )
    errors: dict = Field(
        ...,
        description="Field-level validation errors"
    )


class ModelInfo(BaseModel):
    """Information about a single model"""
    name: str = Field(..., description="Model name (e.g., combo_1)")
    is_active: bool = Field(..., description="Whether this is the currently active model")
    loaded: bool = Field(default=True, description="Whether the model is loaded in memory")


class DetailedModelsListResponse(BaseModel):
    """Detailed response about all models"""
    total_models: int = Field(..., description="Total number of models")
    models: List[ModelInfo] = Field(..., description="Details for each model")
    active_model: str = Field(..., description="Currently active model name")
    device: str = Field(..., description="torch device being used (cuda/cpu)")


class APIInfoResponse(BaseModel):
    """API information and metadata"""
    app_name: str = Field(default="Aerosign API")
    version: str = Field(default="1.0.0")
    description: str = Field(default="Signature verification via Siamese LSTM")
    endpoints: dict = Field(..., description="Available endpoints")
    models_loaded: int = Field(..., description="Number of models loaded")
    active_model: str = Field(..., description="Active model")

    class Config:
        json_schema_extra = {
            "example": {
                "app_name": "Aerosign API",
                "version": "1.0.0",
                "description": "Signature verification via Siamese LSTM",
                "endpoints": {
                    "health": "GET /health",
                    "list_models": "GET /api/models",
                    "verify": "POST /api/verify",
                    "set_model": "POST /api/set-active-model/{model_name}",
                    "docs": "GET /docs"
                },
                "models_loaded": 6,
                "active_model": "combo_1"
            }
        }
