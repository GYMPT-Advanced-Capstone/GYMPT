from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.users.models import User
from app.board.dependencies import get_current_user
from app.board.schemas import BoardResponse
from app.board.service import create_board_service, update_board_service


router = APIRouter(prefix="/api/v1/board", tags=["Board"])


@router.post(
    "/",
    response_model=BoardResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_board(
    title: str = Form(...),
    content: str = Form(...),
    image: UploadFile | None = File(None),
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
    board_no: int,
    title: str | None = Form(None),
    content: str | None = Form(None),
    delete_image: bool = Form(False),
    image: UploadFile | None = File(None),
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
