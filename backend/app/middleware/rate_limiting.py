"""Rate limiting middleware for API requests."""
import logging
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# In-memory rate limiting (use Redis for production)
rate_limits = {}
MAX_REQUESTS = 100  # requests per window
WINDOW_SECONDS = 60  # 1 minute


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to implement rate limiting."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        current_time = request.scope.get("asgi.scope", {}).get("time", 0)
        
        # Simple in-memory rate limiting
        if client_ip not in rate_limits:
            rate_limits[client_ip] = {"count": 1, "window_start": current_time}
        else:
            rate_limits[client_ip]["count"] += 1
        
        # Check if rate limited
        if rate_limits[client_ip]["count"] > MAX_REQUESTS:
            logger.warning(f"Rate limit exceeded for {client_ip}")
            return Response(status_code=429, content="Too Many Requests")
        
        return await call_next(request)
