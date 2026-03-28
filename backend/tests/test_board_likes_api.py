from __future__ import annotations

import os
from collections.abc import Generator
from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# ---------------------------------
# import 시점 env 안전장치
# ---------------------------------
os.environ.setdefault("MYSQL_HOST", "localhost")
os.environ.setdefault("MYSQL_PORT", "3306")
os.environ.setdefault("MYSQL_USER", "test_user")
os.environ.setdefault("MYSQL_PASSWORD", "test_password")
os.environ.setdefault("MYSQL_DATABASE", "test_db")
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_testing_only")
os.environ.setdefault("ALGORITHM", "HS256")

from app.board.dependencies import get_current_user
from app.board.models import Board, Like
from app.core.database import Base, get_db
from app.main import app
from app.users.models import User


SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@asynccontextmanager
async def no_lifespan(_: object):
    yield


@pytest.fixture(autouse=True)
def setup_database() -> Generator[None, None, None]:
    original_lifespan = app.router.lifespan_context
    app.router.lifespan_context = no_lifespan

    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db

    yield

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    app.router.lifespan_context = original_lifespan


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_user(
    db: Session,
    *,
    email: str,
    nickname: str,
    name: str,
    pw: str = "hashed_test_password",
) -> User:
    user = User(
        email=email,
        pw=pw,
        name=name,
        nickname=nickname,
        birth_date=None,
        weekly_target=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_board(
    db: Session,
    *,
    user: User,
    title: str,
    content: str,
    imgpath: str | None = None,
    likes: int = 0,
) -> Board:
    board = Board(
        title=title,
        content=content,
        imgpath=imgpath,
        likes=likes,
        writer_id=user.id,
    )
    db.add(board)
    db.commit()
    db.refresh(board)
    return board


@pytest.fixture
def user(db_session: Session) -> User:
    return create_user(
        db_session,
        email="user1@example.com",
        nickname="user1",
        name="User One",
    )


@pytest.fixture
def other_user(db_session: Session) -> User:
    return create_user(
        db_session,
        email="user2@example.com",
        nickname="user2",
        name="User Two",
    )


@pytest.fixture
def auth_override(user: User) -> Generator[None, None, None]:
    app.dependency_overrides[get_current_user] = lambda: user
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def other_auth_override(other_user: User) -> Generator[None, None, None]:
    app.dependency_overrides[get_current_user] = lambda: other_user
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_toggle_like_add_success(
    client: TestClient,
    db_session: Session,
    user: User,
    other_user: User,
    auth_override: None,
) -> None:
    board = create_board(
        db_session,
        user=other_user,
        title="좋아요 대상 게시글",
        content="내용",
    )

    response = client.post(f"/api/v1/board/{board.board_no}/likes")

    assert response.status_code == 200
    data = response.json()

    assert data["board_no"] == board.board_no
    assert data["liked"] is True
    assert data["likes"] == 1

    db_session.expire_all()
    refreshed_board = db_session.get(Board, board.board_no)
    assert refreshed_board is not None
    assert refreshed_board.likes == 1

    like = (
        db_session.query(Like)
        .filter(
            Like.writer_id == user.id,
            Like.board_no == board.board_no,
        )
        .first()
    )
    assert like is not None


def test_toggle_like_remove_success(
    client: TestClient,
    db_session: Session,
    user: User,
    other_user: User,
    auth_override: None,
) -> None:
    board = create_board(
        db_session,
        user=other_user,
        title="좋아요 취소 대상 게시글",
        content="내용",
    )

    first_response = client.post(f"/api/v1/board/{board.board_no}/likes")
    assert first_response.status_code == 200
    assert first_response.json()["liked"] is True
    assert first_response.json()["likes"] == 1

    second_response = client.post(f"/api/v1/board/{board.board_no}/likes")
    assert second_response.status_code == 200

    data = second_response.json()
    assert data["board_no"] == board.board_no
    assert data["liked"] is False
    assert data["likes"] == 0

    db_session.expire_all()
    refreshed_board = db_session.get(Board, board.board_no)
    assert refreshed_board is not None
    assert refreshed_board.likes == 0

    like = (
        db_session.query(Like)
        .filter(
            Like.writer_id == user.id,
            Like.board_no == board.board_no,
        )
        .first()
    )
    assert like is None


def test_toggle_like_not_found(
    client: TestClient,
    auth_override: None,
) -> None:
    response = client.post("/api/v1/board/9999/likes")

    assert response.status_code == 404
    assert response.json()["detail"] == "게시글을 찾을 수 없습니다."


def test_toggle_like_requires_login(
    client: TestClient,
    db_session: Session,
    user: User,
) -> None:
    board = create_board(
        db_session,
        user=user,
        title="비로그인 좋아요 시도",
        content="내용",
    )

    response = client.post(f"/api/v1/board/{board.board_no}/likes")

    assert response.status_code in (401, 403)


def test_toggle_like_by_other_user_success(
    client: TestClient,
    db_session: Session,
    user: User,
    other_user: User,
    other_auth_override: None,
) -> None:
    board = create_board(
        db_session,
        user=user,
        title="다른 사용자의 좋아요",
        content="내용",
    )

    response = client.post(f"/api/v1/board/{board.board_no}/likes")

    assert response.status_code == 200
    data = response.json()

    assert data["board_no"] == board.board_no
    assert data["liked"] is True
    assert data["likes"] == 1

    db_session.expire_all()
    refreshed_board = db_session.get(Board, board.board_no)
    assert refreshed_board is not None
    assert refreshed_board.likes == 1

    like = (
        db_session.query(Like)
        .filter(
            Like.writer_id == other_user.id,
            Like.board_no == board.board_no,
        )
        .first()
    )
    assert like is not None
