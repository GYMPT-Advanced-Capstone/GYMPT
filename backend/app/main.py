from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db

app = FastAPI(
    title="GYMPT API",
    description="AI 기반 실시간 운동 자세 분석 코칭 시스템",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/db-test")
def db_test(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1"))
    return {"result": result.scalar()}
