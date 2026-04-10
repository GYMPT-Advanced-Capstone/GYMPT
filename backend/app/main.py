from contextlib import asynccontextmanager
from importlib import import_module
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.auth.router import router as auth_router
from app.board.router import router as board_router
from app.core.database import Base, get_engine
from app.exercise.exercise_router import router as exercise_router
from app.exercise_calibration.router import router as exercise_calibration_router
from app.exercise_record.exercise_record_router import router as exercise_record_router
from app.pose.pose_controller import router as pose_router
from app.users.router import router as users_router


BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = BASE_DIR / "static"
BOARD_IMAGE_DIR = STATIC_DIR / "board"

BOARD_IMAGE_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import_module("app.users.models")
    import_module("app.board.models")
    import_module("app.exercise.exercise_model")
    import_module("app.exercise_record.exercise_record_model")
    Base.metadata.create_all(bind=get_engine())
    yield


app = FastAPI(
    title="GYMPT API",
    description="AI 기반 실시간 운동 자세 분석 코칭 시스템",
    version="0.1.0",
    lifespan=lifespan,
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(exercise_router)
app.include_router(exercise_calibration_router)
app.include_router(exercise_record_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(board_router)
app.include_router(pose_router)
