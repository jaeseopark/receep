# built in deps
import base64
import logging
import os
from types import SimpleNamespace
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Union
from io import BytesIO

# 3rd party deps
import jwt
import pyotp
import bcrypt
import qrcode

# Local deps
from db import Database, User

# JWT_KEY resets after a service restart, which is fine. Users with active JWT's just need to re-login.
JWT_KEY = str(uuid.uuid4())
JWT_ALG = "HS256"

logger = logging.getLogger("divvy")


class AuthMetadata:
    authenticated: bool = False
    user_id: Optional[int]
    username: Optional[str]
    roles: List[str] = []


def _create_jwt_token(username, expiration_delta: timedelta) -> dict:
    expiration = datetime.now() + expiration_delta
    payload = {
        "sub": username,
        "exp": expiration,
        "type": "bearer"
    }
    return dict(
        token=jwt.encode(payload, JWT_KEY, algorithm=JWT_ALG),
        token_type="bearer",
    )


def _verify_totp(key: str, token: str):
    totp = pyotp.TOTP(key)
    if totp.verify(token):
        return True
    return False


class InvalidCredsException(Exception):
    pass


class NoInvitationFound(Exception):
    pass


class DuplicateUsernameException(Exception):
    pass


class Auth:
    def __init__(self, db: Database):
        self.db = db

    @property
    def totp_enabled(self) -> bool:
        return os.getenv("TOTP_ENABLED", "0") == "1"

    def create_jwt(self, payload: SimpleNamespace, expiration_delta=timedelta(days=7)) -> Union[dict, None]:
        """
        Validates user credentials and returns a dictionary containing 'token' and 'token_type'
        If the username/password combination is correct but TOTP is not provided, returns None.
        Raises InvalidCredsException if username is not found or if the password is wrong.
        """
        user: User = self.db.get_user_by_username(payload.username)
        if not user:
            raise InvalidCredsException

        if not bcrypt.checkpw(payload.password.encode("utf-8"), user.hashed_password.encode("utf-8")):
            raise InvalidCredsException

        if self.totp_enabled:
            if not payload.totp:
                return None

            key = user.totp_private_key
            if not _verify_totp(key, payload.totp):
                raise InvalidCredsException

        return _create_jwt_token(payload.username, expiration_delta)

    def create_user(self, username: str) -> None:
        create_success = self.db.create_user(username)
        if not create_success:
            raise DuplicateUsernameException

    def setup_password(self, username: str, password: str):
        user = self.db.get_user_by_username(username)
        if not user:
            # TODO do something
            return

        user.hashed_password = bcrypt.hashpw(
            password.encode('utf-8'), bcrypt.gensalt()).decode("utf-8")

        if not self.totp_enabled or user.totp_private_key:
            logger.info(f"The password has been saved; Skipping TOTP...")
            self.db.update_user_creds(user)
            return dict(result="success")

        totp = pyotp.TOTP(pyotp.random_base32())
        user.totp_private_key = totp.secret
        self.db.update_user_creds(user)

        uri = totp.provisioning_uri(username, issuer_name="divvy")

        # Create the QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(uri)
        qr.make(fit=True)

        # Generate the image of the QR code
        img = qr.make_image(fill='black', back_color='white')
        buffered = BytesIO()
        img.save(buffered, format="PNG")  # Save the image as PNG in the buffer
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return dict(
            message=f"If you want to register TOTP manually, the key is: {totp.secret}",
            qrcode_b64=img_base64
        )

    def signup(self, username: str, password: str):
        """
        Creates a new user in the database, generates a 2FA key, and returns a QR code 
        for the user to scan into their authenticator app. Also returns a JWT token for authentication.

        Args:
            username (str): The username of the new user.
            password (str): The password for the new user.

        Returns:
            dict: A dictionary containing:
                - "qrcode_b64" (str): Base64-encoded QR code image for 2FA setup.
                - "token" (str): JWT token for authentication.
                - "message"
                - "token_type"
        """
        self.create_user(username)
        result = self.setup_password(username, password)
        result.update(_create_jwt_token(username, timedelta(days=7)))

        return result

    def accept_invite(self, username: str, password: str):
        """
        This method has the same return type signature as .signup()
        """
        user = self.db.get_user_by_username(username)
        if not user or user.hashed_password or user.totp_private_key:
            raise NoInvitationFound

        result = self.setup_password(username, password)
        result.update(_create_jwt_token(username, timedelta(days=7)))

        return result

    def get_auth_metadata(self, token: Optional[str]):
        metadata = AuthMetadata()
        
        metadata.username = jwt.decode(token, JWT_KEY, algorithms=[JWT_ALG]).get("sub")
        metadata.authenticated = True
        user = self.db.get_user_by_username(metadata.username)
        metadata.user_id = user.id
        metadata.roles = [r.name for r in user.roles]
        
        return metadata
