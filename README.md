# Sunset Country Repairs

Mobile repair management software for **Sunset Country Repairs** — a mobile phone, tablet, laptop, and electronics repair service based in Mildura, Victoria, Australia.

Customers do not visit a retail storefront. Services are provided through home visits, business visits, pickup & delivery, and scheduled appointments.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, ShadCN UI |
| Backend | Python 3.12, FastAPI |
| Database | PostgreSQL 16 |
| Realtime | WebSockets |
| Auth | JWT + RBAC |
| Storage | S3-compatible (MinIO in dev) |
| Deploy | Docker, Docker Compose |

## Workflow Statuses

New → Booked → Travelling → Collected → Diagnosing → Awaiting Approval → Awaiting Parts → Repairing → Testing → Ready For Return → Delivered → Completed

## Quick start

```bash
# Start all services
docker compose up -d

# Apply schema (first time)
docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -f /docker-entrypoint-initdb.d/schema.sql

# Complete setup through the web UI at:
# http://localhost:5173/setup

# API docs
open http://localhost:8000/docs
```

## License

Proprietary — Sunset Country Repairs.
