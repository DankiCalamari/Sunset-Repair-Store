# MVP Roadmap

**Goal:** Single repair shop live on Sunset Country Tech ERP in **10–12 weeks**.

**MVP scope:** Modules required to replace paper/spreadsheet + basic RepairDesk workflows.

---

## Phase 0 — Foundation (Weeks 1–2)

| Deliverable | Status |
|-------------|--------|
| Repo scaffold, Docker Compose | ✅ Scaffold |
| PostgreSQL schema + Alembic | ✅ Schema |
| JWT auth + RBAC matrix | ✅ Core |
| React shell + ShadCN + routing | ✅ Shell |
| CI: lint + test pipelines | Planned |

**Exit criteria:** Login works; empty dashboard; API `/docs` live.

---

## Phase 1 — Core operations (Weeks 3–5)

| Feature | Priority |
|---------|----------|
| Customers CRUD + search | P0 |
| Devices CRUD | P0 |
| Repair tickets + status machine + timeline | P0 |
| Internal notes + activity log | P0 |
| Technician assignment | P0 |
| Dashboard KPIs (non-WS) | P0 |

**Exit criteria:** Shop can intake → repair → complete a ticket end-to-end.

---

## Phase 2 — Money & parts (Weeks 6–8)

| Feature | Priority |
|---------|----------|
| Quotations + approve flow (staff) | P0 |
| Invoices + payments (cash/card/transfer) | P0 |
| Inventory items + stock levels | P0 |
| Stock consumption on ticket | P1 |
| Low stock on dashboard | P0 |

**Exit criteria:** Quote → approve → invoice → pay without leaving the app.

---

## Phase 3 — Customer experience (Weeks 9–10)

| Feature | Priority |
|---------|----------|
| Customer portal login | P0 |
| Repair tracker (Domino's UI) | P0 |
| Online quote approve/reject | P0 |
| Email notifications (ticket created, ready) | P0 |
| Photo upload (before/after) | P1 |

**Exit criteria:** Customer can track and approve without staff intervention.

---

## Phase 4 — MVP polish (Weeks 11–12)

| Feature | Priority |
|---------|----------|
| WebSocket live dashboard | P1 |
| Basic reports (revenue, technician) | P1 |
| Admin: users + business settings | P0 |
| SMS templates (one provider) | P2 |
| POS basic (no barcode hardware req.) | P2 |

**Exit criteria:** Owner signs off UAT; production deploy runbook complete.

---

## Explicitly OUT of MVP

- Multi-business self-signup billing
- Stripe/Square integrated payments
- Xero sync
- Native mobile apps
- Advanced purchase order workflows
- Warranty claims full workflow (stub only)
- Appointment public booking (phase 4 stretch)

---

## MVP success metrics

| Metric | Target |
|--------|--------|
| Ticket intake time | < 2 min average |
| Portal adoption | 30% customers use tracker |
| Data migration | 100% active customers imported |
| Support tickets week 1 | < 5 P1 bugs |

---

## Release checklist

- [ ] Security review (see SECURITY_PLAN.md)
- [ ] Backup restore tested
- [ ] `.env` secrets in vault
- [ ] Rate limiting on auth endpoints
- [ ] Customer data export procedure documented
