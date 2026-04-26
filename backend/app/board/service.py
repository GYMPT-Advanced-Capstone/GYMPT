from __future__ import annotations

from datetime import datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.board import repository
from app.board.models import Board, BoardImage, Comment
from app.board.schemas import (
    BoardDetailResponse,
    BoardImageResponse,
    BoardResponse,
    CommentResponse,
)
from app.users.models import User


BASE_DIR = Path(__file__).resolve().parents[2]
BOARD_UPLOAD_DIR = BASE_DIR / "static" / "board"

MAX_BOARD_IMAGES = 5

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

    try:
        with save_path.open("wb") as file_obj:
            while chunk := image.file.read(8192):
                file_obj.write(chunk)
    except Exception:
        if save_path.exists():
            save_path.unlink()
        raise

    return f"/static/board/{filename}"


def _save_image_files(images: list[UploadFile]) -> list[str]:
    saved_paths: list[str] = []

    try:
        for image in images:
            saved_paths.append(_save_image_file(image))
    except Exception:
        _delete_image_files(saved_paths)
        raise

    return saved_paths


def _delete_image_file(imgpath: str | None) -> None:
    if not imgpath:
        return

    file_name = Path(imgpath).name
    file_path = BOARD_UPLOAD_DIR / file_name

    if file_path.exists():
        file_path.unlink()


def _delete_image_files(imgpaths: list[str]) -> None:
    for imgpath in imgpaths:
        _delete_image_file(imgpath)


def _normalize_upload_files(images: list[UploadFile] | None) -> list[UploadFile]:
    if not images:
        return []

    return [image for image in images if image.filename]


def _normalize_keep_image_ids(keep_image_ids: list[int] | None) -> list[int]:
    if not keep_image_ids:
        return []

    result: list[int] = []
    seen: set[int] = set()

    for image_id in keep_image_ids:
        if image_id not in seen:
            seen.add(image_id)
            result.append(image_id)

    return result


def _validate_max_image_count(count: int) -> None:
    if count > MAX_BOARD_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"게시글 이미지는 최대 {MAX_BOARD_IMAGES}장까지 업로드할 수 있습니다.",
        )


def _serialize_images(images: list[BoardImage]) -> list[BoardImageResponse]:
    return [
        BoardImageResponse(
            image_id=image.image_id,
            imgpath=image.imgpath,
            sort_order=image.sort_order,
        )
        for image in images
    ]


def _serialize_images_summary(images: list[BoardImage]) -> list[BoardImageResponse]:
    return _serialize_images(images[:1])


def _to_board_response(
    board: Board,
    writer: str,
    is_liked: bool,
    comments_count: int,
    *,
    summary: bool = False,
) -> BoardResponse:
    images = (
        _serialize_images_summary(board.images)
        if summary
        else _serialize_images(board.images)
    )

    return BoardResponse(
        board_no=board.board_no,
        title=board.title,
        content=board.content,
        images=images,
        writer=writer,
        likes=board.likes,
        upload_date=board.upload_date,
        is_liked=is_liked,
        comments_count=comments_count,
    )


def _reorder_images(board: Board) -> None:
    for index, image in enumerate(board.images, start=1):
        image.sort_order = index


def create_board_service(
    db: Session,
    current_user: User,
    title: str,
    content: str,
    images: list[UploadFile] | None = None,
) -> BoardResponse:
    upload_images = _normalize_upload_files(images)
    _validate_max_image_count(len(upload_images))

    saved_imgpaths = _save_image_files(upload_images)

    try:
        board = repository.create_board(
            db=db,
            title=title,
            content=content,
            writer_id=int(current_user.id),
            image_paths=saved_imgpaths,
        )
    except Exception:
        _delete_image_files(saved_imgpaths)
        raise

    return _to_board_response(
        board=board,
        writer=str(current_user.nickname),
        is_liked=False,
        comments_count=0,
    )


def update_board_service(
    db: Session,
    board_no: int,
    current_user: User,
    title: str,
    content: str,
    keep_image_ids: list[int] | None = None,
    new_images: list[UploadFile] | None = None,
) -> BoardResponse:
    board = repository.get_board_by_id_with_images(db=db, board_no=board_no)

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

    upload_images = _normalize_upload_files(new_images)
    keep_ids = _normalize_keep_image_ids(keep_image_ids)

    current_images_by_id = {image.image_id: image for image in board.images}

    invalid_keep_ids = [
        image_id for image_id in keep_ids if image_id not in current_images_by_id
    ]

    if invalid_keep_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유지 요청한 이미지 중 해당 게시글에 속하지 않은 이미지가 있습니다.",
        )

    final_image_count = len(keep_ids) + len(upload_images)
    _validate_max_image_count(final_image_count)

    keep_id_set = set(keep_ids)

    images_to_keep = [image for image in board.images if image.image_id in keep_id_set]

    images_to_delete = [
        image for image in board.images if image.image_id not in keep_id_set
    ]

    delete_imgpaths = [image.imgpath for image in images_to_delete]

    saved_imgpaths = _save_image_files(upload_images)

    try:
        board.title = title
        board.content = content

        for image in images_to_delete:
            board.images.remove(image)
            db.delete(image)

        board.images[:] = images_to_keep

        for imgpath in saved_imgpaths:
            board.images.append(
                BoardImage(
                    imgpath=imgpath,
                    sort_order=len(board.images) + 1,
                )
            )

        _reorder_images(board)

        updated_board = repository.update_board_with_images(
            db=db,
            board=board,
        )

    except Exception:
        _delete_image_files(saved_imgpaths)
        raise

    _delete_image_files(delete_imgpaths)

    is_liked = repository.is_board_liked_by_user(
        db=db,
        board_no=updated_board.board_no,
        user_id=int(current_user.id),
    )

    comments_count = repository.get_comment_count_by_board_no(
        db=db,
        board_no=updated_board.board_no,
    )

    return _to_board_response(
        board=updated_board,
        writer=str(current_user.nickname),
        is_liked=is_liked,
        comments_count=comments_count,
    )


def list_boards_service(
    db: Session,
    current_user: User,
) -> list[BoardResponse]:
    rows = repository.get_board_list(
        db=db,
        current_user_id=int(current_user.id),
    )

    return [
        _to_board_response(
            board=board,
            writer=nickname,
            is_liked=is_liked,
            comments_count=comments_count,
            summary=True,
        )
        for board, nickname, is_liked, comments_count in rows
    ]


def get_board_detail_service(
    db: Session,
    board_no: int,
    current_user: User,
) -> BoardDetailResponse:
    result = repository.get_board_detail(db=db, board_no=board_no)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다.",
        )

    board, nickname = result

    comments = [
        CommentResponse(
            comment_no=comment.comment_no,
            content=comment.content,
            create_at=comment.create_at,
            writer=comment_writer,
            board_no=comment.board_no,
        )
        for comment, comment_writer in repository.get_comments_by_board_no(
            db=db,
            board_no=board_no,
        )
    ]

    is_liked = repository.is_board_liked_by_user(
        db=db,
        board_no=board_no,
        user_id=int(current_user.id),
    )

    comments_count = repository.get_comment_count_by_board_no(
        db=db,
        board_no=board_no,
    )

    return BoardDetailResponse(
        board_no=board.board_no,
        title=board.title,
        content=board.content,
        images=_serialize_images(board.images),
        writer=nickname,
        likes=board.likes,
        upload_date=board.upload_date,
        is_liked=is_liked,
        comments_count=comments_count,
        comments=comments,
    )


def delete_board_service(
    db: Session,
    board_no: int,
    current_user: User,
) -> None:
    board = repository.get_board_by_id_with_images(db=db, board_no=board_no)

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

    image_paths = [image.imgpath for image in board.images]

    repository.delete_board(db=db, board=board)

    _delete_image_files(image_paths)


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
            repository.increment_board_likes(db=db, board_no=board_no)
            liked = True
        else:
            deleted_rows = repository.delete_like(db=db, like=existing_like)

            if deleted_rows > 0:
                repository.decrement_board_likes(db=db, board_no=board_no)

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
    board = repository.get_board_by_id(db=db, board_no=board_no)

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
    comment = repository.get_comment_by_id(db=db, comment_no=comment_no)

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
    comment = repository.get_comment_by_id(db=db, comment_no=comment_no)

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

    repository.delete_comment(db=db, comment=comment)
