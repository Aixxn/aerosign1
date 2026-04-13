"""
Simple in-memory signature storage system.
In production, this would be replaced with a proper database (PostgreSQL, MongoDB, etc.)
"""
import uuid
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)

@dataclass
class StoredSignature:
    """Represents a stored signature"""
    signature_id: str
    user_id: str
    session_id: str
    signature_data: List[List[float]]  # [x, y, timestamp] tuples
    saved_at: datetime
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "signature_id": self.signature_id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "signature_data": self.signature_data,
            "point_count": len(self.signature_data),
            "saved_at": self.saved_at.isoformat(),
            "metadata": self.metadata
        }


class InMemorySignatureStorage:
    """
    Simple in-memory storage for signatures.
    WARNING: This is for development only - data is lost on server restart.
    """
    
    def __init__(self):
        self.signatures: Dict[str, StoredSignature] = {}
        self.user_signatures: Dict[str, List[str]] = {}  # user_id -> [signature_ids]
        logger.info("Initialized in-memory signature storage")
    
    def save_signature(
        self,
        user_id: str,
        session_id: str,
        signature_data: List[List[float]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> tuple[str, bool]:
        """
        Save a signature for a user.
        
        Returns:
            tuple: (signature_id, success)
        """
        try:
            # Generate unique signature ID
            signature_id = f"sig_{uuid.uuid4().hex[:16]}"
            
            # Create signature object
            signature = StoredSignature(
                signature_id=signature_id,
                user_id=user_id,
                session_id=session_id,
                signature_data=signature_data,
                saved_at=datetime.now(),
                metadata=metadata or {}
            )
            
            # Store signature
            self.signatures[signature_id] = signature
            
            # Update user's signature list
            if user_id not in self.user_signatures:
                self.user_signatures[user_id] = []
            self.user_signatures[user_id].append(signature_id)
            
            logger.info(f"Saved signature {signature_id} for user {user_id}")
            return signature_id, True
            
        except Exception as e:
            logger.error(f"Failed to save signature: {str(e)}")
            return "", False
    
    def get_user_signatures(self, user_id: str) -> List[StoredSignature]:
        """Get all signatures for a user"""
        if user_id not in self.user_signatures:
            return []
        
        signature_ids = self.user_signatures[user_id]
        signatures = [
            self.signatures[sig_id] 
            for sig_id in signature_ids 
            if sig_id in self.signatures
        ]
        
        # Sort by saved time (newest first)
        signatures.sort(key=lambda s: s.saved_at, reverse=True)
        return signatures
    
    def get_signature(self, signature_id: str) -> Optional[StoredSignature]:
        """Get a specific signature by ID"""
        return self.signatures.get(signature_id)
    
    def get_user_signature_count(self, user_id: str) -> int:
        """Get total number of signatures for a user"""
        return len(self.user_signatures.get(user_id, []))
    
    def delete_signature(self, signature_id: str) -> bool:
        """Delete a signature"""
        if signature_id not in self.signatures:
            return False
        
        signature = self.signatures[signature_id]
        user_id = signature.user_id
        
        # Remove from storage
        del self.signatures[signature_id]
        
        # Remove from user's list
        if user_id in self.user_signatures:
            self.user_signatures[user_id] = [
                sid for sid in self.user_signatures[user_id] 
                if sid != signature_id
            ]
        
        logger.info(f"Deleted signature {signature_id}")
        return True
    
    def clear_user_signatures(self, user_id: str) -> int:
        """Clear all signatures for a user"""
        if user_id not in self.user_signatures:
            return 0
        
        signature_ids = self.user_signatures[user_id].copy()
        for sig_id in signature_ids:
            self.delete_signature(sig_id)
        
        return len(signature_ids)
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        return {
            "total_signatures": len(self.signatures),
            "total_users": len(self.user_signatures),
            "average_signatures_per_user": (
                len(self.signatures) / len(self.user_signatures) 
                if self.user_signatures else 0
            )
        }


# Global storage instance
signature_storage = InMemorySignatureStorage()

def get_signature_storage() -> InMemorySignatureStorage:
    """Get the global signature storage instance"""
    return signature_storage