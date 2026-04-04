export type SquatAnalysisStatus = "idle" | "tracking" | "insufficient_visibility";

export interface SquatAnalysisSnapshot {
  timestampMs: number;
  status: SquatAnalysisStatus;
  feedbackMessage: string;
  fullRepCount: number;
}
