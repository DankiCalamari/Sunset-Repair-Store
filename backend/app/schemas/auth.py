from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    business_slug: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    business_id: UUID | None
    permissions: list[str]

    model_config = {"from_attributes": True}


class AuthResponse(TokenResponse):
    user: UserResponse
