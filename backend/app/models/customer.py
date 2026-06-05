import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    first_name: Mapped[str] = mapped_column(String(120), nullable=False)
    last_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    # Primary service address
    address_line1: Mapped[str | None] = mapped_column(String(255))
    address_line2: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(50))
    postcode: Mapped[str | None] = mapped_column(String(20))
    # Alternate address
    alt_address_line1: Mapped[str | None] = mapped_column(String(255))
    alt_address_line2: Mapped[str | None] = mapped_column(String(255))
    alt_city: Mapped[str | None] = mapped_column(String(100))
    alt_state: Mapped[str | None] = mapped_column(String(50))
    alt_postcode: Mapped[str | None] = mapped_column(String(20))
    # GPS coordinates for service address
    gps_lat: Mapped[str | None] = mapped_column(String(20))
    gps_lng: Mapped[str | None] = mapped_column(String(20))
    # Property access notes
    gate_code: Mapped[str | None] = mapped_column(String(50))
    property_notes: Mapped[str | None] = mapped_column(Text)
    contact_instructions: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    devices: Mapped[list["Device"]] = relationship(back_populates="customer")

    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    device_type: Mapped[str] = mapped_column(String(50), nullable=False, default="mobile_phone")
    manufacturer: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(150), nullable=False)
    colour: Mapped[str | None] = mapped_column(String(50))
    imei: Mapped[str | None] = mapped_column(String(20))
    serial_number: Mapped[str | None] = mapped_column(String(100))
    passcode_provided: Mapped[str | None] = mapped_column(String(100))
    accessories_received: Mapped[list] = mapped_column(JSONB, default=list)
    warranty_status: Mapped[str | None] = mapped_column(String(50))
    purchase_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    customer: Mapped["Customer"] = relationship(back_populates="devices")
