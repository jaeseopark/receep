# Deployment

## Container Runtime

Backend image definition (`api/Dockerfile`):

1. Base image: `python:3.13.2-slim-bullseye`.
2. Installs system packages: `netcat-traditional`, `poppler-utils`.
3. Installs Python dependencies from `api/requirements.txt`.
4. Starts with `./start.sh`.

Startup script (`api/start.sh`) behavior:

1. Waits up to 60 seconds for PostgreSQL at `db:5432`.
2. Starts Uvicorn with reload mode on `0.0.0.0:80`.

## Reverse Proxy

nginx template (`nginx/templates/dev.conf.template`) handles:

1. `/` -> UI upstream.
2. `/api/` -> API upstream with path rewrite.
3. `.dr` file requests served from local `/receipts` with internal auth check via `/jwt/check`.
4. Increased `client_max_body_size` (100M) for large uploads.
5. WebSocket-compatible headers under `/api/` location.

## Required Environment Variables

Backend:

1. `POSTGRES_PASSWORD`
2. `JWT_KEY`
3. `SIGNUP`
4. `TOTP_ENABLED`

## Production Readiness Notes

Current codebase includes several development-stage behaviors:

1. Uvicorn runs with `--reload` in startup script.
2. Websocket path is not currently mounted.
3. Some API endpoints are placeholders (`vendors/merge`, `data/import`, `data/export`, and vendor delete path in persistence).
4. No automated CI pipeline files are present yet.

## Suggested Hardening Steps

1. Use a non-reload ASGI command for production.
2. Implement and validate all placeholder endpoints before release.
3. Add integration and end-to-end test coverage.
4. Add CI workflows for lint, tests, and image build verification.
5. Ensure secure secret management for JWT key and DB credentials.
