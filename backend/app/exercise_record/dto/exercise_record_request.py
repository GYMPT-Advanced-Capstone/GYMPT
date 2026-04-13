from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field, field_validator


class ExerciseRepSummaryRequest(BaseModel):
    rep_index: int = Field(
        ...,
        description="반복 순번",
        json_schema_extra={"example": 1},
    )
    metrics: dict[str, Any] = Field(
        default_factory=dict,
        description="반복 1회에서 측정된 raw summary",
        json_schema_extra={
            "example": {
                "bottomElbowAngle": 97.0,
                "topElbowAngle": 163.0,
                "bodyLineAngle": 172.0,
            }
        },
    )

    @field_validator("rep_index")
    @classmethod
    def rep_index_must_be_positive(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("0보다 커야 합니다.")
        return value


class ExerciseRecordAnalysisCreateRequest(BaseModel):
    calibration_id: int | None = Field(
        default=None,
        description="운동에 사용한 초기 가동범위 설정 ID",
        json_schema_extra={"example": 1},
    )
    exercise_type: str | None = Field(
        default=None,
        description="운동 타입",
        json_schema_extra={"example": "pushup"},
    )
    reps: list[ExerciseRepSummaryRequest] = Field(
        ...,
        description="운동 종료 후 전송하는 반복별 raw summary",
        json_schema_extra={
            "example": [
                {
                    "rep_index": 1,
                    "metrics": {
                        "bottomElbowAngle": 97.0,
                        "topElbowAngle": 163.0,
                        "bodyLineAngle": 172.0,
                    },
                },
                {
                    "rep_index": 2,
                    "metrics": {
                        "bottomElbowAngle": 95.0,
                        "topElbowAngle": 164.0,
                        "bodyLineAngle": 173.0,
                    },
                },
            ]
        },
    )

    @field_validator("reps")
    @classmethod
    def reps_must_not_be_empty(
        cls, value: list[ExerciseRepSummaryRequest]
    ) -> list[ExerciseRepSummaryRequest]:
        if not value:
            raise ValueError("reps는 최소 1개 이상이어야 합니다.")
        return value


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
