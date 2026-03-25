from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ExerciseRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_id: int
    exercise_name: str
    count: int
    duration: int
    calories: Decimal
    score: int
    accuracy_avg: Decimal
    completed_at: datetime


class CalendarResponse(BaseModel):
    exercised_dates: list[str]  # "2024-03-01" 형식