from datetime import datetime
import logging
import os
import types
from functools import wraps
from typing import List, Optional

from persistence.exceptions import DuplicateReceipt, NotFound
from persistence.schema import Base, Category, LineItem, Receipt, ReceiptHashHistory, Role, Transaction, User, Vendor
from sqlalchemy import create_engine, desc, func, select, update
from sqlalchemy.exc import IntegrityError, NoResultFound
from sqlalchemy.orm import joinedload, sessionmaker

password = os.getenv("POSTGRES_PASSWORD")
logger = logging.getLogger("receep")

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


@session_decorator
def get_transaction(self, transaction_id: int) -> Optional[Transaction]:
    return self.query(Transaction) \
        .filter(Transaction.id == transaction_id) \
        .options(joinedload(Transaction.line_items)) \
        .first()


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

    # TODO more explicit args
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
            # Check hash history for duplicates
            existing_hash = session.query(ReceiptHashHistory) \
                .filter(ReceiptHashHistory.hash == content_hash) \
                .first()
            
            if existing_hash:
                # Hash exists in history, reject upload
                logger.warning(f"Duplicate receipt hash detected: {content_hash}")
                raise DuplicateReceipt
            
            receipt = Receipt(
                user_id=user_id,
                content_type=content_type,
                content_length=content_length,
                content_hash=content_hash,
                rotation=0,
                ocr_metadata={},
                merge_count=0
            )
            try:
                session.add(receipt)
                session.commit()

                receipt.id  # trigger lazy-loading of the id field.
                # initialize a blank list before the session ends.
                receipt.transactions = []
                
                # Add to hash history
                hash_history = ReceiptHashHistory(
                    hash=content_hash,
                    original_receipt_id=receipt.id,
                    uploaded_at=func.now()
                )
                session.add(hash_history)
                session.commit()
            except IntegrityError:
                # Most likely caused by the unique constraint on the hash field.
                raise DuplicateReceipt

        return receipt

    def rotate_receipt(self, receipt_id: int, user_id: int, delta: int) -> Receipt:
        with get_session() as session:
            stmt = update(Receipt) \
                .where(Receipt.id == receipt_id, Receipt.user_id == user_id) \
                .values(rotation=(Receipt.rotation + delta) % 360)
            session.execute(stmt)
            session.commit()

            return session.query(Receipt) \
                .filter_by(id=receipt_id) \
                .options(joinedload(Receipt.transactions)) \
                .first()

    def delete_receipt(self, receipt_id: int, user_id: int) -> None:
        with get_session() as session:
            r = session.query(Receipt) \
                .filter(Receipt.id == receipt_id, Receipt.user_id == user_id) \
                .options(joinedload(Receipt.transactions)) \
                .first()

            if not r:
                raise NotFound

            for transaction in r.transactions:
                session.delete(transaction)

            # Add to hash history before deleting
            hash_history_entry = session.query(ReceiptHashHistory) \
                .filter(ReceiptHashHistory.hash == r.content_hash) \
                .first()
            
            if hash_history_entry and not hash_history_entry.deleted_at:
                hash_history_entry.deleted_at = func.now()
                hash_history_entry.reason = 'deleted_by_user'

            session.delete(r)
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
                .order_by(desc(Transaction.id)) \
                .offset(offset) \
                .limit(limit)
            return session.scalars(stmt).all()

    def get_transaction(self, transaction_id: int) -> Transaction:
        with get_session() as session:
            t = session.get_transaction(transaction_id=transaction_id)
            if not t:
                raise NotFound
            return t

    def create_transaction(self, user_id: int, line_items: List[dict], timestamp=datetime, vendor_id: int = None, receipt_id: int = None) -> Transaction:
        transaction = Transaction(
            user_id=user_id,
            receipt_id=receipt_id,
            vendor_id=vendor_id,
            amount=sum([li.get("amount") for li in line_items]),
            timestamp=timestamp
        )

        with get_session() as session:
            session.add(transaction)
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

            return session.get_transaction(transaction_id=transaction.id)

    def update_transaction(self, user_id: int, transaction_id: int, line_items: List[dict], timestamp=datetime, vendor_id: int = None, receipt_id: int = None) -> Transaction:
        transaction: Transaction = None
        with get_session() as session:
            transaction = session \
                .query(Transaction) \
                .filter(Transaction.user_id == user_id, Transaction.id == transaction_id) \
                .first()

            if not transaction:
                raise NotFound

            transaction.amount = sum([li_dict.get("amount")
                                     for li_dict in line_items])
            transaction.receipt_id = receipt_id
            transaction.vendor_id = vendor_id
            transaction.timestamp = timestamp
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

            return session.get_transaction(transaction_id=transaction.id)

    def delete_transaction(self, user_id: int, transaction_id: int) -> None:
        with get_session() as session:
            transaction = session \
                .query(Transaction) \
                .filter(Transaction.user_id == user_id, Transaction.id == transaction_id) \
                .first()

            if not transaction:
                raise NotFound

            session.delete(transaction)
            session.commit()

    def get_vendors_by_user_id(self, user_id: int, offset=0, limit=100) -> List[Vendor]:
        with get_session() as session:
            return session.query(Vendor).filter(Vendor.user_id == user_id).offset(offset).limit(limit).all()

    def get_categories_by_user_id(self, user_id: int, offset=0, limit=100) -> List[Category]:
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

    def update_vendor(self, id: int, user_id: int, name: str) -> Vendor:
        with get_session() as session:
            v = session.query(Vendor) \
                .filter(Vendor.id == id, Vendor.user_id == user_id) \
                .first()

            v.name = name

            session.commit()

            return session.query(Vendor) \
                .filter(Vendor.id == id) \
                .first()

    def delete_vendor(self, id: int, user_id: int) -> None:
        with get_session() as session:
            # TODO: Implement delete vendor (need transaction association safe guard)
            raise NotImplementedError
        
            # v = session.query(Vendor) \
            #     .filter(Vendor.id == id, Vendor.user_id == user_id) \
            #     .first()

            # if not v:
            #     raise NotFound

            # session.delete(v)
            # session.commit()

    def create_category(self, user_id: int,  name: str, description: str, with_autotax) -> Category:
        c = Category(
            user_id=user_id,
            name=name,
            description=description,
            with_autotax=with_autotax
        )

        with get_session() as session:
            session.add(c)
            session.commit()
            # lazy load the auto-gen ID
            c.id
        return c

    def update_category(self, id: int, user_id: int, name: str, description: str, with_autotax) -> Category:
        with get_session() as session:
            c = session.query(Category) \
                .filter(Category.id == id, Category.user_id == user_id) \
                .first()

            c.name = name
            c.description = description
            c.with_autotax = with_autotax

            session.commit()

            return session.query(Category) \
                .filter(Category.id == id) \
                .first()

    def delete_category(self, id: int, user_id: int) -> None:
        with get_session() as session:
            c = session.query(Category) \
                .filter(Category.id == id, Category.user_id == user_id) \
                .first()

            if not c:
                raise NotFound

            session.delete(c)
            session.commit()

    def get_line_items(self, user_id: int, start: datetime, end: datetime, offset: int, limit: int) -> List[LineItem]:
        with get_session() as session:
            return session.query(LineItem) \
                .join(Transaction, LineItem.transaction_id == Transaction.id) \
                .filter(
                    Transaction.user_id == user_id,
                    Transaction.timestamp >= start,
                    Transaction.timestamp <= end) \
                .options(joinedload(LineItem.transaction)) \
                .offset(offset) \
                .limit(limit) \
                .all()


    def update_receipt_after_merge(self, receipt_id: int, user_id: int, new_hash: str, new_size: int) -> Receipt:
        """
        Update receipt metadata after merging with another receipt.
        
        Args:
            receipt_id: ID of the receipt being updated
            user_id: User ID for authorization
            new_hash: New hash of the merged PDF
            new_size: New file size of the merged PDF
            
        Returns:
            Updated Receipt object
        """
        with get_session() as session:
            receipt = session.query(Receipt) \
                .filter(Receipt.id == receipt_id, Receipt.user_id == user_id) \
                .first()
            
            if not receipt:
                raise NotFound
            
            # Update receipt metadata
            old_hash = receipt.content_hash
            receipt.content_hash = new_hash
            receipt.content_length = new_size
            receipt.merge_count += 1
            receipt.content_type = 'application/pdf'  # Merged receipts are always PDFs
            
            # Update hash history for old hash
            old_hash_entry = session.query(ReceiptHashHistory) \
                .filter(ReceiptHashHistory.hash == old_hash) \
                .first()
            
            if old_hash_entry:
                old_hash_entry.deleted_at = func.now()
                old_hash_entry.reason = 'merged'
            
            # Add new hash to history
            new_hash_entry = ReceiptHashHistory(
                hash=new_hash,
                original_receipt_id=receipt_id,
                uploaded_at=func.now()
            )
            session.add(new_hash_entry)
            
            session.commit()
            
            return session.query(Receipt) \
                .filter(Receipt.id == receipt_id) \
                .options(joinedload(Receipt.transactions)) \
                .first()
    
    def get_receipt_by_id(self, receipt_id: int, user_id: int) -> Optional[Receipt]:
        """
        Get a receipt by ID.
        
        Args:
            receipt_id: ID of the receipt
            user_id: User ID for authorization
            
        Returns:
            Receipt object or None
        """
        with get_session() as session:
            return session.query(Receipt) \
                .filter(Receipt.id == receipt_id, Receipt.user_id == user_id) \
                .options(joinedload(Receipt.transactions)) \
                .first()
    
    def mark_receipt_as_merged(self, source_receipt_id: int, user_id: int) -> None:
        """
        Mark a source receipt as merged and update hash history.
        
        Args:
            source_receipt_id: ID of the source receipt being merged
            user_id: User ID for authorization
        """
        with get_session() as session:
            receipt = session.query(Receipt) \
                .filter(Receipt.id == source_receipt_id, Receipt.user_id == user_id) \
                .first()
            
            if not receipt:
                raise NotFound
            
            # Update hash history
            hash_entry = session.query(ReceiptHashHistory) \
                .filter(ReceiptHashHistory.hash == receipt.content_hash) \
                .first()
            
            if hash_entry:
                hash_entry.deleted_at = func.now()
                hash_entry.reason = 'merged'
            
            session.commit()


instance = Database()
