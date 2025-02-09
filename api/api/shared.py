import logging
from typing import Callable, List

import jwt
from fastapi import Depends, HTTPException, Request

from api.access import authenticator
from api.access.authenticator import AuthMetadata

logger = logging.getLogger("divvy")
auth = authenticator.instance




import logging
from typing import Callable, List

from fastapi import Depends, HTTPException
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel

from api.access import authenticator
from api.access.authenticator import JWT_KEY


def get_jwt_cookie(request: Request):
    return request.cookies.get("jwt")


def get_auth_metadata(*, assert_roles: List[str] = None, assert_jwt: bool = False) -> Callable[[], AuthMetadata]:
    logger.info("returning a wrapper function to get auth metadata")

    def wrapper(token: str = Depends(get_jwt_cookie)) -> AuthMetadata:
        logger.info("executing wrapper...")

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
