from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.users.models import User


class Board(Base):
    __tablename__ = "board"

    board_no: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    upload_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    likes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    imgpath: Mapped[str | None] = mapped_column(String(255), nullable=True)

    writer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )

    writer: Mapped[User] = relationship("User", backref="boards")
    like_users: Mapped[list["Like"]] = relationship(
        "Like",
        back_populates="board",
        cascade="all, delete-orphan",
    )
    comments: Mapped[list["Comment"]] = relationship(
        "Comment",
        back_populates="board",
        cascade="all, delete-orphan",
    )


class Like(Base):
    __tablename__ = "likes"
    __table_args__ = (
        UniqueConstraint("writer_id", "board_no", name="uq_likes_writer_board"),
    )

    likes_no: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )
    writer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    board_no: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("board.board_no", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )

    user: Mapped[User] = relationship("User", backref="board_likes")
    board: Mapped[Board] = relationship("Board", back_populates="like_users")


class Comment(Base):
    __tablename__ = "comment"

    comment_no: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    create_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    writer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    board_no: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("board.board_no", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )

    writer: Mapped[User] = relationship("User", backref="comments")
    board: Mapped[Board] = relationship("Board", back_populates="comments")
