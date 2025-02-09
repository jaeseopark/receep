import asyncio
import json
import logging
import os
from types import SimpleNamespace
from typing import Callable, List, Optional

import jwt

from starlette.websockets import WebSocketDisconnect
from fastapi import FastAPI, UploadFile, WebSocket, status, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi_jwt_auth import AuthJWT
from fastapi_jwt_auth.exceptions import AuthJWTException

from pydantic import BaseModel

from auth import JWT_KEY, Auth, AuthMetadata, DuplicateUsernameException, InvalidCredsException, NoInvitationFound
from db import Database
from divvy import Divvy


SIGNUP = os.getenv("SIGNUP")
assert SIGNUP in ("OPEN", "CLOSED",
                  "INVITE_ONLY"), f"SIGNUP must be one of: OPEN, CLOSED, INVITE_ONLY. {SIGNUP=}"

logger = logging.getLogger("divvy")
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())
logger.addHandler(logging.FileHandler("/var/log/divvy/api/app.log"))

uvicorn_logger = logging.getLogger("uvicorn.error")
uvicorn_logger.addHandler(logging.StreamHandler())
uvicorn_logger.addHandler(logging.FileHandler(
    "/var/log/divvy/api/uvicorn.log"))

fastapi_app = FastAPI()
sockets: List[WebSocket] = []


def get_jwt_cookie(request: Request):
    return request.cookies.get("jwt")


db = Database()
auth = Auth(db)
divvy = Divvy(db)


def get_app_info():
    return SimpleNamespace(
        signup=SIGNUP,
        totp_enabled=auth.totp_enabled,
        user_count=db.get_user_count()
    )


class Token(BaseModel):
    token_type: str
    token: str
    message: str


class SignupResponse(BaseModel):
    token_type: str
    token: str
    qrcode_b64: Optional[str] = None
    message: Optional[str] = None


class SignupRequest(BaseModel):
    username: str
    password: str


class InviteRequest(BaseModel):
    username: str


class LoginRequest(BaseModel):
    username: str
    password: str
    totp: Optional[str] = None


@AuthJWT.load_config
def get_ws_auth_config():
    class Settings(BaseModel):
        authjwt_secret_key: str = JWT_KEY

    return Settings()


def get_broadcast_function(topic: str) -> Callable[[dict], None]:
    def broadcast(payload: dict) -> None:
        async def broadcast_async():
            for socket in sockets:
                await socket.send_text(json.dumps(dict(
                    topic=topic,
                    payload=payload
                )))
        asyncio.run(broadcast_async())
    return broadcast


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

# TODO: fix auth issues
# @fastapi_app.websocket("/ws")


async def websocket_endpoint(websocket: WebSocket, token: str = Query(...), Authorize: AuthJWT = Depends()):
    await websocket.accept()
    logger.info("Socket open")

    try:
        Authorize.jwt_required("websocket", token=token)
    except AuthJWTException as err:
        logger.error(err)
        await websocket.close()
        return

    sockets.append(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        sockets.remove(websocket)
        logger.info("Socket closed")


@fastapi_app.exception_handler(AssertionError)
def unicorn_exception_handler(_, e: AssertionError):
    return JSONResponse(
        status_code=400,
        content=dict(message=str(e))
    )


@fastapi_app.exception_handler(DuplicateUsernameException)
def unicorn_exception_handler(*args, **kwargs):
    return JSONResponse(
        status_code=400,
        content=dict(message="The username is already in use.")
    )


@fastapi_app.exception_handler(NotImplementedError)
def unicorn_exception_handler(*args, **kwargs):
    return JSONResponse(
        status_code=500,
        content=dict(message="Not implemented")
    )


@fastapi_app.get("/receipts/paginated")
def get_stuff(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    _: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))
):
    receipts = db.get_receipts(offset=offset, limit=limit)
    return dict(
        next_offest=offset+len(receipts),
        items=receipts
    )


@fastapi_app.post("/receipts")
async def upload_file(file: UploadFile, metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))):
    try:
        return divvy.upload(metadata.user_id, file.content_type, file.file)
    finally:
        file.file.close()


@fastapi_app.get("/file", response_class=FileResponse)
def get_file(_: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))):
    local_path = "/data/some_file.pdf"
    return local_path


@fastapi_app.post("/login", response_model=Token)
async def login(payload: LoginRequest, _: AuthMetadata = Depends(get_auth_metadata())):
    try:
        result = auth.create_jwt(payload)
        if not result:
            return dict(
                message="TOTP required",
                token="",
                token_type=""
            )
    except InvalidCredsException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    result.update(dict(
        message="success"
    ))
    return result


@fastapi_app.post("/signup", response_model=SignupResponse)
async def signup(signup_req: SignupRequest, app_info=Depends(get_app_info)):
    if app_info.user_count == 0 or app_info.signup == "OPEN":
        return auth.signup(signup_req.username, signup_req.password)

    raise HTTPException(
        status_code=400,
        detail=f"Signup is {app_info.signup}.",
    )


@fastapi_app.post("/invite")
async def invite(payload: InviteRequest, metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True)), app_info=Depends(get_app_info)):
    if app_info.signup == "CLOSED":
        raise HTTPException(
            status_code=403,
            detail="Invite is closed.",
        )

    if app_info.signup == "INVITE_ONLY" and "admin" not in metadata.roles:
        raise HTTPException(
            status_code=403,
            detail="Only the admins can send invites.",
        )

    auth.create_user(payload.username)
    return dict(message="success")


@fastapi_app.post("/invite/accept")
async def accept_invite(payload: SignupRequest, _: AuthMetadata = Depends(get_auth_metadata())):
    app_info = get_app_info()
    if app_info.signup == "CLOSED":
        raise HTTPException(
            status_code=403,
            detail="Invite is closed",
        )

    try:
        return auth.accept_invite(payload.username, payload.password)
    except NoInvitationFound:
        raise HTTPException(
            status_code=404,
            detail="No invitation found",
        )


@fastapi_app.get("/jwt/check")
async def check_jwt(_: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))):
    return dict(message="success")


@fastapi_app.get("/app/info")
async def get_app_info_endpoint():
    return get_app_info().__dict__


@fastapi_app.get("/me")
async def get_my_info(metadata: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))):
    return dict(
        username=metadata.username,
        roles=metadata.roles
    )
