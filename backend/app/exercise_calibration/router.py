from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user_id
from app.core.database import get_db
from app.exercise_calibration.dto.exercise_calibration_request import (
    ExerciseCalibrationCreateRequest,
)
from app.exercise_calibration.dto.exercise_calibration_response import (
    ExerciseCalibrationResponse,
)
from app.exercise_calibration.repository import ExerciseCalibrationRepository
from app.exercise_calibration.service import ExerciseCalibrationService


router = APIRouter(prefix="/api/exercise-calibrations", tags=["exercise-calibration"])


def get_calibration_service(
    db: Session = Depends(get_db),
) -> ExerciseCalibrationService:
    return ExerciseCalibrationService(ExerciseCalibrationRepository(db))


@router.post(
    "",
    response_model=ExerciseCalibrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="운동 초기 가동범위 저장",
    description="로그인한 사용자의 운동별 초기 가동범위 측정값을 저장합니다.",
)
def create_calibration(
    body: ExerciseCalibrationCreateRequest,
    user_id: int = Depends(get_current_user_id),
    service: ExerciseCalibrationService = Depends(get_calibration_service),
):
    return service.create(user_id, body)


@router.get(
    "/latest",
    response_model=ExerciseCalibrationResponse,
    summary="최신 운동 초기 가동범위 조회",
    description="로그인한 사용자의 특정 운동 최신 초기 가동범위 설정을 조회합니다.",
)
def get_latest_calibration(
    exercise_id: Annotated[
        int,
        Query(description="운동 종목 ID", examples=[1]),
    ],
    user_id: int = Depends(get_current_user_id),
    service: ExerciseCalibrationService = Depends(get_calibration_service),
):
    return service.get_latest(user_id, exercise_id)
