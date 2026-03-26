from app.exercise.exercise_repository import ExerciseRepository
from app.exercise.dto.exercise_response import ExerciseResponse


class ExerciseService:
    def __init__(self, repo: ExerciseRepository) -> None:
        self.repo = repo

    def get_all(self) -> list[ExerciseResponse]:
        return [ExerciseResponse.model_validate(e) for e in self.repo.get_all()]
