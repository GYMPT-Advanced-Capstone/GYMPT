from fastapi import FastAPI

from app.exercise.exercise_controller import router as exercise_router
from app.exercise_record.exercise_record_controller import router as exercise_record_router
app = FastAPI(
    title="GYMPT API",
    description="AI 기반 실시간 운동 자세 분석 코칭 시스템",
    version="0.1.0",
)


app.include_router(exercise_router)
app.include_router(exercise_record_router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

