from app.pose.plank_feedback import (
    PLANK_ELBOW_BAD_MESSAGE,
    PLANK_GOOD_MESSAGE,
    PLANK_HEAD_HIGH_MESSAGE,
    PLANK_HIP_HIGH_MESSAGE,
    PLANK_HIP_SAG_MESSAGE,
    PLANK_NOT_IN_POSITION_MESSAGE,
    PLANK_VIEW_MESSAGE,
    PlankFeedbackProcessor,
)
from app.pose.pose_service import PoseFeedbackService


# ---------------------------------------------------------------------------
# 헬퍼
# ---------------------------------------------------------------------------


def _lm(x: float, y: float) -> dict:
    return {"x": x, "y": y}


def _good_landmarks(
    *,
    hip_y: float = 0.4,
    nose_y: float = 0.38,
    elbow: tuple = (0.3, 0.55),
    wrist: tuple = (0.45, 0.55),
) -> dict:
    """
    수평 플랭크 자세 (팔꿈치 90도, 몸통 일직선).
    shoulder(0.3, 0.4) — ankle(0.8, 0.4) 수평선 기준.
    """
    return {
        "shoulder": _lm(0.3, 0.4),
        "elbow": _lm(*elbow),
        "wrist": _lm(*wrist),
        "hip": _lm(0.55, hip_y),
        "ankle": _lm(0.8, 0.4),
        "nose": _lm(0.2, nose_y),
    }


def _make_payload(landmarks: dict, *, ts: float = 1000.0, goal: int = 60) -> dict:
    return {
        "type": "pose_landmarks",
        "exerciseType": "plank",
        "timestampMs": ts,
        "goalCount": goal,
        "calibrationMetrics": {"plank": {"elbowAngle": 90.0, "bodyLineAngle": 178.0}},
        "trackedLandmarks": landmarks,
    }


# ---------------------------------------------------------------------------
# 자세 감지 불가 케이스
# ---------------------------------------------------------------------------


class TestPlankOrientation:
    def test_vertical_pose_returns_not_in_position(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)

        # 수직(서있는) 자세: shoulder-ankle Y 간격이 큼
        vertical_lm = {
            "shoulder": _lm(0.5, 0.2),
            "elbow": _lm(0.5, 0.4),
            "wrist": _lm(0.5, 0.6),
            "hip": _lm(0.5, 0.55),
            "ankle": _lm(0.5, 0.9),
            "nose": _lm(0.5, 0.1),
        }
        result = service.handle_message(state, _make_payload(vertical_lm))
        assert result["feedbackMessage"] == PLANK_NOT_IN_POSITION_MESSAGE
        assert result["isComplete"] is False

    def test_missing_ankle_returns_not_in_position(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)

        incomplete_lm = {
            "shoulder": _lm(0.3, 0.4),
            "elbow": _lm(0.3, 0.55),
            "wrist": _lm(0.45, 0.55),
            "hip": _lm(0.55, 0.4),
            # ankle 없음
            "nose": _lm(0.2, 0.38),
        }
        result = service.handle_message(state, _make_payload(incomplete_lm))
        assert result["feedbackMessage"] == PLANK_NOT_IN_POSITION_MESSAGE

    def test_null_landmarks_returns_not_in_position(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)
        payload = _make_payload(_good_landmarks())
        payload["trackedLandmarks"] = None
        result = service.handle_message(state, payload)
        assert result["feedbackMessage"] == PLANK_NOT_IN_POSITION_MESSAGE

    def test_missing_elbow_returns_insufficient_visibility(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)

        # 수평 자세이지만 elbow 누락
        lm = {
            "shoulder": _lm(0.3, 0.4),
            "wrist": _lm(0.45, 0.55),
            "hip": _lm(0.55, 0.4),
            "ankle": _lm(0.8, 0.4),
            "nose": _lm(0.2, 0.38),
        }
        result = service.handle_message(state, _make_payload(lm))
        assert result["feedbackMessage"] == PLANK_VIEW_MESSAGE


# ---------------------------------------------------------------------------
# 타이머 및 세션 동작
# ---------------------------------------------------------------------------


class TestPlankTimer:
    def test_elapsed_seconds_increments(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)
        lm = _good_landmarks()

        service.handle_message(state, _make_payload(lm, ts=0.0))
        result = service.handle_message(state, _make_payload(lm, ts=3500.0))
        assert result["fullRepCount"] == 3

    def test_initial_elapsed_is_zero(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)

        result = service.handle_message(state, _make_payload(_good_landmarks(), ts=0.0))
        assert result["fullRepCount"] == 0
        assert result["status"] == "tracking"
        assert result["exerciseType"] == "plank"

    def test_session_completes_when_goal_reached(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=10)
        lm = _good_landmarks()

        service.handle_message(state, _make_payload(lm, ts=0.0, goal=10))
        result = service.handle_message(state, _make_payload(lm, ts=11000.0, goal=10))

        assert result["isComplete"] is True
        assert result["status"] == "idle"
        assert result["fullRepCount"] >= 10

    def test_session_not_complete_before_goal(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)
        lm = _good_landmarks()

        service.handle_message(state, _make_payload(lm, ts=0.0))
        result = service.handle_message(state, _make_payload(lm, ts=5000.0))
        assert result["isComplete"] is False


# ---------------------------------------------------------------------------
# 피드백 메시지 (3초 간격)
# ---------------------------------------------------------------------------


class TestPlankFeedbackInterval:
    def test_good_feedback_on_perfect_pose(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)
        lm = _good_landmarks()

        service.handle_message(state, _make_payload(lm, ts=0.0))
        result = service.handle_message(state, _make_payload(lm, ts=3100.0))
        assert result["feedbackMessage"] == PLANK_GOOD_MESSAGE
        assert result["warningCode"] is None

    def test_feedback_does_not_update_before_interval(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)

        good_lm = _good_landmarks()
        sag_lm = _good_landmarks(hip_y=0.52)  # 엉덩이 처짐

        service.handle_message(state, _make_payload(good_lm, ts=0.0))
        # 1초 후 자세 나빠짐 → 아직 3초 안 됐으므로 메시지 변경 없어야 함
        result = service.handle_message(state, _make_payload(sag_lm, ts=1000.0))
        assert result["feedbackMessage"] == PLANK_GOOD_MESSAGE

    def test_feedback_updates_after_interval(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)

        good_lm = _good_landmarks()
        sag_lm = _good_landmarks(hip_y=0.52)

        service.handle_message(state, _make_payload(good_lm, ts=0.0))
        result = service.handle_message(state, _make_payload(sag_lm, ts=3100.0))
        assert result["feedbackMessage"] == PLANK_HIP_SAG_MESSAGE
        assert result["warningCode"] == "hip_sag"


# ---------------------------------------------------------------------------
# 자세 경고 케이스
# ---------------------------------------------------------------------------


class TestPlankWarnings:
    def _first_feedback(self, lm: dict, goal: int = 60) -> dict:
        """3초 후 두 번째 프레임에서 피드백 업데이트 받기."""
        service = PoseFeedbackService()
        state = service.create_session(goal_count=goal)
        service.handle_message(state, _make_payload(_good_landmarks(), ts=0.0))
        return service.handle_message(state, _make_payload(lm, ts=3100.0))

    def test_hip_sag_warning(self):
        result = self._first_feedback(_good_landmarks(hip_y=0.52))
        assert result["feedbackMessage"] == PLANK_HIP_SAG_MESSAGE
        assert result["warningCode"] == "hip_sag"

    def test_hip_high_warning(self):
        result = self._first_feedback(_good_landmarks(hip_y=0.28))
        assert result["feedbackMessage"] == PLANK_HIP_HIGH_MESSAGE
        assert result["warningCode"] == "hip_high"

    def test_head_high_warning(self):
        # nose.y = 0.1 → shoulder.y(0.4) - nose.y(0.1) = 0.3 > threshold(0.08)
        result = self._first_feedback(_good_landmarks(nose_y=0.1))
        assert result["feedbackMessage"] == PLANK_HEAD_HIGH_MESSAGE
        assert result["warningCode"] == "head_high"

    def test_elbow_angle_bad_warning(self):
        # elbow, wrist 같은 y → 각도 약 150° (90°에서 60° 벗어남 > tolerance 25°)
        bad_elbow_lm = _good_landmarks(
            elbow=(0.5, 0.4),
            wrist=(0.7, 0.4),
        )
        result = self._first_feedback(bad_elbow_lm)
        assert result["feedbackMessage"] == PLANK_ELBOW_BAD_MESSAGE
        assert result["warningCode"] == "elbow_angle_bad"

    def test_hip_sag_takes_priority_over_head_high(self):
        # hip_sag + head_high 동시 → hip_sag 우선
        result = self._first_feedback(_good_landmarks(hip_y=0.52, nose_y=0.1))
        assert result["warningCode"] == "hip_sag"


# ---------------------------------------------------------------------------
# 세션 메트릭
# ---------------------------------------------------------------------------


class TestPlankSessionMetrics:
    def test_session_metrics_included_in_response(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)
        lm = _good_landmarks()

        service.handle_message(state, _make_payload(lm, ts=0.0))
        result = service.handle_message(state, _make_payload(lm, ts=1000.0))

        assert "sessionMetrics" in result
        metrics = result["sessionMetrics"]
        assert "bodyLineAngle" in metrics
        assert "elbowAngle" in metrics
        assert "holdDurationSeconds" in metrics
        assert "warningCodes" in metrics

    def test_session_metrics_body_line_near_180(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)
        lm = _good_landmarks()  # shoulder, hip, ankle 일직선 → 180도 근사

        service.handle_message(state, _make_payload(lm, ts=0.0))
        result = service.handle_message(state, _make_payload(lm, ts=1000.0))
        assert result["sessionMetrics"]["bodyLineAngle"] > 150.0

    def test_session_metrics_elbow_near_90(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)
        lm = _good_landmarks()

        service.handle_message(state, _make_payload(lm, ts=0.0))
        result = service.handle_message(state, _make_payload(lm, ts=1000.0))
        assert 65.0 <= result["sessionMetrics"]["elbowAngle"] <= 115.0

    def test_warning_codes_accumulated_in_history(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)
        good_lm = _good_landmarks()
        sag_lm = _good_landmarks(hip_y=0.52)

        service.handle_message(state, _make_payload(good_lm, ts=0.0))
        service.handle_message(state, _make_payload(sag_lm, ts=3100.0))
        result = service.handle_message(state, _make_payload(good_lm, ts=6200.0))

        history = result["sessionMetrics"]["warningCodes"]
        assert len(history) == 2
        assert "hip_sag" in history

    def test_session_metrics_zero_samples_safe(self):
        """샘플 없이 _build_session_metrics 호출 시 ZeroDivisionError 없어야 함."""
        processor = PlankFeedbackProcessor()
        from types import SimpleNamespace

        state = SimpleNamespace(
            current_rep_body_line_sum=0.0,
            current_rep_body_line_samples=0,
            plank_elbow_angle_sum=0.0,
            plank_elbow_angle_samples=0,
            full_rep_count=0,
            plank_warning_history=[],
        )
        metrics = processor._build_session_metrics(state)
        assert metrics["bodyLineAngle"] == 0.0
        assert metrics["elbowAngle"] == 0.0


# ---------------------------------------------------------------------------
# pose_service.py 플랭크 핸들러 연결 테스트
# ---------------------------------------------------------------------------


class TestPoseServicePlank:
    def test_handle_message_routes_to_plank(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)

        result = service.handle_message(state, _make_payload(_good_landmarks(), ts=0.0))
        assert result["exerciseType"] == "plank"

    def test_plank_goal_count_set_from_payload(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)

        service.handle_message(state, _make_payload(_good_landmarks(), ts=0.0, goal=30))
        assert state.goal_count == 30

    def test_plank_completes_via_service(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=5)
        lm = _good_landmarks()

        service.handle_message(state, _make_payload(lm, ts=0.0, goal=5))
        result = service.handle_message(state, _make_payload(lm, ts=6000.0, goal=5))
        assert result["isComplete"] is True

    def test_ping_still_works_alongside_plank(self):
        service = PoseFeedbackService()
        state = service.create_session(goal_count=60)
        result = service.handle_message(state, {"type": "ping"})
        assert result == {"type": "pong"}
