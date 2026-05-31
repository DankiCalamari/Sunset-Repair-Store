from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


TICKET_STATUSES = [
    "new",
    "diagnosing",
    "waiting_approval",
    "waiting_parts",
    "repairing",
    "testing",
    "ready_for_pickup",
    "completed",
    "cancelled",
]

VALID_TRANSITIONS: dict[str, set[str]] = {
    "new": {"diagnosing", "cancelled"},
    "diagnosing": {"waiting_approval", "waiting_parts", "repairing", "cancelled"},
    "waiting_approval": {"waiting_parts", "repairing", "cancelled"},
    "waiting_parts": {"repairing", "cancelled"},
    "repairing": {"testing", "cancelled"},
    "testing": {"ready_for_pickup", "repairing", "cancelled"},
    "ready_for_pickup": {"completed", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}


class TicketCreate(BaseModel):
    customer_id: UUID
    device_id: UUID
    issue_description: str
    priority: str = "normal"
    assigned_technician_id: UUID | None = None
    customer_notes: str | None = None


class TicketUpdate(BaseModel):
    issue_description: str | None = None
    diagnostic_notes: str | None = None
    priority: str | None = None
    assigned_technician_id: UUID | None = None
    customer_notes: str | None = None


class TicketStatusUpdate(BaseModel):
    status: str
    note: str | None = None
    customer_visible: bool = False


class TicketResponse(BaseModel):
    id: UUID
    business_id: UUID
    ticket_number: str
    customer_id: UUID
    device_id: UUID
    issue_description: str
    diagnostic_notes: str | None
    priority: str
    status: str
    assigned_technician_id: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TimelineEntry(BaseModel):
    id: UUID
    from_status: str | None
    to_status: str
    note: str | None
    is_customer_visible: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TrackerStep(BaseModel):
    key: str
    label: str
    completed: bool
    current: bool


class TrackerResponse(BaseModel):
    ticket_number: str
    status: str
    steps: list[TrackerStep]
