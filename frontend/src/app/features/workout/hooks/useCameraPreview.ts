import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { CameraStatus } from "../types/workoutSession";

interface CameraError {
  status: CameraStatus;
  message: string;
}

interface UseCameraPreviewResult {
  cameraStatus: CameraStatus;
  cameraErrorMessage: string | null;
  isStreaming: boolean;
  requestCamera: () => Promise<void>;
  stopCamera: () => void;
}

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: "user",
  },
  audio: false,
};

function normalizeCameraError(error: unknown): CameraError {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return {
        status: "permission_denied",
        message:
          "\uce74\uba54\ub77c \uad8c\ud55c\uc774 \ud544\uc694\ud569\ub2c8\ub2e4. \ube0c\ub77c\uc6b0\uc800 \uc124\uc815\uc5d0\uc11c \uad8c\ud55c\uc744 \ud5c8\uc6a9\ud574 \uc8fc\uc138\uc694.",
      };
    }

    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return {
        status: "no_camera_device",
        message: "\uc0ac\uc6a9 \uac00\ub2a5\ud55c \uce74\uba54\ub77c \uc7a5\uce58\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
      };
    }
  }

  return {
    status: "general_error",
    message:
      "\uce74\uba54\ub77c \uc5f0\uacb0 \uc911 \ubb38\uc81c\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
  };
}

export function useCameraPreview(
  videoRef: RefObject<HTMLVideoElement | null>,
): UseCameraPreviewResult {
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("ready");
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [videoRef]);

  const stopCamera = useCallback(() => {
    releaseStream();
    setIsStreaming(false);
    setCameraStatus("ready");
    setCameraErrorMessage(null);
  }, [releaseStream]);

  const requestCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus("general_error");
      setCameraErrorMessage(
        "\ube0c\ub77c\uc6b0\uc800\uc5d0\uc11c \uce74\uba54\ub77c API\ub97c \uc9c0\uc6d0\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
      );
      return;
    }

    setCameraStatus("loading");
    setCameraErrorMessage(null);

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some((device) => device.kind === "videoinput");

      if (!hasVideoInput) {
        setCameraStatus("no_camera_device");
        setCameraErrorMessage("\uce74\uba54\ub77c \uc7a5\uce58\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.");
        return;
      }

      releaseStream();

      const nextStream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      streamRef.current = nextStream;

      const video = videoRef.current;
      if (!video) {
        throw new Error("Camera video element is not ready.");
      }
      video.srcObject = nextStream;
      await video.play();

      setIsStreaming(true);
      setCameraStatus("ready");
    } catch (error) {
      releaseStream();
      setIsStreaming(false);
      const normalizedError = normalizeCameraError(error);
      setCameraStatus(normalizedError.status);
      setCameraErrorMessage(normalizedError.message);
    }
  }, [releaseStream, videoRef]);

  useEffect(() => {
    return () => {
      releaseStream();
    };
  }, [releaseStream]);

  return {
    cameraStatus,
    cameraErrorMessage,
    isStreaming,
    requestCamera,
    stopCamera,
  };
}
