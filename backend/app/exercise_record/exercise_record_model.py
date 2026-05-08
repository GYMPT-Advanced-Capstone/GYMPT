from sqlalchemy import (
    DECIMAL,
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ExerciseRecord(Base):
    __tablename__ = "exercise_records"

    id = Column(BigInteger, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    user = relationship("User", back_populates="exercise_records")

    exercise_id = Column(BigInteger, ForeignKey("exercises.id"), nullable=False)
    count = Column(Integer, nullable=False)
    duration = Column(Integer, nullable=False)
    calories = Column(DECIMAL(6, 2), nullable=False)  # type: ignore[var-annotated]
    completed_at = Column(DateTime, nullable=False, default=func.now())
    ai_feedback = Column(Text, nullable=True)

    exercise = relationship("Exercise", back_populates="records")


class UserExerciseCalibration(Base):
    __tablename__ = "user_exercise_calibrations"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    exercise_id = Column(
        BigInteger, ForeignKey("exercises.id"), nullable=False, index=True
    )
    version = Column(Integer, nullable=False, default=1)
    metrics_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )

    exercise = relationship("Exercise")
