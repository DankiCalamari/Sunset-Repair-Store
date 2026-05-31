from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.exceptions import not_found
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.appointment import Appointment, ServiceType
from app.models.customer import Customer
from app.schemas.appointment import AppointmentCreate, AppointmentResponse, AppointmentUpdate, ServiceTypeResponse
from app.schemas.common import PaginatedResponse

router = APIRouter(tags=["Appointments"])


def _appointment_response(appointment: Appointment) -> AppointmentResponse:
    return AppointmentResponse(
        id=appointment.id,
        customer_id=appointment.customer_id,
        service_type_id=appointment.service_type_id,
        service_type_name=appointment.service_type.name if appointment.service_type else None,
        scheduled_start=appointment.scheduled_start,
        scheduled_end=appointment.scheduled_end,
        status=appointment.status,
        customer_name=appointment.customer_name,
        customer_email=appointment.customer_email,
        customer_phone=appointment.customer_phone,
        notes=appointment.notes,
        created_at=appointment.created_at,
    )


async def _service_type_or_404(db: AsyncSession, service_type_id: UUID, business_id: UUID) -> ServiceType:
    service_type = await db.scalar(
        select(ServiceType).where(
            ServiceType.id == service_type_id,
            ServiceType.business_id == business_id,
            ServiceType.is_active.is_(True),
        )
    )
    if not service_type:
        raise not_found("Service type")
    return service_type


@router.get("/service-types", response_model=list[ServiceTypeResponse])
async def list_service_types(
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.APPOINTMENTS_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ServiceType)
        .where(ServiceType.business_id == business_id, ServiceType.is_active.is_(True))
        .order_by(ServiceType.name)
    )
    return [ServiceTypeResponse.model_validate(st) for st in result.scalars().all()]


@router.get("/appointments", response_model=PaginatedResponse[AppointmentResponse])
async def list_appointments(
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.APPOINTMENTS_READ)),
    db: AsyncSession = Depends(get_db),
):
    base = (
        select(Appointment)
        .where(Appointment.business_id == business_id)
        .options(selectinload(Appointment.service_type))
    )
    if status:
        base = base.where(Appointment.status == status)
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(
        base.order_by(Appointment.scheduled_start.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        items=[_appointment_response(a) for a in result.scalars().unique().all()],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("/appointments", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    body: AppointmentCreate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.APPOINTMENTS_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    service_type = await _service_type_or_404(db, body.service_type_id, business_id)
    customer = None
    if body.customer_id:
        customer = await db.scalar(
            select(Customer).where(Customer.id == body.customer_id, Customer.business_id == business_id)
        )
        if not customer:
            raise not_found("Customer")
    appointment = Appointment(
        business_id=business_id,
        customer_id=body.customer_id,
        service_type_id=body.service_type_id,
        scheduled_start=body.scheduled_start,
        scheduled_end=body.scheduled_start + timedelta(minutes=service_type.duration_minutes),
        customer_name=body.customer_name or (customer.name if customer else None),
        customer_email=body.customer_email or (customer.email if customer else None),
        customer_phone=body.customer_phone or (customer.phone if customer else None),
        notes=body.notes,
    )
    db.add(appointment)
    await db.flush()
    await db.refresh(appointment, ["service_type"])
    return _appointment_response(appointment)


@router.patch("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: UUID,
    body: AppointmentUpdate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.APPOINTMENTS_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    appointment = await db.scalar(
        select(Appointment)
        .where(Appointment.id == appointment_id, Appointment.business_id == business_id)
        .options(selectinload(Appointment.service_type))
    )
    if not appointment:
        raise not_found("Appointment")
    data = body.model_dump(exclude_unset=True)
    recalculate_end = False
    if "service_type_id" in data:
        appointment.service_type = await _service_type_or_404(db, data["service_type_id"], business_id)
        appointment.service_type_id = data["service_type_id"]
        recalculate_end = True
    for field in ("status", "customer_name", "customer_email", "customer_phone", "notes"):
        if field in data:
            setattr(appointment, field, data[field])
    if "scheduled_start" in data:
        appointment.scheduled_start = data["scheduled_start"]
        recalculate_end = True
    if recalculate_end:
        appointment.scheduled_end = appointment.scheduled_start + timedelta(
            minutes=appointment.service_type.duration_minutes
        )
    await db.flush()
    await db.refresh(appointment, ["service_type"])
    return _appointment_response(appointment)
