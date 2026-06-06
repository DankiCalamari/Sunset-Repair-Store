from contextlib import asynccontextmanager
import asyncio
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.middleware.api_gateway_auth import APIGatewayAuthMiddleware
from app.middleware.rate_limiting import RateLimitMiddleware
from app.middleware.audit_logging import AuditLoggingMiddleware
from app.services.communication_service import ensure_communication_schema, imap_poll_loop
from app.services.setup_verification_service import ensure_setup_schema

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    poller: asyncio.Task | None = None
    async with AsyncSessionLocal() as db:
        await ensure_communication_schema(db)
        await ensure_setup_schema(db)
        await db.commit()
    poller = asyncio.create_task(imap_poll_loop(AsyncSessionLocal))
    yield
    if poller:
        poller.cancel()


app = FastAPI(
    title=settings.app_name,
    description="Sunset Country Repairs — Mobile Phone, Tablet & Laptop Repair Management",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuditLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(APIGatewayAuthMiddleware)

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}


# Serve static frontend files (SPA) — must be AFTER all API routes
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        """Serve SPA frontend with fallback to index.html for client-side routing."""
        # Don't interfere with API routes
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})

        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        index_path = frontend_dist / "index.html"
        if index_path.exists():
            return FileResponse(index_path)

        return JSONResponse(status_code=404, content={"detail": "Not Found"})