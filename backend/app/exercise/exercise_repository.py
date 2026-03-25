from sqlalchemy.orm import Session

from app.exercise.exercise_model import Exercise


class ExerciseRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_all(self) -> list[Exercise]:
        return self.db.query(Exercise).order_by(Exercise.id).all()