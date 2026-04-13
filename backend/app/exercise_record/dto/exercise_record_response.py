from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ExerciseRecordAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="운동 분석 ID", json_schema_extra={"example": 1})
    calibration_id: int | None = Field(
        default=None,
        description="비교에 사용한 초기 가동범위 설정 ID",
        json_schema_extra={"example": 1},
    )
    range_score: int = Field(
        ...,
        description="가동범위 점수",
        json_schema_extra={"example": 82},
    )
    extension_score: int = Field(
        ...,
        description="신전 점수",
        json_schema_extra={"example": 94},
    )
    stability_score: int = Field(
        ...,
        description="자세 안정성 점수",
        json_schema_extra={"example": 88},
    )
    range_summary: dict[str, Any] = Field(
        ...,
        description="실제 수행 가동범위 요약",
        json_schema_extra={
            "example": {
                "rangeCompletionRate": 0.86,
                "topExtensionRate": 0.94,
                "bodyStabilityRate": 0.88,
            }
        },
    )
    feedback: list[str] = Field(
        ...,
        description="운동 완료 후 백엔드가 생성한 피드백 목록",
        json_schema_extra={"example": ["가동범위가 목표보다 약간 짧았습니다."]},
    )
    created_at: datetime = Field(..., description="분석 생성 시각")


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
    analysis: ExerciseRecordAnalysisResponse | None = Field(
        default=None,
        description="자세 분석 점수 및 요약",
    )


class CalendarResponse(BaseModel):
    exercised_dates: list[str] = Field(
        ...,
        description="해당 월에 운동한 날짜 목록(YYYY-MM-DD)",
        json_schema_extra={"example": ["2026-03-01", "2026-03-26"]},
    )
