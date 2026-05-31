from pydantic import BaseModel


class DashboardSummary(BaseModel):
    repairs_today: int
    revenue_today: float
    repairs_in_progress: int
    devices_waiting_pickup: int
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
