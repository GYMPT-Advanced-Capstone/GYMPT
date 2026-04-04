import { useEffect, useRef, useState, type RefObject } from "react";

import type { NormalizedLandmark, PoseOverlayStatus } from "../types/pose";

interface MediapipePoseResult {
  landmarks?: NormalizedLandmark[][];
}

interface MediapipePoseLandmarker {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => MediapipePoseResult;
  close?: () => void;
}

interface FilesetResolverLike {
  forVisionTasks: (wasmPath: string) => Promise<unknown>;
}

interface PoseLandmarkerFactoryLike {
  createFromOptions: (
    vision: unknown,
    options: Record<string, unknown>,
  ) => Promise<MediapipePoseLandmarker>;
}

interface VisionRuntime {
  FilesetResolver: FilesetResolverLike;
  PoseLandmarker: PoseLandmarkerFactoryLike;
}

interface VisionModuleLike {
  FilesetResolver?: FilesetResolverLike;
  PoseLandmarker?: PoseLandmarkerFactoryLike;
}

declare global {
  interface Window {
    vision?: VisionModuleLike;
    FilesetResolver?: FilesetResolverLike;
    PoseLandmarker?: PoseLandmarkerFactoryLike;
  }
}

interface UsePoseLandmarkerParams {
  enabled: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onPoseLandmarks?: (landmarks: NormalizedLandmark[] | null, timestampMs: number) => void;
}

interface UsePoseLandmarkerResult {
  poseStatus: PoseOverlayStatus;
  poseErrorMessage: string | null;
  hasPoseLandmarks: boolean;
}

const MP_ESM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";
const MP_SCRIPT_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js";
const MP_WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
const MP_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12],
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [24, 26],
  [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32],
  [27, 31], [28, 32],
];

let runtimePromise: Promise<VisionRuntime> | null = null;
let scriptPromise: Promise<void> | null = null;

function resolveGlobalRuntime(): VisionRuntime | null {
  if (window.vision?.FilesetResolver && window.vision.PoseLandmarker) {
    return {
      FilesetResolver: window.vision.FilesetResolver,
      PoseLandmarker: window.vision.PoseLandmarker,
    };
  }

  if (window.FilesetResolver && window.PoseLandmarker) {
    return {
      FilesetResolver: window.FilesetResolver,
      PoseLandmarker: window.PoseLandmarker,
    };
  }

  return null;
}

async function ensureScriptLoaded(): Promise<void> {
  if (resolveGlobalRuntime()) {
    return;
  }

  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(
        `script[data-mediapipe-vision="true"]`,
      ) as HTMLScriptElement | null;

      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Failed to load MediaPipe script.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = MP_SCRIPT_URL;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.mediapipeVision = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load MediaPipe script."));
      document.head.appendChild(script);
    });
  }

  await scriptPromise;
}

async function loadRuntime(): Promise<VisionRuntime> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      try {
        const module = (await import(
          /* @vite-ignore */ MP_ESM_URL
        )) as VisionModuleLike;

        if (module.FilesetResolver && module.PoseLandmarker) {
          return {
            FilesetResolver: module.FilesetResolver,
            PoseLandmarker: module.PoseLandmarker,
          };
        }
      } catch {
        // fallback to global script
      }

      await ensureScriptLoaded();
      const globalRuntime = resolveGlobalRuntime();
      if (globalRuntime) {
        return globalRuntime;
      }

      throw new Error("MediaPipe runtime is not available.");
    })();
  }

  try {
    return await runtimePromise;
  } catch (error) {
    runtimePromise = null;
    throw error;
  }
}

function mapCoverPoint(
  landmark: NormalizedLandmark,
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number } {
  const scale = Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;
  const offsetX = (canvasWidth - drawWidth) / 2;
  const offsetY = (canvasHeight - drawHeight) / 2;

  return {
    x: offsetX + landmark.x * drawWidth,
    y: offsetY + landmark.y * drawHeight,
  };
}

function drawLandmarks(
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[] | undefined,
  videoWidth: number,
  videoHeight: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const viewWidth = canvas.clientWidth;
  const viewHeight = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;

  const targetWidth = Math.max(1, Math.round(viewWidth * dpr));
  const targetHeight = Math.max(1, Math.round(viewHeight * dpr));
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewWidth, viewHeight);

  if (!landmarks || landmarks.length === 0 || videoWidth <= 0 || videoHeight <= 0) {
    return;
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(63, 238, 208, 0.9)";
  ctx.fillStyle = "#B7FFF2";

  for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];
    if (!start || !end) {
      continue;
    }

    if ((start.visibility ?? 1) < 0.3 || (end.visibility ?? 1) < 0.3) {
      continue;
    }

    const startPoint = mapCoverPoint(
      start,
      videoWidth,
      videoHeight,
      viewWidth,
      viewHeight,
    );
    const endPoint = mapCoverPoint(end, videoWidth, videoHeight, viewWidth, viewHeight);

    ctx.beginPath();
    ctx.lineWidth = 2.4;
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();
  }

  for (const landmark of landmarks) {
    if ((landmark.visibility ?? 1) < 0.35) {
      continue;
    }

    const point = mapCoverPoint(landmark, videoWidth, videoHeight, viewWidth, viewHeight);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function usePoseLandmarker({
  enabled,
  videoRef,
  canvasRef,
  onPoseLandmarks,
}: UsePoseLandmarkerParams): UsePoseLandmarkerResult {
  const [poseStatus, setPoseStatus] = useState<PoseOverlayStatus>("idle");
  const [poseErrorMessage, setPoseErrorMessage] = useState<string | null>(null);
  const [hasPoseLandmarks, setHasPoseLandmarks] = useState(false);
  const hasPoseLandmarksRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const onPoseLandmarksRef = useRef(onPoseLandmarks);

  useEffect(() => {
    onPoseLandmarksRef.current = onPoseLandmarks;
  }, [onPoseLandmarks]);

  useEffect(() => {
    if (!enabled) {
      setPoseStatus("idle");
      setPoseErrorMessage(null);
      setHasPoseLandmarks(false);
      hasPoseLandmarksRef.current = false;
      onPoseLandmarksRef.current?.(null, performance.now());
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return undefined;
    }

    let cancelled = false;
    let poseLandmarker: MediapipePoseLandmarker | null = null;

    const start = async () => {
      setPoseStatus("loading");
      setPoseErrorMessage(null);

      try {
        const runtime = await loadRuntime();
        const vision = await runtime.FilesetResolver.forVisionTasks(MP_WASM_ROOT);
        poseLandmarker = await runtime.PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MP_MODEL_URL },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (cancelled) {
          poseLandmarker.close?.();
          return;
        }

        setPoseStatus("ready");

        const loop = () => {
          if (cancelled || !poseLandmarker) {
            return;
          }

          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (!video || !canvas || video.readyState < 2) {
            onPoseLandmarksRef.current?.(null, performance.now());
            frameRef.current = window.requestAnimationFrame(loop);
            return;
          }

          const timestampMs = performance.now();
          const result = poseLandmarker.detectForVideo(video, timestampMs);
          const firstPose = result.landmarks?.[0];

          drawLandmarks(canvas, firstPose, video.videoWidth, video.videoHeight);
          const hasLandmarks = Boolean(firstPose && firstPose.length > 0);
          if (hasLandmarks !== hasPoseLandmarksRef.current) {
            hasPoseLandmarksRef.current = hasLandmarks;
            setHasPoseLandmarks(hasLandmarks);
          }
          onPoseLandmarksRef.current?.(firstPose ?? null, timestampMs);
          frameRef.current = window.requestAnimationFrame(loop);
        };

        frameRef.current = window.requestAnimationFrame(loop);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setPoseStatus("error");
        setPoseErrorMessage(
          error instanceof Error ? error.message : "Failed to initialize MediaPipe.",
        );
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      poseLandmarker?.close?.();
    };
  }, [canvasRef, enabled, videoRef]);

  return {
    poseStatus,
    poseErrorMessage,
    hasPoseLandmarks,
  };
}
