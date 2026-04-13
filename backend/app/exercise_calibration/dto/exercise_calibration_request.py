from typing import Any

from pydantic import BaseModel, Field, field_validator


class ExerciseCalibrationSampleRequest(BaseModel):
    phase: str = Field(
        ...,
        description="캘리브레이션 단계 이름",
        json_schema_extra={"example": "bottom"},
    )
    metrics: dict[str, Any] = Field(
        default_factory=dict,
        description="해당 단계에서 수집된 raw 측정값",
        json_schema_extra={
            "example": {
                "elbowAngle": 92.4,
                "elbowShoulderDelta": 0.02,
                "bodyLineAngle": 176.1,
            }
        },
    )

    @field_validator("phase")
    @classmethod
    def phase_must_not_be_blank(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("phase는 비어 있을 수 없습니다.")
        return normalized


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
    exercise_type: str = Field(
        ...,
        description="운동 타입",
        json_schema_extra={"example": "pushup"},
    )
    side: str | None = Field(
        default=None,
        description="측정 기준 방향",
        json_schema_extra={"example": "left"},
    )
    hold_duration_ms: int = Field(
        ...,
        description="캘리브레이션 자세 유지 시간(ms)",
        json_schema_extra={"example": 3000},
    )
    samples: list[ExerciseCalibrationSampleRequest] = Field(
        default_factory=list,
        description="단계별 raw 측정값 목록",
        json_schema_extra={
            "example": [
                {
                    "phase": "bottom",
                    "metrics": {
                        "elbowAngle": 92.4,
                        "elbowShoulderDelta": 0.02,
                        "bodyLineAngle": 176.1,
                    },
                },
                {
                    "phase": "top",
                    "metrics": {
                        "elbowAngle": 168.8,
                        "bodyLineAngle": 177.5,
                    },
                },
            ]
        },
    )

    @field_validator("exercise_id", "version", "hold_duration_ms")
    @classmethod
    def must_be_positive(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("0보다 커야 합니다.")
        return value
