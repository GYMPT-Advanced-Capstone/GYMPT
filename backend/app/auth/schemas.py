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


class CheckResponse(BaseModel):
    available: bool


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(..., min_length=8)


class EmailVerifyRequest(BaseModel):
    email: EmailStr


class EmailVerify(BaseModel):
    email: EmailStr
    code: str
