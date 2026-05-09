import { useCallback, useEffect, useRef, useState } from "react";

import { workoutApi, type ExerciseCalibrationSampleRequest } from "../../../api/workoutApi";
import type { NormalizedLandmark } from "../types/pose";
import { buildSquatObservation } from "../utils/squat";
import { cancelSpeech, speakKorean } from "../utils/speech";

const HOLD_DURATION_MS = 2000;
const TRANSITION_DELAY_MS = 1000;
const COMPLETE_REDIRECT_DELAY_MS = 1200;

export type SquatCalibrationStep =
  | "idle"
  | "top_waiting"
  | "top_counting"
  | "transition_to_bottom"
  | "bottom_waiting"
  | "bottom_counting"
  | "saving"
  | "complete";

interface UseSquatCalibrationParams {
  enabled: boolean;
  exerciseId: number;
  onSuccess: () => void;
}

interface UseSquatCalibrationResult {
  step: SquatCalibrationStep;
  phase: "top" | "bottom";
  capturedSide: "left" | "right" | null;
  calibrationError: string | null;
  isSavingCalibration: boolean;
  isCalibrationComplete: boolean;
  noticeMessage: string | null;
  onPoseLandmarks: (landmarks: NormalizedLandmark[] | null, timestampMs: number) => void;
  startCalibration: () => void;
  resetCalibration: () => void;
}

function isStablePose(
  phase: "top" | "bottom",
  metrics: { kneeAngle: number; hipAngle: number; torsoLeanAngle: number },
) {
  if (metrics.torsoLeanAngle > 70) {
    return false;
  }
  if (phase === "top") {
    return metrics.kneeAngle >= 145 && metrics.hipAngle >= 135;
  }
  return metrics.kneeAngle >= 45 && metrics.kneeAngle <= 155 && metrics.hipAngle >= 40 && metrics.hipAngle <= 175;
}

export function useSquatCalibration({
  enabled,
  exerciseId,
  onSuccess,
}: UseSquatCalibrationParams): UseSquatCalibrationResult {
  const [step, setStep] = useState<SquatCalibrationStep>("idle");
  const [phase, setPhase] = useState<"top" | "bottom">("top");
  const [capturedSide, setCapturedSide] = useState<"left" | "right" | null>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [isSavingCalibration, setIsSavingCalibration] = useState(false);
  const [isCalibrationComplete, setIsCalibrationComplete] = useState(false);
  const captureStartedAtRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const completeTimeoutRef = useRef<number | null>(null);
  const lastSpokenStepRef = useRef<SquatCalibrationStep | null>(null);
  const samplesRef = useRef<Record<"top" | "bottom", ExerciseCalibrationSampleRequest[]>>({
    top: [],
    bottom: [],
  });

  const speak = useCallback((message: string) => {
    speakKorean(message, { cancel: true });
  }, []);

  const resetCalibration = useCallback(() => {
    samplesRef.current = { top: [], bottom: [] };
    captureStartedAtRef.current = null;
    setPhase("top");
    setStep("idle");
    setCapturedSide(null);
    setCalibrationError(null);
    setIsSavingCalibration(false);
    setIsCalibrationComplete(false);
    lastSpokenStepRef.current = null;
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (completeTimeoutRef.current !== null) {
      window.clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }
  }, []);

  const startCalibration = useCallback(() => {
    samplesRef.current = { top: [], bottom: [] };
    captureStartedAtRef.current = null;
    setPhase("top");
    setStep("top_waiting");
    setCapturedSide(null);
    setCalibrationError(null);
  }, []);

  useEffect(() => {
    const resetTimeout = window.setTimeout(() => {
      resetCalibration();
    }, 0);
    return () => {
      window.clearTimeout(resetTimeout);
    };
  }, [exerciseId, resetCalibration]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
      if (completeTimeoutRef.current !== null) {
        window.clearTimeout(completeTimeoutRef.current);
      }
      cancelSpeech();
    };
  }, []);

  useEffect(() => {
    if (!enabled || lastSpokenStepRef.current === step) {
      return;
    }

    const messages: Partial<Record<SquatCalibrationStep, string>> = {
      top_waiting: "정면이 아닌 측면으로 서서 선 자세를 유지해주세요.",
      top_counting: "좋습니다. 선 자세 측정을 시작합니다. 2초만 유지해주세요.",
      transition_to_bottom: "좋습니다. 이제 앉은 자세를 측정합니다. 천천히 내려가 유지해주세요.",
      bottom_waiting: "앉은 자세를 유지해주세요. 안정되면 자동으로 2초간 측정합니다.",
      bottom_counting: "앉은 자세 측정을 시작합니다. 2초만 유지해주세요.",
      saving: "스쿼트 기준 범위를 저장하고 있습니다.",
      complete: "스쿼트 기준 범위 설정이 완료되었습니다. 운동을 시작합니다.",
    };
    lastSpokenStepRef.current = step;
    const message = messages[step];
    if (message) {
      speak(message);
    }
  }, [enabled, speak, step]);

  const onPoseLandmarks = useCallback((landmarks: NormalizedLandmark[] | null, timestampMs: number) => {
    if (
      !enabled
      || (step !== "top_waiting"
        && step !== "top_counting"
        && step !== "bottom_waiting"
        && step !== "bottom_counting")
      || !landmarks
    ) {
      return;
    }

    const observation = buildSquatObservation(landmarks);
    if (!observation) {
      captureStartedAtRef.current = null;
      if (step === "top_counting") {
        samplesRef.current.top = [];
        setStep("top_waiting");
      } else if (step === "bottom_counting") {
        samplesRef.current.bottom = [];
        setStep("bottom_waiting");
      }
      return;
    }

    const activePhase = step === "top_waiting" || step === "top_counting" ? "top" : "bottom";
    const stable = isStablePose(activePhase, observation.metrics);
    setCapturedSide(observation.trackedLandmarks.side);

    if (!stable) {
      captureStartedAtRef.current = null;
      samplesRef.current[activePhase] = [];
      if (activePhase === "top" && step === "top_counting") {
        setStep("top_waiting");
      }
      if (activePhase === "bottom" && step === "bottom_counting") {
        setStep("bottom_waiting");
      }
      return;
    }

    samplesRef.current[activePhase].push({
      phase: activePhase,
      metrics: observation.metrics,
    });

    if (captureStartedAtRef.current === null) {
      captureStartedAtRef.current = timestampMs;
      setStep(activePhase === "top" ? "top_counting" : "bottom_counting");
      return;
    }

    if (timestampMs - captureStartedAtRef.current < HOLD_DURATION_MS) {
      return;
    }

    captureStartedAtRef.current = null;

    if (activePhase === "top") {
      setPhase("bottom");
      setStep("transition_to_bottom");
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
      transitionTimeoutRef.current = window.setTimeout(() => {
        samplesRef.current.bottom = [];
        setStep("bottom_waiting");
      }, TRANSITION_DELAY_MS);
      return;
    }

    const topSamples = samplesRef.current.top;
    const bottomSamples = samplesRef.current.bottom;
    if (topSamples.length === 0 || bottomSamples.length === 0) {
      setCalibrationError("선 자세와 앉은 자세를 모두 측정해주세요.");
      return;
    }

    setIsSavingCalibration(true);
    setStep("saving");
    void workoutApi.createCalibration({
      exercise_id: exerciseId,
      version: 1,
      exercise_type: "squat",
      side: observation.trackedLandmarks.side,
      hold_duration_ms: HOLD_DURATION_MS,
      samples: [...topSamples, ...bottomSamples],
    }).then(() => {
      setIsCalibrationComplete(true);
      setStep("complete");
      completeTimeoutRef.current = window.setTimeout(() => {
        onSuccess();
      }, COMPLETE_REDIRECT_DELAY_MS);
    }).catch((error) => {
      setStep("bottom_waiting");
      setCalibrationError(error instanceof Error ? error.message : "스쿼트 기준 범위 저장에 실패했습니다.");
    }).finally(() => {
      setIsSavingCalibration(false);
    });
  }, [enabled, exerciseId, onSuccess, step]);

  let noticeMessage: string | null = null;
  if (step === "top_waiting") {
    noticeMessage = "측면으로 서서 선 자세를 유지해주세요. 안정되면 자동으로 2초간 측정합니다.";
  } else if (step === "top_counting") {
    noticeMessage = "선 자세 측정 중입니다. 2초만 그대로 유지해주세요.";
  } else if (step === "transition_to_bottom") {
    noticeMessage = "좋습니다. 이제 앉은 자세를 측정합니다. 천천히 내려가 유지해주세요.";
  } else if (step === "bottom_waiting") {
    noticeMessage = "앉은 자세를 유지해주세요. 안정되면 자동으로 2초간 측정합니다.";
  } else if (step === "bottom_counting") {
    noticeMessage = "앉은 자세 측정 중입니다. 2초만 그대로 유지해주세요.";
  } else if (step === "saving") {
    noticeMessage = "스쿼트 기준 범위를 저장하고 있습니다.";
  }

  return {
    step,
    phase,
    capturedSide,
    calibrationError,
    isSavingCalibration,
    isCalibrationComplete,
    noticeMessage,
    onPoseLandmarks,
    startCalibration,
    resetCalibration,
  };
}
