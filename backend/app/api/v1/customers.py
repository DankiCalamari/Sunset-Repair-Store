from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.quote import Quotation
from app.models.ticket import RepairTicket
from app.schemas.common import PaginatedResponse
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate
from app.schemas.invoice import InvoiceResponse
from app.schemas.quote import QuoteResponse
from app.schemas.ticket import TicketResponse
from app.core.exceptions import not_found

router = APIRouter(prefix="/customers", tags=["Customers"])


def _customer_full_name():
    return func.concat(Customer.first_name, " ", Customer.last_name)


@router.get("", response_model=PaginatedResponse[CustomerResponse])
async def list_customers(
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.CUSTOMERS_READ)),
    db: AsyncSession = Depends(get_db),
):
    base = select(Customer).where(Customer.business_id == business_id, Customer.is_active.is_(True))
    if q:
        pattern = f"%{q}%"
        base = base.where(
            or_(
                Customer.first_name.ilike(pattern),
                Customer.last_name.ilike(pattern),
                _customer_full_name().ilike(pattern),
                Customer.email.ilike(pattern),
                Customer.phone.ilike(pattern),
            )
        )
    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar() or 0
    result = await db.execute(
        base.order_by(Customer.last_name, Customer.first_name).offset((page - 1) * page_size).limit(page_size)
    )
    items = [CustomerResponse.model_validate(c) for c in result.scalars().all()]
    pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size, pages=pages)


@router.post("", response_model=CustomerResponse, status_code=201)
async def create_customer(
    body: CustomerCreate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.CUSTOMERS_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    customer = Customer(business_id=business_id, **body.model_dump())
    db.add(customer)
    await db.flush()
    await db.refresh(customer)
    return CustomerResponse.model_validate(customer)


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.CUSTOMERS_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.business_id == business_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise not_found("Customer")
    return CustomerResponse.model_validate(customer)


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID,
    body: CustomerUpdate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.CUSTOMERS_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.business_id == business_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise not_found("Customer")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(customer, k, v)
    await db.flush()
    return CustomerResponse.model_validate(customer)


@router.get("/{customer_id}/repairs", response_model=list[TicketResponse])
async def customer_repairs(
    customer_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.CUSTOMERS_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.business_id == business_id)
    )
    if not result.scalar_one_or_none():
        raise not_found("Customer")
    tickets = await db.execute(
        select(RepairTicket)
        .where(RepairTicket.customer_id == customer_id, RepairTicket.business_id == business_id)
        .order_by(RepairTicket.created_at.desc())
    )
    return [TicketResponse.model_validate(t) for t in tickets.scalars().all()]


@router.get("/{customer_id}/quotes", response_model=list[QuoteResponse])
async def customer_quotes(
    customer_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.CUSTOMERS_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.business_id == business_id)
    )
    if not result.scalar_one_or_none():
        raise not_found("Customer")
    ticket_ids = await db.scalars(
        select(RepairTicket.id).where(
            RepairTicket.customer_id == customer_id, RepairTicket.business_id == business_id
        )
    )
    ids = list(ticket_ids.all())
    if not ids:
        return []
    from app.api.v1.quotes import _quote_response
    from sqlalchemy.orm import selectinload

    quotes = await db.execute(
        select(Quotation)
        .where(Quotation.ticket_id.in_(ids))
        .options(selectinload(Quotation.lines))
        .order_by(Quotation.created_at.desc())
    )
    return [await _quote_response(db, q) for q in quotes.scalars().unique().all()]


@router.get("/{customer_id}/invoices", response_model=list[InvoiceResponse])
async def customer_invoices(
    customer_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.CUSTOMERS_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.business_id == business_id)
    )
    if not result.scalar_one_or_none():
        raise not_found("Customer")
    from app.api.v1.invoices import _invoice_response
    from sqlalchemy.orm import selectinload
    from app.models.invoice import Invoice

    invoices = await db.execute(
        select(Invoice)
        .where(Invoice.customer_id == customer_id, Invoice.business_id == business_id)
        .options(selectinload(Invoice.lines), selectinload(Invoice.payments))
        .order_by(Invoice.created_at.desc())
    )
    return [await _invoice_response(db, inv) for inv in invoices.scalars().unique().all()]
