from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class InvoiceLineCreate(BaseModel):
    description: str = Field(max_length=255)
    quantity: Decimal = Field(default=Decimal("1"), gt=0)
    unit_price: Decimal = Field(ge=0)


class InvoiceLineResponse(BaseModel):
    id: UUID
    description: str
    quantity: Decimal
    unit_price: Decimal

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    customer_id: UUID
    ticket_id: UUID | None = None
    quote_id: UUID | None = None
    lines: list[InvoiceLineCreate] | None = None
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0)


class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    method: str = Field(pattern="^(cash|card|bank_transfer)$")
    reference: str | None = None


class PaymentResponse(BaseModel):
    id: UUID
    amount: Decimal
    method: str
    reference: str | None
    paid_at: datetime

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: UUID
    business_id: UUID
    customer_id: UUID
    ticket_id: UUID | None
    invoice_number: str
    status: str
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    amount_paid: Decimal
    customer_name: str | None = None
    ticket_number: str | None = None
    lines: list[InvoiceLineResponse] = []
    payments: list[PaymentResponse] = []
    issued_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
