from __future__ import annotations

from math import acos, degrees, sqrt
from typing import Any


PLANK_VIEW_MESSAGE = "측면이 잘 보이도록 몸을 옆으로 보여주세요."
PLANK_NOT_IN_POSITION_MESSAGE = "플랭크 자세로 바닥에 엎드려 주세요."
PLANK_GOOD_MESSAGE = "자세가 좋습니다. 유지해주세요."
PLANK_HIP_SAG_MESSAGE = "엉덩이가 처지고 있습니다. 몸통을 일직선으로 유지해주세요."
PLANK_HIP_HIGH_MESSAGE = "엉덩이가 너무 높습니다. 몸을 일직선으로 내려주세요."
PLANK_HEAD_HIGH_MESSAGE = "머리가 너무 들렸습니다. 시선을 바닥으로 향해주세요."
PLANK_ELBOW_BAD_MESSAGE = "팔꿈치 각도를 90도로 맞춰주세요."

PLANK_MAX_VERTICAL_SPAN = 0.35
PLANK_MIN_HORIZONTAL_SPAN = 0.15
PLANK_HIP_OFFSET_THRESHOLD = 0.07
PLANK_ELBOW_IDEAL = 90.0
PLANK_ELBOW_TOLERANCE = 25.0  # 65°~115° 허용
PLANK_HEAD_OFFSET_THRESHOLD = 0.08  # nose.y < shoulder.y - threshold → 머리 과상승
PLANK_FEEDBACK_INTERVAL_MS = 3000.0


class PlankFeedbackProcessor:
    def handle_landmarks(
        self,
        state: Any,
        payload: dict[str, Any],
        *,
        timestamp_ms: float,
        goal_count: int | None,
    ) -> dict[str, Any]:
        if goal_count is not None:
            state.goal_count = goal_count

        calibration_metrics = payload.get("calibrationMetrics")
        if isinstance(calibration_metrics, dict):
            state.calibration_metrics = calibration_metrics

        tracked_landmarks = payload.get("trackedLandmarks")
        state.last_timestamp_ms = timestamp_ms

        if not self._is_plank_orientation(tracked_landmarks):
            return {
                "type": "feedback",
                "exerciseType": "plank",
                "status": "not_in_position",
                "feedbackMessage": PLANK_NOT_IN_POSITION_MESSAGE,
                "fullRepCount": state.full_rep_count,
                "goalCount": state.goal_count,
                "timestampMs": state.last_timestamp_ms,
                "warningCode": None,
                "isComplete": False,
            }

        observation = self._resolve_observation(tracked_landmarks)
        if observation is None:
            return {
                "type": "error",
                "status": "insufficient_visibility",
                "feedbackMessage": PLANK_VIEW_MESSAGE,
                "fullRepCount": state.full_rep_count,
                "goalCount": state.goal_count,
                "timestampMs": state.last_timestamp_ms,
            }

        # 세션 시작 초기화
        if state.current_rep_started_at_ms == 0.0:
            state.current_rep_started_at_ms = timestamp_ms
            state.rep_active = True
            state.plank_last_feedback_at_ms = timestamp_ms
            state.last_pose_issue = PLANK_GOOD_MESSAGE

        # 경과 시간(초) 계산 → full_rep_count에 저장
        elapsed_ms = timestamp_ms - state.current_rep_started_at_ms
        state.full_rep_count = int(elapsed_ms / 1000)

        # 세션 평균 메트릭 누적
        state.current_rep_body_line_sum += observation["bodyLineAngle"]
        state.current_rep_body_line_samples += 1
        state.plank_elbow_angle_sum += observation["elbowAngle"]
        state.plank_elbow_angle_samples += 1

        is_complete = state.full_rep_count >= state.goal_count

        # 3초 간격으로 피드백 메시지 갱신 + 경고 히스토리 누적
        should_update = (
            timestamp_ms - state.plank_last_feedback_at_ms >= PLANK_FEEDBACK_INTERVAL_MS
        )
        if should_update:
            warning_code, warning_message = self._resolve_warning(observation)
            state.plank_current_warning_code = warning_code
            state.last_pose_issue = warning_message or PLANK_GOOD_MESSAGE
            state.plank_last_feedback_at_ms = timestamp_ms
            state.plank_warning_history.append(warning_code)

        status = "idle" if is_complete else "tracking"
        response: dict[str, Any] = {
            "type": "feedback",
            "exerciseType": "plank",
            "status": status,
            "feedbackMessage": state.last_pose_issue,
            "fullRepCount": state.full_rep_count,
            "goalCount": state.goal_count,
            "timestampMs": state.last_timestamp_ms,
            "warningCode": state.plank_current_warning_code,
            "isComplete": is_complete,
            "sessionMetrics": self._build_session_metrics(state),
        }

        return response

    def _build_session_metrics(self, state: Any) -> dict[str, Any]:
        avg_body_line = 0.0
        if state.current_rep_body_line_samples > 0:
            avg_body_line = (
                state.current_rep_body_line_sum / state.current_rep_body_line_samples
            )

        avg_elbow = 0.0
        if state.plank_elbow_angle_samples > 0:
            avg_elbow = state.plank_elbow_angle_sum / state.plank_elbow_angle_samples

        return {
            "bodyLineAngle": round(avg_body_line, 2),
            "elbowAngle": round(avg_elbow, 2),
            "holdDurationSeconds": state.full_rep_count,
            "warningCodes": list(state.plank_warning_history),
        }

    def _is_plank_orientation(self, tracked_landmarks: Any) -> bool:
        if not isinstance(tracked_landmarks, dict):
            return False
        shoulder = self._point(tracked_landmarks.get("shoulder"))
        ankle = self._point(tracked_landmarks.get("ankle"))
        if shoulder is None or ankle is None:
            return False
        vertical_span = abs(shoulder[1] - ankle[1])
        horizontal_span = abs(shoulder[0] - ankle[0])
        return (
            vertical_span < PLANK_MAX_VERTICAL_SPAN
            and horizontal_span > PLANK_MIN_HORIZONTAL_SPAN
        )

    def _resolve_observation(self, tracked_landmarks: Any) -> dict[str, float] | None:
        if not isinstance(tracked_landmarks, dict):
            return None

        shoulder = self._point(tracked_landmarks.get("shoulder"))
        elbow = self._point(tracked_landmarks.get("elbow"))
        wrist = self._point(tracked_landmarks.get("wrist"))
        hip = self._point(tracked_landmarks.get("hip"))
        ankle = self._point(tracked_landmarks.get("ankle"))
        nose = self._point(tracked_landmarks.get("nose"))

        if (
            shoulder is None
            or elbow is None
            or wrist is None
            or hip is None
            or ankle is None
        ):
            return None

        elbow_angle = self._angle(shoulder, elbow, wrist)
        body_line_angle = self._angle(shoulder, hip, ankle)
        hip_line_offset = self._signed_distance_to_line(hip, shoulder, ankle)

        # 코가 어깨보다 위로 얼마나 올라갔는지 (양수 = 머리 들림)
        head_offset = (shoulder[1] - nose[1]) if nose is not None else 0.0

        return {
            "elbowAngle": elbow_angle,
            "bodyLineAngle": body_line_angle,
            "hipLineOffset": hip_line_offset,
            "headOffset": head_offset,
        }

    @staticmethod
    def _resolve_warning(
        observation: dict[str, float],
    ) -> tuple[str | None, str | None]:
        if observation["hipLineOffset"] >= PLANK_HIP_OFFSET_THRESHOLD:
            return "hip_sag", PLANK_HIP_SAG_MESSAGE
        if observation["hipLineOffset"] <= -PLANK_HIP_OFFSET_THRESHOLD:
            return "hip_high", PLANK_HIP_HIGH_MESSAGE
        if observation["headOffset"] > PLANK_HEAD_OFFSET_THRESHOLD:
            return "head_high", PLANK_HEAD_HIGH_MESSAGE
        if abs(observation["elbowAngle"] - PLANK_ELBOW_IDEAL) > PLANK_ELBOW_TOLERANCE:
            return "elbow_angle_bad", PLANK_ELBOW_BAD_MESSAGE
        return None, None

    @staticmethod
    def _point(value: Any) -> tuple[float, float] | None:
        if not isinstance(value, dict):
            return None
        try:
            return (float(value["x"]), float(value["y"]))
        except (KeyError, TypeError, ValueError):
            return None

    @staticmethod
    def _distance(a: tuple[float, float], b: tuple[float, float]) -> float:
        return sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)

    @classmethod
    def _angle(
        cls,
        a: tuple[float, float],
        b: tuple[float, float],
        c: tuple[float, float],
    ) -> float:
        ab = cls._distance(a, b)
        bc = cls._distance(b, c)
        ac = cls._distance(a, c)
        if ab == 0 or bc == 0:
            return 0.0
        cos_value = max(-1.0, min(1.0, ((ab**2) + (bc**2) - (ac**2)) / (2 * ab * bc)))
        return degrees(acos(cos_value))

    @staticmethod
    def _signed_distance_to_line(
        point: tuple[float, float],
        line_start: tuple[float, float],
        line_end: tuple[float, float],
    ) -> float:
        x0, y0 = point
        x1, y1 = line_start
        x2, y2 = line_end
        dx = x2 - x1
        dy = y2 - y1
        length = sqrt(dx * dx + dy * dy)
        if length == 0:
            return 0.0
        return ((dx * (y0 - y1)) - (dy * (x0 - x1))) / length
