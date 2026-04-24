from app.pose.pose_service import PoseFeedbackService


def test_pushup_pose_service_counts_rep_and_builds_summary():
    service = PoseFeedbackService()
    state = service.create_session(goal_count=10)

    calibration = {
        "exerciseType": "pushup",
        "top": {"elbowAngle": 170.0, "shoulderY": 0.40, "bodyLineAngle": 175.0},
        "bottom": {"elbowAngle": 90.0, "shoulderY": 0.62, "bodyLineAngle": 173.0},
    }

    first = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "pushup",
            "timestampMs": 1000,
            "goalCount": 10,
            "calibrationMetrics": calibration,
            "trackedLandmarks": {
                "shoulder": {"x": 0.4, "y": 0.40},
                "elbow": {"x": 0.5, "y": 0.42},
                "wrist": {"x": 0.6, "y": 0.43},
                "hip": {"x": 0.45, "y": 0.50},
                "ankle": {"x": 0.62, "y": 0.60},
            },
        },
    )
    assert first["fullRepCount"] == 0
    assert first["exerciseType"] == "pushup"

    second = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "pushup",
            "timestampMs": 1100,
            "trackedLandmarks": {
                "shoulder": {"x": 0.4, "y": 0.63},
                "elbow": {"x": 0.48, "y": 0.62},
                "wrist": {"x": 0.52, "y": 0.55},
                "hip": {"x": 0.45, "y": 0.70},
                "ankle": {"x": 0.62, "y": 0.80},
            },
        },
    )
    assert second["movementZone"] == "bottom"

    third = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "pushup",
            "timestampMs": 1300,
            "trackedLandmarks": {
                "shoulder": {"x": 0.4, "y": 0.40},
                "elbow": {"x": 0.5, "y": 0.42},
                "wrist": {"x": 0.6, "y": 0.43},
                "hip": {"x": 0.45, "y": 0.50},
                "ankle": {"x": 0.62, "y": 0.60},
            },
        },
    )
    assert third["repCompleted"] is True
    assert third["fullRepCount"] == 1
    assert third["repSummary"]["rangeCompletionRate"] >= 0.7


def test_pushup_pose_service_does_not_count_when_rep_is_too_fast():
    service = PoseFeedbackService()
    state = service.create_session(goal_count=10)

    calibration = {
        "exerciseType": "pushup",
        "top": {"elbowAngle": 170.0, "shoulderY": 0.40, "bodyLineAngle": 175.0},
        "bottom": {"elbowAngle": 90.0, "shoulderY": 0.62, "bodyLineAngle": 173.0},
    }

    service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "pushup",
            "timestampMs": 1000,
            "goalCount": 10,
            "calibrationMetrics": calibration,
            "trackedLandmarks": {
                "shoulder": {"x": 0.4, "y": 0.40},
                "elbow": {"x": 0.5, "y": 0.42},
                "wrist": {"x": 0.6, "y": 0.43},
                "hip": {"x": 0.45, "y": 0.50},
                "ankle": {"x": 0.62, "y": 0.60},
            },
        },
    )

    service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "pushup",
            "timestampMs": 1080,
            "trackedLandmarks": {
                "shoulder": {"x": 0.4, "y": 0.63},
                "elbow": {"x": 0.48, "y": 0.62},
                "wrist": {"x": 0.52, "y": 0.55},
                "hip": {"x": 0.45, "y": 0.70},
                "ankle": {"x": 0.62, "y": 0.80},
            },
        },
    )

    too_fast = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "pushup",
            "timestampMs": 1160,
            "trackedLandmarks": {
                "shoulder": {"x": 0.4, "y": 0.40},
                "elbow": {"x": 0.5, "y": 0.42},
                "wrist": {"x": 0.6, "y": 0.43},
                "hip": {"x": 0.45, "y": 0.50},
                "ankle": {"x": 0.62, "y": 0.60},
            },
        },
    )

    assert too_fast["repCompleted"] is False
    assert too_fast["fullRepCount"] == 0


def test_pushup_pose_service_returns_error_on_missing_tracked_landmarks():
    service = PoseFeedbackService()
    state = service.create_session()

    response = service.handle_message(
        state,
        {
            "type": "pose_landmarks",
            "exerciseType": "pushup",
            "timestampMs": 1000,
            "trackedLandmarks": {},
        },
    )

    assert response["type"] == "error"
    assert "측면" in response["feedbackMessage"]
