from uuid import UUID

import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from email.message import EmailMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.exceptions import bad_request, conflict, not_found
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
    SmtpTestRequest,
    SmtpTestResponse,
    ImapTestRequest,
    ImapTestResponse,
)
from app.services.smtp_service import resolve_smtp_security, security_mode_label, send_email_message
from app.services.imap_service import test_imap_connection
from app.services.pdf_service import (
    BrandingContext,
    DocumentLine,
    DocumentTemplate,
    InvoicePdfContext,
    QuotePdfContext,
    render_invoice_pdf,
    render_quote_pdf,
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
        legal_name=business.legal_name,
        abn=business.abn,
        email=business.email,
        phone=business.phone,
        address_line1=business.address_line1,
        city=business.city,
        state=business.state,
        postcode=business.postcode,
        timezone=business.timezone,
        currency=business.currency,
        tax_rate=float(settings.tax_rate),
        ticket_prefix=settings.ticket_prefix,
        next_ticket_seq=settings.next_ticket_seq,
        branding_json=settings.branding_json or {},
        quote_template_json=settings.quote_template_json or {},
        invoice_template_json=settings.invoice_template_json or {},
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
    for field in ("legal_name", "abn", "email", "phone", "address_line1", "city", "state", "postcode", "timezone", "currency"):
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
    if "sms_gateway" in data:
        sms_settings["gateway"] = data["sms_gateway"] or {}
    if "branding" in data:
        settings.branding_json = data["branding"] or {}
    if "quote_template" in data:
        settings.quote_template_json = data["quote_template"] or {}
    if "invoice_template" in data:
        settings.invoice_template_json = data["invoice_template"] or {}
    settings.email_settings = dict(email_settings)
    settings.sms_settings = dict(sms_settings)
    await db.flush()
    return await _settings_response(db, business_id)


@router.post("/settings/test-smtp", response_model=SmtpTestResponse)
async def test_smtp_settings(
    body: SmtpTestRequest,
    user: CurrentUser = Depends(require_permission(Permission.ADMIN_SETTINGS)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    business = await db.get(Business, business_id)
    if not business:
        raise not_found("Business")

    settings = await db.scalar(select(BusinessSettings).where(BusinessSettings.business_id == business_id))
    saved_smtp = (settings.email_settings or {}).get("smtp", {}) if settings else {}
    smtp_config = {**saved_smtp, **(body.smtp or {})}
    if not smtp_config.get("host"):
        raise bad_request("SMTP host is required", "SMTP_NOT_CONFIGURED")

    recipient = body.to or user.email or business.email
    if not recipient:
        raise bad_request("No test recipient email is available", "SMTP_TEST_RECIPIENT_MISSING")

    sender = smtp_config.get("from_email") or smtp_config.get("username") or recipient
    security = resolve_smtp_security(smtp_config)
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = recipient
    msg["Subject"] = f"SMTP test from {business.name}"
    msg.set_content(
        f"This is a test email from {business.name}.\n"
        f"Server: {smtp_config.get('host')}:{smtp_config.get('port', 587)}\n"
        f"Security: {security_mode_label(security)}"
    )

    try:
        send_email_message(smtp_config, msg)
    except RuntimeError as exc:
        raise bad_request(str(exc), "SMTP_TEST_FAILED") from exc

    return SmtpTestResponse(ok=True, message=f"Test email sent to {recipient}")


@router.post("/settings/test-imap", response_model=ImapTestResponse)
async def test_imap_settings(
    body: ImapTestRequest,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.ADMIN_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    settings = await db.scalar(select(BusinessSettings).where(BusinessSettings.business_id == business_id))
    saved_imap = (settings.email_settings or {}).get("imap", {}) if settings else {}
    imap_config = {**saved_imap, **(body.imap or {})}
    if not imap_config.get("host"):
        raise bad_request("IMAP host is required", "IMAP_NOT_CONFIGURED")

    try:
        message = await asyncio.to_thread(test_imap_connection, imap_config)
    except RuntimeError as exc:
        raise bad_request(str(exc), "IMAP_TEST_FAILED") from exc

    return ImapTestResponse(ok=True, message=message)


def _sample_quote_context() -> QuotePdfContext:
    return QuotePdfContext(
        quote_number="QUO-0001",
        status="sent",
        created_at=datetime.now(timezone.utc),
        valid_until=None,
        customer_name="Sample Customer",
        customer_email="customer@example.com",
        phone="(02) 9999 0000",
        ticket_number="RCT-10042",
        lines=[
            DocumentLine(description="Diagnostic fee", quantity=Decimal("1"), unit_price=Decimal("88.00"), line_type="labour"),
            DocumentLine(description="Screen replacement", quantity=Decimal("1"), unit_price=Decimal("220.00"), line_type="parts"),
            DocumentLine(description="Labour - screen install", quantity=Decimal("1.5"), unit_price=Decimal("88.00"), line_type="labour"),
        ],
        subtotal=Decimal("440.00"),
        tax_amount=Decimal("44.00"),
        discount_amount=Decimal("0.00"),
        total=Decimal("484.00"),
        tax_rate=Decimal("0.10"),
    )


def _sample_invoice_context() -> InvoicePdfContext:
    return InvoicePdfContext(
        invoice_number="INV-0001",
        status="sent",
        issued_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        customer_name="Sample Customer",
        customer_email="customer@example.com",
        phone="(02) 9999 0000",
        ticket_number="RCT-10042",
        lines=[
            DocumentLine(description="Diagnostic fee", quantity=Decimal("1"), unit_price=Decimal("88.00"), line_type="labour"),
            DocumentLine(description="Screen replacement", quantity=Decimal("1"), unit_price=Decimal("220.00"), line_type="parts"),
            DocumentLine(description="Labour - screen install", quantity=Decimal("1.5"), unit_price=Decimal("88.00"), line_type="labour"),
        ],
        subtotal=Decimal("440.00"),
        tax_amount=Decimal("44.00"),
        discount_amount=Decimal("0.00"),
        total=Decimal("484.00"),
        amount_paid=Decimal("200.00"),
        tax_rate=Decimal("0.10"),
        payments=[
            {"paid_at": datetime.now(timezone.utc), "method": "bank_transfer", "reference": "PAY-001", "amount": Decimal("200.00")},
        ],
    )


def _sample_branding() -> BrandingContext:
    return BrandingContext(
        business_name="Your Business",
        legal_name="Your Business Pty Ltd",
        abn="12 345 678 901",
        email="info@yourbusiness.com.au",
        phone="(02) 9999 0000",
        address_line1="123 Main Street",
        city="Sydney",
        state="NSW",
        postcode="2000",
        currency="AUD",
        primary_color="#1e3a5f",
        accent_color="#d97706",
        logo_bytes=None,
    )


@router.post("/settings/preview-quote")
async def preview_quote_template(
    body: dict,
    _: CurrentUser = Depends(require_permission(Permission.ADMIN_SETTINGS)),
):
    template = DocumentTemplate.from_json(body)
    branding = _sample_branding()
    pdf_bytes = render_quote_pdf(branding, _sample_quote_context(), template)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="quote-preview.pdf"'},
    )


@router.post("/settings/preview-invoice")
async def preview_invoice_template(
    body: dict,
    _: CurrentUser = Depends(require_permission(Permission.ADMIN_SETTINGS)),
):
    template = DocumentTemplate.from_json(body)
    branding = _sample_branding()
    pdf_bytes = render_invoice_pdf(branding, _sample_invoice_context(), template)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="invoice-preview.pdf"'},
    )
