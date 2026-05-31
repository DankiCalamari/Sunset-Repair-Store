from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

class InventoryCategoryResponse(BaseModel):
    id: UUID
    business_id: UUID
    name: str
    slug: str

    model_config = {"from_attributes": True}


class InventoryCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-z0-9_-]+$")


class InventoryCategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    slug: str | None = Field(None, min_length=1, max_length=50, pattern=r"^[a-z0-9_-]+$")


# ---------------------------------------------------------------------------
# Inventory Item
# ---------------------------------------------------------------------------

class InventoryItemResponse(BaseModel):
    id: UUID
    business_id: UUID
    category_id: UUID | None
    sku: str
    name: str
    description: str | None
    barcode: str | None
    unit_cost: Decimal
    unit_price: Decimal
    quantity_on_hand: int
    reorder_level: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InventoryItemCreate(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    barcode: str | None = Field(None, max_length=50)
    category_id: UUID | None = None
    unit_cost: Decimal = Field(Decimal("0"), ge=0)
    unit_price: Decimal = Field(Decimal("0"), ge=0)
    quantity_on_hand: int = Field(0, ge=0)
    reorder_level: int = Field(5, ge=0)
    is_active: bool = True


class InventoryItemUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    barcode: str | None = Field(None, max_length=50)
    category_id: UUID | None = None
    unit_cost: Decimal | None = Field(None, ge=0)
    unit_price: Decimal | None = Field(None, ge=0)
    reorder_level: int | None = Field(None, ge=0)
    is_active: bool | None = None


# ---------------------------------------------------------------------------
# Stock Movement / Adjustment
# ---------------------------------------------------------------------------

MovementType = Literal["purchase", "sale", "repair_consumption", "adjustment", "return"]


class StockMovementResponse(BaseModel):
    id: UUID
    business_id: UUID
    inventory_item_id: UUID
    movement_type: str
    quantity: int
    reference_type: str | None
    reference_id: UUID | None
    notes: str | None
    created_by_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class StockAdjustmentCreate(BaseModel):
    """Manual stock adjustment — positive to add, negative to remove."""
    quantity: int = Field(..., ne=0)
    notes: str | None = None


# ---------------------------------------------------------------------------
# Supplier
# ---------------------------------------------------------------------------

class SupplierResponse(BaseModel):
    id: UUID
    business_id: UUID
    name: str
    contact_name: str | None
    email: str | None
    phone: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SupplierCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    contact_name: str | None = Field(None, max_length=255)
    email: str | None = None
    phone: str | None = Field(None, max_length=50)
    notes: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    contact_name: str | None = Field(None, max_length=255)
    email: str | None = None
    phone: str | None = Field(None, max_length=50)
    notes: str | None = None


# ---------------------------------------------------------------------------
# Purchase Order
# ---------------------------------------------------------------------------

PurchaseOrderStatus = Literal["draft", "ordered", "partial", "received", "cancelled"]


class PurchaseOrderLineResponse(BaseModel):
    id: UUID
    inventory_item_id: UUID
    item_name: str | None = None
    quantity_ordered: int
    quantity_received: int
    unit_cost: Decimal

    model_config = {"from_attributes": True}


class PurchaseOrderResponse(BaseModel):
    id: UUID
    business_id: UUID
    supplier_id: UUID
    supplier_name: str | None = None
    po_number: str
    status: str
    ordered_at: datetime | None
    received_at: datetime | None
    notes: str | None
    lines: list[PurchaseOrderLineResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class PurchaseOrderLineCreate(BaseModel):
    inventory_item_id: UUID
    quantity_ordered: int = Field(..., ge=1)
    unit_cost: Decimal = Field(..., ge=0)


class PurchaseOrderCreate(BaseModel):
    supplier_id: UUID
    notes: str | None = None
    lines: list[PurchaseOrderLineCreate] = Field(..., min_length=1)


class PurchaseOrderReceiveLine(BaseModel):
    line_id: UUID
    quantity_received: int = Field(..., ge=0)
