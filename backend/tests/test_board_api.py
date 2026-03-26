from __future__ import annotations

import os
from collections.abc import Generator
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path

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
from app.board.models import Board
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
def setup_database(mock_env_vars: None) -> Generator[None, None, None]:
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
    birth_date: date | None = None,
    weekly_target: int | None = None,
) -> User:
    user = User(
        email=email,
        pw=pw,
        name=name,
        nickname=nickname,
        birth_date=birth_date,
        weekly_target=weekly_target,
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


@pytest.fixture
def upload_dir(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Path:
    board_dir = tmp_path / "static" / "board"
    board_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr("app.board.service.BOARD_UPLOAD_DIR", board_dir)
    return board_dir


# ---------------------------
# Create Tests
# ---------------------------


def test_create_board_success(
    client: TestClient,
    auth_override: None,
) -> None:
    response = client.post(
        "/api/v1/board/",
        data={
            "title": "첫 게시글",
            "content": "내용입니다.",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "첫 게시글"
    assert data["content"] == "내용입니다."
    assert data["writer"] == "user1"
    assert data["imgpath"] is None
    assert data["likes"] == 0
    assert "board_no" in data
    assert "upload_date" in data


def test_create_board_with_image_success(
    client: TestClient,
    auth_override: None,
    upload_dir: Path,
) -> None:
    response = client.post(
        "/api/v1/board/",
        data={
            "title": "이미지 게시글",
            "content": "이미지 포함",
        },
        files={
            "image": ("test.png", b"fake-image-bytes", "image/png"),
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "이미지 게시글"
    assert data["imgpath"] is not None
    assert data["imgpath"].startswith("/static/board/")

    saved_name = Path(data["imgpath"]).name
    saved_file = upload_dir / saved_name
    assert saved_file.exists()


def test_create_board_invalid_extension(
    client: TestClient,
    auth_override: None,
) -> None:
    response = client.post(
        "/api/v1/board/",
        data={
            "title": "잘못된 파일",
            "content": "실패해야 함",
        },
        files={
            "image": ("bad.txt", b"not-image", "text/plain"),
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "지원하지 않는 이미지 형식입니다."


def test_create_board_invalid_content_type(
    client: TestClient,
    auth_override: None,
) -> None:
    response = client.post(
        "/api/v1/board/",
        data={
            "title": "잘못된 content type",
            "content": "실패해야 함",
        },
        files={
            "image": ("bad.png", b"not-image", "text/plain"),
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "이미지 파일만 업로드 가능합니다."


def test_create_board_requires_login(client: TestClient) -> None:
    response = client.post(
        "/api/v1/board/",
        data={
            "title": "비로그인",
            "content": "실패",
        },
    )

    assert response.status_code in (401, 403)


# ---------------------------
# List Tests
# ---------------------------


def test_list_boards_success_latest_first(
    client: TestClient,
    db_session: Session,
    user: User,
    auth_override: None,
) -> None:
    old_board = create_board(
        db_session,
        user=user,
        title="오래된 글",
        content="old",
    )
    new_board = create_board(
        db_session,
        user=user,
        title="최신 글",
        content="new",
    )

    db_session.expire_all()

    response = client.get("/api/v1/board/")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

    board_nos = [item["board_no"] for item in data]

    assert old_board.board_no in board_nos
    assert new_board.board_no in board_nos
    assert board_nos.index(new_board.board_no) < board_nos.index(old_board.board_no)


def test_list_boards_requires_login(
    client: TestClient,
    db_session: Session,
    user: User,
) -> None:
    create_board(
        db_session,
        user=user,
        title="글",
        content="내용",
    )

    response = client.get("/api/v1/board/")
    assert response.status_code in (401, 403)


# ---------------------------
# Detail Tests
# ---------------------------


def test_get_board_detail_success(
    client: TestClient,
    db_session: Session,
    user: User,
    auth_override: None,
) -> None:
    board = create_board(
        db_session,
        user=user,
        title="상세 제목",
        content="상세 내용",
    )

    response = client.get(f"/api/v1/board/{board.board_no}")

    assert response.status_code == 200
    data = response.json()
    assert data["board_no"] == board.board_no
    assert data["title"] == "상세 제목"
    assert data["content"] == "상세 내용"
    assert data["writer"] == "user1"


def test_get_board_detail_not_found(
    client: TestClient,
    auth_override: None,
) -> None:
    response = client.get("/api/v1/board/9999")

    assert response.status_code == 404
    assert response.json()["detail"] == "게시글을 찾을 수 없습니다."


def test_get_board_detail_requires_login(
    client: TestClient,
    db_session: Session,
    user: User,
) -> None:
    board = create_board(
        db_session,
        user=user,
        title="상세 글",
        content="내용",
    )

    response = client.get(f"/api/v1/board/{board.board_no}")
    assert response.status_code in (401, 403)


# ---------------------------
# Update Tests
# ---------------------------


def test_update_board_title_and_content_success(
    client: TestClient,
    db_session: Session,
    user: User,
    auth_override: None,
) -> None:
    board = create_board(
        db_session,
        user=user,
        title="수정 전 제목",
        content="수정 전 내용",
    )

    response = client.patch(
        f"/api/v1/board/{board.board_no}",
        data={
            "title": "수정 후 제목",
            "content": "수정 후 내용",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "수정 후 제목"
    assert data["content"] == "수정 후 내용"
    assert data["writer"] == "user1"


def test_update_board_replace_image_success(
    client: TestClient,
    db_session: Session,
    user: User,
    auth_override: None,
    upload_dir: Path,
) -> None:
    old_file = upload_dir / "old.png"
    old_file.write_bytes(b"old-image")

    board = create_board(
        db_session,
        user=user,
        title="이미지 수정",
        content="내용",
        imgpath="/static/board/old.png",
    )

    response = client.patch(
        f"/api/v1/board/{board.board_no}",
        files={
            "image": ("new.png", b"new-image", "image/png"),
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["imgpath"] is not None
    assert data["imgpath"] != "/static/board/old.png"

    new_file = upload_dir / Path(data["imgpath"]).name
    assert new_file.exists()
    assert not old_file.exists()


def test_update_board_delete_image_success(
    client: TestClient,
    db_session: Session,
    user: User,
    auth_override: None,
    upload_dir: Path,
) -> None:
    old_file = upload_dir / "delete_me.png"
    old_file.write_bytes(b"old-image")

    board = create_board(
        db_session,
        user=user,
        title="이미지 삭제",
        content="내용",
        imgpath="/static/board/delete_me.png",
    )

    response = client.patch(
        f"/api/v1/board/{board.board_no}",
        data={
            "delete_image": "true",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["imgpath"] is None
    assert not old_file.exists()


def test_update_board_upload_and_delete_image_together_fails(
    client: TestClient,
    db_session: Session,
    user: User,
    auth_override: None,
) -> None:
    board = create_board(
        db_session,
        user=user,
        title="충돌",
        content="내용",
    )

    response = client.patch(
        f"/api/v1/board/{board.board_no}",
        data={
            "delete_image": "true",
        },
        files={
            "image": ("new.png", b"new-image", "image/png"),
        },
    )

    assert response.status_code == 400
    assert (
        response.json()["detail"] == "이미지 업로드와 삭제를 동시에 요청할 수 없습니다."
    )


def test_update_board_forbidden(
    client: TestClient,
    db_session: Session,
    user: User,
    other_auth_override: None,
) -> None:
    board = create_board(
        db_session,
        user=user,
        title="원본 제목",
        content="원본 내용",
    )

    response = client.patch(
        f"/api/v1/board/{board.board_no}",
        data={
            "title": "남이 수정",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "본인이 작성한 게시글만 수정할 수 있습니다."


def test_update_board_not_found(
    client: TestClient,
    auth_override: None,
) -> None:
    response = client.patch(
        "/api/v1/board/9999",
        data={
            "title": "없음",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "게시글을 찾을 수 없습니다."


def test_update_board_requires_login(
    client: TestClient,
    db_session: Session,
    user: User,
) -> None:
    board = create_board(
        db_session,
        user=user,
        title="로그인 필요",
        content="내용",
    )

    response = client.patch(
        f"/api/v1/board/{board.board_no}",
        data={
            "title": "수정 시도",
        },
    )

    assert response.status_code in (401, 403)


# ---------------------------
# Delete Tests
# ---------------------------


def test_delete_board_success(
    client: TestClient,
    db_session: Session,
    user: User,
    auth_override: None,
    upload_dir: Path,
) -> None:
    image_file = upload_dir / "to_delete.png"
    image_file.write_bytes(b"image-bytes")

    board = create_board(
        db_session,
        user=user,
        title="삭제할 글",
        content="삭제 내용",
        imgpath="/static/board/to_delete.png",
    )

    board_id = board.board_no

    response = client.delete(f"/api/v1/board/{board.board_no}")

    assert response.status_code == 204
    assert response.content == b""

    db_session.expire_all()
    deleted = db_session.get(Board, board_id)
    assert deleted is None
    assert not image_file.exists()


def test_delete_board_forbidden(
    client: TestClient,
    db_session: Session,
    user: User,
    other_auth_override: None,
) -> None:
    board = create_board(
        db_session,
        user=user,
        title="남의 글",
        content="삭제 불가",
    )

    response = client.delete(f"/api/v1/board/{board.board_no}")

    assert response.status_code == 403
    assert response.json()["detail"] == "본인이 작성한 게시글만 삭제할 수 있습니다."


def test_delete_board_not_found(
    client: TestClient,
    auth_override: None,
) -> None:
    response = client.delete("/api/v1/board/9999")

    assert response.status_code == 404
    assert response.json()["detail"] == "게시글을 찾을 수 없습니다."


def test_delete_board_requires_login(
    client: TestClient,
    db_session: Session,
    user: User,
) -> None:
    board = create_board(
        db_session,
        user=user,
        title="로그인 필요",
        content="삭제 실패",
    )

    response = client.delete(f"/api/v1/board/{board.board_no}")
    assert response.status_code in (401, 403)
