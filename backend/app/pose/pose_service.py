from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.pose.pushup_feedback import PushupFeedbackProcessor


DEFAULT_GOAL_COUNT = 10
DEFAULT_POSE_ISSUE = "무릎이 발끝과 같은 방향을 유지하도록 해주세요."
SESSION_STARTED_MESSAGE = (
    "자세 세션이 시작되었습니다. pose_landmarks 프레임을 전송해주세요."
)
UNSUPPORTED_MESSAGE_TYPE = "지원하지 않는 메시지 타입입니다."
NO_LANDMARKS_MESSAGE = "주요 관절이 보이도록 화면 안으로 들어와 주세요."
INSUFFICIENT_LANDMARKS_MESSAGE = (
    "안정적인 피드백을 위해 더 많은 관절 좌표가 필요합니다."
)
DEFAULT_FEEDBACK_MESSAGE = "가슴을 세우고 스쿼트 깊이를 일정하게 유지해 주세요."


@dataclass
class PoseSessionState:
    goal_count: int = DEFAULT_GOAL_COUNT
    full_rep_count: int = 0
    last_timestamp_ms: float = 0.0
    last_pose_issue: str = DEFAULT_POSE_ISSUE
    exercise_type: str = "squat"
    movement_zone: str = "top"
    rep_active: bool = False
    current_rep_started_at_ms: float = 0.0
    current_rep_max_depth: float = 0.0
    current_rep_min_elbow_angle: float = 180.0
    current_rep_max_top_elbow_angle: float = 0.0
    current_rep_body_line_sum: float = 0.0
    current_rep_body_line_samples: int = 0
    current_rep_warning_counts: dict[str, int] | None = None
    calibration_metrics: dict[str, Any] | None = None

    def reset_rep_tracking(self) -> None:
        self.rep_active = False
        self.current_rep_started_at_ms = 0.0
        self.current_rep_max_depth = 0.0
        self.current_rep_min_elbow_angle = 180.0
        self.current_rep_max_top_elbow_angle = 0.0
        self.current_rep_body_line_sum = 0.0
        self.current_rep_body_line_samples = 0
        self.current_rep_warning_counts = {}


class PoseFeedbackService:
    def __init__(self) -> None:
        self.pushup_feedback_processor = PushupFeedbackProcessor()

    def create_session(self, goal_count: int = DEFAULT_GOAL_COUNT) -> PoseSessionState:
        normalized_goal = goal_count if goal_count > 0 else DEFAULT_GOAL_COUNT
        return PoseSessionState(goal_count=normalized_goal)

    def build_session_started_message(self, state: PoseSessionState) -> dict[str, Any]:
        return {
            "type": "session_started",
            "status": "idle",
            "feedbackMessage": SESSION_STARTED_MESSAGE,
            "fullRepCount": state.full_rep_count,
            "goalCount": state.goal_count,
            "timestampMs": state.last_timestamp_ms,
        }

    def build_error_message(
        self,
        message: str,
        state: PoseSessionState | None = None,
    ) -> dict[str, Any]:
        return {
            "type": "error",
            "status": "insufficient_visibility",
            "feedbackMessage": message,
            "fullRepCount": state.full_rep_count if state else 0,
            "goalCount": state.goal_count if state else DEFAULT_GOAL_COUNT,
            "timestampMs": state.last_timestamp_ms if state else 0.0,
        }

    def handle_message(
        self,
        state: PoseSessionState,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        message_type = payload.get("type")

        if message_type == "ping":
            return {"type": "pong"}

        if message_type != "pose_landmarks":
            return self.build_error_message(UNSUPPORTED_MESSAGE_TYPE, state=state)

        exercise_type = self._to_exercise_type(payload.get("exerciseType"))
        state.exercise_type = exercise_type

        if exercise_type == "pushup":
            return self._handle_pushup_landmarks(state, payload)

        return self._handle_pose_landmarks(state, payload)

    def _handle_pose_landmarks(
        self,
        state: PoseSessionState,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        timestamp_ms = self._to_timestamp_ms(payload.get("timestampMs"))
        goal_count = self._to_positive_int(payload.get("goalCount"))
        if goal_count is not None:
            state.goal_count = goal_count

        landmarks = payload.get("landmarks")
        current_issue = self._resolve_pose_issue(landmarks)

        rep_completed = self._to_bool(payload.get("repCompleted"))
        feedback_message = current_issue

        if rep_completed and state.full_rep_count < state.goal_count:
            previous_issue = state.last_pose_issue
            state.full_rep_count += 1
            feedback_message = (
                f"{state.full_rep_count}회 완료. 이전 자세 피드백: {previous_issue}"
            )

        state.last_pose_issue = current_issue
        state.last_timestamp_ms = timestamp_ms

        status = "tracking"
        if state.full_rep_count >= state.goal_count:
            status = "idle"

        return {
            "type": "feedback",
            "status": status,
            "feedbackMessage": feedback_message,
            "fullRepCount": state.full_rep_count,
            "goalCount": state.goal_count,
            "timestampMs": state.last_timestamp_ms,
        }

    def _handle_pushup_landmarks(
        self,
        state: PoseSessionState,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        timestamp_ms = self._to_timestamp_ms(payload.get("timestampMs"))
        goal_count = self._to_positive_int(payload.get("goalCount"))
        return self.pushup_feedback_processor.handle_landmarks(
            state,
            payload,
            timestamp_ms=timestamp_ms,
            goal_count=goal_count,
        )

    @staticmethod
    def _to_timestamp_ms(value: Any) -> float:
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            try:
                parsed = float(value)
            except ValueError:
                return 0.0
            if parsed >= 0:
                return parsed
        return 0.0

    @staticmethod
    def _to_positive_int(value: Any) -> int | None:
        if isinstance(value, bool):
            return None
        if isinstance(value, (int, float)) and int(value) > 0:
            return int(value)
        return None

    @staticmethod
    def _to_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return value != 0
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "y"}:
                return True
            if normalized in {"false", "0", "no", "n", ""}:
                return False
        return False

    @staticmethod
    def _to_exercise_type(value: Any) -> str:
        if isinstance(value, str) and value.strip():
            return value.strip().lower()
        return "squat"

    @staticmethod
    def _resolve_pose_issue(landmarks: Any) -> str:
        if not isinstance(landmarks, list) or len(landmarks) == 0:
            return NO_LANDMARKS_MESSAGE

        if len(landmarks) < 10:
            return INSUFFICIENT_LANDMARKS_MESSAGE

        return DEFAULT_FEEDBACK_MESSAGE
