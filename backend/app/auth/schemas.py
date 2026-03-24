from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime, date


class UserBase(BaseModel):
    email: EmailStr
    name: str
    nickname: str


class UserCreate(UserBase):
    pw: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    nickname: str
    birth_date: date | None
    weekly_target: int | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BirthDateUpdate(BaseModel):
    birth_date: date


class WeeklyTargetUpdate(BaseModel):
    weekly_target: int = Field(..., ge=1, le=7)


class UserLogin(BaseModel):
    email: EmailStr
    pw: str


class UserLogout(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    success: bool
    message: str
    token_type: str
    access_token: str
    refresh_token: str
