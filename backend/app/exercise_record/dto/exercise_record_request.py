from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, field_validator


class ExerciseRecordCreateRequest(BaseModel):
    exercise_id: int
    count: int
    duration: int
    calories: Decimal
    score: int
    accuracy_avg: Decimal
    completed_at: datetime

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
    count: int | None = None
    duration: int | None = None

    @field_validator("count", "duration")
    @classmethod
    def must_be_positive(cls, v: int | None) -> int | None:
        if v is not None and v <= 0:
            raise ValueError("0보다 커야 합니다.")
        return v