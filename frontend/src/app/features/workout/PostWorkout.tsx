import { Activity, ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

import { BottomNav } from "../../components/BottomNav";

interface WorkoutResultState {
  name?: string;
  targetCount?: number;
  completedCount?: number;
  durationLabel?: string;
  durationSeconds?: number;
  calories?: string;
  score?: number;
  retryPath?: string;
  accuracyAvg?: string;
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

  const exerciseName = result.name || "스쿼트";
  const targetCount = result.targetCount ?? 0;
  const completedCount = result.completedCount ?? 0;
  const durationLabel = toDurationLabel(result);
  const calories = result.calories ?? "0.00";
  const score = result.score ?? 0;
  const accuracyAvg = result.accuracyAvg ?? "0.00";
  const retryPath = result.retryPath ?? "/main";

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

        <div className="mb-8 flex shrink-0 items-center gap-5 rounded-[24px] border border-[#3FFDD4]/20 bg-gradient-to-br from-[#12221D] to-[#0A1411] p-5 shadow-[0_4px_24px_rgba(63,253,212,0.05)]">
          <div className="relative flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-2xl border border-[#3FFDD4]/20 bg-[#1A1E24]">
            <div className="absolute inset-0 bg-[#3FFDD4]/5" />
            <Activity size={36} className="relative z-10 text-[#3FFDD4] drop-shadow-[0_0_8px_rgba(63,253,212,0.5)]" strokeWidth={1.5} />
          </div>

          <div className="flex flex-1 flex-col">
            <h2 className="mb-3 text-[22px] font-bold tracking-tight text-white">{exerciseName}</h2>
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="mb-1 text-[12px] font-medium text-gray-400">목표</span>
                <span className="text-[16px] font-bold text-[#3FFDD4]">{targetCount}</span>
              </div>
              <div className="h-8 w-px bg-gray-800" />
              <div className="flex flex-col">
                <span className="mb-1 text-[12px] font-medium text-gray-400">완료</span>
                <span className="text-[16px] font-bold text-[#FF5A5A]">{completedCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-1 flex-col">
          <h3 className="mb-4 px-1 text-[17px] font-bold tracking-tight text-white">운동 내용</h3>

          <div className="flex flex-col gap-5 rounded-[24px] border border-white/5 bg-[#1C2025] p-6 shadow-lg">
            <DetailRow label="운동시간" value={durationLabel} color="text-[#FFD700]" />
            <div className="h-px w-full bg-gray-800/80" />

            <DetailRow label="칼로리 소모" value={`${calories} KCAL`} color="text-[#FF5A5A]" />
            <div className="h-px w-full bg-gray-800/80" />

            <DetailRow label="운동점수" value={`${score} 점`} color="text-[#4DA6FF]" />
            <div className="h-px w-full bg-gray-800/80" />

            <DetailRow label="평균 정확도" value={`${accuracyAvg}%`} color="text-[#3FFDD4]" />
          </div>
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

function DetailRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-gray-400">{label}</span>
      <span className={`text-[22px] font-bold tracking-tight ${color}`}>{value}</span>
    </div>
  );
}
