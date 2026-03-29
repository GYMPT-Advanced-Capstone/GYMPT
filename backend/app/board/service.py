from datetime import datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.board import repository
from app.board.models import Board, Comment
from app.board.schemas import BoardResponse
from app.users.models import User


BASE_DIR = Path(__file__).resolve().parents[2]
BOARD_UPLOAD_DIR = BASE_DIR / "static" / "board"

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}


def _validate_image_file(image: UploadFile) -> None:
    extension = Path(image.filename or "").suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지원하지 않는 이미지 형식입니다.",
        )

    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지 파일만 업로드 가능합니다.",
        )


def _make_image_filename(image: UploadFile) -> str:
    original_name = Path(image.filename or "image").stem
    extension = Path(image.filename or "").suffix.lower()
    current_time = datetime.now().strftime("%Y%m%d%H%M%S%f")

    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="파일 확장자가 필요합니다.",
        )

    return f"{original_name}_{current_time}{extension}"


def _save_image_file(image: UploadFile) -> str:
    _validate_image_file(image)

    BOARD_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    filename = _make_image_filename(image)
    save_path = BOARD_UPLOAD_DIR / filename

    with save_path.open("wb") as f:
        while chunk := image.file.read(8192):
            f.write(chunk)

    return f"/static/board/{filename}"


def _delete_image_file(imgpath: str | None) -> None:
    if not imgpath:
        return

    file_name = Path(imgpath).name
    file_path = BOARD_UPLOAD_DIR / file_name

    if file_path.exists():
        file_path.unlink()


def create_board_service(
    db: Session,
    current_user: User,
    title: str,
    content: str,
    image: UploadFile | None = None,
) -> Board:
    imgpath = None
    created_imgpath = None

    if image is not None and image.filename:
        created_imgpath = _save_image_file(image)
        imgpath = created_imgpath

    user_id = int(current_user.id)

    try:
        return repository.create_board(
            db=db,
            title=title,
            content=content,
            imgpath=imgpath,
            writer_id=user_id,
        )
    except Exception:
        _delete_image_file(created_imgpath)
        raise


def update_board_service(
    db: Session,
    board_no: int,
    current_user: User,
    title: str | None = None,
    content: str | None = None,
    image: UploadFile | None = None,
    delete_image: bool = False,
) -> Board:
    board = repository.get_board_by_id(db, board_no)
    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다.",
        )

    if board.writer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 작성한 게시글만 수정할 수 있습니다.",
        )

    if image is not None and image.filename and delete_image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지 업로드와 삭제를 동시에 요청할 수 없습니다.",
        )

    old_imgpath = board.imgpath
    imgpath = old_imgpath
    new_imgpath = None

    if delete_image:
        imgpath = None
    elif image is not None and image.filename:
        new_imgpath = _save_image_file(image)
        imgpath = new_imgpath

    try:
        updated_board = repository.update_board(
            db=db,
            board=board,
            title=title,
            content=content,
            imgpath=imgpath,
        )
    except Exception:
        _delete_image_file(new_imgpath)
        raise

    if delete_image or new_imgpath is not None:
        _delete_image_file(old_imgpath)

    return updated_board


def list_boards_service(db: Session) -> list[BoardResponse]:
    rows = repository.get_board_list(db)

    return [
        BoardResponse(
            board_no=board.board_no,
            title=board.title,
            content=board.content,
            imgpath=board.imgpath,
            writer=nickname,
            likes=board.likes,
            upload_date=board.upload_date,
        )
        for board, nickname in rows
    ]


def get_board_detail_service(db: Session, board_no: int) -> BoardResponse:
    result = repository.get_board_detail(db=db, board_no=board_no)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다.",
        )

    board, nickname = result

    return BoardResponse(
        board_no=board.board_no,
        title=board.title,
        content=board.content,
        imgpath=board.imgpath,
        writer=nickname,
        likes=board.likes,
        upload_date=board.upload_date,
    )


def delete_board_service(
    db: Session,
    board_no: int,
    current_user: User,
) -> None:
    board = repository.get_board_by_id(db, board_no)

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다.",
        )

    if board.writer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 작성한 게시글만 삭제할 수 있습니다.",
        )

    old_imgpath = board.imgpath
    repository.delete_board(db=db, board=board)
    _delete_image_file(old_imgpath)


def toggle_board_like_service(
    db: Session,
    board_no: int,
    current_user: User,
) -> tuple[Board, bool]:
    board = repository.get_board_by_id(db, board_no)
    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다.",
        )

    existing_like = repository.get_like_by_writer_and_board(
        db=db,
        writer_id=int(current_user.id),
        board_no=board_no,
    )

    try:
        if existing_like is None:
            repository.create_like(
                db=db,
                writer_id=int(current_user.id),
                board_no=board_no,
            )
            board.likes += 1
            liked = True
        else:
            repository.delete_like(
                db=db,
                like=existing_like,
            )
            board.likes = max(board.likes - 1, 0)
            liked = False

        db.commit()
        db.refresh(board)

        return board, liked

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="좋아요 처리 중 충돌이 발생했습니다.",
        )
    except Exception:
        db.rollback()
        raise


def create_comment_service(
    db: Session,
    board_no: int,
    current_user: User,
    content: str,
) -> Comment:
    board = repository.get_board_by_id(db, board_no)
    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다.",
        )

    return repository.create_comment(
        db=db,
        content=content,
        writer_id=int(current_user.id),
        board_no=board_no,
    )


def update_comment_service(
    db: Session,
    comment_no: int,
    current_user: User,
    content: str,
) -> Comment:
    comment = repository.get_comment_by_id(db, comment_no)
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="댓글을 찾을 수 없습니다.",
        )

    if comment.writer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 작성한 댓글만 수정할 수 있습니다.",
        )

    return repository.update_comment(
        db=db,
        comment=comment,
        content=content,
    )


def delete_comment_service(
    db: Session,
    comment_no: int,
    current_user: User,
) -> None:
    comment = repository.get_comment_by_id(db, comment_no)
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="댓글을 찾을 수 없습니다.",
        )

    if comment.writer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 작성한 댓글만 삭제할 수 있습니다.",
        )

    repository.delete_comment(
        db=db,
        comment=comment,
    )
