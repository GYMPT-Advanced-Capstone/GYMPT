from pydantic import BaseModel, ConfigDict, Field


class ExerciseGoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(
        ...,
        description="운동 목표 ID",
        json_schema_extra={"example": 1},
    )
    exercise_id: int = Field(
        ...,
        description="운동 종목 ID",
        json_schema_extra={"example": 1},
    )
    daily_target_count: int | None = Field(
        default=None,
        description="일일 목표 횟수",
        json_schema_extra={"example": 10},
    )
    daily_target_duration: int | None = Field(
        default=None,
        description="일일 목표 시간 (초)",
        json_schema_extra={"example": 60},
    )
    threshold: float | None = Field(
        default=None,
        description="정확도 임계값 (0~100)",
        json_schema_extra={"example": 80.0},
    )
