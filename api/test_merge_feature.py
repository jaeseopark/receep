"""
Basic tests for transaction merge feature.

Run with: pytest test_merge_feature.py
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO
from PIL import Image


def test_merge_receipts_imports():
    """Test that all required imports work."""
    try:
        from logic.pdf_merger import (
            merge_receipts,
            extract_pdf_metadata,
            normalize_image,
            image_to_pdf_bytes,
            get_file_info
        )
        assert merge_receipts is not None
        assert extract_pdf_metadata is not None
        assert normalize_image is not None
        assert image_to_pdf_bytes is not None
        assert get_file_info is not None
    except ImportError as e:
        pytest.fail(f"Import failed: {e}")


def test_normalize_image_basic():
    """Test basic image normalization."""
    from logic.pdf_merger import normalize_image
    
    # Create a simple test image
    img = Image.new('RGB', (800, 1000), color='white')
    
    # Normalize without resizing
    normalized = normalize_image(img, target_width=None, add_margins=True)
    
    # Should have margins added (20px on each side)
    assert normalized.width == 840  # 800 + 2*20
    assert normalized.height == 1040  # 1000 + 2*20


def test_normalize_image_with_resize():
    """Test image normalization with resizing."""
    from logic.pdf_merger import normalize_image
    
    # Create a test image with different dimensions
    img = Image.new('RGB', (1600, 2000), color='white')
    
    # Normalize with resizing
    normalized = normalize_image(img, target_width=800, add_margins=True)
    
    # Should be resized to target width (800) and height proportional
    # Then margins added (20px on each side)
    expected_height = int(800 * (2000 / 1600))  # 1000
    assert normalized.width == 840  # 800 + 2*20
    assert normalized.height == expected_height + 40  # 1000 + 2*20


def test_image_to_pdf_bytes():
    """Test converting image to PDF bytes."""
    from logic.pdf_merger import image_to_pdf_bytes
    
    # Create a simple test image
    img = Image.new('RGB', (800, 1000), color='white')
    
    # Convert to PDF
    pdf_bytes = image_to_pdf_bytes(img, dpi=150)
    
    # Should return bytes
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    
    # Should start with PDF magic bytes
    assert pdf_bytes[:4] == b'%PDF'


def test_merge_receipt_request_model():
    """Test MergeReceiptRequest Pydantic model."""
    from api.routers.transactions import MergeReceiptRequest
    
    # Valid receipt source
    req = MergeReceiptRequest(source_type='receipt', source_id=123)
    assert req.source_type == 'receipt'
    assert req.source_id == 123
    
    # Valid transaction source
    req = MergeReceiptRequest(source_type='transaction', source_id=456)
    assert req.source_type == 'transaction'
    assert req.source_id == 456


def test_merge_receipt_response_model():
    """Test MergeReceiptResponse Pydantic model."""
    from api.routers.transactions import MergeReceiptResponse
    
    # Without warning
    resp = MergeReceiptResponse(
        message='Success',
        transaction_id=123,
        new_receipt_hash='abc123',
        new_receipt_size=12345,
        merge_count=1
    )
    assert resp.warning is None
    
    # With warning
    resp = MergeReceiptResponse(
        message='Success',
        transaction_id=123,
        new_receipt_hash='abc123',
        new_receipt_size=12345,
        merge_count=5,
        warning='Quality may be degraded'
    )
    assert resp.warning is not None


def test_receipt_hash_history_schema():
    """Test that ReceiptHashHistory schema is defined correctly."""
    from persistence.schema import ReceiptHashHistory
    
    assert ReceiptHashHistory is not None
    assert hasattr(ReceiptHashHistory, '__tablename__')
    assert ReceiptHashHistory.__tablename__ == 'receipt_hash_history'


def test_receipt_merge_count_field():
    """Test that Receipt has merge_count field."""
    from persistence.schema import Receipt
    
    # Check that merge_count column exists
    assert hasattr(Receipt, 'merge_count')


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
