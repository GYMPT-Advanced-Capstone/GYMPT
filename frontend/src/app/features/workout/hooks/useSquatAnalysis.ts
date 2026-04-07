import { useCallback, useEffect, useRef, useState } from "react";

import type { NormalizedLandmark } from "../types/pose";
import type { SquatAnalysisSnapshot, SquatAnalysisStatus } from "../types/squat";

interface UseSquatAnalysisParams {
  enabled: boolean;
}

interface UseSquatAnalysisResult {
  analysis: SquatAnalysisSnapshot;
  onPoseLandmarks: (landmarks: NormalizedLandmark[] | null, timestampMs: number) => void;
}

interface BackendFeedbackPayload {
  timestampMs?: number;
  status?: string;
  feedbackMessage?: string;
  feedback?: string;
  message?: string;
  fullRepCount?: number;
  count?: number;
}

const LANDMARK_SEND_INTERVAL_MS = 100;
const WORKOUT_FEEDBACK_PATH = "/ws/workout-feedback";
const LEGACY_POSE_PATH = "/ws/pose";
const WS_URL_FALLBACK = `ws://localhost:8000${WORKOUT_FEEDBACK_PATH}`;
const DISCONNECTED_STATUS: SquatAnalysisStatus = "insufficient_visibility";
const DISCONNECTED_MESSAGE = "백엔드 연결이 끊겼습니다. 다시 연결을 시도해주세요.";

const STATUS_MAP: Record<SquatAnalysisStatus, true> = {
  idle: true,
  tracking: true,
  insufficient_visibility: true,
};

const INITIAL_ANALYSIS: SquatAnalysisSnapshot = {
  timestampMs: 0,
  status: "idle",
  feedbackMessage: "",
  fullRepCount: 0,
};

function createInitialAnalysis(): SquatAnalysisSnapshot {
  return { ...INITIAL_ANALYSIS };
}

function toWebSocketUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const protocol =
      parsed.protocol === "https:"
        ? "wss:"
        : parsed.protocol === "http:"
          ? "ws:"
          : parsed.protocol;

    if (protocol !== "ws:" && protocol !== "wss:") {
      return null;
    }

    const pathname = parsed.pathname === "/" ? WORKOUT_FEEDBACK_PATH : parsed.pathname;
    const normalizedPath = pathname.endsWith(LEGACY_POSE_PATH)
      ? `${pathname.slice(0, -LEGACY_POSE_PATH.length)}${WORKOUT_FEEDBACK_PATH}`
      : pathname;

    return `${protocol}//${parsed.host}${normalizedPath}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function resolveWebSocketUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const configured = env.VITE_WORKOUT_WS_URL ?? env.VITE_WS_URL;

  if (typeof configured === "string" && configured.trim().length > 0) {
    const wsUrl = toWebSocketUrl(configured.trim());
    if (wsUrl) {
      return wsUrl;
    }
  }

  const apiUrl = env.VITE_API_URL;
  if (typeof apiUrl === "string" && apiUrl.trim().length > 0) {
    const wsUrl = toWebSocketUrl(apiUrl.trim());
    if (wsUrl) {
      return wsUrl;
    }
  }

  return WS_URL_FALLBACK;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function isSquatAnalysisStatus(value: unknown): value is SquatAnalysisStatus {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(STATUS_MAP, value);
}

function toMessageFromPayload(payload: BackendFeedbackPayload): string | null {
  const candidates = [payload.feedbackMessage, payload.feedback, payload.message];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      return candidate;
    }
  }
  return null;
}

function parseBackendFeedback(raw: unknown): BackendFeedbackPayload | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    if (raw.length === 0) {
      return null;
    }
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { feedbackMessage: raw };
    }
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const payload = isRecord(parsed.data) ? parsed.data : parsed;

  return {
    timestampMs: toNumber(payload.timestampMs) ?? undefined,
    status: typeof payload.status === "string" ? payload.status : undefined,
    feedbackMessage:
      typeof payload.feedbackMessage === "string" ? payload.feedbackMessage : undefined,
    feedback: typeof payload.feedback === "string" ? payload.feedback : undefined,
    message: typeof payload.message === "string" ? payload.message : undefined,
    fullRepCount: toNumber(payload.fullRepCount) ?? toNumber(payload.count) ?? undefined,
  };
}

function buildPosePayload(
  landmarks: NormalizedLandmark[] | null,
  timestampMs: number,
): string {
  return JSON.stringify({
    type: "pose_landmarks",
    timestampMs,
    landmarks: landmarks ?? [],
  });
}

export function useSquatAnalysis({
  enabled,
}: UseSquatAnalysisParams): UseSquatAnalysisResult {
  const [analysis, setAnalysis] = useState<SquatAnalysisSnapshot>(createInitialAnalysis);
  const socketRef = useRef<WebSocket | null>(null);
  const lastSentAtMsRef = useRef(0);
  const disconnectNotifiedRef = useRef(false);

  const onPoseLandmarks = useCallback(
    (landmarks: NormalizedLandmark[] | null, timestampMs: number) => {
      if (!enabled) {
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
      try {
        socket.send(buildPosePayload(landmarks, timestampMs));
      } catch {
        // Ignore send errors; connection state is handled by onclose/onerror.
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      lastSentAtMsRef.current = 0;
      disconnectNotifiedRef.current = false;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    let isDisposed = false;
    const socket = new WebSocket(resolveWebSocketUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      if (isDisposed) {
        return;
      }
      disconnectNotifiedRef.current = false;
      setAnalysis((prev) => (
        prev.status === "tracking"
          ? prev
          : { ...prev, status: "tracking" }
      ));
    };

    socket.onmessage = (event) => {
      if (isDisposed) {
        return;
      }
      const feedback = parseBackendFeedback(event.data);
      if (!feedback) {
        return;
      }

      setAnalysis((prev) => {
        const nextMessage = toMessageFromPayload(feedback) ?? prev.feedbackMessage;
        const nextCount = feedback.fullRepCount ?? prev.fullRepCount;
        const nextStatus = isSquatAnalysisStatus(feedback.status) ? feedback.status : prev.status;
        const nextTimestamp = feedback.timestampMs ?? performance.now();

        if (
          nextMessage === prev.feedbackMessage
          && nextCount === prev.fullRepCount
          && nextStatus === prev.status
        ) {
          return prev;
        }

        return {
          timestampMs: nextTimestamp,
          status: nextStatus,
          feedbackMessage: nextMessage,
          fullRepCount: nextCount,
        };
      });
    };

    const handleDisconnected = () => {
      if (isDisposed || disconnectNotifiedRef.current) {
        return;
      }
      disconnectNotifiedRef.current = true;
      setAnalysis((prev) => (
        prev.status === DISCONNECTED_STATUS
          && prev.feedbackMessage === DISCONNECTED_MESSAGE
          ? prev
          : {
            ...prev,
            status: DISCONNECTED_STATUS,
            feedbackMessage: DISCONNECTED_MESSAGE,
          }
      ));
    };

    socket.onerror = handleDisconnected;

    socket.onclose = () => {
      handleDisconnected();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };

    return () => {
      isDisposed = true;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      socket.close();
    };
  }, [enabled]);

  return {
    analysis: enabled ? analysis : INITIAL_ANALYSIS,
    onPoseLandmarks,
  };
}
