from sqlalchemy import DECIMAL, BigInteger, Column, DateTime, ForeignKey, Integer, JSON
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
    score = Column(Integer, nullable=False)
    accuracy_avg = Column(DECIMAL(5, 2), nullable=False)  # type: ignore[var-annotated]
    completed_at = Column(DateTime, nullable=False, default=func.now())

    exercise = relationship("Exercise", back_populates="records")
    analysis = relationship(
        "ExerciseRecordAnalysis",
        back_populates="record",
        cascade="all, delete-orphan",
        uselist=False,
    )


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


class ExerciseRecordAnalysis(Base):
    __tablename__ = "exercise_record_analysis"

    id = Column(BigInteger, primary_key=True, index=True)
    exercise_record_id = Column(
        BigInteger,
        ForeignKey("exercise_records.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    calibration_id = Column(
        BigInteger,
        ForeignKey("user_exercise_calibrations.id"),
        nullable=True,
        index=True,
    )
    range_score = Column(Integer, nullable=False)
    extension_score = Column(Integer, nullable=False)
    stability_score = Column(Integer, nullable=False)
    range_summary_json = Column(JSON, nullable=False)
    feedback_summary_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())

    record = relationship("ExerciseRecord", back_populates="analysis")
    calibration = relationship("UserExerciseCalibration")
