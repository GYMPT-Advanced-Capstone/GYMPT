from pydantic import BaseModel, Field


class TokenResponse(BaseModel):
    success: bool = Field(
        ...,
        description="요청 성공 여부",
        json_schema_extra={"example": True},
    )
    message: str = Field(
        ...,
        description="응답 메시지",
        json_schema_extra={"example": "로그인 성공"},
    )
    token_type: str = Field(
        ...,
        description="토큰 타입",
        json_schema_extra={"example": "Bearer"},
    )
    access_token: str = Field(
        ...,
        description="액세스 토큰 (유효기간 30분)",
        json_schema_extra={"example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
    )
    refresh_token: str = Field(
        ...,
        description="리프레시 토큰 (유효기간 14일)",
        json_schema_extra={"example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
    )


class CheckResponse(BaseModel):
    available: bool = Field(
        ...,
        description="사용 가능 여부",
        json_schema_extra={"example": True},
    )
