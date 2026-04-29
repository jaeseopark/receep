# Implementation Details

## API Surface

### System and Auth

1. `POST /login`: validates credentials, optional TOTP, returns JWT payload.
2. `GET /jwt/check`: verifies auth cookie.
3. `GET /app/info`: returns signup mode, TOTP setting, and current user count.
4. `GET /file`: authenticated file download placeholder.

### Users

1. `POST /signup`: allowed when first user is being created or signup mode is `OPEN`.
2. `POST /invite`: creates invited user entries, restricted by signup policy and role.
3. `POST /invite/accept`: accepts invitation by setting password/TOTP.
4. `GET /me`: returns current user identity and config.
5. `PUT /me/config`: updates user config blob.

### Receipts

1. `GET /receipts/paginated`.
2. `POST /receipts` stores the original upload under `/data/receipts/<receipt_id>.dr` and generates a sibling JPEG thumbnail for supported `image/*` and `application/pdf` files.
3. `POST /receipts/{receipt_id}/rotate` (increments by +90 modulo 360).
4. `DELETE /receipts/{receipt_id}`.

### Transactions

1. `GET /transactions/paginated`.
2. `GET /transactions/search?vendor_name=...` returns all transactions whose vendor name contains the query string (case-insensitive).
3. `GET /transactions/single/{id}`.
4. `POST /transactions`.
5. `PUT /transactions/{transaction_id}`.
6. `DELETE /transactions/{transaction_id}`.

### Categories

1. `GET /categories/paginated`.
2. `POST /categories`.
3. `PUT /categories/{id}`.
4. `DELETE /categories/{id}`.

### Vendors

1. `GET /vendors/paginated`.
2. `POST /vendors`.
3. `PUT /vendors/{id}`.
4. `DELETE /vendors/{id}` (currently not implemented in persistence layer).
5. `POST /vendors/merge` (currently not implemented).

### Reports

1. `GET /reports/expenses-by-category/paginated` with `start`, `end`, `tz`, `offset`, `limit`.

### Data Admin

1. `POST /data/import` (admin-only placeholder).
2. `POST /data/export` (admin-only placeholder).

## Persistence Model Summary

Primary entities in `api/persistence/schema.py`:

1. `User` and `Role` with many-to-many relationship via `user_roles`.
2. `Receipt` with unique `content_hash` and related `Transaction` records.
3. `Transaction` with optional `vendor_id`, optional `receipt_id`, and child `LineItem` records.
4. `Vendor` with unique `(user_id, name)` constraint.
5. `Category` with unique `(user_id, name)` constraint.

## Frontend State and Routing

1. Route definitions are centralized in `ui/src/routes.tsx`.
2. Global reactive stores use `@preact/signals` in `ui/src/store.ts`.
3. Initial data loading logic is in `ui/src/gvars.ts`.
4. Auth gate and top-level routing are in `ui/src/app.tsx`.

## Go-To-ID Feature

Both the Receipts grid view and the Transactions table expose a "go to ID" button (hash icon) that lets the user navigate directly to any record by numeric ID. The shared implementation lives in `ui/src/hooks/useGoTo.tsx`.

Behaviour requirements:

1. **Shared implementation** — the `useGoTo` hook is reused across the Receipts and Transactions views; each call site provides an `onNavigate` callback.
2. **Dismiss on click-away or Escape** — the modal is a native `<dialog>` (`showModal()`), so both backdrop click and the Escape key are handled by the browser without custom event listeners.
3. **Input reset on re-open** — the ID field is cleared each time the modal opens.
4. **Positive integers only** — the field accepts `type="number" min="1"`. The keys `.`, `e`, and `E` (decimal point and scientific-notation prefix) are blocked via `onKeyDown`.
5. **No stepper buttons** — the browser's built-in spin buttons are hidden with Tailwind arbitrary variants (`[appearance:textfield]`, `[&::-webkit-outer-spin-button]:appearance-none`, `[&::-webkit-inner-spin-button]:appearance-none`). Mouse-wheel increment/decrement is also disabled by blurring the input on `wheel` events.

## Receipt Download Behaviour

The `ReceiptDownloadButton` component renders an `<a download="...">` link pointing to the raw `/{id}.dr` file. Before triggering the browser download, the button computes a human-readable filename of the form:

```
receep-attachment-YYYY-MM-DD-tx{transaction_id}.{ext}
```

where:
- `YYYY-MM-DD` is derived from the linked transaction's `timestamp` (epoch seconds).
- `{transaction_id}` is the transaction's `id`.
- `{ext}` is derived from the receipt's `content_type` via `getExtFromContentType` in `ui/src/utils/receipts.ts`.

If the receipt has no linked transaction, the filename falls back to `receep-attachment.{ext}`. The `download` attribute on the `<a>` tag ensures the browser saves the file with the computed name regardless of the `.dr` URL.

## Known Gaps and Caveats

1. `GET /receipts/paginated` does not currently filter by requesting user in the persistence query.
2. `DELETE /receipts/{receipt_id}` success message has a typo (`"succes"`).
3. `vendors.delete` and `vendors.merge` are API-level stubs.
4. `data.import` and `data.export` are stubs.
5. Websocket implementation is scaffolded but disabled.

## Serialization Behavior

`api/api/utils.py` converts SQLAlchemy models and datetime objects recursively into API-safe structures by using timestamps and object dictionaries.

For operational setup and env config, see [local-development.md](local-development.md) and [deployment.md](deployment.md).
