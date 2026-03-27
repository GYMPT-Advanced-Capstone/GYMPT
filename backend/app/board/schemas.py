from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class BoardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    board_no: int = Field(
        ...,
        description="게시글 번호",
        json_schema_extra={"example": 1},
    )
    title: str = Field(
        ...,
        description="게시글 제목",
        json_schema_extra={"example": "오늘 운동 인증합니다"},
    )
    content: str = Field(
        ...,
        description="게시글 내용",
        json_schema_extra={"example": "스쿼트 100개 완료했습니다."},
    )
    imgpath: str | None = Field(
        None,
        description="게시글 이미지 경로",
        json_schema_extra={"example": "/static/board/workout_image_20260327103000.jpg"},
    )
    writer: str = Field(
        ...,
        description="작성자 닉네임",
        json_schema_extra={"example": "gympt_user"},
    )
    likes: int = Field(
        ...,
        description="게시글 좋아요 수",
        json_schema_extra={"example": 5},
    )
    upload_date: datetime = Field(
        ...,
        description="게시글 작성 시각",
        json_schema_extra={"example": "2026-03-27T10:30:00"},
    )
