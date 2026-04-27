import type { NormalizedLandmark } from "../types/pose";

export interface PushupTrackedLandmark {
  x: number;
  y: number;
  visibility?: number;
}

export interface PushupTrackedLandmarks {
  side: "left" | "right";
  shoulder: PushupTrackedLandmark;
  elbow: PushupTrackedLandmark;
  wrist: PushupTrackedLandmark;
  hip: PushupTrackedLandmark;
  ankle: PushupTrackedLandmark;
  oppositeShoulder: PushupTrackedLandmark;
  oppositeHip: PushupTrackedLandmark;
  oppositeAnkle: PushupTrackedLandmark;
}

export interface PushupMetrics extends Record<string, number> {
  elbowAngle: number;
  shoulderY: number;
  bodyLineAngle: number;
}

export interface PushupObservation {
  trackedLandmarks: PushupTrackedLandmarks;
  metrics: PushupMetrics;
}

const LEFT = {
  shoulder: 11,
  elbow: 13,
  wrist: 15,
  hip: 23,
  ankle: 27,
};

const RIGHT = {
  shoulder: 12,
  elbow: 14,
  wrist: 16,
  hip: 24,
  ankle: 28,
};

const MIN_VISIBILITY = 0.3;

function isLandmarkVisible(landmark: NormalizedLandmark | undefined): landmark is NormalizedLandmark {
  return !!landmark && (landmark.visibility ?? 1) >= MIN_VISIBILITY;
}

function distance(a: PushupTrackedLandmark, b: PushupTrackedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function calculateAngle(a: PushupTrackedLandmark, b: PushupTrackedLandmark, c: PushupTrackedLandmark) {
  const ab = distance(a, b);
  const bc = distance(b, c);
  const ac = distance(a, c);
  if (ab === 0 || bc === 0) {
    return 0;
  }
  const cosValue = Math.max(-1, Math.min(1, ((ab ** 2) + (bc ** 2) - (ac ** 2)) / (2 * ab * bc)));
  return (Math.acos(cosValue) * 180) / Math.PI;
}

function pickSideLandmarks(
  landmarks: NormalizedLandmark[],
  side: "left" | "right",
): PushupTrackedLandmarks | null {
  const primary = side === "left" ? LEFT : RIGHT;
  const secondary = side === "left" ? RIGHT : LEFT;

  const shoulder = landmarks[primary.shoulder];
  const elbow = landmarks[primary.elbow];
  const wrist = landmarks[primary.wrist];
  const hip = landmarks[primary.hip];
  const ankle = landmarks[primary.ankle];
  const oppositeShoulder = landmarks[secondary.shoulder];
  const oppositeHip = landmarks[secondary.hip];
  const oppositeAnkle = landmarks[secondary.ankle];

  if (
    !isLandmarkVisible(shoulder)
    || !isLandmarkVisible(elbow)
    || !isLandmarkVisible(wrist)
    || !isLandmarkVisible(hip)
    || !isLandmarkVisible(ankle)
    || !isLandmarkVisible(oppositeShoulder)
    || !isLandmarkVisible(oppositeHip)
    || !isLandmarkVisible(oppositeAnkle)
  ) {
    return null;
  }

  return {
    side,
    shoulder,
    elbow,
    wrist,
    hip,
    ankle,
    oppositeShoulder,
    oppositeHip,
    oppositeAnkle,
  };
}

function sideVisibilityScore(sideLandmarks: PushupTrackedLandmarks | null) {
  if (!sideLandmarks) {
    return -1;
  }
  return [
    sideLandmarks.shoulder,
    sideLandmarks.elbow,
    sideLandmarks.wrist,
    sideLandmarks.hip,
    sideLandmarks.ankle,
  ].reduce((sum, landmark) => sum + (landmark.visibility ?? 1), 0);
}

export function buildPushupObservation(
  landmarks: NormalizedLandmark[] | null,
): PushupObservation | null {
  if (!landmarks || landmarks.length < 29) {
    return null;
  }

  const left = pickSideLandmarks(landmarks, "left");
  const right = pickSideLandmarks(landmarks, "right");
  const trackedLandmarks = sideVisibilityScore(left) >= sideVisibilityScore(right) ? left : right;

  if (!trackedLandmarks) {
    return null;
  }

  return {
    trackedLandmarks,
    metrics: {
      elbowAngle: Number(calculateAngle(
        trackedLandmarks.shoulder,
        trackedLandmarks.elbow,
        trackedLandmarks.wrist,
      ).toFixed(2)),
      shoulderY: Number(trackedLandmarks.shoulder.y.toFixed(4)),
      bodyLineAngle: Number(calculateAngle(
        trackedLandmarks.shoulder,
        trackedLandmarks.hip,
        trackedLandmarks.ankle,
      ).toFixed(2)),
    },
  };
}
