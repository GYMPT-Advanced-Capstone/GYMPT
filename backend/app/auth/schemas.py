from pydantic import BaseModel, EmailStr, Field
from app.users.schemas import UserBase


class UserCreate(UserBase):
    pw: str = Field(..., min_length=8)


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
