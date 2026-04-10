from datetime import datetime
from typing import Any, cast

from fastapi import HTTPException, status

from app.exercise_calibration.dto.exercise_calibration_request import (
    ExerciseCalibrationCreateRequest,
)
from app.exercise_calibration.dto.exercise_calibration_response import (
    ExerciseCalibrationResponse,
)
from app.exercise_calibration.repository import ExerciseCalibrationRepository
from app.exercise_record.exercise_record_model import UserExerciseCalibration


class ExerciseCalibrationService:
    def __init__(self, repo: ExerciseCalibrationRepository) -> None:
        self.repo = repo

    def create(
        self,
        user_id: int,
        data: ExerciseCalibrationCreateRequest,
    ) -> ExerciseCalibrationResponse:
        calibration = UserExerciseCalibration(
            user_id=user_id,
            exercise_id=data.exercise_id,
            version=data.version,
            metrics_json=data.metrics,
        )
        return self._to_response(self.repo.create(calibration))

    def get_latest(
        self,
        user_id: int,
        exercise_id: int,
    ) -> ExerciseCalibrationResponse:
        calibration = self.repo.get_latest(user_id, exercise_id)
        if calibration is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="초기 가동범위 설정을 찾을 수 없습니다.",
            )
        return self._to_response(calibration)

    def _to_response(
        self,
        calibration: UserExerciseCalibration,
    ) -> ExerciseCalibrationResponse:
        return ExerciseCalibrationResponse(
            id=cast(int, calibration.id),
            exercise_id=cast(int, calibration.exercise_id),
            exercise_name=calibration.exercise.name,
            version=cast(int, calibration.version),
            metrics=cast(dict[str, Any], calibration.metrics_json),
            created_at=cast(datetime, calibration.created_at),
            updated_at=cast(datetime, calibration.updated_at),
        )
