from datetime import datetime
import logging

from api.utils import get_api_safe_json
from fastapi import APIRouter, Depends, Query
from persistence.database import instance as db_instance

from api.access.authenticator import AuthMetadata
from api.shared import get_auth_metadata
from persistence.schema import LineItem

logger = logging.getLogger("receep")

router = APIRouter()


@router.get("/reports/expenses-by-category/paginated")
def get_expenses_by_category(
    start: float = Query(),
    end: float = Query(),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    line_items = db_instance.get_line_items(
        user_id=auth_metadata.user_id,
        start=datetime.fromtimestamp(start),
        end=datetime.fromtimestamp(end),
        offset=offset,
        limit=limit
    )

    def transform(line_item: LineItem) -> dict:
        tx_time: datetime = line_item.transaction.timestamp
        return dict(
            amount=line_item.amount,
            category_id=line_item.category_id,
            vendor_id=line_item.transaction.vendor_id,
            year=tx_time.year,
            month=tx_time.month,
            day=tx_time.day,
            day_of_week=tx_time.strftime("%A")
        )

    return dict(
        next_offset=offset+len(line_items),
        items=get_api_safe_json(list(map(transform, line_items)))
    )
