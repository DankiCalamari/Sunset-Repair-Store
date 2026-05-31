from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.exceptions import conflict, not_found
from app.core.permissions import Permission
from app.core.security import hash_password
from app.db.session import get_db
from app.models.business import Business, BusinessSettings, User
from app.schemas.admin import (
    AdminUserCreate,
    AdminUserResponse,
    AdminUserUpdate,
    BusinessSettingsResponse,
    BusinessSettingsUpdate,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


async def _settings_response(db: AsyncSession, business_id: UUID) -> BusinessSettingsResponse:
    business = await db.get(Business, business_id)
    if not business:
        raise not_found("Business")
    settings = await db.scalar(select(BusinessSettings).where(BusinessSettings.business_id == business_id))
    if not settings:
        settings = BusinessSettings(business_id=business_id)
        db.add(settings)
        await db.flush()
    return BusinessSettingsResponse(
        business_id=business.id,
        business_name=business.name,
        email=business.email,
        phone=business.phone,
        tax_rate=float(settings.tax_rate),
        ticket_prefix=settings.ticket_prefix,
        next_ticket_seq=settings.next_ticket_seq,
        branding_json=settings.branding_json or {},
        email_settings=settings.email_settings or {},
        sms_settings=settings.sms_settings or {},
    )


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.ADMIN_USERS)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.business_id == business_id).order_by(User.full_name)
    )
    return [AdminUserResponse.model_validate(user) for user in result.scalars().all()]


@router.post("/users", response_model=AdminUserResponse, status_code=201)
async def create_user(
    body: AdminUserCreate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.ADMIN_USERS)),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(
        select(User).where(User.business_id == business_id, User.email == body.email)
    )
    if existing:
        raise conflict("A user with this email already exists", "USER_EMAIL_EXISTS")
    user = User(
        business_id=business_id,
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        phone=body.phone,
        role=body.role,
        is_active=body.is_active,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return AdminUserResponse.model_validate(user)


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: UUID,
    body: AdminUserUpdate,
    current_user: CurrentUser = Depends(require_permission(Permission.ADMIN_USERS)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(select(User).where(User.id == user_id, User.business_id == business_id))
    if not user:
        raise not_found("User")
    data = body.model_dump(exclude_unset=True)
    if "email" in data and data["email"] != user.email:
        existing = await db.scalar(
            select(User).where(User.business_id == business_id, User.email == data["email"])
        )
        if existing:
            raise conflict("A user with this email already exists", "USER_EMAIL_EXISTS")
    if user.id == current_user.id and data.get("is_active") is False:
        raise conflict("You cannot deactivate your own user account", "SELF_DEACTIVATE")
    for field in ("email", "full_name", "phone", "role", "is_active"):
        if field in data:
            setattr(user, field, data[field])
    if data.get("password"):
        user.password_hash = hash_password(data["password"])
    await db.flush()
    await db.refresh(user)
    return AdminUserResponse.model_validate(user)


@router.get("/settings", response_model=BusinessSettingsResponse)
async def get_settings(
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.ADMIN_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    return await _settings_response(db, business_id)


@router.patch("/settings", response_model=BusinessSettingsResponse)
async def update_settings(
    body: BusinessSettingsUpdate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.ADMIN_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    business = await db.get(Business, business_id)
    if not business:
        raise not_found("Business")
    settings = await db.scalar(select(BusinessSettings).where(BusinessSettings.business_id == business_id))
    if not settings:
        settings = BusinessSettings(business_id=business_id)
        db.add(settings)
        await db.flush()
    data = body.model_dump(exclude_unset=True)
    if "business_name" in data:
        business.name = data["business_name"]
    for field in ("email", "phone"):
        if field in data:
            setattr(business, field, data[field])
    for field in ("tax_rate", "ticket_prefix", "next_ticket_seq"):
        if field in data:
            setattr(settings, field, data[field])
    email_settings = settings.email_settings or {}
    sms_settings = settings.sms_settings or {}
    if "smtp" in data:
        email_settings["smtp"] = data["smtp"] or {}
    if "imap" in data:
        email_settings["imap"] = data["imap"] or {}
    if "automations" in data:
        email_settings["automations"] = data["automations"] or {}
    if "telnyx" in data:
        sms_settings["telnyx"] = data["telnyx"] or {}
    settings.email_settings = dict(email_settings)
    settings.sms_settings = dict(sms_settings)
    await db.flush()
    return await _settings_response(db, business_id)
