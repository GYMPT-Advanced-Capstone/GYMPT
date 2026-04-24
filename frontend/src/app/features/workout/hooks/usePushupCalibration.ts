import { useCallback, useEffect, useRef, useState } from "react";

import { workoutApi, type ExerciseCalibrationSampleRequest } from "../../../api/workoutApi";
import type { NormalizedLandmark } from "../types/pose";
import { buildPushupObservation } from "../utils/pushup";

const HOLD_DURATION_MS = 2000;
const TRANSITION_DELAY_MS = 1000;
const COMPLETE_REDIRECT_DELAY_MS = 1200;

export type PushupCalibrationStep =
  | "idle"
  | "top_waiting"
  | "top_counting"
  | "transition_to_bottom"
  | "bottom_waiting"
  | "bottom_counting"
  | "saving"
  | "complete";

function isStablePose(
  phase: "top" | "bottom",
  metrics: { elbowAngle: number; bodyLineAngle: number },
) {
  const bodyLineStable = metrics.bodyLineAngle >= 145;
  if (!bodyLineStable) {
    return false;
  }
  if (phase === "top") {
    return metrics.elbowAngle >= 145;
  }
  return metrics.elbowAngle >= 60 && metrics.elbowAngle <= 115;
}

interface UsePushupCalibrationParams {
  enabled: boolean;
  exerciseId: number;
  onSuccess: () => void;
}

interface UsePushupCalibrationResult {
  step: PushupCalibrationStep;
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

export function usePushupCalibration({
  enabled,
  exerciseId,
  onSuccess,
}: UsePushupCalibrationParams): UsePushupCalibrationResult {
  const [step, setStep] = useState<PushupCalibrationStep>("idle");
  const [phase, setPhase] = useState<"top" | "bottom">("top");
  const [capturedSide, setCapturedSide] = useState<"left" | "right" | null>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [isSavingCalibration, setIsSavingCalibration] = useState(false);
  const [isCalibrationComplete, setIsCalibrationComplete] = useState(false);
  const captureStartedAtRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const completeTimeoutRef = useRef<number | null>(null);
  const lastSpokenStepRef = useRef<PushupCalibrationStep | null>(null);
  const pushupSamplesRef = useRef<Record<"top" | "bottom", ExerciseCalibrationSampleRequest[]>>({
    top: [],
    bottom: [],
  });

  const speak = useCallback((message: string) => {
    if (
      typeof window === "undefined"
      || !("speechSynthesis" in window)
      || !("SpeechSynthesisUtterance" in window)
    ) {
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    const voices = synth.getVoices();
    const voice =
      voices.find((item) => item.lang.toLowerCase().startsWith("ko")) ?? null;

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "ko-KR";
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    synth.speak(utterance);
  }, []);

  const resetCalibration = useCallback(() => {
    pushupSamplesRef.current = { top: [], bottom: [] };
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
    pushupSamplesRef.current = { top: [], bottom: [] };
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
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled || lastSpokenStepRef.current === step) {
      return;
    }

    let message: string | null = null;
    if (step === "top_waiting") {
      message = "탑 자세를 유지해주세요.";
    } else if (step === "transition_to_bottom") {
      message = "이제 바텀 자세를 측정합니다. 바텀 자세를 유지해주세요.";
    } else if (step === "complete") {
      message = "초기 자세 설정이 완료되었습니다. 운동을 시작합니다.";
    }

    lastSpokenStepRef.current = step;
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

    const observation = buildPushupObservation(landmarks);
    if (!observation) {
      captureStartedAtRef.current = null;
      if (step === "top_counting") {
        pushupSamplesRef.current.top = [];
        setStep("top_waiting");
      } else if (step === "bottom_counting") {
        pushupSamplesRef.current.bottom = [];
        setStep("bottom_waiting");
      }
      return;
    }

    const activePhase = step === "top_waiting" || step === "top_counting" ? "top" : "bottom";
    const stable = isStablePose(activePhase, observation.metrics);
    setCapturedSide(observation.trackedLandmarks.side);

    if (!stable) {
      captureStartedAtRef.current = null;
      pushupSamplesRef.current[activePhase] = [];
      if (activePhase === "top" && step === "top_counting") {
        setStep("top_waiting");
      }
      if (activePhase === "bottom" && step === "bottom_counting") {
        setStep("bottom_waiting");
      }
      return;
    }

    pushupSamplesRef.current[activePhase].push({
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
        pushupSamplesRef.current.bottom = [];
        setStep("bottom_waiting");
      }, TRANSITION_DELAY_MS);
      return;
    }

    const topSamples = pushupSamplesRef.current.top;
    const bottomSamples = pushupSamplesRef.current.bottom;
    if (topSamples.length === 0 || bottomSamples.length === 0) {
      setCalibrationError("탑과 바텀 자세를 모두 측정해주세요.");
      return;
    }

    setIsSavingCalibration(true);
    setStep("saving");
    void workoutApi.createCalibration({
      exercise_id: exerciseId,
      version: 1,
      exercise_type: "pushup",
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
      setCalibrationError(error instanceof Error ? error.message : "초기 범위 저장에 실패했습니다.");
    }).finally(() => {
      setIsSavingCalibration(false);
    });
  }, [enabled, exerciseId, onSuccess, step]);

  let noticeMessage: string | null = null;
  if (step === "top_waiting") {
    noticeMessage = "탑 자세를 유지해주세요. 자세가 안정되면 자동으로 2초 측정을 시작합니다.";
  } else if (step === "top_counting") {
    noticeMessage = "탑 자세를 2초간 유지해주세요. 자세가 무너지면 다시 측정합니다.";
  } else if (step === "transition_to_bottom") {
    noticeMessage = "좋습니다. 이제 바텀 자세를 측정합니다. 바텀 자세를 유지해주세요.";
  } else if (step === "bottom_waiting") {
    noticeMessage = "이제 바텀 자세를 유지해주세요. 자세가 안정되면 자동으로 2초 측정을 시작합니다.";
  } else if (step === "bottom_counting") {
    noticeMessage = "바텀 자세를 2초간 유지해주세요. 자세가 무너지면 다시 측정합니다.";
  } else if (step === "saving") {
    noticeMessage = "초기 범위를 저장하고 있습니다.";
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
