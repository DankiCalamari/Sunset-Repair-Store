# API Specification

**Base URL:** `/api/v1`  
**Auth:** Bearer JWT (access token)  
**Docs:** OpenAPI 3.1 at `/docs` and `/redoc`

---

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Email + password → access + refresh tokens |
| POST | `/auth/refresh` | Refresh token → new access token |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/register-customer` | Portal signup (business slug) |
| GET | `/auth/me` | Current user profile + permissions |

**Login request**

```json
{
  "email": "owner@yourdomain.com",
  "password": "your-password",
  "business_slug": "your-business-slug"
}
```

**Login response**

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "uuid",
    "email": "...",
    "full_name": "...",
    "role": "owner",
    "business_id": "uuid",
    "permissions": ["tickets:read", "tickets:write", "..."]
  }
}
```

---

## Dashboard

| Method | Path | Role |
|--------|------|------|
| GET | `/dashboard/summary` | staff+ |
| GET | `/dashboard/technician-workload` | manager+ |
| GET | `/dashboard/recent-activity` | staff+ |

---

## Customers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers` | List (search, pagination) |
| POST | `/customers` | Create |
| GET | `/customers/{id}` | Detail |
| PATCH | `/customers/{id}` | Update |
| DELETE | `/customers/{id}` | Soft delete |
| GET | `/customers/{id}/repairs` | Repair history |
| GET | `/customers/{id}/invoices` | Invoice history |
| GET | `/customers/{id}/warranties` | Warranty history |

**Query params:** `q`, `page`, `page_size`, `sort`

---

## Devices

| Method | Path |
|--------|------|
| GET | `/devices` |
| POST | `/devices` |
| GET | `/devices/{id}` |
| PATCH | `/devices/{id}` |
| GET | `/customers/{customer_id}/devices` |

---

## Repair tickets

| Method | Path |
|--------|------|
| GET | `/tickets` |
| POST | `/tickets` |
| GET | `/tickets/{id}` |
| PATCH | `/tickets/{id}` |
| POST | `/tickets/{id}/status` |
| GET | `/tickets/{id}/timeline` |
| POST | `/tickets/{id}/notes` |
| GET | `/tickets/{id}/notes` |
| POST | `/tickets/{id}/photos/presign` |
| POST | `/tickets/{id}/photos` |

**Status update body**

```json
{
  "status": "repairing",
  "note": "Replaced screen assembly",
  "customer_visible": true
}
```

---

## Quotations

| Method | Path |
|--------|------|
| GET | `/quotes` |
| POST | `/quotes` |
| GET | `/quotes/{id}` |
| PATCH | `/quotes/{id}` |
| POST | `/quotes/{id}/send` |
| POST | `/quotes/{id}/approve` | Portal or staff |
| POST | `/quotes/{id}/reject` |

---

## Inventory

| Method | Path |
|--------|------|
| GET | `/inventory/items` |
| POST | `/inventory/items` |
| PATCH | `/inventory/items/{id}` |
| GET | `/inventory/low-stock` |
| GET | `/suppliers` |
| POST | `/suppliers` |
| GET | `/purchase-orders` |
| POST | `/purchase-orders` |
| POST | `/purchase-orders/{id}/receive` |
| POST | `/stock-movements` |

---

## Invoices & payments

| Method | Path |
|--------|------|
| GET | `/invoices` |
| POST | `/invoices` |
| GET | `/invoices/{id}` |
| GET | `/invoices/{id}/pdf` |
| POST | `/invoices/{id}/payments` |
| POST | `/payments/{id}/refunds` |

---

## Warranties

| Method | Path |
|--------|------|
| GET | `/warranties` |
| POST | `/warranties` |
| GET | `/warranty-claims` |
| POST | `/warranty-claims` |
| PATCH | `/warranty-claims/{id}` |

---

## Appointments

| Method | Path |
|--------|------|
| GET | `/appointments` |
| POST | `/appointments` |
| PATCH | `/appointments/{id}` |
| GET | `/service-types` |
| GET | `/public/{slug}/appointments/slots` | No auth |
| POST | `/public/{slug}/appointments` | No auth |

---

## POS

| Method | Path |
|--------|------|
| POST | `/pos/sales` |
| GET | `/pos/sales/{id}` |
| GET | `/pos/sales/{id}/receipt` |
| GET | `/inventory/items/by-barcode/{code}` |

---

## Reports

| Method | Path |
|--------|------|
| GET | `/reports/revenue` |
| GET | `/reports/technicians` |
| GET | `/reports/common-repairs` |
| GET | `/reports/inventory` |
| GET | `/reports/warranty` |

Query: `from`, `to`, `format=json|csv`

---

## Admin

| Method | Path |
|--------|------|
| GET | `/admin/users` |
| POST | `/admin/users` |
| PATCH | `/admin/users/{id}` |
| GET | `/admin/settings` |
| PATCH | `/admin/settings` |
| GET | `/admin/notification-templates` |
| PATCH | `/admin/notification-templates/{id}` |

---

## Customer portal

| Method | Path |
|--------|------|
| GET | `/portal/repairs` |
| GET | `/portal/repairs/{id}/tracker` |
| POST | `/portal/quotes/{id}/approve` |
| POST | `/portal/quotes/{id}/reject` |
| GET | `/portal/invoices/{id}/download` |
| POST | `/portal/warranty-claims` |
| POST | `/portal/photos/presign` |

---

## Files & WebSocket

| Method | Path |
|--------|------|
| WS | `/ws?token=` | Subscribe: `ticket.{id}`, `dashboard.{business_id}` |

**WS message envelope**

```json
{
  "event": "ticket.status_changed",
  "payload": { "ticket_id": "...", "status": "repairing" }
}
```

---

## Error format

```json
{
  "detail": "Human-readable message",
  "code": "TICKET_INVALID_STATUS",
  "errors": [{ "field": "status", "message": "..." }]
}
```

| HTTP | Usage |
|------|--------|
| 400 | Validation |
| 401 | Missing/invalid token |
| 403 | RBAC denial |
| 404 | Not found or cross-tenant |
| 409 | Conflict (duplicate SKU, invalid transition) |
| 422 | Unprocessable entity |

---

## Pagination

```json
{
  "items": [],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "pages": 5
}
```

Header alternative: `X-Total-Count`
