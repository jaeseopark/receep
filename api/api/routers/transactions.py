from datetime import datetime
import logging
import os
import shutil
import tempfile
from typing import List, Optional

from api.utils import get_api_safe_json
from fastapi import APIRouter, Depends, HTTPException, Query
from persistence.database import instance as db_instance
from persistence.exceptions import NotFound
from pydantic import BaseModel

from api.access.authenticator import AuthMetadata
from api.shared import get_auth_metadata
from logic.pdf_merger import merge_receipt_to_transaction

logger = logging.getLogger("receep")

router = APIRouter()

RECEIPT_DIR = "/data/receipts"

PERS_LINE_ITEM_ATTRS = ()


class LineItem(BaseModel):
    name: str
    amount_input: str
    amount: float
    notes: Optional[str]
    category_id: int


class UpsertRequest(BaseModel):
    line_items: List[LineItem]
    vendor_id: Optional[str]
    receipt_id: Optional[str]
    timestamp: float


class MergeReceiptRequest(BaseModel):
    source_type: str  # 'receipt' or 'transaction'
    source_id: int


class MergeReceiptResponse(BaseModel):
    message: str
    transaction_id: int
    new_receipt_hash: str
    new_receipt_size: int
    merge_count: int
    warning: Optional[str] = None


@router.get("/transactions/paginated")
def get_transactions(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    txns = db_instance.get_transactions(
        user_id=auth_metadata.user_id,
        offset=offset,
        limit=limit
    )

    return dict(
        next_offset=offset+len(txns),
        items=get_api_safe_json(txns)
    )


@router.get("/transactions/single/{id}")
def get_single_transaction(
    id: int,
    _: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    t = db_instance.get_transaction(transaction_id=id)
    return get_api_safe_json(t)


@router.post("/transactions")
def create_transaction(
    payload: UpsertRequest,
    auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    payload = payload.dict()  # work with plain JSON after api input validations have passed
    t = db_instance.create_transaction(
        user_id=auth_metadata.user_id,
        vendor_id=payload.get("vendor_id"),
        receipt_id=payload.get("receipt_id"),
        line_items=payload.get("line_items"),
        timestamp=datetime.fromtimestamp(payload.get("timestamp")),
    )
    return get_api_safe_json(t)


@router.put("/transactions/{transaction_id}")
def update_transaction(
    transaction_id: int,
    payload: UpsertRequest,
    auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    payload = payload.dict()  # work with plain JSON after api input validations have passed
    t = db_instance.update_transaction(
        transaction_id=transaction_id,
        user_id=auth_metadata.user_id,
        vendor_id=payload.get("vendor_id"),
        receipt_id=payload.get("receipt_id"),
        line_items=payload.get("line_items"),
        timestamp=datetime.fromtimestamp(payload.get("timestamp")),
    )

    return get_api_safe_json(t)


@router.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    db_instance.delete_transaction(
        transaction_id=transaction_id,
        user_id=auth_metadata.user_id,
    )

    return dict(message="success")


@router.post("/transactions/{transaction_id}/merge", response_model=MergeReceiptResponse)
def merge_receipt_to_transaction_endpoint(
    transaction_id: int,
    payload: MergeReceiptRequest,
    auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    """
    Merge a source receipt into a transaction's existing receipt.
    
    The transaction details (date, vendor, line items) remain unchanged.
    The source and target receipts are normalized and merged into a single PDF.
    The source receipt is deleted after the merge.
    """
    try:
        # Validate transaction exists and user has access
        transaction = db_instance.get_transaction(transaction_id=transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        if transaction.user_id != auth_metadata.user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        if not transaction.receipt_id:
            raise HTTPException(status_code=400, detail="Transaction does not have a receipt")
        
        # Get target receipt
        target_receipt = db_instance.get_receipt_by_id(
            receipt_id=transaction.receipt_id,
            user_id=auth_metadata.user_id
        )
        
        if not target_receipt:
            raise HTTPException(status_code=404, detail="Target receipt not found")
        
        # Get source receipt based on source_type
        source_receipt = None
        
        if payload.source_type == 'receipt':
            source_receipt = db_instance.get_receipt_by_id(
                receipt_id=payload.source_id,
                user_id=auth_metadata.user_id
            )
            if not source_receipt:
                raise HTTPException(status_code=404, detail="Source receipt not found")
        
        elif payload.source_type == 'transaction':
            source_transaction = db_instance.get_transaction(transaction_id=payload.source_id)
            if not source_transaction:
                raise HTTPException(status_code=404, detail="Source transaction not found")
            
            if source_transaction.user_id != auth_metadata.user_id:
                raise HTTPException(status_code=403, detail="Unauthorized")
            
            if not source_transaction.receipt_id:
                raise HTTPException(status_code=400, detail="Source transaction does not have a receipt")
            
            source_receipt = db_instance.get_receipt_by_id(
                receipt_id=source_transaction.receipt_id,
                user_id=auth_metadata.user_id
            )
            
            if not source_receipt:
                raise HTTPException(status_code=404, detail="Source receipt not found")
        
        else:
            raise HTTPException(status_code=400, detail="Invalid source_type. Must be 'receipt' or 'transaction'")
        
        # Ensure source and target are different
        if source_receipt.id == target_receipt.id:
            raise HTTPException(status_code=400, detail="Source and target receipts must be different")
        
        # Get file paths
        target_path = os.path.join(RECEIPT_DIR, f"{target_receipt.id}.dr")
        source_path = os.path.join(RECEIPT_DIR, f"{source_receipt.id}.dr")
        
        if not os.path.exists(target_path):
            raise HTTPException(status_code=500, detail="Target receipt file not found on filesystem")
        
        if not os.path.exists(source_path):
            raise HTTPException(status_code=500, detail="Source receipt file not found on filesystem")
        
        # Create temporary file for merged PDF
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            temp_output_path = tmp_file.name
        
        try:
            # Merge receipts
            logger.info(f"Merging receipt {source_receipt.id} into transaction {transaction_id}'s receipt {target_receipt.id}")
            new_size, new_hash = merge_receipt_to_transaction(
                transaction_receipt_path=target_path,
                source_receipt_path=source_path,
                output_path=temp_output_path
            )
            
            # Replace target receipt file with merged PDF
            shutil.move(temp_output_path, target_path)
            
            # Update database
            updated_receipt = db_instance.update_receipt_after_merge(
                receipt_id=target_receipt.id,
                user_id=auth_metadata.user_id,
                new_hash=new_hash,
                new_size=new_size
            )
            
            # Mark source receipt as merged in hash history
            db_instance.mark_receipt_as_merged(
                source_receipt_id=source_receipt.id,
                user_id=auth_metadata.user_id
            )
            
            # Delete source receipt from database and filesystem
            db_instance.delete_receipt(
                receipt_id=source_receipt.id,
                user_id=auth_metadata.user_id
            )
            
            # Delete source receipt file
            if os.path.exists(source_path):
                os.remove(source_path)
                logger.info(f"Deleted source receipt file: {source_path}")
            
            # Generate warning if merge count is high
            warning = None
            if updated_receipt.merge_count >= 3:
                warning = f"This receipt has been merged {updated_receipt.merge_count} times. Image quality may be degraded. Consider reviewing the PDF."
            
            return MergeReceiptResponse(
                message="Receipt merged successfully",
                transaction_id=transaction_id,
                new_receipt_hash=new_hash,
                new_receipt_size=new_size,
                merge_count=updated_receipt.merge_count,
                warning=warning
            )
        
        except Exception as e:
            # Clean up temporary file if it exists
            if os.path.exists(temp_output_path):
                os.remove(temp_output_path)
            logger.error(f"Error merging receipts: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to merge receipts: {str(e)}")
    
    except NotFound:
        raise HTTPException(status_code=404, detail="Resource not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in merge endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
