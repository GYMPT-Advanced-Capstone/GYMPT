from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ExerciseCalibrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="가동범위 설정 ID")
    exercise_id: int = Field(..., description="운동 종목 ID")
    exercise_name: str = Field(..., description="운동 이름")
    version: int = Field(..., description="캘리브레이션 스키마 버전")
    metrics: dict[str, Any] = Field(..., description="초기 가동범위 측정값")
    created_at: datetime = Field(..., description="생성 시각")
    updated_at: datetime = Field(..., description="수정 시각")
