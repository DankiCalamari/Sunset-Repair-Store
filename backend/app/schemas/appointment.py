from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator


class ServiceTypeResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    duration_minutes: int
    is_active: bool

    model_config = {"from_attributes": True}


class AppointmentCreate(BaseModel):
    customer_id: UUID | None = None
    service_type_id: UUID
    scheduled_start: datetime
    customer_name: str | None = Field(default=None, max_length=255)
    customer_email: EmailStr | None = None
    customer_phone: str | None = Field(default=None, max_length=50)
    notes: str | None = None

    @model_validator(mode="after")
    def customer_or_contact(self):
        if not self.customer_id and not self.customer_name:
            raise ValueError("customer_id or customer_name is required")
        return self


class AppointmentUpdate(BaseModel):
    service_type_id: UUID | None = None
    scheduled_start: datetime | None = None
    status: str | None = Field(default=None, pattern="^(scheduled|confirmed|completed|cancelled|no_show)$")
    customer_name: str | None = Field(default=None, max_length=255)
    customer_email: EmailStr | None = None
    customer_phone: str | None = Field(default=None, max_length=50)
    notes: str | None = None


class AppointmentResponse(BaseModel):
    id: UUID
    customer_id: UUID | None
    service_type_id: UUID
    service_type_name: str | None = None
    scheduled_start: datetime
    scheduled_end: datetime
    status: str
    customer_name: str | None
    customer_email: str | None
    customer_phone: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
