# Transaction Merge Feature - Implementation Checklist

## ✅ Completed Tasks

### Code Implementation
- [x] Added `pypdf` to requirements.txt
- [x] Added `merge_count` column to Receipt schema
- [x] Created `ReceiptHashHistory` table schema
- [x] Created `logic/pdf_merger.py` with merge utilities
- [x] Added database methods for merge operations
- [x] Added hash history checking in receipt upload
- [x] Added hash history updates in receipt deletion
- [x] Created merge endpoint models (request/response)
- [x] Implemented `POST /transactions/{transaction_id}/merge` endpoint
- [x] Added comprehensive error handling
- [x] Added merge count warnings (>= 3 merges)

### Quality Preservation Features
- [x] Target PDF pages left untouched
- [x] Source images converted using target's DPI
- [x] Lossless PDF-to-PDF merging
- [x] High quality JPEG compression (95)
- [x] Merge count tracking

### Duplicate Prevention Features
- [x] Created receipt_hash_history table
- [x] Hash checking before upload
- [x] Hash history updates on merge
- [x] Hash history updates on deletion
- [x] Reason tracking (merged, deleted_by_user)

### Documentation
- [x] Implementation design document (transaction_merge_implementation.md)
- [x] Implementation summary (IMPLEMENTATION_SUMMARY.md)
- [x] Feature README (MERGE_FEATURE_README.md)
- [x] Database migration script (migrate_merge_feature.py)
- [x] Basic test suite (test_merge_feature.py)

## 📋 Pre-Deployment Checklist

### Before Deployment
- [ ] Install pypdf: `pip install pypdf`
- [ ] Review RECEIPT_DIR path is correct for your environment
- [ ] Backup database before running migration
- [ ] Run migration script: `python migrate_merge_feature.py`
- [ ] Verify migration completed successfully
- [ ] Run tests: `pytest test_merge_feature.py -v`

### Post-Deployment Verification
- [ ] API server restarts without errors
- [ ] New endpoint appears in API docs (`/docs`)
- [ ] Test merge with image receipt
- [ ] Test merge with PDF receipt
- [ ] Test merge from transaction to transaction
- [ ] Verify source receipt deleted after merge
- [ ] Verify duplicate upload rejected
- [ ] Verify warning appears after 3+ merges
- [ ] Check merged PDF quality visually

### Database Verification
- [ ] Verify `merge_count` column exists in `receipts` table
- [ ] Verify `receipt_hash_history` table created
- [ ] Verify existing receipts populated in hash history
- [ ] Check hash history updates after merge operation
- [ ] Check hash history updates after delete operation

## 🔧 Configuration Review

### Environment Variables
- [ ] POSTGRES_PASSWORD is set correctly
- [ ] Database connection string is correct

### File Paths
- [ ] RECEIPT_DIR = "/data/receipts" is correct for your system
- [ ] Directory exists and has proper permissions

### Settings to Review (in `logic/pdf_merger.py`)
```python
DEFAULT_DPI = 150          # Adjust if needed
MAX_WIDTH = 800            # Screen viewing width
MARGIN = 20                # Page margins
JPEG_QUALITY = 95          # Compression quality
```

## 🧪 Testing Strategy

### Unit Tests
- [ ] Test normalize_image() with various dimensions
- [ ] Test image_to_pdf_bytes() conversion
- [ ] Test extract_pdf_metadata() on sample PDFs
- [ ] Test get_file_info() hash calculation

### Integration Tests
- [ ] Test complete merge workflow
- [ ] Test database transaction rollback on error
- [ ] Test file cleanup on error
- [ ] Test authorization checks

### Manual Tests
- [ ] Merge image → PDF transaction
- [ ] Merge PDF → PDF transaction
- [ ] Merge transaction → transaction
- [ ] Merge 3+ times, check warnings
- [ ] Try to re-upload merged receipt (should fail)
- [ ] Delete receipt, check hash history
- [ ] Visual quality check of merged PDFs

### Error Scenarios
- [ ] Merge with non-existent transaction
- [ ] Merge with non-existent receipt
- [ ] Merge without authorization
- [ ] Merge same receipt to itself
- [ ] Merge when file system full
- [ ] Merge when receipt file missing

## 📊 Monitoring

### Metrics to Watch
- Merge operation success rate
- Merge operation duration
- File size growth after merges
- Merge count distribution
- Hash history table size growth

### Logs to Monitor
- Merge operations: "Merging receipt X into transaction Y"
- Hash duplicates: "Duplicate receipt hash detected"
- Warnings: Merge count >= 3
- Errors: File system errors, database errors

## 🚨 Known Issues / Limitations

### Current Limitations
1. `.dr` file type detection relies on file existence
2. PDF DPI estimation is approximate
3. Large PDFs may be slow to process
4. No undo/split functionality

### Future Improvements
- Add background job processing
- Add configurable quality settings
- Add merge history/lineage tracking
- Add split merged receipts feature
- Add automatic OCR re-processing

## 📁 Files Modified/Created

### Modified Files
```
api/requirements.txt
api/persistence/schema.py
api/persistence/database.py
api/api/routers/transactions.py
```

### New Files
```
api/logic/pdf_merger.py
api/migrate_merge_feature.py
api/test_merge_feature.py
transaction_merge_implementation.md
IMPLEMENTATION_SUMMARY.md
MERGE_FEATURE_README.md
IMPLEMENTATION_CHECKLIST.md (this file)
```

## 🎯 Success Criteria

The implementation is successful when:
- [x] All code written and integrated
- [ ] All dependencies installed
- [ ] Database migration completed
- [ ] All tests passing
- [ ] API endpoint working correctly
- [ ] Receipts merging successfully
- [ ] Quality preserved in merged PDFs
- [ ] Source receipts deleted after merge
- [ ] Duplicate uploads prevented
- [ ] Warnings shown for high merge counts
- [ ] Error handling working correctly
- [ ] Documentation complete

## 📞 Support

For issues or questions:
1. Check error logs for specific errors
2. Review MERGE_FEATURE_README.md for troubleshooting
3. Check database schema matches expected structure
4. Verify file permissions on RECEIPT_DIR
5. Test with simple cases first (single image merge)

## 🎉 Ready for Production?

Before marking as production-ready:
- [ ] All checklist items completed
- [ ] All tests passing
- [ ] Manual testing completed
- [ ] Performance acceptable
- [ ] Error handling verified
- [ ] Documentation reviewed
- [ ] Team trained on new feature
