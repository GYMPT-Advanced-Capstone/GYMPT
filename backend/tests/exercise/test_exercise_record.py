from datetime import date, datetime
from decimal import Decimal
import sys
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.exercise.exercise_model import Exercise
from app.exercise_record.dto.exercise_record_request import (
    ExerciseRecordCreateRequest,
    ExerciseRecordUpdateRequest,
)
from app.exercise_record.dto.exercise_record_response import (
    CalendarResponse,
    ExerciseRecordResponse,
)
from app.exercise_record.exercise_record_service import ExerciseRecordService
from app.users.models import User

MODEL_REGISTRY = (Exercise, User)


def make_record(
    *,
    record_id: int = 1,
    user_id: int = 7,
    exercise_id: int = 10,
    exercise_name: str = "Push Up",
    count: int = 20,
    duration: int = 60,
    calories: Decimal = Decimal("13.50"),
    score: int = 95,
    accuracy_avg: Decimal = Decimal("97.25"),
    completed_at: datetime = datetime(2026, 3, 26, 10, 30, 0),
):
    return SimpleNamespace(
        id=record_id,
        user_id=user_id,
        exercise_id=exercise_id,
        exercise=SimpleNamespace(name=exercise_name),
        count=count,
        duration=duration,
        calories=calories,
        score=score,
        accuracy_avg=accuracy_avg,
        completed_at=completed_at,
    )


class FakeExerciseRecordRepo:
    def __init__(self):
        self.created_record = None
        self.record_by_id = None
        self.records_by_date = []
        self.calendar_dates = []
        self.deleted_record = None

    def create(self, record):
        record.id = 99
        record.exercise = Exercise(id=record.exercise_id, name="Push Up", description=None)
        self.created_record = record
        return record

    def get_by_id(self, record_id, user_id):
        return self.record_by_id

    def get_exercised_dates_by_month(self, user_id, year, month):
        return self.calendar_dates

    def get_by_date(self, user_id, target_date):
        return self.records_by_date

    def update(self, record, count, duration):
        if count is not None:
            record.count = count
        if duration is not None:
            record.duration = duration
        return record

    def delete(self, record):
        self.deleted_record = record


def test_exercise_record_service_create_returns_response():
    assert MODEL_REGISTRY
    repo = FakeExerciseRecordRepo()
    service = ExerciseRecordService(repo)
    request = ExerciseRecordCreateRequest(
        exercise_id=10,
        count=20,
        duration=60,
        calories=Decimal("13.50"),
        score=95,
        accuracy_avg=Decimal("97.25"),
        completed_at=datetime(2026, 3, 26, 10, 30, 0),
    )

    result = service.create(7, request)

    assert repo.created_record.user_id == 7
    assert repo.created_record.exercise_id == 10
    assert result == ExerciseRecordResponse(
        id=99,
        exercise_id=10,
        exercise_name="Push Up",
        count=20,
        duration=60,
        calories=Decimal("13.50"),
        score=95,
        accuracy_avg=Decimal("97.25"),
        completed_at=datetime(2026, 3, 26, 10, 30, 0),
    )


def test_exercise_record_service_get_calendar_validates_month():
    service = ExerciseRecordService(FakeExerciseRecordRepo())

    with pytest.raises(HTTPException) as exc_info:
        service.get_calendar(7, 2026, 13)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "월은 1~12 사이여야 합니다."


def test_exercise_record_service_get_calendar_returns_dates():
    repo = FakeExerciseRecordRepo()
    repo.calendar_dates = [date(2026, 3, 1), date(2026, 3, 26)]
    service = ExerciseRecordService(repo)

    result = service.get_calendar(7, 2026, 3)

    assert result == CalendarResponse(exercised_dates=["2026-03-01", "2026-03-26"])


def test_exercise_record_service_get_by_date_returns_response_list():
    repo = FakeExerciseRecordRepo()
    repo.records_by_date = [
        make_record(record_id=1, exercise_name="Push Up"),
        make_record(record_id=2, exercise_id=11, exercise_name="Squat", count=30),
    ]
    service = ExerciseRecordService(repo)

    result = service.get_by_date(7, date(2026, 3, 26))

    assert [item.exercise_name for item in result] == ["Push Up", "Squat"]
    assert [item.id for item in result] == [1, 2]


def test_exercise_record_service_update_rejects_empty_payload():
    service = ExerciseRecordService(FakeExerciseRecordRepo())

    with pytest.raises(HTTPException) as exc_info:
        service.update(7, 1, ExerciseRecordUpdateRequest())

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "수정할 값이 없습니다."


def test_exercise_record_service_update_raises_not_found():
    repo = FakeExerciseRecordRepo()
    service = ExerciseRecordService(repo)

    with pytest.raises(HTTPException) as exc_info:
        service.update(7, 1, ExerciseRecordUpdateRequest(count=10))

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "운동 기록을 찾을 수 없습니다."


def test_exercise_record_service_delete_removes_record():
    repo = FakeExerciseRecordRepo()
    repo.record_by_id = make_record()
    service = ExerciseRecordService(repo)

    service.delete(7, 1)

    assert repo.deleted_record is repo.record_by_id


@pytest.fixture
def client(mock_env_vars):
    fake_redis_module = SimpleNamespace(Redis=lambda *args, **kwargs: SimpleNamespace())
    sys.modules.setdefault("redis", fake_redis_module)
    from app.auth.dependencies import get_current_user_id
    from app.exercise_record.exercise_record_router import get_record_service, router

    app = FastAPI()
    app.include_router(router)
    app.state.get_current_user_id = get_current_user_id
    app.state.get_record_service = get_record_service
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_create_record_route_returns_created_record(client):
    app = client.app
    get_current_user_id = app.state.get_current_user_id
    get_record_service = app.state.get_record_service

    record = ExerciseRecordResponse(
        id=1,
        exercise_id=10,
        exercise_name="Push Up",
        count=20,
        duration=60,
        calories=Decimal("13.50"),
        score=95,
        accuracy_avg=Decimal("97.25"),
        completed_at=datetime(2026, 3, 26, 10, 30, 0),
    )
    app.dependency_overrides[get_current_user_id] = lambda: 7
    app.dependency_overrides[get_record_service] = lambda: SimpleNamespace(
        create=lambda user_id, body: record
    )

    response = client.post(
        "/api/exercise-records",
        json={
            "exercise_id": 10,
            "count": 20,
            "duration": 60,
            "calories": "13.50",
            "score": 95,
            "accuracy_avg": "97.25",
            "completed_at": "2026-03-26T10:30:00",
        },
    )

    assert response.status_code == 201
    assert response.json()["exercise_name"] == "Push Up"


def test_get_calendar_route_returns_dates(client):
    app = client.app
    get_current_user_id = app.state.get_current_user_id
    get_record_service = app.state.get_record_service

    app.dependency_overrides[get_current_user_id] = lambda: 7
    app.dependency_overrides[get_record_service] = lambda: SimpleNamespace(
        get_calendar=lambda user_id, year, month: CalendarResponse(
            exercised_dates=["2026-03-01", "2026-03-26"]
        )
    )

    response = client.get("/api/exercise-records/calendar?year=2026&month=3")

    assert response.status_code == 200
    assert response.json() == {"exercised_dates": ["2026-03-01", "2026-03-26"]}


def test_get_records_by_date_route_returns_record_list(client):
    app = client.app
    get_current_user_id = app.state.get_current_user_id
    get_record_service = app.state.get_record_service

    records = [
        ExerciseRecordResponse(
            id=1,
            exercise_id=10,
            exercise_name="Push Up",
            count=20,
            duration=60,
            calories=Decimal("13.50"),
            score=95,
            accuracy_avg=Decimal("97.25"),
            completed_at=datetime(2026, 3, 26, 10, 30, 0),
        )
    ]
    app.dependency_overrides[get_current_user_id] = lambda: 7
    app.dependency_overrides[get_record_service] = lambda: SimpleNamespace(
        get_by_date=lambda user_id, target_date: records
    )

    response = client.get("/api/exercise-records/2026-03-26")

    assert response.status_code == 200
    assert response.json()[0]["exercise_name"] == "Push Up"


def test_update_record_route_returns_updated_record(client):
    app = client.app
    get_current_user_id = app.state.get_current_user_id
    get_record_service = app.state.get_record_service

    record = ExerciseRecordResponse(
        id=1,
        exercise_id=10,
        exercise_name="Push Up",
        count=25,
        duration=70,
        calories=Decimal("13.50"),
        score=95,
        accuracy_avg=Decimal("97.25"),
        completed_at=datetime(2026, 3, 26, 10, 30, 0),
    )
    app.dependency_overrides[get_current_user_id] = lambda: 7
    app.dependency_overrides[get_record_service] = lambda: SimpleNamespace(
        update=lambda user_id, record_id, body: record
    )

    response = client.patch(
        "/api/exercise-records/1",
        json={"count": 25, "duration": 70},
    )

    assert response.status_code == 200
    assert response.json()["count"] == 25


def test_delete_record_route_returns_no_content(client):
    app = client.app
    get_current_user_id = app.state.get_current_user_id
    get_record_service = app.state.get_record_service

    deleted = {"called": False}

    def delete(user_id, record_id):
        deleted["called"] = True

    app.dependency_overrides[get_current_user_id] = lambda: 7
    app.dependency_overrides[get_record_service] = lambda: SimpleNamespace(delete=delete)

    response = client.delete("/api/exercise-records/1")

    assert response.status_code == 204
    assert deleted["called"] is True
