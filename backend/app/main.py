from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.routers import exercise_router

app = FastAPI()

# router 등록
app.include_router(exercise_router.router)

# 서버 테스트용 기본 API
@app.get("/")
def root():
    return {"message": "FastAPI server is running"}
