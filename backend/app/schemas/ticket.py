from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


TICKET_STATUSES = [
    "new",
    "booked",
    "travelling",
    "collected",
    "diagnosing",
    "awaiting_approval",
    "awaiting_parts",
    "repairing",
    "testing",
    "ready_for_return",
    "delivered",
    "completed",
    "cancelled",
]

VALID_TRANSITIONS: dict[str, set[str]] = {
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

# Status display config: label, color, icon
STATUS_CONFIG: dict[str, dict[str, str]] = {
    "new": {"label": "New", "color": "#6b7280", "bg": "#f3f4f6"},
    "booked": {"label": "Booked", "color": "#2563eb", "bg": "#dbeafe"},
    "travelling": {"label": "Travelling", "color": "#7c3aed", "bg": "#ede9fe"},
    "collected": {"label": "Collected", "color": "#0891b2", "bg": "#cffafe"},
    "diagnosing": {"label": "Diagnosing", "color": "#d97706", "bg": "#fef3c7"},
    "awaiting_approval": {"label": "Awaiting Approval", "color": "#ea580c", "bg": "#ffedd5"},
    "awaiting_parts": {"label": "Awaiting Parts", "color": "#dc2626", "bg": "#fee2e2"},
    "repairing": {"label": "Repairing", "color": "#4f46e5", "bg": "#e0e7ff"},
    "testing": {"label": "Testing", "color": "#0d9488", "bg": "#ccfbf1"},
    "ready_for_return": {"label": "Ready For Return", "color": "#16a34a", "bg": "#dcfce7"},
    "delivered": {"label": "Delivered", "color": "#059669", "bg": "#d1fae5"},
    "completed": {"label": "Completed", "color": "#15803d", "bg": "#bbf7d0"},
    "cancelled": {"label": "Cancelled", "color": "#991b1b", "bg": "#fecaca"},
}


class TicketCreate(BaseModel):
    customer_id: UUID
    device_id: UUID
    issue_description: str
    priority: str = "normal"
    assigned_technician_id: UUID | None = None
    customer_notes: str | None = None
    appointment_type: str | None = None
    appointment_date: datetime | None = None
    appointment_time: str | None = None


class TicketUpdate(BaseModel):
    issue_description: str | None = None
    diagnostic_notes: str | None = None
    priority: str | None = None
    assigned_technician_id: UUID | None = None
    customer_notes: str | None = None
    appointment_type: str | None = None
    appointment_date: datetime | None = None
    appointment_time: str | None = None


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
    appointment_type: str | None
    appointment_date: datetime | None
    appointment_time: str | None
    service_address_line1: str | None
    service_city: str | None
    service_postcode: str | None
    gate_code: str | None
    property_notes: str | None
    contact_instructions: str | None
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


class InternalNoteCreate(BaseModel):
    body: str = Field(min_length=1)


class InternalNoteResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    author_id: UUID
    author_name: str
    body: str
    created_at: datetime


class TrackerStep(BaseModel):
    key: str
    label: str
    completed: bool
    current: bool


class TrackerResponse(BaseModel):
    ticket_number: str
    status: str
    steps: list[TrackerStep]


class PhotoCreate(BaseModel):
    category: str = "intake"
    data_url: str
    caption: str | None = None


class PhotoResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    category: str
    data_url: str
    caption: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConditionReportCreate(BaseModel):
    screen_condition: str | None = None
    frame_condition: str | None = None
    rear_cover_condition: str | None = None
    camera_condition: str | None = None
    buttons_condition: str | None = None
    charging_port_condition: str | None = None
    water_damage_indicator: str | None = None
    existing_damage_notes: str | None = None


class ConditionReportResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    device_id: UUID
    screen_condition: str | None
    frame_condition: str | None
    rear_cover_condition: str | None
    camera_condition: str | None
    buttons_condition: str | None
    charging_port_condition: str | None
    water_damage_indicator: str | None
    existing_damage_notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
