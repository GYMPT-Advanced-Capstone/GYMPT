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
