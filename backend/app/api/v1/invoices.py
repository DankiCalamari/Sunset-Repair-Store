from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.exceptions import conflict, not_found
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceLine, Payment
from app.models.quote import Quotation
from app.models.ticket import RepairTicket
from app.schemas.common import PaginatedResponse
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceLineCreate,
    InvoiceLineResponse,
    InvoiceResponse,
    PaymentCreate,
    PaymentResponse,
)
from app.services.document_service import (
    calculate_totals,
    generate_invoice_number,
    get_business_and_settings,
    get_customer_or_404,
    get_tax_rate,
    get_ticket_or_404,
)
from app.services.pdf_service import (
    DocumentLine,
    DocumentTemplate,
    InvoicePdfContext,
    branding_from_business,
    load_logo_bytes,
    render_invoice_pdf,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])


async def _invoice_response(db: AsyncSession, invoice: Invoice) -> InvoiceResponse:
    customer = await db.get(Customer, invoice.customer_id)
    ticket = await db.get(RepairTicket, invoice.ticket_id) if invoice.ticket_id else None
    return InvoiceResponse(
        id=invoice.id,
        business_id=invoice.business_id,
        customer_id=invoice.customer_id,
        ticket_id=invoice.ticket_id,
        invoice_number=invoice.invoice_number,
        status=invoice.status,
        subtotal=invoice.subtotal,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total=invoice.total,
        amount_paid=invoice.amount_paid,
        customer_name=customer.name if customer else None,
        ticket_number=ticket.ticket_number if ticket else None,
        lines=[InvoiceLineResponse.model_validate(l) for l in invoice.lines],
        payments=[PaymentResponse.model_validate(p) for p in invoice.payments],
        issued_at=invoice.issued_at,
        created_at=invoice.created_at,
    )


@router.get("", response_model=PaginatedResponse[InvoiceResponse])
async def list_invoices(
    status: str | None = None,
    customer_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVOICES_READ)),
    db: AsyncSession = Depends(get_db),
):
    base = (
        select(Invoice)
        .where(Invoice.business_id == business_id)
        .options(selectinload(Invoice.lines), selectinload(Invoice.payments))
    )
    if status:
        base = base.where(Invoice.status == status)
    if customer_id:
        base = base.where(Invoice.customer_id == customer_id)
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(
        base.order_by(Invoice.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    invoices = result.scalars().unique().all()
    items = [await _invoice_response(db, inv) for inv in invoices]
    pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size, pages=pages)


@router.post("", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    body: InvoiceCreate,
    user: CurrentUser = Depends(require_permission(Permission.INVOICES_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    await get_customer_or_404(db, body.customer_id, business_id)
    ticket_id = body.ticket_id
    lines: list[InvoiceLineCreate] = body.lines or []
    discount = body.discount_amount

    if body.quote_id:
        result = await db.execute(
            select(Quotation)
            .where(Quotation.id == body.quote_id, Quotation.business_id == business_id)
            .options(selectinload(Quotation.lines))
        )
        quote = result.scalar_one_or_none()
        if not quote:
            raise not_found("Quote")
        if quote.status != "approved":
            raise conflict("Invoice can only be created from approved quotes")
        ticket_id = quote.ticket_id
        lines = [
            InvoiceLineCreate(
                description=ln.description,
                quantity=ln.quantity,
                unit_price=ln.unit_price,
            )
            for ln in quote.lines
        ]
        discount = quote.discount_amount

    if ticket_id:
        await get_ticket_or_404(db, ticket_id, business_id)

    if not lines:
        raise conflict("Invoice requires at least one line item")

    tax_rate = await get_tax_rate(db, business_id)
    line_amounts = [(ln.quantity, ln.unit_price) for ln in lines]
    subtotal, tax_amount, discount_amt, total = calculate_totals(line_amounts, tax_rate, discount)

    invoice = Invoice(
        business_id=business_id,
        customer_id=body.customer_id,
        ticket_id=ticket_id,
        invoice_number=await generate_invoice_number(db, business_id),
        status="sent",
        subtotal=subtotal,
        tax_amount=tax_amount,
        discount_amount=discount_amt,
        total=total,
        issued_at=datetime.now(timezone.utc),
    )
    db.add(invoice)
    await db.flush()
    for ln in lines:
        db.add(
            InvoiceLine(
                invoice_id=invoice.id,
                description=ln.description,
                quantity=ln.quantity,
                unit_price=ln.unit_price,
            )
        )
    await db.flush()
    await db.refresh(invoice, ["lines", "payments"])
    return await _invoice_response(db, invoice)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVOICES_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.business_id == business_id)
        .options(selectinload(Invoice.lines), selectinload(Invoice.payments))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise not_found("Invoice")
    return await _invoice_response(db, invoice)


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVOICES_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.business_id == business_id)
        .options(selectinload(Invoice.lines), selectinload(Invoice.payments))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise not_found("Invoice")

    customer = await db.get(Customer, invoice.customer_id)
    ticket = await db.get(RepairTicket, invoice.ticket_id) if invoice.ticket_id else None
    business, settings = await get_business_and_settings(db, business_id)
    branding_data = (settings.branding_json if settings else {}) or {}
    logo_bytes = await load_logo_bytes(branding_data if isinstance(branding_data, dict) else {})
    branding = branding_from_business(business, settings, logo_bytes)
    tax_rate = await get_tax_rate(db, business_id)
    invoice_template = DocumentTemplate.from_json(
        (settings.invoice_template_json if settings else {}) or {}
    )

    pdf_bytes = render_invoice_pdf(
        branding,
        InvoicePdfContext(
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
                    "method": payment.method,
                    "reference": payment.reference,
                    "amount": payment.amount,
                }
                for payment in invoice.payments
            ],
        ),
        invoice_template,
    )
    filename = f"{invoice.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{invoice_id}/payments", response_model=InvoiceResponse)
async def record_payment(
    invoice_id: UUID,
    body: PaymentCreate,
    user: CurrentUser = Depends(require_permission(Permission.INVOICES_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.business_id == business_id)
        .options(selectinload(Invoice.lines), selectinload(Invoice.payments))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise not_found("Invoice")
    if invoice.status in ("void", "refunded"):
        raise conflict("Cannot pay a void or refunded invoice")

    payment = Payment(
        business_id=business_id,
        invoice_id=invoice.id,
        amount=body.amount,
        method=body.method,
        reference=body.reference,
        created_by_id=user.id,
    )
    db.add(payment)
    invoice.amount_paid = Decimal(str(invoice.amount_paid)) + body.amount
    if invoice.amount_paid >= invoice.total:
        invoice.status = "paid"
    elif invoice.amount_paid > 0:
        invoice.status = "partial"
    await db.flush()
    await db.refresh(invoice, ["lines", "payments"])
    return await _invoice_response(db, invoice)
