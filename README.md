# Sunset Country Tech ERP

Production-ready repair shop management platform — SaaS-capable, multi-tenant architecture, repair-shop focused.

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

## Quick start

```bash
# Copy environment template and fill in all REPLACE_ values
cp .env.example .env

# Start all services
docker compose up -d

# Apply schema (first time)
docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -f /docker-entrypoint-initdb.d/schema.sql

# Bootstrap your first business and owner account
# Complete setup through the web UI at:
# http://localhost:5173/setup

# API docs
open http://localhost:8000/docs

# Frontend
open http://localhost:5173
```

## Documentation

| Document | Path |
|----------|------|
| Software specification | [docs/SOFTWARE_SPECIFICATION.md](docs/SOFTWARE_SPECIFICATION.md) |
| API specification | [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| ER diagram | [docs/ER_DIAGRAM.md](docs/ER_DIAGRAM.md) |
| UI wireframes | [docs/UI_WIREFRAMES.md](docs/UI_WIREFRAMES.md) |
| User stories | [docs/USER_STORIES.md](docs/USER_STORIES.md) |
| MVP roadmap | [docs/MVP_ROADMAP.md](docs/MVP_ROADMAP.md) |
| Development roadmap | [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) |
| Security plan | [docs/SECURITY_PLAN.md](docs/SECURITY_PLAN.md) |
| Testing strategy | [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) |
| Folder structure | [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md) |

## Project layout

```
├── backend/          # FastAPI application
├── frontend/         # React SPA
├── database/         # SQL schema reference + seeds
├── docs/             # Specifications and diagrams
└── docker-compose.yml
```

## License

Proprietary — Sunset Country Tech.
