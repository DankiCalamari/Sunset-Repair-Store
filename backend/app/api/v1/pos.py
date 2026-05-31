from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.exceptions import conflict, not_found
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.business import BusinessSettings
from app.models.inventory import InventoryItem, StockMovement
from app.models.pos import PosSale, PosSaleLine
from app.schemas.pos import PosSaleCreate, PosSaleLineResponse, PosSaleResponse

router = APIRouter(prefix="/pos", tags=["POS"])


async def _generate_sale_number(db: AsyncSession, business_id: UUID) -> str:
    count = await db.scalar(select(func.count()).select_from(PosSale).where(PosSale.business_id == business_id)) or 0
    return f"POS-{count + 1:06d}"


async def _tax_rate(db: AsyncSession, business_id: UUID) -> Decimal:
    settings = await db.scalar(select(BusinessSettings).where(BusinessSettings.business_id == business_id))
    return Decimal(str(settings.tax_rate if settings else "0.10"))


async def _sale_response(db: AsyncSession, sale: PosSale) -> PosSaleResponse:
    item_ids = [line.inventory_item_id for line in sale.lines]
    items = {}
    if item_ids:
        result = await db.execute(select(InventoryItem).where(InventoryItem.id.in_(item_ids)))
        items = {item.id: item for item in result.scalars().all()}
    return PosSaleResponse(
        id=sale.id,
        sale_number=sale.sale_number,
        customer_id=sale.customer_id,
        subtotal=sale.subtotal,
        tax_amount=sale.tax_amount,
        total=sale.total,
        payment_method=sale.payment_method,
        lines=[
            PosSaleLineResponse(
                id=line.id,
                inventory_item_id=line.inventory_item_id,
                item_name=items.get(line.inventory_item_id).name if line.inventory_item_id in items else None,
                quantity=line.quantity,
                unit_price=line.unit_price,
            )
            for line in sale.lines
        ],
        created_at=sale.created_at,
    )


@router.post("/sales", response_model=PosSaleResponse, status_code=201)
async def create_sale(
    body: PosSaleCreate,
    user: CurrentUser = Depends(require_permission(Permission.POS_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    item_ids = [line.inventory_item_id for line in body.lines]
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.business_id == business_id,
            InventoryItem.id.in_(item_ids),
            InventoryItem.is_active.is_(True),
        )
    )
    items = {item.id: item for item in result.scalars().all()}
    if len(items) != len(set(item_ids)):
        raise not_found("Inventory item")

    subtotal = Decimal("0")
    for line in body.lines:
        item = items[line.inventory_item_id]
        if item.quantity_on_hand < line.quantity:
            raise conflict(f"Not enough stock for {item.name}")
        subtotal += Decimal(str(item.unit_price)) * line.quantity
    tax_amount = (subtotal * await _tax_rate(db, business_id)).quantize(Decimal("0.01"))
    total = subtotal + tax_amount

    sale = PosSale(
        business_id=business_id,
        sale_number=await _generate_sale_number(db, business_id),
        customer_id=body.customer_id,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total=total,
        payment_method=body.payment_method,
        created_by_id=user.id,
    )
    db.add(sale)
    await db.flush()

    for line in body.lines:
        item = items[line.inventory_item_id]
        item.quantity_on_hand -= line.quantity
        db.add(
            PosSaleLine(
                pos_sale_id=sale.id,
                inventory_item_id=item.id,
                quantity=line.quantity,
                unit_price=item.unit_price,
            )
        )
        db.add(
            StockMovement(
                business_id=business_id,
                inventory_item_id=item.id,
                movement_type="sale",
                quantity=-line.quantity,
                reference_type="pos_sale",
                reference_id=sale.id,
                created_by_id=user.id,
            )
        )
    await db.flush()
    await db.refresh(sale, ["lines"])
    return await _sale_response(db, sale)


@router.get("/sales/{sale_id}", response_model=PosSaleResponse)
async def get_sale(
    sale_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVOICES_READ)),
    db: AsyncSession = Depends(get_db),
):
    sale = await db.scalar(
        select(PosSale)
        .where(PosSale.id == sale_id, PosSale.business_id == business_id)
        .options(selectinload(PosSale.lines))
    )
    if not sale:
        raise not_found("Sale")
    return await _sale_response(db, sale)


@router.get("/sales/{sale_id}/receipt", response_model=PosSaleResponse)
async def get_sale_receipt(
    sale_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.INVOICES_READ)),
    db: AsyncSession = Depends(get_db),
):
    return await get_sale(sale_id, business_id, _, db)
