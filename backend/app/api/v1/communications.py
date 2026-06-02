import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.exceptions import forbidden, not_found
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.business import BusinessSettings
from app.models.ticket import UnassignedMessage
from app.schemas.communications import InboundSms, UnassignedMessageResponse
from app.services.communication_service import (
    store_inbound_message,
    verify_sms_webhook,
)

router = APIRouter(tags=["Communications"])


@router.get("/communications/unassigned", response_model=list[UnassignedMessageResponse])
async def list_unassigned_messages(
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.TICKETS_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UnassignedMessage)
        .where(UnassignedMessage.business_id == business_id)
        .order_by(UnassignedMessage.created_at.desc())
    )
    return [UnassignedMessageResponse.model_validate(row) for row in result.scalars().all()]


@router.post("/webhooks/sms/inbound")
async def inbound_sms_webhook(
    request: Request,
    x_signature: str | None = Header(default=None),
    x_timestamp: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Generic inbound SMS webhook endpoint.
    
    Configure your SMS gateway to POST to this endpoint with:
    - X-Signature header: Ed25519 signature (base64 encoded)
    - X-Timestamp header: Unix timestamp or ISO datetime
    - JSON body with: from, to, text/message fields
    """
    body = await request.body()
    try:
        payload = json.loads(body.decode() or "{}")
    except json.JSONDecodeError:
        raise forbidden("Invalid webhook payload")

    result = await db.execute(select(BusinessSettings))
    matched_settings = None
    for settings in result.scalars().all():
        sms_settings = settings.sms_settings if isinstance(settings.sms_settings, dict) else {}
        gateway = sms_settings.get("gateway", {})
        if verify_sms_webhook(gateway, body, x_signature, x_timestamp):
            matched_settings = settings
            break
    if not matched_settings:
        raise forbidden("Invalid SMS webhook signature")

    inbound = InboundSms.model_validate(payload)
    data = inbound.data or payload
    payload_data = data.get("payload", data) if isinstance(data, dict) else {}
    from_value = payload_data.get("from") or inbound.from_
    to_value = payload_data.get("to") or inbound.to
    sender = from_value.get("phone_number") if isinstance(from_value, dict) else from_value
    recipient = to_value.get("phone_number") if isinstance(to_value, dict) else to_value
    message = payload_data.get("text") or inbound.text or inbound.message or ""
    if not sender or not message:
        raise not_found("Inbound SMS content")

    stored = await store_inbound_message(
        db,
        matched_settings.business_id,
        channel="sms",
        sender=sender,
        recipient=recipient,
        subject=None,
        body_text=message,
        body_html=None,
        attachments=[],
        provider_message_id=payload_data.get("id") or payload.get("id"),
        received_at=inbound.received_at or inbound.timestamp or datetime.now(timezone.utc),
    )
    return {"status": "received", "matched": stored.__tablename__ == "ticket_communications"}
