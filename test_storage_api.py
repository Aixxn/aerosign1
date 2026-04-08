#!/usr/bin/env python3
"""
Minimal FastAPI server to test signature storage endpoints
without ML dependencies.
"""

import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
import base64
from datetime import datetime
import uuid

# Import our schemas and storage
from api.schemas import (
    SignatureSaveRequest,
    SignatureSaveResponse,
    UserSignaturesListResponse,
    VerifyAgainstUserRequest,
    VerifyAgainstUserResponse
)
from api.storage import InMemorySignatureStorage

# Simple schema for testing without user_id in body
from pydantic import BaseModel, Field
from typing import List, Tuple

class TestVerifyRequest(BaseModel):
    signature_data: List[Tuple[float, float, float]] = Field(..., min_items=5, max_items=1000)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AeroSign Storage Test API",
    description="Test API for signature storage endpoints",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize storage
storage = InMemorySignatureStorage()

@app.post("/api/signatures/save", response_model=SignatureSaveResponse)
async def save_signature(request: SignatureSaveRequest):
    """Save a captured signature for a user."""
    try:
        logger.info(f"Saving signature for user: {request.user_id}")
        
        # Generate a signature ID
        signature_id = str(uuid.uuid4())
        
        # Store the signature
        signature_id, success = storage.save_signature(
            user_id=request.user_id,
            session_id=request.session_id or "web_session",
            signature_data=request.signature_data,
            metadata=request.metadata or {}
        )
        
        if success:
            return SignatureSaveResponse(
                signature_id=signature_id,
                saved_successfully=True,
                message="Signature saved successfully",
                user_signature_count=len(storage.get_user_signatures(request.user_id))
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to save signature")
            
    except Exception as e:
        logger.error(f"Error saving signature: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_id}/signatures", response_model=UserSignaturesListResponse)
async def list_user_signatures(user_id: str):
    """List all signatures for a specific user."""
    try:
        logger.info(f"Listing signatures for user: {user_id}")
        
        signatures = storage.get_user_signatures(user_id)
        signature_dicts = [sig.to_dict() for sig in signatures]
        
        return UserSignaturesListResponse(
            user_id=user_id,
            signatures=signature_dicts,
            total_count=len(signature_dicts)
        )
        
    except Exception as e:
        logger.error(f"Error listing user signatures: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/users/{user_id}/verify", response_model=VerifyAgainstUserResponse)
async def verify_against_user_signatures(user_id: str, request: TestVerifyRequest):
    """Verify a signature against all of a user's stored signatures."""
    try:
        logger.info(f"Verifying signature against user {user_id} signatures")
        
        # Get user's signatures
        user_signatures = storage.get_user_signatures(user_id)
        
        if not user_signatures:
            return VerifyAgainstUserResponse(
                is_same_person=False,
                best_match_confidence=0.0,
                matched_signature_id=None,
                total_signatures_checked=0,
                verification_details={"message": "No stored signatures found for user"}
            )
        
        # For now, just return a mock response since we don't have ML models
        # In real implementation, this would use the ML model to compare signatures
        return VerifyAgainstUserResponse(
            is_same_person=True,  # Mock response
            best_match_confidence=85.0,  # Mock confidence (0-100)
            matched_signature_id=user_signatures[0].signature_id,  # Mock match
            total_signatures_checked=len(user_signatures),
            verification_details={"message": f"Mock verification against {len(user_signatures)} stored signatures"}
        )
        
    except Exception as e:
        logger.error(f"Error verifying signature: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)