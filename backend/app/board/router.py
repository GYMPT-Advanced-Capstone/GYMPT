from typing import Annotated

from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    Form,
    Path,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.board.dependencies import get_current_user
from app.board.schemas import (
    BoardDetailResponse,
    BoardResponse,
    CommentCreateRequest,
    CommentResponse,
    CommentUpdateRequest,
    LikeToggleResponse,
)
from app.board.service import (
    create_board_service,
    create_comment_service,
    delete_board_service,
    delete_comment_service,
    get_board_detail_service,
    list_boards_service,
    toggle_board_like_service,
    update_board_service,
    update_comment_service,
)
from app.core.database import get_db
from app.users.models import User


router = APIRouter(prefix="/api/v1/board", tags=["Board"])


@router.post(
    "/",
    response_model=BoardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="게시글 생성",
    description="게시글을 생성합니다. 이미지는 최대 5장까지 업로드할 수 있습니다.",
)
def create_board(
    title: str = Form(
        ...,
        description="게시글 제목",
        examples=["오늘 운동 인증합니다"],
    ),
    content: str = Form(
        ...,
        description="게시글 내용",
        examples=["스쿼트 100개 완료했습니다."],
    ),
    images: Annotated[
        list[UploadFile] | None,
        File(description="게시글 이미지 파일 목록"),
    ] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BoardResponse:
    return create_board_service(
        db=db,
        current_user=current_user,
        title=title,
        content=content,
        images=images,
    )


@router.patch(
    "/{board_no}",
    response_model=BoardResponse,
    status_code=status.HTTP_200_OK,
    summary="게시글 수정",
    description=(
        "게시글을 수정합니다. "
        "제목과 내용은 수정 여부와 관계없이 항상 전송해야 합니다. "
        "수정 후에도 유지할 기존 이미지 ID는 keep_image_ids로 보내고, "
        "새로 추가한 이미지는 new_images로 보냅니다."
    ),
)
def update_board(
    board_no: int = Path(
        ...,
        description="게시글 번호",
        examples=[1],
    ),
    title: str = Form(
        ...,
        description="게시글 제목",
        examples=["수정된 제목"],
    ),
    content: str = Form(
        ...,
        description="게시글 내용",
        examples=["수정된 내용입니다."],
    ),
    keep_image_ids: list[int] | None = Form(
        default=None,
        description=(
            "수정 후에도 유지할 기존 이미지 ID 목록입니다. "
            "기존 이미지를 유지하려면 해당 image_id를 반드시 보내야 합니다."
        ),
        examples=[[1, 2]],
    ),
    new_images: Annotated[
        list[UploadFile] | None,
        File(description="새로 추가할 이미지 파일 목록"),
    ] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BoardResponse:
    return update_board_service(
        db=db,
        board_no=board_no,
        current_user=current_user,
        title=title,
        content=content,
        keep_image_ids=keep_image_ids,
        new_images=new_images,
    )


@router.get(
    "/",
    response_model=list[BoardResponse],
    summary="게시글 목록 조회",
    description="게시글 목록을 조회합니다. 목록에서는 대표 이미지 1장만 반환합니다.",
)
def list_boards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BoardResponse]:
    return list_boards_service(
        db=db,
        current_user=current_user,
    )


@router.get(
    "/{board_no}",
    response_model=BoardDetailResponse,
    summary="게시글 상세 조회",
    description="게시글 상세 정보, 전체 이미지 목록, 댓글 목록을 조회합니다.",
)
def get_board_detail(
    board_no: int = Path(
        ...,
        description="게시글 번호",
        examples=[1],
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BoardDetailResponse:
    return get_board_detail_service(
        db=db,
        board_no=board_no,
        current_user=current_user,
    )


@router.delete(
    "/{board_no}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="게시글 삭제",
    description="로그인한 사용자가 본인이 작성한 게시글을 삭제합니다.",
)
def delete_board(
    board_no: int = Path(
        ...,
        description="게시글 번호",
        examples=[1],
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    delete_board_service(
        db=db,
        board_no=board_no,
        current_user=current_user,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{board_no}/likes",
    response_model=LikeToggleResponse,
    status_code=status.HTTP_200_OK,
    summary="게시글 좋아요 토글",
)
def toggle_board_like(
    board_no: int = Path(
        ...,
        description="게시글 번호",
        examples=[1],
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LikeToggleResponse:
    board, liked = toggle_board_like_service(
        db=db,
        board_no=board_no,
        current_user=current_user,
    )

    return LikeToggleResponse(
        board_no=board.board_no,
        liked=liked,
        likes=board.likes,
    )


@router.post(
    "/{board_no}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="댓글 작성",
)
def create_comment(
    board_no: int = Path(
        ...,
        description="게시글 번호",
        examples=[1],
    ),
    request: CommentCreateRequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CommentResponse:
    comment = create_comment_service(
        db=db,
        board_no=board_no,
        current_user=current_user,
        content=request.content,
    )

    return CommentResponse(
        comment_no=comment.comment_no,
        content=comment.content,
        create_at=comment.create_at,
        writer=str(current_user.nickname),
        board_no=comment.board_no,
    )


@router.patch(
    "/comments/{comment_no}",
    response_model=CommentResponse,
    status_code=status.HTTP_200_OK,
    summary="댓글 수정",
)
def update_comment(
    comment_no: int = Path(
        ...,
        description="댓글 번호",
        examples=[1],
    ),
    request: CommentUpdateRequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CommentResponse:
    comment = update_comment_service(
        db=db,
        comment_no=comment_no,
        current_user=current_user,
        content=request.content,
    )

    return CommentResponse(
        comment_no=comment.comment_no,
        content=comment.content,
        create_at=comment.create_at,
        writer=str(current_user.nickname),
        board_no=comment.board_no,
    )


@router.delete(
    "/comments/{comment_no}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="댓글 삭제",
)
def delete_comment(
    comment_no: int = Path(
        ...,
        description="댓글 번호",
        examples=[1],
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    delete_comment_service(
        db=db,
        comment_no=comment_no,
        current_user=current_user,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
