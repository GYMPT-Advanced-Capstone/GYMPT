from datetime import datetime
from types import SimpleNamespace

from app.exercise_calibration.dto.exercise_calibration_request import (
    ExerciseCalibrationCreateRequest,
)
from app.exercise_calibration.service import ExerciseCalibrationService


class FakeExerciseCalibrationRepo:
    def __init__(self):
        self.created_calibration = None

    def create(self, calibration):
        calibration.id = 10
        calibration.exercise = SimpleNamespace(name="Push Up")
        calibration.created_at = datetime(2026, 4, 13, 10, 30, 0)
        calibration.updated_at = datetime(2026, 4, 13, 10, 30, 0)
        self.created_calibration = calibration
        return calibration

    def get_latest(self, user_id, exercise_id):
        return self.created_calibration


def test_exercise_calibration_service_builds_metrics_from_samples():
    repo = FakeExerciseCalibrationRepo()
    service = ExerciseCalibrationService(repo)

    result = service.create(
        7,
        ExerciseCalibrationCreateRequest(
            exercise_id=1,
            version=1,
            exercise_type="pushup",
            side="left",
            hold_duration_ms=3000,
            samples=[
                {
                    "phase": "bottom",
                    "metrics": {
                        "elbowAngle": 92.0,
                        "elbowShoulderDelta": 0.01,
                        "bodyLineAngle": 176.0,
                    },
                },
                {
                    "phase": "bottom",
                    "metrics": {
                        "elbowAngle": 94.0,
                        "elbowShoulderDelta": 0.03,
                        "bodyLineAngle": 174.0,
                    },
                },
                {
                    "phase": "top",
                    "metrics": {
                        "elbowAngle": 168.0,
                        "bodyLineAngle": 177.0,
                    },
                },
            ],
        ),
    )

    assert repo.created_calibration is not None
    assert repo.created_calibration.metrics_json == {
        "exerciseType": "pushup",
        "side": "left",
        "holdDurationMs": 3000,
        "bottom": {
            "elbowAngle": 93.0,
            "elbowShoulderDelta": 0.02,
            "bodyLineAngle": 175.0,
        },
        "top": {
            "elbowAngle": 168.0,
            "bodyLineAngle": 177.0,
        },
    }
    assert result.metrics == repo.created_calibration.metrics_json
