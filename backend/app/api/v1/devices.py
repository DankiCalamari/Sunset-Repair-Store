"""Device endpoints for managing customer devices."""
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.exceptions import not_found
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.customer import Customer, Device

router = APIRouter(prefix="/devices", tags=["Devices"])


class DeviceCreate(BaseModel):
    customer_id: UUID
    manufacturer: str
    model: str
    imei: str | None = None
    serial_number: str | None = None
    colour: str | None = None
    passcode_provided: str | None = None
    notes: str | None = None


class DeviceResponse(BaseModel):
    id: UUID
    business_id: UUID
    customer_id: UUID
    manufacturer: str
    model: str
    imei: str | None
    serial_number: str | None
    colour: str | None
    passcode_provided: str | None
    notes: str | None

    model_config = {"from_attributes": True}


@router.get("/by-customer/{customer_id}", response_model=list[DeviceResponse])
async def list_devices_by_customer(
    customer_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.DEVICES_READ)),
    db: AsyncSession = Depends(get_db),
):
    """List all devices for a specific customer."""
    result = await db.execute(
        select(Device).where(
            Device.business_id == business_id,
            Device.customer_id == customer_id,
        )
    )
    return result.scalars().all()


@router.post("", response_model=DeviceResponse, status_code=201)
async def create_device(
    body: DeviceCreate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.DEVICES_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new device for a customer."""
    customer_result = await db.execute(
        select(Customer).where(
            Customer.id == body.customer_id,
            Customer.business_id == business_id,
            Customer.is_active.is_(True),
        )
    )
    if not customer_result.scalar_one_or_none():
        raise not_found("Customer")

    device = Device(
        business_id=business_id,
        customer_id=body.customer_id,
        manufacturer=body.manufacturer,
        model=body.model,
        imei=body.imei,
        serial_number=body.serial_number,
        colour=body.colour,
        passcode_provided=body.passcode_provided,
        notes=body.notes,
    )
    db.add(device)
    await db.flush()
    await db.refresh(device)
    return device
