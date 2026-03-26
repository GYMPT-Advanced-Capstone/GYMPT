from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class ExerciseRecordCreateRequest(BaseModel):
    exercise_id: int = Field(
        ...,
        description="운동 종목 ID",
        json_schema_extra={"example": 1},
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
        json_schema_extra={"example": "13.5"},
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

    @field_validator("count", "duration", "score")
    @classmethod
    def must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("0보다 커야 합니다.")
        return v

    @field_validator("calories", "accuracy_avg")
    @classmethod
    def must_be_non_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("음수가 될 수 없습니다.")
        return v


class ExerciseRecordUpdateRequest(BaseModel):
    count: int | None = Field(
        default=None,
        description="수정할 운동 횟수",
        json_schema_extra={"example": 25},
    )
    duration: int | None = Field(
        default=None,
        description="수정할 운동 시간(초)",
        json_schema_extra={"example": 75},
    )

    @field_validator("count", "duration")
    @classmethod
    def must_be_positive(cls, v: int | None) -> int | None:
        if v is not None and v <= 0:
            raise ValueError("0보다 커야 합니다.")
        return v
