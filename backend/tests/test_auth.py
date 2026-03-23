import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from datetime import datetime, timezone
from app.core.database import get_db


@pytest.fixture
def client(mock_env_vars):
    from app.main import app

    mock_db = MagicMock()

    app.dependency_overrides[get_db] = lambda: mock_db

    yield TestClient(app), mock_db

    app.dependency_overrides.clear()


# Signup
def test_signup_success(client):
    test_client, mock_db = client

    mock_db.query.return_value.filter.return_value.first.return_value = None

    def mock_refresh(instance):
        instance.id = 1
        instance.created_at = datetime(2026, 3, 19, 20, 30, 0)

    mock_db.refresh.side_effect = mock_refresh

    response = test_client.post(
        "/api/v1/auth/signup",
        json={
            "email": "202014746@kyonggi.ac.kr",
            "pw": "1q2w3e4r",
            "name": "최인규",
            "nickname": "짐피티",
        },
    )

    assert response.status_code == 201

    data = response.json()
    assert data["id"] == 1
    assert data["email"] == "202014746@kyonggi.ac.kr"
    assert data["name"] == "최인규"
    assert data["nickname"] == "짐피티"
    assert "created_at" in data


def test_signup_already_registered(client):
    test_client, mock_db = client
    from sqlalchemy.exc import IntegrityError

    # 핵심: db.commit()을 실행할 때 IntegrityError가 터지도록 가짜(Mock) 설정!
    mock_db.commit.side_effect = IntegrityError(
        "mock error", params={}, orig=Exception()
    )

    response = test_client.post(
        "/api/v1/auth/signup",
        json={
            "email": "202014746@kyonggi.ac.kr",
            "pw": "1q2w3e4r",
            "name": "최인규",
            "nickname": "짐피티",
        },
    )

    assert response.status_code == 409


# Login
def test_login_success(client):
    test_client, mock_db = client
    from app.auth.models import User
    from app.auth.utils import get_password_hash

    hashed_pw = get_password_hash("1q2w3e4r")
    fake_user = User(
        id=1,
        email="202014746@kyonggi.ac.kr",
        pw=hashed_pw,
        name="최인규",
        nickname="짐피티",
    )

    mock_db.query.return_value.filter.return_value.first.return_value = fake_user

    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "202014746@kyonggi.ac.kr", "pw": "1q2w3e4r"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "Bearer"


def test_login_failure_wrong_password(client):
    test_client, mock_db = client
    from app.auth.models import User
    from app.auth.utils import get_password_hash

    hashed_pw = get_password_hash("1q2w3e4r")
    fake_user = User(email="202014746@kyonggi.ac.kr", pw=hashed_pw)
    mock_db.query.return_value.filter.return_value.first.return_value = fake_user

    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "202014746@kyonggi.ac.kr", "pw": "wrongpassword"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "이메일 또는 비밀번호가 올바르지 않습니다."


def test_login_failure_user_not_found(client):
    test_client, mock_db = client

    mock_db.query.return_value.filter.return_value.first.return_value = None

    response = test_client.post(
        "/api/v1/auth/login", json={"email": "notfound@kyonggi.ac.kr", "pw": "1q2w3e4r"}
    )

    assert response.status_code == 401


# Logout
def test_logout_success(client):
    test_client, mock_db = client
    from app.auth.models import User
    from app.auth.utils import create_token
    from datetime import timedelta, datetime

    fake_user = User(
        id=1,
        email="test@email.com",
        name="최인규",
        nickname="짐피티",
        created_at=datetime.now(timezone.utc),
    )
    mock_db.query.return_value.filter.return_value.first.return_value = fake_user
    mock_db.query.return_value.filter_by.return_value.first.return_value = fake_user

    access_token = create_token(
        {"sub": "test@email.com", "type": "access"}, timedelta(minutes=15)
    )
    refresh_token = create_token(
        {"sub": "test@email.com", "type": "refresh"}, timedelta(days=7)
    )

    response = test_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 204


# mask_email
def test_mask_email():
    from app.auth.utils import mask_email

    assert mask_email("202014746@kyonggi.ac.kr") == "20*******@kyonggi.ac.kr"
    assert mask_email("ab@test.com") == "ab*@test.com"
    assert mask_email("") == "unknown"
    assert mask_email("invalid") == "unknown"


# 블랙리스트 토큰 → 401
def test_logout_blacklisted_token(client, mock_redis_client):
    test_client, _ = client
    from app.auth.utils import create_token
    from datetime import timedelta

    access_token = create_token(
        {"sub": "test@email.com", "type": "access"}, timedelta(minutes=15)
    )

    mock_redis_client.get.return_value = "logout"

    response = test_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"refresh_token": "dummy"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "로그아웃된 토큰입니다."


# type이 access가 아닌 토큰 → 유효하지 않은 토큰
def test_logout_invalid_token_payload(client):
    test_client, _ = client
    from app.auth.utils import create_token
    from datetime import timedelta

    bad_token = create_token(
        {"sub": "test@email.com", "type": "refresh"}, timedelta(minutes=15)
    )

    response = test_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {bad_token}"},
        json={"refresh_token": "dummy"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "유효하지 않은 토큰입니다."


# 잘못된 JWT → JWTError
def test_logout_malformed_token(client):
    test_client, _ = client

    response = test_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": "Bearer this.is.invalid"},
        json={"refresh_token": "dummy"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "유효하지 않거나 만료된 토큰입니다."


# revoke_tokens — refresh token sub 불일치 (warning 경로)
def test_revoke_tokens_refresh_token_mismatch(mock_redis_client, mock_env_vars):
    from app.auth.utils import create_token, revoke_tokens
    from datetime import timedelta

    access_token = create_token(
        {"sub": "user@email.com", "type": "access"}, timedelta(minutes=15)
    )
    refresh_token = create_token(
        {"sub": "other@email.com", "type": "refresh"}, timedelta(days=7)
    )

    revoke_tokens(access_token, refresh_token, "user@email.com")
    mock_redis_client.delete.assert_not_called()


# exp 없는 access token
def test_revoke_tokens_no_exp(mock_redis_client, mock_env_vars):
    from app.auth.utils import revoke_tokens
    from app.core.config import get_settings
    from jose import jwt

    settings = get_settings()

    no_exp_token = jwt.encode(
        {"sub": "user@email.com", "type": "access"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    refresh_token_dummy = jwt.encode(
        {"sub": "user@email.com", "type": "refresh"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    revoke_tokens(no_exp_token, refresh_token_dummy, "user@email.com")
    mock_redis_client.setex.assert_not_called()
