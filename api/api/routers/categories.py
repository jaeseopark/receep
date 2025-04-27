import logging

from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query
from persistence.database import instance as db_instance

from api.access.authenticator import AuthMetadata
from api.shared import get_auth_metadata
from api.utils import get_api_safe_json

router = APIRouter()
logger = logging.getLogger("receep")


class UpsertRequest(BaseModel):
    id: int
    name: str
    description: str
    user_id: str


@router.get("/categories/paginated")
def get_categories(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    categories = db_instance.get_categories_by_user_id(
        user_id=metadata.user_id, offset=offset, limit=limit)
    return dict(
        next_offset=offset+len(categories),
        items=get_api_safe_json(categories)
    )


@router.post("/categories")
def create_category(
    payload: UpsertRequest,
    metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    category = db_instance.create_category(
        user_id=metadata.user_id,
        name=payload.name,
        description=payload.description
    )

    return category


@router.put("/categories/{id}")
def update_category(
    id: int,
    payload: UpsertRequest,
    metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    category = db_instance.update_category(
        id=id,
        user_id=metadata.user_id,
        name=payload.name,
        description=payload.description
    )

    return category
