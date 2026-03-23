import { createContext, useContext, useState, type ReactNode } from "react";

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
  userName: "",
  setUserName: () => {},
  calibratedExercises: {},
  markCalibrated: () => {},
});

export function GoalProvider({ children }: { children: ReactNode }) {
  const [goal, setGoal] = useState<GoalData>(defaultGoal);
  const [userName, setUserName] = useState("");
  const [calibratedExercises, setCalibratedExercises] = useState<
    Record<string, boolean>
  >({});

  const updateGoal = (data: Partial<GoalData>) => {
    setGoal((prev) => ({ ...prev, ...data }));
  };

  const markCalibrated = (exerciseId: string) => {
    setCalibratedExercises((prev) => ({ ...prev, [exerciseId]: true }));
  };

  return (
    <GoalContext.Provider
      value={{
        goal,
        updateGoal,
        userName,
        setUserName,
        calibratedExercises,
        markCalibrated,
      }}
    >
      {children}
    </GoalContext.Provider>
  );
}

export const useGoal = () => useContext(GoalContext);
