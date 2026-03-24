# Testing

## Current Coverage

There are currently no automated test suites checked into this repository:

1. No backend unit/integration test files detected.
2. No frontend test files detected.
3. No CI workflow files detected under `.github/workflows/`.

## Manual Verification Checklist

### Auth and User Flows

1. Signup behavior in all `SIGNUP` modes (`OPEN`, `CLOSED`, `INVITE_ONLY`).
2. Login with and without TOTP.
3. Invite and invite acceptance behavior for admin vs non-admin users.

### Receipts and Transactions

1. Upload receipts with different content types and sizes.
2. Rotate receipts and verify rotation persistence.
3. Create, update, and delete transactions with multiple line items.
4. Validate receipt-transaction linking and unlinking scenarios.

### Categories and Vendors

1. Create/update/delete categories.
2. Create/update vendors.
3. Validate behavior for vendor delete/merge endpoints (currently expected to fail due to TODO implementation).

### Reporting

1. Verify date-range filtering and timezone offset handling in expense reports.
2. Confirm pagination behavior (`offset`, `limit`, `next_offset`).

## Recommended Next Automated Tests

1. API auth dependency tests for `assert_jwt` and `assert_roles` behaviors.
2. Database integration tests for transaction and line-item cascade behavior.
3. Receipt upload tests for duplicate hash conflicts and rollback path on file-write errors.
4. Frontend component tests for login gate, route transitions, and store upsert/remove logic.
5. End-to-end tests for upload -> transaction creation -> reporting flow.
