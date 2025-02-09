
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.access.authenticator import AuthMetadata
from api.access.authenticator import instance as auth_instance
from api.access.exceptions import NoInvitationFound
from api.shared import get_app_info, get_auth_metadata

router = APIRouter()
auth = auth_instance


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


@router.post("/signup", response_model=SignupResponse)
async def signup(signup_req: SignupRequest, app_info=Depends(get_app_info)):
    if app_info.user_count == 0 or app_info.signup == "OPEN":
        return auth.signup(signup_req.username, signup_req.password)

    raise HTTPException(
        status_code=400,
        detail=f"Signup is {app_info.signup}.",
    )


@router.post("/invite")
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


@router.post("/invite/accept")
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
