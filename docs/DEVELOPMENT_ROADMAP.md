# Development Roadmap (12 months)

## Q1 — MVP (Months 1–3)

See [MVP_ROADMAP.md](MVP_ROADMAP.md).

**Milestone M1:** Internal alpha  
**Milestone M2:** Customer portal beta  
**Milestone M3:** Production go-live (single tenant)

---

## Q2 — Operational excellence (Months 4–6)

| Theme | Features |
|-------|----------|
| **Inventory depth** | PO receiving, suppliers, barcode labels |
| **POS** | Scanner integration, refunds, daily till report |
| **Appointments** | Public booking widget, Google Calendar sync |
| **Comms** | SMS full suite, notification preferences per customer |
| **Warranty** | Full claims workflow + staff queue |
| **Reporting** | Common repairs, inventory valuation, export scheduling |

**Milestone M4:** Feature parity with RepairShopr core workflows

---

## Q3 — SaaS readiness (Months 7–9)

| Theme | Features |
|-------|----------|
| **Multi-tenant** | Business signup, subdomain routing, plan limits |
| **Billing** | Stripe subscriptions per location |
| **Platform** | Super-admin console, tenant analytics |
| **Scale** | Redis WS fan-out, API horizontal scaling |
| **Integrations** | Webhooks, Zapier, REST API keys |

**Milestone M5:** Second pilot shop onboarded self-serve

---

## Q4 — Enterprise & ecosystem (Months 10–12)

| Theme | Features |
|-------|----------|
| **Payments** | Stripe Terminal / Square |
| **Accounting** | Xero/MYOB export |
| **Mobile** | Technician PWA or React Native MVP |
| **AI assist** | Suggested diagnostics from issue text (optional) |
| **Compliance** | GDPR export, AU Privacy Act tooling |

**Milestone M6:** 10+ paying tenants OR enterprise single-chain deal

---

## Engineering capacity model

| Squad | Focus |
|-------|--------|
| 1 full-stack | MVP features |
| +0.5 backend (month 4+) | Integrations, workers |
| +0.5 frontend (month 6+) | Portal polish, design system |

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Scope creep vs RepairDesk | Strict MVP OUT list |
| SMS cost overrun | Per-tenant quotas |
| Photo storage costs | Lifecycle policy + compression |
| Multi-tenant data leak | Integration tests per endpoint |

---

## Versioning

- **API:** Semantic versioning `/api/v1` → breaking changes in v2 only
- **App:** CalVer releases `2026.06.1`
- **DB:** Alembic forward-only migrations
