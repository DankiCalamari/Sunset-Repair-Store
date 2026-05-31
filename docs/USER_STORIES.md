# User Stories

Format: **As a** [role], **I want** [goal], **so that** [benefit].

---

## Epic: Authentication & tenancy

| ID | Story | Acceptance criteria |
|----|-------|---------------------|
| AUTH-01 | As an **owner**, I want to log in securely, so that only staff access internal data. | JWT issued; invalid creds rejected; lockout after 5 failures (phase 2) |
| AUTH-02 | As a **customer**, I want to log into the portal, so that I see only my repairs. | Portal routes scoped to customer_id; no staff menus |
| AUTH-03 | As an **owner**, I want RBAC enforced, so that technicians cannot change pricing. | Permission denied 403 on unauthorized endpoints |

---

## Epic: Dashboard

| ID | Story | Acceptance criteria |
|----|-------|---------------------|
| DASH-01 | As a **manager**, I want today's KPIs on one screen, so that I know shop health at a glance. | All widgets load < 2s; numbers match DB |
| DASH-02 | As a **manager**, I want live ticket updates, so that I don't refresh manually. | WS updates in-progress count within 2s |

---

## Epic: Customers & devices

| ID | Story | Acceptance criteria |
|----|-------|---------------------|
| CUST-01 | As **sales staff**, I want to search customers by phone, so that intake is fast. | Sub-second search; create if not found |
| CUST-02 | As **sales staff**, I want multiple devices per customer, so that repeat visits are tracked. | Device list on customer profile |
| DEV-01 | As a **technician**, I want IMEI/serial on the ticket, so that I repair the correct device. | Device linked on ticket create |

---

## Epic: Repair tickets

| ID | Story | Acceptance criteria |
|----|-------|---------------------|
| TKT-01 | As **sales staff**, I want to create a ticket in under 60 seconds, so that queues move quickly. | Required fields only; auto ticket number |
| TKT-02 | As a **technician**, I want to change status with notes, so that the team has context. | Timeline entry; optional customer visibility |
| TKT-03 | As a **manager**, I want to assign technicians, so that workload is balanced. | Assignment reflected on dashboard workload |
| TKT-04 | As a **customer**, I want a pizza-tracker UI, so that I know repair progress without calling. | 6 steps; current step highlighted |

---

## Epic: Quotes & approvals

| ID | Story | Acceptance criteria |
|----|-------|---------------------|
| QTE-01 | As **sales staff**, I want labour + parts lines with tax, so that quotes are accurate. | Totals recalc on save |
| QTE-02 | As a **customer**, I want to approve/reject online, so that repairs start faster. | Status → waiting_parts/repairing or cancelled path |

---

## Epic: Inventory & POS

| ID | Story | Acceptance criteria |
|----|-------|---------------------|
| INV-01 | As a **manager**, I want low-stock alerts, so that I reorder before stockouts. | Dashboard alert; email optional |
| INV-02 | As **sales staff**, I want POS barcode scan, so that checkout is quick. | Stock decrements; receipt generated |
| PO-01 | As a **manager**, I want purchase orders, so that supplier orders are tracked. | Receive updates quantity_on_hand |

---

## Epic: Invoicing

| ID | Story | Acceptance criteria |
|----|-------|---------------------|
| INV-01 | As **sales staff**, I want to record cash/card/bank payments, so that books are correct. | Invoice status paid/partial |
| INV-02 | As a **customer**, I want to download invoices, so that I have records. | PDF download from portal |

---

## Epic: Warranty

| ID | Story | Acceptance criteria |
|----|-------|---------------------|
| WAR-01 | As **sales staff**, I want warranty dates on completion, so that claims are valid. | Warranty row created with ticket |
| WAR-02 | As a **customer**, I want to submit warranty claims with photos, so that issues are documented. | Claim status submitted; staff notified |

---

## Epic: Appointments

| ID | Story | Acceptance criteria |
|----|-------|---------------------|
| APT-01 | As a **customer**, I want to book online, so that I don't phone during hours. | Public slots; confirmation email |
| APT-02 | As a **manager**, I want to see the calendar, so that staffing is planned. | Day/week view of appointments |

---

## Epic: Notifications

| ID | Story | Acceptance criteria |
|----|-------|---------------------|
| NTF-01 | As an **owner**, I want editable SMS/email templates, so that messaging matches our brand. | Variables substituted; test send |
| NTF-02 | As a **customer**, I want SMS when device is ready, so that I can pick up promptly. | Trigger on status ready_for_pickup |

---

## Epic: Reporting & admin

| ID | Story | Acceptance criteria |
|----|-------|---------------------|
| RPT-01 | As an **owner**, I want revenue by period, so that I measure growth. | Filter by date; export CSV |
| ADM-01 | As an **owner**, I want to manage users and branding, so that the shop runs independently. | Logo upload; role assignment |

---

## Definition of Done (global)

- [ ] API + UI implemented
- [ ] RBAC tested
- [ ] Tenant isolation verified
- [ ] OpenAPI updated
- [ ] Unit tests for service layer
- [ ] No P0 accessibility regressions on touched screens
