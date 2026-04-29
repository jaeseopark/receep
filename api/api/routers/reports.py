from datetime import datetime, timedelta, timezone
import logging

from api.utils import get_api_safe_json
from fastapi import APIRouter, Depends, Query
from persistence.database import instance as db_instance

from api.access.authenticator import AuthMetadata
from api.shared import get_auth_metadata
from persistence.schema import LineItem

logger = logging.getLogger("receep")

router = APIRouter()


def line_item_to_dict(line_item: LineItem, tz: float = 0) -> dict:
    tx_time: datetime = line_item.transaction.timestamp

    if tz:
        tzinfo = timezone(timedelta(hours=tz))
        tx_time = tx_time.replace(tzinfo=tzinfo)

    return dict(
        amount=line_item.amount,
        category_id=line_item.category_id,
        tx_id=line_item.transaction.id,
        vendor_id=line_item.transaction.vendor_id,
        year=tx_time.year,
        month=tx_time.month,
        day=tx_time.day,
        day_of_week=tx_time.strftime("%A")
    )


def paginated_line_items_response(line_items: list, offset: int, tz: float) -> dict:
    return dict(
        next_offset=offset + len(line_items),
        items=get_api_safe_json([line_item_to_dict(li, tz) for li in line_items])
    )


@router.get("/reports/annual-expense-report/paginated")
def get_annual_expense_report(
    start: float = Query(),
    end: float = Query(),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    tz: float = Query(0),  # in hours. Ex. UTC-7 is -7.
    auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    line_items = db_instance.get_line_items(
        user_id=auth_metadata.user_id,
        start=datetime.fromtimestamp(start),
        end=datetime.fromtimestamp(end),
        offset=offset,
        limit=limit
    )

    return paginated_line_items_response(line_items, offset, tz)


@router.get("/reports/line-items-by-vendor/paginated")
def get_line_items_by_vendor(
    vendor_id: int = Query(),
    offset: int = Query(0, ge=0),
    limit: int = Query(500, le=500),
    tz: float = Query(0),  # in hours. Ex. UTC-7 is -7.
    auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    line_items = db_instance.get_line_items_by_vendor(
        user_id=auth_metadata.user_id,
        vendor_id=vendor_id,
        offset=offset,
        limit=limit,
    )

    return paginated_line_items_response(line_items, offset, tz)


@router.get("/reports/line-items-by-category/paginated")
def get_line_items_by_category(
    category_id: int = Query(),
    offset: int = Query(0, ge=0),
    limit: int = Query(500, le=500),
    tz: float = Query(0),  # in hours. Ex. UTC-7 is -7.
    auth_metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    line_items = db_instance.get_line_items_by_category(
        user_id=auth_metadata.user_id,
        category_id=category_id,
        offset=offset,
        limit=limit,
    )

    return paginated_line_items_response(line_items, offset, tz)
