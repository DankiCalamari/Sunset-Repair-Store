from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class AttachmentPayload(BaseModel):
    filename: str = Field(max_length=255)
    content_type: str = "application/octet-stream"
    content_base64: str


class TicketEmailSend(BaseModel):
    to: EmailStr | None = None
    subject: str = Field(max_length=255)
    body_html: str
    body_text: str | None = None
    template_key: str | None = None
    attachments: list[AttachmentPayload] = []


class TicketSmsSend(BaseModel):
    to: str | None = Field(default=None, max_length=50)
    message: str = Field(min_length=1, max_length=1600)
    template_key: str | None = None


class CommunicationResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    channel: str
    direction: str
    message_type: str
    status: str
    sender: str | None
    recipient: str | None
    subject: str | None
    body_text: str | None
    body_html: str | None
    attachments: list
    provider_message_id: str | None
    in_reply_to: str | None
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UnassignedMessageResponse(BaseModel):
    id: UUID
    channel: str
    sender: str | None
    recipient: str | None
    subject: str | None
    body_text: str | None
    body_html: str | None
    attachments: list
    provider_message_id: str | None
    received_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TelnyxInboundSms(BaseModel):
    data: dict | None = None
    from_: str | None = Field(default=None, alias="from")
    to: str | None = None
    text: str | None = None
    message: str | None = None
    received_at: datetime | None = None
    timestamp: datetime | None = None

    model_config = {"populate_by_name": True}
