# Sunset Country Tech ERP — Software Specification

**Version:** 1.0.0  
**Status:** Production design  
**Product type:** Multi-tenant SaaS-ready repair shop ERP

---

## 1. Executive summary

Sunset Country Tech ERP is a repair-shop management platform combining ticketing, inventory, invoicing, customer portal, appointments, POS, and reporting. It targets single-location repair businesses initially, with architecture prepared for multi-business (tenant) SaaS.

**Design principles**

- Repair-first workflows (not generic ERP)
- Simple staff UX; powerful admin underneath
- Customer-visible transparency (Domino's-style tracker)
- Tenant isolation at every data layer
- API-first for future mobile apps and integrations

---

## 2. Personas & roles

| Role | Primary goals | Access level |
|------|---------------|--------------|
| **Owner** | Revenue, staffing, branding, integrations | Full business + billing |
| **Manager** | Operations, approvals, inventory, reports | All modules except owner-only settings |
| **Technician** | Diagnose, repair, update tickets, consume parts | Tickets, devices, inventory read/consume |
| **Sales Staff** | Intake, quotes, POS, appointments | Customers, quotes, POS, appointments |
| **Customer** | Track repair, approve quotes, pay, warranty | Portal only |

RBAC is enforced server-side on every endpoint. Frontend hides unauthorized navigation but is not a security boundary.

---

## 3. Module specifications

### 3.1 Dashboard

**Purpose:** Operational snapshot for the current business day.

| Widget | Data source | Refresh |
|--------|-------------|---------|
| Repairs today | `repair_tickets` where `created_at` is today | Realtime + 60s poll |
| Revenue today | `payments` + `pos_sales` for today | 60s |
| In progress | Count `status` in repairing pipeline | Realtime |
| Waiting pickup | `status = ready_for_pickup` | Realtime |
| Low stock | `inventory_items` where `qty <= reorder_level` | 5 min |
| Technician workload | Open tickets per `assigned_technician_id` | Realtime |
| Recent activity | `activity_log` last 20 | WebSocket |

### 3.2 Customer management

CRUD for customers scoped to `business_id`. Search uses trigram index on name/email/phone.

**History tabs:** repairs (`repair_tickets`), invoices (`invoices`), warranties (`warranties`).

### 3.3 Device management

One-to-many customer → devices. IMEI/serial uniqueness recommended per business (soft validation).

Passcode field encrypted at rest (application layer); never returned in portal API.

### 3.4 Repair tickets

**Ticket number:** `{ticket_prefix}-{seq}` from `business_settings.next_ticket_seq` (transactional increment).

**Status machine:**

```
new → diagnosing → waiting_approval → waiting_parts → repairing → testing → ready_for_pickup → completed
                              ↘ cancelled (from most states)
```

Each transition writes `ticket_timeline` + `activity_log` + optional notification.

**Portal-visible statuses** map to tracker steps: Received, Diagnosing, Awaiting Approval, Repairing, Testing, Ready.

### 3.5 Customer portal

Separate route group `/portal`. Customers authenticate via linked `users.role = customer` or magic-link token (phase 2).

Features: repair list, tracker, quote approve/reject, invoice PDF download, warranty claim form, photo upload to ticket.

### 3.6 Quotations

Line types: labour, parts. Tax/discount at header level. Approval sets ticket status → `waiting_parts` or `repairing` per business rule.

### 3.7 Inventory

Categories: screens, batteries, charging ports, adhesives, cases, accessories. Stock movements on PO receive, POS sale, repair consumption.

### 3.8 Invoicing

Generated from approved quotes or manual. Payments partial/full. Refunds linked to payment.

### 3.9 Warranty

Created on ticket completion. Claims workflow: submitted → reviewing → approved/rejected → resolved.

### 3.10 Photos

S3 keys: `{business_id}/tickets/{ticket_id}/{stage}/{uuid}.jpg`. Pre-signed upload URLs from API.

### 3.11 Notifications

Template variables: `{{customer_name}}`, `{{ticket_number}}`, `{{portal_link}}`, etc. Queue in `notification_log`; worker sends async.

### 3.12 Appointments

Public booking page per business slug. Slot generation from business hours (settings JSON).

### 3.13 POS

Barcode → `inventory_items.barcode`. Receipt PDF. Stock movement `sale`.

### 3.14 Reporting

Aggregations via SQL views / report service. Export CSV/PDF.

### 3.15 Admin panel

Users, role assignment, branding (logo/colors), SMTP/SMS credentials (encrypted), tax rate, ticket prefix.

---

## 4. Non-functional requirements

| Area | Target |
|------|--------|
| Availability | 99.5% (single-tenant MVP) |
| API latency p95 | < 300ms reads, < 800ms writes |
| Concurrent users | 50 per shop (MVP), 500+ (SaaS scale) |
| Data retention | 7 years financial records (configurable) |
| Mobile | Responsive web; native apps out of scope v1 |
| Accessibility | WCAG 2.1 AA on customer portal |

---

## 5. Integration points

- **Email:** SMTP (SendGrid, SES, Office 365)
- **SMS:** Twilio / MessageMedia
- **Payments:** Stripe Terminal / Square (phase 2)
- **Accounting:** Xero export (phase 3)

---

## 6. Multi-tenancy model

| Phase | Model |
|-------|--------|
| MVP | Single business row; `business_id` still on all tables |
| SaaS | Subdomain or path `/b/{slug}`; JWT includes `business_id` |
| Enterprise | Dedicated DB option (future) |

Row-level security optional in PostgreSQL; application enforces `business_id` filter on all queries.

---

## 7. Glossary

- **Ticket:** Repair work order
- **Quote:** Price estimate requiring customer approval
- **Tenant:** `businesses` record
- **Tracker:** Customer-facing simplified status UI
