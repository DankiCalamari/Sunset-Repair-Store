from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import forbidden
from app.core.permissions import permissions_for_role
from app.core.security import create_access_token, hash_password, verify_password
from app.models.business import Business, User
from app.schemas.auth import AuthResponse, UserResponse


async def authenticate(
    db: AsyncSession,
    email: str,
    password: str,
    business_slug: str | None = None,
) -> AuthResponse:
    query = select(User).where(User.email == email, User.is_active.is_(True))
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise forbidden("Invalid email or password")

    if business_slug and user.business_id:
        biz_result = await db.execute(
            select(Business).where(Business.id == user.business_id, Business.slug == business_slug)
        )
        if not biz_result.scalar_one_or_none():
            raise forbidden("Invalid business for this account")

    perms = permissions_for_role(user.role)
    access = create_access_token(
        str(user.id),
        business_id=user.business_id,
        role=user.role,
        permissions=perms,
    )
    refresh = create_access_token(
        str(user.id),
        business_id=user.business_id,
        role=user.role,
        permissions=perms,
        extra={"type": "refresh"},
    )
    user.last_login_at = datetime.now(timezone.utc)

    return AuthResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=30 * 60,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            business_id=user.business_id,
            permissions=perms,
        ),
    )
