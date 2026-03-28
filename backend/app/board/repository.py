from sqlalchemy import select
from sqlalchemy.orm import Session

from app.board.models import Board, Comment, Like
from app.users.models import User


def get_board_by_id(db: Session, board_no: int) -> Board | None:
    return db.query(Board).filter(Board.board_no == board_no).first()


def create_board(
    db: Session,
    title: str,
    content: str,
    imgpath: str | None,
    writer_id: int,
) -> Board:
    new_board = Board(
        title=title,
        content=content,
        imgpath=imgpath,
        writer_id=writer_id,
    )

    try:
        db.add(new_board)
        db.commit()
        db.refresh(new_board)
        return new_board
    except Exception:
        db.rollback()
        raise


def update_board(
    db: Session,
    board: Board,
    title: str | None,
    content: str | None,
    imgpath: str | None,
) -> Board:
    if title is not None:
        board.title = title
    if content is not None:
        board.content = content

    board.imgpath = imgpath

    try:
        db.commit()
        db.refresh(board)
        return board
    except Exception:
        db.rollback()
        raise


def get_board_list(db: Session) -> list[tuple[Board, str]]:
    stmt = (
        select(Board, User.nickname)
        .join(User, Board.writer_id == User.id)
        .order_by(Board.upload_date.desc(), Board.board_no.desc())
    )

    result = db.execute(stmt).all()
    rows = [(board, nickname) for board, nickname in result]

    return rows


def get_board_detail(db: Session, board_no: int) -> tuple[Board, str] | None:
    stmt = (
        select(Board, User.nickname)
        .join(User, Board.writer_id == User.id)
        .where(Board.board_no == board_no)
    )

    row = db.execute(stmt).tuples().first()

    if row is None:
        return None

    board, nickname = row
    return board, nickname


def delete_board(db: Session, board: Board) -> None:
    try:
        db.delete(board)
        db.commit()
    except Exception:
        db.rollback()
        raise


def get_like_by_writer_and_board(
    db: Session,
    writer_id: int,
    board_no: int,
) -> Like | None:
    stmt = select(Like).where(
        Like.writer_id == writer_id,
        Like.board_no == board_no,
    )

    return db.execute(stmt).scalar_one_or_none()


def create_like(
    db: Session,
    writer_id: int,
    board_no: int,
) -> Like:
    new_like = Like(
        writer_id=writer_id,
        board_no=board_no,
    )
    db.add(new_like)
    return new_like


def delete_like(
    db: Session,
    like: Like,
) -> None:
    db.delete(like)


def get_comment_by_id(db: Session, comment_no: int) -> Comment | None:
    stmt = select(Comment).where(Comment.comment_no == comment_no)
    return db.execute(stmt).scalar_one_or_none()


def create_comment(
    db: Session,
    content: str,
    writer_id: int,
    board_no: int,
) -> Comment:
    new_comment = Comment(
        content=content,
        writer_id=writer_id,
        board_no=board_no,
    )

    try:
        db.add(new_comment)
        db.commit()
        db.refresh(new_comment)
        return new_comment
    except Exception:
        db.rollback()
        raise


def update_comment(
    db: Session,
    comment: Comment,
    content: str,
) -> Comment:
    comment.content = content

    try:
        db.commit()
        db.refresh(comment)
        return comment
    except Exception:
        db.rollback()
        raise


def delete_comment(
    db: Session,
    comment: Comment,
) -> None:
    try:
        db.delete(comment)
        db.commit()
    except Exception:
        db.rollback()
        raise
