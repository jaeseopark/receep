# Project Folder Structure

## Workspace Layout

```text
receep/
  api/
    api/
      access/
      models/
      routers/
    logic/
    persistence/
    utils/
    main.py
  nginx/
    templates/
  ui/
    src/
  docs/
  README.md
```

## Module Responsibilities

| Area | Responsibility |
|---|---|
| `api/main.py` | FastAPI application bootstrap, router registration, logging, login/JWT-check/app-info endpoints |
| `api/api/access/` | Authentication logic, JWT/TOTP handling, auth metadata extraction |
| `api/api/routers/` | HTTP endpoint handlers for receipts, transactions, categories, vendors, users, reports, and data |
| `api/persistence/` | SQLAlchemy schema definitions and data access operations |
| `api/logic/` | Business logic around receipts and image processing workflows |
| `nginx/templates/` | Reverse-proxy behavior for `/`, `/api/`, auth checks, and static receipt file access |
| `ui/src/` | Preact app shell, route definitions, state store, API client, and feature components |
| `docs/` | Project technical documentation |

## Request Path Mapping

1. Browser calls `/api/*` endpoints.
2. nginx rewrites `/api/<path>` to backend `/<path>`.
3. FastAPI routers serve business operations.
4. SQLAlchemy persists and fetches PostgreSQL data.

See [architecture.md](architecture.md) for deeper runtime flow.
