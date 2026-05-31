from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import conflict, not_found
from app.models.business import BusinessSettings
from app.models.ticket import RepairTicket, TicketTimeline
from app.schemas.ticket import VALID_TRANSITIONS, TrackerResponse, TrackerStep

TRACKER_STEPS = [
    ("received", "Received", {"new"}),
    ("diagnosing", "Diagnosing", {"diagnosing"}),
    ("awaiting_approval", "Awaiting Approval", {"waiting_approval"}),
    ("repairing", "Repairing", {"waiting_parts", "repairing"}),
    ("testing", "Testing", {"testing"}),
    ("ready", "Ready", {"ready_for_pickup"}),
]

STATUS_TO_TRACKER_INDEX = {
    "new": 0,
    "diagnosing": 1,
    "waiting_approval": 2,
    "waiting_parts": 3,
    "repairing": 3,
    "testing": 4,
    "ready_for_pickup": 5,
    "completed": 5,
    "cancelled": -1,
}


async def generate_ticket_number(db: AsyncSession, business_id: UUID) -> str:
    result = await db.execute(
        select(BusinessSettings).where(BusinessSettings.business_id == business_id)
    )
    settings = result.scalar_one_or_none()
    prefix = settings.ticket_prefix if settings else "SCT"
    seq = settings.next_ticket_seq if settings else 1
    if settings:
        await db.execute(
            update(BusinessSettings)
            .where(BusinessSettings.business_id == business_id)
            .values(next_ticket_seq=settings.next_ticket_seq + 1)
        )
    return f"{prefix}-{seq}"


async def transition_status(
    db: AsyncSession,
    ticket: RepairTicket,
    new_status: str,
    *,
    user_id: UUID | None,
    note: str | None = None,
    customer_visible: bool = False,
) -> RepairTicket:
    allowed = VALID_TRANSITIONS.get(ticket.status, set())
    if new_status not in allowed:
        raise conflict(
            f"Cannot transition from {ticket.status} to {new_status}",
            "TICKET_INVALID_STATUS",
        )
    timeline = TicketTimeline(
        ticket_id=ticket.id,
        from_status=ticket.status,
        to_status=new_status,
        note=note,
        created_by_id=user_id,
        is_customer_visible=customer_visible,
    )
    ticket.status = new_status
    db.add(timeline)
    db.add(ticket)
    return ticket


def build_tracker(ticket: RepairTicket) -> TrackerResponse:
    current_idx = STATUS_TO_TRACKER_INDEX.get(ticket.status, 0)
    steps: list[TrackerStep] = []
    for i, (key, label, _) in enumerate(TRACKER_STEPS):
        steps.append(
            TrackerStep(
                key=key,
                label=label,
                completed=i < current_idx,
                current=i == current_idx and ticket.status != "cancelled",
            )
        )
    return TrackerResponse(ticket_number=ticket.ticket_number, status=ticket.status, steps=steps)
