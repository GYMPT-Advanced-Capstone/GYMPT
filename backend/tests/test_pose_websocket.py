from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_pose_websocket_session_start_message():
    with client.websocket_connect("/ws/workout-feedback") as websocket:
        message = websocket.receive_json()
        assert message["type"] == "session_started"
        assert message["status"] == "idle"
        assert message["fullRepCount"] == 0
        assert message["goalCount"] == 10


def test_pose_websocket_invalid_json_error():
    with client.websocket_connect("/ws/workout-feedback") as websocket:
        websocket.receive_json()  # session_started
        websocket.send_text("not-json")
        message = websocket.receive_json()
        assert message["type"] == "error"
        assert message["feedbackMessage"] == "잘못된 JSON 형식입니다."


def test_pose_websocket_feedback_flow_with_rep_completion():
    with client.websocket_connect("/ws/workout-feedback") as websocket:
        websocket.receive_json()  # session_started

        websocket.send_json(
            {
                "type": "pose_landmarks",
                "timestampMs": 1000,
                "goalCount": 10,
                "landmarks": [{"x": 0.1, "y": 0.2}] * 33,
            },
        )
        first_feedback = websocket.receive_json()
        assert first_feedback["type"] == "feedback"
        assert first_feedback["status"] == "tracking"
        assert first_feedback["fullRepCount"] == 0

        websocket.send_json(
            {
                "type": "pose_landmarks",
                "timestampMs": 1120,
                "repCompleted": True,
                "landmarks": [{"x": 0.1, "y": 0.2}] * 33,
            },
        )
        second_feedback = websocket.receive_json()
        assert second_feedback["type"] == "feedback"
        assert second_feedback["status"] == "tracking"
        assert second_feedback["fullRepCount"] == 1
        assert "이전 자세 피드백" in second_feedback["feedbackMessage"]


def test_pose_websocket_string_false_rep_completed_does_not_increment():
    with client.websocket_connect("/ws/workout-feedback") as websocket:
        websocket.receive_json()  # session_started

        websocket.send_json(
            {
                "type": "pose_landmarks",
                "timestampMs": 1000,
                "goalCount": 10,
                "repCompleted": "false",
                "landmarks": [{"x": 0.1, "y": 0.2}] * 33,
            },
        )
        feedback = websocket.receive_json()
        assert feedback["type"] == "feedback"
        assert feedback["status"] == "tracking"
        assert feedback["fullRepCount"] == 0


def test_pose_websocket_pushup_feedback_counts_and_sends_rep_summary():
    calibration_metrics = {
        "exerciseType": "pushup",
        "side": "left",
        "top": {"elbowAngle": 170.0, "shoulderY": 0.40, "bodyLineAngle": 175.0},
        "bottom": {"elbowAngle": 90.0, "shoulderY": 0.62, "bodyLineAngle": 173.0},
    }
    with client.websocket_connect("/ws/workout-feedback") as websocket:
        websocket.receive_json()  # session_started

        websocket.send_json(
            {
                "type": "pose_landmarks",
                "exerciseType": "pushup",
                "timestampMs": 1000,
                "goalCount": 10,
                "calibrationMetrics": calibration_metrics,
                "trackedLandmarks": {
                    "shoulder": {"x": 0.4, "y": 0.4},
                    "elbow": {"x": 0.5, "y": 0.42},
                    "wrist": {"x": 0.6, "y": 0.43},
                    "hip": {"x": 0.45, "y": 0.5},
                    "ankle": {"x": 0.62, "y": 0.6},
                },
            }
        )
        first = websocket.receive_json()
        assert first["fullRepCount"] == 0
        assert first["exerciseType"] == "pushup"

        websocket.send_json(
            {
                "type": "pose_landmarks",
                "exerciseType": "pushup",
                "timestampMs": 1100,
                "trackedLandmarks": {
                    "shoulder": {"x": 0.4, "y": 0.63},
                    "elbow": {"x": 0.48, "y": 0.62},
                    "wrist": {"x": 0.52, "y": 0.55},
                    "hip": {"x": 0.45, "y": 0.7},
                    "ankle": {"x": 0.62, "y": 0.8},
                },
            }
        )
        second = websocket.receive_json()
        assert second["movementZone"] == "bottom"

        websocket.send_json(
            {
                "type": "pose_landmarks",
                "exerciseType": "pushup",
                "timestampMs": 1200,
                "trackedLandmarks": {
                    "shoulder": {"x": 0.4, "y": 0.4},
                    "elbow": {"x": 0.5, "y": 0.42},
                    "wrist": {"x": 0.6, "y": 0.43},
                    "hip": {"x": 0.45, "y": 0.5},
                    "ankle": {"x": 0.62, "y": 0.6},
                },
            }
        )
        third = websocket.receive_json()
        assert third["repCompleted"] is True
        assert third["fullRepCount"] == 1
        assert "repSummary" in third


def test_pose_websocket_pushup_missing_landmarks_returns_visibility_error():
    with client.websocket_connect("/ws/workout-feedback") as websocket:
        websocket.receive_json()  # session_started
        websocket.send_json(
            {
                "type": "pose_landmarks",
                "exerciseType": "pushup",
                "timestampMs": 1000,
                "trackedLandmarks": {},
            }
        )
        message = websocket.receive_json()
        assert message["type"] == "error"
        assert "측면" in message["feedbackMessage"]
