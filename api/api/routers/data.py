from fastapi import APIRouter, Depends, UploadFile
import logging

from fastapi import APIRouter, Depends

from api.access.authenticator import AuthMetadata
from api.shared import get_auth_metadata

logger = logging.getLogger("divvy")


router = APIRouter()
logger = logging.getLogger("divvy")


@router.post("/data/import")
def import_data(
    file: UploadFile,
    _: AuthMetadata = Depends(get_auth_metadata(
        assert_jwt=True, assert_roles=["admin"]))
):
    file.content_type
    file.file
    return dict(
        message="Success"
    )


@router.post("/data/export")
async def export_data(
        _: AuthMetadata = Depends(get_auth_metadata(
        assert_jwt=True, assert_roles=["admin"]))
):
    local_path = "/dir/file.zip"
    return local_path
