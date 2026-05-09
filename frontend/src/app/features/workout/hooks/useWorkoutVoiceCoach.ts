import { useCallback, useEffect, useRef, useState } from "react";

import { cancelSpeech, canUseSpeechSynthesis, speakKorean } from "../utils/speech";

interface UseWorkoutVoiceCoachParams {
  enabled: boolean;
  hasPoseLandmarks: boolean;
  poseStatus: string;
  goalCount: number;
  visibilityPrompt: string | null;
  posturePrompt: string | null;
  repEvent: {
    count: number;
    feedbackMessage: string;
    feedbackCode: string | null;
  } | null;
}

interface UseWorkoutVoiceCoachResult {
  noticeMessageOverride: string | null;
}

const MESSAGE_DISPLAY_MS = 1000;
const LANDMARK_LOST_MESSAGE = "화면 안으로 돌아와 주세요.";
const SLOW_DOWN_MESSAGE = "속도를 늦춰주세요.";

export function useWorkoutVoiceCoach({
  enabled,
  hasPoseLandmarks,
  poseStatus,
  goalCount,
  visibilityPrompt,
  posturePrompt,
  repEvent,
}: UseWorkoutVoiceCoachParams): UseWorkoutVoiceCoachResult {
  const [noticeMessageOverride, setNoticeMessageOverride] = useState<string | null>(null);
  const queueBusyUntilRef = useRef(0);
  const pendingCueRef = useRef<{ count: number; nextCue: string } | null>(null);
  const lastHandledRepCountRef = useRef(0);
  const lastSpokenPosturePromptRef = useRef<string | null>(null);
  const lostStateRef = useRef(false);
  const clearTimeoutRef = useRef<number | null>(null);
  const deferredNoticeTimeoutRef = useRef<number | null>(null);

  const clearNotice = useCallback(() => {
    if (clearTimeoutRef.current !== null) {
      window.clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }
    if (deferredNoticeTimeoutRef.current !== null) {
      window.clearTimeout(deferredNoticeTimeoutRef.current);
      deferredNoticeTimeoutRef.current = null;
    }
  }, []);

  const showMessage = useCallback((message: string, duration = MESSAGE_DISPLAY_MS) => {
    clearNotice();
    setNoticeMessageOverride(message);
    clearTimeoutRef.current = window.setTimeout(() => {
      setNoticeMessageOverride(null);
      clearTimeoutRef.current = null;
    }, duration);
  }, [clearNotice]);

  const scheduleNoticeUpdate = useCallback((message: string | null, duration = MESSAGE_DISPLAY_MS) => {
    clearNotice();
    deferredNoticeTimeoutRef.current = window.setTimeout(() => {
      deferredNoticeTimeoutRef.current = null;
      if (message === null) {
        setNoticeMessageOverride(null);
        return;
      }
      showMessage(message, duration);
    }, 0);
  }, [clearNotice, showMessage]);

  const speak = useCallback((message: string, onEnd?: () => void) => {
    speakKorean(message, { onEnd });
  }, []);

  const playRepSequence = useCallback((feedbackMessage: string, nextCue: string) => {
    const now = Date.now();
    queueBusyUntilRef.current = now + 1400;
    showMessage(feedbackMessage);
    if (!canUseSpeechSynthesis()) {
      return;
    }
    cancelSpeech();
    speak(feedbackMessage, () => {
      showMessage(nextCue);
      speak(nextCue);
    });
  }, [showMessage, speak]);

  useEffect(() => {
    if (!enabled) {
      clearNotice();
      scheduleNoticeUpdate(null);
      pendingCueRef.current = null;
      lastHandledRepCountRef.current = 0;
      lastSpokenPosturePromptRef.current = null;
      lostStateRef.current = false;
      queueBusyUntilRef.current = 0;
      cancelSpeech();
      return;
    }
  }, [clearNotice, enabled, scheduleNoticeUpdate]);

  useEffect(() => {
    return () => {
      clearNotice();
      cancelSpeech();
    };
  }, [clearNotice]);

  const isLandmarkLost = enabled && poseStatus === "ready" && !hasPoseLandmarks;
  const shouldSpeakVisibilityPrompt = enabled && visibilityPrompt !== null;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (isLandmarkLost || shouldSpeakVisibilityPrompt) {
      if (!lostStateRef.current) {
        lostStateRef.current = true;
        cancelSpeech();
        speak(visibilityPrompt ?? LANDMARK_LOST_MESSAGE);
      }
      return;
    }

    if (lostStateRef.current) {
      lostStateRef.current = false;
      if (pendingCueRef.current) {
        const pending = pendingCueRef.current;
        pendingCueRef.current = null;
        showMessage(pending.nextCue);
        speak(pending.nextCue);
      } else {
        scheduleNoticeUpdate(null);
      }
    }
  }, [
    enabled,
    hasPoseLandmarks,
    isLandmarkLost,
    scheduleNoticeUpdate,
    showMessage,
    speak,
    poseStatus,
    shouldSpeakVisibilityPrompt,
    visibilityPrompt,
  ]);

  useEffect(() => {
    if (!enabled || isLandmarkLost || visibilityPrompt || !posturePrompt) {
      return;
    }

    if (lastSpokenPosturePromptRef.current === posturePrompt) {
      return;
    }

    lastSpokenPosturePromptRef.current = posturePrompt;
    speak(posturePrompt);
  }, [enabled, isLandmarkLost, posturePrompt, speak, visibilityPrompt]);

  useEffect(() => {
    if (!enabled || !repEvent || repEvent.count <= lastHandledRepCountRef.current) {
      return;
    }
    lastHandledRepCountRef.current = repEvent.count;

    const nextCue = repEvent.count >= goalCount ? "운동 완료" : `${repEvent.count + 1}회`;

    if (isLandmarkLost) {
      pendingCueRef.current = { count: repEvent.count, nextCue };
      return;
    }

    if (Date.now() < queueBusyUntilRef.current) {
      pendingCueRef.current = null;
      scheduleNoticeUpdate(SLOW_DOWN_MESSAGE);
      cancelSpeech();
      speak(SLOW_DOWN_MESSAGE);
      queueBusyUntilRef.current = Date.now() + 1000;
      return;
    }

    const repSequenceTimeout = window.setTimeout(() => {
      playRepSequence(repEvent.feedbackMessage, nextCue);
    }, 0);
    return () => {
      window.clearTimeout(repSequenceTimeout);
    };
  }, [
    enabled,
    goalCount,
    isLandmarkLost,
    playRepSequence,
    repEvent,
    scheduleNoticeUpdate,
    speak,
  ]);

  return {
    noticeMessageOverride: isLandmarkLost ? LANDMARK_LOST_MESSAGE : noticeMessageOverride,
  };
}
