import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

import { BottomNav } from "../../components/BottomNav";
import { WORKOUT_EXERCISES } from "./config/exercises";

interface WorkoutResultState {
  exerciseId?: string;
  name?: string;
  targetCount?: number;
  completedCount?: number;
  durationLabel?: string;
  durationSeconds?: number;
  calories?: string;
  retryPath?: string;
  aiFeedback?: string | null;
}

function toDurationLabel(state: WorkoutResultState) {
  if (state.durationLabel) {
    return state.durationLabel;
  }
  if (!state.durationSeconds) {
    return "00:00";
  }
  const minutes = Math.floor(state.durationSeconds / 60);
  const seconds = state.durationSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PostWorkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const result = (location.state ?? {}) as WorkoutResultState;

  const exerciseId = result.exerciseId ?? "";
  const exerciseName = result.name || WORKOUT_EXERCISES[exerciseId]?.name || "운동";
  const targetCount = result.targetCount ?? 0;
  const completedCount = result.completedCount ?? 0;
  const durationLabel = toDurationLabel(result);
  const calories = result.calories ?? "0.00";
  const retryPath = result.retryPath ?? "/main";
  const aiFeedback = result.aiFeedback ?? null;
  const iconSrc = WORKOUT_EXERCISES[exerciseId]?.iconSrc ?? null;

  return (
    <div
      className="flex w-full items-start justify-center"
      style={{ minHeight: "100dvh", backgroundColor: "#111111" }}
    >
      <div
        className="relative flex min-h-[100dvh] w-full max-w-[390px] flex-col overflow-y-auto p-5"
        style={{
          backgroundColor: "#1A1A1A",
          color: "white",
          paddingBottom: 88,
        }}
      >
        <header className="relative mb-8 flex shrink-0 items-center justify-center pt-2">
          <button
            className="absolute left-0 -ml-2 p-2 text-gray-400 transition-colors hover:text-white"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[17px] font-bold tracking-widest text-white">운동 결과</h1>
        </header>

        {/* 운동 정보 카드 - 목표/완료/시간/칼로리 */}
        <div className="mb-6 flex shrink-0 items-center gap-4 rounded-[24px] border border-[#3FFDD4]/20 bg-gradient-to-br from-[#12221D] to-[#0A1411] p-5 shadow-[0_4px_24px_rgba(63,253,212,0.05)]">
          <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#3FFDD4]/20 bg-[#1A1E24]">
            <div className="absolute inset-0 bg-[#3FFDD4]/5" />
            {iconSrc ? (
              <img src={iconSrc} alt={exerciseName} className="relative z-10 h-14 w-14 object-contain" />
            ) : (
              <span className="relative z-10 text-2xl">💪</span>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <h2 className="text-[18px] font-bold tracking-tight text-white">{exerciseName}</h2>
            <div className="flex items-center gap-3">
              <StatChip label="목표" value={String(targetCount)} color="text-[#3FFDD4]" />
              <div className="h-6 w-px bg-gray-700" />
              <StatChip label="완료" value={String(completedCount)} color="text-[#FF5A5A]" />
              <div className="h-6 w-px bg-gray-700" />
              <StatChip label="시간" value={durationLabel} color="text-[#FFD700]" />
              <div className="h-6 w-px bg-gray-700" />
              <StatChip label="칼로리" value={`${calories}`} color="text-[#FF8C42]" />
            </div>
          </div>
        </div>

        {/* AI 피드백 - 나머지 공간 전부 */}
        <div className="mb-4 flex flex-1 flex-col rounded-[24px] border border-[#3FFDD4]/20 bg-gradient-to-br from-[#12221D] to-[#0A1411] p-6 shadow-lg">
          <span className="mb-3 text-[13px] font-bold text-[#3FFDD4]">AI 자세 피드백</span>
          {aiFeedback ? (
            <p className="text-[15px] leading-relaxed text-gray-300">{aiFeedback}</p>
          ) : (
            <p className="text-[14px] leading-relaxed text-gray-500">
              {exerciseName} 운동을 완료하면 AI가 자세 피드백을 제공합니다.
            </p>
          )}
        </div>

        <div className="mt-auto flex gap-3 pt-4 shrink-0">
          <button
            className="flex-1 rounded-2xl bg-[#3FFDD4] py-4 text-[16px] font-bold text-[#111111] shadow-[0_4px_20px_rgba(63,253,212,0.2)] transition-all hover:brightness-110 active:scale-[0.98]"
            onClick={() => navigate(retryPath)}
            type="button"
          >
            운동 재개
          </button>
          <button
            className="flex-1 rounded-2xl bg-[#FF3366] py-4 text-[16px] font-bold text-white shadow-[0_4px_20px_rgba(255,51,102,0.2)] transition-all hover:brightness-110 active:scale-[0.98]"
            onClick={() => navigate("/main")}
            type="button"
          >
            운동 완료
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-medium text-gray-400">{label}</span>
      <span className={`text-[13px] font-bold ${color}`}>{value}</span>
    </div>
  );
}
