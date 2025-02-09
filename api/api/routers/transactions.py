from fastapi import APIRouter, Depends, Query

from api.access.authenticator import AuthMetadata
from api.shared import get_auth_metadata

router = APIRouter()


@router.get("/transactions/paginated")
def get_stuff(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    txns = db.get_transactions(
        user_id=auth_metadata.user_id, offset=offset, limit=limit)
    return dict(
        next_offset=offset+len(txns),
        items=txns
    )
