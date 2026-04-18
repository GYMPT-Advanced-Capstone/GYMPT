import { useState } from "react";
import { useNavigate } from "react-router";
import { Minus, Plus } from "lucide-react";
import { GoalLayout } from "./components/GoalLayout";
import { useGoal } from "../../context/GoalContext";

type ExerciseId = "squat" | "pushup" | "lunge" | "plank";

interface ExerciseDef {
  id: ExerciseId;
  name: string;
  emoji: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  hint: string;
}

const exercises: ExerciseDef[] = [
  {
    id: "squat",
    name: "스쿼트",
    emoji: "🦵",
    unit: "개",
    min: 5,
    max: 100,
    step: 1,
    hint: "하체 근력",
  },
  {
    id: "pushup",
    name: "푸시업",
    emoji: "💪",
    unit: "개",
    min: 3,
    max: 80,
    step: 1,
    hint: "상체 근력",
  },
  {
    id: "lunge",
    name: "런지",
    emoji: "🏃",
    unit: "개",
    min: 5,
    max: 60,
    step: 1,
    hint: "균형·하체",
  },
  {
    id: "plank",
    name: "플랭크",
    emoji: "🧘",
    unit: "초",
    min: 10,
    max: 300,
    step: 5,
    hint: "코어 강화",
  },
];

type Counts = Record<ExerciseId, number>;

export function GoalExerciseAllPage() {
  const navigate = useNavigate();
  const { goal, updateGoal } = useGoal();

  const [counts, setCounts] = useState<Counts>({
    squat: goal.exerciseCounts.squat || 15,
    pushup: goal.exerciseCounts.pushup || 10,
    lunge: goal.exerciseCounts.lunge || 12,
    plank: goal.exerciseCounts.plank || 30,
  });

  const handleChange = (
    id: ExerciseId,
    delta: number,
    min: number,
    max: number,
  ) => {
    setCounts((prev) => {
      const next = { ...prev };
      next[id] = Math.min(max, Math.max(min, prev[id] + delta));
      return next;
    });
  };

  const handleNext = () => {
    updateGoal({ exerciseCounts: counts });
    navigate('/goal/ready');
  };

  return (
    <GoalLayout
      step={4}
      totalSteps={4}
      onBack={() => navigate("/goal/weekly")}
    >
      {/* Title */}
      <div className="px-6 pt-8 pb-4">
        <h1
          style={{
            color: "#F1F5F9",
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.35,
            marginBottom: 6,
            whiteSpace: "pre-line",
          }}
        >
          {"운동별 목표 횟수를\n설정해볼까요?"}
        </h1>
        <p style={{ color: "#94A3B8", fontSize: 14 }}>
          언제든지 변경할 수 있어요.
        </p>
      </div>

      {/* Exercise Cards */}
      <div className="px-6 flex flex-col gap-4 flex-1" style={{ marginTop: 20 }}>
        {exercises.map((ex) => {
          const count = counts[ex.id];
          const atMin = count <= ex.min;
          const atMax = count >= ex.max;

          return (
            <div
              key={ex.id}
              style={{
                backgroundColor: "#2A2A2A",
                borderRadius: 16,
                padding: "14px 18px",
                border: "1px solid #333333",
              }}
            >
              <div className="flex items-center justify-between">
                {/* Left: emoji + name */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-xl flex-shrink-0"
                    style={{
                      width: 42,
                      height: 42,
                      backgroundColor: "rgba(114,225,177,0.12)",
                      border: "1px solid rgba(114,225,177,0.25)",
                      fontSize: 20,
                    }}
                  >
                    {ex.emoji}
                  </div>
                  <div className="flex flex-col">
                    <span
                      style={{
                        color: "#F1F5F9",
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                    >
                      {ex.name}
                    </span>
                    <span
                      style={{
                        color: "#64748B",
                        fontSize: 11,
                        marginTop: 1,
                      }}
                    >
                      {ex.hint}
                    </span>
                  </div>
                </div>

                {/* Right: stepper */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleChange(ex.id, -ex.step, ex.min, ex.max)
                    }
                    disabled={atMin}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: atMin ? "#1E1E1E" : "#3A3A3A",
                      border: "none",
                      cursor: atMin ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: atMin ? "#555555" : "#F1F5F9",
                      flexShrink: 0,
                    }}
                  >
                    <Minus size={14} strokeWidth={2.5} />
                  </button>

                  <div
                    className="flex items-baseline justify-center gap-1"
                    style={{ minWidth: 58 }}
                  >
                    <span
                      style={{
                        color: "#72e1b1",
                        fontSize: 26,
                        fontWeight: 700,
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {count}
                    </span>
                    <span style={{ color: "#64748B", fontSize: 13 }}>
                      {ex.unit}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      handleChange(ex.id, ex.step, ex.min, ex.max)
                    }
                    disabled={atMax}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: atMax ? "#1E1E1E" : "#3A3A3A",
                      border: "none",
                      cursor: atMax ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: atMax ? "#555555" : "#F1F5F9",
                      flexShrink: 0,
                    }}
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Next Button */}
      <div className="px-6 pb-16 pt-5">
        <button
          onClick={handleNext}
          style={{
            width: "100%",
            height: 56,
            backgroundColor: "#72e1b1",
            borderRadius: 12,
            border: "none",
            color: "#121212",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          다음
        </button>
      </div>
    </GoalLayout>
  );
}