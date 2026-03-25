from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime, date


class UserBase(BaseModel):
    email: EmailStr
    name: str
    nickname: str


class UserResponse(UserBase):
    id: int
    birth_date: date | None
    weekly_target: int | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BirthDateUpdate(BaseModel):
    birth_date: date


class WeeklyTargetUpdate(BaseModel):
    weekly_target: int = Field(..., ge=1, le=7)
