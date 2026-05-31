from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class InventoryItemResponse(BaseModel):
    id: UUID
    sku: str
    name: str
    description: str | None
    barcode: str | None
    unit_price: Decimal
    quantity_on_hand: int
    reorder_level: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
