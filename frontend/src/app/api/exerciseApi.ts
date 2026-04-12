import { request } from './authApi';

export interface ExerciseItem {
  id: number;
  name: string;
}

export const exerciseApi = {
  getList: () => request<ExerciseItem[]>('/api/exercises'),
};
