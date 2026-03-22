from fastapi import FastAPI
from app.core.database import get_engine, Base
from app.auth.router import router as auth_router

app = FastAPI(
    title="GYMPT API",
    description="AI 기반 실시간 운동 자세 분석 코칭 시스템",
    version="0.1.0",
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=get_engine())


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(auth_router)
