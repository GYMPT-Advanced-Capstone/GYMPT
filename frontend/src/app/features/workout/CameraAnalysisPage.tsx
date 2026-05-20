import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { workoutApi, type ExerciseCalibrationResponse } from "../../api/workoutApi";
import { useGoal } from "../../context/GoalContext";
import { CameraStage } from "./components/CameraStage";
import { WorkoutHeader } from "./components/WorkoutHeader";
import { PUSHUP_KCAL_PER_REP, WORKOUT_EXERCISES } from "./config/exercises";
import { useCameraPreview } from "./hooks/useCameraPreview";
import { usePoseLandmarker } from "./hooks/usePoseLandmarker";
import { usePushupAnalysis } from "./hooks/usePushupAnalysis";
import { useSquatAnalysis } from "./hooks/useSquatAnalysis";
import { useWorkoutVoiceCoach } from "./hooks/useWorkoutVoiceCoach";
import type { NormalizedLandmark } from "./types/pose";
import { buildPushupObservation } from "./utils/pushup";

const SQUAT_KCAL_PER_REP = 0.32;

const IDEAL_METRICS: Record<string, Record<string, number>> = {
  squat: { bottomKneeAngle: 85 },
  pushup: { bottomElbowAngle: 55, bodyLineAngle: 180 },
};

function pickBestRepMetrics(
  exerciseType: string,
  repSummaries: { metrics: Record<string, number> }[],
): Record<string, number> | null {
  if (repSummaries.length === 0) return null;
  const ideal = IDEAL_METRICS[exerciseType];
  if (!ideal) return repSummaries[0].metrics;

  let bestMetrics = repSummaries[0].metrics;
  let bestScore = Infinity;

  for (const rep of repSummaries) {
    let score = 0;
    for (const [key, idealVal] of Object.entries(ideal)) {
      const actual = rep.metrics[key] ?? idealVal;
      score += Math.abs(actual - idealVal);
    }
    if (score < bestScore) {
      bestScore = score;
      bestMetrics = rep.metrics;
    }
  }

  return bestMetrics;
}

const TEXT = {
  finishWorkout: "운동 종료",
  feedbackTitle: "AI 실시간 피드백",
  modelLoading: "AI 자세 모델을 불러오는 중입니다...",
  modelError: "AI 자세 분석을 시작할 수 없습니다.",
  detecting: "랜드마크를 기반으로 자세를 분석 중입니다.",
  searching: "화면에서 자세를 찾고 있습니다.",
  calibrationLoading: "초기 범위 데이터를 불러오는 중입니다.",
} as const;

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function CameraAnalysisPage() {
  const navigate = useNavigate();
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const { goal } = useGoal();
  const resolvedExerciseId = exerciseId ?? "squat";
  const exercise = WORKOUT_EXERCISES[resolvedExerciseId] ?? WORKOUT_EXERCISES.squat;
  const isPushup = resolvedExerciseId === "pushup";
  const targetCount = goal.exerciseCounts[resolvedExerciseId as keyof typeof goal.exerciseCounts] ?? exercise.targetCount;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [calibration, setCalibration] = useState<ExerciseCalibrationResponse | null>(null);
  const [calibrationStatus, setCalibrationStatus] = useState<"idle" | "loading" | "ready" | "error">("loading");
  const [isSavingResult, setIsSavingResult] = useState(false);

  const {
    cameraStatus,
    cameraErrorMessage,
    isStreaming,
    requestCamera,
    stopCamera,
  } = useCameraPreview(videoRef);

  useEffect(() => {
    let cancelled = false;
    setCalibrationStatus("loading");
    workoutApi.getLatestCalibration(exercise.backendExerciseId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setCalibration(response);
        setCalibrationStatus("ready");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setCalibrationStatus("error");
        navigate(`/workout/calibration/${resolvedExerciseId}`, { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [exercise.backendExerciseId, navigate, resolvedExerciseId]);

  useEffect(() => {
    if (isStreaming && startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
    if (!isStreaming) {
      startedAtRef.current = null;
    }
  }, [isStreaming]);

  const { analysis: squatAnalysis, onPoseLandmarks: onSquatPoseLandmarks } = useSquatAnalysis({
    enabled: isStreaming && !isPushup && calibrationStatus === "ready",
    goalCount: targetCount,
    calibrationMetrics: (calibration?.metrics as Record<string, unknown> | null) ?? null,
  });
  const {
    analysis: pushupAnalysis,
    onTrackedLandmarks,
  } = usePushupAnalysis({
    enabled: isStreaming && isPushup && calibrationStatus === "ready",
    goalCount: targetCount,
    calibrationMetrics: (calibration?.metrics as Record<string, unknown> | null) ?? null,
  });

  const onPoseLandmarks = useMemo(() => {
    return (landmarks: NormalizedLandmark[] | null, timestampMs: number) => {
      if (isPushup) {
        const observation = buildPushupObservation(landmarks);
        onTrackedLandmarks(observation?.trackedLandmarks ?? null, timestampMs);
        return;
      }
      onSquatPoseLandmarks(landmarks, timestampMs);
    };
  }, [isPushup, onSquatPoseLandmarks, onTrackedLandmarks]);

  const {
    poseStatus,
    poseErrorMessage,
    hasPoseLandmarks,
  } = usePoseLandmarker({
    enabled: isStreaming,
    videoRef,
    canvasRef,
    onPoseLandmarks,
  });

  const currentAnalysis = isPushup ? pushupAnalysis : squatAnalysis;
  const repSummaries = isPushup ? pushupAnalysis.repSummaries : squatAnalysis.repSummaries;
  const estimatedCalories = isPushup
    ? (currentAnalysis.fullRepCount * PUSHUP_KCAL_PER_REP).toFixed(2)
    : (currentAnalysis.fullRepCount * SQUAT_KCAL_PER_REP).toFixed(2);
  const { noticeMessageOverride } = useWorkoutVoiceCoach({
    enabled: isStreaming && calibrationStatus === "ready",
    hasPoseLandmarks,
    poseStatus,
    goalCount: targetCount,
    visibilityPrompt:
      !isPushup
      && currentAnalysis.fullRepCount === 0
      && currentAnalysis.status === "insufficient_visibility"
        ? currentAnalysis.feedbackMessage
        : null,
    posturePrompt:
      !isPushup
      && currentAnalysis.fullRepCount === 0
      && currentAnalysis.status === "tracking"
      && currentAnalysis.feedbackMessage
        ? currentAnalysis.feedbackMessage
        : null,
    repEvent: currentAnalysis.lastRepEvent,
  });
  let noticeMessage: string = TEXT.searching;
  if (!isStreaming) {
    noticeMessage = exercise.idleFeedback;
  } else if (calibrationStatus === "loading") {
    noticeMessage = TEXT.calibrationLoading;
  } else if (poseStatus === "loading") {
    noticeMessage = TEXT.modelLoading;
  } else if (poseStatus === "error") {
    noticeMessage = poseErrorMessage ?? TEXT.modelError;
  } else if (hasPoseLandmarks) {
    noticeMessage = isPushup ? TEXT.detecting : (currentAnalysis.feedbackMessage || TEXT.detecting);
  }
  if (noticeMessageOverride) {
    noticeMessage = noticeMessageOverride;
  }

  const handleEndWorkout = async () => {
    stopCamera();

    const durationSeconds = startedAtRef.current
      ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
      : 1;

    const fallbackState = {
      exerciseId: resolvedExerciseId,
      name: exercise.name,
      targetCount,
      completedCount: currentAnalysis.fullRepCount,
      durationSeconds,
      durationLabel: formatDuration(durationSeconds),
      calories: estimatedCalories,
      retryPath: `/workout/camera/${resolvedExerciseId}`,
    };

    if (repSummaries.length === 0) {
      navigate("/post-workout", { state: fallbackState });
      return;
    }

    try {
      setIsSavingResult(true);
      const bestRepMetrics = pickBestRepMetrics(resolvedExerciseId, repSummaries);

      const response = await workoutApi.createExerciseRecord({
        exercise_id: exercise.backendExerciseId,
        count: currentAnalysis.fullRepCount,
        duration: durationSeconds,
        calories: estimatedCalories,
        completed_at: new Date().toISOString(),
        analysis: {
          exercise_type: resolvedExerciseId,
          reps: repSummaries.map((rep) => ({
            rep_index: rep.repIndex,
            metrics: rep.metrics,
            representative_feedback_code: rep.representativeFeedbackCode ?? null,
          })),
        },
        best_rep_metrics: bestRepMetrics,
      });

      navigate("/post-workout", {
        state: {
          ...fallbackState,
          completedCount: response.count,
          calories: response.calories,
          aiFeedback: response.ai_feedback ?? null,
        },
      });
    } catch {
      navigate("/post-workout", { state: fallbackState });
    } finally {
      setIsSavingResult(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-start justify-center bg-[#080A0D]">
      <div
        className="flex w-full max-w-[960px] flex-col px-4 pb-7 pt-3 mob-land:max-w-none mob-land:px-0 mob-land:pt-0 mob-land:pb-0"
        style={{ minHeight: "100dvh", backgroundColor: "#090B0E" }}
      >
        {/* 세로: 일반 헤더 */}
        <div className="mob-land:hidden">
          <WorkoutHeader
            currentCount={currentAnalysis.fullRepCount}
            exercise={{
              id: exercise.id,
              name: exercise.analysisName,
              iconSrc: exercise.iconSrc,
              targetCount,
            }}
          />
        </div>

        <main className="mt-4 flex flex-1 flex-col gap-4 mob-land:mt-0 mob-land:relative">
          <CameraStage
            canvasRef={canvasRef}
            cameraErrorMessage={cameraErrorMessage}
            cameraStatus={cameraStatus}
            isStreaming={isStreaming}
            noticeMessage={noticeMessage}
            noticeTitle={TEXT.feedbackTitle}
            onRequestCamera={requestCamera}
            stageMinHeightClassName={isPushup ? "min-h-[420px] md:min-h-[540px]" : "min-h-[calc(100dvh-112px)] md:min-h-[900px]"}
            videoRef={videoRef}
          />

          {/* 가로(모바일): 카메라 위 반투명 헤더 오버레이 */}
          <div className="hidden mob-land:flex absolute top-3 left-3 right-3 z-20 items-center justify-between rounded-2xl bg-black/60 px-3 py-2 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <button
                aria-label="뒤로 가기"
                className="flex h-9 w-9 items-center justify-center text-white/90"
                onClick={() => navigate(-1)}
                type="button"
              >
                <ArrowLeft size={20} />
              </button>
              {exercise.iconSrc && (
                <img src={exercise.iconSrc} alt={exercise.analysisName} className="h-6 w-6 object-contain" />
              )}
              <span className="text-[15px] font-extrabold text-white">{exercise.analysisName}</span>
            </div>
            <div className="rounded-full border border-[#39F4D3] bg-[#102C28]/80 px-3 py-[3px]">
              <span className="text-[12px] font-bold text-[#3FFDD4]">
                목표 {Math.min(currentAnalysis.fullRepCount, targetCount)}/{targetCount}
              </span>
            </div>
          </div>
        </main>

        <button
          className={`${isPushup ? "mt-5" : "mt-2"} rounded-[16px] bg-[#3FEED0] py-4 text-[19px] font-extrabold text-[#081B16] disabled:cursor-not-allowed disabled:bg-[#2A4A43] disabled:text-[#9CC7BE]`}
          disabled={isSavingResult || calibrationStatus === "loading"}
          onClick={() => {
            void handleEndWorkout();
          }}
          type="button"
        >
          {isSavingResult ? "결과 저장 중..." : TEXT.finishWorkout}
        </button>
      </div>
    </div>
  );
}
