from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    role: str = Field(pattern="^(owner|manager|technician|sales)$")
    password: str = Field(min_length=8)
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    role: str | None = Field(default=None, pattern="^(owner|manager|technician|sales)$")
    password: str | None = Field(default=None, min_length=8)
    is_active: bool | None = None


class AdminUserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: str | None
    role: str
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class BusinessSettingsResponse(BaseModel):
    business_id: UUID
    business_name: str
    email: str | None
    phone: str | None
    tax_rate: float
    ticket_prefix: str
    next_ticket_seq: int
    branding_json: dict
    email_settings: dict
    sms_settings: dict


class BusinessSettingsUpdate(BaseModel):
    business_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    tax_rate: float | None = Field(default=None, ge=0, le=1)
    ticket_prefix: str | None = Field(default=None, min_length=1, max_length=10)
    next_ticket_seq: int | None = Field(default=None, ge=1)
    smtp: dict | None = None
    imap: dict | None = None
    telnyx: dict | None = None
    automations: dict | None = None
