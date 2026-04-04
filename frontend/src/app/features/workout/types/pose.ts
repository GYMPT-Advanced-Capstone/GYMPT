export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type PoseOverlayStatus = "idle" | "loading" | "ready" | "error";
