import asyncio
import json
from logging import StreamHandler, FileHandler, getLogger, INFO, ERROR
from typing import Callable, List

from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, status
from fastapi.responses import FileResponse
from fastapi_jwt_auth import AuthJWT
from fastapi_jwt_auth.exceptions import AuthJWTException
from logic import divvy
from persistence import database
from starlette.websockets import WebSocketDisconnect

from api.access import authenticator
from api.access.authenticator import AuthMetadata
from api.access.exceptions import InvalidCredsException
from api.exceptions import register_exception_handlers
from api.routers.receipts import router as receipt_router
from api.routers.transactions import router as transaction_router
from api.routers.categories import router as category_router
from api.routers.vendors import router as vendor_router
from api.routers.users import router as user_router
from api.routers.reports import router as report_router
from api.shared import LoginRequest, Token, get_app_info, get_auth_metadata
from utils.logging import set_format

logger = getLogger("divvy")
logger.setLevel(INFO)
logger.addHandler(set_format(StreamHandler()))
logger.addHandler(set_format(FileHandler("/var/log/divvy/api/app.log")))

uvicorn_logger = getLogger("uvicorn.error")
uvicorn_logger.setLevel(ERROR)
uvicorn_logger.addHandler(set_format(StreamHandler()))
uvicorn_logger.addHandler(set_format(
    FileHandler("/var/log/divvy/api/uvicorn.log")))

fastapi_app = FastAPI(redirect_slashes=False)
sockets: List[WebSocket] = []


db = database.instance
auth = authenticator.instance
app = divvy.instance

fastapi_app.include_router(transaction_router)
fastapi_app.include_router(receipt_router)
fastapi_app.include_router(vendor_router)
fastapi_app.include_router(category_router)
fastapi_app.include_router(user_router)
fastapi_app.include_router(report_router)

register_exception_handlers(fastapi_app)


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


@fastapi_app.get("/jwt/check")
async def check_jwt(_: AuthMetadata = Depends(get_auth_metadata(assert_jwt=True))):
    return dict(message="success")


@fastapi_app.get("/app/info")
async def get_app_info_endpoint():
    return get_app_info().__dict__
