import asyncio
import json
import logging
import os
from types import SimpleNamespace
from typing import Callable, List

import jwt

from starlette.websockets import WebSocketDisconnect
from fastapi import FastAPI, UploadFile, WebSocket, status, Depends, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi_jwt_auth import AuthJWT
from fastapi_jwt_auth.exceptions import AuthJWTException

from pydantic import BaseModel

from auth import JWT_KEY, AuthModule, InvalidCredsException
from db import Database

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
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
sockets: List[WebSocket] = []

db = Database()
auth = AuthModule(db)


def get_app_info():
    return SimpleNamespace(
        signup=SIGNUP,
        totp_enabled=auth.totp_enabled,
        user_count=db.get_user_count()
    )


class Token(BaseModel):
    token: str
    token_type: str
    message: str


class SignupResponse(BaseModel):
    token: str
    token_type: str
    message: str
    qrcode_b64: str


class SignupRequest(BaseModel):
    username: str
    password: str


class InviteRequest(BaseModel):
    username: str


class LoginRequest(BaseModel):
    username: str
    password: str
    totp: str


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


def _verify_jwt_token(token: str):
    try:
        payload = auth.decode_jwt(token)
        if "sub" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid JWT token")


def verify_jwt_token(token: str = Depends(oauth2_scheme)):
    return _verify_jwt_token(token)


def verify_signup_auth():
    app_info = get_app_info()
    if app_info.user_count == 0:
        logger.info("Allowing signup of the first user")
        return dict()
    if app_info.signup == "OPEN":
        logger.info("Allowing open signup")
        return dict()

    logger.info("Regular signup auth")
    return _verify_jwt_token()

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


@fastapi_app.exception_handler(NotImplementedError)
def unicorn_exception_handler(*args, **kwargs):
    return JSONResponse(
        status_code=500,
        content=dict(message="Not implemented")
    )


@fastapi_app.get("/stuff")
def get_stuff(_: dict = Depends(verify_jwt_token)):
    return dict(stuff=[
        1, 2, 3
    ])


@fastapi_app.get("/file", response_class=FileResponse)
def get_file(_: dict = Depends(verify_jwt_token)):
    local_path = "/data/some_file.pdf"
    return local_path


@fastapi_app.post("/file")
def upload_file(file: UploadFile, _: dict = Depends(verify_jwt_token)):
    local_path = "/data/some_file"
    try:
        contents = file.file.read()
        with open(local_path, 'wb+') as f:
            f.write(contents)
    except Exception as e:
        print(e)
    finally:
        file.file.close()

    return dict(path=local_path)


@fastapi_app.post("/login", response_model=Token)
async def login(payload: LoginRequest):
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
async def signup(payload: SignupRequest, _: dict = Depends(verify_signup_auth)):
    app_info = get_app_info()
    if app_info.signup == "CLOSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signup is closed",
        )

    return auth.signup(payload.username, payload.password)


@fastapi_app.post("/invite")
async def invite(payload: InviteRequest, _: dict = Depends(verify_jwt_token)):
    app_info = get_app_info()
    if app_info.signup == "CLOSED":
        raise HTTPException(
            status_code=403,
            detail="Invite is closed",
        )

    auth.create_user(payload.username)
    # TODO eror handling -- unique username?
    
    return dict(message="success")


@fastapi_app.get("/jwt/check")
def check_jwt(_: dict = Depends(verify_jwt_token)):
    return dict(message="success")


@fastapi_app.get("/app/info")
def get_app_info_endpoint():
    return get_app_info().__dict__
