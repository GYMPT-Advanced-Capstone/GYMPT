from sqlalchemy import case, select, update, func
from sqlalchemy.orm import Session

from app.board.models import Board, Comment, Like
from app.users.models import User


class BoardCommitError(Exception):
    pass


class BoardRefreshError(Exception):
    pass


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
    except Exception as exc:
        db.rollback()
        raise BoardCommitError from exc

    try:
        db.refresh(new_board)
    except Exception as exc:
        raise BoardRefreshError from exc

    return new_board


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
    except Exception as exc:
        db.rollback()
        raise BoardCommitError from exc

    try:
        db.refresh(board)
    except Exception as exc:
        raise BoardRefreshError from exc

    return board


def get_board_list(
    db: Session,
    current_user_id: int,
) -> list[tuple[Board, str, bool, int]]:
    liked_subquery = (
        select(Like.board_no.label("board_no"))
        .where(Like.writer_id == int(current_user_id)) 
        .subquery()
    )

    comments_count_subquery = (
        select(
            Comment.board_no.label("board_no"),
            func.count(Comment.comment_no).label("comments_count"),
        )
        .group_by(Comment.board_no)
        .subquery()
    )

    stmt = (
        select(
            Board,
            User.nickname,
            case(
                (liked_subquery.c.board_no.is_not(None), True),
                else_=False,
            ).label("is_liked"),
            func.coalesce(comments_count_subquery.c.comments_count, 0).label(
                "comments_count"
            ),
        )
        .join(User, Board.writer_id == User.id)
        .outerjoin(liked_subquery, liked_subquery.c.board_no == Board.board_no)
        .outerjoin(
            comments_count_subquery,
            comments_count_subquery.c.board_no == Board.board_no,
        )
        .order_by(Board.upload_date.desc(), Board.board_no.desc())
    )

    result = db.execute(stmt).all()
    return [
        (board, nickname, is_liked, comments_count)
        for board, nickname, is_liked, comments_count in result
    ]


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


def get_comments_by_board_no(db: Session, board_no: int) -> list[tuple[Comment, str]]:
    stmt = (
        select(Comment, User.nickname)
        .join(User, Comment.writer_id == User.id)
        .where(Comment.board_no == board_no)
        .order_by(Comment.create_at.asc(), Comment.comment_no.asc())
    )

    result = db.execute(stmt).all()
    return [(comment, nickname) for comment, nickname in result]


def get_comment_count_by_board_no(db: Session, board_no: int) -> int:
    stmt = select(func.count(Comment.comment_no)).where(Comment.board_no == board_no)
    result = db.execute(stmt).scalar_one()
    return int(result)


def is_board_liked_by_user(
    db: Session,
    board_no: int,
    user_id: int,
) -> bool:
    stmt = select(Like.likes_no).where(
        Like.board_no == board_no,
        Like.writer_id == user_id,
    )
    return db.execute(stmt).scalar_one_or_none() is not None


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
) -> int:
    result = (
        db.query(Like)
        .filter(Like.likes_no == like.likes_no)
        .delete(synchronize_session=False)
    )
    return result


def increment_board_likes(
    db: Session,
    board_no: int,
) -> None:
    db.execute(
        update(Board)
        .where(Board.board_no == board_no)
        .values({Board.likes: Board.likes + 1})
    )


def decrement_board_likes(
    db: Session,
    board_no: int,
) -> None:
    db.execute(
        update(Board)
        .where(Board.board_no == board_no)
        .values(
            {
                Board.likes: case(
                    (Board.likes > 0, Board.likes - 1),
                    else_=0,
                )
            }
        )
    )


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
