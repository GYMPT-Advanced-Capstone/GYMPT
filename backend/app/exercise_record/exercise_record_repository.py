from datetime import date

from sqlalchemy import extract, func
from sqlalchemy.orm import Session, joinedload

from app.exercise_record.exercise_record_model import (
    ExerciseRecord,
    ExerciseRecordAnalysis,
    UserExerciseCalibration,
)


class ExerciseRecordRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, record: ExerciseRecord) -> ExerciseRecord:
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_by_id(self, record_id: int, user_id: int) -> ExerciseRecord | None:
        return (
            self.db.query(ExerciseRecord)
            .options(joinedload(ExerciseRecord.exercise), joinedload(ExerciseRecord.analysis))
            .filter(
                ExerciseRecord.id == record_id,
                ExerciseRecord.user_id == user_id,
            )
            .first()
        )

    def get_exercised_dates_by_month(
        self, user_id: int, year: int, month: int
    ) -> list[date]:
        rows = (
            self.db.query(func.date(ExerciseRecord.completed_at))
            .filter(
                ExerciseRecord.user_id == user_id,
                extract("year", ExerciseRecord.completed_at) == year,
                extract("month", ExerciseRecord.completed_at) == month,
            )
            .distinct()
            .order_by(func.date(ExerciseRecord.completed_at))
            .all()
        )
        return [row[0] for row in rows]

    def get_by_date(self, user_id: int, target_date: date) -> list[ExerciseRecord]:
        return (
            self.db.query(ExerciseRecord)
            .options(joinedload(ExerciseRecord.exercise), joinedload(ExerciseRecord.analysis))
            .filter(
                ExerciseRecord.user_id == user_id,
                func.date(ExerciseRecord.completed_at) == target_date,
            )
            .order_by(ExerciseRecord.completed_at)
            .all()
        )

    def get_calibration_by_id(
        self,
        user_id: int,
        calibration_id: int,
    ) -> UserExerciseCalibration | None:
        return (
            self.db.query(UserExerciseCalibration)
            .filter(
                UserExerciseCalibration.id == calibration_id,
                UserExerciseCalibration.user_id == user_id,
            )
            .first()
        )

    def create_analysis(self, analysis: ExerciseRecordAnalysis) -> ExerciseRecordAnalysis:
        self.db.add(analysis)
        self.db.commit()
        self.db.refresh(analysis)
        return analysis

    def update(
        self,
        record: ExerciseRecord,
        count: int | None,
        duration: int | None,
    ) -> ExerciseRecord:
        if count is not None:
            setattr(record, "count", count)
        if duration is not None:
            setattr(record, "duration", duration)
        self.db.commit()
        self.db.refresh(record)
        return record

    def delete(self, record: ExerciseRecord) -> None:
        self.db.delete(record)
        self.db.commit()
