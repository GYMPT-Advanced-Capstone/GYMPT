import { useCallback, useEffect, useRef, useState } from "react";

import type { PushupTrackedLandmarks } from "../utils/pushup";

interface UsePushupAnalysisParams {
  enabled: boolean;
  goalCount: number;
  calibrationMetrics: Record<string, unknown> | null;
}

interface PushupRepSummary {
  repIndex: number;
  metrics: Record<string, number>;
  representativeFeedbackCode?: string;
  representativeFeedbackMessage?: string;
}

interface PushupAnalysisResult {
  analysis: {
    timestampMs: number;
    status: string;
    feedbackMessage: string;
    fullRepCount: number;
    repSummaries: PushupRepSummary[];
    warningCode: string | null;
    lastRepEvent: {
      count: number;
      feedbackMessage: string;
      feedbackCode: string | null;
    } | null;
  };
  onTrackedLandmarks: (
    trackedLandmarks: PushupTrackedLandmarks | null,
    timestampMs: number,
  ) => void;
}

interface BackendPushupPayload {
  timestampMs?: number;
  status?: string;
  feedbackMessage?: string;
  fullRepCount?: number;
  repCompleted?: boolean;
  repSummary?: Record<string, number>;
  warningCode?: string;
  representativeFeedbackCode?: string;
  representativeFeedbackMessage?: string;
}

const LANDMARK_SEND_INTERVAL_MS = 100;
const WORKOUT_FEEDBACK_PATH = "/ws/workout-feedback";
const WS_URL_FALLBACK = `ws://localhost:8000${WORKOUT_FEEDBACK_PATH}`;

function toWebSocketUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const protocol = parsed.protocol === "https:" ? "wss:" : parsed.protocol === "http:" ? "ws:" : parsed.protocol;
    if (protocol !== "ws:" && protocol !== "wss:") {
      return null;
    }
    const pathname = parsed.pathname === "/" ? WORKOUT_FEEDBACK_PATH : parsed.pathname;
    const normalizedPath = pathname === WORKOUT_FEEDBACK_PATH ? pathname : WORKOUT_FEEDBACK_PATH;
    return `${protocol}//${parsed.host}${normalizedPath}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function resolveWebSocketUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const configured = env.VITE_WORKOUT_WS_URL ?? env.VITE_WS_URL ?? env.VITE_API_URL;
  if (configured) {
    const value = toWebSocketUrl(configured.trim());
    if (value) {
      return value;
    }
  }
  return WS_URL_FALLBACK;
}

function parseFeedback(raw: unknown): BackendPushupPayload | null {
  if (typeof raw !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as BackendPushupPayload;
    return parsed;
  } catch {
    return null;
  }
}

export function usePushupAnalysis({
  enabled,
  goalCount,
  calibrationMetrics,
}: UsePushupAnalysisParams): PushupAnalysisResult {
  const [analysis, setAnalysis] = useState({
    timestampMs: 0,
    status: "idle",
    feedbackMessage: "",
    fullRepCount: 0,
    repSummaries: [] as PushupRepSummary[],
    warningCode: null as string | null,
    lastRepEvent: null as {
      count: number;
      feedbackMessage: string;
      feedbackCode: string | null;
    } | null,
  });
  const socketRef = useRef<WebSocket | null>(null);
  const lastSentAtMsRef = useRef(0);

  const onTrackedLandmarks = useCallback(
    (trackedLandmarks: PushupTrackedLandmarks | null, timestampMs: number) => {
      if (!enabled || !trackedLandmarks) {
        return;
      }

      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      if (timestampMs - lastSentAtMsRef.current < LANDMARK_SEND_INTERVAL_MS) {
        return;
      }

      lastSentAtMsRef.current = timestampMs;
      socket.send(
        JSON.stringify({
          type: "pose_landmarks",
          exerciseType: "pushup",
          timestampMs,
          goalCount,
          calibrationMetrics,
          trackedLandmarks,
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

    socket.onmessage = (event) => {
      const feedback = parseFeedback(event.data);
      if (!feedback) {
        return;
      }

      setAnalysis((prev) => {
        let repSummaries = prev.repSummaries;
        let lastRepEvent = prev.lastRepEvent;
        if (feedback.repCompleted && feedback.repSummary) {
          repSummaries = [
            ...prev.repSummaries,
            {
              repIndex: prev.repSummaries.length + 1,
              metrics: feedback.repSummary,
              representativeFeedbackCode:
                typeof feedback.representativeFeedbackCode === "string"
                  ? feedback.representativeFeedbackCode
                  : undefined,
              representativeFeedbackMessage:
                typeof feedback.representativeFeedbackMessage === "string"
                  ? feedback.representativeFeedbackMessage
                  : undefined,
            },
          ];
          lastRepEvent = {
            count: feedback.fullRepCount ?? prev.fullRepCount,
            feedbackMessage:
              typeof feedback.representativeFeedbackMessage === "string"
                ? feedback.representativeFeedbackMessage
                : feedback.feedbackMessage ?? "",
            feedbackCode:
              typeof feedback.representativeFeedbackCode === "string"
                ? feedback.representativeFeedbackCode
                : null,
          };
        }

        return {
          timestampMs: feedback.timestampMs ?? prev.timestampMs,
          status: feedback.status ?? prev.status,
          feedbackMessage: feedback.feedbackMessage ?? prev.feedbackMessage,
          fullRepCount: feedback.fullRepCount ?? prev.fullRepCount,
          repSummaries,
          warningCode: typeof feedback.warningCode === "string" ? feedback.warningCode : null,
          lastRepEvent,
        };
      });
    };

    socket.onopen = () => {
      setAnalysis((prev) => ({ ...prev, status: "tracking" }));
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
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [calibrationMetrics, enabled]);

  return {
    analysis,
    onTrackedLandmarks,
  };
}
