from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.database import get_engine, Base
from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.exercise.exercise_router import router as exercise_router
from app.exercise_record.exercise_record_router import router as exercise_record_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=get_engine())
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
