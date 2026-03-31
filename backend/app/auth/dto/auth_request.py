from pydantic import BaseModel, EmailStr, Field

from app.users.schemas import UserBase


class SignupRequest(UserBase):
    pw: str = Field(
        ...,
        min_length=8,
        description="비밀번호 (최소 8자)",
        json_schema_extra={"example": "password123"},
    )


class LoginRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="이메일",
        json_schema_extra={"example": "user@example.com"},
    )
    pw: str = Field(
        ...,
        min_length=1,
        description="비밀번호",
        json_schema_extra={"example": "password123"},
    )


class LogoutRequest(BaseModel):
    refresh_token: str = Field(
        ...,
        description="리프레시 토큰",
        json_schema_extra={"example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
    )


class TokenRefreshRequest(BaseModel):
    refresh_token: str = Field(
        ...,
        description="리프레시 토큰",
        json_schema_extra={"example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
    )


class EmailVerifyRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="인증 코드를 받을 이메일",
        json_schema_extra={"example": "user@example.com"},
    )


class EmailVerifyConfirmRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="이메일",
        json_schema_extra={"example": "user@example.com"},
    )
    code: str = Field(
        ...,
        pattern=r"^\d{6}$",
        description="이메일로 받은 6자리 인증 코드",
        json_schema_extra={"example": "123456"},
    )


class PasswordResetRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="비밀번호를 재설정할 이메일",
        json_schema_extra={"example": "user@example.com"},
    )


class PasswordResetConfirmRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="이메일",
        json_schema_extra={"example": "user@example.com"},
    )
    code: str = Field(
        ...,
        pattern=r"^\d{6}$",
        description="이메일로 받은 6자리 인증 코드",
        json_schema_extra={"example": "123456"},
    )
    new_password: str = Field(
        ...,
        min_length=8,
        description="새 비밀번호 (최소 8자)",
        json_schema_extra={"example": "newpassword123"},
    )
