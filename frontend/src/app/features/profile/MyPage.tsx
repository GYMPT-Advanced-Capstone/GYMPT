import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronRight,
  LogOut,
  Edit3,
  User,
  Dumbbell,
  Target,
  Minus,
  Plus,
  X,
  Check,
  RotateCcw,
  Gauge,
} from "lucide-react";
import { useGoal } from "../../context/GoalContext";
import { BottomNav } from "../../components/BottomNav";

// 여기 나중에 연동 예정
const MOCK_USER = {
  name: "박준서",
  username: "junseo_fit",
  joinDate: "2026.01.15",
  level: "Lv.3 피트니스 루키",
};

type EditTarget =
  | "birthday"
  | "weekly"
  | "squat"
  | "lunge"
  | "pushup"
  | "plank"
  | null;

const exerciseMeta = {
  squat: { name: "스쿼트", unit: "개", min: 5, max: 100, step: 1 },
  lunge: { name: "런지", unit: "개", min: 5, max: 60, step: 1 },
  pushup: { name: "푸시업", unit: "개", min: 3, max: 80, step: 1 },
  plank: { name: "플랭크", unit: "초", min: 10, max: 300, step: 5 },
};

export function MyPage() {
  const navigate = useNavigate();
  const { goal, updateGoal } = useGoal();

  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [tmpBirthday, setTmpBirthday] = useState(goal.birthday);
  const [tmpWeekly, setTmpWeekly] = useState(goal.weeklyFrequency);
  const [tmpCount, setTmpCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [resetTarget, setResetTarget] = useState<keyof typeof exerciseMeta | null>(null);

  const openEdit = (target: EditTarget) => {
    setEditTarget(target);
    if (target === "birthday") setTmpBirthday(goal.birthday);
    if (target === "weekly") setTmpWeekly(goal.weeklyFrequency);
    if (target && target in exerciseMeta)
      setTmpCount(goal.exerciseCounts[target as keyof typeof exerciseMeta]);
  };

  const saveEdit = () => {
    if (editTarget === "birthday") updateGoal({ birthday: tmpBirthday });
    if (editTarget === "weekly") updateGoal({ weeklyFrequency: tmpWeekly });
    if (editTarget && editTarget in exerciseMeta) {
      updateGoal({
        exerciseCounts: { ...goal.exerciseCounts, [editTarget]: tmpCount },
      });
    }
    setEditTarget(null);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    navigate("/");
  };

  const handleResetThreshold = () => {
    setResetTarget(null);
  };

  const { birthday, weeklyFrequency, exerciseCounts } = goal;
  const formattedBirthday = `${birthday.year}.${String(birthday.month).padStart(2, "0")}.${String(birthday.day).padStart(2, "0")}`;
  const age = 2026 - birthday.year;

  return (
    <div
      className="flex justify-center items-start"
      style={{ minHeight: "100dvh", backgroundColor: "#111111" }}
    >
      <div
        className="flex flex-col"
        style={{
          width: "100%",
          maxWidth: "390px",
          minHeight: "100dvh",
          backgroundColor: "#1A1A1A",
          paddingBottom: 80,
        }}
      >
        <div
          className="px-6 pt-14 pb-6"
          style={{
            background:
              "linear-gradient(160deg, rgba(63,253,212,0.25) 0%, rgba(63,253,212,0.06) 45%, transparent 70%)",
            borderBottom: "1px solid #2C2C30",
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div
              style={{
                width: 3,
                height: 22,
                backgroundColor: "#3FFDD4",
                borderRadius: 2,
                flexShrink: 0,
              }}
            />
            <h1
              style={{
                color: "#FFFFFF",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: -0.3,
              }}
            >
              마이페이지
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{
                width: 72,
                height: 72,
                background:
                  "linear-gradient(135deg, rgba(63,253,212,0.25) 0%, rgba(63,253,212,0.08) 100%)",
                border: "2px solid #3FFDD4",
              }}
            >
              <User size={32} color="#3FFDD4" />
            </div>

            <div className="flex flex-col">
              <span style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 700 }}>
                {MOCK_USER.name}
              </span>
              <span style={{ color: "#888888", fontSize: 13, marginTop: 2 }}>
                @{MOCK_USER.username}
              </span>
              <div
                className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full"
                style={{
                  backgroundColor: "rgba(63,253,212,0.1)",
                  border: "1px solid rgba(63,253,212,0.25)",
                  width: "fit-content",
                }}
              >
                <span style={{ color: "#3FFDD4", fontSize: 11, fontWeight: 600 }}>
                  {MOCK_USER.level}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            {[
              { label: "나이", value: `${age}세` },
              { label: "주간 목표", value: `${weeklyFrequency}회` },
              { label: "운동 종목", value: "4가지" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center flex-1 rounded-xl py-3"
                style={{ backgroundColor: "#2C2C30", border: "1px solid #3A3A3E" }}
              >
                <span style={{ color: "#3FFDD4", fontSize: 16, fontWeight: 700 }}>
                  {s.value}
                </span>
                <span style={{ color: "#888888", fontSize: 11, marginTop: 2 }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Section title="사용자 정보" icon={<User size={15} color="#3FFDD4" />}>
          <InfoRow label="이름" value={MOCK_USER.name} />
          <InfoRow label="아이디" value={MOCK_USER.username} />
          <InfoRow label="가입일" value={MOCK_USER.joinDate} />
          <InfoRow
            label="생년월일"
            value={formattedBirthday}
            onEdit={() => openEdit("birthday")}
          />
        </Section>

        <Section
          title="운동 목표 설정"
          icon={<Target size={15} color="#3FFDD4" />}
          topGap
        >
          <GoalRow
            label="주간 운동 횟수"
            value={`${weeklyFrequency}회`}
            onEdit={() => openEdit("weekly")}
          />
          {(
            Object.entries(exerciseMeta) as [
              keyof typeof exerciseMeta,
              (typeof exerciseMeta)[keyof typeof exerciseMeta],
            ][]
          ).map(([key, meta]) => (
            <GoalRow
              key={key}
              label={`${meta.name} 목표`}
              value={`${exerciseCounts[key]}${meta.unit}`}
              onEdit={() => openEdit(key)}
            />
          ))}
        </Section>

        <Section
          title="운동 임계값 초기화"
          icon={<Gauge size={15} color="#3FFDD4" />}
          topGap
        >
          <div className="px-5 py-3">
            <p style={{ color: "#888888", fontSize: 12, marginBottom: 14 }}>
              촬영 전 측정한 임계값을 운동별로 초기화할 수 있어요
            </p>
            <div className="flex flex-col gap-3">
              {(Object.entries(exerciseMeta) as [
                keyof typeof exerciseMeta,
                (typeof exerciseMeta)[keyof typeof exerciseMeta],
              ][]).map(([key, meta]) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-4 rounded-xl"
                  style={{
                    backgroundColor: "#242428",
                    border: "1px solid #2C2C30",
                    height: 52,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center rounded-lg"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: "rgba(63,253,212,0.08)",
                        border: "1px solid rgba(63,253,212,0.2)",
                      }}
                    >
                      <Dumbbell size={14} color="#3FFDD4" />
                    </div>
                    <span style={{ color: "#CCCCCC", fontSize: 14 }}>
                      {meta.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setResetTarget(key)}
                    className="flex items-center gap-1.5 px-3 rounded-lg"
                    style={{
                      height: 32,
                      backgroundColor: "rgba(255,90,90,0.1)",
                      border: "1px solid rgba(255,90,90,0.25)",
                      cursor: "pointer",
                    }}
                  >
                    <RotateCcw size={12} color="#FF5A5A" />
                    <span style={{ color: "#FF5A5A", fontSize: 12, fontWeight: 600 }}>
                      초기화
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section
          title="계정"
          icon={<Dumbbell size={15} color="#3FFDD4" />}
          topGap
        >
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center justify-between w-full px-4 py-4"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              borderBottom: "1px solid #2C2C30",
            }}
          >
            <div className="flex items-center gap-3">
              <LogOut size={17} color="#FF5A5A" />
              <span style={{ color: "#FF5A5A", fontSize: 15 }}>로그아웃</span>
            </div>
            <ChevronRight size={16} color="#555555" />
          </button>
        </Section>

        <p
          style={{
            color: "#444444",
            fontSize: 11,
            textAlign: "center",
            marginTop: 24,
          }}
        >
          AI 피트니스 코치 v1.0.0
        </p>
      </div>

      <BottomNav />

      {editTarget && (
        <EditModal
          editTarget={editTarget}
          tmpBirthday={tmpBirthday}
          setTmpBirthday={setTmpBirthday}
          tmpWeekly={tmpWeekly}
          setTmpWeekly={setTmpWeekly}
          tmpCount={tmpCount}
          setTmpCount={setTmpCount}
          onSave={saveEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {showLogoutConfirm && (
        <ConfirmSheet
          message="정말 로그아웃 하시겠어요?"
          confirmLabel="로그아웃"
          confirmColor="#FF5A5A"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

      {resetTarget && (
        <ConfirmSheet
          message={`${exerciseMeta[resetTarget].name} 임계값을 초기화할까요?`}
          subMessage="다음 촬영 시 임계값을 다시 측정해야 해요"
          confirmLabel="초기화"
          confirmColor="#FF5A5A"
          onConfirm={handleResetThreshold}
          onCancel={() => setResetTarget(null)}
          icon={<RotateCcw size={24} color="#FF5A5A" />}
          iconBg="rgba(255,90,90,0.12)"
          iconBorder="rgba(255,90,90,0.3)"
        />
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  topGap,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  topGap?: boolean;
}) {
  return (
    <div style={{ marginTop: topGap ? 16 : 0 }}>
      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{ borderBottom: "1px solid #2C2C30" }}
      >
        {icon}
        <span
          style={{
            color: "#3FFDD4",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ backgroundColor: "#1E1E22" }}>{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{ borderBottom: "1px solid #2C2C30" }}
    >
      <span style={{ color: "#888888", fontSize: 14 }}>{label}</span>
      <div className="flex items-center gap-2">
        <span style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 500 }}>
          {value}
        </span>
        {onEdit && (
          <button
            onClick={onEdit}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
          >
            <Edit3 size={14} color="#3FFDD4" />
          </button>
        )}
      </div>
    </div>
  );
}

function GoalRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <button
      onClick={onEdit}
      className="flex items-center justify-between w-full px-5 py-4"
      style={{
        background: "none",
        border: "none",
        borderBottom: "1px solid #2C2C30",
        cursor: "pointer",
      }}
    >
      <span style={{ color: "#CCCCCC", fontSize: 14 }}>{label}</span>
      <div className="flex items-center gap-2">
        <span style={{ color: "#3FFDD4", fontSize: 14, fontWeight: 600 }}>
          {value}
        </span>
        <ChevronRight size={15} color="#555555" />
      </div>
    </button>
  );
}

function EditModal({
  editTarget,
  tmpBirthday,
  setTmpBirthday,
  tmpWeekly,
  setTmpWeekly,
  tmpCount,
  setTmpCount,
  onSave,
  onClose,
}: {
  editTarget: EditTarget;
  tmpBirthday: { year: number; month: number; day: number };
  setTmpBirthday: (v: { year: number; month: number; day: number }) => void;
  tmpWeekly: number;
  setTmpWeekly: (v: number) => void;
  tmpCount: number;
  setTmpCount: (v: number) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const isExercise = editTarget && editTarget in exerciseMeta;
  const meta = isExercise
    ? exerciseMeta[editTarget as keyof typeof exerciseMeta]
    : null;

  return (
    <div
      className="fixed inset-0 flex justify-center items-end"
      style={{ zIndex: 200, backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-t-3xl px-6 pt-5 pb-10"
        style={{
          maxWidth: 390,
          backgroundColor: "#242428",
          border: "1px solid #3A3A3E",
        }}
      >
        <div
          className="mx-auto mb-5 rounded-full"
          style={{ width: 40, height: 4, backgroundColor: "#3A3A3E" }}
        />

        <div className="flex items-center justify-between mb-5">
          <span style={{ color: "#FFFFFF", fontSize: 17, fontWeight: 700 }}>
            {editTarget === "birthday" && "생년월일 수정"}
            {editTarget === "weekly" && "주간 운동 횟수 수정"}
            {isExercise && `${meta!.name} 목표 수정`}
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <X size={20} color="#888888" />
          </button>
        </div>

        {editTarget === "birthday" && (
          <div className="flex flex-col gap-4">
            <div>
              <label
                style={{
                  color: "#888888",
                  fontSize: 12,
                  display: "block",
                  marginBottom: 8,
                }}
              >
                연도
              </label>
              <div
                className="flex items-center justify-between px-4"
                style={{
                  backgroundColor: "#2C2C30",
                  borderRadius: 12,
                  height: 52,
                  border: "1px solid #3A3A3E",
                }}
              >
                <CounterBtn
                  disabled={tmpBirthday.year <= 1940}
                  onClick={() =>
                    setTmpBirthday({ ...tmpBirthday, year: tmpBirthday.year - 1 })
                  }
                  icon={<Minus size={16} />}
                />
                <span style={{ color: "#3FFDD4", fontSize: 22, fontWeight: 700 }}>
                  {tmpBirthday.year}
                </span>
                <CounterBtn
                  disabled={tmpBirthday.year >= 2015}
                  onClick={() =>
                    setTmpBirthday({ ...tmpBirthday, year: tmpBirthday.year + 1 })
                  }
                  icon={<Plus size={16} />}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label
                  style={{
                    color: "#888888",
                    fontSize: 12,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  월
                </label>
                <div
                  className="flex items-center justify-between px-3"
                  style={{
                    backgroundColor: "#2C2C30",
                    borderRadius: 12,
                    height: 52,
                    border: "1px solid #3A3A3E",
                  }}
                >
                  <CounterBtn
                    disabled={tmpBirthday.month <= 1}
                    onClick={() =>
                      setTmpBirthday({ ...tmpBirthday, month: tmpBirthday.month - 1 })
                    }
                    icon={<Minus size={14} />}
                  />
                  <span style={{ color: "#3FFDD4", fontSize: 20, fontWeight: 700 }}>
                    {tmpBirthday.month}
                  </span>
                  <CounterBtn
                    disabled={tmpBirthday.month >= 12}
                    onClick={() =>
                      setTmpBirthday({ ...tmpBirthday, month: tmpBirthday.month + 1 })
                    }
                    icon={<Plus size={14} />}
                  />
                </div>
              </div>
              <div className="flex-1">
                <label
                  style={{
                    color: "#888888",
                    fontSize: 12,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  일
                </label>
                <div
                  className="flex items-center justify-between px-3"
                  style={{
                    backgroundColor: "#2C2C30",
                    borderRadius: 12,
                    height: 52,
                    border: "1px solid #3A3A3E",
                  }}
                >
                  <CounterBtn
                    disabled={tmpBirthday.day <= 1}
                    onClick={() =>
                      setTmpBirthday({ ...tmpBirthday, day: tmpBirthday.day - 1 })
                    }
                    icon={<Minus size={14} />}
                  />
                  <span style={{ color: "#3FFDD4", fontSize: 20, fontWeight: 700 }}>
                    {tmpBirthday.day}
                  </span>
                  <CounterBtn
                    disabled={tmpBirthday.day >= 31}
                    onClick={() =>
                      setTmpBirthday({ ...tmpBirthday, day: tmpBirthday.day + 1 })
                    }
                    icon={<Plus size={14} />}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {editTarget === "weekly" && (
          <div>
            <p style={{ color: "#888888", fontSize: 13, marginBottom: 16 }}>
              일주일에 몇 번 운동할 건가요?
            </p>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => setTmpWeekly(n)}
                  className="flex-1 flex items-center justify-center rounded-xl"
                  style={{
                    height: 52,
                    backgroundColor: tmpWeekly === n ? "#3FFDD4" : "#2C2C30",
                    border: `1px solid ${tmpWeekly === n ? "#3FFDD4" : "#3A3A3E"}`,
                    color: tmpWeekly === n ? "#0A1A16" : "#CCCCCC",
                    fontSize: 16,
                    fontWeight: tmpWeekly === n ? 700 : 400,
                    cursor: "pointer",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <p
              style={{
                color: "#3FFDD4",
                fontSize: 12,
                textAlign: "center",
                marginTop: 12,
              }}
            >
              주 {tmpWeekly}회
            </p>
          </div>
        )}

        {isExercise && meta && (
          <div>
            <p style={{ color: "#888888", fontSize: 13, marginBottom: 20 }}>
              {meta.name} 목표를 조정해보세요
            </p>
            <div
              className="flex items-center justify-between px-6 rounded-2xl"
              style={{
                backgroundColor: "#2C2C30",
                height: 88,
                border: "1px solid #3A3A3E",
              }}
            >
              <CounterBtn
                disabled={tmpCount <= meta.min}
                onClick={() => setTmpCount(Math.max(meta.min, tmpCount - meta.step))}
                icon={<Minus size={20} />}
                size={44}
              />
              <div className="flex flex-col items-center">
                <span
                  style={{
                    color: "#3FFDD4",
                    fontSize: 44,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {tmpCount}
                </span>
                <span style={{ color: "#888888", fontSize: 13, marginTop: 4 }}>
                  {meta.unit}
                </span>
              </div>
              <CounterBtn
                disabled={tmpCount >= meta.max}
                onClick={() => setTmpCount(Math.min(meta.max, tmpCount + meta.step))}
                icon={<Plus size={20} />}
                size={44}
              />
            </div>
          </div>
        )}

        <button
          onClick={onSave}
          className="flex items-center justify-center gap-2 w-full rounded-2xl mt-6"
          style={{
            height: 56,
            backgroundColor: "#3FFDD4",
            border: "none",
            color: "#0A1A16",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Check size={18} />
          저장하기
        </button>
      </div>
    </div>
  );
}

function CounterBtn({
  onClick,
  disabled,
  icon,
  size = 36,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  size?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        backgroundColor: disabled ? "#222226" : "#3A3A3E",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: disabled ? "#444444" : "#FFFFFF",
        flexShrink: 0,
        transition: "all 0.15s",
      }}
    >
      {icon}
    </button>
  );
}

function ConfirmSheet({
  message,
  subMessage,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
  icon,
  iconBg,
  iconBorder,
}: {
  message: string;
  subMessage?: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: React.ReactNode;
  iconBg?: string;
  iconBorder?: string;
}) {
  return (
    <div
      className="fixed inset-0 flex justify-center items-end"
      style={{ zIndex: 300, backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="w-full rounded-t-3xl px-6 pt-5 pb-10"
        style={{
          maxWidth: 390,
          backgroundColor: "#242428",
          border: "1px solid #3A3A3E",
        }}
      >
        <div
          className="mx-auto mb-6 rounded-full"
          style={{ width: 40, height: 4, backgroundColor: "#3A3A3E" }}
        />

        <div className="flex justify-center mb-4">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 56,
              height: 56,
              backgroundColor: iconBg ?? "rgba(255,90,90,0.12)",
              border: `1px solid ${iconBorder ?? "rgba(255,90,90,0.3)"}`,
            }}
          >
            {icon ?? <LogOut size={24} color="#FF5A5A" />}
          </div>
        </div>

        <p
          style={{
            color: "#FFFFFF",
            fontSize: 17,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {message}
        </p>
        <p
          style={{
            color: "#888888",
            fontSize: 13,
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          {subMessage ?? "로그아웃 후 다시 로그인이 필요해요"}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center rounded-2xl"
            style={{
              height: 52,
              backgroundColor: "#2C2C30",
              border: "1px solid #3A3A3E",
              color: "#CCCCCC",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center rounded-2xl"
            style={{
              height: 52,
              backgroundColor: confirmColor,
              border: "none",
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
