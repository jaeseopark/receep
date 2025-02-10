import logging

from fastapi import APIRouter, Depends, Query, UploadFile
from logic.divvy import instance as app_instance
from persistence.database import instance as db_instance

from api.access.authenticator import AuthMetadata
from api.shared import get_auth_metadata
from api.utils import serialize

router = APIRouter()
logger = logging.getLogger("divvy")


@router.get("/receipts/paginated")
def get_stuff(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    _: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    receipts = db_instance.get_receipts(offset=offset, limit=limit)
    return dict(
        next_offset=offset+len(receipts),
        items=serialize(receipts)
    )


@router.post("/receipts")
async def upload_file(file: UploadFile, metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))):
    try:
        receipt = app_instance.upload(metadata.user_id, file.content_type, file.file)
        return serialize(receipt)
    finally:
        file.file.close()
