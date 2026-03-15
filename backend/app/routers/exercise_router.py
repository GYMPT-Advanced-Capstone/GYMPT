from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.exercise import Exercise

router = APIRouter()

# DB 세션 생성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 운동 목록 조회 API
@router.get("/exercises")
def get_exercises(db: Session = Depends(get_db)):
    exercises = db.query(Exercise).all()

    result = []
    for exercise in exercises:
        result.append({
            "no": exercise.no,
            "name": exercise.name,
            "imagepath": exercise.imagepath
        })

    return result