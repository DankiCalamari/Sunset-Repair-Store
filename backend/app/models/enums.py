from sqlalchemy.dialects.postgresql import ENUM

user_role_enum = ENUM(
    "owner",
    "manager",
    "technician",
    "sales",
    name="user_role",
    create_type=False,
)

# Mobile repair workflow statuses
ticket_status_enum = ENUM(
    "new",
    "booked",
    "travelling",
    "collected",
    "diagnosing",
    "awaiting_approval",
    "awaiting_parts",
    "repairing",
    "testing",
    "ready_for_return",
    "delivered",
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

appointment_type_enum = ENUM(
    "home_visit",
    "business_visit",
    "pickup",
    "delivery",
    name="appointment_type",
    create_type=False,
)

photo_category_enum = ENUM(
    "intake",
    "diagnostic",
    "repair",
    "completion",
    name="photo_category",
    create_type=False,
)

condition_rating_enum = ENUM(
    "excellent",
    "good",
    "damaged",
    "working",
    "not_working",
    "triggered",
    "not_triggered",
    "unknown",
    name="condition_rating",
    create_type=False,
)
