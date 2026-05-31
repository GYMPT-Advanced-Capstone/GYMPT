import { useCallback, useEffect, useRef, useState } from "react";

import { workoutApi, type ExerciseCalibrationSampleRequest } from "../../../api/workoutApi";
import type { NormalizedLandmark } from "../types/pose";
import { buildPlankObservation } from "../utils/plank";
import { cancelSpeech, speakKorean } from "../utils/speech";

const HOLD_DURATION_MS = 3000;
const COMPLETE_REDIRECT_DELAY_MS = 1200;
const UNSTABLE_FRAME_TOLERANCE = 8;

export type PlankCalibrationStep =
  | "idle"
  | "waiting"
  | "counting"
  | "saving"
  | "complete";

interface UsePlankCalibrationParams {
  enabled: boolean;
  exerciseId: number;
  onSuccess: () => void;
}

export interface UsePlankCalibrationResult {
  step: PlankCalibrationStep;
  capturedSide: "left" | "right" | null;
  calibrationError: string | null;
  isSavingCalibration: boolean;
  isCalibrationComplete: boolean;
  noticeMessage: string | null;
  onPoseLandmarks: (landmarks: NormalizedLandmark[] | null, timestampMs: number) => void;
  startCalibration: () => void;
  resetCalibration: () => void;
}

function isStablePlankPose(metrics: { elbowAngle: number; bodyLineAngle: number }): boolean {
  // 수평 자세 + 팔꿈치 60~120° + 몸통 각도 140° 이상
  return (
    metrics.bodyLineAngle >= 140 &&
    metrics.elbowAngle >= 60 &&
    metrics.elbowAngle <= 120
  );
}

export function usePlankCalibration({
  enabled,
  exerciseId,
  onSuccess,
}: UsePlankCalibrationParams): UsePlankCalibrationResult {
  const [step, setStep] = useState<PlankCalibrationStep>("idle");
  const [capturedSide, setCapturedSide] = useState<"left" | "right" | null>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [isSavingCalibration, setIsSavingCalibration] = useState(false);
  const [isCalibrationComplete, setIsCalibrationComplete] = useState(false);

  const captureStartedAtRef = useRef<number | null>(null);
  const unstableFrameCountRef = useRef(0);
  const completeTimeoutRef = useRef<number | null>(null);
  const lastSpokenStepRef = useRef<PlankCalibrationStep | null>(null);
  const samplesRef = useRef<ExerciseCalibrationSampleRequest[]>([]);

  const speak = useCallback((message: string) => {
    speakKorean(message, { cancel: true });
  }, []);

  const resetCalibration = useCallback(() => {
    samplesRef.current = [];
    captureStartedAtRef.current = null;
    unstableFrameCountRef.current = 0;
    setStep("idle");
    setCapturedSide(null);
    setCalibrationError(null);
    setIsSavingCalibration(false);
    setIsCalibrationComplete(false);
    lastSpokenStepRef.current = null;
    if (completeTimeoutRef.current !== null) {
      window.clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }
  }, []);

  const startCalibration = useCallback(() => {
    samplesRef.current = [];
    captureStartedAtRef.current = null;
    unstableFrameCountRef.current = 0;
    setStep("waiting");
    setCapturedSide(null);
    setCalibrationError(null);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => resetCalibration(), 0);
    return () => window.clearTimeout(t);
  }, [exerciseId, resetCalibration]);

  useEffect(() => {
    return () => {
      if (completeTimeoutRef.current !== null) window.clearTimeout(completeTimeoutRef.current);
      cancelSpeech();
    };
  }, []);

  useEffect(() => {
    if (!enabled || lastSpokenStepRef.current === step) return;
    const messages: Partial<Record<PlankCalibrationStep, string>> = {
      waiting: "측면으로 플랭크 자세를 취해주세요. 자세가 안정되면 자동으로 3초간 측정합니다.",
      counting: "플랭크 자세 측정 중입니다. 3초만 그대로 유지해주세요.",
      saving: "플랭크 기준 자세를 저장하고 있습니다.",
      complete: "기준 자세 설정이 완료되었습니다. 운동을 시작합니다.",
    };
    lastSpokenStepRef.current = step;
    const msg = messages[step];
    if (msg) speak(msg);
  }, [enabled, speak, step]);

  const onPoseLandmarks = useCallback(
    (landmarks: NormalizedLandmark[] | null, timestampMs: number) => {
      if (!enabled || (step !== "waiting" && step !== "counting") || !landmarks) return;

      const observation = buildPlankObservation(landmarks);
      if (!observation) {
        unstableFrameCountRef.current += 1;
        if (unstableFrameCountRef.current > UNSTABLE_FRAME_TOLERANCE) {
          unstableFrameCountRef.current = 0;
          captureStartedAtRef.current = null;
          samplesRef.current = [];
          if (step === "counting") setStep("waiting");
        }
        return;
      }

      const stable = isStablePlankPose(observation.metrics);
      setCapturedSide(observation.trackedLandmarks.side);

      if (!stable) {
        unstableFrameCountRef.current += 1;
        if (unstableFrameCountRef.current > UNSTABLE_FRAME_TOLERANCE) {
          unstableFrameCountRef.current = 0;
          captureStartedAtRef.current = null;
          samplesRef.current = [];
          if (step === "counting") {
            lastSpokenStepRef.current = null;
            setStep("waiting");
          }
        }
        return;
      }

      unstableFrameCountRef.current = 0;
      samplesRef.current.push({ phase: "plank", metrics: observation.metrics });

      if (captureStartedAtRef.current === null) {
        captureStartedAtRef.current = timestampMs;
        setStep("counting");
        return;
      }

      if (timestampMs - captureStartedAtRef.current < HOLD_DURATION_MS) return;

      // 3초 측정 완료 → 저장
      captureStartedAtRef.current = null;
      if (samplesRef.current.length === 0) {
        setCalibrationError("플랭크 자세 측정에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      setIsSavingCalibration(true);
      setStep("saving");

      void workoutApi
        .createCalibration({
          exercise_id: exerciseId,
          version: 1,
          exercise_type: "plank",
          side: observation.trackedLandmarks.side,
          hold_duration_ms: HOLD_DURATION_MS,
          samples: samplesRef.current,
        })
        .then(() => {
          setIsCalibrationComplete(true);
          setStep("complete");
          completeTimeoutRef.current = window.setTimeout(() => {
            onSuccess();
          }, COMPLETE_REDIRECT_DELAY_MS);
        })
        .catch((error) => {
          captureStartedAtRef.current = null;
          samplesRef.current = [];
          lastSpokenStepRef.current = null;
          setStep("waiting");
          setCalibrationError(
            error instanceof Error ? error.message : "기준 자세 저장에 실패했습니다.",
          );
        })
        .finally(() => setIsSavingCalibration(false));
    },
    [enabled, exerciseId, onSuccess, step],
  );

  let noticeMessage: string | null = null;
  if (step === "waiting") noticeMessage = "측면으로 플랭크 자세를 취해주세요. 자세가 안정되면 자동으로 3초간 측정합니다.";
  else if (step === "counting") noticeMessage = "플랭크 자세 측정 중입니다. 3초만 그대로 유지해주세요.";
  else if (step === "saving") noticeMessage = "플랭크 기준 자세를 저장하고 있습니다.";

  return {
    step,
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
