export type LungeAnalysisStatus = "idle" | "tracking" | "insufficient_visibility";

export interface LungeRepSummary {
  repIndex: number;
  metrics: Record<string, number>;
  representativeFeedbackCode?: string;
  representativeFeedbackMessage?: string;
}

export interface LungeAnalysisSnapshot {
  timestampMs: number;
  status: LungeAnalysisStatus;
  feedbackMessage: string;
  fullRepCount: number;
  repSummaries: LungeRepSummary[];
  warningCode: string | null;
  lastRepEvent: {
    count: number;
    feedbackMessage: string;
    feedbackCode: string | null;
  } | null;
}
