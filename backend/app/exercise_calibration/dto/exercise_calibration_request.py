from typing import Any

from pydantic import BaseModel, Field, field_validator


class ExerciseCalibrationCreateRequest(BaseModel):
    exercise_id: int = Field(
        ...,
        description="운동 종목 ID",
        json_schema_extra={"example": 1},
    )
    version: int = Field(
        default=1,
        description="캘리브레이션 스키마 버전",
        json_schema_extra={"example": 1},
    )
    metrics: dict[str, Any] = Field(
        ...,
        description="초기 가동범위 측정값",
        json_schema_extra={
            "example": {
                "exerciseType": "pushup",
                "side": "left",
                "bottom": {
                    "elbowAngle": 92.4,
                    "elbowShoulderDelta": 0.02,
                    "bodyLineAngle": 176.1,
                },
                "top": {
                    "elbowAngle": 168.8,
                    "bodyLineAngle": 177.5,
                },
                "holdDurationMs": 3000,
            }
        },
    )

    @field_validator("exercise_id", "version")
    @classmethod
    def must_be_positive(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("0보다 커야 합니다.")
        return value
