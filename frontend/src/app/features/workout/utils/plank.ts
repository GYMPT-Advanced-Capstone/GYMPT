import type { NormalizedLandmark } from "../types/pose";

export interface PlankTrackedLandmark {
  x: number;
  y: number;
  visibility?: number;
}

export interface PlankTrackedLandmarks {
  side: "left" | "right";
  shoulder: PlankTrackedLandmark;
  elbow: PlankTrackedLandmark;
  wrist: PlankTrackedLandmark;
  hip: PlankTrackedLandmark;
  ankle: PlankTrackedLandmark;
  nose: PlankTrackedLandmark;
}

export interface PlankMetrics extends Record<string, number> {
  elbowAngle: number;
  bodyLineAngle: number;
}

export interface PlankObservation {
  trackedLandmarks: PlankTrackedLandmarks;
  metrics: PlankMetrics;
}

const LEFT = { shoulder: 11, elbow: 13, wrist: 15, hip: 23, ankle: 27 };
const RIGHT = { shoulder: 12, elbow: 14, wrist: 16, hip: 24, ankle: 28 };
const NOSE_INDEX = 0;
const MIN_VISIBILITY = 0.3;

function isVisible(lm: NormalizedLandmark | undefined): lm is NormalizedLandmark {
  return !!lm && (lm.visibility ?? 1) >= MIN_VISIBILITY;
}

function distance(a: PlankTrackedLandmark, b: PlankTrackedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function calculateAngle(
  a: PlankTrackedLandmark,
  b: PlankTrackedLandmark,
  c: PlankTrackedLandmark,
): number {
  const ab = distance(a, b);
  const bc = distance(b, c);
  const ac = distance(a, c);
  if (ab === 0 || bc === 0) return 0;
  const cos = Math.max(-1, Math.min(1, (ab ** 2 + bc ** 2 - ac ** 2) / (2 * ab * bc)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function pickSide(
  landmarks: NormalizedLandmark[],
  side: "left" | "right",
): { landmarks: PlankTrackedLandmarks; score: number } | null {
  const idx = side === "left" ? LEFT : RIGHT;
  const shoulder = landmarks[idx.shoulder];
  const elbow = landmarks[idx.elbow];
  const wrist = landmarks[idx.wrist];
  const hip = landmarks[idx.hip];
  const ankle = landmarks[idx.ankle];
  const nose = landmarks[NOSE_INDEX];

  if (
    !isVisible(shoulder) || !isVisible(elbow) || !isVisible(wrist) ||
    !isVisible(hip) || !isVisible(ankle) || !isVisible(nose)
  ) {
    return null;
  }

  const score = [shoulder, elbow, wrist, hip, ankle].reduce(
    (sum, lm) => sum + (lm.visibility ?? 1),
    0,
  );

  return {
    landmarks: { side, shoulder, elbow, wrist, hip, ankle, nose },
    score,
  };
}

export function buildPlankObservation(
  landmarks: NormalizedLandmark[] | null,
): PlankObservation | null {
  if (!landmarks || landmarks.length < 29) return null;

  const left = pickSide(landmarks, "left");
  const right = pickSide(landmarks, "right");

  const best =
    left && right ? (left.score >= right.score ? left : right) :
    left ?? right;

  if (!best) return null;

  const { shoulder, elbow, wrist, hip, ankle } = best.landmarks;

  return {
    trackedLandmarks: best.landmarks,
    metrics: {
      elbowAngle: Number(calculateAngle(shoulder, elbow, wrist).toFixed(2)),
      bodyLineAngle: Number(calculateAngle(shoulder, hip, ankle).toFixed(2)),
    },
  };
}
