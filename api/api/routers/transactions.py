import logging
from typing import List, Optional

from api.utils import get_api_safe_json
from fastapi import APIRouter, Depends, Query
from persistence.database import instance as db_instance
from pydantic import BaseModel

from api.access.authenticator import AuthMetadata
from api.shared import get_auth_metadata

logger = logging.getLogger("divvy")

router = APIRouter()

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
    auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    t = db_instance.get_transaction(
        transaction_id=id, user_id=auth_metadata.user_id)
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
        line_items=payload.get("line_items")
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
    )

    return get_api_safe_json(t)
