from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.exercise.exercise_model import Exercise
from app.exercise_record.exercise_record_model import ExerciseRecord
from app.users.models import User, UserExerciseGoal
from app.users.schemas import BirthDateUpdate, UserResponse, WeeklyTargetUpdate
from app.users.dto.user_request import (
    ExerciseGoalCreateRequest,
    ExerciseGoalUpdateRequest,
)
from app.users.dto.user_response import (
    ExerciseGoalResponse,
    ExerciseGoalSummaryItem,
    MainSummaryResponse,
)
from app.auth.utils import verify_access_token


router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get("/me/summary", response_model=MainSummaryResponse)
def get_main_summary(
    token_data: tuple[str, str] = Depends(verify_access_token),
    db: Session = Depends(get_db),
):
    email, _ = token_data
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다."
        )

    today = date.today()
    monday = today - timedelta(days=today.weekday())

    goals = db.query(UserExerciseGoal).filter(UserExerciseGoal.user_id == user.id).all()

    week_records = (
        db.query(ExerciseRecord)
        .filter(
            ExerciseRecord.user_id == user.id,
            func.date(ExerciseRecord.completed_at) >= monday,
            func.date(ExerciseRecord.completed_at) <= monday + timedelta(days=6),
        )
        .all()
    )

    today_records = [r for r in week_records if r.completed_at.date() == today]

    today_counts: dict[int, int] = {}
    today_durations: dict[int, int] = {}
    for record in today_records:
        eid = int(record.exercise_id)
        today_counts[eid] = today_counts.get(eid, 0) + int(record.count)
        today_durations[eid] = today_durations.get(eid, 0) + int(record.duration)

    goals_with_target = [
        g
        for g in goals
        if g.daily_target_count is not None or g.daily_target_duration is not None
    ]
    achieved = sum(
        1
        for g in goals_with_target
        if (
            g.daily_target_count is not None
            and today_counts.get(int(g.exercise_id), 0) >= g.daily_target_count
        )
        or (
            g.daily_target_duration is not None
            and today_durations.get(int(g.exercise_id), 0) >= g.daily_target_duration
        )
    )
    achievement_rate = (
        (achieved / len(goals_with_target) * 100) if goals_with_target else 0.0
    )

    today_completed_count = len(today_counts)

    exercise_ids = [int(g.exercise_id) for g in goals]
    exercises = (
        db.query(Exercise).filter(Exercise.id.in_(exercise_ids)).all()
        if exercise_ids
        else []
    )
    exercise_map = {int(e.id): e.name for e in exercises}

    exercise_goal_summaries = [
        ExerciseGoalSummaryItem(
            exercise_id=int(goal.exercise_id),
            exercise_name=str(exercise_map.get(int(goal.exercise_id), "")),
            daily_target_count=int(goal.daily_target_count)
            if goal.daily_target_count is not None
            else None,
            today_count=today_counts.get(int(goal.exercise_id), 0),
        )
        for goal in goals
    ]

    worked_days = {r.completed_at.date() for r in week_records}
    weekly_workout_days = [
        (monday + timedelta(days=i)) in worked_days for i in range(7)
    ]

    return MainSummaryResponse(
        nickname=str(user.nickname),
        today_achievement_rate=round(achievement_rate, 1),
        today_completed_count=today_completed_count,
        exercise_goals=exercise_goal_summaries,
        weekly_workout_days=weekly_workout_days,
    )


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
