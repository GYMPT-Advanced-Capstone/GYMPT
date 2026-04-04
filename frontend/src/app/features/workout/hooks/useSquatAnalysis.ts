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
const WS_URL_FALLBACK = "ws://localhost:8000/ws/workout-feedback";
const DISCONNECTED_STATUS: SquatAnalysisStatus = "insufficient_visibility";

const STATUS_MAP: Record<SquatAnalysisStatus, true> = {
  idle: true,
  tracking: true,
  insufficient_visibility: true,
};

function createInitialAnalysis(): SquatAnalysisSnapshot {
  return {
    timestampMs: 0,
    status: "idle",
    feedbackMessage: "",
    fullRepCount: 0,
  };
}

function resolveWebSocketUrl(): string {
  const configured = (import.meta.env as Record<string, string | undefined>).VITE_WORKOUT_WS_URL;
  if (typeof configured === "string" && configured.trim().length > 0) {
    return configured.trim();
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
  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { feedbackMessage: raw };
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
      setAnalysis((prev) => {
        if (
          prev.status === "idle"
          && prev.feedbackMessage.length === 0
          && prev.fullRepCount === 0
          && prev.timestampMs === 0
        ) {
          return prev;
        }
        return createInitialAnalysis();
      });
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
      if (isDisposed) {
        return;
      }
      setAnalysis((prev) => (
        prev.status === DISCONNECTED_STATUS
          ? prev
          : { ...prev, status: DISCONNECTED_STATUS }
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
    analysis,
    onPoseLandmarks,
  };
}
