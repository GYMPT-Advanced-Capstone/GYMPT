from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field, field_validator


class ExerciseRecordAnalysisCreateRequest(BaseModel):
    calibration_id: int | None = Field(
        default=None,
        description="운동에 사용한 초기 가동범위 설정 ID",
        json_schema_extra={"example": 1},
    )
    range_summary: dict[str, Any] = Field(
        default_factory=dict,
        description="실제 수행 가동범위 요약값",
        json_schema_extra={
            "example": {
                "rangeCompletionRate": 0.86,
                "topExtensionRate": 0.94,
                "bodyStabilityRate": 0.88,
            }
        },
    )
    feedback_summary: dict[str, Any] = Field(
        default_factory=dict,
        description="운동 완료 후 피드백 요약",
        json_schema_extra={
            "example": {
                "items": [
                    "초기 설정 범위 대비 내려가는 깊이가 약간 부족했습니다.",
                    "몸통 정렬은 안정적이었습니다.",
                ]
            }
        },
    )


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
    analysis: ExerciseRecordAnalysisCreateRequest | None = Field(
        default=None,
        description="자세 분석 점수 계산에 사용할 선택 분석 요약",
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
