from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.exercise.dto.exercise_response import ExerciseResponse
from app.exercise.exercise_router import get_exercise_service
from app.exercise.exercise_service import ExerciseService


class FakeExerciseRepo:
    def __init__(self, exercises):
        self._exercises = exercises

    def get_all(self):
        return self._exercises


def test_exercise_service_get_all_returns_response_models():
    repo = FakeExerciseRepo(
        [
            SimpleNamespace(id=1, name="Push Up", description="Upper body"),
            SimpleNamespace(id=2, name="Squat", description=None),
        ]
    )
    service = ExerciseService(repo)

    result = service.get_all()

    assert result == [
        ExerciseResponse(id=1, name="Push Up", description="Upper body"),
        ExerciseResponse(id=2, name="Squat", description=None),
    ]


def test_exercise_service_get_all_returns_empty_list():
    service = ExerciseService(FakeExerciseRepo([]))

    assert service.get_all() == []


@pytest.fixture
def client(mock_env_vars):
    from app.exercise.exercise_router import router

    app = FastAPI()
    app.include_router(router)
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_get_exercises_route_returns_exercise_list(client):
    app = client.app

    service = SimpleNamespace(
        get_all=lambda: [
            ExerciseResponse(id=1, name="Push Up", description="Upper body"),
            ExerciseResponse(id=2, name="Squat", description=None),
        ]
    )
    app.dependency_overrides[get_exercise_service] = lambda: service

    response = client.get("/api/exercises")

    assert response.status_code == 200
    assert response.json() == [
        {"id": 1, "name": "Push Up", "description": "Upper body"},
        {"id": 2, "name": "Squat", "description": None},
    ]


def test_get_exercises_route_returns_empty_list(client):
    app = client.app

    app.dependency_overrides[get_exercise_service] = lambda: SimpleNamespace(
        get_all=lambda: []
    )

    response = client.get("/api/exercises")

    assert response.status_code == 200
    assert response.json() == []
