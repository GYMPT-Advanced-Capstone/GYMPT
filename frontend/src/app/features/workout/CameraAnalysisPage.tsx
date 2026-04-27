import { useEffect, useMemo, useRef, useState } from "react";
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
  const [calibrationStatus, setCalibrationStatus] = useState<"idle" | "loading" | "ready" | "error">(
    isPushup ? "loading" : "ready",
  );
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isSavingResult, setIsSavingResult] = useState(false);

  const {
    cameraStatus,
    cameraErrorMessage,
    isStreaming,
    requestCamera,
    stopCamera,
  } = useCameraPreview(videoRef);

  useEffect(() => {
    if (!isPushup) {
      setCalibrationStatus("ready");
      return;
    }

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
  }, [exercise.backendExerciseId, isPushup, navigate, resolvedExerciseId]);

  useEffect(() => {
    if (isStreaming && startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
    if (!isStreaming) {
      startedAtRef.current = null;
    }
  }, [isStreaming]);

  const { analysis: squatAnalysis, onPoseLandmarks: onSquatPoseLandmarks } = useSquatAnalysis({
    enabled: isStreaming && !isPushup,
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
  const pushupRepSummaries = isPushup ? pushupAnalysis.repSummaries : [];
  const estimatedCalories = isPushup
    ? (currentAnalysis.fullRepCount * PUSHUP_KCAL_PER_REP).toFixed(2)
    : "0.00";
  const { noticeMessageOverride } = useWorkoutVoiceCoach({
    enabled: isStreaming && isPushup,
    hasPoseLandmarks,
    poseStatus,
    goalCount: targetCount,
    repEvent: isPushup ? pushupAnalysis.lastRepEvent : null,
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
  } else if (finishError) {
    noticeMessage = finishError;
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
      score: 0,
      retryPath: `/workout/camera/${resolvedExerciseId}`,
    };

    if (!isPushup || pushupRepSummaries.length === 0) {
      navigate("/post-workout", { state: fallbackState });
      return;
    }

    try {
      setIsSavingResult(true);
      const response = await workoutApi.createExerciseRecord({
        exercise_id: exercise.backendExerciseId,
        count: currentAnalysis.fullRepCount,
        duration: durationSeconds,
        calories: estimatedCalories,
        score: 1,
        accuracy_avg: "1.00",
        completed_at: new Date().toISOString(),
        analysis: {
          calibration_id: calibration?.id ?? null,
          exercise_type: "pushup",
          reps: pushupRepSummaries.map((rep) => ({
            rep_index: rep.repIndex,
            metrics: rep.metrics,
          })),
        },
      });

      navigate("/post-workout", {
        state: {
          ...fallbackState,
          completedCount: response.count,
          calories: response.calories,
          score: response.score,
          accuracyAvg: response.accuracy_avg,
          analysis: response.analysis,
        },
      });
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : "운동 기록 저장에 실패했습니다.");
      navigate("/post-workout", { state: fallbackState });
    } finally {
      setIsSavingResult(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-start justify-center bg-[#080A0D]">
      <div
        className="flex w-full max-w-[960px] flex-col px-4 pb-7 pt-3"
        style={{ minHeight: "100dvh", backgroundColor: "#090B0E" }}
      >
        <WorkoutHeader
          currentCount={currentAnalysis.fullRepCount}
          exercise={{
            id: exercise.id,
            name: exercise.analysisName,
            iconSrc: exercise.iconSrc,
            targetCount,
          }}
        />

        <main className="mt-4 flex flex-1 flex-col gap-4">
          <CameraStage
            canvasRef={canvasRef}
            cameraErrorMessage={cameraErrorMessage}
            cameraStatus={cameraStatus}
            isStreaming={isStreaming}
            noticeMessage={noticeMessage}
            noticeTitle={TEXT.feedbackTitle}
            onRequestCamera={requestCamera}
            stageMinHeightClassName={isPushup ? "min-h-[420px] md:min-h-[540px]" : "min-h-[700px]"}
            videoRef={videoRef}
          />
        </main>

        <button
          className="mt-5 rounded-[16px] bg-[#3FEED0] py-4 text-[19px] font-extrabold text-[#081B16] disabled:cursor-not-allowed disabled:bg-[#2A4A43] disabled:text-[#9CC7BE]"
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
