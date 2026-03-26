from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.database import get_engine, get_session_local, Base
from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.users.models import User
from app.exercise.exercise_model import Exercise
from app.exercise.exercise_router import router as exercise_router
from app.exercise_record.exercise_record_model import ExerciseRecord
from app.exercise_record.exercise_record_router import router as exercise_record_router


DEFAULT_EXERCISES = [
    {"id": 1, "name": "Push Up", "description": "가슴과 팔 근육을 사용하는 대표적인 맨몸 운동"},
    {"id": 2, "name": "Squat", "description": "하체와 코어를 강화하는 기본 스쿼트 운동"},
    {"id": 3, "name": "Lunge", "description": "균형감과 하체 근력을 함께 기르는 런지 운동"},
    {"id": 4, "name": "Plank", "description": "복부와 코어 안정성을 높이는 플랭크 운동"},
]


def seed_exercises() -> None:
    SessionLocal = get_session_local()
    session = SessionLocal()
    try:
        exists = session.query(Exercise.id).first()
        if exists:
            return

        session.add_all([Exercise(**exercise) for exercise in DEFAULT_EXERCISES])
        session.commit()
    finally:
        session.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=get_engine())
    seed_exercises()
    yield


app = FastAPI(
    title="GYMPT API",
    description="AI 기반 실시간 운동 자세 분석 코칭 시스템",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(exercise_router)
app.include_router(exercise_record_router)

app.include_router(auth_router)
app.include_router(users_router)
