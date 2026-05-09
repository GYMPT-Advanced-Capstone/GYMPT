from __future__ import annotations

from math import acos, atan2, degrees, sqrt
from typing import Any


SQUAT_VIEW_MESSAGE = "몸의 측면 관절이 보이도록 카메라와 몸을 맞춰주세요."
SQUAT_GOOD_MESSAGE = "좋은 자세예요."
SQUAT_DEPTH_MESSAGE = "스쿼트 깊이가 조금 부족해요. 조금 더 내려가 주세요."
SQUAT_TOO_DEEP_MESSAGE = "스쿼트 깊이가 너무 깊어요."
SQUAT_TORSO_LEAN_MESSAGE = "상체가 너무 숙여졌어요. 가슴을 세워주세요."
SQUAT_KNEE_TRACK_MESSAGE = "무릎이 발끝 방향과 같은 방향을 향하게 해주세요."
SQUAT_BOTTOM_GOOD_DEPTH = 0.55
SQUAT_GOOD_DEPTH_THRESHOLD = 1.0
SQUAT_BOTTOM_KNEE_MIN_ANGLE = 90.0
SQUAT_TOO_DEEP_ANGLE_TOLERANCE = 35.0
SQUAT_TOP_ZONE_MAX = 0.30
SQUAT_MIN_REP_DURATION_MS = 250.0
SQUAT_TORSO_LEAN_DEFAULT_THRESHOLD = 55.0
SQUAT_TORSO_LEAN_TOLERANCE = 30.0


class SquatFeedbackProcessor:
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

        landmarks = payload.get("landmarks")
        observation = self._resolve_observation(landmarks, state.calibration_metrics)

        state.last_timestamp_ms = timestamp_ms
        if observation is None:
            return {
                "type": "error",
                "status": "insufficient_visibility",
                "feedbackMessage": SQUAT_VIEW_MESSAGE,
                "fullRepCount": state.full_rep_count,
                "goalCount": state.goal_count,
                "timestampMs": state.last_timestamp_ms,
            }

        zone = self._resolve_zone(observation["depthProgress"])
        warning_code, warning_message = self._resolve_warning(
            observation,
            state.calibration_metrics,
            zone != "top" and (state.rep_active or zone == "bottom"),
        )
        feedback_message = warning_message or SQUAT_GOOD_MESSAGE
        rep_summary: dict[str, Any] | None = None
        rep_completed = False

        if state.movement_zone == "top" and zone != "top":
            state.rep_active = True
            state.current_rep_started_at_ms = timestamp_ms

        if state.rep_active:
            state.current_rep_max_depth = max(
                state.current_rep_max_depth,
                observation["depthProgress"],
            )
            state.current_rep_min_knee_angle = min(
                state.current_rep_min_knee_angle,
                observation["kneeAngle"],
            )
            state.current_rep_min_hip_angle = min(
                state.current_rep_min_hip_angle,
                observation["hipAngle"],
            )
            state.current_rep_max_top_knee_angle = max(
                state.current_rep_max_top_knee_angle,
                observation["kneeAngle"],
            )
            state.current_rep_torso_lean_sum += observation["torsoLeanAngle"]
            state.current_rep_torso_lean_samples += 1
            state.current_rep_max_knee_ankle_offset_x = max(
                state.current_rep_max_knee_ankle_offset_x,
                observation["kneeAnkleOffsetX"],
            )
            if state.current_rep_warning_counts is None:
                state.current_rep_warning_counts = {}
            if warning_code and (warning_code != "depth_low" or zone == "bottom"):
                state.current_rep_warning_counts[warning_code] = (
                    state.current_rep_warning_counts.get(warning_code, 0) + 1
                )

        if zone == "top" and state.movement_zone != "top" and state.rep_active:
            rep_duration_ms = 0.0
            if state.current_rep_started_at_ms > 0:
                rep_duration_ms = max(0.0, timestamp_ms - state.current_rep_started_at_ms)

            if rep_duration_ms >= SQUAT_MIN_REP_DURATION_MS:
                rep_completed = True
                if state.full_rep_count < state.goal_count:
                    state.full_rep_count += 1
                rep_summary = self._build_rep_summary(state, observation)
                representative_code, representative_message = (
                    self._resolve_representative_feedback(state)
                )
                rep_summary["representativeFeedbackCode"] = representative_code
                rep_summary["representativeFeedbackMessage"] = representative_message
                feedback_message = representative_message
            state.reset_rep_tracking()

        state.movement_zone = zone
        state.last_pose_issue = warning_message or feedback_message

        status = "tracking"
        if state.full_rep_count >= state.goal_count:
            status = "idle"

        response: dict[str, Any] = {
            "type": "feedback",
            "exerciseType": "squat",
            "status": status,
            "feedbackMessage": feedback_message,
            "fullRepCount": state.full_rep_count,
            "goalCount": state.goal_count,
            "timestampMs": state.last_timestamp_ms,
            "movementZone": zone,
            "repCompleted": rep_completed,
            "warningCode": warning_code,
        }
        if rep_summary is not None:
            response["repSummary"] = rep_summary
            response["representativeFeedbackCode"] = rep_summary[
                "representativeFeedbackCode"
            ]
            response["representativeFeedbackMessage"] = rep_summary[
                "representativeFeedbackMessage"
            ]
        return response

    def _resolve_observation(
        self,
        landmarks: Any,
        calibration_metrics: dict[str, Any] | None,
    ) -> dict[str, float] | None:
        if not isinstance(landmarks, list) or len(landmarks) < 33:
            return None

        tracked = self._select_side_landmarks(landmarks)
        if tracked is None:
            return None

        shoulder = tracked["shoulder"]
        hip = tracked["hip"]
        knee = tracked["knee"]
        ankle = tracked["ankle"]

        knee_angle = self._angle(hip, knee, ankle)
        hip_angle = self._angle(shoulder, hip, knee)
        torso_lean_angle = self._torso_lean_angle(shoulder, hip)
        knee_ankle_offset_x = abs(knee[0] - ankle[0])

        top_knee = self._nested_number(
            calibration_metrics,
            ("top", "kneeAngle"),
            ("topKneeAngle",),
        )
        bottom_knee = self._nested_number(
            calibration_metrics,
            ("bottom", "kneeAngle"),
            ("bottomKneeAngle",),
        )
        bottom_knee_for_depth = self._floor_bottom_knee_angle(bottom_knee)
        top_hip = self._nested_number(
            calibration_metrics,
            ("top", "hipAngle"),
            ("topHipAngle",),
        )
        bottom_hip = self._nested_number(
            calibration_metrics,
            ("bottom", "hipAngle"),
            ("bottomHipAngle",),
        )

        knee_progress = self._progress_between(
            start=top_knee,
            end=bottom_knee_for_depth,
            current=knee_angle,
            invert=True,
        )
        if knee_progress == 0.0:
            knee_progress = max(0.0, min((165.0 - knee_angle) / 85.0, 1.0))

        hip_progress = self._progress_between(
            start=top_hip,
            end=bottom_hip,
            current=hip_angle,
            invert=True,
        )
        if hip_progress == 0.0:
            hip_progress = max(0.0, min((170.0 - hip_angle) / 90.0, 1.0))

        depth_progress = max(knee_progress, hip_progress)
        if knee_progress > 0 and hip_progress > 0:
            depth_progress = (knee_progress + hip_progress) / 2

        return {
            "kneeAngle": knee_angle,
            "hipAngle": hip_angle,
            "torsoLeanAngle": torso_lean_angle,
            "kneeAnkleOffsetX": knee_ankle_offset_x,
            "depthProgress": max(0.0, min(depth_progress, 1.0)),
        }

    @staticmethod
    def _resolve_zone(depth_progress: float) -> str:
        if depth_progress >= SQUAT_BOTTOM_GOOD_DEPTH:
            return "bottom"
        if depth_progress <= SQUAT_TOP_ZONE_MAX:
            return "top"
        return "mid"

    def _resolve_warning(
        self,
        observation: dict[str, float],
        calibration_metrics: dict[str, Any] | None,
        require_depth: bool = True,
    ) -> tuple[str | None, str | None]:
        top_torso = self._nested_number(
            calibration_metrics,
            ("top", "torsoLeanAngle"),
        )
        bottom_torso = self._nested_number(
            calibration_metrics,
            ("bottom", "torsoLeanAngle"),
        )
        target_torso = self._max_number(
            top_torso,
            bottom_torso,
            self._nested_number(
                calibration_metrics,
                ("torsoLeanAngle",),
            ),
        )
        target_knee_offset = self._nested_number(
            calibration_metrics,
            ("bottom", "kneeAnkleOffsetX"),
            ("top", "kneeAnkleOffsetX"),
            ("kneeAnkleOffsetX",),
        )

        if target_torso is None:
            torso_threshold = SQUAT_TORSO_LEAN_DEFAULT_THRESHOLD
        else:
            torso_threshold = max(
                SQUAT_TORSO_LEAN_DEFAULT_THRESHOLD,
                target_torso + SQUAT_TORSO_LEAN_TOLERANCE,
            )
        knee_offset_threshold = (
            target_knee_offset if target_knee_offset is not None else 0.05
        ) + 0.04

        depth_warning = self._resolve_depth_warning(
            observation,
            calibration_metrics,
            require_depth=require_depth,
        )
        if depth_warning is not None:
            return depth_warning
        if observation["torsoLeanAngle"] > torso_threshold:
            return "torso_lean", SQUAT_TORSO_LEAN_MESSAGE
        if observation["kneeAnkleOffsetX"] > knee_offset_threshold:
            return "knee_track", SQUAT_KNEE_TRACK_MESSAGE
        return None, None

    def _resolve_depth_warning(
        self,
        observation: dict[str, float],
        calibration_metrics: dict[str, Any] | None,
        *,
        require_depth: bool,
    ) -> tuple[str, str] | None:
        bottom_knee = self._nested_number(
            calibration_metrics,
            ("bottom", "kneeAngle"),
            ("bottomKneeAngle",),
        )
        bottom_knee_for_depth = self._floor_bottom_knee_angle(bottom_knee)
        bottom_hip = self._nested_number(
            calibration_metrics,
            ("bottom", "hipAngle"),
            ("bottomHipAngle",),
        )

        knee_too_deep = bottom_knee_for_depth is not None and (
            observation["kneeAngle"]
            < bottom_knee_for_depth - SQUAT_TOO_DEEP_ANGLE_TOLERANCE
        )
        hip_too_deep = bottom_hip is not None and (
            observation["hipAngle"] < bottom_hip - SQUAT_TOO_DEEP_ANGLE_TOLERANCE
        )

        if bottom_knee_for_depth is not None and bottom_hip is not None:
            is_too_deep = knee_too_deep and hip_too_deep
        else:
            is_too_deep = knee_too_deep or hip_too_deep

        if is_too_deep:
            return "depth_high", SQUAT_TOO_DEEP_MESSAGE

        depth_progress = observation.get("depthProgress")
        if (
            require_depth
            and depth_progress is not None
            and depth_progress < SQUAT_GOOD_DEPTH_THRESHOLD
        ):
            return "depth_low", SQUAT_DEPTH_MESSAGE

        if (
            (bottom_knee_for_depth is not None or bottom_hip is not None)
            and depth_progress is not None
            and depth_progress >= SQUAT_BOTTOM_GOOD_DEPTH
            and depth_progress < SQUAT_GOOD_DEPTH_THRESHOLD
        ):
            return "depth_low", SQUAT_DEPTH_MESSAGE

        return None

    @staticmethod
    def _max_number(*values: float | None) -> float | None:
        numbers = [value for value in values if value is not None]
        if not numbers:
            return None
        return max(numbers)

    @staticmethod
    def _floor_bottom_knee_angle(value: float | None) -> float | None:
        if value is None:
            return None
        return max(SQUAT_BOTTOM_KNEE_MIN_ANGLE, value)

    def _build_rep_summary(
        self,
        state: Any,
        observation: dict[str, float],
    ) -> dict[str, Any]:
        calibration = state.calibration_metrics
        average_torso_lean = observation["torsoLeanAngle"]
        if state.current_rep_torso_lean_samples > 0:
            average_torso_lean = (
                state.current_rep_torso_lean_sum / state.current_rep_torso_lean_samples
            )

        target_top_knee = self._nested_number(
            calibration,
            ("top", "kneeAngle"),
            ("topKneeAngle",),
        )
        target_torso_lean = self._max_number(
            self._nested_number(
                calibration,
                ("top", "torsoLeanAngle"),
            ),
            self._nested_number(
                calibration,
                ("bottom", "torsoLeanAngle"),
            ),
            self._nested_number(
                calibration,
                ("torsoLeanAngle",),
            ),
        )
        target_knee_offset = self._nested_number(
            calibration,
            ("bottom", "kneeAnkleOffsetX"),
            ("top", "kneeAnkleOffsetX"),
            ("kneeAnkleOffsetX",),
        )

        top_extension_rate = 1.0
        if target_top_knee is not None and target_top_knee > 0:
            top_extension_rate = max(
                0.0,
                min(state.current_rep_max_top_knee_angle / target_top_knee, 1.0),
            )

        torso_stability_rate = 1.0
        if target_torso_lean is not None:
            torso_deviation = abs(target_torso_lean - average_torso_lean)
            torso_stability_rate = max(0.0, min(1.0 - (torso_deviation / 50.0), 1.0))

        knee_stability_rate = 1.0
        if target_knee_offset is not None:
            offset_deviation = abs(
                target_knee_offset - state.current_rep_max_knee_ankle_offset_x
            )
            knee_stability_rate = max(0.0, min(1.0 - (offset_deviation / 0.12), 1.0))

        return {
            "bottomKneeAngle": round(state.current_rep_min_knee_angle, 2),
            "bottomHipAngle": round(state.current_rep_min_hip_angle, 2),
            "topKneeAngle": round(state.current_rep_max_top_knee_angle, 2),
            "torsoLeanAngle": round(average_torso_lean, 2),
            "kneeAnkleOffsetX": round(state.current_rep_max_knee_ankle_offset_x, 4),
            "rangeCompletionRate": round(min(state.current_rep_max_depth, 1.0), 4),
            "topExtensionRate": round(top_extension_rate, 4),
            "kneeStabilityRate": round(
                max(
                    0.0,
                    min(
                        (torso_stability_rate * 0.3)
                        + (knee_stability_rate * 0.7),
                        1.0,
                    ),
                ),
                4,
            ),
        }

    def _resolve_representative_feedback(self, state: Any) -> tuple[str, str]:
        warning_counts = dict(state.current_rep_warning_counts or {})
        if state.current_rep_max_depth < SQUAT_GOOD_DEPTH_THRESHOLD:
            return "depth_low", SQUAT_DEPTH_MESSAGE
        warning_counts.pop("depth_low", None)

        if not warning_counts:
            return "good", SQUAT_GOOD_MESSAGE

        priority = {
            "depth_high": 5,
            "depth_low": 4,
            "knee_track": 3,
            "torso_lean": 1,
        }
        selected_code = sorted(
            warning_counts.items(),
            key=lambda item: (-priority.get(item[0], 0), -item[1]),
        )[0][0]
        message_map = {
            "depth_high": SQUAT_TOO_DEEP_MESSAGE,
            "depth_low": SQUAT_DEPTH_MESSAGE,
            "torso_lean": SQUAT_TORSO_LEAN_MESSAGE,
            "knee_track": SQUAT_KNEE_TRACK_MESSAGE,
            "good": SQUAT_GOOD_MESSAGE,
        }
        return selected_code, message_map[selected_code]

    @staticmethod
    def _landmark_point(value: Any) -> tuple[float, float] | None:
        if not isinstance(value, dict):
            return None
        try:
            x = float(value["x"])
            y = float(value["y"])
        except (KeyError, TypeError, ValueError):
            return None
        return (x, y)

    @staticmethod
    def _landmark_visibility(value: Any) -> float:
        if not isinstance(value, dict):
            return 0.0
        visibility = value.get("visibility", 1.0)
        try:
            return float(visibility)
        except (TypeError, ValueError):
            return 0.0

    def _select_side_landmarks(
        self,
        landmarks: list[Any],
    ) -> dict[str, tuple[float, float]] | None:
        left = self._pick_side_landmarks(landmarks, side="left")
        right = self._pick_side_landmarks(landmarks, side="right")

        if left is None and right is None:
            return None
        if left is None:
            return right
        if right is None:
            return left
        if left["visibilityScore"] >= right["visibilityScore"]:
            return left
        return right

    def _pick_side_landmarks(
        self,
        landmarks: list[Any],
        *,
        side: str,
    ) -> dict[str, Any] | None:
        if side == "left":
            indexes = {"shoulder": 11, "hip": 23, "knee": 25, "ankle": 27, "foot": 31}
        else:
            indexes = {"shoulder": 12, "hip": 24, "knee": 26, "ankle": 28, "foot": 32}

        required = {}
        visibility_score = 0.0
        for key, index in indexes.items():
            if index >= len(landmarks):
                return None
            landmark = landmarks[index]
            point = self._landmark_point(landmark)
            if point is None:
                return None
            visibility = self._landmark_visibility(landmark)
            if visibility < 0.3:
                return None
            required[key] = point
            visibility_score += visibility

        return {
            "shoulder": required["shoulder"],
            "hip": required["hip"],
            "knee": required["knee"],
            "ankle": required["ankle"],
            "foot": required["foot"],
            "visibilityScore": visibility_score,
        }

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
        cos_value = ((ab**2) + (bc**2) - (ac**2)) / (2 * ab * bc)
        cos_value = max(-1.0, min(1.0, cos_value))
        return degrees(acos(cos_value))

    @staticmethod
    def _torso_lean_angle(
        shoulder: tuple[float, float],
        hip: tuple[float, float],
    ) -> float:
        dx = abs(shoulder[0] - hip[0])
        dy = abs(shoulder[1] - hip[1])
        if dx == 0 and dy == 0:
            return 0.0
        return degrees(atan2(dx, dy))

    @staticmethod
    def _progress_between(
        *,
        start: float | None,
        end: float | None,
        current: float,
        invert: bool,
    ) -> float:
        if start is None or end is None or start == end:
            return 0.0
        if invert:
            return max(0.0, min((start - current) / (start - end), 1.0))
        return max(0.0, min((current - start) / (end - start), 1.0))

    @staticmethod
    def _nested_number(
        data: dict[str, Any] | None,
        *paths: tuple[str, ...],
    ) -> float | None:
        for path in paths:
            current: Any = data
            for key in path:
                if not isinstance(current, dict) or key not in current:
                    current = None
                    break
                current = current[key]
            if current is None:
                continue
            try:
                return float(current)
            except (TypeError, ValueError):
                continue
        return None
