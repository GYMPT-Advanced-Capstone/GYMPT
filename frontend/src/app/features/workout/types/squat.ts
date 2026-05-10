export type SquatAnalysisStatus = "idle" | "tracking" | "insufficient_visibility";

export interface SquatRepSummary {
  repIndex: number;
  metrics: Record<string, number>;
  representativeFeedbackCode?: string;
  representativeFeedbackMessage?: string;
}

export interface SquatAnalysisSnapshot {
  timestampMs: number;
  status: SquatAnalysisStatus;
  feedbackMessage: string;
  fullRepCount: number;
  repSummaries: SquatRepSummary[];
  warningCode: string | null;
  lastRepEvent: {
    count: number;
    feedbackMessage: string;
    feedbackCode: string | null;
  } | null;
}
