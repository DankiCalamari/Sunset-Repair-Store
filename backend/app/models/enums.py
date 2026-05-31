from sqlalchemy.dialects.postgresql import ENUM

user_role_enum = ENUM(
    "owner",
    "manager",
    "technician",
    "sales",
    "customer",
    name="user_role",
    create_type=False,
)

ticket_status_enum = ENUM(
    "new",
    "diagnosing",
    "waiting_approval",
    "waiting_parts",
    "repairing",
    "testing",
    "ready_for_pickup",
    "completed",
    "cancelled",
    name="ticket_status",
    create_type=False,
)

ticket_priority_enum = ENUM(
    "low",
    "normal",
    "high",
    "urgent",
    name="ticket_priority",
    create_type=False,
)

quote_status_enum = ENUM(
    "draft",
    "sent",
    "approved",
    "rejected",
    "expired",
    name="quote_status",
    create_type=False,
)

invoice_status_enum = ENUM(
    "draft",
    "sent",
    "partial",
    "paid",
    "void",
    "refunded",
    name="invoice_status",
    create_type=False,
)

payment_method_enum = ENUM(
    "cash",
    "card",
    "bank_transfer",
    name="payment_method",
    create_type=False,
)

appointment_status_enum = ENUM(
    "scheduled",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
    name="appointment_status",
    create_type=False,
)
