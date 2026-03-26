from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.database import get_engine, Base
from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.board.router import router as board_router


BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = BASE_DIR / "static"
BOARD_IMAGE_DIR = STATIC_DIR / "board"

BOARD_IMAGE_DIR.mkdir(parents=True, exist_ok=True)


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

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(board_router)
