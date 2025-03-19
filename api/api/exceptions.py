
from functools import wraps
import logging

from fastapi.responses import JSONResponse
from persistence.exceptions import DuplicateReceipt, DuplicateUsernameException

logger = logging.getLogger("divvy")


_HANDLERS = {}


def handler(cls):
    def outer_wrapper(func):
        _HANDLERS[func.__name__] = [cls, func]

        @wraps
        def inner_wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return inner_wrapper
    return outer_wrapper


@handler(AssertionError)
def assert_error_handler(_, e: AssertionError):
    return JSONResponse(
        status_code=400,
        content=dict(message=str(e))
    )


@handler(NotImplementedError)
def not_implemented_error_handler(*args, **kwargs):
    return JSONResponse(
        status_code=500,
        content=dict(message="Not implemented")
    )


@handler(DuplicateUsernameException)
def duplicate_username_handler(*args, **kwargs):
    return JSONResponse(
        status_code=400,
        content=dict(message="The username is already in use.")
    )


@handler(DuplicateReceipt)
def duplicate_receipt_handler(*args, **kwargs):
    return JSONResponse(
        status_code=409,
        content=dict(
            code="DUP_RECEIPT",
            resource="receipt",
            message="The receipt is already in the system."
        )
    )


def register_exception_handlers(fastapi_app):
    for cls, func in _HANDLERS.values():
        fastapi_app.add_exception_handler(cls, func)
