from enum import Enum


class Permission(str, Enum):
    DASHBOARD_READ = "dashboard:read"
    CUSTOMERS_READ = "customers:read"
    CUSTOMERS_WRITE = "customers:write"
    DEVICES_READ = "devices:read"
    DEVICES_WRITE = "devices:write"
    TICKETS_READ = "tickets:read"
    TICKETS_WRITE = "tickets:write"
    QUOTES_READ = "quotes:read"
    QUOTES_WRITE = "quotes:write"
    INVENTORY_READ = "inventory:read"
    INVENTORY_WRITE = "inventory:write"
    INVOICES_READ = "invoices:read"
    INVOICES_WRITE = "invoices:write"
    POS_WRITE = "pos:write"
    APPOINTMENTS_READ = "appointments:read"
    APPOINTMENTS_WRITE = "appointments:write"
    REPORTS_READ = "reports:read"
    ADMIN_USERS = "admin:users"
    ADMIN_SETTINGS = "admin:settings"
    PORTAL_ACCESS = "portal:access"


ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "owner": set(Permission),
    "manager": {
        Permission.DASHBOARD_READ,
        Permission.CUSTOMERS_READ,
        Permission.CUSTOMERS_WRITE,
        Permission.DEVICES_READ,
        Permission.DEVICES_WRITE,
        Permission.TICKETS_READ,
        Permission.TICKETS_WRITE,
        Permission.QUOTES_READ,
        Permission.QUOTES_WRITE,
        Permission.INVENTORY_READ,
        Permission.INVENTORY_WRITE,
        Permission.INVOICES_READ,
        Permission.INVOICES_WRITE,
        Permission.POS_WRITE,
        Permission.APPOINTMENTS_READ,
        Permission.APPOINTMENTS_WRITE,
        Permission.REPORTS_READ,
        Permission.ADMIN_USERS,
        Permission.ADMIN_SETTINGS,
    },
    "technician": {
        Permission.DASHBOARD_READ,
        Permission.CUSTOMERS_READ,
        Permission.DEVICES_READ,
        Permission.DEVICES_WRITE,
        Permission.TICKETS_READ,
        Permission.TICKETS_WRITE,
        Permission.INVENTORY_READ,
        Permission.QUOTES_READ,
    },
    "sales": {
        Permission.DASHBOARD_READ,
        Permission.CUSTOMERS_READ,
        Permission.CUSTOMERS_WRITE,
        Permission.DEVICES_READ,
        Permission.DEVICES_WRITE,
        Permission.TICKETS_READ,
        Permission.TICKETS_WRITE,
        Permission.QUOTES_READ,
        Permission.QUOTES_WRITE,
        Permission.INVENTORY_READ,
        Permission.INVOICES_READ,
        Permission.INVOICES_WRITE,
        Permission.POS_WRITE,
        Permission.APPOINTMENTS_READ,
        Permission.APPOINTMENTS_WRITE,
    },
    "customer": {Permission.PORTAL_ACCESS},
}


def permissions_for_role(role: str) -> list[str]:
    perms = ROLE_PERMISSIONS.get(role, set())
    return sorted(p.value for p in perms)


def role_has_permission(role: str, permission: str) -> bool:
    if role == "owner":
        return True
    perms = ROLE_PERMISSIONS.get(role, set())
    return Permission(permission) in perms
