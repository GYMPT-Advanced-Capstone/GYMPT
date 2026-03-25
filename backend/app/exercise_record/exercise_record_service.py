from datetime import date

from fastapi import HTTPException, status

from app.exercise_record.exercise_record_model import ExerciseRecord
from app.exercise_record.exercise_record_repository import ExerciseRecordRepository
from app.exercise_record.dto.exercise_record_request import (
    ExerciseRecordCreateRequest,
    ExerciseRecordUpdateRequest,
)
from app.exercise_record.dto.exercise_record_response import CalendarResponse, ExerciseRecordResponse


class ExerciseRecordService:
    def __init__(self, repo: ExerciseRecordRepository) -> None:
        self.repo = repo

    def create(
        self, user_id: int, data: ExerciseRecordCreateRequest
    ) -> ExerciseRecordResponse:
        record = ExerciseRecord(
            user_id=user_id,
            exercise_id=data.exercise_id,
            count=data.count,
            duration=data.duration,
            calories=data.calories,
            score=data.score,
            accuracy_avg=data.accuracy_avg,
            completed_at=data.completed_at,
        )
        return self._to_response(self.repo.create(record))

    def get_calendar(
        self, user_id: int, year: int, month: int
    ) -> CalendarResponse:
        if not (1 <= month <= 12):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="월은 1~12 사이여야 합니다.",
            )
        dates = self.repo.get_exercised_dates_by_month(user_id, year, month)
        return CalendarResponse(exercised_dates=[str(d) for d in dates])

    def get_by_date(
        self, user_id: int, target_date: date
    ) -> list[ExerciseRecordResponse]:
        return [self._to_response(r) for r in self.repo.get_by_date(user_id, target_date)]

    def update(
        self, user_id: int, record_id: int, data: ExerciseRecordUpdateRequest
    ) -> ExerciseRecordResponse:
        if data.count is None and data.duration is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="수정할 값이 없습니다.",
            )
        record = self._get_or_404(record_id, user_id)
        return self._to_response(self.repo.update(record, data.count, data.duration))

    def delete(self, user_id: int, record_id: int) -> None:
        self.repo.delete(self._get_or_404(record_id, user_id))

    def _get_or_404(self, record_id: int, user_id: int) -> ExerciseRecord:
        record = self.repo.get_by_id(record_id, user_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="운동 기록을 찾을 수 없습니다.",
            )
        return record

    def _to_response(self, record: ExerciseRecord) -> ExerciseRecordResponse:
        return ExerciseRecordResponse(
            id=record.id,
            exercise_id=record.exercise_id,
            exercise_name=record.exercise.name,
            count=record.count,
            duration=record.duration,
            calories=record.calories,
            score=record.score,
            accuracy_avg=record.accuracy_avg,
            completed_at=record.completed_at,
        )