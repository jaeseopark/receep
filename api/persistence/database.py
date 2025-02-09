import logging
import os
import types
from functools import wraps
from typing import List, Optional

from persistence.exceptions import DuplicateReceipt
from persistence.schema import Base, Receipt, Role, Transaction, User
from sqlalchemy import create_engine, desc, func, select
from sqlalchemy.exc import IntegrityError, NoResultFound
from sqlalchemy.orm import joinedload, sessionmaker

password = os.getenv("POSTGRES_PASSWORD")
logger = logging.getLogger("divvy")

SESSION_DECORATORS = dict()

# Note the following commands should be placed after the ORM class definitions
engine = create_engine(f"postgresql://postgres:{password}@db/postgres")
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)


def session_decorator(func):
    SESSION_DECORATORS[func.__name__] = func

    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    return wrapper


@session_decorator
def get_role_by_name(self, role_name: str, should_create_if_missing=True) -> Optional[Role]:
    role = self.query(Role).filter(func.lower(Role.name)
                                   == func.lower(role_name)).first()
    if not role:
        if should_create_if_missing:
            logger.info(
                f"creating the role because it does not exist. {role_name=}")
            role = Role(name=role_name)
            self.add(role)
    return role


@session_decorator
def get_user_count(self):
    return self.query(func.count(User.id)).scalar()


@session_decorator
def get_user_by_username(self, username: str):
    return self.query(User).options(joinedload(User.roles)).filter(User.username == username).first()


def get_session():
    logger.info("Initializing custom session...")
    session = Session()

    for func_name, func in SESSION_DECORATORS.items():
        bind = types.MethodType(func, session)
        setattr(session, func_name, bind)

    return session


class Database:
    def create_user(self, username: str) -> bool:
        """
        Returns a boolean indicating whether the user creation was successful
        """
        user = User(username=username)
        with get_session() as session:
            # First user in the db is always the admin.
            should_be_admin = session.get_user_count() == 0

            user.roles = [session.get_role_by_name(
                "admin" if should_be_admin
                else "basic"
            )]
            try:
                session.add(user)
            except IntegrityError:
                session.rollback()
                return False
            session.commit()
            return True

    def get_user_by_username(self, username) -> Optional[User]:
        with get_session() as session:
            try:
                return session.get_user_by_username(username)
            except NoResultFound:
                logger.info(f"User not found {username=}")
                return None

    def update_user_creds(self, user: User) -> None:
        with get_session() as session:
            try:
                existing_user = session.get_user_by_username(user.username)
            except NoResultFound:
                logger.info(f"User not found {user.username=}")
                raise
            existing_user.hashed_password = user.hashed_password
            existing_user.totp_private_key = user.totp_private_key
            session.commit()

    def update_user_roles(self, username: str, role_names: List[str]) -> None:
        role_names = role_names or []
        with get_session() as session:
            user = session.get_user_by_username(username)
            user.roles = []
            if len(role_names) == 1:
                for role_name in role_names:
                    role = session.get_role_by_name(role_name)
                    user.roles.append(role)
            else:
                user.roles = []
            session.commit()

    def get_user_count(self) -> int:
        with get_session() as session:
            return session.get_user_count()

    def create_receipt(self, user_id: int, content_type: str, content_length: int, content_hash: str) -> Receipt:
        with get_session() as session:
            receipt = Receipt(
                user_id=user_id,
                content_type=content_type,
                content_length=content_length,
                content_hash=content_hash
            )
            try:
                session.add(receipt)
                session.commit()

                receipt.id  # trigger lazy-loading of the id field.
            except IntegrityError:
                # Most likely caused by the unique constraint on the hash field.
                # TODO: make sure this is indeed the cause of IntegrityError.
                raise DuplicateReceipt

        return receipt

    def delete_receipt(self, receipt_id: str):
        with get_session() as session:
            receipt = session.get(Receipt, receipt_id)
            if not receipt:
                msg = f"Receipt cannot be deleted because it does not exist. {receipt_id=}"
                logger.warning(msg)

            session.delete(receipt)
            session.commit()

    def get_receipts(self, offset=0, limit=100) -> List[Receipt]:
        # In descending order of id -- i.e. latest first.
        with get_session() as session:
            return session.query(Receipt).order_by(desc(Receipt.id)).offset(offset).limit(limit).all()

    def get_transactions(self, user_id: int, offset=0, limit=100) -> List[Transaction]:
        with get_session() as session:
            stmt = select(Transaction).where(
                Transaction.user_id == user_id).offset(offset).limit(limit)
            return session.scalars(stmt).all()


instance = Database()
