from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.exceptions import not_found
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.inventory import InventoryItem
from app.schemas.common import PaginatedResponse
from app.schemas.inventory import InventoryItemResponse

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/items", response_model=PaginatedResponse[InventoryItemResponse])
async def list_items(
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVENTORY_READ)),
    db: AsyncSession = Depends(get_db),
):
    base = select(InventoryItem).where(
        InventoryItem.business_id == business_id,
        InventoryItem.is_active.is_(True),
    )
    if q:
        pattern = f"%{q}%"
        base = base.where(
            or_(
                InventoryItem.name.ilike(pattern),
                InventoryItem.sku.ilike(pattern),
                InventoryItem.barcode.ilike(pattern),
            )
        )
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
