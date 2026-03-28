import hashlib
import pytest
import redis
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta, date
from app.users.models import User
from app.auth.utils import create_token, get_password_hash, mask_email
from app.core.database import get_db


@pytest.fixture
def client(mock_env_vars):
    from app.main import app

    mock_db = MagicMock()

    app.dependency_overrides[get_db] = lambda: mock_db

    yield TestClient(app), mock_db

    app.dependency_overrides.clear()


# Signup
def test_signup_success(client, mock_redis_client):
    test_client, mock_db = client

    mock_db.query.return_value.filter.return_value.first.return_value = None
    mock_redis_client.get.side_effect = lambda key: (
        "1" if key == "VERIFIED:202014746@kyonggi.ac.kr" else None
    )

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


def test_signup_password_too_short(client):
    test_client, _ = client

    response = test_client.post(
        "/api/v1/auth/signup",
        json={
            "email": "202014746@kyonggi.ac.kr",
            "pw": "short",
            "name": "최인규",
            "nickname": "짐피티",
        },
    )

    assert response.status_code == 422


def test_signup_already_registered(client, mock_redis_client):
    test_client, mock_db = client
    from sqlalchemy.exc import IntegrityError

    mock_redis_client.get.side_effect = lambda key: (
        "1" if key == "VERIFIED:202014746@kyonggi.ac.kr" else None
    )
    mock_db.commit.side_effect = IntegrityError(
        "mock error", params={}, orig=Exception("UNIQUE constraint failed: user.email")
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
def test_logout_success(client, mock_redis_client):
    test_client, mock_db = client

    fake_user = User(
        id=1,
        email="test@email.com",
        name="최인규",
        nickname="짐피티",
        created_at=datetime.now(timezone.utc),
    )
    mock_db.query.return_value.filter.return_value.first.return_value = fake_user

    access_token = create_token(
        {"sub": "test@email.com", "type": "access"}, timedelta(minutes=15)
    )
    refresh_token = create_token(
        {"sub": "test@email.com", "type": "refresh"}, timedelta(days=7)
    )

    refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    mock_redis_client.get.side_effect = lambda key: (
        refresh_token_hash if key == "RT:test@email.com" else None
    )

    response = test_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 204


# mask_email
def test_mask_email():
    assert mask_email("202014746@kyonggi.ac.kr") == "20*******@kyonggi.ac.kr"
    assert mask_email("ab@test.com") == "ab*@test.com"
    assert mask_email("") == "unknown"
    assert mask_email("invalid") == "unknown"


# Redis 연결 오류 → 401
def test_verify_access_token_redis_error(client, mock_redis_client):
    test_client, _ = client

    access_token = create_token(
        {"sub": "test@email.com", "type": "access"}, timedelta(minutes=15)
    )

    mock_redis_client.get.side_effect = redis.RedisError("connection refused")

    response = test_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"refresh_token": "dummy"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "인증 서버에 일시적인 오류가 발생했습니다."


# 블랙리스트 토큰 → 401
def test_logout_blacklisted_token(client, mock_redis_client):
    test_client, _ = client

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


# Birth Date Update
def test_update_birth_date_success(client):
    test_client, mock_db = client

    fake_user = User(
        id=1,
        email="test@email.com",
        name="최인규",
        nickname="짐피티",
        birth_date=None,
        weekly_target=None,
        created_at=datetime.now(timezone.utc),
    )
    mock_db.query.return_value.filter.return_value.first.return_value = fake_user

    def mock_refresh(instance):
        instance.birth_date = date(2000, 1, 1)

    mock_db.refresh.side_effect = mock_refresh

    access_token = create_token(
        {"sub": "test@email.com", "type": "access"}, timedelta(minutes=15)
    )

    response = test_client.patch(
        "/api/v1/users/me/birth-date",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"birth_date": "2000-01-01"},
    )

    assert response.status_code == 200
    assert response.json()["birth_date"] == "2000-01-01"


def test_update_birth_date_user_not_found(client):
    test_client, mock_db = client

    mock_db.query.return_value.filter.return_value.first.return_value = None

    access_token = create_token(
        {"sub": "test@email.com", "type": "access"}, timedelta(minutes=15)
    )

    response = test_client.patch(
        "/api/v1/users/me/birth-date",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"birth_date": "2000-01-01"},
    )

    assert response.status_code == 404


# Weekly Target Update
def test_update_weekly_target_success(client):
    test_client, mock_db = client

    fake_user = User(
        id=1,
        email="test@email.com",
        name="최인규",
        nickname="짐피티",
        birth_date=None,
        weekly_target=None,
        created_at=datetime.now(timezone.utc),
    )
    mock_db.query.return_value.filter.return_value.first.return_value = fake_user

    def mock_refresh(instance):
        instance.weekly_target = 3

    mock_db.refresh.side_effect = mock_refresh

    access_token = create_token(
        {"sub": "test@email.com", "type": "access"}, timedelta(minutes=15)
    )

    response = test_client.patch(
        "/api/v1/users/me/weekly-target",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"weekly_target": 3},
    )

    assert response.status_code == 200
    assert response.json()["weekly_target"] == 3


def test_update_weekly_target_invalid_range(client):
    test_client, _ = client

    access_token = create_token(
        {"sub": "test@email.com", "type": "access"}, timedelta(minutes=15)
    )

    response = test_client.patch(
        "/api/v1/users/me/weekly-target",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"weekly_target": 8},
    )

    assert response.status_code == 422


def test_update_weekly_target_below_min(client):
    test_client, _ = client

    access_token = create_token(
        {"sub": "test@email.com", "type": "access"}, timedelta(minutes=15)
    )

    response = test_client.patch(
        "/api/v1/users/me/weekly-target",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"weekly_target": 0},
    )

    assert response.status_code == 422


def test_update_weekly_target_user_not_found(client):
    test_client, mock_db = client

    mock_db.query.return_value.filter.return_value.first.return_value = None

    access_token = create_token(
        {"sub": "test@email.com", "type": "access"}, timedelta(minutes=15)
    )

    response = test_client.patch(
        "/api/v1/users/me/weekly-target",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"weekly_target": 3},
    )

    assert response.status_code == 404


# revoke_tokens — refresh token sub 불일치 (warning 경로)
def test_revoke_tokens_refresh_token_mismatch(mock_redis_client, mock_env_vars):
    from app.auth.utils import revoke_tokens

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


# Email Verify
def test_request_email_verify_success(client, mock_redis_client):
    test_client, mock_db = client
    mock_db.query.return_value.filter.return_value.first.return_value = None

    with patch("app.auth.router.send_verification_email"):
        response = test_client.post(
            "/api/v1/auth/email-verify/request",
            json={"email": "test@test.com"},
        )

    assert response.status_code == 204


def test_request_email_verify_already_registered(client):
    test_client, mock_db = client
    fake_user = User(id=1, email="test@test.com", pw="password", name="최인규", nickname="테스터")
    mock_db.query.return_value.filter.return_value.first.return_value = fake_user

    response = test_client.post(
        "/api/v1/auth/email-verify/request",
        json={"email": "test@test.com"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "이미 가입된 이메일입니다."


def test_verify_email_success(client, mock_redis_client):
    test_client, _ = client
    mock_redis_client.get.return_value = "123456"

    response = test_client.post(
        "/api/v1/auth/email-verify",
        json={"email": "test@test.com", "code": "123456"},
    )

    assert response.status_code == 204
    mock_redis_client.delete.assert_called_with("EMAIL_CODE:test@test.com")
    mock_redis_client.setex.assert_called()


def test_verify_email_invalid_code(client, mock_redis_client):
    test_client, _ = client
    mock_redis_client.get.return_value = "123456"

    response = test_client.post(
        "/api/v1/auth/email-verify",
        json={"email": "test@test.com", "code": "000000"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "인증 코드가 올바르지 않거나 만료되었습니다."


def test_signup_without_email_verify(client, mock_redis_client):
    test_client, mock_db = client
    mock_db.query.return_value.filter.return_value.first.return_value = None
    mock_redis_client.get.return_value = None

    response = test_client.post(
        "/api/v1/auth/signup",
        json={"email": "test@test.com", "pw": "1q2w3e4r", "name": "최인규", "nickname": "테스터"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "이메일 인증이 완료되지 않았습니다."


# Check Email
def test_check_email_available(client):
    test_client, mock_db = client
    mock_db.query.return_value.filter.return_value.first.return_value = None

    response = test_client.get("/api/v1/auth/check-email?email=test@test.com")

    assert response.status_code == 200
    assert response.json()["available"] is True


def test_check_email_taken(client):
    test_client, mock_db = client
    fake_user = User(id=1, email="test@test.com", pw="password", name="최인규", nickname="테스터")
    mock_db.query.return_value.filter.return_value.first.return_value = fake_user

    response = test_client.get("/api/v1/auth/check-email?email=test@test.com")

    assert response.status_code == 200
    assert response.json()["available"] is False


# Check Nickname
def test_check_nickname_available(client):
    test_client, mock_db = client
    mock_db.query.return_value.filter.return_value.first.return_value = None

    response = test_client.get("/api/v1/auth/check-nickname?nickname=테스터")

    assert response.status_code == 200
    assert response.json()["available"] is True


def test_check_nickname_taken(client):
    test_client, mock_db = client
    fake_user = User(id=1, email="test@test.com", pw="password", name="최인규", nickname="테스터")
    mock_db.query.return_value.filter.return_value.first.return_value = fake_user

    response = test_client.get("/api/v1/auth/check-nickname?nickname=테스터")

    assert response.status_code == 200
    assert response.json()["available"] is False


# Refresh Token
def test_refresh_token_success(client, mock_redis_client):
    test_client, _ = client
    refresh_token = create_token(
        {"sub": "test@test.com", "type": "refresh"}, timedelta(days=7)
    )
    refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    mock_redis_client.get.return_value = refresh_token_hash

    response = test_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "Bearer"


def test_refresh_token_invalid_hash(client, mock_redis_client):
    test_client, _ = client
    refresh_token = create_token(
        {"sub": "test@test.com", "type": "refresh"}, timedelta(days=7)
    )
    mock_redis_client.get.return_value = "wrong_hash"

    response = test_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "유효하지 않거나 만료된 리프레시 토큰입니다."


def test_refresh_token_wrong_type(client):
    test_client, _ = client
    access_token = create_token(
        {"sub": "test@test.com", "type": "access"}, timedelta(minutes=15)
    )

    response = test_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access_token},
    )

    assert response.status_code == 401


# Password Reset Request
def test_request_password_reset_success(client, mock_redis_client):
    test_client, mock_db = client
    fake_user = User(id=1, email="test@test.com", pw="password", name="최인규", nickname="테스터")
    mock_db.query.return_value.filter.return_value.first.return_value = fake_user

    with patch("app.auth.router.send_verification_email"):
        response = test_client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": "test@test.com"},
        )

    assert response.status_code == 204


def test_request_password_reset_user_not_found(client):
    test_client, mock_db = client
    mock_db.query.return_value.filter.return_value.first.return_value = None

    response = test_client.post(
        "/api/v1/auth/password-reset/request",
        json={"email": "test@test.com"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "등록되지 않은 이메일입니다."


# Password Reset
def test_reset_password_success(client, mock_redis_client):
    test_client, mock_db = client
    fake_user = User(id=1, email="test@test.com", pw="password", name="최인규", nickname="테스터")
    mock_db.query.return_value.filter.return_value.first.return_value = fake_user
    mock_redis_client.get.return_value = "123456"

    response = test_client.post(
        "/api/v1/auth/password-reset",
        json={"email": "test@test.com", "code": "123456", "new_password": "newpassword"},
    )

    assert response.status_code == 204
    mock_redis_client.delete.assert_any_call("EMAIL_CODE:test@test.com")
    mock_redis_client.delete.assert_any_call("RT:test@test.com")


def test_reset_password_invalid_code(client, mock_redis_client):
    test_client, _ = client
    mock_redis_client.get.return_value = "123456"

    response = test_client.post(
        "/api/v1/auth/password-reset",
        json={"email": "test@test.com", "code": "000000", "new_password": "newpassword"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "인증 코드가 올바르지 않거나 만료되었습니다."


def test_reset_password_user_not_found(client, mock_redis_client):
    test_client, mock_db = client
    mock_db.query.return_value.filter.return_value.first.return_value = None
    mock_redis_client.get.return_value = "123456"

    response = test_client.post(
        "/api/v1/auth/password-reset",
        json={"email": "test@test.com", "code": "123456", "new_password": "newpassword"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "존재하지 않는 사용자입니다."
