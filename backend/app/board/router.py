from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    UploadFile,
    status,
    Response,
    Path,
    Body,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.users.models import User
from app.board.dependencies import get_current_user
from app.board.schemas import (
    BoardResponse,
    LikeToggleResponse,
    CommentCreateRequest,
    CommentUpdateRequest,
    CommentResponse,
)
from app.board.service import (
    create_board_service,
    update_board_service,
    list_boards_service,
    get_board_detail_service,
    delete_board_service,
    toggle_board_like_service,
    create_comment_service,
    update_comment_service,
    delete_comment_service,
)


router = APIRouter(prefix="/api/v1/board", tags=["Board"])


@router.post(
    "/",
    response_model=BoardResponse,
    status_code=status.HTTP_201_CREATED,
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
    image: UploadFile | None = File(
        None,
        description="업로드할 게시글 이미지 파일",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    board = create_board_service(
        db=db,
        current_user=current_user,
        title=title,
        content=content,
        image=image,
    )

    return {
        "board_no": board.board_no,
        "title": board.title,
        "content": board.content,
        "imgpath": board.imgpath,
        "writer": current_user.nickname,
        "likes": board.likes,
        "upload_date": board.upload_date,
    }


@router.patch(
    "/{board_no}",
    response_model=BoardResponse,
    status_code=status.HTTP_200_OK,
)
def update_board(
    board_no: int = Path(
        ...,
        description="게시글 번호",
        examples=[1],
    ),
    title: str | None = Form(
        None,
        description="수정할 게시글 제목",
        examples=["수정된 제목"],
    ),
    content: str | None = Form(
        None,
        description="수정할 게시글 내용",
        examples=["수정된 내용입니다."],
    ),
    delete_image: bool = Form(
        False,
        description="기존 이미지 삭제 여부",
        examples=[True],
    ),
    image: UploadFile | None = File(
        None,
        description="새로 업로드할 게시글 이미지 파일",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    board = update_board_service(
        db=db,
        board_no=board_no,
        current_user=current_user,
        title=title,
        content=content,
        image=image,
        delete_image=delete_image,
    )

    return {
        "board_no": board.board_no,
        "title": board.title,
        "content": board.content,
        "imgpath": board.imgpath,
        "writer": current_user.nickname,
        "likes": board.likes,
        "upload_date": board.upload_date,
    }


@router.get("/", response_model=list[BoardResponse])
def list_boards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_boards_service(db)


@router.get("/{board_no}", response_model=BoardResponse)
def get_board_detail(
    board_no: int = Path(
        ...,
        description="게시글 번호",
        examples=[1],
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_board_detail_service(db=db, board_no=board_no)


@router.post(
    "/{board_no}/likes",
    response_model=LikeToggleResponse,
    status_code=status.HTTP_200_OK,
    summary="게시글 좋아요 토글",
    description=(
        "로그인한 사용자가 게시글 좋아요를 등록하거나 취소합니다. "
        "이미 좋아요를 누른 상태라면 취소되고, 누르지 않은 상태라면 등록됩니다."
    ),
)
def toggle_board_like(
    board_no: int = Path(
        ...,
        description="좋아요를 등록하거나 취소할 게시글 번호",
        examples=[1],
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    board, liked = toggle_board_like_service(
        db=db,
        board_no=board_no,
        current_user=current_user,
    )

    return {
        "board_no": board.board_no,
        "liked": liked,
        "likes": board.likes,
    }


@router.post(
    "/{board_no}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="댓글 작성",
    description="로그인한 사용자가 특정 게시글에 댓글을 작성합니다.",
)
def create_comment(
    board_no: int = Path(
        ...,
        description="댓글을 작성할 게시글 번호",
        examples=[1],
    ),
    request: CommentCreateRequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = create_comment_service(
        db=db,
        board_no=board_no,
        current_user=current_user,
        content=request.content,
    )

    return {
        "comment_no": comment.comment_no,
        "content": comment.content,
        "create_at": comment.create_at,
        "writer": current_user.nickname,
        "board_no": comment.board_no,
    }


@router.patch(
    "/comments/{comment_no}",
    response_model=CommentResponse,
    status_code=status.HTTP_200_OK,
    summary="댓글 수정",
    description="로그인한 사용자가 본인이 작성한 댓글을 수정합니다.",
)
def update_comment(
    comment_no: int = Path(
        ...,
        description="수정할 댓글 번호",
        examples=[1],
    ),
    request: CommentUpdateRequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = update_comment_service(
        db=db,
        comment_no=comment_no,
        current_user=current_user,
        content=request.content,
    )

    return {
        "comment_no": comment.comment_no,
        "content": comment.content,
        "create_at": comment.create_at,
        "writer": current_user.nickname,
        "board_no": comment.board_no,
    }


@router.delete(
    "/comments/{comment_no}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="댓글 삭제",
    description="로그인한 사용자가 본인이 작성한 댓글을 삭제합니다.",
)
def delete_comment(
    comment_no: int = Path(
        ...,
        description="삭제할 댓글 번호",
        examples=[1],
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_comment_service(
        db=db,
        comment_no=comment_no,
        current_user=current_user,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{board_no}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(
    board_no: int = Path(
        ...,
        description="삭제할 게시글 번호",
        examples=[1],
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_board_service(
        db=db,
        board_no=board_no,
        current_user=current_user,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
