from app.pose.lunge_feedback import (
    LUNGE_DEPTH_MESSAGE,
    LUNGE_GOOD_MESSAGE,
    LUNGE_TOO_DEEP_MESSAGE,
    LUNGE_VIEW_MESSAGE,
    LungeFeedbackProcessor,
)
from app.pose.pose_service import PoseFeedbackService


def _top_landmarks():
    landmarks = [{"x": 0.0, "y": 0.0, "visibility": 0.0}] * 33
    landmarks[11] = {"x": 0.40, "y": 0.30, "visibility": 0.99}
    landmarks[23] = {"x": 0.42, "y": 0.55, "visibility": 0.99}
    landmarks[25] = {"x": 0.43, "y": 0.80, "visibility": 0.99}
    landmarks[27] = {"x": 0.44, "y": 0.95, "visibility": 0.99}
    landmarks[31] = {"x": 0.46, "y": 0.98, "visibility": 0.99}
    return landmarks


def _bottom_landmarks():
    landmarks = [{"x": 0.0, "y": 0.0, "visibility": 0.0}] * 33
    landmarks[11] = {"x": 0.25, "y": 0.35, "visibility": 0.99}
    landmarks[23] = {"x": 0.35, "y": 0.72, "visibility": 0.99}
    landmarks[25] = {"x": 0.44, "y": 0.70, "visibility": 0.99}
    landmarks[27] = {"x": 0.48, "y": 0.95, "visibility": 0.99}
    landmarks[31] = {"x": 0.46, "y": 0.98, "visibility": 0.99}
    return landmarks


def test_lunge_pose_service_counts_rep_and_builds_summary():
    service = PoseFeedbackService()
    state = service.create_session(goal_count=10)
    calibration = {
        "exerciseType": "lunge",
        "top": {"kneeAngle": 170.0, "hipAngle": 165.0, "torsoLeanAngle": 20.0},
        "bottom": {"kneeAngle": 85.0, "hipAngle": 95.0, "torsoLeanAngle": 28.0},
    }

    first = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "lunge",
            "timestampMs": 1000,
            "goalCount": 10,
            "calibrationMetrics": calibration,
            "landmarks": _top_landmarks(),
        },
    )
    assert first["fullRepCount"] == 0
    assert first["exerciseType"] == "lunge"
    assert first["feedbackMessage"] == LUNGE_GOOD_MESSAGE

    second = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "lunge",
            "timestampMs": 1150,
            "landmarks": _bottom_landmarks(),
        },
    )
    assert second["movementZone"] == "bottom"

    third = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "lunge",
            "timestampMs": 1400,
            "landmarks": _top_landmarks(),
        },
    )
    assert third["repCompleted"] is True
    assert third["fullRepCount"] == 1
    assert "repSummary" in third
    assert third["representativeFeedbackMessage"] == LUNGE_GOOD_MESSAGE


def test_lunge_pose_service_reuses_session_exercise_type_when_payload_omits_it():
    service = PoseFeedbackService()
    state = service.create_session(goal_count=10)

    service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "lunge",
            "timestampMs": 1000,
            "landmarks": [],
        },
    )
    response = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "timestampMs": 1100,
            "landmarks": [],
        },
    )

    assert response["feedbackMessage"] == LUNGE_VIEW_MESSAGE


def test_lunge_bottom_calibration_ignores_extra_flexibility_only():
    processor = LungeFeedbackProcessor()

    assert processor._resolve_bottom_knee_angle(None) == 90.0
    assert processor._resolve_bottom_hip_angle(None) == 95.0
    assert processor._resolve_bottom_knee_angle(70.0) == 90.0
    assert processor._resolve_bottom_hip_angle(80.0) == 95.0
    assert processor._resolve_bottom_knee_angle(115.0) == 115.0
    assert processor._resolve_bottom_hip_angle(120.0) == 120.0


def test_lunge_depth_feedback_uses_ideal_angle_for_flexible_user():
    processor = LungeFeedbackProcessor()
    calibration = {
        "top": {"kneeAngle": 170.0, "hipAngle": 165.0},
        "bottom": {"kneeAngle": 70.0, "hipAngle": 80.0},
    }

    warning_code, warning_message = processor._resolve_depth_warning(
        {
            "kneeAngle": 50.0,
            "hipAngle": 55.0,
            "depthProgress": 1.0,
        },
        calibration,
        require_depth=True,
    )

    assert warning_code == "depth_high"
    assert warning_message == LUNGE_TOO_DEEP_MESSAGE


def test_lunge_depth_feedback_relaxes_for_less_flexible_user():
    processor = LungeFeedbackProcessor()
    calibration = {
        "top": {"kneeAngle": 170.0, "hipAngle": 165.0},
        "bottom": {"kneeAngle": 115.0, "hipAngle": 120.0},
    }

    warning_code, warning_message = processor._resolve_depth_warning(
        {
            "kneeAngle": 105.0,
            "hipAngle": 110.0,
            "depthProgress": 0.8,
        },
        calibration,
        require_depth=True,
    )

    assert warning_code == "depth_low"
    assert warning_message == LUNGE_DEPTH_MESSAGE
