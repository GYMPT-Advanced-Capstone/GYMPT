import { request } from "./authApi";

export interface ExerciseCalibrationSampleRequest {
  phase: string;
  metrics: Record<string, number>;
}

export interface ExerciseCalibrationResponse {
  id: number;
  exercise_id: number;
  exercise_name: string;
  version: number;
  metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExerciseRecordRepRequest {
  rep_index: number;
  metrics: Record<string, number>;
  representative_feedback_code?: string | null;
}

export interface ExerciseRecordResponse {
  id: number;
  exercise_id: number;
  exercise_name: string;
  count: number;
  duration: number;
  calories: string;
  completed_at: string;
  ai_feedback?: string | null;
}

export const workoutApi = {
  getLatestCalibration: (exerciseId: number) =>
    request<ExerciseCalibrationResponse>(
      `/api/exercise-calibrations/latest?exercise_id=${exerciseId}`,
      {},
      true,
    ),

  createCalibration: (body: {
    exercise_id: number;
    version: number;
    exercise_type: string;
    side?: string;
    hold_duration_ms: number;
    samples: ExerciseCalibrationSampleRequest[];
  }) =>
    request<ExerciseCalibrationResponse>(
      "/api/exercise-calibrations",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      true,
    ),

  createExerciseRecord: (body: {
    exercise_id: number;
    count: number;
    duration: number;
    calories: string;
    completed_at: string;
    analysis?: {
      exercise_type?: string;
      reps: ExerciseRecordRepRequest[];
    };
  }) =>
    request<ExerciseRecordResponse>(
      "/api/exercise-records",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      true,
    ),
};
