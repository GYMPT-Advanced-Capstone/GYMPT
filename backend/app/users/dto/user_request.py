from pydantic import BaseModel, Field


class ExerciseGoalCreateRequest(BaseModel):
    exercise_id: int = Field(
        ...,
        ge=1,
        description="운동 종목 ID",
        json_schema_extra={"example": 1},
    )
    daily_target_count: int | None = Field(
        default=None,
        ge=1,
        description="일일 목표 횟수",
        json_schema_extra={"example": 10},
    )
    daily_target_duration: int | None = Field(
        default=None,
        ge=1,
        description="일일 목표 시간 (초)",
        json_schema_extra={"example": 60},
    )
    threshold: float | None = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="정확도 임계값 (0~100)",
        json_schema_extra={"example": 80.0},
    )


class ExerciseGoalUpdateRequest(BaseModel):
    daily_target_count: int | None = Field(
        default=None,
        ge=1,
        description="수정할 일일 목표 횟수",
        json_schema_extra={"example": 15},
    )
    daily_target_duration: int | None = Field(
        default=None,
        ge=1,
        description="수정할 일일 목표 시간 (초)",
        json_schema_extra={"example": 90},
    )
    threshold: float | None = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="수정할 정확도 임계값 (0~100)",
        json_schema_extra={"example": 85.0},
    )
