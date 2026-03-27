from importlib import import_module

from sqlalchemy import select

from app.core.database import Base, get_engine, get_session_local
from app.exercise.exercise_model import Exercise


DEFAULT_EXERCISES = [
    {
        "id": 1,
        "name": "Push Up",
        "description": "가슴과 팔 근육을 사용하는 대표적인 맨몸 운동",
    },
    {
        "id": 2,
        "name": "Squat",
        "description": "하체와 코어를 강화하는 기본 스쿼트 운동",
    },
    {
        "id": 3,
        "name": "Lunge",
        "description": "균형감과 하체 근력을 함께 기르는 런지 운동",
    },
    {
        "id": 4,
        "name": "Plank",
        "description": "복부와 코어 안정성을 높이는 플랭크 운동",
    },
]


def seed_exercises() -> None:
    import_module("app.users.models")
    import_module("app.exercise.exercise_model")
    import_module("app.exercise_record.exercise_record_model")
    Base.metadata.create_all(bind=get_engine())

    SessionLocal = get_session_local()
    session = SessionLocal()
    try:
        existing_ids = {row[0] for row in session.execute(select(Exercise.id)).all()}
        missing_exercises = [
            Exercise(**exercise)
            for exercise in DEFAULT_EXERCISES
            if exercise["id"] not in existing_ids
        ]
        if not missing_exercises:
            return

        session.add_all(missing_exercises)
        session.commit()
    finally:
        session.close()


if __name__ == "__main__":
    seed_exercises()
