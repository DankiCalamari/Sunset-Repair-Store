from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_permission
from app.core.exceptions import forbidden, not_found
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.ticket import RepairTicket
from app.schemas.ticket import TicketResponse, TrackerResponse
from app.services.ticket_service import build_tracker

router = APIRouter(prefix="/portal", tags=["Customer Portal"])


@router.get("/repairs", response_model=list[TicketResponse])
async def my_repairs(
    user: CurrentUser = Depends(require_permission(Permission.PORTAL_ACCESS)),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "customer":
        raise forbidden("Portal access only")
    return []


@router.get("/repairs/{ticket_id}/tracker", response_model=TrackerResponse)
async def repair_tracker(
    ticket_id: UUID,
    user: CurrentUser = Depends(require_permission(Permission.PORTAL_ACCESS)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(RepairTicket).where(RepairTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise not_found("Repair")
    return build_tracker(ticket)
