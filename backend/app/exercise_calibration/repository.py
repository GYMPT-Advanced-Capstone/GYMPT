from sqlalchemy.orm import Session, joinedload

from app.exercise_record.exercise_record_model import UserExerciseCalibration


class ExerciseCalibrationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, calibration: UserExerciseCalibration) -> UserExerciseCalibration:
        self.db.add(calibration)
        self.db.commit()
        self.db.refresh(calibration)
        return calibration

    def get_latest(
        self,
        user_id: int,
        exercise_id: int,
    ) -> UserExerciseCalibration | None:
        return (
            self.db.query(UserExerciseCalibration)
            .options(joinedload(UserExerciseCalibration.exercise))
            .filter(
                UserExerciseCalibration.user_id == user_id,
                UserExerciseCalibration.exercise_id == exercise_id,
            )
            .order_by(UserExerciseCalibration.created_at.desc())
            .first()
        )
