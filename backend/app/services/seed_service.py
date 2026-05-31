from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import ServiceType
from app.models.customer import Customer, Device
from app.models.inventory import InventoryItem
from app.models.invoice import Invoice, InvoiceLine, Payment
from app.models.quote import Quotation, QuotationLine
from app.models.ticket import RepairTicket, TicketTimeline
from app.services.document_service import calculate_totals, generate_invoice_number, generate_quote_number, get_tax_rate
from app.services.ticket_service import generate_ticket_number


async def seed_demo_data(db: AsyncSession, business_id: UUID, user_id: UUID | None) -> None:
    service_count = await db.scalar(
        select(func.count()).select_from(ServiceType).where(ServiceType.business_id == business_id)
    )
    if not service_count:
        db.add_all(
            [
                ServiceType(
                    business_id=business_id,
                    name="Screen Repair Consultation",
                    duration_minutes=30,
                ),
                ServiceType(
                    business_id=business_id,
                    name="Battery Replacement",
                    duration_minutes=45,
                ),
                ServiceType(
                    business_id=business_id,
                    name="General Diagnostic",
                    duration_minutes=60,
                ),
            ]
        )

    inventory_count = await db.scalar(
        select(func.count()).select_from(InventoryItem).where(InventoryItem.business_id == business_id)
    )
    if not inventory_count:
        db.add_all(
            [
                InventoryItem(
                    business_id=business_id,
                    sku="CASE-IP14-CLEAR",
                    name="iPhone 14 clear case",
                    barcode="930000000001",
                    unit_cost=Decimal("8.50"),
                    unit_price=Decimal("24.95"),
                    quantity_on_hand=18,
                    reorder_level=5,
                ),
                InventoryItem(
                    business_id=business_id,
                    sku="CHG-USBC-20W",
                    name="USB-C 20W wall charger",
                    barcode="930000000002",
                    unit_cost=Decimal("12.00"),
                    unit_price=Decimal("29.95"),
                    quantity_on_hand=12,
                    reorder_level=4,
                ),
                InventoryItem(
                    business_id=business_id,
                    sku="CAB-USBC-1M",
                    name="USB-C cable 1m",
                    barcode="930000000003",
                    unit_cost=Decimal("5.00"),
                    unit_price=Decimal("14.95"),
                    quantity_on_hand=30,
                    reorder_level=8,
                ),
            ]
        )

    count = await db.scalar(
        select(func.count()).select_from(Customer).where(Customer.business_id == business_id)
    )
    if count and count > 0:
        return

    customers_data = [
        {
            "name": "Jane Smith",
            "email": "jane.smith@email.com",
            "phone": "0412 345 678",
            "city": "Mildura",
            "state": "VIC",
            "postcode": "3500",
            "device": ("Apple", "iPhone 14 Pro", "Space Black"),
        },
        {
            "name": "Michael Chen",
            "email": "mchen@email.com",
            "phone": "0423 456 789",
            "city": "Swan Hill",
            "state": "VIC",
            "postcode": "3585",
            "device": ("Samsung", "Galaxy S23", "Phantom Black"),
        },
        {
            "name": "Sarah Williams",
            "email": "sarah.w@email.com",
            "phone": "0434 567 890",
            "city": "Robinvale",
            "state": "VIC",
            "postcode": "3549",
            "device": ("Apple", "iPhone 13", "Blue"),
        },
    ]

    tax_rate = await get_tax_rate(db, business_id)
    tickets: list[RepairTicket] = []

    for data in customers_data:
        device_info = data.pop("device")
        customer = Customer(business_id=business_id, **data)
        db.add(customer)
        await db.flush()

        device = Device(
            business_id=business_id,
            customer_id=customer.id,
            manufacturer=device_info[0],
            model=device_info[1],
            colour=device_info[2],
        )
        db.add(device)
        await db.flush()

        ticket_number = await generate_ticket_number(db, business_id)
        ticket = RepairTicket(
            business_id=business_id,
            ticket_number=ticket_number,
            customer_id=customer.id,
            device_id=device.id,
            issue_description=f"{device_info[1]} — screen damage and battery issues",
            status="diagnosing" if customer.name == "Jane Smith" else "waiting_approval",
            priority="normal",
            created_by_id=user_id,
        )
        db.add(ticket)
        await db.flush()
        db.add(
            TicketTimeline(
                ticket_id=ticket.id,
                from_status=None,
                to_status="new",
                note="Ticket created",
                created_by_id=user_id,
                is_customer_visible=True,
            )
        )
        tickets.append(ticket)

    # Quote for Jane Smith (diagnosing → will send)
    jane_ticket = tickets[0]
    quote_lines = [
        ("labour", "Screen replacement labour", Decimal("1"), Decimal("89.00")),
        ("parts", "iPhone 14 Pro OLED screen", Decimal("1"), Decimal("189.00")),
        ("parts", "Adhesive kit", Decimal("1"), Decimal("12.00")),
    ]
    line_amounts = [(q, p) for _, _, q, p in quote_lines]
    subtotal, tax_amount, discount, total = calculate_totals(line_amounts, tax_rate)

    quote1 = Quotation(
        business_id=business_id,
        ticket_id=jane_ticket.id,
        quote_number=await generate_quote_number(db, business_id),
        status="draft",
        subtotal=subtotal,
        tax_amount=tax_amount,
        discount_amount=discount,
        total=total,
        valid_until=date.today() + timedelta(days=14),
        created_by_id=user_id,
    )
    db.add(quote1)
    await db.flush()
    for i, (lt, desc, qty, price) in enumerate(quote_lines):
        db.add(
            QuotationLine(
                quotation_id=quote1.id,
                line_type=lt,
                description=desc,
                quantity=qty,
                unit_price=price,
                sort_order=i,
            )
        )

    # Approved quote for Michael Chen
    michael_ticket = tickets[1]
    quote2_lines = [
        ("labour", "Battery replacement", Decimal("1"), Decimal("65.00")),
        ("parts", "Galaxy S23 battery", Decimal("1"), Decimal("75.00")),
    ]
    subtotal2, tax2, disc2, total2 = calculate_totals(
        [(q, p) for _, _, q, p in quote2_lines], tax_rate
    )
    quote2 = Quotation(
        business_id=business_id,
        ticket_id=michael_ticket.id,
        quote_number=await generate_quote_number(db, business_id),
        status="approved",
        subtotal=subtotal2,
        tax_amount=tax2,
        discount_amount=disc2,
        total=total2,
        valid_until=date.today() + timedelta(days=7),
        created_by_id=user_id,
    )
    db.add(quote2)
    await db.flush()
    for i, (lt, desc, qty, price) in enumerate(quote2_lines):
        db.add(
            QuotationLine(
                quotation_id=quote2.id,
                line_type=lt,
                description=desc,
                quantity=qty,
                unit_price=price,
                sort_order=i,
            )
        )

    # Invoice from Michael's approved quote (partially paid)
    michael = await db.scalar(
        select(Customer).where(Customer.business_id == business_id, Customer.name == "Michael Chen")
    )
    inv1 = Invoice(
        business_id=business_id,
        customer_id=michael.id,
        ticket_id=michael_ticket.id,
        invoice_number=await generate_invoice_number(db, business_id),
        status="partial",
        subtotal=subtotal2,
        tax_amount=tax2,
        discount_amount=disc2,
        total=total2,
        amount_paid=Decimal("80.00"),
        issued_at=quote2.created_at,
    )
    db.add(inv1)
    await db.flush()
    for ln in quote2_lines:
        db.add(
            InvoiceLine(
                invoice_id=inv1.id,
                description=ln[1],
                quantity=ln[2],
                unit_price=ln[3],
            )
        )
    db.add(
        Payment(
            business_id=business_id,
            invoice_id=inv1.id,
            amount=Decimal("80.00"),
            method="card",
            reference="VISA-4521",
            created_by_id=user_id,
        )
    )

    # Paid invoice for Sarah Williams
    sarah_ticket = tickets[2]
    sarah = await db.scalar(
        select(Customer).where(Customer.business_id == business_id, Customer.name == "Sarah Williams")
    )
    inv_lines = [("Charging port replacement", Decimal("1"), Decimal("95.00"))]
    subtotal3, tax3, disc3, total3 = calculate_totals(
        [(q, p) for _, q, p in inv_lines], tax_rate
    )
    inv2 = Invoice(
        business_id=business_id,
        customer_id=sarah.id,
        ticket_id=sarah_ticket.id,
        invoice_number=await generate_invoice_number(db, business_id),
        status="paid",
        subtotal=subtotal3,
        tax_amount=tax3,
        discount_amount=disc3,
        total=total3,
        amount_paid=total3,
        issued_at=quote2.created_at,
    )
    db.add(inv2)
    await db.flush()
    for desc, qty, price in inv_lines:
        db.add(InvoiceLine(invoice_id=inv2.id, description=desc, quantity=qty, unit_price=price))
    db.add(
        Payment(
            business_id=business_id,
            invoice_id=inv2.id,
            amount=total3,
            method="cash",
            created_by_id=user_id,
        )
    )

    sarah_ticket.status = "completed"
