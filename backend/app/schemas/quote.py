from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class QuoteLineCreate(BaseModel):
    line_type: str = Field(pattern="^(labour|parts)$")
    description: str = Field(max_length=255)
    quantity: Decimal = Field(default=Decimal("1"), gt=0)
    unit_price: Decimal = Field(ge=0)
    sort_order: int = 0


class QuoteLineResponse(BaseModel):
    id: UUID
    line_type: str
    description: str
    quantity: Decimal
    unit_price: Decimal
    sort_order: int

    model_config = {"from_attributes": True}


class QuoteCreate(BaseModel):
    ticket_id: UUID
    lines: list[QuoteLineCreate] = Field(min_length=1)
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0)
    valid_until: date | None = None


class QuoteUpdate(BaseModel):
    lines: list[QuoteLineCreate] | None = None
    discount_amount: Decimal | None = None
    valid_until: date | None = None
    status: str | None = None


class QuoteResponse(BaseModel):
    id: UUID
    business_id: UUID
    ticket_id: UUID
    quote_number: str
    status: str
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    valid_until: date | None
    customer_id: UUID | None = None
    customer_name: str | None = None
    ticket_number: str | None = None
    lines: list[QuoteLineResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class QuoteReject(BaseModel):
    reason: str | None = None
