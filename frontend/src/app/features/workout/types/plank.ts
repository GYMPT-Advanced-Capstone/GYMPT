export type PlankAnalysisStatus =
  | "idle"
  | "tracking"
  | "insufficient_visibility"
  | "not_in_position";

export interface PlankSessionMetrics {
  bodyLineAngle: number;
  elbowAngle: number;
  holdDurationSeconds: number;
  warningCodes: (string | null)[];
}

export interface PlankAnalysisSnapshot {
  timestampMs: number;
  status: PlankAnalysisStatus;
  feedbackMessage: string;
  elapsedSeconds: number;
  warningCode: string | null;
  isComplete: boolean;
  sessionMetrics: PlankSessionMetrics | null;
}
