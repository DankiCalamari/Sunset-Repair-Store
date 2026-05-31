from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.ticket import RepairTicket
from app.schemas.dashboard import DashboardSummary, TechnicianWorkload

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

IN_PROGRESS = {"diagnosing", "waiting_approval", "waiting_parts", "repairing", "testing"}


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.DASHBOARD_READ)),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)

    repairs_today = await db.scalar(
        select(func.count())
        .select_from(RepairTicket)
        .where(RepairTicket.business_id == business_id, RepairTicket.created_at >= start)
    )
    in_progress = await db.scalar(
        select(func.count())
        .select_from(RepairTicket)
        .where(RepairTicket.business_id == business_id, RepairTicket.status.in_(IN_PROGRESS))
    )
    pickup = await db.scalar(
        select(func.count())
        .select_from(RepairTicket)
        .where(RepairTicket.business_id == business_id, RepairTicket.status == "ready_for_pickup")
    )

    return DashboardSummary(
        repairs_today=repairs_today or 0,
        revenue_today=0.0,
        repairs_in_progress=in_progress or 0,
        devices_waiting_pickup=pickup or 0,
        low_stock_count=0,
    )


@router.get("/technician-workload", response_model=list[TechnicianWorkload])
async def technician_workload(
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.DASHBOARD_READ)),
    db: AsyncSession = Depends(get_db),
):
    return []
