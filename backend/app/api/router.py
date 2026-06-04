from fastapi import APIRouter

from app.api.v1 import (
    appointments,
    admin,
    auth,
    communications,
    customers,
    dashboard,
    devices,
    inventory,
    invoices,
    portal,
    pos,
    public,
    quotes,
    reports,
    setup,
    tickets,
    ws,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(setup.router)
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(communications.router)
api_router.include_router(customers.router)
api_router.include_router(devices.router)
api_router.include_router(tickets.router)
api_router.include_router(quotes.router)
api_router.include_router(invoices.router)
api_router.include_router(inventory.router)
api_router.include_router(appointments.router)
api_router.include_router(pos.router)
api_router.include_router(reports.router)
api_router.include_router(dashboard.router)
api_router.include_router(portal.router)
api_router.include_router(public.router)
api_router.include_router(ws.router)
