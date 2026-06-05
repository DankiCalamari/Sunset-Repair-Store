from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, computed_field


class CustomerBase(BaseModel):
    first_name: str = Field(max_length=120)
    last_name: str = Field(max_length=120)
    email: str | None = None
    phone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    postcode: str | None = None
    alt_address_line1: str | None = None
    alt_address_line2: str | None = None
    alt_city: str | None = None
    alt_state: str | None = None
    alt_postcode: str | None = None
    gps_lat: str | None = None
    gps_lng: str | None = None
    gate_code: str | None = None
    property_notes: str | None = None
    contact_instructions: str | None = None
    notes: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    postcode: str | None = None
    alt_address_line1: str | None = None
    alt_address_line2: str | None = None
    alt_city: str | None = None
    alt_state: str | None = None
    alt_postcode: str | None = None
    gps_lat: str | None = None
    gps_lng: str | None = None
    gate_code: str | None = None
    property_notes: str | None = None
    contact_instructions: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class CustomerResponse(CustomerBase):
    id: UUID
    business_id: UUID
    is_active: bool
    created_at: datetime

    @computed_field
    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    model_config = {"from_attributes": True}
