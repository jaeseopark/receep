from functools import wraps
import logging
import os
import types
from typing import List, Optional

from sqlalchemy import create_engine, Column, Integer, String, func, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, joinedload
from sqlalchemy.exc import NoResultFound, IntegrityError


password = os.getenv("POSTGRES_PASSWORD")
logger = logging.getLogger("divvy")

SESSION_DECORATORS = dict()

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, nullable=False, unique=True)
    hashed_password = Column(String)
    totp_private_key = Column(String)

    # Many-to-many relationship with Role
    roles = relationship('Role', secondary='user_roles',
                         back_populates='users')


class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)

    # The many-to-many relationship is through this table
    users = relationship('User', secondary='user_roles',
                         back_populates='roles')


class UserRoles(Base):
    __tablename__ = 'user_roles'

    user_id = Column(Integer, ForeignKey(
        'users.id', ondelete='CASCADE'), primary_key=True)
    role_id = Column(Integer, ForeignKey(
        'roles.id', ondelete='CASCADE'), primary_key=True)


# Note the following commands should be placed after the class definitions
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

    def get_user_roles(self, username: str) -> List[str]:
        with get_session() as session:
            user = session.get_user_by_username(username)
            role_names = [r.name for r in user.roles]
            logger.info(f"{user.roles=} {role_names=}")
            return role_names
