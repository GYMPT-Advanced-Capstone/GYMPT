from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.exercise.exercise_repository import ExerciseRepository
from app.exercise.exercise_service import ExerciseService
from app.exercise.dto.exercise_response import ExerciseResponse

router = APIRouter(prefix="/api/exercises", tags=["exercise"])


def get_exercise_service(db: Session = Depends(get_db)) -> ExerciseService:
    return ExerciseService(ExerciseRepository(db))


@router.get("",
            response_model=list[ExerciseResponse],
            summary="운동 목록 조회",
            description="시스템에 등록된 운동 종목 목록을 조회합니다.",
            )
def get_exercises(service: ExerciseService = Depends(get_exercise_service)):
    return service.get_all()