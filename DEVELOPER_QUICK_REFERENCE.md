# Transaction Merge Feature - Developer Quick Reference

## Installation (One-Time Setup)

```bash
# 1. Install dependencies
cd /Users/jaeseopark/Documents/GitHub/receep/api
pip install pypdf

# 2. Run database migration
python migrate_merge_feature.py

# 3. Restart API server
```

## API Endpoint

```
POST /transactions/{transaction_id}/merge
```

**Request:**
```json
{
  "source_type": "receipt",    // or "transaction"
  "source_id": 456
}
```

**Response:**
```json
{
  "message": "Receipt merged successfully",
  "transaction_id": 123,
  "new_receipt_hash": "abc...",
  "new_receipt_size": 245678,
  "merge_count": 1,
  "warning": null
}
```

## Key Functions

### `logic/pdf_merger.py`
- `merge_receipts(target, source, output)` - Core merge logic
- `extract_pdf_metadata(pdf_path)` - Get PDF info
- `normalize_image(image, width, margins)` - Resize/pad image
- `image_to_pdf_bytes(image, dpi)` - Convert PIL to PDF

### `persistence/database.py`
- `update_receipt_after_merge()` - Update receipt post-merge
- `get_receipt_by_id()` - Get receipt with auth
- `mark_receipt_as_merged()` - Update hash history

## Database Tables

### `receipts` (modified)
```sql
-- New column:
merge_count INTEGER NOT NULL DEFAULT 0
```

### `receipt_hash_history` (new)
```sql
CREATE TABLE receipt_hash_history (
    id SERIAL PRIMARY KEY,
    hash VARCHAR(64) NOT NULL UNIQUE,
    original_receipt_id INTEGER,
    uploaded_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    reason VARCHAR(50) NULL
);
```

## Workflow

1. **Validate** transaction + receipts exist
2. **Get file paths** from RECEIPT_DIR
3. **Merge** using pdf_merger.merge_receipts()
4. **Update** target receipt in DB (new hash, size, merge_count++)
5. **Mark** source receipt as merged in hash history
6. **Delete** source receipt from DB + filesystem
7. **Warn** if merge_count >= 3

## Quality Preservation

| Scenario | Handling |
|----------|----------|
| PDF → PDF | Lossless merge (no re-encoding) |
| Image → PDF | Convert using target's DPI |
| Existing pages | Never modified |
| New pages | Normalized + high quality (95) |

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (missing receipt, same source/target) |
| 403 | Unauthorized |
| 404 | Transaction/receipt not found |
| 500 | Server error (file system, DB) |

## Configuration

In `logic/pdf_merger.py`:
```python
DEFAULT_DPI = 150        # DPI for conversions
MAX_WIDTH = 800          # Target width (px)
MARGIN = 20              # Page margins (px)
JPEG_QUALITY = 95        # Compression quality
```

## Testing

```bash
# Run tests
pytest test_merge_feature.py -v

# Manual test
curl -X POST http://localhost:8000/transactions/123/merge \
  -H "Authorization: Bearer TOKEN" \
  -d '{"source_type":"receipt","source_id":456}'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Import pypdf error | `pip install pypdf` |
| Column doesn't exist | Run migration script |
| File not found | Check RECEIPT_DIR path |
| Duplicate hash | Expected - prevents re-upload |
| Quality degraded | Check merge_count, review settings |

## Important Notes

- ⚠️ Source receipt is **deleted** after merge
- ⚠️ Merged receipts **cannot be un-merged**
- ⚠️ Re-uploading merged receipt will **fail** (by design)
- ✅ Target transaction details remain **unchanged**
- ✅ Existing PDF pages are **never re-encoded**
- ✅ Warnings appear at **merge_count >= 3**

## File Locations

```
api/
├── requirements.txt              (modified - added pypdf)
├── logic/
│   └── pdf_merger.py            (new - merge utilities)
├── persistence/
│   ├── schema.py                (modified - new table + column)
│   └── database.py              (modified - new methods)
├── api/routers/
│   └── transactions.py          (modified - new endpoint)
├── migrate_merge_feature.py     (new - DB migration)
└── test_merge_feature.py        (new - tests)
```

## Quick Debug

```python
# Check if merge_count exists
from persistence.schema import Receipt
print(hasattr(Receipt, 'merge_count'))  # Should be True

# Check if hash history table exists
from persistence.schema import ReceiptHashHistory
print(ReceiptHashHistory.__tablename__)  # Should be 'receipt_hash_history'

# Test merge function import
from logic.pdf_merger import merge_receipts
print(merge_receipts)  # Should show function

# Test endpoint import
from api.routers.transactions import MergeReceiptRequest
print(MergeReceiptRequest)  # Should show model
```

## Next Steps

1. ✅ Code implemented
2. ⬜ Install dependencies
3. ⬜ Run migration
4. ⬜ Test endpoint
5. ⬜ Deploy to production
6. ⬜ Monitor logs
7. ⬜ Gather feedback
