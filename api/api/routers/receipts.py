from fastapi import APIRouter, Depends, Query, UploadFile
from logic.divvy import instance as app_instance
from persistence.database import instance as db_instance

from api.access.authenticator import AuthMetadata
from api.shared import get_auth_metadata

router = APIRouter()


@router.get("/receipts/paginated")
def get_stuff(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    _: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    receipts = db_instance.get_receipts(offset=offset, limit=limit)
    return dict(
        next_offset=offset+len(receipts),
        items=receipts
    )


@router.post("/receipts")
async def upload_file(file: UploadFile, metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))):
    try:
        return app_instance.upload(metadata.user_id, file.content_type, file.file)
    finally:
        file.file.close()
