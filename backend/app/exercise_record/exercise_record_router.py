from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status
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


@router.post(
    "",
    response_model=ExerciseRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="운동 기록 생성",
    description="로그인한 사용자의 새 운동 기록을 생성합니다.",
)
def create_record(
    body: ExerciseRecordCreateRequest,
    user_id: int = Depends(get_current_user_id),
    service: ExerciseRecordService = Depends(get_record_service),
):
    return service.create(user_id, body)


@router.get(
    "/calendar",
    response_model=CalendarResponse,
    summary="월별 운동 날짜 조회",
    description="특정 연도와 월에 운동한 날짜 목록을 조회합니다.",
)
def get_calendar(
    year: Annotated[int, Query(description="조회할 연도", example=2026)],
    month: Annotated[int, Query(description="조회할 월(1~12)", example=3)],
    user_id: int = Depends(get_current_user_id),
    service: ExerciseRecordService = Depends(get_record_service),
):
    return service.get_calendar(user_id, year, month)


@router.get(
    "/{target_date}",
    response_model=list[ExerciseRecordResponse],
    summary="특정 날짜 운동 기록 조회",
    description="특정 날짜에 등록된 운동 기록 목록을 조회합니다.",
)
def get_records_by_date(
    target_date: Annotated[
        date,
        Path(description="조회할 날짜(YYYY-MM-DD)", example="2026-03-26"),
    ],
    user_id: int = Depends(get_current_user_id),
    service: ExerciseRecordService = Depends(get_record_service),
):
    return service.get_by_date(user_id, target_date)


@router.patch(
    "/{record_id}",
    response_model=ExerciseRecordResponse,
    summary="운동 기록 수정",
    description="운동 기록의 횟수 또는 운동 시간을 수정합니다.",
)
def update_record(
    record_id: Annotated[int, Path(description="수정할 운동 기록 ID", example=1)],
    body: ExerciseRecordUpdateRequest,
    user_id: int = Depends(get_current_user_id),
    service: ExerciseRecordService = Depends(get_record_service),
):
    return service.update(user_id, record_id, body)


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="운동 기록 삭제",
    description="선택한 운동 기록을 삭제합니다.",
)
def delete_record(
    record_id: Annotated[int, Path(description="삭제할 운동 기록 ID", example=1)],
    user_id: int = Depends(get_current_user_id),
    service: ExerciseRecordService = Depends(get_record_service),
):
    service.delete(user_id, record_id)
