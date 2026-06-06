"""API Gateway authentication middleware.

Validates API keys from the public website before allowing requests.
"""
import logging
from typing import Callable

from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class APIGatewayAuthMiddleware(BaseHTTPMiddleware):
    """Middleware to validate API gateway authentication."""
    
    def __init__(self, app):
        super().__init__(app)
        self.gateway_secret = None
        # Try to get from environment
        try:
            from app.core.config import get_settings
            settings = get_settings()
            self.gateway_secret = settings.api_gateway_secret
        except Exception:
            logger.warning("Could not load API gateway secret from settings")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip auth for health check
        if request.url.path == "/health":
            return await call_next(request)
        
        # Check API key from gateway
        api_key = request.headers.get("X-API-Key")
        
        if not api_key:
            raise HTTPException(status_code=401, detail="Missing X-API-Key header")
        
        # Validate API key
        if not self.gateway_secret or api_key != self.gateway_secret:
            logger.warning(f"Invalid API key from {request.client.host}")
            raise HTTPException(status_code=403, detail="Invalid API key")
        
        # Log request
        logger.info(f"API request: {request.method} {request.url.path} from {request.client.host}")
        
        return await call_next(request)
