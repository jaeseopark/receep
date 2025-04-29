import logging

from fastapi import APIRouter, Depends, Query, UploadFile
from logic.receep import instance as app_instance
from persistence.database import instance as db_instance

from api.access.authenticator import AuthMetadata
from api.shared import get_auth_metadata
from api.utils import get_api_safe_json

router = APIRouter()
logger = logging.getLogger("receep")


@router.get("/receipts/paginated")
def get_stuff(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    _: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    receipts = db_instance.get_receipts(offset=offset, limit=limit)
    return dict(
        next_offset=offset+len(receipts),
        items=get_api_safe_json(receipts)
    )


@router.post("/receipts")
async def upload_file(file: UploadFile, metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))):
    try:
        receipt = app_instance.upload(
            metadata.user_id, file.content_type, file.file)
        return get_api_safe_json(receipt)
    finally:
        file.file.close()


@router.post("/receipts/{receipt_id}/rotate")
async def rotate_receipt(receipt_id: int, auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))):
    updated_receipt = db_instance.rotate_receipt(
        receipt_id,
        user_id=auth_metadata.user_id,
        delta=90
    )
    return get_api_safe_json(updated_receipt)


@router.delete("/receipts/{receipt_id}")
async def delete_receipt(receipt_id: int, auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))):
    db_instance.delete_receipt(
        receipt_id,
        user_id=auth_metadata.user_id,
    )

    return dict(message="succes")
