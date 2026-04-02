from pydantic import BaseModel, ConfigDict, Field


class ExerciseGoalSummaryItem(BaseModel):
    exercise_id: int = Field(
        ...,
        description="운동 종목 ID",
        json_schema_extra={"example": 1},
    )
    exercise_name: str = Field(
        ...,
        description="운동 이름",
        json_schema_extra={"example": "스쿼트"},
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
    today_count: int = Field(
        ...,
        description="오늘 완료한 횟수",
        json_schema_extra={"example": 5},
    )
    today_duration: int = Field(
        default=0,
        description="오늘 완료한 시간 (초)",
        json_schema_extra={"example": 60},
    )


class MainSummaryResponse(BaseModel):
    nickname: str = Field(
        ...,
        description="사용자 닉네임",
        json_schema_extra={"example": "짐피티"},
    )
    today_achievement_rate: float = Field(
        ...,
        description="오늘의 운동 달성률 (0~100)",
        json_schema_extra={"example": 50.0},
    )
    today_completed_count: int = Field(
        ...,
        description="오늘 완료한 운동 종류 수",
        json_schema_extra={"example": 1},
    )
    exercise_goals: list[ExerciseGoalSummaryItem] = Field(
        ...,
        description="운동 목표 목록 및 오늘 진행 현황",
    )
    weekly_workout_days: list[bool] = Field(
        ...,
        description="이번 주 운동 여부 (월~일, 7개)",
        json_schema_extra={"example": [True, False, True, False, False, False, False]},
    )
    badges: list[str] = Field(
        default_factory=list,
        description="획득한 배지 목록 (추후 연동 예정)",
        json_schema_extra={"example": []},
    )
    ai_comment: str | None = Field(
        default=None,
        description="AI PT 코멘트 (추후 연동 예정)",
        json_schema_extra={"example": None},
    )


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
