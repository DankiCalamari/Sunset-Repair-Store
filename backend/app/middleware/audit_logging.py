"""Audit logging middleware for API requests."""
import logging
import json
from typing import Callable
from datetime import datetime

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all API requests for audit purposes."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = datetime.utcnow()
        
        # Log request
        log_data = {
            "timestamp": start_time.isoformat(),
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown"),
            "api_key": request.headers.get("x-api-key", "none"),
        }
        
        response = await call_next(request)
        
        # Log response
        duration = (datetime.utcnow() - start_time).total_seconds() * 1000
        log_data["status_code"] = response.status_code
        log_data["duration_ms"] = round(duration, 2)
        
        if response.status_code >= 400:
            logger.warning(f"AUDIT: {json.dumps(log_data)}")
        else:
            logger.info(f"AUDIT: {json.dumps(log_data)}")
        
        return response
