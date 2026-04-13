from datetime import date, datetime
from decimal import Decimal
from typing import Any, cast

from fastapi import HTTPException, status

from app.exercise_record.exercise_record_model import (
    ExerciseRecord,
    ExerciseRecordAnalysis,
)
from app.exercise_record.exercise_record_repository import ExerciseRecordRepository
from app.exercise_record.dto.exercise_record_request import (
    ExerciseRecordAnalysisCreateRequest,
    ExerciseRecordCreateRequest,
    ExerciseRepSummaryRequest,
    ExerciseRecordUpdateRequest,
)
from app.exercise_record.dto.exercise_record_response import (
    ExerciseRecordAnalysisResponse,
    CalendarResponse,
    ExerciseRecordResponse,
)


class ExerciseRecordService:
    def __init__(self, repo: ExerciseRecordRepository) -> None:
        self.repo = repo

    def create(
        self, user_id: int, data: ExerciseRecordCreateRequest
    ) -> ExerciseRecordResponse:
        score = data.score
        accuracy_avg = data.accuracy_avg
        score_summary: dict[str, int] | None = None
        range_summary: dict[str, Any] | None = None
        feedback_items: list[str] = []
        if data.analysis is not None:
            calibration_metrics: dict[str, Any] | None = None
            if data.analysis.calibration_id is not None:
                calibration = self.repo.get_calibration_by_id(
                    user_id,
                    data.analysis.calibration_id,
                )
                if calibration is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="초기 가동범위 설정을 찾을 수 없습니다.",
                    )
                calibration_metrics = cast(dict[str, Any], calibration.metrics_json)

            range_summary = self._build_range_summary(data.analysis)
            score_summary = self._calculate_analysis_scores(
                data.analysis,
                range_summary=range_summary,
                calibration_metrics=calibration_metrics,
            )
            feedback_items = self._build_feedback_items(score_summary)
            score = score_summary["score"]
            accuracy_avg = Decimal(str(score_summary["accuracy_avg"]))

        record = ExerciseRecord(
            user_id=user_id,
            exercise_id=data.exercise_id,
            count=data.count,
            duration=data.duration,
            calories=data.calories,
            score=score,
            accuracy_avg=accuracy_avg,
            completed_at=data.completed_at,
        )
        created_record = self.repo.create(record)

        if data.analysis is not None and score_summary is not None:
            self.repo.create_analysis(
                ExerciseRecordAnalysis(
                    exercise_record_id=created_record.id,
                    calibration_id=data.analysis.calibration_id,
                    range_score=score_summary["range_score"],
                    extension_score=score_summary["extension_score"],
                    stability_score=score_summary["stability_score"],
                    range_summary_json=range_summary or {},
                    feedback_items_json=feedback_items,
                )
            )
            created_record = self._get_or_404(int(created_record.id), user_id)

        return self._to_response(created_record)

    def get_calendar(self, user_id: int, year: int, month: int) -> CalendarResponse:
        if not (1 <= month <= 12):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="월은 1~12 사이여야 합니다.",
            )
        dates = self.repo.get_exercised_dates_by_month(user_id, year, month)
        return CalendarResponse(exercised_dates=[str(d) for d in dates])

    def get_by_date(
        self, user_id: int, target_date: date
    ) -> list[ExerciseRecordResponse]:
        return [
            self._to_response(r) for r in self.repo.get_by_date(user_id, target_date)
        ]

    def update(
        self, user_id: int, record_id: int, data: ExerciseRecordUpdateRequest
    ) -> ExerciseRecordResponse:
        if data.count is None and data.duration is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="수정할 값이 없습니다.",
            )
        record = self._get_or_404(record_id, user_id)
        return self._to_response(self.repo.update(record, data.count, data.duration))

    def delete(self, user_id: int, record_id: int) -> None:
        self.repo.delete(self._get_or_404(record_id, user_id))

    def _get_or_404(self, record_id: int, user_id: int) -> ExerciseRecord:
        record = self.repo.get_by_id(record_id, user_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="운동 기록을 찾을 수 없습니다.",
            )
        return record

    def _to_response(self, record: ExerciseRecord) -> ExerciseRecordResponse:
        return ExerciseRecordResponse(
            id=cast(int, record.id),
            exercise_id=cast(int, record.exercise_id),
            exercise_name=record.exercise.name,
            count=cast(int, record.count),
            duration=cast(int, record.duration),
            calories=cast(Decimal, record.calories),
            score=cast(int, record.score),
            accuracy_avg=cast(Decimal, record.accuracy_avg),
            completed_at=cast(datetime, record.completed_at),
            analysis=self._to_analysis_response(getattr(record, "analysis", None)),
        )

    def _to_analysis_response(
        self,
        analysis: ExerciseRecordAnalysis | None,
    ) -> ExerciseRecordAnalysisResponse | None:
        if analysis is None:
            return None
        return ExerciseRecordAnalysisResponse(
            id=cast(int, analysis.id),
            calibration_id=cast(int | None, analysis.calibration_id),
            range_score=cast(int, analysis.range_score),
            extension_score=cast(int, analysis.extension_score),
            stability_score=cast(int, analysis.stability_score),
            range_summary=cast(dict[str, Any], analysis.range_summary_json),
            feedback=cast(list[str], analysis.feedback_items_json),
            created_at=cast(datetime, analysis.created_at),
        )

    def _calculate_analysis_scores(
        self,
        analysis: ExerciseRecordAnalysisCreateRequest,
        *,
        range_summary: dict[str, Any],
        calibration_metrics: dict[str, Any] | None = None,
    ) -> dict[str, int]:
        exercise_type = self._resolve_exercise_type(
            calibration_metrics,
            range_summary,
            analysis.exercise_type,
        )

        if exercise_type == "pushup":
            return self._calculate_pushup_scores(
                range_summary,
                calibration_metrics=calibration_metrics,
            )

        if exercise_type == "squat":
            # TODO: Implement squat scoring with knee/hip depth and knee alignment metrics.
            return self._calculate_default_scores(range_summary)

        if exercise_type == "lunge":
            # TODO: Implement lunge scoring with front/back knee angle, torso, and balance metrics.
            return self._calculate_default_scores(range_summary)

        if exercise_type == "plank":
            # TODO: Implement plank scoring with body line, hip sag, and hold-time stability metrics.
            return self._calculate_default_scores(range_summary)

        return self._calculate_default_scores(range_summary)

    def _calculate_pushup_scores(
        self,
        range_summary: dict[str, Any],
        *,
        calibration_metrics: dict[str, Any] | None = None,
    ) -> dict[str, int]:
        range_score = self._score_from_summary(
            range_summary,
            score_keys=("range_score", "rangeScore"),
            rate_keys=("range_completion_rate", "rangeCompletionRate"),
            default=self._range_score_from_calibration(
                calibration_metrics,
                range_summary,
            ),
        )
        extension_score = self._score_from_summary(
            range_summary,
            score_keys=("extension_score", "extensionScore"),
            rate_keys=("top_extension_rate", "topExtensionRate"),
            default=self._extension_score_from_calibration(
                calibration_metrics,
                range_summary,
                fallback=range_score,
            ),
        )
        stability_score = self._score_from_summary(
            range_summary,
            score_keys=("stability_score", "stabilityScore"),
            rate_keys=("body_stability_rate", "bodyStabilityRate"),
            default=self._stability_score_from_calibration(
                calibration_metrics,
                range_summary,
                fallback=range_score,
            ),
        )
        overall_score = round(
            (range_score * 0.45) + (extension_score * 0.25) + (stability_score * 0.30)
        )
        accuracy_avg = round((range_score + extension_score + stability_score) / 3)
        return {
            "range_score": range_score,
            "extension_score": extension_score,
            "stability_score": stability_score,
            "score": self._clamp_score(overall_score),
            "accuracy_avg": self._clamp_score(accuracy_avg),
        }

    def _calculate_default_scores(
        self,
        range_summary: dict[str, Any],
    ) -> dict[str, int]:
        range_score = self._score_from_summary(
            range_summary,
            score_keys=("range_score", "rangeScore"),
            rate_keys=("range_completion_rate", "rangeCompletionRate"),
            default=0,
        )
        extension_score = self._score_from_summary(
            range_summary,
            score_keys=("extension_score", "extensionScore"),
            rate_keys=("top_extension_rate", "topExtensionRate"),
            default=range_score,
        )
        stability_score = self._score_from_summary(
            range_summary,
            score_keys=("stability_score", "stabilityScore"),
            rate_keys=("body_stability_rate", "bodyStabilityRate"),
            default=range_score,
        )
        overall_score = round(
            (range_score * 0.45) + (extension_score * 0.25) + (stability_score * 0.30)
        )
        accuracy_avg = round((range_score + extension_score + stability_score) / 3)
        return {
            "range_score": range_score,
            "extension_score": extension_score,
            "stability_score": stability_score,
            "score": self._clamp_score(overall_score),
            "accuracy_avg": self._clamp_score(accuracy_avg),
        }

    def _resolve_exercise_type(
        self,
        calibration_metrics: dict[str, Any] | None,
        performed_summary: dict[str, Any],
        exercise_type: str | None = None,
    ) -> str:
        candidates = [
            exercise_type,
            self._nested_value(performed_summary, ("exerciseType",)),
            self._nested_value(performed_summary, ("exercise_type",)),
            self._nested_value(calibration_metrics, ("exerciseType",)),
            self._nested_value(calibration_metrics, ("exercise_type",)),
        ]
        for candidate in candidates:
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip().lower()
        return "default"

    def _build_range_summary(
        self,
        analysis: ExerciseRecordAnalysisCreateRequest,
    ) -> dict[str, Any]:
        summary: dict[str, Any] = {}
        rep_count = len(analysis.reps)
        if analysis.exercise_type:
            summary["exerciseType"] = analysis.exercise_type
        summary["repCount"] = rep_count
        if rep_count == 0:
            return summary

        numeric_values: dict[str, list[float]] = {}
        for rep in analysis.reps:
            for key, value in rep.metrics.items():
                try:
                    numeric = float(value)
                except (TypeError, ValueError):
                    continue
                numeric_values.setdefault(key, []).append(numeric)

        for key, values in numeric_values.items():
            if not values:
                continue
            averaged_value = round(sum(values) / len(values), 2)
            summary[key] = averaged_value
            summary[f"average{key[0].upper()}{key[1:]}"] = averaged_value

        return summary

    def _build_feedback_items(self, score_summary: dict[str, int]) -> list[str]:
        feedback_items: list[str] = []
        if score_summary["range_score"] < 85:
            feedback_items.append(
                "초기 설정 범위 대비 내려가는 깊이가 약간 부족했습니다."
            )
        if score_summary["extension_score"] < 85:
            feedback_items.append(
                "올라올 때 팔을 끝까지 펴는 동작이 다소 부족했습니다."
            )
        if score_summary["stability_score"] < 85:
            feedback_items.append(
                "몸통 정렬이 흔들리지 않도록 코어를 더 단단히 유지해 주세요."
            )
        if not feedback_items:
            feedback_items.append("전반적인 자세가 안정적이었습니다.")
        return feedback_items

    def _score_from_summary(
        self,
        summary: dict[str, Any],
        *,
        score_keys: tuple[str, ...],
        rate_keys: tuple[str, ...],
        default: int,
    ) -> int:
        for key in score_keys:
            if key in summary:
                return self._clamp_score(summary[key])
        for key in rate_keys:
            if key in summary:
                return self._score_from_rate(summary[key])
        return self._clamp_score(default)

    @staticmethod
    def _score_from_rate(value: Any) -> int:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return 0
        if numeric <= 1:
            numeric *= 100
        return ExerciseRecordService._clamp_score(numeric)

    @staticmethod
    def _clamp_score(value: Any) -> int:
        try:
            numeric = round(float(value))
        except (TypeError, ValueError):
            return 0
        return max(0, min(100, numeric))

    def _range_score_from_calibration(
        self,
        calibration_metrics: dict[str, Any] | None,
        performed_summary: dict[str, Any],
    ) -> int:
        if calibration_metrics is None:
            return 0

        target_bottom = self._nested_number(
            calibration_metrics,
            ("bottom", "elbowAngle"),
            ("bottomElbowAngle",),
        )
        performed_bottom = self._nested_number(
            performed_summary,
            ("averageBottomElbowAngle",),
            ("bottomElbowAngle",),
            ("performed", "averageBottomElbowAngle"),
        )
        if target_bottom is None or performed_bottom is None:
            return 0

        missing_depth_degrees = max(0.0, performed_bottom - target_bottom)
        return self._clamp_score(100 - (missing_depth_degrees * 4))

    def _extension_score_from_calibration(
        self,
        calibration_metrics: dict[str, Any] | None,
        performed_summary: dict[str, Any],
        *,
        fallback: int,
    ) -> int:
        if calibration_metrics is None:
            return fallback

        target_top = self._nested_number(
            calibration_metrics,
            ("top", "elbowAngle"),
            ("topElbowAngle",),
        )
        performed_top = self._nested_number(
            performed_summary,
            ("averageTopElbowAngle",),
            ("topElbowAngle",),
            ("performed", "averageTopElbowAngle"),
        )
        if target_top is None or performed_top is None:
            return fallback

        missing_extension_degrees = max(0.0, target_top - performed_top)
        return self._clamp_score(100 - (missing_extension_degrees * 4))

    def _stability_score_from_calibration(
        self,
        calibration_metrics: dict[str, Any] | None,
        performed_summary: dict[str, Any],
        *,
        fallback: int,
    ) -> int:
        if calibration_metrics is None:
            return fallback

        target_body_line = self._nested_number(
            calibration_metrics,
            ("bottom", "bodyLineAngle"),
            ("top", "bodyLineAngle"),
            ("bodyLineAngle",),
        )
        performed_body_line = self._nested_number(
            performed_summary,
            ("averageBodyLineAngle",),
            ("bodyLineAngle",),
            ("performed", "averageBodyLineAngle"),
        )
        if target_body_line is None or performed_body_line is None:
            return fallback

        deviation_degrees = abs(target_body_line - performed_body_line)
        return self._clamp_score(100 - (deviation_degrees * 3))

    @staticmethod
    def _nested_number(data: dict[str, Any], *paths: tuple[str, ...]) -> float | None:
        for path in paths:
            current = ExerciseRecordService._nested_value(data, path)

            if current is None:
                continue

            try:
                return float(current)
            except (TypeError, ValueError):
                continue

        return None

    @staticmethod
    def _nested_value(
        data: dict[str, Any] | None,
        path: tuple[str, ...],
    ) -> Any:
        current: Any = data
        for key in path:
            if not isinstance(current, dict) or key not in current:
                return None
            current = current[key]
        return current
