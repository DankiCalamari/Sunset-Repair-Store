from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class PosSaleLineCreate(BaseModel):
    inventory_item_id: UUID
    quantity: int = Field(gt=0)


class PosSaleCreate(BaseModel):
    customer_id: UUID | None = None
    payment_method: str = Field(pattern="^(cash|card|bank_transfer)$")
    lines: list[PosSaleLineCreate] = Field(min_length=1)


class PosSaleLineResponse(BaseModel):
    id: UUID
    inventory_item_id: UUID
    item_name: str | None = None
    quantity: int
    unit_price: Decimal

    model_config = {"from_attributes": True}


class PosSaleResponse(BaseModel):
    id: UUID
    sale_number: str
    customer_id: UUID | None
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal
    payment_method: str
    lines: list[PosSaleLineResponse]
    created_at: datetime

    model_config = {"from_attributes": True}
