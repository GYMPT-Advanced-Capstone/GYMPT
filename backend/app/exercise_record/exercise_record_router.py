from datetime import date

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user_id
from app.core.database import get_db
from app.exercise_record.exercise_record_repository import ExerciseRecordRepository
from app.exercise_record.exercise_record_service import ExerciseRecordService
from app.exercise_record.dto.exercise_record_request import (
    ExerciseRecordCreateRequest,
    ExerciseRecordUpdateRequest,
)
from app.exercise_record.dto.exercise_record_response import CalendarResponse, ExerciseRecordResponse

router = APIRouter(prefix="/api/exercise-records", tags=["exercise-record"])


def get_record_service(db: Session = Depends(get_db)) -> ExerciseRecordService:
    return ExerciseRecordService(ExerciseRecordRepository(db))


@router.post("", response_model=ExerciseRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    body: ExerciseRecordCreateRequest,
    user_id: int = Depends(get_current_user_id),
    service: ExerciseRecordService = Depends(get_record_service),
):
    return service.create(user_id, body)


@router.get("/calendar", response_model=CalendarResponse)
def get_calendar(
    year: int,
    month: int,
    user_id: int = Depends(get_current_user_id),
    service: ExerciseRecordService = Depends(get_record_service),
):
    return service.get_calendar(user_id, year, month)


@router.get("/{target_date}", response_model=list[ExerciseRecordResponse])
def get_records_by_date(
    target_date: date,
    user_id: int = Depends(get_current_user_id),
    service: ExerciseRecordService = Depends(get_record_service),
):
    return service.get_by_date(user_id, target_date)


@router.patch("/{record_id}", response_model=ExerciseRecordResponse)
def update_record(
    record_id: int,
    body: ExerciseRecordUpdateRequest,
    user_id: int = Depends(get_current_user_id),
    service: ExerciseRecordService = Depends(get_record_service),
):
    return service.update(user_id, record_id, body)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    record_id: int,
    user_id: int = Depends(get_current_user_id),
    service: ExerciseRecordService = Depends(get_record_service),
):
    service.delete(user_id, record_id)