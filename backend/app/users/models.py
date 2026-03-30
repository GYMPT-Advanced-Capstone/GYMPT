from sqlalchemy import (
    BigInteger,
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    DateTime,
    Date,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    pw = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    nickname = Column(String(100), unique=True, nullable=False)
    birth_date = Column(Date, nullable=True)
    weekly_target = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    exercise_records = relationship("ExerciseRecord", back_populates="user")
    exercise_goals = relationship("UserExerciseGoal", back_populates="user")


class UserExerciseGoal(Base):
    __tablename__ = "user_exercise_goal"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    exercise_id = Column(BigInteger, ForeignKey("exercises.id"), nullable=False)
    daily_target_count = Column(Integer, nullable=True)
    threshold = Column(Float, nullable=True)

    user = relationship("User", back_populates="exercise_goals")
    exercise = relationship("Exercise", back_populates="goals")
