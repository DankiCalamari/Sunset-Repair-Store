from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class CustomerBase(BaseModel):
    name: str = Field(max_length=255)
    email: EmailStr | None = None
    phone: str | None = None
    address_line1: str | None = None
    city: str | None = None
    state: str | None = None
    postcode: str | None = None
    notes: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address_line1: str | None = None
    city: str | None = None
    state: str | None = None
    postcode: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class CustomerResponse(CustomerBase):
    id: UUID
    business_id: UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
