import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

import type { ExerciseInfo } from "../types/workoutSession";

interface WorkoutHeaderProps {
  exercise: ExerciseInfo;
  currentCount?: number;
}

const TEXT = {
  back: "\ub4a4\ub85c \uac00\uae30",
  goalPrefix: "\ubaa9\ud45c ",
} as const;

function toMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WorkoutHeader({ exercise, currentCount = 0 }: WorkoutHeaderProps) {
  const navigate = useNavigate();
  const hasGoalTarget = exercise.targetCount > 0;
  const goalProgressCount = hasGoalTarget
    ? Math.max(0, Math.min(currentCount, exercise.targetCount))
    : 0;

  const progressLabel = exercise.isTimeBased
    ? `${toMMSS(goalProgressCount)} / ${toMMSS(exercise.targetCount)}`
    : `${goalProgressCount}/${exercise.targetCount}`;

  return (
    <header className="flex items-center justify-between pt-3">
      <div className="flex items-center gap-3">
        <button
          aria-label={TEXT.back}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-white/90"
          onClick={() => navigate(-1)}
          type="button"
        >
          <ArrowLeft size={23} />
        </button>
        <div className="flex items-center gap-2">
          {exercise.iconSrc ? (
            <img
              alt={exercise.name}
              className="h-8 w-8 object-contain"
              decoding="async"
              height={32}
              src={exercise.iconSrc}
              width={32}
            />
          ) : null}
          <h1 className="text-[18px] font-extrabold leading-none text-white">
            {exercise.emoji ? `${exercise.emoji} ` : ""}
            {exercise.name}
          </h1>
        </div>
      </div>

      {hasGoalTarget ? (
        <div className="rounded-full border-2 border-[#39F4D3] bg-[#102C28] px-4 py-[4px]">
          <span className="text-[13px] font-bold text-[#3FFDD4]">
            {TEXT.goalPrefix}
            {progressLabel}
          </span>
        </div>
      ) : null}
    </header>
  );
}
