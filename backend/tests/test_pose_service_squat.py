from types import SimpleNamespace

from app.pose.pose_service import PoseFeedbackService
from app.pose.squat_feedback import SquatFeedbackProcessor


def test_squat_pose_service_counts_rep_and_builds_summary():
    service = PoseFeedbackService()
    state = service.create_session(goal_count=10)

    calibration = {
        "exerciseType": "squat",
        "top": {"kneeAngle": 170.0, "hipAngle": 165.0, "torsoLeanAngle": 20.0},
        "bottom": {"kneeAngle": 85.0, "hipAngle": 95.0, "torsoLeanAngle": 28.0},
    }

    top_landmarks = [{"x": 0.0, "y": 0.0, "visibility": 0.0}] * 33
    top_landmarks[11] = {"x": 0.40, "y": 0.30, "visibility": 0.99}
    top_landmarks[23] = {"x": 0.42, "y": 0.55, "visibility": 0.99}
    top_landmarks[25] = {"x": 0.43, "y": 0.80, "visibility": 0.99}
    top_landmarks[27] = {"x": 0.44, "y": 0.95, "visibility": 0.99}
    top_landmarks[31] = {"x": 0.46, "y": 0.98, "visibility": 0.99}

    bottom_landmarks = [{"x": 0.0, "y": 0.0, "visibility": 0.0}] * 33
    bottom_landmarks[11] = {"x": 0.25, "y": 0.35, "visibility": 0.99}
    bottom_landmarks[23] = {"x": 0.35, "y": 0.72, "visibility": 0.99}
    bottom_landmarks[25] = {"x": 0.44, "y": 0.70, "visibility": 0.99}
    bottom_landmarks[27] = {"x": 0.48, "y": 0.95, "visibility": 0.99}
    bottom_landmarks[31] = {"x": 0.46, "y": 0.98, "visibility": 0.99}

    first = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "squat",
            "timestampMs": 1000,
            "goalCount": 10,
            "calibrationMetrics": calibration,
            "landmarks": top_landmarks,
        },
    )
    assert first["fullRepCount"] == 0
    assert first["exerciseType"] == "squat"
    assert first["feedbackMessage"] == "좋은 자세예요."

    second = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "squat",
            "timestampMs": 1150,
            "landmarks": bottom_landmarks,
        },
    )
    assert second["movementZone"] == "bottom"

    third = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "squat",
            "timestampMs": 1400,
            "landmarks": top_landmarks,
        },
    )
    assert third["repCompleted"] is True
    assert third["fullRepCount"] == 1
    assert "repSummary" in third
    assert third["representativeFeedbackMessage"] == "좋은 자세예요."


def test_squat_pose_service_returns_korean_visibility_feedback():
    service = PoseFeedbackService()
    state = service.create_session(goal_count=10)

    response = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "squat",
            "timestampMs": 1000,
            "landmarks": [],
        },
    )

    assert response["status"] == "insufficient_visibility"
    assert response["feedbackMessage"] == "몸의 측면 관절이 보이도록 카메라와 몸을 맞춰주세요."


def test_squat_torso_lean_feedback_is_relaxed_for_natural_hip_hinge():
    processor = SquatFeedbackProcessor()
    calibration = {
        "top": {"torsoLeanAngle": 20.0},
        "bottom": {"torsoLeanAngle": 28.0},
    }

    warning_code, _ = processor._resolve_warning(
        {
            "torsoLeanAngle": 54.0,
            "kneeAnkleOffsetX": 0.03,
        },
        calibration,
    )
    assert warning_code is None

    warning_code, _ = processor._resolve_warning(
        {
            "torsoLeanAngle": 60.0,
            "kneeAnkleOffsetX": 0.03,
        },
        calibration,
    )
    assert warning_code == "torso_lean"


def test_squat_representative_feedback_prioritizes_lower_body_over_torso():
    processor = SquatFeedbackProcessor()
    state = SimpleNamespace(
        current_rep_max_depth=1.0,
        current_rep_warning_counts={"torso_lean": 5, "knee_track": 1},
    )

    representative_code, _ = processor._resolve_representative_feedback(state)

    assert representative_code == "knee_track"


def test_squat_depth_feedback_uses_calibrated_bottom_range():
    processor = SquatFeedbackProcessor()
    calibration = {
        "top": {"kneeAngle": 170.0, "hipAngle": 165.0},
        "bottom": {"kneeAngle": 85.0, "hipAngle": 95.0},
    }

    warning_code, _ = processor._resolve_warning(
        {
            "kneeAngle": 105.0,
            "hipAngle": 112.0,
            "torsoLeanAngle": 30.0,
            "kneeAnkleOffsetX": 0.03,
            "depthProgress": 0.56,
        },
        calibration,
    )
    assert warning_code == "depth_low"

    warning_code, _ = processor._resolve_warning(
        {
            "kneeAngle": 45.0,
            "hipAngle": 55.0,
            "torsoLeanAngle": 30.0,
            "kneeAnkleOffsetX": 0.03,
            "depthProgress": 1.0,
        },
        calibration,
    )
    assert warning_code == "depth_high"

    warning_code, _ = processor._resolve_warning(
        {
            "kneeAngle": 45.0,
            "hipAngle": 95.0,
            "torsoLeanAngle": 30.0,
            "kneeAnkleOffsetX": 0.03,
            "depthProgress": 1.0,
        },
        calibration,
    )
    assert warning_code is None


def test_squat_representative_feedback_requires_calibrated_depth():
    processor = SquatFeedbackProcessor()
    state = SimpleNamespace(
        current_rep_max_depth=0.56,
        current_rep_warning_counts={},
    )

    representative_code, _ = processor._resolve_representative_feedback(state)

    assert representative_code == "depth_low"


def test_squat_in_progress_shallow_depth_does_not_say_good():
    processor = SquatFeedbackProcessor()
    calibration = {
        "top": {"kneeAngle": 170.0, "hipAngle": 165.0},
        "bottom": {"kneeAngle": 85.0, "hipAngle": 95.0},
    }

    warning_code, warning_message = processor._resolve_warning(
        {
            "kneeAngle": 120.0,
            "hipAngle": 130.0,
            "torsoLeanAngle": 30.0,
            "kneeAnkleOffsetX": 0.03,
            "depthProgress": 0.45,
        },
        calibration,
        require_depth=True,
    )

    assert warning_code == "depth_low"
    assert warning_message != "좋은 자세예요."


def test_squat_representative_feedback_ignores_transient_depth_low_after_good_depth():
    processor = SquatFeedbackProcessor()
    state = SimpleNamespace(
        current_rep_max_depth=1.0,
        current_rep_warning_counts={"depth_low": 3},
    )

    representative_code, representative_message = processor._resolve_representative_feedback(state)

    assert representative_code == "good"
    assert representative_message == "좋은 자세예요."


def test_squat_representative_feedback_requires_deeper_good_depth():
    processor = SquatFeedbackProcessor()
    state = SimpleNamespace(
        current_rep_max_depth=0.60,
        current_rep_warning_counts={},
    )

    representative_code, _ = processor._resolve_representative_feedback(state)

    assert representative_code == "depth_low"


def test_squat_bottom_knee_calibration_floors_overly_deep_angle_only():
    processor = SquatFeedbackProcessor()

    assert processor._floor_bottom_knee_angle(70.0) == 90.0
    assert processor._floor_bottom_knee_angle(95.0) == 95.0
    assert processor._floor_bottom_knee_angle(120.0) == 120.0


def test_squat_depth_uses_clamped_bottom_knee_angle():
    processor = SquatFeedbackProcessor()
    calibration = {
        "top": {"kneeAngle": 170.0, "hipAngle": 165.0},
        "bottom": {"kneeAngle": 70.0, "hipAngle": 95.0},
    }

    landmarks = [{"x": 0.0, "y": 0.0, "visibility": 0.0}] * 33
    landmarks[11] = {"x": 0.25, "y": 0.35, "visibility": 0.99}
    landmarks[23] = {"x": 0.35, "y": 0.72, "visibility": 0.99}
    landmarks[25] = {"x": 0.44, "y": 0.70, "visibility": 0.99}
    landmarks[27] = {"x": 0.48, "y": 0.95, "visibility": 0.99}
    landmarks[31] = {"x": 0.50, "y": 0.98, "visibility": 0.99}

    observation = processor._resolve_observation(landmarks, calibration)

    assert observation is not None
    assert observation["depthProgress"] == 1.0


def test_squat_shallow_rep_returns_depth_feedback():
    service = PoseFeedbackService()
    state = service.create_session(goal_count=10)

    calibration = {
        "exerciseType": "squat",
        "top": {"kneeAngle": 170.0, "hipAngle": 165.0, "torsoLeanAngle": 20.0},
        "bottom": {"kneeAngle": 85.0, "hipAngle": 95.0, "torsoLeanAngle": 28.0},
    }

    top_landmarks = [{"x": 0.0, "y": 0.0, "visibility": 0.0}] * 33
    top_landmarks[11] = {"x": 0.40, "y": 0.30, "visibility": 0.99}
    top_landmarks[23] = {"x": 0.42, "y": 0.55, "visibility": 0.99}
    top_landmarks[25] = {"x": 0.43, "y": 0.80, "visibility": 0.99}
    top_landmarks[27] = {"x": 0.44, "y": 0.95, "visibility": 0.99}
    top_landmarks[31] = {"x": 0.46, "y": 0.98, "visibility": 0.99}

    shallow_landmarks = [{"x": 0.0, "y": 0.0, "visibility": 0.0}] * 33
    shallow_landmarks[11] = {"x": 0.35, "y": 0.50, "visibility": 0.99}
    shallow_landmarks[23] = {"x": 0.40, "y": 0.66, "visibility": 0.99}
    shallow_landmarks[25] = {"x": 0.50, "y": 0.78, "visibility": 0.99}
    shallow_landmarks[27] = {"x": 0.44, "y": 0.95, "visibility": 0.99}
    shallow_landmarks[31] = {"x": 0.46, "y": 0.98, "visibility": 0.99}

    service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "squat",
            "timestampMs": 1000,
            "goalCount": 10,
            "calibrationMetrics": calibration,
            "landmarks": top_landmarks,
        },
    )
    service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "squat",
            "timestampMs": 1150,
            "landmarks": shallow_landmarks,
        },
    )
    result = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "squat",
            "timestampMs": 1400,
            "landmarks": top_landmarks,
        },
    )

    assert result["repCompleted"] is True
    assert result["representativeFeedbackCode"] == "depth_low"
