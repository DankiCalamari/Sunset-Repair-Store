import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import (
    appointment_type_enum,
    condition_rating_enum,
    photo_category_enum,
    ticket_priority_enum,
    ticket_status_enum,
)


class RepairTicket(Base):
    __tablename__ = "repair_tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    ticket_number: Mapped[str] = mapped_column(String(30), nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id"))
    assigned_technician_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    issue_description: Mapped[str] = mapped_column(Text, nullable=False)
    diagnostic_notes: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(ticket_priority_enum, default="normal")
    status: Mapped[str] = mapped_column(ticket_status_enum, default="new")
    customer_notes: Mapped[str | None] = mapped_column(Text)
    # Service address (snapshot at time of booking)
    service_address_line1: Mapped[str | None] = mapped_column(String(255))
    service_address_line2: Mapped[str | None] = mapped_column(String(255))
    service_city: Mapped[str | None] = mapped_column(String(100))
    service_state: Mapped[str | None] = mapped_column(String(50))
    service_postcode: Mapped[str | None] = mapped_column(String(20))
    service_gps_lat: Mapped[str | None] = mapped_column(String(20))
    service_gps_lng: Mapped[str | None] = mapped_column(String(20))
    gate_code: Mapped[str | None] = mapped_column(String(50))
    property_notes: Mapped[str | None] = mapped_column(Text)
    contact_instructions: Mapped[str | None] = mapped_column(Text)
    # Appointment
    appointment_type: Mapped[str | None] = mapped_column(appointment_type_enum)
    appointment_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    appointment_time: Mapped[str | None] = mapped_column(String(10))
    # Signatures
    pickup_signature: Mapped[str | None] = mapped_column(Text)  # base64 image
    return_signature: Mapped[str | None] = mapped_column(Text)  # base64 image
    # Receipts
    pickup_receipt_pdf: Mapped[str | None] = mapped_column(Text)  # base64 PDF
    return_receipt_pdf: Mapped[str | None] = mapped_column(Text)  # base64 PDF
    # Audit
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TicketTimeline(Base):
    __tablename__ = "ticket_timeline"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repair_tickets.id"))
    from_status: Mapped[str | None] = mapped_column(ticket_status_enum)
    to_status: Mapped[str] = mapped_column(ticket_status_enum, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_customer_visible: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TicketInternalNote(Base):
    __tablename__ = "ticket_internal_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repair_tickets.id"))
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TicketCommunication(Base):
    __tablename__ = "ticket_communications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repair_tickets.id"))
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    direction: Mapped[str] = mapped_column(String(20), nullable=False)
    message_type: Mapped[str] = mapped_column(String(50), default="message")
    status: Mapped[str] = mapped_column(String(30), default="stored")
    sender: Mapped[str | None] = mapped_column(String(255))
    recipient: Mapped[str | None] = mapped_column(String(255))
    subject: Mapped[str | None] = mapped_column(String(255))
    body_text: Mapped[str | None] = mapped_column(Text)
    body_html: Mapped[str | None] = mapped_column(Text)
    attachments: Mapped[list] = mapped_column(JSONB, default=list)
    provider_message_id: Mapped[str | None] = mapped_column(String(255))
    in_reply_to: Mapped[str | None] = mapped_column(String(255))
    error_message: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TicketPhoto(Base):
    __tablename__ = "ticket_photos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repair_tickets.id"))
    category: Mapped[str] = mapped_column(photo_category_enum, nullable=False, default="intake")
    data_url: Mapped[str] = mapped_column(Text, nullable=False)  # base64 image data
    caption: Mapped[str | None] = mapped_column(String(255))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DeviceConditionReport(Base):
    __tablename__ = "device_condition_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repair_tickets.id"))
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id"))
    # Condition ratings
    screen_condition: Mapped[str | None] = mapped_column(condition_rating_enum)
    frame_condition: Mapped[str | None] = mapped_column(condition_rating_enum)
    rear_cover_condition: Mapped[str | None] = mapped_column(condition_rating_enum)
    camera_condition: Mapped[str | None] = mapped_column(condition_rating_enum)
    buttons_condition: Mapped[str | None] = mapped_column(condition_rating_enum)
    charging_port_condition: Mapped[str | None] = mapped_column(condition_rating_enum)
    water_damage_indicator: Mapped[str | None] = mapped_column(condition_rating_enum)
    # Notes
    existing_damage_notes: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UnassignedMessage(Base):
    __tablename__ = "unassigned_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    sender: Mapped[str | None] = mapped_column(String(255))
    recipient: Mapped[str | None] = mapped_column(String(255))
    subject: Mapped[str | None] = mapped_column(String(255))
    body_text: Mapped[str | None] = mapped_column(Text)
    body_html: Mapped[str | None] = mapped_column(Text)
    attachments: Mapped[list] = mapped_column(JSONB, default=list)
    provider_message_id: Mapped[str | None] = mapped_column(String(255))
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
