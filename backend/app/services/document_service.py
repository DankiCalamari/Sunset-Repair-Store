from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import not_found
from app.models.business import BusinessSettings
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.quote import Quotation
from app.models.ticket import RepairTicket


async def get_tax_rate(db: AsyncSession, business_id: UUID) -> Decimal:
    result = await db.execute(
        select(BusinessSettings.tax_rate).where(BusinessSettings.business_id == business_id)
    )
    rate = result.scalar_one_or_none()
    return Decimal(str(rate)) if rate is not None else Decimal("0.10")


def calculate_totals(
    lines: list[tuple[Decimal, Decimal]],
    tax_rate: Decimal,
    discount: Decimal = Decimal("0"),
) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    subtotal = sum(qty * price for qty, price in lines)
    taxable = max(subtotal - discount, Decimal("0"))
    tax_amount = (taxable * tax_rate).quantize(Decimal("0.01"))
    total = (taxable + tax_amount).quantize(Decimal("0.01"))
    return (
        subtotal.quantize(Decimal("0.01")),
        tax_amount,
        discount.quantize(Decimal("0.01")),
        total,
    )


async def generate_quote_number(db: AsyncSession, business_id: UUID) -> str:
    result = await db.execute(
        select(func.count()).select_from(Quotation).where(Quotation.business_id == business_id)
    )
    count = result.scalar() or 0
    settings = await db.execute(
        select(BusinessSettings.ticket_prefix).where(BusinessSettings.business_id == business_id)
    )
    prefix = settings.scalar_one_or_none() or "SCT"
    return f"{prefix}-Q{1001 + count}"


async def generate_invoice_number(db: AsyncSession, business_id: UUID) -> str:
    result = await db.execute(
        select(func.count()).select_from(Invoice).where(Invoice.business_id == business_id)
    )
    count = result.scalar() or 0
    settings = await db.execute(
        select(BusinessSettings.ticket_prefix).where(BusinessSettings.business_id == business_id)
    )
    prefix = settings.scalar_one_or_none() or "SCT"
    return f"{prefix}-INV{1001 + count}"


async def get_ticket_or_404(db: AsyncSession, ticket_id: UUID, business_id: UUID) -> RepairTicket:
    result = await db.execute(
        select(RepairTicket).where(
            RepairTicket.id == ticket_id, RepairTicket.business_id == business_id
        )
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise not_found("Ticket")
    return ticket


async def get_customer_or_404(db: AsyncSession, customer_id: UUID, business_id: UUID) -> Customer:
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.business_id == business_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise not_found("Customer")
    return customer


async def get_business_and_settings(
    db: AsyncSession, business_id: UUID
) -> tuple["Business", BusinessSettings | None]:
    from app.models.business import Business

    business = await db.get(Business, business_id)
    if not business:
        raise not_found("Business")
    settings = await db.scalar(select(BusinessSettings).where(BusinessSettings.business_id == business_id))
    return business, settings
