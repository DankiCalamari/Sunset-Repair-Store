from pydantic import BaseModel


class DashboardSummary(BaseModel):
    repairs_today: int
    revenue_today: float
    revenue_this_month: float = 0.0
    repairs_in_progress: int
    open_repairs: int = 0
    devices_waiting_pickup: int
    awaiting_approval: int = 0
    awaiting_parts: int = 0
    ready_for_return: int = 0
    todays_appointments: int = 0
    low_stock_count: int


class TechnicianWorkload(BaseModel):
    technician_id: str
    technician_name: str
    open_tickets: int


class ActivityItem(BaseModel):
    id: str
    action: str
    entity_type: str
    entity_id: str | None
    user_name: str | None
    created_at: str
    metadata: dict
