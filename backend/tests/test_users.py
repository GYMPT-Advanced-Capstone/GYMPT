import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from datetime import datetime, timedelta

from app.users.models import User, UserExerciseGoal
from app.exercise.exercise_model import Exercise
from app.auth.utils import create_token
from app.core.database import get_db


@pytest.fixture
def client(mock_env_vars):
    from app.main import app

    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app), mock_db
    app.dependency_overrides.clear()


@pytest.fixture
def access_token():
    return create_token(
        {"sub": "test@test.com", "type": "access"}, timedelta(minutes=30)
    )


@pytest.fixture
def fake_user():
    return User(
        id=1,
        email="test@test.com",
        pw="hashed_pw",
        name="최인규",
        nickname="짐피티",
        created_at=datetime(2026, 1, 1, 0, 0, 0),
    )


# GET /me
def test_get_me_success(client, mock_redis_client, access_token, fake_user):
    test_client, mock_db = client
    mock_redis_client.get.return_value = None
    mock_db.query.return_value.filter.return_value.first.return_value = fake_user

    response = test_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@test.com"
    assert data["nickname"] == "짐피티"


def test_get_me_user_not_found(client, mock_redis_client, access_token):
    test_client, mock_db = client
    mock_redis_client.get.return_value = None
    mock_db.query.return_value.filter.return_value.first.return_value = None

    response = test_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "유저를 찾을 수 없습니다."


def test_get_me_unauthorized(client):
    test_client, _ = client

    response = test_client.get("/api/v1/users/me")

    assert response.status_code == 401


# POST /me/exercise-goals
def test_create_exercise_goal_success(client, mock_redis_client, access_token, fake_user):
    test_client, mock_db = client
    mock_redis_client.get.return_value = None
    fake_exercise = Exercise(id=1, name="스쿼트")
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        fake_user,
        None,
        fake_exercise,
    ]

    def mock_refresh(instance):
        instance.id = 1

    mock_db.refresh.side_effect = mock_refresh

    response = test_client.post(
        "/api/v1/users/me/exercise-goals",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"exercise_id": 1, "daily_target_count": 10, "threshold": 80.0},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["exercise_id"] == 1
    assert data["daily_target_count"] == 10
    assert data["threshold"] == 80.0


def test_create_exercise_goal_duplicate(client, mock_redis_client, access_token, fake_user):
    test_client, mock_db = client
    mock_redis_client.get.return_value = None
    fake_goal = UserExerciseGoal(id=1, user_id=1, exercise_id=1)
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        fake_user,
        fake_goal,
    ]

    response = test_client.post(
        "/api/v1/users/me/exercise-goals",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"exercise_id": 1},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "해당 운동 종목의 목표가 이미 존재합니다."


def test_create_exercise_goal_user_not_found(client, mock_redis_client, access_token):
    test_client, mock_db = client
    mock_redis_client.get.return_value = None
    mock_db.query.return_value.filter.return_value.first.return_value = None

    response = test_client.post(
        "/api/v1/users/me/exercise-goals",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"exercise_id": 1},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "유저를 찾을 수 없습니다."


def test_create_exercise_goal_exercise_not_found(
    client, mock_redis_client, access_token, fake_user
):
    test_client, mock_db = client
    mock_redis_client.get.return_value = None
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        fake_user,
        None,  # no existing goal
        None,  # exercise not found
    ]

    response = test_client.post(
        "/api/v1/users/me/exercise-goals",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"exercise_id": 999},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "존재하지 않는 운동 종목입니다."


def test_create_exercise_goal_invalid_count(client, mock_redis_client, access_token):
    test_client, _ = client
    mock_redis_client.get.return_value = None

    response = test_client.post(
        "/api/v1/users/me/exercise-goals",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"exercise_id": 1, "daily_target_count": 0},
    )

    assert response.status_code == 422


# PATCH /me/exercise-goals/{goal_id}
def test_update_exercise_goal_success(client, mock_redis_client, access_token, fake_user):
    test_client, mock_db = client
    mock_redis_client.get.return_value = None
    fake_goal = UserExerciseGoal(
        id=1, user_id=1, exercise_id=1, daily_target_count=10, threshold=80.0
    )
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        fake_user,
        fake_goal,
    ]

    response = test_client.patch(
        "/api/v1/users/me/exercise-goals/1",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"daily_target_count": 15},
    )

    assert response.status_code == 200
    assert fake_goal.daily_target_count == 15


def test_update_exercise_goal_not_found(client, mock_redis_client, access_token, fake_user):
    test_client, mock_db = client
    mock_redis_client.get.return_value = None
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        fake_user,
        None,
    ]

    response = test_client.patch(
        "/api/v1/users/me/exercise-goals/999",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"daily_target_count": 15},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "운동 목표를 찾을 수 없습니다."


def test_update_exercise_goal_no_fields(client, mock_redis_client, access_token, fake_user):
    test_client, mock_db = client
    mock_redis_client.get.return_value = None
    fake_goal = UserExerciseGoal(
        id=1, user_id=1, exercise_id=1, daily_target_count=10, threshold=80.0
    )
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        fake_user,
        fake_goal,
    ]

    response = test_client.patch(
        "/api/v1/users/me/exercise-goals/1",
        headers={"Authorization": f"Bearer {access_token}"},
        json={},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "수정할 항목을 하나 이상 입력해주세요."


def test_update_exercise_goal_invalid_threshold(client, mock_redis_client, access_token):
    test_client, _ = client
    mock_redis_client.get.return_value = None

    response = test_client.patch(
        "/api/v1/users/me/exercise-goals/1",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"threshold": 150.0},
    )

    assert response.status_code == 422
