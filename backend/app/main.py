from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.services.auth_service import ensure_demo_owner
from app.services.communication_service import ensure_communication_schema, imap_poll_loop
from app.services.seed_service import seed_demo_data
from sqlalchemy import select
from app.models.business import Business

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    poller: asyncio.Task | None = None
    async with AsyncSessionLocal() as db:
        await ensure_communication_schema(db)
        result = await db.execute(
            select(Business).where(Business.slug == "sunset-demo")
        )
        business = result.scalar_one_or_none()
        if business:
            owner = await ensure_demo_owner(db, business.id)
            await seed_demo_data(db, business.id, owner.id)
            await db.commit()
    poller = asyncio.create_task(imap_poll_loop(AsyncSessionLocal))
    yield
    if poller:
        poller.cancel()


app = FastAPI(
    title=settings.app_name,
    description="Repair shop management ERP — multi-tenant ready",
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

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
