import logging
import os
import types
from functools import wraps
from typing import List, Optional

from persistence.exceptions import DuplicateReceipt, NotFound
from persistence.schema import Base, Category, LineItem, Receipt, Role, Transaction, User, Vendor
from sqlalchemy import create_engine, desc, func, select, update
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


@session_decorator
def get_user_by_id(self, user_id: int) -> Optional[User]:
    return self.query(User).options(joinedload(User.roles)).filter(User.id == user_id).first()


def get_session():
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
        user = User(username=username, config=dict())
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
            user = session.get_user_by_username(username)
            if not user:
                logger.info(f"User not found {username=}")
                return None
            return user

    def update_user_config(self, user_id: int, config: dict):
        with get_session() as session:
            user = session.get_user_by_id(user_id)
            if not user:
                raise NotFound
            user.config = config
            session.commit()

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
                content_hash=content_hash,
                rotation=0,
                ocr_metadata={}
            )
            try:
                session.add(receipt)
                session.commit()

                receipt.id  # trigger lazy-loading of the id field.
                # initialize a blank list before the session ends.
                receipt.transactions = []
            except IntegrityError:
                # Most likely caused by the unique constraint on the hash field.
                # TODO: make sure this is indeed the cause of IntegrityError.
                raise DuplicateReceipt

        return receipt

    def rotate_receipt(self, receipt_id: int, delta: int) -> Receipt:
        with get_session() as session:
            stmt = update(Receipt) \
                .where(Receipt.id == receipt_id) \
                .values(rotation=(Receipt.rotation + delta) % 360)
            session.execute(stmt)
            session.commit()

            return session.query(Receipt).filter_by(id=receipt_id).options(joinedload(Receipt.transactions)).first()

    def delete_receipt(self, user_id: int, receipt_id: str):
        with get_session() as session:
            # TODO: need to detach from associated transactions first?
            receipt = session.query(Receipt).filter(
                Receipt.id == receipt_id).first()
            if not receipt:
                msg = f"Receipt cannot be deleted because it does not exist. {receipt_id=}"
                logger.warning(msg)

            # TODO: allow admins?
            assert user_id == receipt.user_id, "Only the original uploader can delete the receipt."

            session.delete(receipt)
            session.commit()

    def get_receipts(self, offset=0, limit=100) -> List[Receipt]:
        # In descending order of id -- i.e. latest first.
        with get_session() as session:
            receipts = session.query(Receipt) \
                .options(joinedload(Receipt.transactions)) \
                .order_by(desc(Receipt.id)) \
                .offset(offset) \
                .limit(limit) \
                .all()
            return receipts

    def get_transactions(self, user_id: int, offset=0, limit=100) -> List[Transaction]:
        with get_session() as session:
            stmt = select(Transaction) \
                .where(Transaction.user_id == user_id) \
                .offset(offset) \
                .limit(limit)
            return session.scalars(stmt).all()
    
    def get_transaction(self, id: int, user_id: str) -> Transaction:
        with get_session() as session:
            stmt = select(Transaction) \
                .where(Transaction.user_id == user_id, Transaction.id == id) \
                .options(joinedload(Transaction.line_items))
            return session.scalars(stmt).first()

    def create_transaction(self, user_id: int, line_items: List[dict], vendor_id: int = None, receipt_id: int = None) -> Transaction:
        transaction = Transaction(
            user_id=user_id,
            receipt_id=receipt_id,
            vendor_id=vendor_id
        )

        logger.info(f"type of line items: {type(line_items[0])}")

        with get_session() as session:
            session.add(transaction)
            transaction = session.query(Transaction).order_by(
                desc(Transaction.id)).limit(1).first()

            transaction.line_items = [
                LineItem(
                    name=li_dict.get("name"),
                    transaction_id=transaction.id,
                    amount_input=li_dict.get("amount_input"),
                    amount=li_dict.get("amount"),
                    notes=li_dict.get("notes"),
                    category_id=li_dict.get("category_id")
                ) for li_dict in line_items
            ]
            session.commit()

        return transaction

    def update_transaction(self, user_id: int, transaction: Transaction) -> Transaction:
        raise NotImplementedError

    def get_vendors_by_user_id(self, user_id: int, offset=0, limit=100) -> List[Receipt]:
        with get_session() as session:
            return session.query(Vendor).filter(Vendor.user_id == user_id).offset(offset).limit(limit).all()

    def get_categories_by_user_id(self, user_id: int, offset=0, limit=100) -> List[Receipt]:
        with get_session() as session:
            return session.query(Category).filter(Category.user_id == user_id).offset(offset).limit(limit).all()

    def create_vendor(self, user_id: int, name: str) -> Vendor:
        v = Vendor(
            user_id=user_id,
            name=name
        )

        with get_session() as session:
            session.add(v)
            session.commit()
            v = session.query(Vendor).filter(
                Vendor.user_id == user_id, Vendor.name == name).first()

        return v

    def create_category(self, user_id: int, code: str, name: str, description: str) -> Category:
        c = Category(
            user_id=user_id,
            code=code,
            name=name,
            description=description
        )

        with get_session() as session:
            session.add(c)
            session.commit()
            c = session.query(Category).filter(
                Category.user_id == user_id, Category.code == code).first()
        return c


instance = Database()
