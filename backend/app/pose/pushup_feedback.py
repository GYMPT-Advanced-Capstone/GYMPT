from __future__ import annotations

from math import acos, degrees, sqrt
from typing import Any


PUSHUP_VIEW_MESSAGE = "측면이 잘 보이도록 몸을 옆으로 보여주세요."
PUSHUP_SAG_MESSAGE = "엉덩이가 처지고 있습니다. 몸통을 더 단단히 유지해주세요."
PUSHUP_PIKE_MESSAGE = "엉덩이를 너무 높이 들지 마세요. 몸을 일직선으로 맞춰주세요."
PUSHUP_DEPTH_MESSAGE = "깊이가 부족했습니다. 바텀 자세까지 조금 더 내려가주세요."
PUSHUP_GOOD_MESSAGE = "좋습니다."
PUSHUP_BODY_LINE_MESSAGE = "상체 각도를 더 곧게 유지해주세요."
PUSHUP_BOTTOM_GOOD_DEPTH = 0.70
PUSHUP_TOP_ZONE_MAX = 0.30
PUSHUP_HIP_OFFSET_THRESHOLD = 0.045
PUSHUP_BODY_LINE_TOLERANCE_DEGREES = 18.0
PUSHUP_MIN_REP_DURATION_MS = 200.0


class PushupFeedbackProcessor:
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
        observation = self._resolve_observation(
            tracked_landmarks,
            state.calibration_metrics,
        )

        state.last_timestamp_ms = timestamp_ms
        if observation is None:
            return {
                "type": "error",
                "status": "insufficient_visibility",
                "feedbackMessage": PUSHUP_VIEW_MESSAGE,
                "fullRepCount": state.full_rep_count,
                "goalCount": state.goal_count,
                "timestampMs": state.last_timestamp_ms,
            }

        zone = self._resolve_zone(observation["depthProgress"])
        warning_code, warning_message = self._resolve_warning(observation)
        feedback_message = warning_message or PUSHUP_GOOD_MESSAGE
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
            state.current_rep_min_elbow_angle = min(
                state.current_rep_min_elbow_angle,
                observation["elbowAngle"],
            )
            state.current_rep_max_top_elbow_angle = max(
                state.current_rep_max_top_elbow_angle,
                observation["elbowAngle"],
            )
            state.current_rep_body_line_sum += observation["bodyLineAngle"]
            state.current_rep_body_line_samples += 1
            if state.current_rep_warning_counts is None:
                state.current_rep_warning_counts = {}
            if warning_code:
                state.current_rep_warning_counts[warning_code] = (
                    state.current_rep_warning_counts.get(warning_code, 0) + 1
                )

        if zone == "top" and state.movement_zone != "top" and state.rep_active:
            rep_duration_ms = 0.0
            if state.current_rep_started_at_ms > 0:
                rep_duration_ms = max(
                    0.0,
                    timestamp_ms - state.current_rep_started_at_ms,
                )

            if rep_duration_ms >= PUSHUP_MIN_REP_DURATION_MS:
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
            "exerciseType": "pushup",
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
        tracked_landmarks: Any,
        calibration_metrics: dict[str, Any] | None,
    ) -> dict[str, float] | None:
        if not isinstance(tracked_landmarks, dict):
            return None

        shoulder = self._point(tracked_landmarks.get("shoulder"))
        elbow = self._point(tracked_landmarks.get("elbow"))
        wrist = self._point(tracked_landmarks.get("wrist"))
        hip = self._point(tracked_landmarks.get("hip"))
        ankle = self._point(tracked_landmarks.get("ankle"))

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

        top_elbow = self._nested_number(
            calibration_metrics,
            ("top", "elbowAngle"),
            ("topElbowAngle",),
        )
        bottom_elbow = self._nested_number(
            calibration_metrics,
            ("bottom", "elbowAngle"),
            ("bottomElbowAngle",),
        )
        top_shoulder_y = self._nested_number(
            calibration_metrics,
            ("top", "shoulderY"),
            ("topShoulderY",),
        )
        bottom_shoulder_y = self._nested_number(
            calibration_metrics,
            ("bottom", "shoulderY"),
            ("bottomShoulderY",),
        )

        elbow_progress = self._progress_between(
            start=top_elbow,
            end=bottom_elbow,
            current=elbow_angle,
            invert=True,
        )
        shoulder_progress = self._progress_between(
            start=top_shoulder_y,
            end=bottom_shoulder_y,
            current=shoulder[1],
            invert=False,
        )
        depth_progress = max(elbow_progress, shoulder_progress)
        if elbow_progress > 0 and shoulder_progress > 0:
            depth_progress = (elbow_progress + shoulder_progress) / 2

        return {
            "elbowAngle": elbow_angle,
            "bodyLineAngle": body_line_angle,
            "hipLineOffset": hip_line_offset,
            "shoulderY": shoulder[1],
            "depthProgress": max(0.0, min(depth_progress, 1.0)),
        }

    @staticmethod
    def _resolve_zone(depth_progress: float) -> str:
        if depth_progress >= PUSHUP_BOTTOM_GOOD_DEPTH:
            return "bottom"
        if depth_progress <= PUSHUP_TOP_ZONE_MAX:
            return "top"
        return "mid"

    @staticmethod
    def _resolve_warning(
        observation: dict[str, float],
    ) -> tuple[str | None, str | None]:
        hip_offset = observation["hipLineOffset"]
        if hip_offset >= PUSHUP_HIP_OFFSET_THRESHOLD:
            return "hip_sag", PUSHUP_SAG_MESSAGE
        if hip_offset <= -PUSHUP_HIP_OFFSET_THRESHOLD:
            return "hip_high", PUSHUP_PIKE_MESSAGE
        if (
            abs(180.0 - observation["bodyLineAngle"])
            > PUSHUP_BODY_LINE_TOLERANCE_DEGREES
        ):
            return "body_line_bad", PUSHUP_BODY_LINE_MESSAGE
        return None, None

    def _build_rep_summary(
        self,
        state: Any,
        observation: dict[str, float],
    ) -> dict[str, Any]:
        calibration = state.calibration_metrics
        average_body_line = observation["bodyLineAngle"]
        if state.current_rep_body_line_samples > 0:
            average_body_line = (
                state.current_rep_body_line_sum / state.current_rep_body_line_samples
            )

        target_top = self._nested_number(
            calibration,
            ("top", "elbowAngle"),
            ("topElbowAngle",),
        )
        target_body_line = self._nested_number(
            calibration,
            ("bottom", "bodyLineAngle"),
            ("top", "bodyLineAngle"),
            ("bodyLineAngle",),
        )

        top_extension_rate = 1.0
        if target_top is not None and target_top > 0:
            top_extension_rate = max(
                0.0,
                min(state.current_rep_max_top_elbow_angle / target_top, 1.0),
            )

        body_stability_rate = 1.0
        if target_body_line is not None:
            deviation = abs(target_body_line - average_body_line)
            body_stability_rate = max(0.0, min(1.0 - (deviation / 30.0), 1.0))

        return {
            "bottomElbowAngle": round(state.current_rep_min_elbow_angle, 2),
            "topElbowAngle": round(state.current_rep_max_top_elbow_angle, 2),
            "shoulderY": round(observation["shoulderY"], 4),
            "bodyLineAngle": round(average_body_line, 2),
            "rangeCompletionRate": round(min(state.current_rep_max_depth, 1.0), 4),
            "topExtensionRate": round(top_extension_rate, 4),
            "bodyStabilityRate": round(body_stability_rate, 4),
        }

    def _resolve_representative_feedback(self, state: Any) -> tuple[str, str]:
        warning_counts = dict(state.current_rep_warning_counts or {})
        if state.current_rep_max_depth < PUSHUP_BOTTOM_GOOD_DEPTH:
            return "depth_low", PUSHUP_DEPTH_MESSAGE

        if not warning_counts:
            return "good", PUSHUP_GOOD_MESSAGE

        priority = {
            "depth_low": 4,
            "hip_sag": 3,
            "hip_high": 2,
            "body_line_bad": 1,
        }
        selected_code = sorted(
            warning_counts.items(),
            key=lambda item: (-priority.get(item[0], 0), -item[1]),
        )[0][0]
        message_map = {
            "depth_low": PUSHUP_DEPTH_MESSAGE,
            "hip_sag": PUSHUP_SAG_MESSAGE,
            "hip_high": PUSHUP_PIKE_MESSAGE,
            "body_line_bad": PUSHUP_BODY_LINE_MESSAGE,
            "good": PUSHUP_GOOD_MESSAGE,
        }
        return selected_code, message_map[selected_code]

    @staticmethod
    def _point(value: Any) -> tuple[float, float] | None:
        if not isinstance(value, dict):
            return None
        try:
            x = float(value["x"])
            y = float(value["y"])
        except (KeyError, TypeError, ValueError):
            return None
        return (x, y)

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
        length = sqrt((dx * dx) + (dy * dy))
        if length == 0:
            return 0.0
        return ((dx * (y0 - y1)) - (dy * (x0 - x1))) / length

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
            return (start - current) / (start - end)
        return (current - start) / (end - start)

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
