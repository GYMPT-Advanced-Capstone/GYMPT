from contextlib import asynccontextmanager
from importlib import import_module
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

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

SCHEMA_BACKFILL_COLUMNS = {
    "user_exercise_goal": (
        ("daily_target_duration", "daily_target_duration INT NULL"),
        ("threshold", "threshold FLOAT NULL"),
    ),
    "exercise_records": (
        ("ai_feedback", "ai_feedback TEXT NULL"),
        ("best_rep_metrics", "best_rep_metrics {json_type} NULL"),
    ),
}


def _ensure_runtime_schema(engine: Engine) -> None:
    json_type = "JSON" if engine.dialect.name == "mysql" else "TEXT"

    with engine.begin() as connection:
        for table_name, columns in SCHEMA_BACKFILL_COLUMNS.items():
            inspector = inspect(connection)
            existing_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }
            for column_name, ddl_template in columns:
                if column_name in existing_columns:
                    continue

                ddl = ddl_template.format(json_type=json_type)
                try:
                    connection.exec_driver_sql(
                        f"ALTER TABLE {table_name} ADD COLUMN {ddl}"
                    )
                except SQLAlchemyError:
                    refreshed_columns = {
                        column["name"]
                        for column in inspect(connection).get_columns(table_name)
                    }
                    if column_name not in refreshed_columns:
                        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    import_module("app.users.models")
    import_module("app.board.models")
    import_module("app.exercise.exercise_model")
    import_module("app.exercise_record.exercise_record_model")
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    _ensure_runtime_schema(engine)
    yield


app = FastAPI(
    title="GYMPT API",
    description="AI 기반 실시간 운동 자세 분석 코칭 시스템",
    version="0.1.0",
    lifespan=lifespan,
)

# ← 여기에 추가 (app 생성 직후, mount/router 전에)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


app.include_router(exercise_router)
app.include_router(exercise_calibration_router)
app.include_router(exercise_record_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(board_router)
app.include_router(pose_router)
