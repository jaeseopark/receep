from sqlalchemy import (Column, DateTime, ForeignKey, Integer, String, Table,
                        Text, UniqueConstraint, func)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


user_roles = Table(
    'user_roles',
    Base.metadata,
    Column("user_id", Integer, ForeignKey(
        'users.id', ondelete='CASCADE'), primary_key=True),
    Column("role_id", Integer, ForeignKey(
        'roles.id', ondelete='CASCADE'), primary_key=True)
)


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(32), nullable=False, unique=True)
    hashed_password = Column(String(255))
    totp_private_key = Column(String(64))
    config = Column(JSONB, nullable=False)

    # Many-to-many relationship with Role
    roles = relationship('Role', secondary='user_roles')


class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(32), nullable=False, unique=True)


class Receipt(Base):
    __tablename__ = 'receipts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=func.now())
    content_type = Column(String(32), nullable=False)
    content_length = Column(Integer, nullable=False)
    content_hash = Column(String(64), nullable=False, unique=True)
    rotation = Column(Integer, nullable=False)
    ocr_metadata = Column(JSONB, nullable=False)

    transactions = relationship("Transaction", back_populates="receipt")


class Transaction(Base):
    __tablename__ = 'transactions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=func.now())
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    vendor = Column(String(32))
    notes = Column(Text)
    receipt_id = Column(Integer, ForeignKey('receipts.id'))

    receipt = relationship("Receipt", back_populates="transactions")
    line_items = relationship("LineItem")


class Category(Base):
    __tablename__ = 'categories'

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(32), nullable=False)
    name = Column(String(64), nullable=False)
    description = Column(Text, nullable=True)

    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_user_category_name'),
        UniqueConstraint('user_id', 'code', name='code'),
    )


class LineItem(Base):
    __tablename__ = 'line_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    transaction_id = Column(Integer, ForeignKey(
        'transactions.id'), nullable=False)
    amount = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey(
        'categories.id'), nullable=False)
    biz_portion_input = Column(String(128), nullable=False)
    biz_portion = Column(Integer, nullable=False)
