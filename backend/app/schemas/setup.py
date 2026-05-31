from pydantic import BaseModel, EmailStr, Field


class SetupStatusResponse(BaseModel):
    needs_setup: bool


class SetupRequest(BaseModel):
    # Business
    business_name: str = Field(..., min_length=1, max_length=255)
    business_slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    legal_name: str | None = Field(None, max_length=255)
    abn: str | None = Field(None, max_length=20)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=50)
    address_line1: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=50)
    postcode: str | None = Field(None, max_length=20)
    timezone: str = Field("Australia/Melbourne", max_length=50)
    currency: str = Field("AUD", min_length=3, max_length=3)
    ticket_prefix: str = Field("RCT", min_length=1, max_length=10)
    tax_rate: float = Field(0.10, ge=0, le=1)

    # Owner account
    owner_name: str = Field(..., min_length=1, max_length=255)
    owner_email: EmailStr
    owner_password: str = Field(..., min_length=8)
