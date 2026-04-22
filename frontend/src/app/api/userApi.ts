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

export interface LocalExerciseGoal {
  exercise_key: string;   // 'squat' | 'lunge' | 'pushup' | 'plank'
  exercise_name: string;  // '스쿼트' | '런지' | '푸시업' | '플랭크'
  target: number;
  unit: string;           // '개' | '초'
}

const EXERCISE_DISPLAY: Record<string, { name: string; unit: string }> = {
  squat:  { name: '스쿼트', unit: '개' },
  lunge:  { name: '런지',   unit: '개' },
  pushup: { name: '푸시업', unit: '개' },
  plank:  { name: '플랭크', unit: '초' },
};

const LOCAL_GOALS_KEY = 'gympt_local_exercise_goals';

function getGoalsKey(): string {
  const userId = localStorage.getItem('gympt_user_id');
  return userId ? `${LOCAL_GOALS_KEY}_${userId}` : LOCAL_GOALS_KEY;
}

export const localExerciseGoalStorage = {
  save: (exerciseCounts: Record<string, number>): void => {
    const goals: LocalExerciseGoal[] = Object.entries(exerciseCounts).map(
      ([key, target]) => ({
        exercise_key: key,
        exercise_name: EXERCISE_DISPLAY[key]?.name ?? key,
        target,
        unit: EXERCISE_DISPLAY[key]?.unit ?? '개',
      }),
    );
    localStorage.setItem(getGoalsKey(), JSON.stringify(goals));
  },

  load: (): LocalExerciseGoal[] => {
    try {
      const raw = localStorage.getItem(getGoalsKey());
      if (raw) return JSON.parse(raw) as LocalExerciseGoal[];
      const fallback = localStorage.getItem(LOCAL_GOALS_KEY);
      return fallback ? (JSON.parse(fallback) as LocalExerciseGoal[]) : [];
    } catch {
      return [];
    }
  },

  update: (key: string, newTarget: number): void => {
    const goals = localExerciseGoalStorage.load().map((g) =>
      g.exercise_key === key ? { ...g, target: newTarget } : g,
    );
    localStorage.setItem(getGoalsKey(), JSON.stringify(goals));
  },

  clear: (): void => {
    localStorage.removeItem(getGoalsKey());
    localStorage.removeItem(LOCAL_GOALS_KEY);
  },

  toSummaryItems: (goals: LocalExerciseGoal[]): ExerciseGoalSummaryItem[] =>
    goals.map((g, idx) => ({
      exercise_id: -(idx + 1),
      exercise_name: g.exercise_name,
      daily_target_count: g.unit === '개' ? g.target : null,
      daily_target_duration: g.unit === '초' ? g.target : null,
      today_count: 0,
      today_duration: 0,
    })),
};

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
  _key: (): string => {
    const userId = localStorage.getItem('gympt_user_id');
    return userId ? `gympt_goal_ids_${userId}` : 'gympt_goal_ids';
  },
  set: (exerciseId: number, goalId: number) => {
    const all = goalIdStorage.getAll();
    all[exerciseId] = goalId;
    localStorage.setItem(goalIdStorage._key(), JSON.stringify(all));
  },
  get: (exerciseId: number): number | null => {
    return goalIdStorage.getAll()[exerciseId] ?? null;
  },
  getAll: (): Record<number, number> => {
    try {
      return JSON.parse(localStorage.getItem(goalIdStorage._key()) ?? '{}');
    } catch {
      return {};
    }
  },
  clear: () => localStorage.removeItem(goalIdStorage._key()),
};

export const onboardingStorage = {
  setDone: (userId: number): void => {
    localStorage.setItem(`gympt_onboarding_done_${userId}`, '1');
  },
  isDone: (userId: number): boolean => {
    return localStorage.getItem(`gympt_onboarding_done_${userId}`) === '1';
  },
};

export interface BodyData {
  height: number;
  weight: number;
}

const BODY_KEY = 'gympt_body';

function getBodyKey(): string {
  const userId = localStorage.getItem('gympt_user_id');
  return userId ? `${BODY_KEY}_${userId}` : BODY_KEY;
}

export const bodyStorage = {
  save: (data: BodyData): void => {
    localStorage.setItem(getBodyKey(), JSON.stringify(data));
  },
  load: (): BodyData | null => {
    try {
      const raw = localStorage.getItem(getBodyKey());
      return raw ? (JSON.parse(raw) as BodyData) : null;
    } catch {
      return null;
    }
  },
  updateWeight: (weight: number): void => {
    const current = bodyStorage.load() ?? { height: 170, weight };
    bodyStorage.save({ ...current, weight });
  },
};