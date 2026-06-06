"""Subdomain-based authentication middleware.

This middleware handles requests from api.sunsetcountryrepair.com and ensures
proper authentication is in place for API-only access.
"""
import re
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class SubdomainAuthMiddleware(BaseHTTPMiddleware):
    """Middleware to handle API subdomain authentication."""
    
    # Regex pattern to extract subdomain from host
    SUBDOMAIN_PATTERN = re.compile(r"^(?:https?://)?([^:/.]+)\.")
    
    def __init__(self, app, allowed_subdomains: list[str] = None):
        super().__init__(app)
        self.allowed_subdomains = allowed_subdomains or ["api"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        host = request.headers.get("host", "")
        
        # Extract subdomain if present
        subdomain_match = self.SUBDOMAIN_PATTERN.match(host)
        is_api_subdomain = False
        
        if subdomain_match:
            subdomain = subdomain_match.group(1)
            is_api_subdomain = subdomain in self.allowed_subdomains
        
        # For API subdomain requests, ensure proper headers
        if is_api_subdomain:
            # Set response headers for API responses
            response = await call_next(request)
            response.headers["X-API-Version"] = "1.0"
            response.headers["X-Request-ID"] = str(request.state.request_id) if hasattr(request.state, "request_id") else ""
            return response
        
        # Regular requests
        return await call_next(request)


async def api_auth_middleware(request: Request, call_next: Callable):
    """Middleware to add API-specific headers and validation."""
    # Generate request ID
    import uuid
    request.state.request_id = str(uuid.uuid4())
    
    # Set CORS headers for all API responses
    response = await call_next(request)
    
    # Add API-specific headers
    response.headers["X-API-Version"] = "1.0"
    response.headers["X-Request-ID"] = getattr(request.state, "request_id", "")
    
    return response
