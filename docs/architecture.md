# Architecture

## Runtime Layers

1. Client layer (`ui/src/*`): Preact app, route rendering, in-memory state, and API calls.
2. API layer (`api/main.py` plus `api/api/routers/*`): request validation, auth enforcement, and response shaping.
3. Business logic layer (`api/logic/*`): receipt file processing and orchestration.
4. Persistence layer (`api/persistence/*`): SQLAlchemy model mapping and database operations.
5. Infrastructure layer (`nginx/templates/dev.conf.template` + Docker runtime): reverse proxy, request routing, and service boundaries.

## Authentication and Authorization

1. JWT is stored in the `jwt` cookie.
2. API auth metadata is resolved via `get_auth_metadata(...)` dependency.
3. Endpoints can enforce:
   - authenticated user (`assert_jwt=True`),
   - required roles (`assert_roles=[...]`).
4. Signup policy is controlled by `SIGNUP` env (`OPEN`, `CLOSED`, `INVITE_ONLY`).
5. TOTP checks are conditional on `TOTP_ENABLED=1`.

## Data Flow (Frontend to Backend)

1. UI initializes with `fetchInitialData()` in `ui/src/main.tsx`.
2. `ui/src/app.tsx` loads app policy (`/api/app/info`) and auth state (`/api/jwt/check`).
3. Feature screens call paginated endpoints for receipts, transactions, vendors, and categories.
4. Data is merged into signal-based stores (`ui/src/store.ts`).
5. On mutations (create/update/delete), UI updates local state with returned server payloads.

## Receipt Processing Flow

1. User uploads a file to `POST /receipts`.
2. `logic.receep.Receep.upload` computes SHA-256 and byte length.
3. Metadata row is created in DB with unique `content_hash`.
4. File is persisted under `/data/receipts/<receipt_id>.dr`.
5. Thumbnail generation is triggered by `logic.img.generate_thumbnail(...)` and writes a JPEG thumbnail next to the original file.
6. Image uploads retain the original file bytes on disk; grayscale image inputs are accepted and can produce grayscale JPEG thumbnails.
7. If file persistence fails, receipt row is cleaned up.

## Reporting Flow

1. UI requests `GET /reports/expenses-by-category/paginated` with date range.
2. Backend joins line items with transactions for the user.
3. Response projects values into report-friendly fields (amount, category, vendor, date parts).

## Real-Time Messaging (Current State)

1. Backend websocket endpoint exists but is not mounted in `main.py` (commented out).
2. UI websocket client scaffolding exists but `WS_ENABLED` is false.
3. Current production behavior is request/response polling, not push updates.

For endpoint-level specifics, see [implementation-details.md](implementation-details.md).
