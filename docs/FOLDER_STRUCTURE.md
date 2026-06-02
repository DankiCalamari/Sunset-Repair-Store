# Folder Structure

```
sunset-country-tech-erp/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
│
├── docs/                              # Product & engineering documentation
│   ├── SOFTWARE_SPECIFICATION.md
│   ├── API_SPECIFICATION.md
│   ├── ARCHITECTURE.md
│   ├── ER_DIAGRAM.md
│   ├── UI_WIREFRAMES.md
│   ├── USER_STORIES.md
│   ├── MVP_ROADMAP.md
│   ├── DEVELOPMENT_ROADMAP.md
│   ├── SECURITY_PLAN.md
│   ├── TESTING_STRATEGY.md
│   └── FOLDER_STRUCTURE.md
│
├── database/
│   └── schema.sql                     # Canonical DDL (reference)
│
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── main.py                    # FastAPI entry + lifespan
│       ├── api/
│       │   ├── deps.py                # Auth, tenant, DB session deps
│       │   ├── router.py              # Aggregates all route modules
│       │   └── v1/
│       │       ├── auth.py
│       │       ├── users.py
│       │       ├── customers.py
│       │       ├── devices.py
│       │       ├── tickets.py
│       │       ├── quotes.py
│       │       ├── inventory.py
│       │       ├── invoices.py
│       │       ├── warranties.py
│       │       ├── appointments.py
│       │       ├── pos.py
│       │       ├── reports.py
│       │       ├── notifications.py
│       │       ├── admin.py
│       │       ├── portal.py          # Customer-facing API
│       │       ├── dashboard.py
│       │       ├── files.py
│       │       └── ws.py              # WebSocket hub
│       ├── core/
│       │   ├── config.py
│       │   ├── security.py
│       │   ├── permissions.py
│       │   └── exceptions.py
│       ├── db/
│       │   ├── base.py
│       │   └── session.py
│       ├── models/                    # SQLAlchemy ORM
│       ├── schemas/                   # Pydantic request/response
│       ├── services/                  # Business logic
│       │   ├── auth_service.py
│       │   ├── ticket_service.py
│       │   ├── notification_service.py
│       │   ├── storage_service.py
│       │   └── report_service.py
│       └── tests/
│           ├── conftest.py
│           ├── test_auth.py
│           └── test_tickets.py
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── components.json              # ShadCN config
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── lib/
        │   ├── api.ts               # Axios/fetch client + interceptors
        │   ├── auth.ts
        │   └── utils.ts
        ├── hooks/
        │   ├── useAuth.ts
        │   └── useWebSocket.ts
        ├── types/
        │   └── index.ts
        ├── components/
        │   ├── ui/                  # ShadCN primitives
        │   ├── layout/
        │   │   ├── AppShell.tsx
        │   │   ├── Sidebar.tsx
        │   │   └── Header.tsx
        │   └── shared/
        │       ├── DataTable.tsx
        │       ├── StatusBadge.tsx
        │       └── RepairTracker.tsx  # Domino's-style tracker
        ├── pages/
        │   ├── auth/
        │   ├── dashboard/
        │   ├── customers/
        │   ├── devices/
        │   ├── tickets/
        │   ├── inventory/
        │   ├── invoices/
        │   ├── quotes/
        │   ├── appointments/
        │   ├── pos/
        │   ├── reports/
        │   ├── admin/
        │   └── portal/              # Customer portal routes
        └── routes/
            └── index.tsx
```

## Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| `docs/` | Source of truth for product and contracts |
| `database/` | Human-readable DDL; Alembic mirrors in `backend/alembic` |
| `backend/app/api` | HTTP + WebSocket transport only |
| `backend/app/services` | Rules, workflows, side effects |
| `backend/app/models` | Persistence mapping |
| `frontend/src/pages` | Route-level screens |
| `frontend/src/components` | Reusable UI |
