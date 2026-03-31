from collections.abc import Generator
from contextlib import asynccontextmanager
import importlib
import sys
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app


SQLALCHEMY_DATABASE_URL = "sqlite://"


@pytest.fixture
def mock_env_vars(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("MYSQL_HOST", "localhost")
    monkeypatch.setenv("MYSQL_PORT", "3306")
    monkeypatch.setenv("MYSQL_USER", "test_user")
    monkeypatch.setenv("MYSQL_PASSWORD", "test_password")
    monkeypatch.setenv("MYSQL_DATABASE", "test_db")
    monkeypatch.setenv("SECRET_KEY", "test_secret_key_for_testing_only")
    monkeypatch.setenv("ALGORITHM", "HS256")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    monkeypatch.setenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")


@pytest.fixture(autouse=True)
def mock_redis_client():
    fake_redis = MagicMock()
    fake_redis.get.return_value = None
    fake_redis.setex.return_value = True
    fake_redis.delete.return_value = 1

    sys.modules.setdefault("redis", MagicMock())
    auth_utils = importlib.import_module("app.auth.utils")

    with patch.object(auth_utils, "get_redis_client", return_value=fake_redis):
        yield fake_redis


@pytest.fixture
def db_session() -> Generator:
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

    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session, mock_env_vars) -> Generator[TestClient, None, None]:
    def override_get_db():
        yield db_session

    @asynccontextmanager
    async def fake_lifespan(_app):
        yield

    app.dependency_overrides[get_db] = override_get_db
    app.router.lifespan_context = fake_lifespan

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def create_user(
    client: TestClient,
    email: str,
    pw: str,
    name: str,
    nickname: str,
) -> None:
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "pw": pw,
            "name": name,
            "nickname": nickname,
        },
    )
    assert response.status_code == 201, response.text


def login_user(
    client: TestClient,
    email: str,
    pw: str,
) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "pw": pw,
        },
    )
    assert response.status_code == 200, response.text

    access_token = response.json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


def create_user_and_token(
    client: TestClient,
    email: str,
    pw: str,
    name: str,
    nickname: str,
) -> dict[str, str]:
    create_user(
        client=client,
        email=email,
        pw=pw,
        name=name,
        nickname=nickname,
    )
    return login_user(
        client=client,
        email=email,
        pw=pw,
    )


def create_board(
    client: TestClient,
    headers: dict[str, str],
    title: str = "테스트 게시글",
    content: str = "테스트 게시글 내용",
) -> dict:
    response = client.post(
        "/api/v1/board/",
        headers=headers,
        data={
            "title": title,
            "content": content,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_comment(
    client: TestClient,
    headers: dict[str, str],
    board_no: int,
    content: str = "테스트 댓글",
) -> dict:
    response = client.post(
        f"/api/v1/board/{board_no}/comments",
        headers=headers,
        json={
            "content": content,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_create_comment_success(client: TestClient) -> None:
    headers = create_user_and_token(
        client=client,
        email="comment_create@example.com",
        pw="password123!",
        name="댓글작성자이름",
        nickname="댓글작성자",
    )
    board = create_board(client=client, headers=headers)

    response = client.post(
        f"/api/v1/board/{board['board_no']}/comments",
        headers=headers,
        json={
            "content": "첫 댓글입니다.",
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["board_no"] == board["board_no"]
    assert data["content"] == "첫 댓글입니다."
    assert data["writer"] == "댓글작성자"
    assert "comment_no" in data
    assert "create_at" in data


def test_create_comment_board_not_found(client: TestClient) -> None:
    headers = create_user_and_token(
        client=client,
        email="comment_board_not_found@example.com",
        pw="password123!",
        name="댓글작성자2이름",
        nickname="댓글작성자2",
    )

    response = client.post(
        "/api/v1/board/999999/comments",
        headers=headers,
        json={
            "content": "없는 게시글에 댓글 작성 시도",
        },
    )

    assert response.status_code == 404, response.text
    assert response.json()["detail"] == "게시글을 찾을 수 없습니다."


def test_create_comment_unauthorized(client: TestClient) -> None:
    response = client.post(
        "/api/v1/board/1/comments",
        json={
            "content": "로그인 없이 댓글 작성",
        },
    )

    assert response.status_code == 401, response.text


def test_update_comment_success(client: TestClient) -> None:
    headers = create_user_and_token(
        client=client,
        email="comment_update@example.com",
        pw="password123!",
        name="수정작성자이름",
        nickname="수정작성자",
    )
    board = create_board(client=client, headers=headers)
    comment = create_comment(
        client=client,
        headers=headers,
        board_no=board["board_no"],
        content="원본 댓글",
    )

    response = client.patch(
        f"/api/v1/board/comments/{comment['comment_no']}",
        headers=headers,
        json={
            "content": "수정된 댓글",
        },
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["comment_no"] == comment["comment_no"]
    assert data["board_no"] == board["board_no"]
    assert data["content"] == "수정된 댓글"
    assert data["writer"] == "수정작성자"


def test_update_comment_not_found(client: TestClient) -> None:
    headers = create_user_and_token(
        client=client,
        email="comment_update_not_found@example.com",
        pw="password123!",
        name="유저1이름",
        nickname="유저1",
    )

    response = client.patch(
        "/api/v1/board/comments/999999",
        headers=headers,
        json={
            "content": "없는 댓글 수정",
        },
    )

    assert response.status_code == 404, response.text
    assert response.json()["detail"] == "댓글을 찾을 수 없습니다."


def test_update_comment_forbidden(client: TestClient) -> None:
    writer_headers = create_user_and_token(
        client=client,
        email="comment_writer@example.com",
        pw="password123!",
        name="원작성자이름",
        nickname="원작성자",
    )
    other_headers = create_user_and_token(
        client=client,
        email="comment_other@example.com",
        pw="password123!",
        name="다른사용자이름",
        nickname="다른사용자",
    )

    board = create_board(client=client, headers=writer_headers)
    comment = create_comment(
        client=client,
        headers=writer_headers,
        board_no=board["board_no"],
        content="원작성자 댓글",
    )

    response = client.patch(
        f"/api/v1/board/comments/{comment['comment_no']}",
        headers=other_headers,
        json={
            "content": "남의 댓글 수정 시도",
        },
    )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "본인이 작성한 댓글만 수정할 수 있습니다."


def test_update_comment_unauthorized(client: TestClient) -> None:
    response = client.patch(
        "/api/v1/board/comments/1",
        json={
            "content": "로그인 없이 수정",
        },
    )

    assert response.status_code == 401, response.text


def test_delete_comment_success(client: TestClient) -> None:
    headers = create_user_and_token(
        client=client,
        email="comment_delete@example.com",
        pw="password123!",
        name="삭제작성자이름",
        nickname="삭제작성자",
    )
    board = create_board(client=client, headers=headers)
    comment = create_comment(
        client=client,
        headers=headers,
        board_no=board["board_no"],
        content="삭제할 댓글",
    )

    response = client.delete(
        f"/api/v1/board/comments/{comment['comment_no']}",
        headers=headers,
    )

    assert response.status_code == 204, response.text
    assert response.content == b""

    check_response = client.patch(
        f"/api/v1/board/comments/{comment['comment_no']}",
        headers=headers,
        json={
            "content": "삭제 후 수정 시도",
        },
    )
    assert check_response.status_code == 404, check_response.text
    assert check_response.json()["detail"] == "댓글을 찾을 수 없습니다."


def test_delete_comment_not_found(client: TestClient) -> None:
    headers = create_user_and_token(
        client=client,
        email="comment_delete_not_found@example.com",
        pw="password123!",
        name="유저2이름",
        nickname="유저2",
    )

    response = client.delete(
        "/api/v1/board/comments/999999",
        headers=headers,
    )

    assert response.status_code == 404, response.text
    assert response.json()["detail"] == "댓글을 찾을 수 없습니다."


def test_delete_comment_forbidden(client: TestClient) -> None:
    writer_headers = create_user_and_token(
        client=client,
        email="comment_delete_writer@example.com",
        pw="password123!",
        name="댓글주인이름",
        nickname="댓글주인",
    )
    other_headers = create_user_and_token(
        client=client,
        email="comment_delete_other@example.com",
        pw="password123!",
        name="남의유저이름",
        nickname="남의유저",
    )

    board = create_board(client=client, headers=writer_headers)
    comment = create_comment(
        client=client,
        headers=writer_headers,
        board_no=board["board_no"],
        content="삭제 금지 댓글",
    )

    response = client.delete(
        f"/api/v1/board/comments/{comment['comment_no']}",
        headers=other_headers,
    )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "본인이 작성한 댓글만 삭제할 수 있습니다."


def test_delete_comment_unauthorized(client: TestClient) -> None:
    response = client.delete("/api/v1/board/comments/1")

    assert response.status_code == 401, response.text
