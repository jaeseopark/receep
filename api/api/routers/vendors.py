import logging
from typing import List

from fastapi import APIRouter, Depends, Query
from persistence.database import instance as db_instance

from api.access.authenticator import AuthMetadata
from api.shared import get_auth_metadata
from api.utils import get_api_safe_json
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger("divvy")


class UpsertRequest(BaseModel):
    name: str


class MergeRequest(BaseModel):
    ids: List[int]


@router.get("/vendors/paginated")
def get_vendors(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    vendors = db_instance.get_vendors_by_user_id(
        user_id=metadata.user_id, offset=offset, limit=limit)
    return dict(
        next_offset=offset+len(vendors),
        items=get_api_safe_json(vendors)
    )


@router.post("/vendors")
def create_vendor(
    payload: UpsertRequest,
    metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    vendor = db_instance.create_vendor(
        user_id=metadata.user_id,
        name=payload.name
    )
    return dict(
        id=vendor.id,
        user_id=vendor.user_id,
        name=vendor.name
    )


@router.post("/vendors/merge")
def merge_vendors(
    payload: MergeRequest,
    metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    # TODO
    raise NotImplementedError
