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


class LikeToggleResponse(BaseModel):
    board_no: int = Field(
        ...,
        description="좋아요를 누르거나 취소한 게시글 번호",
        json_schema_extra={"example": 1},
    )
    liked: bool = Field(
        ...,
        description="현재 사용자의 좋아요 상태 (true: 좋아요 등록, false: 좋아요 취소)",
        json_schema_extra={"example": True},
    )
    likes: int = Field(
        ...,
        description="좋아요 토글 후 게시글의 총 좋아요 수",
        json_schema_extra={"example": 6},
    )


class CommentCreateRequest(BaseModel):
    content: str = Field(
        ...,
        min_length=1,
        description="댓글 내용",
        json_schema_extra={"example": "좋은 글 감사합니다!"},
    )

    model_config = ConfigDict(
        json_schema_extra={"example": {"content": "좋은 글 감사합니다!"}}
    )


class CommentUpdateRequest(BaseModel):
    content: str = Field(
        ...,
        min_length=1,
        description="수정할 댓글 내용",
        json_schema_extra={"example": "수정된 댓글 내용입니다."},
    )

    model_config = ConfigDict(
        json_schema_extra={"example": {"content": "수정된 댓글 내용입니다."}}
    )


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    comment_no: int = Field(
        ...,
        description="댓글 번호",
        json_schema_extra={"example": 1},
    )
    content: str = Field(
        ...,
        description="댓글 내용",
        json_schema_extra={"example": "좋은 글 감사합니다!"},
    )
    create_at: datetime = Field(
        ...,
        description="댓글 작성 시각",
        json_schema_extra={"example": "2026-03-27T14:30:00"},
    )
    writer: str = Field(
        ...,
        description="댓글 작성자 닉네임",
        json_schema_extra={"example": "gympt_user"},
    )
    board_no: int = Field(
        ...,
        description="댓글이 작성된 게시글 번호",
        json_schema_extra={"example": 10},
    )


class BoardDetailResponse(BoardResponse):
    comments: list[CommentResponse] = Field(
        default_factory=list,
        description="해당 게시글의 댓글 목록",
    )


class CommentDeleteResponse(BaseModel):
    message: str = Field(
        ...,
        description="댓글 삭제 결과 메시지",
        json_schema_extra={"example": "댓글이 삭제되었습니다."},
    )
