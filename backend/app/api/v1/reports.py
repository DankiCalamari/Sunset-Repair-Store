from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.business import User
from app.models.inventory import InventoryItem
from app.models.invoice import Invoice, Payment
from app.models.pos import PosSale
from app.models.ticket import RepairTicket
from app.schemas.reports import (
    CommonRepairRow,
    InventoryReport,
    RevenueReport,
    TechnicianReportRow,
    WarrantyReport,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


def _range(from_date: date | None, to_date: date | None) -> tuple[datetime, datetime]:
    start = datetime.combine(from_date or (date.today() - timedelta(days=30)), datetime.min.time(), tzinfo=timezone.utc)
    end = datetime.combine((to_date or date.today()) + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
    return start, end


@router.get("/revenue", response_model=RevenueReport)
async def revenue_report(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.REPORTS_READ)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _range(from_date, to_date)
    invoice_revenue = await db.scalar(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.business_id == business_id,
            Invoice.created_at >= start,
            Invoice.created_at < end,
            Invoice.status != "void",
        )
    )
    pos_revenue = await db.scalar(
        select(func.coalesce(func.sum(PosSale.total), 0)).where(
            PosSale.business_id == business_id,
            PosSale.created_at >= start,
            PosSale.created_at < end,
        )
    )
    payments_collected = await db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.business_id == business_id,
            Payment.paid_at >= start,
            Payment.paid_at < end,
        )
    )
    invoice_count = await db.scalar(
        select(func.count()).select_from(Invoice).where(
            Invoice.business_id == business_id,
            Invoice.created_at >= start,
            Invoice.created_at < end,
        )
    )
    pos_count = await db.scalar(
        select(func.count()).select_from(PosSale).where(
            PosSale.business_id == business_id,
            PosSale.created_at >= start,
            PosSale.created_at < end,
        )
    )
    inv = Decimal(str(invoice_revenue or 0))
    pos = Decimal(str(pos_revenue or 0))
    return RevenueReport(
        invoice_revenue=inv,
        pos_revenue=pos,
        total_revenue=inv + pos,
        payments_collected=Decimal(str(payments_collected or 0)),
        invoice_count=invoice_count or 0,
        pos_sale_count=pos_count or 0,
    )


@router.get("/technicians", response_model=list[TechnicianReportRow])
async def technicians_report(
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.REPORTS_READ)),
    db: AsyncSession = Depends(get_db),
):
    completed = case((RepairTicket.status == "completed", 1), else_=0)
    open_ticket = case((RepairTicket.status != "completed", 1), else_=0)
    result = await db.execute(
        select(User.id, User.full_name, func.sum(open_ticket), func.sum(completed))
        .select_from(RepairTicket)
        .join(User, User.id == RepairTicket.assigned_technician_id, isouter=True)
        .where(RepairTicket.business_id == business_id)
        .group_by(User.id, User.full_name)
        .order_by(func.sum(open_ticket).desc())
    )
    return [
        TechnicianReportRow(
            technician_id=str(row[0]) if row[0] else None,
            technician_name=row[1] or "Unassigned",
            open_tickets=row[2] or 0,
            completed_tickets=row[3] or 0,
        )
        for row in result.all()
    ]


@router.get("/common-repairs", response_model=list[CommonRepairRow])
async def common_repairs_report(
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.REPORTS_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RepairTicket.issue_description, func.count())
        .where(RepairTicket.business_id == business_id)
        .group_by(RepairTicket.issue_description)
        .order_by(func.count().desc())
        .limit(10)
    )
    return [CommonRepairRow(issue_description=row[0], count=row[1]) for row in result.all()]


@router.get("/inventory", response_model=InventoryReport)
async def inventory_report(
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.REPORTS_READ)),
    db: AsyncSession = Depends(get_db),
):
    active = await db.scalar(
        select(func.count()).select_from(InventoryItem).where(
            InventoryItem.business_id == business_id,
            InventoryItem.is_active.is_(True),
        )
    )
    low = await db.scalar(
        select(func.count()).select_from(InventoryItem).where(
            InventoryItem.business_id == business_id,
            InventoryItem.is_active.is_(True),
            InventoryItem.quantity_on_hand <= InventoryItem.reorder_level,
        )
    )
    value = await db.scalar(
        select(func.coalesce(func.sum(InventoryItem.unit_cost * InventoryItem.quantity_on_hand), 0)).where(
            InventoryItem.business_id == business_id,
            InventoryItem.is_active.is_(True),
        )
    )
    return InventoryReport(active_items=active or 0, low_stock_items=low or 0, stock_value=Decimal(str(value or 0)))


@router.get("/warranty", response_model=WarrantyReport)
async def warranty_report(
    _: CurrentUser = Depends(require_permission(Permission.REPORTS_READ)),
):
    return WarrantyReport(active_warranties=0, expiring_soon=0, open_claims=0)
