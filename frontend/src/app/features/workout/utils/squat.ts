import type { NormalizedLandmark } from "../types/pose";

export interface SquatTrackedLandmark {
  x: number;
  y: number;
  visibility?: number;
}

export interface SquatTrackedLandmarks {
  side: "left" | "right";
  shoulder: SquatTrackedLandmark;
  hip: SquatTrackedLandmark;
  knee: SquatTrackedLandmark;
  ankle: SquatTrackedLandmark;
  foot: SquatTrackedLandmark;
}

export interface SquatMetrics extends Record<string, number> {
  kneeAngle: number;
  hipAngle: number;
  torsoLeanAngle: number;
  kneeAnkleOffsetX: number;
}

export interface SquatObservation {
  trackedLandmarks: SquatTrackedLandmarks;
  metrics: SquatMetrics;
}

const LEFT = {
  shoulder: 11,
  hip: 23,
  knee: 25,
  ankle: 27,
  foot: 31,
};

const RIGHT = {
  shoulder: 12,
  hip: 24,
  knee: 26,
  ankle: 28,
  foot: 32,
};

const MIN_VISIBILITY = 0.3;

function isLandmarkVisible(landmark: NormalizedLandmark | undefined): landmark is NormalizedLandmark {
  return !!landmark && (landmark.visibility ?? 1) >= MIN_VISIBILITY;
}

function distance(a: SquatTrackedLandmark, b: SquatTrackedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function calculateAngle(a: SquatTrackedLandmark, b: SquatTrackedLandmark, c: SquatTrackedLandmark) {
  const ab = distance(a, b);
  const bc = distance(b, c);
  const ac = distance(a, c);
  if (ab === 0 || bc === 0) {
    return 0;
  }
  const cosValue = Math.max(-1, Math.min(1, ((ab ** 2) + (bc ** 2) - (ac ** 2)) / (2 * ab * bc)));
  return (Math.acos(cosValue) * 180) / Math.PI;
}

function calculateTorsoLeanAngle(shoulder: SquatTrackedLandmark, hip: SquatTrackedLandmark) {
  const dx = Math.abs(shoulder.x - hip.x);
  const dy = Math.abs(shoulder.y - hip.y);
  if (dx === 0 && dy === 0) {
    return 0;
  }
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

function pickSideLandmarks(
  landmarks: NormalizedLandmark[],
  side: "left" | "right",
): SquatTrackedLandmarks | null {
  const indexes = side === "left" ? LEFT : RIGHT;
  const shoulder = landmarks[indexes.shoulder];
  const hip = landmarks[indexes.hip];
  const knee = landmarks[indexes.knee];
  const ankle = landmarks[indexes.ankle];
  const foot = landmarks[indexes.foot];

  if (
    !isLandmarkVisible(shoulder)
    || !isLandmarkVisible(hip)
    || !isLandmarkVisible(knee)
    || !isLandmarkVisible(ankle)
    || !isLandmarkVisible(foot)
  ) {
    return null;
  }

  return {
    side,
    shoulder,
    hip,
    knee,
    ankle,
    foot,
  };
}

function sideVisibilityScore(sideLandmarks: SquatTrackedLandmarks | null) {
  if (!sideLandmarks) {
    return -1;
  }
  return [
    sideLandmarks.shoulder,
    sideLandmarks.hip,
    sideLandmarks.knee,
    sideLandmarks.ankle,
    sideLandmarks.foot,
  ].reduce((sum, landmark) => sum + (landmark.visibility ?? 1), 0);
}

export function buildSquatObservation(
  landmarks: NormalizedLandmark[] | null,
): SquatObservation | null {
  if (!landmarks || landmarks.length < 33) {
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
      kneeAngle: Number(calculateAngle(
        trackedLandmarks.hip,
        trackedLandmarks.knee,
        trackedLandmarks.ankle,
      ).toFixed(2)),
      hipAngle: Number(calculateAngle(
        trackedLandmarks.shoulder,
        trackedLandmarks.hip,
        trackedLandmarks.knee,
      ).toFixed(2)),
      torsoLeanAngle: Number(calculateTorsoLeanAngle(
        trackedLandmarks.shoulder,
        trackedLandmarks.hip,
      ).toFixed(2)),
      kneeAnkleOffsetX: Number(Math.abs(
        trackedLandmarks.knee.x - trackedLandmarks.ankle.x,
      ).toFixed(4)),
    },
  };
}
