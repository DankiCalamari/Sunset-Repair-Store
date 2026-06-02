# Testing Strategy

## 1. Test pyramid

```
        /\
       /E2E\        ~10%  Playwright critical paths
      /------\
     /Integration\  ~30%  API + DB tests
    /------------\
   /    Unit      \ ~60%  Services, utils, permissions
  /----------------\
```

---

## 2. Backend testing

**Framework:** pytest, pytest-asyncio, httpx

| Layer | Scope | Tools |
|-------|-------|-------|
| Unit | `services/*`, `core/permissions`, status transitions | pytest, mocks |
| Integration | API routes with test DB | httpx AsyncClient, Testcontainers PostgreSQL |
| Contract | OpenAPI schema matches responses | schemathesis (optional) |

**Critical test cases**

- Login success/failure; refresh rotation
- Cross-tenant access returns 404
- Ticket status invalid transition → 409
- Quote approval updates ticket status
- Payment updates invoice `amount_paid`
- Stock cannot go negative
- Portal customer cannot access other customer's ticket

**Fixtures:** `conftest.py` — test business, users per role, sample ticket.

```bash
cd backend && pytest -v --cov=app --cov-report=term-missing
```

---

## 3. Frontend testing

| Type | Tool | Coverage |
|------|------|----------|
| Unit | Vitest + Testing Library | Hooks, RepairTracker, StatusBadge |
| Component | Storybook (phase 2) | Design system |
| E2E | Playwright | Login, create ticket, approve quote (portal) |

**E2E smoke paths (MVP)**

1. Staff login → dashboard loads
2. Create customer → device → ticket
3. Move ticket to ready → notification queued
4. Customer portal login → tracker shows step

```bash
cd frontend && npm run test && npm run test:e2e
```

---

## 4. WebSocket testing

- Connect with valid/invalid JWT
- Receive `ticket.status_changed` after PATCH status
- Dashboard subscriber gets activity event

---

## 5. Performance testing

| Scenario | Tool | Target |
|----------|------|--------|
| 50 concurrent ticket lists | k6 | p95 < 500ms |
| Dashboard summary | k6 | p95 < 300ms |
| Photo presign burst | k6 | p95 < 200ms |

Run before major releases.

---

## 6. Security testing

- OWASP ZAP baseline against staging
- `pip-audit` / `npm audit` in CI (fail on high)
- Manual RBAC matrix test per role (spreadsheet)

---

## 7. CI pipeline

```yaml
# Conceptual stages
lint → unit-tests → integration-tests → build-images → e2e-smoke (staging)
```

**Gates:** main branch requires all green; coverage floor 70% backend services.

---

## 8. Test data

- Manual test data should be created through setup or test factories
- Factory Boy factories in `backend/tests/factories/` (phase 2)
- Never use production data in dev

---

## 9. UAT

| Role | Script |
|------|--------|
| Owner | Settings, reports, user management |
| Technician | Full repair cycle + photos |
| Sales | Intake, quote, invoice, POS |
| Customer | Portal tracker + quote approval |

Sign-off document stored per release.

---

## 10. Regression policy

- P0/P1 bugs get automated regression test before close
- Release notes include test scope
- Hotfix branch requires smoke E2E only
