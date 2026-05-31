from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.exceptions import conflict, not_found
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.customer import Customer
from app.models.quote import Quotation, QuotationLine
from app.models.ticket import RepairTicket
from app.schemas.common import PaginatedResponse
from app.schemas.quote import (
    QuoteCreate,
    QuoteLineResponse,
    QuoteReject,
    QuoteResponse,
    QuoteUpdate,
)
from app.services.document_service import (
    calculate_totals,
    generate_quote_number,
    get_tax_rate,
    get_ticket_or_404,
)
from app.services.ticket_service import transition_status
from app.services.communication_service import send_automation

router = APIRouter(prefix="/quotes", tags=["Quotations"])


async def _quote_response(db: AsyncSession, quote: Quotation) -> QuoteResponse:
    ticket = await db.get(RepairTicket, quote.ticket_id)
    customer = await db.get(Customer, ticket.customer_id) if ticket else None
    return QuoteResponse(
        id=quote.id,
        business_id=quote.business_id,
        ticket_id=quote.ticket_id,
        quote_number=quote.quote_number,
        status=str(quote.status),
        subtotal=Decimal(str(quote.subtotal)),
        tax_amount=Decimal(str(quote.tax_amount)),
        discount_amount=Decimal(str(quote.discount_amount)),
        total=Decimal(str(quote.total)),
        valid_until=quote.valid_until,
        customer_id=customer.id if customer else None,
        customer_name=customer.name if customer else None,
        ticket_number=ticket.ticket_number if ticket else None,
        lines=[QuoteLineResponse.model_validate(l) for l in quote.lines],
        created_at=quote.created_at,
    )


@router.get("", response_model=PaginatedResponse[QuoteResponse])
async def list_quotes(
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.QUOTES_READ)),
    db: AsyncSession = Depends(get_db),
):
    base = (
        select(Quotation)
        .where(Quotation.business_id == business_id)
        .options(selectinload(Quotation.lines))
    )
    if status:
        base = base.where(Quotation.status == status)
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(
        base.order_by(Quotation.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    quotes = result.scalars().unique().all()
    items = [await _quote_response(db, q) for q in quotes]
    pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size, pages=pages)


@router.post("", response_model=QuoteResponse, status_code=201)
async def create_quote(
    body: QuoteCreate,
    user: CurrentUser = Depends(require_permission(Permission.QUOTES_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    await get_ticket_or_404(db, body.ticket_id, business_id)
    tax_rate = await get_tax_rate(db, business_id)
    line_amounts = [(ln.quantity, ln.unit_price) for ln in body.lines]
    subtotal, tax_amount, discount, total = calculate_totals(
        line_amounts, tax_rate, body.discount_amount
    )
    quote = Quotation(
        business_id=business_id,
        ticket_id=body.ticket_id,
        quote_number=await generate_quote_number(db, business_id),
        subtotal=subtotal,
        tax_amount=tax_amount,
        discount_amount=discount,
        total=total,
        valid_until=body.valid_until,
        created_by_id=user.id,
    )
    db.add(quote)
    await db.flush()
    for i, ln in enumerate(body.lines):
        db.add(
            QuotationLine(
                quotation_id=quote.id,
                line_type=ln.line_type,
                description=ln.description,
                quantity=ln.quantity,
                unit_price=ln.unit_price,
                sort_order=ln.sort_order or i,
            )
        )
    await db.flush()
    await db.refresh(quote, ["lines"])
    return await _quote_response(db, quote)


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.QUOTES_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quotation)
        .where(Quotation.id == quote_id, Quotation.business_id == business_id)
        .options(selectinload(Quotation.lines))
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise not_found("Quote")
    return await _quote_response(db, quote)


@router.patch("/{quote_id}", response_model=QuoteResponse)
async def update_quote(
    quote_id: UUID,
    body: QuoteUpdate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.QUOTES_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quotation)
        .where(Quotation.id == quote_id, Quotation.business_id == business_id)
        .options(selectinload(Quotation.lines))
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise not_found("Quote")
    if quote.status not in ("draft", "sent"):
        raise conflict("Only draft or sent quotes can be edited")

    if body.lines is not None:
        for line in list(quote.lines):
            await db.delete(line)
        tax_rate = await get_tax_rate(db, business_id)
        line_amounts = [(ln.quantity, ln.unit_price) for ln in body.lines]
        discount = body.discount_amount if body.discount_amount is not None else quote.discount_amount
        subtotal, tax_amount, discount_amt, total = calculate_totals(
            line_amounts, tax_rate, Decimal(str(discount))
        )
        quote.subtotal = subtotal
        quote.tax_amount = tax_amount
        quote.discount_amount = discount_amt
        quote.total = total
        for i, ln in enumerate(body.lines):
            db.add(
                QuotationLine(
                    quotation_id=quote.id,
                    line_type=ln.line_type,
                    description=ln.description,
                    quantity=ln.quantity,
                    unit_price=ln.unit_price,
                    sort_order=ln.sort_order or i,
                )
            )
    if body.discount_amount is not None and body.lines is None:
        tax_rate = await get_tax_rate(db, business_id)
        line_amounts = [(l.quantity, l.unit_price) for l in quote.lines]
        subtotal, tax_amount, discount_amt, total = calculate_totals(
            line_amounts, tax_rate, body.discount_amount
        )
        quote.subtotal = subtotal
        quote.tax_amount = tax_amount
        quote.discount_amount = discount_amt
        quote.total = total
    if body.valid_until is not None:
        quote.valid_until = body.valid_until
    await db.flush()
    await db.refresh(quote, ["lines"])
    return await _quote_response(db, quote)


@router.post("/{quote_id}/send", response_model=QuoteResponse)
async def send_quote(
    quote_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.QUOTES_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quotation)
        .where(Quotation.id == quote_id, Quotation.business_id == business_id)
        .options(selectinload(Quotation.lines))
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise not_found("Quote")
    if quote.status != "draft":
        raise conflict("Only draft quotes can be sent")
    quote.status = "sent"
    ticket = await get_ticket_or_404(db, quote.ticket_id, business_id)
    if ticket.status == "diagnosing":
        await transition_status(
            db, ticket, "waiting_approval", user_id=None, note="Quote sent to customer", customer_visible=True
        )
    await send_automation(db, ticket, "quote_ready", None)
    await db.flush()
    return await _quote_response(db, quote)


@router.post("/{quote_id}/approve", response_model=QuoteResponse)
async def approve_quote(
    quote_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.QUOTES_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quotation)
        .where(Quotation.id == quote_id, Quotation.business_id == business_id)
        .options(selectinload(Quotation.lines))
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise not_found("Quote")
    if quote.status not in ("sent", "draft"):
        raise conflict("Quote cannot be approved in current status")
    quote.status = "approved"
    quote.approved_at = datetime.now(timezone.utc)
    ticket = await get_ticket_or_404(db, quote.ticket_id, business_id)
    if ticket.status in ("waiting_approval", "diagnosing"):
        await transition_status(
            db, ticket, "repairing", user_id=None, note="Quote approved", customer_visible=True
        )
    await send_automation(db, ticket, "quote_approved", None)
    await db.flush()
    return await _quote_response(db, quote)


@router.post("/{quote_id}/reject", response_model=QuoteResponse)
async def reject_quote(
    quote_id: UUID,
    body: QuoteReject,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.QUOTES_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quotation)
        .where(Quotation.id == quote_id, Quotation.business_id == business_id)
        .options(selectinload(Quotation.lines))
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise not_found("Quote")
    if quote.status not in ("sent", "draft"):
        raise conflict("Quote cannot be rejected in current status")
    quote.status = "rejected"
    quote.rejected_at = datetime.now(timezone.utc)
    quote.rejection_reason = body.reason
    await db.flush()
    return await _quote_response(db, quote)
