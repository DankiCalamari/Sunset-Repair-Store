from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import conflict
from app.core.permissions import permissions_for_role
from app.core.security import create_access_token, hash_password
from app.db.session import get_db
from app.models.business import Business, BusinessSettings, User
from app.schemas.auth import AuthResponse, UserResponse
from app.schemas.setup import (
    SetupRequest,
    SetupStatusResponse,
    SetupVerificationRequest,
    SetupVerificationResponse,
)
from app.services.setup_verification_service import (
    send_setup_verification_code,
    validate_setup_verification_code,
)

router = APIRouter(prefix="/setup", tags=["Setup"])


async def _business_exists(db: AsyncSession) -> bool:
    count = await db.scalar(select(func.count()).select_from(Business))
    return (count or 0) > 0


@router.get("/status", response_model=SetupStatusResponse)
async def setup_status(db: AsyncSession = Depends(get_db)):
    """Public endpoint — returns whether initial setup has been completed."""
    exists = await _business_exists(db)
    return SetupStatusResponse(needs_setup=not exists)


@router.post("/verification", response_model=SetupVerificationResponse, status_code=200)
async def send_verification(body: SetupVerificationRequest, db: AsyncSession = Depends(get_db)):
    """Generate and send a one-time setup verification code to the owner email."""
    result = await send_setup_verification_code(db, body.owner_email)
    return SetupVerificationResponse(**result)


@router.post("", response_model=AuthResponse, status_code=201)
async def run_setup(body: SetupRequest, db: AsyncSession = Depends(get_db)):
    """
    One-time setup endpoint. Creates the first business and owner account.
    Locked out once any business exists.
    """
    if await _business_exists(db):
        raise conflict("Setup has already been completed", "SETUP_ALREADY_DONE")

    if not body.verification_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "Verification code is required.", "code": "VERIFICATION_REQUIRED"},
        )

    await validate_setup_verification_code(db, body.owner_email, body.verification_code)

    # Slug uniqueness check (defensive — no businesses exist yet, but be explicit)
    slug_taken = await db.scalar(
        select(func.count()).select_from(Business).where(Business.slug == body.business_slug)
    )
    if slug_taken:
        raise conflict("This slug is already taken", "SLUG_TAKEN")

    # Create business
    business = Business(
        name=body.business_name,
        slug=body.business_slug,
        legal_name=body.legal_name,
        abn=body.abn,
        email=str(body.email) if body.email else None,
        phone=body.phone,
        address_line1=body.address_line1,
        city=body.city,
        state=body.state,
        postcode=body.postcode,
        timezone=body.timezone,
        currency=body.currency,
    )
    db.add(business)
    await db.flush()

    # Create business settings
    settings = BusinessSettings(
        business_id=business.id,
        ticket_prefix=body.ticket_prefix,
        next_ticket_seq=1,
        tax_rate=body.tax_rate,
    )
    db.add(settings)

    # Create owner account
    owner = User(
        business_id=business.id,
        email=str(body.owner_email),
        password_hash=hash_password(body.owner_password),
        full_name=body.owner_name,
        role="owner",
        is_active=True,
    )
    db.add(owner)
    await db.flush()

    # Return auth tokens so the user is logged in immediately after setup
    perms = permissions_for_role("owner")
    access = create_access_token(
        str(owner.id),
        business_id=business.id,
        role="owner",
        permissions=perms,
    )
    refresh = create_access_token(
        str(owner.id),
        business_id=business.id,
        role="owner",
        permissions=perms,
        extra={"type": "refresh"},
    )

    return AuthResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=30 * 60,
        user=UserResponse(
            id=owner.id,
            email=owner.email,
            full_name=owner.full_name,
            role="owner",
            business_id=business.id,
            permissions=perms,
        ),
    )
