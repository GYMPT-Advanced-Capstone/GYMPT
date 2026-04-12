/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface GoalData {
  birthday: { year: number; month: number; day: number };
  weeklyFrequency: number;
  exerciseCounts: {
    squat: number;
    lunge: number;
    pushup: number;
    plank: number;
  };
}

const defaultGoal: GoalData = {
  birthday: { year: 2000, month: 1, day: 1 },
  weeklyFrequency: 3,
  exerciseCounts: {
    squat: 15,
    lunge: 12,
    pushup: 10,
    plank: 30,
  },
};

const STORAGE_KEY = 'gympt_goal';

function loadGoal(): GoalData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultGoal;
    return { ...defaultGoal, ...JSON.parse(raw) };
  } catch {
    return defaultGoal;
  }
}

function saveGoal(goal: GoalData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goal));
  } catch {
  }
}

const GoalContext = createContext<{
  goal: GoalData;
  updateGoal: (data: Partial<GoalData>) => void;
  userName: string;
  setUserName: (name: string) => void;
  calibratedExercises: Record<string, boolean>;
  markCalibrated: (exerciseId: string) => void;
}>({
  goal: defaultGoal,
  updateGoal: () => {},
  userName: '',
  setUserName: () => {},
  calibratedExercises: {},
  markCalibrated: () => {},
});

export function GoalProvider({ children }: { children: ReactNode }) {
  const [goal, setGoal] = useState<GoalData>(loadGoal);
  const [userName, setUserName] = useState('');
  const [calibratedExercises, setCalibratedExercises] = useState<Record<string, boolean>>({});

  const updateGoal = (data: Partial<GoalData>) => {
    setGoal((prev) => {
      const next = { ...prev, ...data };
      saveGoal(next);
      return next;
    });
  };

  const markCalibrated = (exerciseId: string) => {
    setCalibratedExercises((prev) => ({ ...prev, [exerciseId]: true }));
  };

  return (
    <GoalContext.Provider value={{ goal, updateGoal, userName, setUserName, calibratedExercises, markCalibrated }}>
      {children}
    </GoalContext.Provider>
  );
}

export const useGoal = () => useContext(GoalContext);
