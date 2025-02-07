import os
import time
from typing import Union

from sqlalchemy import create_engine, Column, Integer, String, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import NoResultFound, OperationalError

password = os.getenv("POSTGRES_PASSWORD")

Base = declarative_base()

engine = create_engine(f"postgresql://postgres:{password}@db/postgres")
Session = sessionmaker(bind=engine)


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, nullable=False, unique=True)
    hashed_password = Column(String)
    totp_private_key = Column(String)


def wait_for_postgres():
    remaining_attempts = 5
    while remaining_attempts > 0:
        try:
            Base.metadata.create_all(engine)
            print("Postgres is up!")
            return
        except OperationalError:
            print("Postgres is not ready, retrying...")
            remaining_attempts -= 1
            time.sleep(5)

    raise Exception("Postgres not ready after several attempts.")


wait_for_postgres()


class Database:
    def create_user(self, username: str) -> None:
        user = User(username=username)
        with Session() as session:
            session.add(user)
            session.commit()

    def get_user_by_username(self, username) -> Union[User, None]:
        with Session() as session:
            try:
                return session.query(User).filter(User.username == username).one()
            except NoResultFound:
                return None

    def update_user(self, user: User) -> None:
        with Session() as session:
            existing_user = session.query(User).filter(
                User.username == user.username).one()
            existing_user.hashed_password = user.hashed_password
            existing_user.totp_private_key = user.totp_private_key
            session.commit()

    def get_user_count(self) -> int:
        with Session() as session:
            return session.query(func.count(User.id)).scalar()
