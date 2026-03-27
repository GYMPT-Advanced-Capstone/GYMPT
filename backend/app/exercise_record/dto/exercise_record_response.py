from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ExerciseRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(
        ...,
        description="운동 기록 ID",
        json_schema_extra={"example": 1},
    )
    exercise_id: int = Field(
        ...,
        description="운동 종목 ID",
        json_schema_extra={"example": 1},
    )
    exercise_name: str = Field(
        ...,
        description="운동 이름",
        json_schema_extra={"example": "Push Up"},
    )
    count: int = Field(
        ...,
        description="운동 횟수",
        json_schema_extra={"example": 20},
    )
    duration: int = Field(
        ...,
        description="운동 시간(초)",
        json_schema_extra={"example": 60},
    )
    calories: Decimal = Field(
        ...,
        description="소모 칼로리",
        json_schema_extra={"example": "13.50"},
    )
    score: int = Field(
        ...,
        description="운동 점수",
        json_schema_extra={"example": 95},
    )
    accuracy_avg: Decimal = Field(
        ...,
        description="평균 정확도",
        json_schema_extra={"example": "97.25"},
    )
    completed_at: datetime = Field(
        ...,
        description="운동 완료 시각",
        json_schema_extra={"example": "2026-03-26T10:30:00"},
    )


class CalendarResponse(BaseModel):
    exercised_dates: list[str] = Field(
        ...,
        description="해당 월에 운동한 날짜 목록(YYYY-MM-DD)",
        json_schema_extra={"example": ["2026-03-01", "2026-03-26"]},
    )
