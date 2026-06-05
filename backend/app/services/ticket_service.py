from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import conflict, not_found
from app.models.business import BusinessSettings
from app.models.ticket import RepairTicket, TicketTimeline
from app.schemas.ticket import TrackerResponse, TrackerStep

# Mobile repair workflow tracker steps
TRACKER_STEPS = [
    ("booked", "Booking Confirmed", {"booked", "travelling", "collected", "diagnosing", "awaiting_approval", "awaiting_parts", "repairing", "testing", "ready_for_return", "delivered", "completed"}),
    ("collected", "Device Collected", {"collected", "diagnosing", "awaiting_approval", "awaiting_parts", "repairing", "testing", "ready_for_return", "delivered", "completed"}),
    ("diagnosing", "Diagnosing", {"diagnosing", "awaiting_approval", "awaiting_parts", "repairing", "testing", "ready_for_return", "delivered", "completed"}),
    ("awaiting_approval", "Awaiting Approval", {"awaiting_approval", "awaiting_parts", "repairing", "testing", "ready_for_return", "delivered", "completed"}),
    ("repairing", "Repairing", {"repairing", "testing", "ready_for_return", "delivered", "completed"}),
    ("testing", "Testing", {"testing", "ready_for_return", "delivered", "completed"}),
    ("ready", "Ready For Return", {"ready_for_return", "delivered", "completed"}),
    ("delivered", "Delivered", {"delivered", "completed"}),
]

STATUS_TO_TRACKER_INDEX = {
    "new": -1,
    "booked": 0,
    "travelling": 0,
    "collected": 1,
    "diagnosing": 2,
    "awaiting_approval": 3,
    "awaiting_parts": 3,
    "repairing": 4,
    "testing": 5,
    "ready_for_return": 6,
    "delivered": 7,
    "completed": 7,
    "cancelled": -1,
}

# Valid status transitions for mobile repair workflow
VALID_TRANSITIONS_MOBILE = {
    "new": {"booked", "cancelled"},
    "booked": {"travelling", "collected", "cancelled"},
    "travelling": {"collected", "cancelled"},
    "collected": {"diagnosing", "cancelled"},
    "diagnosing": {"awaiting_approval", "awaiting_parts", "repairing", "cancelled"},
    "awaiting_approval": {"awaiting_parts", "repairing", "cancelled"},
    "awaiting_parts": {"repairing", "cancelled"},
    "repairing": {"testing", "cancelled"},
    "testing": {"ready_for_return", "cancelled"},
    "ready_for_return": {"delivered", "cancelled"},
    "delivered": {"completed", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}


async def generate_ticket_number(db: AsyncSession, business_id: UUID) -> str:
    result = await db.execute(
        select(BusinessSettings).where(BusinessSettings.business_id == business_id)
    )
    settings = result.scalar_one_or_none()
    prefix = settings.ticket_prefix if settings else "SCR"
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
    allowed = VALID_TRANSITIONS_MOBILE.get(ticket.status, set())
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
