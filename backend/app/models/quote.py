import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import quote_status_enum


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repair_tickets.id"))
    quote_number: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(quote_status_enum, default="draft")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    valid_until: Mapped[date | None] = mapped_column(Date)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lines: Mapped[list["QuotationLine"]] = relationship(
        back_populates="quotation", cascade="all, delete-orphan", order_by="QuotationLine.sort_order"
    )


class QuotationLine(Base):
    __tablename__ = "quotation_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("quotations.id"))
    line_type: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    inventory_item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    quotation: Mapped["Quotation"] = relationship(back_populates="lines")
