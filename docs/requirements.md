# Requirements

## Context

Users need a single application to ingest receipts, create transactions with detailed line items, classify spending using categories, and analyze expenses over time.

## Product Goal

Provide a local-first, self-hostable expense tracking system with:

1. Receipt ingestion and storage.
2. Transaction and line-item management.
3. Category and vendor management.
4. Summary reporting.
5. Multi-user authentication with role-aware capabilities.

## Functional Requirements

1. User authentication with JWT sessions and optional TOTP.
2. Role support (at minimum `admin` and `basic`).
3. Receipt upload and retrieval for authenticated users.
4. Transaction CRUD with line items and optional links to receipts and vendors.
5. Category CRUD and vendor CRUD (with constraints by owner user).
6. Invite-based or open signup behavior based on environment policy.
7. Expense reporting by category over a date range.
8. Data import/export endpoints restricted to admin users.

## Non-Functional Requirements

1. API responses should be JSON-safe for ORM models and datetimes.
2. The app should run via containers for local and production-like environments.
3. Frontend and backend should communicate through a stable `/api/*` path.
4. Large receipt/image payloads should be supported by reverse proxy settings.

## Current Status (from codebase)

1. Implemented: JWT auth, signup/invite flows, optional TOTP, user config updates.
2. Implemented: receipt upload/list/delete/rotate.
3. Implemented: transaction CRUD, category CRUD, vendor create/update/list.
4. Implemented: expense-by-category reporting endpoint.
5. Partial: vendor delete is not implemented (`NotImplementedError`).
6. Partial: vendor merge is not implemented (`NotImplementedError`).
7. Partial: data import/export are placeholder endpoints.
8. Partial: websocket logic exists but is currently disabled (`WS_ENABLED = false` on UI and websocket route not mounted).

For implementation details, see [implementation-details.md](implementation-details.md).
