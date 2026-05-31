import { useCallback, useEffect, useRef, useState } from "react";

import type { NormalizedLandmark } from "../types/pose";
import type { PlankAnalysisSnapshot, PlankSessionMetrics } from "../types/plank";
import { buildPlankObservation } from "../utils/plank";

interface UsePlankAnalysisParams {
  enabled: boolean;
  goalCount: number;
  calibrationMetrics: Record<string, unknown> | null;
}

interface UsePlankAnalysisResult {
  analysis: PlankAnalysisSnapshot;
  onPoseLandmarks: (landmarks: NormalizedLandmark[] | null, timestampMs: number) => void;
}

interface BackendPlankPayload {
  timestampMs?: number;
  status?: string;
  feedbackMessage?: string;
  fullRepCount?: number;
  warningCode?: string;
  isComplete?: boolean;
  sessionMetrics?: PlankSessionMetrics;
}

const LANDMARK_SEND_INTERVAL_MS = 100;
const WORKOUT_FEEDBACK_PATH = "/ws/workout-feedback";
const WS_URL_FALLBACK = `ws://localhost:8000${WORKOUT_FEEDBACK_PATH}`;

const INITIAL_ANALYSIS: PlankAnalysisSnapshot = {
  timestampMs: 0,
  status: "idle",
  feedbackMessage: "",
  elapsedSeconds: 0,
  warningCode: null,
  isComplete: false,
  sessionMetrics: null,
};

function resolveWebSocketUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const configured = env.VITE_WORKOUT_WS_URL ?? env.VITE_WS_URL ?? env.VITE_API_URL;
  if (configured) {
    try {
      const parsed = new URL(configured.trim());
      const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
      const pathname = parsed.pathname === "/" ? WORKOUT_FEEDBACK_PATH : parsed.pathname;
      return `${protocol}//${parsed.host}${pathname}`;
    } catch {
      // fall through
    }
  }
  return WS_URL_FALLBACK;
}

function parseFeedback(raw: unknown): BackendPlankPayload | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as BackendPlankPayload;
  } catch {
    return null;
  }
}

export function usePlankAnalysis({
  enabled,
  goalCount,
  calibrationMetrics,
}: UsePlankAnalysisParams): UsePlankAnalysisResult {
  const [analysis, setAnalysis] = useState<PlankAnalysisSnapshot>({ ...INITIAL_ANALYSIS });
  const socketRef = useRef<WebSocket | null>(null);
  const lastSentAtMsRef = useRef(0);

  const onPoseLandmarks = useCallback(
    (landmarks: NormalizedLandmark[] | null, timestampMs: number) => {
      if (!enabled) return;
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      if (timestampMs - lastSentAtMsRef.current < LANDMARK_SEND_INTERVAL_MS) return;

      lastSentAtMsRef.current = timestampMs;

      const observation = buildPlankObservation(landmarks);
      socket.send(
        JSON.stringify({
          type: "pose_landmarks",
          exerciseType: "plank",
          timestampMs,
          goalCount,
          calibrationMetrics,
          trackedLandmarks: observation?.trackedLandmarks ?? null,
        }),
      );
    },
    [calibrationMetrics, enabled, goalCount],
  );

  useEffect(() => {
    if (!enabled || !calibrationMetrics) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    const socket = new WebSocket(resolveWebSocketUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      setAnalysis((prev) => ({ ...prev, status: "tracking" }));
    };

    socket.onmessage = (event) => {
      const feedback = parseFeedback(event.data);
      if (!feedback) return;

      setAnalysis((prev) => ({
        ...prev,
        timestampMs: feedback.timestampMs ?? prev.timestampMs,
        status: (feedback.status as PlankAnalysisSnapshot["status"]) ?? prev.status,
        feedbackMessage: feedback.feedbackMessage ?? prev.feedbackMessage,
        elapsedSeconds: feedback.fullRepCount ?? prev.elapsedSeconds,
        warningCode: feedback.warningCode !== undefined ? (feedback.warningCode ?? null) : prev.warningCode,
        isComplete: feedback.isComplete ?? prev.isComplete,
        sessionMetrics: feedback.sessionMetrics ?? prev.sessionMetrics,
      }));
    };

    socket.onerror = () => {
      setAnalysis((prev) => ({
        ...prev,
        status: "insufficient_visibility",
        feedbackMessage: "백엔드 연결이 불안정합니다. 다시 시도해주세요.",
      }));
    };

    return () => {
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [calibrationMetrics, enabled]);

  return {
    analysis: enabled ? analysis : { ...INITIAL_ANALYSIS },
    onPoseLandmarks,
  };
}
