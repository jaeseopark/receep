# Transaction Merge Feature - Implementation Summary

## Overview
The transaction merge feature has been successfully implemented according to the specifications in `transaction_merge_implementation.md`. This feature allows users to merge receipts (PDF or images) into existing transactions while preserving transaction details and minimizing quality degradation.

## Changes Made

### 1. Dependencies (`api/requirements.txt`)
- Added `pypdf` library for PDF manipulation and merging

### 2. Database Schema (`api/persistence/schema.py`)
- Added `merge_count` column to `Receipt` table to track number of merges
- Created new `ReceiptHashHistory` table to maintain permanent record of all receipt hashes (even after deletion)

### 3. Database Methods (`api/persistence/database.py`)
- Modified `create_receipt()` to check `receipt_hash_history` for duplicates before allowing upload
- Modified `delete_receipt()` to update hash history with deletion timestamp and reason
- Added `update_receipt_after_merge()` to update receipt metadata after merging
- Added `get_receipt_by_id()` to retrieve receipts with authorization
- Added `mark_receipt_as_merged()` to update hash history when receipts are merged

### 4. PDF Merger Utility (`api/logic/pdf_merger.py`)
New module with the following functions:
- `get_file_info()` - Calculate file size and SHA-256 hash
- `extract_pdf_metadata()` - Extract DPI and dimensions from PDF
- `normalize_image()` - Resize and add margins to images
- `image_to_pdf_bytes()` - Convert PIL Image to PDF bytes
- `merge_receipts()` - Core merging logic that:
  - Preserves target PDF's existing DPI and settings
  - Leaves target PDF pages untouched
  - Converts source images to PDF using target's DPI
  - Uses lossless PDF merging for PDF sources
  - Returns new file size and hash

### 5. API Endpoint (`api/api/routers/transactions.py`)
- Added Pydantic models:
  - `MergeReceiptRequest` - Request model with source_type and source_id
  - `MergeReceiptResponse` - Response model with merge details and warnings
- Added `POST /transactions/{transaction_id}/merge` endpoint that:
  - Validates transaction and receipts exist
  - Checks user authorization
  - Supports both receipt and transaction as source types
  - Merges receipts using pdf_merger utility
  - Updates database with new hash and size
  - Deletes source receipt from database and filesystem
  - Warns users when merge_count >= 3

### 6. Database Migration (`api/migrate_merge_feature.py`)
Migration script to:
- Add `merge_count` column to existing `receipts` table
- Create `receipt_hash_history` table
- Populate hash history with existing receipts
- Includes transaction rollback on errors

## Quality Preservation Strategy

The implementation addresses progressive quality degradation through:

1. **Target PDF Preservation**: Existing pages in target receipt remain unchanged
2. **DPI Matching**: Source images are converted using target's DPI settings
3. **Lossless PDF Merging**: When both source and target are PDFs, no image conversion occurs
4. **High Quality Settings**: JPEG quality set to 95 for minimal compression
5. **Merge Count Tracking**: Database tracks merges and warns users after 3+ merges

## Duplicate Prevention

The hash history table prevents duplicate uploads by:

1. **Permanent Hash Storage**: All receipt hashes stored even after deletion
2. **Upload Validation**: New uploads checked against hash history
3. **Audit Trail**: Tracks when hashes were deleted and why (merged/deleted_by_user)
4. **Data Integrity**: Prevents same receipt from being uploaded multiple times

## Installation & Setup

### Step 1: Install Dependencies
```bash
cd /Users/jaeseopark/Documents/GitHub/receep/api
pip install -r requirements.txt
```

### Step 2: Run Database Migration
```bash
cd /Users/jaeseopark/Documents/GitHub/receep/api
python migrate_merge_feature.py
```

### Step 3: Restart API Server
The new endpoint will be available at `POST /transactions/{transaction_id}/merge`

## API Usage Examples

### Merging a Receipt into a Transaction
```bash
curl -X POST http://localhost:8000/transactions/123/merge \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "receipt",
    "source_id": 456
  }'
```

### Merging a Transaction's Receipt into Another Transaction
```bash
curl -X POST http://localhost:8000/transactions/123/merge \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "transaction",
    "source_id": 789
  }'
```

### Response Format
```json
{
  "message": "Receipt merged successfully",
  "transaction_id": 123,
  "new_receipt_hash": "abc123...",
  "new_receipt_size": 245678,
  "merge_count": 1,
  "warning": null
}
```

With warning (after 3+ merges):
```json
{
  "message": "Receipt merged successfully",
  "transaction_id": 123,
  "new_receipt_hash": "def456...",
  "new_receipt_size": 312456,
  "merge_count": 4,
  "warning": "This receipt has been merged 4 times. Image quality may be degraded. Consider reviewing the PDF."
}
```

## Error Handling

The implementation includes comprehensive error handling for:
- Transaction not found (404)
- Unauthorized access (403)
- Missing receipts (404)
- Same source and target (400)
- File system errors (500)
- Database transaction rollback on failures

## Testing Recommendations

1. **Unit Tests**:
   - Test `merge_receipts()` with various image/PDF combinations
   - Test `normalize_image()` with different dimensions
   - Test database methods with different scenarios

2. **Integration Tests**:
   - Test full merge workflow from API endpoint
   - Test duplicate upload prevention after merge
   - Test merge count warnings
   - Test file cleanup on errors

3. **Manual Tests**:
   - Merge image into PDF transaction
   - Merge PDF into PDF transaction
   - Merge multiple times (3+ times) to verify warnings
   - Verify quality preservation with visual inspection
   - Test duplicate upload rejection

## Known Limitations

1. `.dr` file detection: The current implementation assumes `.dr` files based on context. If content type metadata is needed, it should be read from the database.

2. DPI estimation: PDF DPI is estimated based on page dimensions, which may not reflect actual embedded image DPI.

3. Merge history: Currently only tracks count, not the full lineage of merged receipts.

## Future Enhancements

1. Add merge history tracking (which receipts were merged together)
2. Support for splitting merged receipts back apart
3. Configurable quality settings per user
4. Background job processing for large PDFs
5. Automatic OCR re-processing after merge
6. UI components for initiating merge operations

## Files Modified/Created

### Modified:
- `api/requirements.txt`
- `api/persistence/schema.py`
- `api/persistence/database.py`
- `api/api/routers/transactions.py`

### Created:
- `api/logic/pdf_merger.py`
- `api/migrate_merge_feature.py`
- `transaction_merge_implementation.md` (design document)
- `IMPLEMENTATION_SUMMARY.md` (this file)
