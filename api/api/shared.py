import logging
import os
from types import SimpleNamespace
from typing import Callable, List, Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi_jwt_auth import AuthJWT
from persistence.database import instance as db_instance
from pydantic import BaseModel

from api.access import authenticator
from api.access.authenticator import JWT_KEY, AuthMetadata

logger = logging.getLogger("receep")
auth = authenticator.instance


SIGNUP = os.getenv("SIGNUP")
assert SIGNUP in ("OPEN", "CLOSED",
                  "INVITE_ONLY"), f"SIGNUP must be one of: OPEN, CLOSED, INVITE_ONLY. {SIGNUP=}"


def get_app_info():
    return SimpleNamespace(
        signup=SIGNUP,
        totp_enabled=auth.totp_enabled,
        user_count=db_instance.get_user_count()
    )


def get_jwt_cookie(request: Request):
    return request.cookies.get("jwt")


def get_auth_metadata(*, assert_roles: List[str] = None, assert_jwt: bool = False) -> Callable[[], AuthMetadata]:
    def wrapper(token: str = Depends(get_jwt_cookie)) -> AuthMetadata:
        metadata = AuthMetadata()
        if token:
            try:
                metadata = auth.get_auth_metadata(token)
            except jwt.PyJWTError:
                pass

        if assert_jwt and not metadata.authenticated:
            raise HTTPException(401)

        if assert_roles:
            intersection = list(set(assert_roles) & set(metadata.roles))

            if not intersection:
                msg = f"User does not have the right role(s). expected={assert_roles} actual={metadata.roles}"
                raise HTTPException(403, detail=msg)

        return metadata
    return wrapper


@AuthJWT.load_config
def get_ws_auth_config():
    """
    For websocket
    """
    class Settings(BaseModel):
        authjwt_secret_key: str = JWT_KEY

    return Settings()


class Token(BaseModel):
    token_type: str
    token: str
    message: str


class LoginRequest(BaseModel):
    username: str
    password: str
    totp: Optional[str] = None
