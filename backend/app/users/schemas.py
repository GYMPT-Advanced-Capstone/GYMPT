from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime, date


class UserBase(BaseModel):
    email: EmailStr = Field(
        ...,
        description="이메일",
        json_schema_extra={"example": "user@example.com"},
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="이름",
        json_schema_extra={"example": "홍길동"},
    )
    nickname: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="닉네임",
        json_schema_extra={"example": "길동이"},
    )


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(
        ...,
        description="유저 ID",
        json_schema_extra={"example": 1},
    )
    birth_date: date | None = Field(
        default=None,
        description="생년월일",
        json_schema_extra={"example": "1999-01-01"},
    )
    weekly_target: int | None = Field(
        default=None,
        description="주간 운동 목표 횟수",
        json_schema_extra={"example": 3},
    )
    height: int | None = Field(
        default=None,
        description="키 (cm)",
        json_schema_extra={"example": 170},
    )
    weight: int | None = Field(
        default=None,
        description="몸무게 (kg)",
        json_schema_extra={"example": 65},
    )
    created_at: datetime = Field(
        ...,
        description="가입일시",
        json_schema_extra={"example": "2026-01-01T00:00:00"},
    )


class BirthDateUpdate(BaseModel):
    birth_date: date = Field(
        ...,
        description="생년월일",
        json_schema_extra={"example": "1999-01-01"},
    )


class WeeklyTargetUpdate(BaseModel):
    weekly_target: int = Field(
        ...,
        ge=1,
        le=7,
        description="주간 운동 목표 횟수 (1~7)",
        json_schema_extra={"example": 3},
    )


class BodyUpdate(BaseModel):
    height: int = Field(
        ...,
        ge=100,
        le=220,
        description="키 (cm)",
        json_schema_extra={"example": 170},
    )
    weight: int = Field(
        ...,
        ge=30,
        le=200,
        description="몸무게 (kg)",
        json_schema_extra={"example": 65},
    )
