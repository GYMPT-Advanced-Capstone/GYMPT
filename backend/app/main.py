from fastapi import FastAPI

app = FastAPI(
    title="GYMPT API",
    description="AI 기반 실시간 운동 자세 분석 코칭 시스템",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}