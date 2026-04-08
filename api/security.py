"""
Security middleware for AeroSign API
Provides rate limiting, input validation, and other security measures.
"""

import time
import logging
from typing import Dict, Optional, Set
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from collections import defaultdict, deque
import re
import html

logger = logging.getLogger(__name__)

class RateLimiter:
    """
    Simple in-memory rate limiter.
    In production, use Redis or similar distributed cache.
    """
    
    def __init__(self):
        # Store request counts: {ip_address: deque of request timestamps}
        self.requests: Dict[str, deque] = defaultdict(lambda: deque())
        
    def is_allowed(self, client_ip: str, max_requests: int = 100, window_seconds: int = 60) -> bool:
        """
        Check if client is within rate limits.
        
        Args:
            client_ip: Client IP address
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds
            
        Returns:
            True if request is allowed, False if rate limited
        """
        now = time.time()
        window_start = now - window_seconds
        
        # Get or create request queue for this IP
        client_requests = self.requests[client_ip]
        
        # Remove old requests outside the window
        while client_requests and client_requests[0] < window_start:
            client_requests.popleft()
            
        # Check if under limit
        if len(client_requests) >= max_requests:
            return False
            
        # Add current request
        client_requests.append(now)
        return True

class InputValidator:
    """
    Input validation and sanitization utilities.
    """
    
    # Dangerous patterns to block
    DANGEROUS_PATTERNS = [
        r'<script.*?>.*?</script>',  # Script tags
        r'javascript:',              # JavaScript URLs
        r'on\w+\s*=',               # Event handlers (onclick, etc.)
        r'data:text/html',          # Data URLs with HTML
        r'vbscript:',               # VBScript
        r'expression\s*\(',         # CSS expressions
    ]
    
    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r'(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)',
        r'(\b(or|and)\s+\d+\s*=\s*\d+)',
        r'(\'\s*(or|and)\s*\'\w*\'\s*=\s*\'\w*\')',
        r'(\b(substring|ascii|char|length)\s*\()',
    ]
    
    def __init__(self):
        # Compile regex patterns for performance
        self.dangerous_regex = re.compile('|'.join(self.DANGEROUS_PATTERNS), re.IGNORECASE)
        self.sql_regex = re.compile('|'.join(self.SQL_INJECTION_PATTERNS), re.IGNORECASE)
    
    def sanitize_string(self, value: str) -> str:
        """Sanitize a string input"""
        if not isinstance(value, str):
            return str(value)
        
        # HTML escape
        sanitized = html.escape(value)
        
        # Limit length to prevent DoS
        if len(sanitized) > 10000:
            sanitized = sanitized[:10000] + "..."
            
        return sanitized
    
    def validate_user_id(self, user_id: str) -> bool:
        """Validate user ID format"""
        if not user_id or len(user_id) < 1 or len(user_id) > 100:
            return False
        
        # Allow alphanumeric, underscore, dash
        if not re.match(r'^[a-zA-Z0-9_-]+$', user_id):
            return False
            
        return True
    
    def validate_session_id(self, session_id: str) -> bool:
        """Validate session ID format"""
        if not session_id or len(session_id) < 1 or len(session_id) > 100:
            return False
            
        # Allow alphanumeric, underscore, dash
        if not re.match(r'^[a-zA-Z0-9_-]+$', session_id):
            return False
            
        return True
    
    def check_dangerous_content(self, text: str) -> bool:
        """Check if text contains dangerous patterns"""
        if self.dangerous_regex.search(text):
            return True
            
        if self.sql_regex.search(text):
            return True
            
        return False
    
    def validate_signature_data(self, signature_data: list) -> bool:
        """Validate signature data structure"""
        if not isinstance(signature_data, list):
            return False
        
        # Check minimum and maximum points
        if len(signature_data) < 5 or len(signature_data) > 1000:
            return False
        
        # Validate each point
        for point in signature_data:
            if not isinstance(point, (list, tuple)) or len(point) != 3:
                return False
                
            x, y, t = point
            
            # Check data types
            if not all(isinstance(coord, (int, float)) for coord in [x, y, t]):
                return False
                
            # Check reasonable coordinate ranges
            if not (-10000 <= x <= 10000 and -10000 <= y <= 10000):
                return False
                
            # Check reasonable timestamp range  
            if not (0 <= t <= 1000000):
                return False
        
        return True

# Global instances
rate_limiter = RateLimiter()
input_validator = InputValidator()

def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
    # Check for forwarded headers (when behind proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    # Check for real IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fall back to client host
    return request.client.host if request.client else "unknown"

async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    client_ip = get_client_ip(request)
    
    # Different rate limits for different endpoints
    if request.url.path.startswith("/api/signatures") or request.url.path.startswith("/api/users"):
        # Stricter limits for storage operations
        max_requests = 20
        window_seconds = 60
    elif request.url.path.startswith("/api/verify"):
        # Medium limits for verification
        max_requests = 50
        window_seconds = 60
    else:
        # Relaxed limits for other endpoints
        max_requests = 100
        window_seconds = 60
    
    # Check rate limit
    if not rate_limiter.is_allowed(client_ip, max_requests, window_seconds):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Rate limit exceeded",
                "message": f"Too many requests. Limit: {max_requests} per {window_seconds} seconds",
                "retry_after": window_seconds
            },
            headers={"Retry-After": str(window_seconds)}
        )
    
    # Continue to next middleware/endpoint
    response = await call_next(request)
    return response

def validate_request_data(data: dict, endpoint_type: str) -> Optional[str]:
    """
    Validate request data based on endpoint type.
    
    Args:
        data: Request data dictionary
        endpoint_type: Type of endpoint ('save', 'verify', 'list')
        
    Returns:
        Error message if validation fails, None if valid
    """
    
    if endpoint_type == "save":
        # Validate signature save request
        if "user_id" in data:
            if not input_validator.validate_user_id(data["user_id"]):
                return "Invalid user_id format"
        
        if "session_id" in data:
            if not input_validator.validate_session_id(data["session_id"]):
                return "Invalid session_id format"
        
        if "signature_data" in data:
            if not input_validator.validate_signature_data(data["signature_data"]):
                return "Invalid signature_data format"
        
        # Check metadata for dangerous content
        if "metadata" in data and isinstance(data["metadata"], dict):
            for key, value in data["metadata"].items():
                if isinstance(value, str):
                    if input_validator.check_dangerous_content(value):
                        return f"Dangerous content detected in metadata.{key}"
    
    elif endpoint_type == "verify":
        # Validate verification request
        if "signature_data" in data:
            if not input_validator.validate_signature_data(data["signature_data"]):
                return "Invalid signature_data format"
                
    elif endpoint_type == "user_id":
        # Validate user ID in path parameters
        if not input_validator.validate_user_id(data.get("user_id", "")):
            return "Invalid user_id format"
    
    return None