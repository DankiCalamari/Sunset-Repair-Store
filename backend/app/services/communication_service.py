import asyncio
import base64
import imaplib
import json
import re
import smtplib
from datetime import datetime, timezone
from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from email.utils import getaddresses, make_msgid, parsedate_to_datetime
from html import escape
from typing import Any
from urllib import request
from uuid import UUID

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.exceptions import InvalidSignature
from sqlalchemy import desc, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.business import Business, BusinessSettings
from app.models.customer import Customer
from app.models.ticket import RepairTicket, TicketCommunication, UnassignedMessage

OPEN_STATUSES = {
    "new",
    "diagnosing",
    "waiting_approval",
    "waiting_parts",
    "repairing",
    "testing",
    "ready_for_pickup",
}

TICKET_REF_RE = re.compile(r"\[?([A-Z]{2,10}-\d+)\]?", re.IGNORECASE)

EVENT_TEMPLATES: dict[str, tuple[str, str]] = {
    "ticket_created": (
        "Ticket Created: [{ticket_number}]",
        "<p>Hi {customer_name},</p><p>Your repair ticket <strong>{ticket_number}</strong> has been created.</p>",
    ),
    "quote_ready": (
        "Quote Ready: [{ticket_number}]",
        "<p>Hi {customer_name},</p><p>Your quote for ticket <strong>{ticket_number}</strong> is ready.</p>",
    ),
    "quote_approved": (
        "Quote Approved: [{ticket_number}]",
        "<p>Hi {customer_name},</p><p>Your quote has been approved and repair work can proceed.</p>",
    ),
    "repair_started": (
        "Repair Started: [{ticket_number}]",
        "<p>Hi {customer_name},</p><p>Repair work has started on ticket <strong>{ticket_number}</strong>.</p>",
    ),
    "waiting_parts": (
        "Waiting for Parts: [{ticket_number}]",
        "<p>Hi {customer_name},</p><p>Your repair is waiting on parts. We will update you as soon as they arrive.</p>",
    ),
    "ready_for_pickup": (
        "Ready for Pickup: [{ticket_number}]",
        "<p>Hi {customer_name},</p><p>Your device is ready for pickup.</p>",
    ),
    "repair_completed": (
        "Repair Completed: [{ticket_number}]",
        "<p>Hi {customer_name},</p><p>Your repair ticket <strong>{ticket_number}</strong> has been completed.</p>",
    ),
    "warranty_reminder": (
        "Warranty Reminder: [{ticket_number}]",
        "<p>Hi {customer_name},</p><p>This is a reminder about your repair warranty.</p>",
    ),
}

STATUS_EVENT_MAP = {
    "repairing": "repair_started",
    "waiting_parts": "waiting_parts",
    "ready_for_pickup": "ready_for_pickup",
    "completed": "repair_completed",
}


async def ensure_communication_schema(db: AsyncSession) -> None:
    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS ticket_communications (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
              ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
              channel VARCHAR(20) NOT NULL,
              direction VARCHAR(20) NOT NULL,
              message_type VARCHAR(50) NOT NULL DEFAULT 'message',
              status VARCHAR(30) NOT NULL DEFAULT 'stored',
              sender VARCHAR(255),
              recipient VARCHAR(255),
              subject VARCHAR(255),
              body_text TEXT,
              body_html TEXT,
              attachments JSONB DEFAULT '[]',
              provider_message_id VARCHAR(255),
              in_reply_to VARCHAR(255),
              error_message TEXT,
              created_by_id UUID REFERENCES users(id),
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS unassigned_messages (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
              channel VARCHAR(20) NOT NULL,
              sender VARCHAR(255),
              recipient VARCHAR(255),
              subject VARCHAR(255),
              body_text TEXT,
              body_html TEXT,
              attachments JSONB DEFAULT '[]',
              provider_message_id VARCHAR(255),
              received_at TIMESTAMPTZ,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    await db.execute(
        text("CREATE INDEX IF NOT EXISTS idx_ticket_comms_ticket ON ticket_communications(ticket_id, created_at)")
    )
    await db.execute(
        text("CREATE INDEX IF NOT EXISTS idx_unassigned_messages_business ON unassigned_messages(business_id, created_at)")
    )


def _settings_dict(settings: BusinessSettings | None, key: str) -> dict[str, Any]:
    value = getattr(settings, key, None) if settings else None
    return value if isinstance(value, dict) else {}


async def get_business_settings(db: AsyncSession, business_id: UUID) -> BusinessSettings | None:
    return await db.scalar(select(BusinessSettings).where(BusinessSettings.business_id == business_id))


async def ticket_context(db: AsyncSession, ticket: RepairTicket) -> dict[str, str]:
    customer = await db.get(Customer, ticket.customer_id)
    business = await db.get(Business, ticket.business_id)
    return {
        "ticket_number": ticket.ticket_number,
        "customer_name": customer.name if customer else "Customer",
        "customer_email": customer.email if customer and customer.email else "",
        "customer_phone": customer.phone if customer and customer.phone else "",
        "business_name": business.name if business else "",
        "status": ticket.status.replace("_", " "),
    }


def render_template(event_key: str, context: dict[str, str]) -> tuple[str, str]:
    subject_tpl, html_tpl = EVENT_TEMPLATES.get(event_key, EVENT_TEMPLATES["ticket_created"])
    safe_context = {k: escape(v or "") for k, v in context.items()}
    subject = subject_tpl.format(**context)
    html = html_tpl.format(**safe_context)
    return subject, html


def html_to_text(html: str) -> str:
    text_value = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text_value = re.sub(r"</p\s*>", "\n\n", text_value, flags=re.I)
    return re.sub(r"<[^>]+>", "", text_value).strip()


def _attachment_meta(attachments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "filename": a.get("filename"),
            "content_type": a.get("content_type", "application/octet-stream"),
            "size": len(base64.b64decode(a.get("content_base64", "") or b"")),
            "content_base64": a.get("content_base64"),
        }
        for a in attachments
    ]


def _send_smtp_sync(config: dict[str, Any], sender: str, recipient: str, subject: str, body_html: str, body_text: str, attachments: list[dict[str, Any]]) -> str:
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = recipient
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid()
    msg.set_content(body_text or html_to_text(body_html))
    msg.add_alternative(body_html, subtype="html")
    for attachment in attachments:
        payload = base64.b64decode(attachment["content_base64"])
        maintype, _, subtype = attachment.get("content_type", "application/octet-stream").partition("/")
        msg.add_attachment(
            payload,
            maintype=maintype or "application",
            subtype=subtype or "octet-stream",
            filename=attachment["filename"],
        )
    host = config.get("host")
    port = int(config.get("port") or 587)
    if not host:
        raise RuntimeError("SMTP host is not configured")
    with smtplib.SMTP(host, port, timeout=20) as smtp:
        if config.get("tls_enabled", True):
            smtp.starttls()
        if config.get("username"):
            smtp.login(config["username"], config.get("password") or "")
        smtp.send_message(msg)
    return msg.get("Message-ID") or ""


async def send_ticket_email(
    db: AsyncSession,
    ticket: RepairTicket,
    *,
    to: str | None,
    subject: str,
    body_html: str,
    body_text: str | None,
    attachments: list[dict[str, Any]],
    user_id: UUID | None,
    message_type: str = "manual",
) -> TicketCommunication:
    settings = await get_business_settings(db, ticket.business_id)
    email_settings = _settings_dict(settings, "email_settings")
    smtp_config = email_settings.get("smtp", {})
    context = await ticket_context(db, ticket)
    recipient = to or context["customer_email"]
    sender = smtp_config.get("from_email") or smtp_config.get("username") or "no-reply@localhost"
    comm = TicketCommunication(
        business_id=ticket.business_id,
        ticket_id=ticket.id,
        channel="email",
        direction="outbound",
        message_type=message_type,
        status="pending",
        sender=sender,
        recipient=recipient,
        subject=subject,
        body_text=body_text or html_to_text(body_html),
        body_html=body_html,
        attachments=_attachment_meta(attachments),
        created_by_id=user_id,
    )
    db.add(comm)
    await db.flush()
    try:
        if not recipient:
            raise RuntimeError("Customer email is not available")
        provider_id = await asyncio.to_thread(
            _send_smtp_sync,
            smtp_config,
            sender,
            recipient,
            subject,
            body_html,
            body_text or html_to_text(body_html),
            attachments,
        )
        comm.status = "sent"
        comm.provider_message_id = provider_id
    except Exception as exc:
        comm.status = "failed"
        comm.error_message = str(exc)
    await db.flush()
    return comm


def _send_sms_gateway_sync(config: dict[str, Any], recipient: str, message: str) -> str:
    """Send SMS via a generic SMS gateway API.
    
    Configure in sms_settings.gateway with:
    - api_url: The SMS gateway endpoint URL
    - api_key: API key for authentication
    - sending_number: The sender phone number
    - auth_header: Optional, defaults to "Authorization: Bearer {api_key}"
    """
    api_key = config.get("api_key")
    sender = config.get("sending_number")
    api_url = config.get("api_url")
    if not api_key or not sender or not api_url:
        raise RuntimeError("SMS gateway API URL, API key, and sending number are not configured")
    payload = json.dumps(
        {
            "from": sender,
            "to": recipient,
            "text": message,
        }
    ).encode()
    req = request.Request(
        api_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    auth_header = config.get("auth_header", f"Bearer {api_key}")
    req.add_header("Authorization", auth_header)
    with request.urlopen(req, timeout=20) as response:
        data = json.loads(response.read().decode())
    # Try common response formats for message ID
    return str(data.get("data", {}).get("id", "") or data.get("id", "") or data.get("message_id", ""))


async def send_ticket_sms(
    db: AsyncSession,
    ticket: RepairTicket,
    *,
    to: str | None,
    message: str,
    user_id: UUID | None,
    message_type: str = "manual",
) -> TicketCommunication:
    settings = await get_business_settings(db, ticket.business_id)
    sms_settings = _settings_dict(settings, "sms_settings")
    gateway_config = sms_settings.get("gateway", {})
    context = await ticket_context(db, ticket)
    recipient = to or context["customer_phone"]
    sender = gateway_config.get("sending_number")
    comm = TicketCommunication(
        business_id=ticket.business_id,
        ticket_id=ticket.id,
        channel="sms",
        direction="outbound",
        message_type=message_type,
        status="pending",
        sender=sender,
        recipient=recipient,
        body_text=message,
        created_by_id=user_id,
    )
    db.add(comm)
    await db.flush()
    try:
        if not recipient:
            raise RuntimeError("Customer mobile number is not available")
        provider_id = await asyncio.to_thread(_send_sms_gateway_sync, gateway_config, recipient, message)
        comm.status = "sent"
        comm.provider_message_id = provider_id
    except Exception as exc:
        comm.status = "failed"
        comm.error_message = str(exc)
    await db.flush()
    return comm


async def send_automation(db: AsyncSession, ticket: RepairTicket, event_key: str, user_id: UUID | None = None) -> None:
    settings = await get_business_settings(db, ticket.business_id)
    if not settings:
        return
    email_settings = _settings_dict(settings, "email_settings")
    sms_settings = _settings_dict(settings, "sms_settings")
    automations = email_settings.get("automations", {})
    event_config = automations.get(event_key, {"email": False, "sms": False})
    context = await ticket_context(db, ticket)
    subject, html = render_template(event_key, context)
    if event_config.get("email"):
        await send_ticket_email(
            db,
            ticket,
            to=None,
            subject=subject,
            body_html=html,
            body_text=html_to_text(html),
            attachments=[],
            user_id=user_id,
            message_type=event_key,
        )
    if event_config.get("sms"):
        sms_text = f"{context['business_name']}: {subject}"
        await send_ticket_sms(db, ticket, to=None, message=sms_text[:320], user_id=user_id, message_type=event_key)


async def match_ticket(
    db: AsyncSession,
    business_id: UUID,
    *,
    subject: str | None = None,
    body: str | None = None,
    sender: str | None = None,
    phone: str | None = None,
    in_reply_to: str | None = None,
) -> RepairTicket | None:
    haystack = f"{subject or ''}\n{body or ''}"
    match = TICKET_REF_RE.search(haystack)
    if match:
        ticket = await db.scalar(
            select(RepairTicket).where(
                RepairTicket.business_id == business_id,
                RepairTicket.ticket_number.ilike(match.group(1)),
            )
        )
        if ticket:
            return ticket
    if in_reply_to:
        comm = await db.scalar(
            select(TicketCommunication).where(
                TicketCommunication.business_id == business_id,
                or_(
                    TicketCommunication.provider_message_id == in_reply_to,
                    TicketCommunication.in_reply_to == in_reply_to,
                ),
            )
        )
        if comm:
            return await db.get(RepairTicket, comm.ticket_id)
    customer = None
    if sender:
        customer = await db.scalar(
            select(Customer).where(Customer.business_id == business_id, Customer.email.ilike(sender))
        )
    if not customer and phone:
        normalized = re.sub(r"\D+", "", phone)
        customers = await db.execute(select(Customer).where(Customer.business_id == business_id, Customer.phone.isnot(None)))
        for candidate in customers.scalars().all():
            if normalized and normalized in re.sub(r"\D+", "", candidate.phone or ""):
                customer = candidate
                break
    if customer:
        return await db.scalar(
            select(RepairTicket)
            .where(RepairTicket.business_id == business_id, RepairTicket.customer_id == customer.id, RepairTicket.status.in_(OPEN_STATUSES))
            .order_by(desc(RepairTicket.created_at))
        )
    return await db.scalar(
        select(RepairTicket)
        .where(RepairTicket.business_id == business_id, RepairTicket.status.in_(OPEN_STATUSES))
        .order_by(desc(RepairTicket.created_at))
    )


async def store_inbound_message(
    db: AsyncSession,
    business_id: UUID,
    *,
    channel: str,
    sender: str | None,
    recipient: str | None,
    subject: str | None,
    body_text: str | None,
    body_html: str | None,
    attachments: list[dict[str, Any]],
    provider_message_id: str | None,
    in_reply_to: str | None = None,
    received_at: datetime | None = None,
) -> TicketCommunication | UnassignedMessage:
    ticket = await match_ticket(
        db,
        business_id,
        subject=subject,
        body=body_text or body_html,
        sender=sender if channel == "email" else None,
        phone=sender if channel == "sms" else None,
        in_reply_to=in_reply_to,
    )
    if ticket:
        comm = TicketCommunication(
            business_id=business_id,
            ticket_id=ticket.id,
            channel=channel,
            direction="inbound",
            message_type="customer_reply",
            status="received",
            sender=sender,
            recipient=recipient,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            attachments=attachments,
            provider_message_id=provider_message_id,
            in_reply_to=in_reply_to,
            created_at=received_at or datetime.now(timezone.utc),
        )
        db.add(comm)
        await db.flush()
        return comm
    unassigned = UnassignedMessage(
        business_id=business_id,
        channel=channel,
        sender=sender,
        recipient=recipient,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        attachments=attachments,
        provider_message_id=provider_message_id,
        received_at=received_at or datetime.now(timezone.utc),
    )
    db.add(unassigned)
    await db.flush()
    return unassigned


def parse_email_message(raw: bytes) -> dict[str, Any]:
    msg = BytesParser(policy=policy.default).parsebytes(raw)
    sender = next((addr for _, addr in getaddresses(msg.get_all("from", []))), None)
    recipient = next((addr for _, addr in getaddresses(msg.get_all("to", []))), None)
    body_text = ""
    body_html = ""
    attachments = []
    for part in msg.walk():
        if part.is_multipart():
            continue
        content_disposition = part.get_content_disposition()
        content_type = part.get_content_type()
        payload = part.get_payload(decode=True) or b""
        if content_disposition == "attachment":
            attachments.append(
                {
                    "filename": part.get_filename() or "attachment",
                    "content_type": content_type,
                    "size": len(payload),
                    "content_base64": base64.b64encode(payload).decode(),
                }
            )
        elif content_type == "text/plain":
            body_text += part.get_content()
        elif content_type == "text/html":
            body_html += part.get_content()
    received_at = None
    if msg.get("date"):
        try:
            received_at = parsedate_to_datetime(msg.get("date"))
        except Exception:
            received_at = None
    return {
        "sender": sender,
        "recipient": recipient,
        "subject": msg.get("subject"),
        "body_text": body_text.strip() or html_to_text(body_html),
        "body_html": body_html.strip() or None,
        "attachments": attachments,
        "provider_message_id": msg.get("message-id"),
        "in_reply_to": msg.get("in-reply-to") or msg.get("references"),
        "received_at": received_at,
    }


def _fetch_unread_imap(config: dict[str, Any]) -> list[dict[str, Any]]:
    host = config.get("host")
    username = config.get("username")
    password = config.get("password")
    if not host or not username or not password:
        return []
    port = int(config.get("port") or 993)
    mailbox = config.get("mailbox") or "INBOX"
    conn = imaplib.IMAP4_SSL(host, port) if config.get("ssl_enabled", True) else imaplib.IMAP4(host, port)
    try:
        conn.login(username, password)
        conn.select(mailbox)
        _, data = conn.search(None, "UNSEEN")
        messages = []
        for num in data[0].split():
            _, fetched = conn.fetch(num, "(RFC822)")
            raw = fetched[0][1]
            messages.append(parse_email_message(raw))
            conn.store(num, "+FLAGS", "\\Seen")
        return messages
    finally:
        try:
            conn.logout()
        except Exception:
            pass


async def poll_imap_once(session_factory: async_sessionmaker[AsyncSession]) -> None:
    async with session_factory() as db:
        result = await db.execute(select(BusinessSettings))
        settings_rows = result.scalars().all()
        for settings in settings_rows:
            email_settings = _settings_dict(settings, "email_settings")
            imap_config = email_settings.get("imap", {})
            if not imap_config.get("enabled"):
                continue
            messages = await asyncio.to_thread(_fetch_unread_imap, imap_config)
            for message in messages:
                await store_inbound_message(db, settings.business_id, channel="email", **message)
        await db.commit()


async def imap_poll_loop(session_factory: async_sessionmaker[AsyncSession]) -> None:
    while True:
        try:
            await poll_imap_once(session_factory)
        except Exception:
            pass
        await asyncio.sleep(120)


def verify_sms_webhook(config: dict[str, Any], body: bytes, signature: str | None, timestamp: str | None) -> bool:
    """Verify inbound SMS webhook signature.
    
    Supports Ed25519 signature verification. Configure in sms_settings.gateway with:
    - webhook_public_key: Ed25519 public key (hex or base64 encoded)
    """
    public_key = config.get("webhook_public_key")
    if not public_key or not signature or not timestamp:
        return False
    try:
        key_bytes = bytes.fromhex(public_key)
    except ValueError:
        key_bytes = base64.b64decode(public_key)
    signed_payload = f"{timestamp}|{body.decode()}".encode()
    try:
        Ed25519PublicKey.from_public_bytes(key_bytes).verify(base64.b64decode(signature), signed_payload)
        return True
    except (InvalidSignature, ValueError):
        return False
