# Local Development

## Prerequisites

1. Docker and Docker Compose.
2. Node.js (for direct UI development outside containers).
3. Python 3.13+ (for direct API development outside containers).

## Recommended Workflow (Containerized)

From the repository root:

```sh
docker compose -f docker-compose-dev.yml up --build -d
```

Useful commands from `README.md`:

```sh
# API logs
docker compose logs --tail=100 -f api

# Add ShadCN components in UI container
docker compose exec ui npx -y shadcn@latest add COMP_NAME

# Format UI files
docker compose exec ui npx prettier --write .
```

## Services and Ports

1. nginx listens on port 80 and proxies requests.
2. UI Vite dev server runs in the `ui` service on port 80 (container network).
3. FastAPI runs in the `api` service on port 80 (container network).
4. PostgreSQL is expected at host `db`, port `5432` from the API container.

## Direct API Run (without Compose)

In `api/`:

```sh
pip install -r requirements.txt
uvicorn main:fastapi_app --reload --host 0.0.0.0 --port 80
```

Required environment variables:

1. `POSTGRES_PASSWORD`
2. `JWT_KEY`
3. `SIGNUP`
4. `TOTP_ENABLED` (optional; defaults to disabled)

## Direct UI Run (without Compose)

In `ui/`:

```sh
yarn install
yarn dev
```

## Troubleshooting

1. If startup fails, verify DB readiness and credentials first.
2. If uploads fail, verify writable volume mounts for `/data/receipts` and `/var/log/receep`.
3. If auth appears broken, verify cookie handling and reverse proxy path rewrites.

For verification guidance, see [testing.md](testing.md).
