# Transaction Merge Feature

## Quick Start

### Installation

1. **Install new dependencies:**
   ```bash
   pip install pypdf
   ```

2. **Run database migration:**
   ```bash
   python migrate_merge_feature.py
   ```

3. **Restart the API server**

## API Endpoint

### `POST /transactions/{transaction_id}/merge`

Merge a source receipt into an existing transaction's receipt.

**Request Body:**
```json
{
  "source_type": "receipt",  // or "transaction"
  "source_id": 456           // ID of source receipt or transaction
}
```

**Response:**
```json
{
  "message": "Receipt merged successfully",
  "transaction_id": 123,
  "new_receipt_hash": "abc123...",
  "new_receipt_size": 245678,
  "merge_count": 1,
  "warning": null  // or warning message if merge_count >= 3
}
```

**Error Responses:**
- `400`: Invalid request (missing receipt, same source/target, etc.)
- `403`: Unauthorized
- `404`: Transaction or receipt not found
- `500`: Server error during merge operation

## How It Works

### Scenarios

**Scenario 1: Merge a standalone receipt into a transaction**
```bash
POST /transactions/123/merge
{
  "source_type": "receipt",
  "source_id": 456
}
```
Result: Receipt 456 is appended to transaction 123's receipt, then deleted.

**Scenario 2: Merge one transaction's receipt into another**
```bash
POST /transactions/123/merge
{
  "source_type": "transaction",
  "source_id": 789
}
```
Result: Transaction 789's receipt is appended to transaction 123's receipt, then deleted.

### Merge Process

1. **Validation**: Check that transaction and receipts exist and user has permission
2. **File Merging**: 
   - Target PDF pages remain unchanged (quality preserved)
   - Source images converted to PDF using target's DPI
   - Source PDFs merged losslessly
   - Result saved as PDF
3. **Database Update**:
   - Target receipt updated with new hash and size
   - Merge count incremented
   - Hash history updated
4. **Cleanup**:
   - Source receipt deleted from database
   - Source receipt file deleted from filesystem

### Quality Preservation

- **No re-encoding of existing pages**: Target PDF pages are never modified
- **DPI matching**: Source images converted using target's DPI settings
- **Lossless PDF merging**: PDF-to-PDF merges use direct page copying
- **High quality compression**: JPEG quality set to 95 when compression is needed
- **Merge tracking**: System tracks and warns after 3+ merges

### Duplicate Prevention

The hash history table prevents duplicate uploads:

- All receipt hashes are permanently stored
- Attempting to upload a previously merged/deleted receipt will fail
- Error message indicates when the receipt was originally uploaded
- Hash history includes deletion reason (merged, deleted_by_user)

## Examples

### Python/Requests
```python
import requests

response = requests.post(
    'http://localhost:8000/transactions/123/merge',
    headers={'Authorization': f'Bearer {token}'},
    json={
        'source_type': 'receipt',
        'source_id': 456
    }
)

data = response.json()
print(f"Merged successfully! Merge count: {data['merge_count']}")
if data['warning']:
    print(f"Warning: {data['warning']}")
```

### cURL
```bash
curl -X POST http://localhost:8000/transactions/123/merge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source_type": "receipt", "source_id": 456}'
```

### JavaScript/Fetch
```javascript
const response = await fetch('http://localhost:8000/transactions/123/merge', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    source_type: 'receipt',
    source_id: 456
  })
});

const data = await response.json();
console.log('Merge count:', data.merge_count);
```

## Database Schema Changes

### `receipts` table
- Added `merge_count` column (INTEGER, default 0)

### New `receipt_hash_history` table
- `id`: Primary key
- `hash`: Receipt hash (unique)
- `original_receipt_id`: Foreign key to receipts (nullable)
- `uploaded_at`: Timestamp of original upload
- `deleted_at`: Timestamp of deletion (nullable)
- `reason`: Reason for deletion ('merged', 'deleted_by_user')

## Configuration

Default settings in `logic/pdf_merger.py`:
```python
DEFAULT_DPI = 150          # Default DPI for conversions
MAX_WIDTH = 800            # Target width in pixels
MARGIN = 20                # Margin in pixels
JPEG_QUALITY = 95          # JPEG quality (0-100)
```

## Testing

Run the test suite:
```bash
pytest test_merge_feature.py -v
```

Manual testing checklist:
- [ ] Merge image receipt into PDF transaction
- [ ] Merge PDF receipt into PDF transaction
- [ ] Merge transaction's receipt into another transaction
- [ ] Verify source receipt is deleted
- [ ] Verify duplicate upload is rejected after merge
- [ ] Verify warning appears after 3+ merges
- [ ] Check merged PDF quality visually

## Troubleshooting

**Import errors for pypdf:**
```bash
pip install pypdf
```

**Database errors:**
```bash
# Re-run migration
python migrate_merge_feature.py
```

**Receipt file not found:**
- Verify RECEIPT_DIR path is correct (`/data/receipts`)
- Check file permissions

**Merge quality issues:**
- Check merge_count (should warn at 3+)
- Review DPI settings in pdf_merger.py
- Consider adjusting JPEG_QUALITY setting

## Limitations

1. File format detection relies on file extension and database metadata
2. DPI estimation for PDFs is approximate
3. Very large PDFs may take significant time to merge
4. No undo functionality (merged receipts cannot be un-merged)

## Future Enhancements

- Background job processing for large files
- Configurable quality settings per user
- Merge history tracking (lineage)
- Split merged receipts functionality
- Automatic OCR re-processing after merge
