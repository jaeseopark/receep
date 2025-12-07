import logging
from typing import List

from fastapi import APIRouter, Depends, Query
from persistence.database import instance as db_instance

from api.access.authenticator import AuthMetadata
from api.shared import get_auth_metadata
from api.utils import get_api_safe_json
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger("receep")


class UpsertRequest(BaseModel):
    name: str


class MergeRequest(BaseModel):
    source_id: int
    target_id: int


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


@router.put("/vendors/{id}")
def update_vendor(
    id: int,
    payload: UpsertRequest,
    metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    vendor = db_instance.update_vendor(
        id=id,
        user_id=metadata.user_id,
        name=payload.name
    )

    return vendor


@router.delete("/vendors/{id}")
def delete_vendor(
    id: int,
    metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    vendor = db_instance.delete_vendor(
        id=id,
        user_id=metadata.user_id,
    )

    return vendor


@router.post("/vendors/merge")
def merge_vendors(
    payload: MergeRequest,
    metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    db_instance.merge_vendors(
        user_id=metadata.user_id,
        source_vendor_id=payload.source_id,
        target_vendor_id=payload.target_id
    )
    return {"message": "Vendors merged successfully"}
