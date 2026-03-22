from fastapi import FastAPI
from app.routers import user_router
from app.core.database import get_engine, Base
import app.models.user

app = FastAPI(
    title="GYMPT API",
    description="AI 기반 실시간 운동 자세 분석 코칭 시스템",
    version="0.1.0",
)

Base.metadata.create_all(bind=get_engine())

app.include_router(user_router.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}