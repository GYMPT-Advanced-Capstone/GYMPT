import { request } from './authApi';

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  nickname: string;
  birth_date: string | null;
  weekly_target: number | null;
  created_at: string;
}

export interface ExerciseGoalSummaryItem {
  goal_id?: number;
  exercise_id: number;
  exercise_name: string;
  daily_target_count: number | null;
  daily_target_duration: number | null;
  today_count: number;
  today_duration: number;
}

export interface MainSummaryResponse {
  nickname: string;
  today_achievement_rate: number;
  today_completed_count: number;
  exercise_goals: ExerciseGoalSummaryItem[];
  weekly_workout_days: boolean[];
  badges: string[];
  ai_comment: string | null;
}

export interface ExerciseGoalResponse {
  id: number;
  exercise_id: number;
  daily_target_count: number | null;
  daily_target_duration: number | null;
  threshold: number | null;
}

export interface ExerciseGoalCreateRequest {
  exercise_id: number;
  daily_target_count?: number | null;
  daily_target_duration?: number | null;
  threshold?: number | null;
}

export interface ExerciseGoalUpdateRequest {
  daily_target_count?: number | null;
  daily_target_duration?: number | null;
  threshold?: number | null;
}

export const userApi = {
  getMe: () => request<UserProfile>('/api/v1/users/me', {}, true),

  getSummary: () => request<MainSummaryResponse>('/api/v1/users/me/summary', {}, true),

  updateBirthDate: (birth_date: string) =>
    request<UserProfile>(
      '/api/v1/users/me/birth-date',
      { method: 'PATCH', body: JSON.stringify({ birth_date }) },
      true,
    ),

  updateWeeklyTarget: (weekly_target: number) =>
    request<UserProfile>(
      '/api/v1/users/me/weekly-target',
      { method: 'PATCH', body: JSON.stringify({ weekly_target }) },
      true,
    ),

  createExerciseGoal: (data: ExerciseGoalCreateRequest) =>
    request<ExerciseGoalResponse>(
      '/api/v1/users/me/exercise-goals',
      { method: 'POST', body: JSON.stringify(data) },
      true,
    ),

  updateExerciseGoal: (goalId: number, data: ExerciseGoalUpdateRequest) =>
    request<ExerciseGoalResponse>(
      `/api/v1/users/me/exercise-goals/${goalId}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      true,
    ),
};

export function parseBirthDate(dateStr: string | null): { year: number; month: number; day: number } {
  if (!dateStr) return { year: 2000, month: 1, day: 1 };
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function formatBirthDateForApi(b: { year: number; month: number; day: number }): string {
  return `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`;
}

export function formatJoinDate(createdAt: string): string {
  return createdAt.slice(0, 10).replace(/-/g, '.');
}

export function calcAge(birthDate: string | null): number {
  if (!birthDate) return 0;
  return 2026 - Number(birthDate.slice(0, 4));
}

export const goalIdStorage = {
  set: (exerciseId: number, goalId: number) => {
    const all = goalIdStorage.getAll();
    all[exerciseId] = goalId;
    localStorage.setItem('gympt_goal_ids', JSON.stringify(all));
  },
  get: (exerciseId: number): number | null => {
    return goalIdStorage.getAll()[exerciseId] ?? null;
  },
  getAll: (): Record<number, number> => {
    try {
      return JSON.parse(localStorage.getItem('gympt_goal_ids') ?? '{}');
    } catch {
      return {};
    }
  },
  clear: () => localStorage.removeItem('gympt_goal_ids'),
};
