from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.exercise.exercise_model import Exercise
from app.users.models import User, UserExerciseGoal
from app.users.schemas import BirthDateUpdate, UserResponse, WeeklyTargetUpdate
from app.users.dto.user_request import (
    ExerciseGoalCreateRequest,
    ExerciseGoalUpdateRequest,
)
from app.users.dto.user_response import ExerciseGoalResponse
from app.auth.utils import verify_access_token


router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_me(
    token_data: tuple[str, str] = Depends(verify_access_token),
    db: Session = Depends(get_db),
):
    email, _ = token_data
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다."
        )
    return user


@router.patch("/me/birth-date", response_model=UserResponse)
def update_birth_date(
    data: BirthDateUpdate,
    token_data: tuple[str, str] = Depends(verify_access_token),
    db: Session = Depends(get_db),
):
    email, _ = token_data
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다."
        )
    user.birth_date = data.birth_date  # type: ignore[assignment]
    db.commit()
    db.refresh(user)
    return user


@router.patch("/me/weekly-target", response_model=UserResponse)
def update_weekly_target(
    data: WeeklyTargetUpdate,
    token_data: tuple[str, str] = Depends(verify_access_token),
    db: Session = Depends(get_db),
):
    email, _ = token_data
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다."
        )
    user.weekly_target = data.weekly_target  # type: ignore[assignment]
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/me/exercise-goals",
    response_model=ExerciseGoalResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_exercise_goal(
    data: ExerciseGoalCreateRequest,
    token_data: tuple[str, str] = Depends(verify_access_token),
    db: Session = Depends(get_db),
):
    email, _ = token_data
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다."
        )
    existing = (
        db.query(UserExerciseGoal)
        .filter(
            UserExerciseGoal.user_id == user.id,
            UserExerciseGoal.exercise_id == data.exercise_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="해당 운동 종목의 목표가 이미 존재합니다.",
        )
    exercise = db.query(Exercise).filter(Exercise.id == data.exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="존재하지 않는 운동 종목입니다.",
        )
    goal = UserExerciseGoal(
        user_id=user.id,
        exercise_id=data.exercise_id,
        daily_target_count=data.daily_target_count,
        daily_target_duration=data.daily_target_duration,
        threshold=data.threshold,
    )
    db.add(goal)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="해당 운동 종목의 목표가 이미 존재합니다.",
        )
    db.refresh(goal)
    return goal


@router.patch("/me/exercise-goals/{goal_id}", response_model=ExerciseGoalResponse)
def update_exercise_goal(
    goal_id: int,
    data: ExerciseGoalUpdateRequest,
    token_data: tuple[str, str] = Depends(verify_access_token),
    db: Session = Depends(get_db),
):
    email, _ = token_data
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다."
        )
    goal = (
        db.query(UserExerciseGoal)
        .filter(
            UserExerciseGoal.id == goal_id,
            UserExerciseGoal.user_id == user.id,
        )
        .first()
    )
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="운동 목표를 찾을 수 없습니다.",
        )
    if (
        data.daily_target_count is None
        and data.daily_target_duration is None
        and data.threshold is None
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="수정할 항목을 하나 이상 입력해주세요.",
        )
    if data.daily_target_count is not None:
        goal.daily_target_count = data.daily_target_count  # type: ignore[assignment]
    if data.daily_target_duration is not None:
        goal.daily_target_duration = data.daily_target_duration  # type: ignore[assignment]
    if data.threshold is not None:
        goal.threshold = data.threshold  # type: ignore[assignment]
    db.commit()
    db.refresh(goal)
    return goal
