from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.schemas.auth import AuthResponse, LoginRequest, UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.authenticate(
        db, body.email, body.password, body.business_slug
    )


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        business_id=user.business_id,
        permissions=user.permissions,
    )
