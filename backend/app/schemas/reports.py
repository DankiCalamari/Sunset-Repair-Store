from decimal import Decimal

from pydantic import BaseModel


class RevenueReport(BaseModel):
    invoice_revenue: Decimal
    pos_revenue: Decimal
    total_revenue: Decimal
    payments_collected: Decimal
    invoice_count: int
    pos_sale_count: int


class TechnicianReportRow(BaseModel):
    technician_id: str | None
    technician_name: str
    open_tickets: int
    completed_tickets: int


class CommonRepairRow(BaseModel):
    issue_description: str
    count: int


class InventoryReport(BaseModel):
    active_items: int
    low_stock_items: int
    stock_value: Decimal


class WarrantyReport(BaseModel):
    active_warranties: int
    expiring_soon: int
    open_claims: int
