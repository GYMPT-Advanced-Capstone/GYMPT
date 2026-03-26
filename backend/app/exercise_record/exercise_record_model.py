from sqlalchemy import DECIMAL, BigInteger, Column, DateTime, ForeignKey, Integer
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
    calories = Column(DECIMAL(6, 2), nullable=False)
    score = Column(Integer, nullable=False)
    accuracy_avg = Column(DECIMAL(5, 2), nullable=False)
    completed_at = Column(DateTime, nullable=False, default=func.now())

    exercise = relationship("Exercise", back_populates="records")
