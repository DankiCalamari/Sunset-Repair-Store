"""Public-facing API for the customer-facing website.

All endpoints are unauthenticated — they rely on the public site being
served from the same domain. The business is identified via the
`business_slug` query parameter (for booking) or by looking up the
customer contact (for portal/tracking).
"""

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import bad_request, not_found
from app.db.session import get_db
from app.models.business import Business, BusinessSettings
from app.models.customer import Customer, Device
from app.models.invoice import Invoice
from app.models.quote import Quotation
from app.models.ticket import RepairTicket, TicketCommunication
from app.services.pdf_service import (
    DocumentTemplate,
    branding_from_business,
    load_logo_bytes,
    render_invoice_pdf,
)
from app.services.ticket_service import build_tracker, generate_ticket_number

router = APIRouter(prefix="/public", tags=["Public Website"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_business_by_slug(db: AsyncSession, slug: str) -> Business:
    result = await db.execute(select(Business).where(Business.slug == slug, Business.is_active == True))
    business = result.scalar_one_or_none()
    if not business:
        raise not_found("Business")
    return business


# ---------------------------------------------------------------------------
# POST /public/bookings — Create a booking (customer + device + ticket)
# ---------------------------------------------------------------------------

@router.post("/bookings")
async def create_booking(
    body: dict,
    business_slug: str = Query(..., alias="business_slug"),
    db: AsyncSession = Depends(get_db),
):
    business = await _get_business_by_slug(db, business_slug)

    name = (body.get("name") or "").strip()
    phone = (body.get("phone") or "").strip()
    email = (body.get("email") or "").strip() or None
    address = (body.get("address") or "").strip()
    suburb = (body.get("suburb") or "").strip()
    device_type = (body.get("device_type") or "").strip()
    brand = (body.get("brand") or "").strip()
    model = (body.get("model") or "").strip()
    issue = (body.get("issue_description") or "").strip()
    preferred_date = body.get("preferred_date")
    preferred_time = body.get("preferred_time")
    service_type = (body.get("service_type") or "").strip()

    if not name or not phone or not issue:
        raise bad_request("Name, phone, and issue description are required")

    # Create customer
    customer = Customer(
        business_id=business.id,
        name=name,
        email=email,
        phone=phone,
        address_line1=address or None,
        city=suburb or None,
    )
    db.add(customer)
    await db.flush()

    # Create device
    device = Device(
        business_id=business.id,
        customer_id=customer.id,
        manufacturer=brand or device_type,
        model=model or device_type,
    )
    db.add(device)
    await db.flush()

    # Generate ticket number
    ticket_number = await generate_ticket_number(db, business.id)

    # Build customer notes from booking details
    notes_parts = []
    if device_type:
        notes_parts.append(f"Device type: {device_type}")
    if preferred_date:
        notes_parts.append(f"Preferred date: {preferred_date}")
    if preferred_time:
        notes_parts.append(f"Preferred time: {preferred_time}")
    if service_type:
        notes_parts.append(f"Service type: {service_type}")

    # Create repair ticket
    ticket = RepairTicket(
        business_id=business.id,
        ticket_number=ticket_number,
        customer_id=customer.id,
        device_id=device.id,
        issue_description=issue,
        status="new",
        customer_notes="\n".join(notes_parts) if notes_parts else None,
    )
    db.add(ticket)
    await db.commit()

    return {
        "ticket_id": str(ticket.id),
        "ticket_number": ticket.ticket_number,
        "status": ticket.status,
    }


# ---------------------------------------------------------------------------
# POST /public/tracking — Look up repair status
# ---------------------------------------------------------------------------

@router.post("/tracking")
async def track_repair(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    ticket_ref = (body.get("ticket_reference") or "").strip()
    contact = (body.get("contact") or "").strip()

    if not ticket_ref or not contact:
        raise bad_request("Ticket reference and contact are required")

    # Find the ticket across all businesses
    result = await db.execute(
        select(RepairTicket).where(RepairTicket.ticket_number == ticket_ref)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise not_found("Repair ticket")

    # Verify the contact matches the customer
    customer = await db.get(Customer, ticket.customer_id)
    if not customer or (customer.email != contact and customer.phone != contact):
        raise not_found("Repair ticket")

    tracker = build_tracker(ticket)
    return {
        "ticket_number": tracker.ticket_number,
        "status": tracker.status,
        "steps": [{"key": s.key, "label": s.label, "completed": s.completed, "current": s.current} for s in tracker.steps],
    }


# ---------------------------------------------------------------------------
# GET /public/portal — Customer portal summary
# ---------------------------------------------------------------------------

@router.get("/portal")
async def customer_portal(
    contact: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if not contact:
        raise bad_request("Contact is required")

    # Find customer across all businesses
    result = await db.execute(
        select(Customer).where(
            Customer.is_active == True,
            (Customer.email == contact) | (Customer.phone == contact),
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        return {"repairs": [], "quotes": [], "invoices": []}

    # Get repairs
    repairs_result = await db.execute(
        select(RepairTicket)
        .where(RepairTicket.customer_id == customer.id)
        .order_by(RepairTicket.created_at.desc())
    )
    repairs = repairs_result.scalars().all()

    repairs_out = [
        {
            "id": str(r.id),
            "ticket_number": r.ticket_number,
            "status": r.status,
            "issue_description": r.issue_description,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in repairs
    ]

    # Get quotes for this customer's tickets
    ticket_ids = [r.id for r in repairs]
    quotes_out: list[dict] = []
    if ticket_ids:
        quotes_result = await db.execute(
            select(Quotation)
            .where(Quotation.ticket_id.in_(ticket_ids))
            .order_by(Quotation.created_at.desc())
        )
        for q in quotes_result.scalars().all():
            quotes_out.append({
                "id": str(q.id),
                "ticket_id": str(q.ticket_id),
                "quote_number": q.quote_number,
                "status": q.status,
                "total": str(q.total),
            })

    # Get invoices for this customer
    invoices_result = await db.execute(
        select(Invoice)
        .where(Invoice.customer_id == customer.id)
        .order_by(Invoice.created_at.desc())
    )
    invoices_out: list[dict] = []
    for inv in invoices_result.scalars().all():
        invoices_out.append({
            "id": str(inv.id),
            "ticket_id": str(inv.ticket_id) if inv.ticket_id else None,
            "invoice_number": inv.invoice_number,
            "status": inv.status,
            "total": str(inv.total),
            "amount_paid": str(inv.amount_paid),
        })

    return {
        "repairs": repairs_out,
        "quotes": quotes_out,
        "invoices": invoices_out,
    }


# ---------------------------------------------------------------------------
# POST /public/messages — Send a message linked to a ticket
# ---------------------------------------------------------------------------

@router.post("/messages")
async def send_message(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    ticket_ref = (body.get("ticket_reference") or "").strip()
    contact = (body.get("contact") or "").strip()
    message = (body.get("message") or "").strip()

    if not ticket_ref or not contact or not message:
        raise bad_request("Ticket reference, contact, and message are required")

    # Find ticket
    result = await db.execute(
        select(RepairTicket).where(RepairTicket.ticket_number == ticket_ref)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise not_found("Repair ticket")

    # Verify contact
    customer = await db.get(Customer, ticket.customer_id)
    if not customer or (customer.email != contact and customer.phone != contact):
        raise not_found("Repair ticket")

    comm = TicketCommunication(
        business_id=ticket.business_id,
        ticket_id=ticket.id,
        channel="portal",
        direction="inbound",
        message_type="customer_message",
        status="received",
        sender=contact,
        body_text=message,
    )
    db.add(comm)
    await db.commit()

    return {"ok": True, "message_id": str(comm.id)}


# ---------------------------------------------------------------------------
# POST /public/warranty-claims — Submit a warranty claim
# ---------------------------------------------------------------------------

@router.post("/warranty-claims")
async def submit_warranty_claim(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    ticket_ref = (body.get("ticket_reference") or "").strip()
    contact = (body.get("contact") or "").strip()
    issue = (body.get("issue") or "").strip()
    message = (body.get("message") or "").strip()

    if not ticket_ref or not contact or not issue:
        raise bad_request("Ticket reference, contact, and issue are required")

    # Find ticket
    result = await db.execute(
        select(RepairTicket).where(RepairTicket.ticket_number == ticket_ref)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise not_found("Repair ticket")

    # Verify contact
    customer = await db.get(Customer, ticket.customer_id)
    if not customer or (customer.email != contact and customer.phone != contact):
        raise not_found("Repair ticket")

    # Store as a communication with warranty claim type
    comm = TicketCommunication(
        business_id=ticket.business_id,
        ticket_id=ticket.id,
        channel="portal",
        direction="inbound",
        message_type="warranty_claim",
        status="received",
        sender=contact,
        subject=f"Warranty claim: {issue}",
        body_text=message or issue,
    )
    db.add(comm)
    await db.commit()

    return {"ok": True, "claim_id": str(comm.id)}


# ---------------------------------------------------------------------------
# POST /public/quotes/{quote_id}/approve — Approve a quote
# ---------------------------------------------------------------------------

@router.post("/quotes/{quote_id}/approve")
async def approve_public_quote(
    quote_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    ticket_ref = (body.get("ticket_reference") or "").strip()
    contact = (body.get("contact") or "").strip()

    if not contact:
        raise bad_request("Contact is required")

    # Find the quote
    quote = await db.get(Quotation, quote_id)
    if not quote:
        raise not_found("Quote")

    # Verify via ticket number
    ticket = await db.get(RepairTicket, quote.ticket_id)
    if not ticket or ticket.ticket_number != ticket_ref:
        raise not_found("Quote")

    # Verify contact
    customer = await db.get(Customer, ticket.customer_id)
    if not customer or (customer.email != contact and customer.phone != contact):
        raise not_found("Quote")

    if quote.status not in ("draft", "sent"):
        raise bad_request(f"Cannot approve quote in '{quote.status}' status")

    quote.status = "approved"
    await db.commit()

    return {"ok": True, "status": quote.status}


# ---------------------------------------------------------------------------
# GET /public/invoices/{invoice_id}/pdf — Download invoice PDF
# ---------------------------------------------------------------------------

@router.get("/invoices/{invoice_id}/pdf")
async def download_public_invoice_pdf(
    invoice_id: UUID,
    ticket_reference: str = Query(...),
    contact: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Find invoice with lines and payments
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .options(selectinload(Invoice.lines), selectinload(Invoice.payments))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise not_found("Invoice")

    # Verify via ticket
    ticket = None
    if invoice.ticket_id:
        ticket = await db.get(RepairTicket, invoice.ticket_id)
        if ticket and ticket.ticket_number != ticket_reference:
            raise not_found("Invoice")

    # Verify contact
    customer = await db.get(Customer, invoice.customer_id)
    if not customer or (customer.email != contact and customer.phone != contact):
        raise not_found("Invoice")

    # Load business and settings
    from app.models.business import Business

    business = await db.get(Business, invoice.business_id)
    settings = await db.scalar(
        select(BusinessSettings).where(BusinessSettings.business_id == invoice.business_id)
    )

    # Load branding
    branding_data = settings.branding_json if settings else {}
    logo_bytes = await load_logo_bytes(branding_data if isinstance(branding_data, dict) else {})
    branding = branding_from_business(business, settings, logo_bytes)

    # Load template
    template_data = (settings.invoice_template_json if settings else None) or {}
    template = DocumentTemplate.from_json(template_data)

    from app.services.pdf_service import DocumentLine, InvoicePdfContext

    tax_rate = Decimal(str(settings.tax_rate)) if settings else Decimal("0.10")

    ctx = InvoicePdfContext(
        invoice_number=invoice.invoice_number,
        status=invoice.status,
        issued_at=invoice.issued_at,
        created_at=invoice.created_at,
        customer_name=customer.name if customer else "Customer",
        customer_email=customer.email if customer else None,
        customer_phone=customer.phone if customer else None,
        ticket_number=ticket.ticket_number if ticket else None,
        lines=[
            DocumentLine(
                description=line.description,
                quantity=Decimal(str(line.quantity)),
                unit_price=Decimal(str(line.unit_price)),
            )
            for line in invoice.lines
        ],
        subtotal=Decimal(str(invoice.subtotal)),
        tax_amount=Decimal(str(invoice.tax_amount)),
        discount_amount=Decimal(str(invoice.discount_amount)),
        total=Decimal(str(invoice.total)),
        amount_paid=Decimal(str(invoice.amount_paid)),
        tax_rate=tax_rate,
        payments=[
            {
                "paid_at": payment.paid_at,
                "amount": Decimal(str(payment.amount)),
                "method": payment.method,
            }
            for payment in invoice.payments
        ],
    )

    pdf_bytes = render_invoice_pdf(branding, ctx, template)

    from fastapi.responses import Response

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="invoice-{invoice.invoice_number}.pdf"'
        },
    )
