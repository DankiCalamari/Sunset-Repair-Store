# Security Plan

## 1. Security objectives

- Protect customer PII and device credentials
- Enforce tenant isolation (no cross-business data access)
- Meet OWASP ASVS Level 2 for web applications (target)
- Prepare for AU Privacy Act / APP compliance

---

## 2. Authentication & session management

| Control | Implementation |
|---------|----------------|
| Password storage | bcrypt (cost 12+) via passlib |
| Access tokens | JWT HS256 or RS256 (prod), 30 min TTL |
| Refresh tokens | Opaque, hashed in DB, rotation on use |
| Logout | Revoke refresh token server-side |
| Portal | Same auth stack; role=`customer` only |
| MFA | TOTP for owner/manager (phase 2) |

**JWT claims:** `sub`, `business_id`, `role`, `permissions[]`, `exp`, `iat`

---

## 3. Authorization (RBAC)

Permissions stored as `resource:action` (e.g. `tickets:write`, `admin:settings`).

| Role | Typical permissions |
|------|---------------------|
| owner | `*` |
| manager | all except `admin:billing` |
| technician | tickets, devices, inventory:read, inventory:consume |
| sales | customers, tickets, quotes, pos, appointments |
| customer | portal:* only |

Enforced in `core/permissions.py` + FastAPI dependencies.

---

## 4. Data protection

| Data class | Controls |
|------------|----------|
| PII (name, email, phone) | Encrypted TLS in transit; DB at rest via volume encryption |
| Device passcodes | AES-256-GCM application encryption; never in logs |
| Payment refs | Store last4/reference only; no PAN |
| Files (S3) | Private bucket; pre-signed URLs 15 min TTL |
| Backups | Encrypted; retention 30 days; restore tested quarterly |

---

## 5. API security

- HTTPS only in production (HSTS)
- CORS allowlist per environment
- Rate limit: `/auth/login` 10/min/IP
- Input validation via Pydantic (max lengths, enums)
- SQL injection: SQLAlchemy parameterized queries only
- IDOR prevention: every query filters `business_id` from JWT
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, CSP on frontend

---

## 6. Infrastructure

| Area | Practice |
|------|----------|
| Secrets | `.env` not in git; Docker secrets / Vault in prod |
| DB | Non-superuser app role; least privilege |
| Network | DB and Redis not public; private Docker network |
| Images | Pin versions; scan with Trivy in CI |
| Logging | Structured JSON; no passwords/tokens; PII redaction |

---

## 7. WebSocket security

- Authenticate on connect via JWT query param or short-lived WS ticket
- Subscribe only to channels user may access
- Heartbeat + idle disconnect (5 min)

---

## 8. Incident response

1. Detect (monitoring alerts, customer report)
2. Contain (revoke tokens, disable user)
3. Assess (audit `activity_log`)
4. Notify (Privacy Act if applicable, within 30 days)
5. Remediate + post-mortem

**Security contact:** security@sunsetcountry.tech (configure per deployment)

---

## 9. Compliance checklist (go-live)

- [ ] Threat model documented (STRIDE lite)
- [ ] Dependency audit (`pip-audit`, `npm audit`)
- [ ] Penetration test or OWASP ZAP baseline
- [ ] Privacy policy + data retention documented
- [ ] Customer data export/delete procedure
- [ ] Staff security training (phishing, passcode handling)

---

## 10. Secure SDLC

- PR reviews required for `backend/app/api` and `core/security`
- Branch protection on `main`
- Pre-commit: secrets scan (gitleaks)
- SAST in CI (Bandit for Python)
