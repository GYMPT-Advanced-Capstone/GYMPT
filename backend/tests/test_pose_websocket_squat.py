from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_pose_websocket_squat_feedback_counts_and_sends_rep_summary():
    calibration_metrics = {
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

    with client.websocket_connect("/ws/workout-feedback") as websocket:
        websocket.receive_json()

        websocket.send_json(
            {
                "type": "pose_landmarks",
                "exerciseType": "squat",
                "timestampMs": 1000,
                "goalCount": 10,
                "calibrationMetrics": calibration_metrics,
                "landmarks": top_landmarks,
            }
        )
        first = websocket.receive_json()
        assert first["fullRepCount"] == 0
        assert first["exerciseType"] == "squat"
        assert first["feedbackMessage"] == "좋은 자세예요."

        websocket.send_json(
            {
                "type": "pose_landmarks",
                "exerciseType": "squat",
                "timestampMs": 1150,
                "landmarks": bottom_landmarks,
            }
        )
        second = websocket.receive_json()
        assert second["movementZone"] == "bottom"

        websocket.send_json(
            {
                "type": "pose_landmarks",
                "exerciseType": "squat",
                "timestampMs": 1400,
                "landmarks": top_landmarks,
            }
        )
        third = websocket.receive_json()
        assert third["repCompleted"] is True
        assert third["fullRepCount"] == 1
        assert "repSummary" in third
        assert third["representativeFeedbackMessage"] == "좋은 자세예요."
