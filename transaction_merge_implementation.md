# Transaction Merge Implementation Steps

## Overview
This document outlines the high-level steps for implementing a feature to merge transactions, where the source can be an existing transaction or a receipt (PDF or image). 

### Scenarios
- **Scenario 1**: Appending a receipt to an existing transaction. The receipt merging (handling PDF/image normalization) follows the same process as below.
- **Scenario 2**: Appending a receipt to an existing transaction. Since the receipt has no associated transaction in this scenario, there are no line items to merge. The receipt handling is identical to Scenario 1.

In both scenarios, transaction details (date, vendor, line items, etc.) remain unchanged. Receipts are normalized into a single PDF, the database is updated with new filesize and hash, and the source receipt is deleted.

## Requirements
- **Normalization**: Receipts (PDF or image) must be normalized to consistent widths and margins for screen viewing. No specific paper size required.
- **Merging**: Combine source and target receipts into a single PDF.
- **Database Updates**: Reflect new PDF's filesize and hash in the database.
- **Cleanup**: Delete source receipt from database and filesystem after merge.
- **Existing Libraries**: Leverage `pdf2image` and `pillow` from `requirements.txt` for PDF/image handling.

## Proposed New Libraries
- **pypdf**: A modern, maintained library for PDF manipulation (merging, splitting, etc.). Justification: The existing `requirements.txt` lacks PDF merging capabilities. `pypdf` is the successor to `PyPDF2`, offering better performance, active maintenance, and comprehensive PDF operations. It's lightweight and integrates well with existing image libraries for a complete workflow.
- **No other libraries needed**: `pillow` and `pdf2image` suffice for image processing and PDF-to-image conversion.

## Implementation Steps

### 1. API Endpoint Creation
- Add a new FastAPI endpoint (e.g., `POST /transactions/{transaction_id}/merge`) to handle merge requests.
- Accept parameters: `source_type` (transaction or receipt), `source_id`, and `transaction_id` (target).
- Validate that the target transaction exists and the user has permissions.

### 2. Data Retrieval
- Fetch target transaction details from the database (using SQLAlchemy).
- Retrieve source receipt or transaction data:
  - If source is a receipt, get its file path and type (PDF/image).
  - If source is a transaction, get its associated receipt(s).
- Ensure source and target receipts are accessible on the filesystem.

### 3. Receipt Normalization
- For each receipt (source and target):
  - If PDF: Use `pdf2image` to convert to images (one per page).
  - If image: Load directly with `pillow`.
- Normalize images:
  - Resize to a consistent width (e.g., 800px for screen viewing).
  - Add uniform margins (e.g., 20px on all sides).
  - Maintain aspect ratio to avoid distortion.
- Convert normalized images back to PDF pages using `pillow` (via `reportlab` or similar, but since not available, use `pypdf` to create PDFs from images if needed).

### 4. PDF Merging
- Use `pypdf` to merge normalized PDFs:
  - Create a new PDF writer.
  - Add pages from target PDF first, then source PDF.
- Save the merged PDF to a temporary location.

### 5. File Processing and Database Update
- Compute the new PDF's filesize and hash (e.g., SHA-256).
- Update the target transaction's receipt file path, filesize, and hash in the database.
- Move the merged PDF to the final storage location (replace the target's receipt file).

### 6. Cleanup
- Delete the source receipt file from the filesystem.
- Remove source receipt entry from the database (if applicable).
- Ensure atomicity: Use database transactions to rollback if file operations fail.

### 7. Error Handling and Validation
- Handle cases where receipts are missing or corrupted.
- Validate file types and sizes.
- Log operations for debugging.
- Return appropriate HTTP responses (success, errors).

### 8. Testing
- Unit tests for normalization and merging functions.
- Integration tests for the full merge process.
- Test with various receipt formats (PDF, JPG, PNG) and sizes.

## Critical Design Considerations

### 1. Progressive Image Quality Degradation
**Concern**: Receipts can be merged multiple times (typically 1-2 times, up to 10 in extreme cases). Each merge iteration involves converting PDFs to images, normalizing, and re-encoding, which may progressively degrade image quality.

**Assessment**: This is a **legitimate concern** that requires mitigation, especially for receipts merged 5+ times.

**Proposed Solution: Selective Processing to Preserve Quality**
- **Honor target PDF settings**: Always preserve the existing DPI, compression settings, and page dimensions of the target receipt (typically a PDF). Do not re-encode or normalize existing pages.
- **Convert only new pages**: For source receipts that are raster images (most common case), convert them to PDF pages matching the target's DPI and settings, then append to the existing PDF without modifying the original pages.
- **Lossless PDF merging for PDF sources**: When the source is a PDF (rare case), use `pypdf` for direct, lossless merging without image conversion.
- **Normalization only when necessary**: Apply normalization (resizing, margins) only to source images that significantly differ in dimensions from the target. Use the target's DPI as the baseline.
- **Last resort compression**: If merging incompatible formats (e.g., vastly different DPIs), apply minimal compression (e.g., high-quality JPEG with quality=95) only to the source pages.
- **Track merge count**: Monitor the number of merges per receipt in the database; warn users after 3-5 merges about potential quality loss and suggest reviewing the final PDF.

**Implementation approach**:
1. Inspect the target PDF to extract DPI, page size, and compression settings using `pypdf`.
2. For raster source: Convert to PDF pages using the target's DPI and settings (via Pillow), normalize if needed, then append to target PDF.
3. For PDF source: Use `pypdf` to append pages directly.
4. If incompatible, apply minimal compression as fallback.
5. Update the merged PDF's metadata to reflect the new hash and size.

---

### 2. Receipt Hash and Duplicate Prevention
**Concern**: The application uses receipt hashes to prevent duplicate uploads. When receipts are merged and the source is deleted, its hash is removed from the database, allowing users to re-upload the same receipt.

**Scenario Analysis**:

**Scenario A: User accidentally merges Receipt A into Transaction 1**
- Receipt A's hash is deleted.
- User later tries to upload Receipt A again → Upload succeeds (duplicate allowed).
- **Impact**: Minor inconvenience; user can delete the duplicate manually.

**Scenario B: User merges Receipt A into Transaction 1, then tries to upload Receipt A to Transaction 2**
- Receipt A's hash no longer exists after merge/deletion.
- Upload succeeds, creating a duplicate across transactions.
- **Impact**: Data integrity issue; same expense recorded twice.

**Scenario C: User splits a multi-page receipt, then tries to re-upload the original**
- If splitting involves creating new receipts and deleting the original, the original hash is lost.
- Re-uploading the full receipt succeeds.
- **Impact**: Possible duplicate expense if not caught.

**Assessment**: This is a **real concern** for scenarios where users might re-upload receipts after merging, either intentionally or accidentally.

**Proposed Solution: Hash History Table**
Create a separate `receipt_hash_history` table to maintain a permanent record of all receipt hashes, even after deletion.

**Schema**:
```sql
CREATE TABLE receipt_hash_history (
    id SERIAL PRIMARY KEY,
    hash VARCHAR(64) NOT NULL UNIQUE,
    original_receipt_id INT REFERENCES receipts(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,
    reason VARCHAR(50) NULL  -- e.g., 'merged', 'deleted_by_user'
);
```

**Workflow**:
1. On receipt upload, check `receipt_hash_history` for the hash.
2. If found, reject the upload with an error message (e.g., "This receipt was previously uploaded on [date] and merged into Transaction X").
3. On merge/delete, insert the source receipt's hash into `receipt_hash_history` with `deleted_at` timestamp and reason.
4. Provide an admin override option to allow re-uploads in exceptional cases.

**Alternative (simpler) approach**:
- Add a `is_deleted` flag to the receipts table instead of hard-deleting.
- Keep the hash in the database even for deleted receipts.
- Filter out deleted receipts from queries.
- **Pros**: Simpler to implement; allows auditing and recovery.
- **Cons**: Database grows over time with deleted records.

**Recommendation**: Implement the hash history table for cleaner separation of concerns and better auditability.

---

## Additional Considerations
- **Performance**: For large PDFs, consider processing in chunks or background jobs.
- **Security**: Validate file uploads and prevent path traversal.
- **Scalability**: Ensure filesystem operations are efficient.
- **UI Integration**: Update frontend components to trigger merge actions and display warnings for multiple merges.</content>
<parameter name="filePath">/Users/jaeseopark/Documents/GitHub/receep/transaction_merge_implementation.md
