
from functools import wraps

from fastapi.responses import JSONResponse
from persistence.exceptions import DuplicateReceipt, DuplicateUsernameException

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
def unicorn_exception_handler(_, e: AssertionError):
    return JSONResponse(
        status_code=400,
        content=dict(message=str(e))
    )


@handler(NotImplementedError)
def unicorn_exception_handler(*args, **kwargs):
    return JSONResponse(
        status_code=500,
        content=dict(message="Not implemented")
    )


@handler(DuplicateUsernameException)
def unicorn_exception_handler(*args, **kwargs):
    return JSONResponse(
        status_code=400,
        content=dict(message="The username is already in use.")
    )


@handler(DuplicateReceipt)
def unicorn_exception_handler(*args, **kwargs):
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
