from sqlalchemy.orm import Session

from app.board.models import Board


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
