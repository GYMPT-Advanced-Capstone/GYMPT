from fastapi import APIRouter, Depends, File, Form, UploadFile, status, Response, Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.users.models import User
from app.board.dependencies import get_current_user
from app.board.schemas import BoardResponse
from app.board.service import (
    create_board_service,
    update_board_service,
    list_boards_service,
    get_board_detail_service,
    delete_board_service,
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
