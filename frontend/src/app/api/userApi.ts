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

// ---------------------------------------------------------------------------
// 로컬 운동 목표 저장소 — 백엔드 exercise-goals API 유무와 관계없이 항상 동작
// ---------------------------------------------------------------------------
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

export const localExerciseGoalStorage = {
  /** GoalExercisePage에서 설정한 exerciseCounts를 localStorage에 저장 */
  save: (exerciseCounts: Record<string, number>): void => {
    const goals: LocalExerciseGoal[] = Object.entries(exerciseCounts).map(
      ([key, target]) => ({
        exercise_key: key,
        exercise_name: EXERCISE_DISPLAY[key]?.name ?? key,
        target,
        unit: EXERCISE_DISPLAY[key]?.unit ?? '개',
      }),
    );
    localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(goals));
  },

  /** 저장된 운동 목표 읽기 */
  load: (): LocalExerciseGoal[] => {
    try {
      const raw = localStorage.getItem(LOCAL_GOALS_KEY);
      return raw ? (JSON.parse(raw) as LocalExerciseGoal[]) : [];
    } catch {
      return [];
    }
  },

  /** 특정 운동 목표 업데이트 */
  update: (key: string, newTarget: number): void => {
    const goals = localExerciseGoalStorage.load().map((g) =>
      g.exercise_key === key ? { ...g, target: newTarget } : g,
    );
    localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(goals));
  },

  clear: (): void => localStorage.removeItem(LOCAL_GOALS_KEY),

  /** LocalExerciseGoal → ExerciseGoalSummaryItem 변환 (exercise_id는 -1로 처리) */
  toSummaryItems: (goals: LocalExerciseGoal[]): ExerciseGoalSummaryItem[] =>
    goals.map((g, idx) => ({
      exercise_id: -(idx + 1),   // API ID 없을 때 음수 dummy ID 사용
      exercise_name: g.exercise_name,
      daily_target_count: g.unit === '개' ? g.target : null,
      daily_target_duration: g.unit === '초' ? g.target : null,
      today_count: 0,
      today_duration: 0,
    })),
};

// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 유틸 함수
// ---------------------------------------------------------------------------
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
