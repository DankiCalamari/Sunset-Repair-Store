from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.exceptions import conflict, not_found
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.inventory import (
    InventoryCategory,
    InventoryItem,
    PurchaseOrder,
    PurchaseOrderLine,
    StockMovement,
    Supplier,
)
from app.schemas.common import PaginatedResponse
from app.schemas.inventory import (
    InventoryCategoryCreate,
    InventoryCategoryResponse,
    InventoryCategoryUpdate,
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
    PurchaseOrderCreate,
    PurchaseOrderLineResponse,
    PurchaseOrderReceiveLine,
    PurchaseOrderResponse,
    StockAdjustmentCreate,
    StockMovementResponse,
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _po_response(db: AsyncSession, po: PurchaseOrder) -> PurchaseOrderResponse:
    supplier = await db.get(Supplier, po.supplier_id)
    lines = []
    for ln in po.lines:
        item = await db.get(InventoryItem, ln.inventory_item_id)
        lines.append(
            PurchaseOrderLineResponse(
                id=ln.id,
                inventory_item_id=ln.inventory_item_id,
                item_name=item.name if item else None,
                quantity_ordered=ln.quantity_ordered,
                quantity_received=ln.quantity_received,
                unit_cost=ln.unit_cost,
            )
        )
    return PurchaseOrderResponse(
        id=po.id,
        business_id=po.business_id,
        supplier_id=po.supplier_id,
        supplier_name=supplier.name if supplier else None,
        po_number=po.po_number,
        status=po.status,
        ordered_at=po.ordered_at,
        received_at=po.received_at,
        notes=po.notes,
        lines=lines,
        created_at=po.created_at,
    )


async def _generate_po_number(db: AsyncSession, business_id: UUID) -> str:
    count = await db.scalar(
        select(func.count()).where(PurchaseOrder.business_id == business_id)
    ) or 0
    return f"PO-{count + 1:04d}"


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

@router.get("/categories", response_model=list[InventoryCategoryResponse])
async def list_categories(
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryCategory)
        .where(InventoryCategory.business_id == business_id)
        .order_by(InventoryCategory.name)
    )
    return [InventoryCategoryResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/categories", response_model=InventoryCategoryResponse, status_code=201)
async def create_category(
    body: InventoryCategoryCreate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(
        select(InventoryCategory).where(
            InventoryCategory.business_id == business_id,
            InventoryCategory.slug == body.slug,
        )
    )
    if existing:
        raise conflict("A category with this slug already exists")
    cat = InventoryCategory(business_id=business_id, **body.model_dump())
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return InventoryCategoryResponse.model_validate(cat)


@router.patch("/categories/{category_id}", response_model=InventoryCategoryResponse)
async def update_category(
    category_id: UUID,
    body: InventoryCategoryUpdate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    cat = await db.scalar(
        select(InventoryCategory).where(
            InventoryCategory.id == category_id,
            InventoryCategory.business_id == business_id,
        )
    )
    if not cat:
        raise not_found("Category")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    await db.flush()
    return InventoryCategoryResponse.model_validate(cat)


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(
    category_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    cat = await db.scalar(
        select(InventoryCategory).where(
            InventoryCategory.id == category_id,
            InventoryCategory.business_id == business_id,
        )
    )
    if not cat:
        raise not_found("Category")
    await db.delete(cat)
    await db.flush()


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------

@router.get("/items", response_model=PaginatedResponse[InventoryItemResponse])
async def list_items(
    q: str | None = None,
    category_id: UUID | None = None,
    low_stock: bool = False,
    active_only: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_READ)),
    db: AsyncSession = Depends(get_db),
):
    base = select(InventoryItem).where(InventoryItem.business_id == business_id)
    if active_only:
        base = base.where(InventoryItem.is_active.is_(True))
    if q:
        pattern = f"%{q}%"
        base = base.where(
            or_(
                InventoryItem.name.ilike(pattern),
                InventoryItem.sku.ilike(pattern),
                InventoryItem.barcode.ilike(pattern),
            )
        )
    if category_id:
        base = base.where(InventoryItem.category_id == category_id)
    if low_stock:
        base = base.where(InventoryItem.quantity_on_hand <= InventoryItem.reorder_level)
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(
        base.order_by(InventoryItem.name).offset((page - 1) * page_size).limit(page_size)
    )
    pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        items=[InventoryItemResponse.model_validate(i) for i in result.scalars().all()],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("/items", response_model=InventoryItemResponse, status_code=201)
async def create_item(
    body: InventoryItemCreate,
    user: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(
        select(InventoryItem).where(
            InventoryItem.business_id == business_id,
            InventoryItem.sku == body.sku,
        )
    )
    if existing:
        raise conflict("An item with this SKU already exists")
    item = InventoryItem(business_id=business_id, **body.model_dump())
    db.add(item)
    await db.flush()
    # Record opening stock movement if quantity > 0
    if item.quantity_on_hand > 0:
        db.add(
            StockMovement(
                business_id=business_id,
                inventory_item_id=item.id,
                movement_type="adjustment",
                quantity=item.quantity_on_hand,
                notes="Opening stock",
                created_by_id=user.id,
            )
        )
        await db.flush()
    await db.refresh(item)
    return InventoryItemResponse.model_validate(item)


@router.get("/items/by-barcode/{code}", response_model=InventoryItemResponse)
async def get_item_by_barcode(
    code: str,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_READ)),
    db: AsyncSession = Depends(get_db),
):
    item = await db.scalar(
        select(InventoryItem).where(
            InventoryItem.business_id == business_id,
            InventoryItem.barcode == code,
            InventoryItem.is_active.is_(True),
        )
    )
    if not item:
        raise not_found("Inventory item")
    return InventoryItemResponse.model_validate(item)


@router.get("/items/{item_id}", response_model=InventoryItemResponse)
async def get_item(
    item_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_READ)),
    db: AsyncSession = Depends(get_db),
):
    item = await db.scalar(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.business_id == business_id,
        )
    )
    if not item:
        raise not_found("Inventory item")
    return InventoryItemResponse.model_validate(item)


@router.patch("/items/{item_id}", response_model=InventoryItemResponse)
async def update_item(
    item_id: UUID,
    body: InventoryItemUpdate,
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    item = await db.scalar(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.business_id == business_id,
        )
    )
    if not item:
        raise not_found("Inventory item")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.flush()
    await db.refresh(item)
    return InventoryItemResponse.model_validate(item)


@router.delete("/items/{item_id}", status_code=204)
async def deactivate_item(
    item_id: UUID,
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete: marks item as inactive."""
    item = await db.scalar(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.business_id == business_id,
        )
    )
    if not item:
        raise not_found("Inventory item")
    item.is_active = False
    await db.flush()


# ---------------------------------------------------------------------------
# Stock Movements
# ---------------------------------------------------------------------------

@router.get("/items/{item_id}/movements", response_model=list[StockMovementResponse])
async def list_movements(
    item_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_READ)),
    db: AsyncSession = Depends(get_db),
):
    item = await db.scalar(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.business_id == business_id,
        )
    )
    if not item:
        raise not_found("Inventory item")
    result = await db.execute(
        select(StockMovement)
        .where(
            StockMovement.inventory_item_id == item_id,
            StockMovement.business_id == business_id,
        )
        .order_by(StockMovement.created_at.desc())
        .limit(100)
    )
    return [StockMovementResponse.model_validate(m) for m in result.scalars().all()]


@router.post("/items/{item_id}/adjust", response_model=InventoryItemResponse)
async def adjust_stock(
    item_id: UUID,
    body: StockAdjustmentCreate,
    user: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    item = await db.scalar(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.business_id == business_id,
        )
    )
    if not item:
        raise not_found("Inventory item")
    new_qty = item.quantity_on_hand + body.quantity
    if new_qty < 0:
        raise conflict("Adjustment would result in negative stock")
    item.quantity_on_hand = new_qty
    db.add(
        StockMovement(
            business_id=business_id,
            inventory_item_id=item.id,
            movement_type="adjustment",
            quantity=body.quantity,
            notes=body.notes,
            created_by_id=user.id,
        )
    )
    await db.flush()
    await db.refresh(item)
    return InventoryItemResponse.model_validate(item)


# ---------------------------------------------------------------------------
# Suppliers
# ---------------------------------------------------------------------------

@router.get("/suppliers", response_model=PaginatedResponse[SupplierResponse])
async def list_suppliers(
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_READ)),
    db: AsyncSession = Depends(get_db),
):
    base = select(Supplier).where(Supplier.business_id == business_id)
    if q:
        pattern = f"%{q}%"
        base = base.where(
            or_(Supplier.name.ilike(pattern), Supplier.contact_name.ilike(pattern))
        )
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(
        base.order_by(Supplier.name).offset((page - 1) * page_size).limit(page_size)
    )
    pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        items=[SupplierResponse.model_validate(s) for s in result.scalars().all()],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("/suppliers", response_model=SupplierResponse, status_code=201)
async def create_supplier(
    body: SupplierCreate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    supplier = Supplier(business_id=business_id, **body.model_dump())
    db.add(supplier)
    await db.flush()
    await db.refresh(supplier)
    return SupplierResponse.model_validate(supplier)


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_READ)),
    db: AsyncSession = Depends(get_db),
):
    supplier = await db.scalar(
        select(Supplier).where(Supplier.id == supplier_id, Supplier.business_id == business_id)
    )
    if not supplier:
        raise not_found("Supplier")
    return SupplierResponse.model_validate(supplier)


@router.patch("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: UUID,
    body: SupplierUpdate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    supplier = await db.scalar(
        select(Supplier).where(Supplier.id == supplier_id, Supplier.business_id == business_id)
    )
    if not supplier:
        raise not_found("Supplier")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(supplier, k, v)
    await db.flush()
    return SupplierResponse.model_validate(supplier)


@router.delete("/suppliers/{supplier_id}", status_code=204)
async def delete_supplier(
    supplier_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    supplier = await db.scalar(
        select(Supplier).where(Supplier.id == supplier_id, Supplier.business_id == business_id)
    )
    if not supplier:
        raise not_found("Supplier")
    await db.delete(supplier)
    await db.flush()


# ---------------------------------------------------------------------------
# Purchase Orders
# ---------------------------------------------------------------------------

@router.get("/purchase-orders", response_model=PaginatedResponse[PurchaseOrderResponse])
async def list_purchase_orders(
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_READ)),
    db: AsyncSession = Depends(get_db),
):
    base = (
        select(PurchaseOrder)
        .where(PurchaseOrder.business_id == business_id)
        .options(selectinload(PurchaseOrder.lines))
    )
    if status:
        base = base.where(PurchaseOrder.status == status)
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(
        base.order_by(PurchaseOrder.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    pos = result.scalars().unique().all()
    items = [await _po_response(db, po) for po in pos]
    pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size, pages=pages)


@router.post("/purchase-orders", response_model=PurchaseOrderResponse, status_code=201)
async def create_purchase_order(
    body: PurchaseOrderCreate,
    user: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    supplier = await db.scalar(
        select(Supplier).where(Supplier.id == body.supplier_id, Supplier.business_id == business_id)
    )
    if not supplier:
        raise not_found("Supplier")
    po = PurchaseOrder(
        business_id=business_id,
        supplier_id=body.supplier_id,
        po_number=await _generate_po_number(db, business_id),
        status="draft",
        notes=body.notes,
    )
    db.add(po)
    await db.flush()
    for ln in body.lines:
        item = await db.scalar(
            select(InventoryItem).where(
                InventoryItem.id == ln.inventory_item_id,
                InventoryItem.business_id == business_id,
            )
        )
        if not item:
            raise not_found(f"Inventory item {ln.inventory_item_id}")
        db.add(
            PurchaseOrderLine(
                purchase_order_id=po.id,
                inventory_item_id=ln.inventory_item_id,
                quantity_ordered=ln.quantity_ordered,
                unit_cost=ln.unit_cost,
            )
        )
    await db.flush()
    await db.refresh(po, ["lines"])
    return await _po_response(db, po)


@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PurchaseOrder)
        .where(PurchaseOrder.id == po_id, PurchaseOrder.business_id == business_id)
        .options(selectinload(PurchaseOrder.lines))
    )
    po = result.scalar_one_or_none()
    if not po:
        raise not_found("Purchase order")
    return await _po_response(db, po)


@router.post("/purchase-orders/{po_id}/submit", response_model=PurchaseOrderResponse)
async def submit_purchase_order(
    po_id: UUID,
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PurchaseOrder)
        .where(PurchaseOrder.id == po_id, PurchaseOrder.business_id == business_id)
        .options(selectinload(PurchaseOrder.lines))
    )
    po = result.scalar_one_or_none()
    if not po:
        raise not_found("Purchase order")
    if po.status != "draft":
        raise conflict("Only draft purchase orders can be submitted")
    po.status = "ordered"
    po.ordered_at = datetime.now(timezone.utc)
    await db.flush()
    return await _po_response(db, po)


@router.post("/purchase-orders/{po_id}/receive", response_model=PurchaseOrderResponse)
async def receive_purchase_order(
    po_id: UUID,
    body: list[PurchaseOrderReceiveLine],
    user: CurrentUser = Depends(require_permission(Permission.INVENTORY_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PurchaseOrder)
        .where(PurchaseOrder.id == po_id, PurchaseOrder.business_id == business_id)
        .options(selectinload(PurchaseOrder.lines))
    )
    po = result.scalar_one_or_none()
    if not po:
        raise not_found("Purchase order")
    if po.status not in ("ordered", "partial"):
        raise conflict("Purchase order must be in ordered or partial status to receive")

    receive_map = {r.line_id: r.quantity_received for r in body}
    all_received = True

    for ln in po.lines:
        qty = receive_map.get(ln.id, 0)
        if qty <= 0:
            if ln.quantity_received < ln.quantity_ordered:
                all_received = False
            continue
        ln.quantity_received = min(ln.quantity_received + qty, ln.quantity_ordered)
        if ln.quantity_received < ln.quantity_ordered:
            all_received = False
        # Update inventory
        item = await db.get(InventoryItem, ln.inventory_item_id)
        if item:
            item.quantity_on_hand += qty
            db.add(
                StockMovement(
                    business_id=business_id,
                    inventory_item_id=item.id,
                    movement_type="purchase",
                    quantity=qty,
                    reference_type="purchase_order",
                    reference_id=po.id,
                    created_by_id=user.id,
                )
            )

    po.status = "received" if all_received else "partial"
    if all_received:
        po.received_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(po, ["lines"])
    return await _po_response(db, po)
