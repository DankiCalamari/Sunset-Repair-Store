from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import forbidden, not_found
from app.core.permissions import Permission, role_has_permission
from app.core.security import safe_decode_token
from app.db.session import get_db
from app.models.business import User

security = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    id: UUID
    email: str
    full_name: str
    role: str
    business_id: UUID | None
    permissions: list[str]


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    if not credentials:
        raise forbidden("Authentication required")
    payload = safe_decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise forbidden("Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise forbidden("Invalid token payload")
    result = await db.execute(select(User).where(User.id == UUID(user_id), User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if not user:
        raise not_found("User")
    from app.core.permissions import permissions_for_role

    perms = payload.get("permissions") or permissions_for_role(user.role)
    return CurrentUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        business_id=user.business_id,
        permissions=perms,
    )


def require_permission(permission: Permission):
    async def checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not role_has_permission(user.role, permission.value):
            raise forbidden(f"Missing permission: {permission.value}")
        return user

    return checker


def get_business_id(user: CurrentUser = Depends(get_current_user)) -> UUID:
    if not user.business_id:
        raise forbidden("No business context")
    return user.business_id
