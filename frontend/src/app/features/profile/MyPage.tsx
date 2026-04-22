import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
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
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { BottomNav } from '../../components/BottomNav';
import { authApi, tokenStorage } from '../../api/authApi';
import {
  userApi,
  goalIdStorage,
  parseBirthDate,
  formatBirthDateForApi,
  formatJoinDate,
  calcAge,
  localExerciseGoalStorage,
  bodyStorage,
  type BodyData,
  type UserProfile,
  type ExerciseGoalSummaryItem,
  type ExerciseGoalUpdateRequest,
  type LocalExerciseGoal,
} from '../../api/userApi';
import { useGoal } from '../../context/GoalContext';

type DisplayGoal = {
  key: string;
  exercise_id: number;
  exercise_name: string;
  target: number;
  unit: string;
  today_count: number;
  today_duration: number;
  api_goal_id: number | null;
};

type EditTarget =
  | 'birthday'
  | 'weekly'
  | 'weight'
  | { type: 'exercise'; goal: DisplayGoal }
  | null;

const EXERCISE_KEY_MAP: Record<string, string> = {
  스쿼트: 'squat',
  런지: 'lunge',
  푸시업: 'pushup',
  플랭크: 'plank',
};

const EXERCISE_EMOJI: Record<string, string> = {
  squat:  '🦵',
  lunge:  '🏃',
  pushup: '💪',
  plank:  '⏱️',
};

const GOAL_CONTEXT_META: Record<string, { name: string; unit: string }> = {
  squat:  { name: '스쿼트', unit: '개' },
  lunge:  { name: '런지',   unit: '개' },
  pushup: { name: '푸시업', unit: '개' },
  plank:  { name: '플랭크', unit: '초' },
};

function goalContextToLocalGoals(
  exerciseCounts: Record<string, number>,
): LocalExerciseGoal[] {
  return Object.entries(exerciseCounts).map(([key, target]) => ({
    exercise_key: key,
    exercise_name: GOAL_CONTEXT_META[key]?.name ?? key,
    target,
    unit: GOAL_CONTEXT_META[key]?.unit ?? '개',
  }));
}

function fromApiItem(item: ExerciseGoalSummaryItem): DisplayGoal {
  const unit = item.daily_target_duration != null ? '초' : '개';
  const target = item.daily_target_count ?? item.daily_target_duration ?? 0;
  const key = EXERCISE_KEY_MAP[item.exercise_name] ?? '';
  const apiGoalId = item.goal_id ?? goalIdStorage.get(item.exercise_id);
  if (item.goal_id != null) goalIdStorage.set(item.exercise_id, item.goal_id);
  return {
    key,
    exercise_id: item.exercise_id,
    exercise_name: item.exercise_name,
    target,
    unit,
    today_count: item.today_count,
    today_duration: item.today_duration,
    api_goal_id: apiGoalId ?? null,
  };
}

function fromLocalGoal(g: LocalExerciseGoal, idx: number): DisplayGoal {
  return {
    key: g.exercise_key,
    exercise_id: -(idx + 1),
    exercise_name: g.exercise_name,
    target: g.target,
    unit: g.unit,
    today_count: 0,
    today_duration: 0,
    api_goal_id: null,
  };
}

export function MyPage() {
  const navigate = useNavigate();
  const { goal: goalCtx } = useGoal();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [displayGoals, setDisplayGoals] = useState<DisplayGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [tmpBirthday, setTmpBirthday] = useState({ year: 2000, month: 1, day: 1 });
  const [tmpWeekly, setTmpWeekly] = useState(3);
  const [tmpCount, setTmpCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [bodyData, setBodyData] = useState<BodyData | null>(() => bodyStorage.load());

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [profile, summary] = await Promise.all([
        userApi.getMe().catch(() => null),
        userApi.getSummary().catch(() => null),
      ]);

      if (profile) {
        setUserProfile(profile);
      } else {
        const userId = tokenStorage.getUserId();
        const userName = tokenStorage.getUserName();
        if (userId && userName) {
          setUserProfile({
            id: userId,
            email: `user${userId}@gympt.com`,
            name: userName,
            nickname: userName,
            birth_date: null,
            weekly_target: 3,
            created_at: new Date().toISOString(),
          });
        } else {
          throw new Error('로그인이 필요해요');
        }
      }

      if (summary && summary.exercise_goals.length > 0) {
        const goals = summary.exercise_goals.map(fromApiItem);
        setDisplayGoals(goals);
        const syncCounts: Record<string, number> = {};
        goals.forEach((g) => { if (g.key) syncCounts[g.key] = g.target; });
        if (Object.keys(syncCounts).length > 0) localExerciseGoalStorage.save(syncCounts);
      } else {
        const localGoals = localExerciseGoalStorage.load();
        if (localGoals.length > 0) {
          setDisplayGoals(localGoals.map(fromLocalGoal));
        } else {
          const ctxGoals = goalContextToLocalGoals(goalCtx.exerciseCounts);
          const hasRealData = Object.values(goalCtx.exerciseCounts).some((v) => v > 0);
          if (hasRealData) {
            localExerciseGoalStorage.save(goalCtx.exerciseCounts);
            setDisplayGoals(ctxGoals.map(fromLocalGoal));
          }
        }
      }
    } catch (e) {
      setFetchError((e as Error).message ?? '데이터를 불러오는 데 실패했어요.');
    } finally {
      setLoading(false);
    }
  }, [goalCtx.exerciseCounts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEdit = (target: EditTarget) => {
    setSaveError(null);
    if (target === 'birthday' && userProfile) {
      setTmpBirthday(parseBirthDate(userProfile.birth_date));
    }
    if (target === 'weekly' && userProfile) {
      setTmpWeekly(userProfile.weekly_target ?? 3);
    }
    if (target === 'weight') {
      setTmpCount(bodyData?.weight ?? 65);
    }
    if (target && typeof target === 'object' && target.type === 'exercise') {
      setTmpCount(target.goal.target);
    }
    setEditTarget(target);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editTarget === 'birthday') {
        const updated = await userApi.updateBirthDate(formatBirthDateForApi(tmpBirthday));
        setUserProfile(updated);

      } else if (editTarget === 'weekly') {
        const updated = await userApi.updateWeeklyTarget(tmpWeekly);
        setUserProfile(updated);

      } else if (editTarget === 'weight') {
        bodyStorage.updateWeight(tmpCount);
        setBodyData(bodyStorage.load());

      } else if (typeof editTarget === 'object' && editTarget.type === 'exercise') {
        const g = editTarget.goal;

        if (g.api_goal_id != null) {
          const data: ExerciseGoalUpdateRequest =
            g.unit === '개'
              ? { daily_target_count: tmpCount }
              : { daily_target_duration: tmpCount };
          await userApi.updateExerciseGoal(g.api_goal_id, data);
        }

        if (g.key) localExerciseGoalStorage.update(g.key, tmpCount);

        setDisplayGoals((prev) =>
          prev.map((item) =>
            item.exercise_id === g.exercise_id
              ? { ...item, target: tmpCount }
              : item,
          ),
        );
      }
      setEditTarget(null);
    } catch (e) {
      setSaveError((e as Error).message ?? '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) await authApi.logout(refreshToken);
    } catch (_e) {
      void _e;
    } finally {
      tokenStorage.clearTokens();
      setLoggingOut(false);
      setShowLogoutConfirm(false);
      navigate('/');
    }
  };

  const age = calcAge(userProfile?.birth_date ?? null);
  const birthday = parseBirthDate(userProfile?.birth_date ?? null);
  const formattedBirthday = userProfile?.birth_date
    ? `${birthday.year}.${String(birthday.month).padStart(2, '0')}.${String(birthday.day).padStart(2, '0')}`
    : '미등록';
  const joinDate = userProfile?.created_at ? formatJoinDate(userProfile.created_at) : '-';
  const weeklyTarget = userProfile?.weekly_target ?? '-';
  const weight = bodyData?.weight ?? null;

  if (loading) {
    return (
      <div className="flex justify-center" style={{ minHeight: '100dvh', backgroundColor: '#111111' }}>
        <div
          className="flex flex-col items-center justify-center"
          style={{ width: '100%', maxWidth: 390, minHeight: '100dvh', backgroundColor: '#1A1A1A' }}
        >
          <div
            className="rounded-full animate-spin mb-4"
            style={{ width: 40, height: 40, border: '3px solid #2C2C30', borderTopColor: '#3FFDD4' }}
          />
          <span style={{ color: '#888888', fontSize: 14 }}>정보를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex justify-center" style={{ minHeight: '100dvh', backgroundColor: '#111111' }}>
        <div
          className="flex flex-col items-center justify-center gap-4"
          style={{ width: '100%', maxWidth: 390, minHeight: '100dvh', backgroundColor: '#1A1A1A' }}
        >
          <AlertCircle size={40} color="#FF5A5A" />
          <span style={{ color: '#FF5A5A', fontSize: 14 }}>{fetchError}</span>
          <button
            onClick={loadData}
            style={{
              backgroundColor: '#3FFDD4', color: '#0A1A16', fontSize: 14,
              fontWeight: 700, border: 'none', cursor: 'pointer',
              padding: '12px 24px', borderRadius: 12,
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center" style={{ minHeight: '100dvh', backgroundColor: '#111111' }}>
      <div
        className="flex flex-col"
        style={{ width: '100%', maxWidth: 390, minHeight: '100dvh', backgroundColor: '#1A1A1A', paddingBottom: 80 }}
      >
        <div
          className="px-6 pt-14 pb-6"
          style={{
            background: 'linear-gradient(160deg, rgba(63,253,212,0.25) 0%, rgba(63,253,212,0.06) 45%, transparent 70%)',
            borderBottom: '1px solid #2C2C30',
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div style={{ width: 3, height: 22, backgroundColor: '#3FFDD4', borderRadius: 2 }} />
            <h1 style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>마이페이지</h1>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{
                width: 72, height: 72,
                background: 'linear-gradient(135deg, rgba(63,253,212,0.25), rgba(63,253,212,0.08))',
                border: '2px solid #3FFDD4',
              }}
            >
              <User size={32} color="#3FFDD4" />
            </div>
            <div className="flex flex-col">
              <span style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 700 }}>{userProfile?.name ?? '-'}</span>
              <span style={{ color: '#888888', fontSize: 13, marginTop: 2 }}>@{userProfile?.nickname ?? '-'}</span>
              <div
                className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full"
                style={{
                  backgroundColor: 'rgba(63,253,212,0.1)',
                  border: '1px solid rgba(63,253,212,0.25)',
                  width: 'fit-content',
                }}
              >
                <span style={{ color: '#3FFDD4', fontSize: 11, fontWeight: 600 }}>Lv.1 피트니스 루키</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            {[
              { label: '나이',      value: userProfile?.birth_date ? `${age}세` : '-' },
              { label: '주간 목표', value: weeklyTarget !== '-' ? `${weeklyTarget}회` : '-' },
              { label: '운동 종목', value: `${displayGoals.length}가지` },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center flex-1 rounded-xl py-3"
                style={{ backgroundColor: '#2C2C30', border: '1px solid #3A3A3E' }}
              >
                <span style={{ color: '#3FFDD4', fontSize: 16, fontWeight: 700 }}>{s.value}</span>
                <span style={{ color: '#888888', fontSize: 11, marginTop: 2 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Section title="사용자 정보" icon={<User size={15} color="#3FFDD4" />}>
          <InfoRow label="이름"    value={userProfile?.name ?? '-'} />
          <InfoRow label="아이디"  value={userProfile?.nickname ?? '-'} />
          <InfoRow label="가입일"  value={joinDate} />
          <InfoRow label="생년월일" value={formattedBirthday} onEdit={() => openEdit('birthday')} />
          <InfoRow label="체중"    value={weight !== null ? `${weight}kg` : '미등록'} onEdit={() => openEdit('weight')} />
        </Section>

        <Section title="운동 목표 설정" icon={<Target size={15} color="#3FFDD4" />} topGap>
          <GoalRow
            label="주간 운동 횟수"
            value={weeklyTarget !== '-' ? `${weeklyTarget}회` : '-'}
            onEdit={() => openEdit('weekly')}
            icon={<Calendar size={14} color="#3FFDD4" />}
          />
          {displayGoals.length === 0 ? (
            <div className="px-5 py-6 flex flex-col items-center gap-2">
              <span style={{ color: '#555555', fontSize: 13 }}>등록된 운동 목표가 없어요</span>
              <span style={{ color: '#444444', fontSize: 11 }}>온보딩에서 목표를 설정해보세요</span>
            </div>
          ) : (
            displayGoals.map((g) => (
              <ExerciseGoalRow
                key={g.exercise_id}
                goal={g}
                onEdit={() => openEdit({ type: 'exercise', goal: g })}
              />
            ))
          )}
        </Section>

        <Section title="운동 임계값 초기화" icon={<Gauge size={15} color="#3FFDD4" />} topGap>
          <div className="px-5 py-3">
            <p style={{ color: '#888888', fontSize: 12, marginBottom: 14 }}>
              촬영 전 측정한 임계값을 운동별로 초기화할 수 있어요
            </p>
            {displayGoals.length === 0 ? (
              <p style={{ color: '#555555', fontSize: 12 }}>운동 목표를 먼저 설정해주세요</p>
            ) : (
              <div className="flex flex-col gap-3">
                {displayGoals.map((g) => (
                  <div
                    key={g.exercise_id}
                    className="flex items-center justify-between px-4 rounded-xl"
                    style={{ backgroundColor: '#242428', border: '1px solid #2C2C30', height: 52 }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center rounded-lg"
                        style={{
                          width: 32, height: 32,
                          backgroundColor: 'rgba(63,253,212,0.08)',
                          border: '1px solid rgba(63,253,212,0.2)',
                        }}
                      >
                        <Dumbbell size={14} color="#3FFDD4" />
                      </div>
                      <span style={{ color: '#CCCCCC', fontSize: 14 }}>{g.exercise_name}</span>
                    </div>
                    <button
                      onClick={() => setResetTarget(g.exercise_name)}
                      className="flex items-center gap-1.5 px-3 rounded-lg"
                      style={{
                        height: 32,
                        backgroundColor: 'rgba(255,90,90,0.1)',
                        border: '1px solid rgba(255,90,90,0.25)',
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={12} color="#FF5A5A" />
                      <span style={{ color: '#FF5A5A', fontSize: 12, fontWeight: 600 }}>초기화</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title="계정" icon={<Dumbbell size={15} color="#3FFDD4" />} topGap>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center justify-between w-full px-4 py-4"
            style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #2C2C30' }}
          >
            <div className="flex items-center gap-3">
              <LogOut size={17} color="#FF5A5A" />
              <span style={{ color: '#FF5A5A', fontSize: 15 }}>로그아웃</span>
            </div>
            <ChevronRight size={16} color="#555555" />
          </button>
        </Section>

        <p style={{ color: '#444444', fontSize: 11, textAlign: 'center', marginTop: 24 }}>
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
          onClose={() => { setEditTarget(null); setSaveError(null); }}
          saving={saving}
          saveError={saveError}
        />
      )}

      {showLogoutConfirm && (
        <ConfirmSheet
          message="정말 로그아웃 하시겠어요?"
          confirmLabel={loggingOut ? '처리 중...' : '로그아웃'}
          confirmColor="#FF5A5A"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
          disabled={loggingOut}
        />
      )}

      {resetTarget && (
        <ConfirmSheet
          message={`${resetTarget} 임계값을 초기화할까요?`}
          subMessage="다음 촬영 시 임계값을 다시 측정해야 해요"
          confirmLabel="초기화"
          confirmColor="#FF5A5A"
          onConfirm={() => setResetTarget(null)}
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
  title, icon, children, topGap,
}: { title: string; icon: React.ReactNode; children: React.ReactNode; topGap?: boolean }) {
  return (
    <div style={{ marginTop: topGap ? 16 : 0 }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid #2C2C30' }}>
        {icon}
        <span style={{ color: '#3FFDD4', fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>{title}</span>
      </div>
      <div style={{ backgroundColor: '#1E1E22' }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2C2C30' }}>
      <span style={{ color: '#888888', fontSize: 14 }}>{label}</span>
      <div className="flex items-center gap-2">
        <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 500 }}>{value}</span>
        {onEdit && (
          <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <Edit3 size={14} color="#3FFDD4" />
          </button>
        )}
      </div>
    </div>
  );
}

function GoalRow({ label, value, onEdit, icon }: { label: string; value: string; onEdit: () => void; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onEdit}
      className="flex items-center justify-between w-full px-5 py-4"
      style={{ background: 'none', border: 'none', borderBottom: '1px solid #2C2C30', cursor: 'pointer' }}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 30, height: 30, backgroundColor: 'rgba(63,253,212,0.08)', border: '1px solid rgba(63,253,212,0.2)' }}
          >
            {icon}
          </div>
        )}
        <span style={{ color: '#CCCCCC', fontSize: 14 }}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span style={{ color: '#3FFDD4', fontSize: 14, fontWeight: 600 }}>{value}</span>
        <ChevronRight size={15} color="#555555" />
      </div>
    </button>
  );
}

function ExerciseGoalRow({ goal: g, onEdit }: { goal: DisplayGoal; onEdit: () => void }) {
  const emoji = EXERCISE_EMOJI[g.key] ?? '🏋️';
  const todayStr =
    g.today_count > 0 ? `오늘 ${g.today_count}개 완료`
    : g.today_duration > 0 ? `오늘 ${g.today_duration}초 완료`
    : '오늘 미완료';

  return (
    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2C2C30' }}>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ width: 30, height: 30, backgroundColor: 'rgba(63,253,212,0.08)', border: '1px solid rgba(63,253,212,0.2)', fontSize: 16 }}
        >
          {emoji}
        </div>
        <div className="flex flex-col gap-0.5">
          <span style={{ color: '#CCCCCC', fontSize: 14 }}>{g.exercise_name} 목표</span>
          <span style={{ color: '#555555', fontSize: 11 }}>{todayStr}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span style={{ color: '#3FFDD4', fontSize: 14, fontWeight: 600 }}>
          {g.target}{g.unit}
        </span>
        <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <Edit3 size={14} color="#3FFDD4" />
        </button>
      </div>
    </div>
  );
}

function EditModal({
  editTarget, tmpBirthday, setTmpBirthday, tmpWeekly, setTmpWeekly,
  tmpCount, setTmpCount, onSave, onClose, saving, saveError,
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
  saving: boolean;
  saveError: string | null;
}) {
  const isExercise =
    editTarget != null && typeof editTarget === 'object' && editTarget.type === 'exercise';
  const exerciseGoal = isExercise
    ? (editTarget as { type: 'exercise'; goal: DisplayGoal }).goal
    : null;

  const isCount = exerciseGoal?.unit === '개';
  const unit = exerciseGoal?.unit ?? '개';
  const min  = isCount ? 1  : 10;
  const max  = isCount ? 200 : 3600;
  const step = isCount ? 1  : 5;

  const title =
    editTarget === 'birthday'  ? '생년월일 수정'
    : editTarget === 'weekly'  ? '주간 운동 횟수 수정'
    : editTarget === 'weight'  ? '체중 수정'
    : isExercise               ? `${exerciseGoal!.exercise_name} 목표 수정`
    : '';

  return (
    <div
      className="fixed inset-0 flex justify-center items-end"
      style={{ zIndex: 200, backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-t-3xl px-6 pt-5 pb-10"
        style={{ maxWidth: 390, backgroundColor: '#242428', border: '1px solid #3A3A3E' }}
      >
        <div className="mx-auto mb-5 rounded-full" style={{ width: 40, height: 4, backgroundColor: '#3A3A3E' }} />
        <div className="flex items-center justify-between mb-5">
          <span style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="#888888" />
          </button>
        </div>

        {editTarget === 'birthday' && (
          <div className="flex flex-col gap-4">
            <div>
              <label style={{ color: '#888888', fontSize: 12, display: 'block', marginBottom: 8 }}>연도</label>
              <div
                className="flex items-center justify-between px-4"
                style={{ backgroundColor: '#2C2C30', borderRadius: 12, height: 52, border: '1px solid #3A3A3E' }}
              >
                <CounterBtn disabled={tmpBirthday.year <= 1940} onClick={() => setTmpBirthday({ ...tmpBirthday, year: tmpBirthday.year - 1 })} icon={<Minus size={16} />} />
                <span style={{ color: '#3FFDD4', fontSize: 22, fontWeight: 700 }}>{tmpBirthday.year}</span>
                <CounterBtn disabled={tmpBirthday.year >= 2015} onClick={() => setTmpBirthday({ ...tmpBirthday, year: tmpBirthday.year + 1 })} icon={<Plus size={16} />} />
              </div>
            </div>
            <div className="flex gap-3">
              {(['month', 'day'] as const).map((field) => (
                <div key={field} className="flex-1">
                  <label style={{ color: '#888888', fontSize: 12, display: 'block', marginBottom: 8 }}>
                    {field === 'month' ? '월' : '일'}
                  </label>
                  <div
                    className="flex items-center justify-between px-3"
                    style={{ backgroundColor: '#2C2C30', borderRadius: 12, height: 52, border: '1px solid #3A3A3E' }}
                  >
                    <CounterBtn
                      disabled={tmpBirthday[field] <= 1}
                      onClick={() => setTmpBirthday({ ...tmpBirthday, [field]: tmpBirthday[field] - 1 })}
                      icon={<Minus size={14} />}
                    />
                    <span style={{ color: '#3FFDD4', fontSize: 20, fontWeight: 700 }}>{tmpBirthday[field]}</span>
                    <CounterBtn
                      disabled={tmpBirthday[field] >= (field === 'month' ? 12 : 31)}
                      onClick={() => setTmpBirthday({ ...tmpBirthday, [field]: tmpBirthday[field] + 1 })}
                      icon={<Plus size={14} />}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editTarget === 'weekly' && (
          <div>
            <p style={{ color: '#888888', fontSize: 13, marginBottom: 16 }}>일주일에 몇 번 운동할 건가요?</p>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => setTmpWeekly(n)}
                  className="flex-1 flex items-center justify-center rounded-xl"
                  style={{
                    height: 52,
                    backgroundColor: tmpWeekly === n ? '#3FFDD4' : '#2C2C30',
                    border: `1px solid ${tmpWeekly === n ? '#3FFDD4' : '#3A3A3E'}`,
                    color: tmpWeekly === n ? '#0A1A16' : '#CCCCCC',
                    fontSize: 16,
                    fontWeight: tmpWeekly === n ? 700 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <p style={{ color: '#3FFDD4', fontSize: 12, textAlign: 'center', marginTop: 12 }}>주 {tmpWeekly}회</p>
          </div>
        )}

        {editTarget === 'weight' && (
          <div>
            <p style={{ color: '#888888', fontSize: 13, marginBottom: 20 }}>
              체중을 조정해보세요
            </p>
            <div
              className="flex items-center justify-between px-6 rounded-2xl"
              style={{ backgroundColor: '#2C2C30', height: 88, border: '1px solid #3A3A3E' }}
            >
              <CounterBtn
                disabled={tmpCount <= 30}
                onClick={() => setTmpCount(Math.max(30, tmpCount - 1))}
                icon={<Minus size={20} />}
                size={44}
              />
              <div className="flex flex-col items-center">
                <span style={{ color: '#3FFDD4', fontSize: 44, fontWeight: 700, lineHeight: 1 }}>{tmpCount}</span>
                <span style={{ color: '#888888', fontSize: 13, marginTop: 4 }}>kg</span>
              </div>
              <CounterBtn
                disabled={tmpCount >= 200}
                onClick={() => setTmpCount(Math.min(200, tmpCount + 1))}
                icon={<Plus size={20} />}
                size={44}
              />
            </div>
          </div>
        )}

        {isExercise && exerciseGoal && (
          <div>
            <p style={{ color: '#888888', fontSize: 13, marginBottom: 20 }}>
              {exerciseGoal.exercise_name} 목표를 조정해보세요
            </p>
            <div
              className="flex items-center justify-between px-6 rounded-2xl"
              style={{ backgroundColor: '#2C2C30', height: 88, border: '1px solid #3A3A3E' }}
            >
              <CounterBtn
                disabled={tmpCount <= min}
                onClick={() => setTmpCount(Math.max(min, tmpCount - step))}
                icon={<Minus size={20} />}
                size={44}
              />
              <div className="flex flex-col items-center">
                <span style={{ color: '#3FFDD4', fontSize: 44, fontWeight: 700, lineHeight: 1 }}>{tmpCount}</span>
                <span style={{ color: '#888888', fontSize: 13, marginTop: 4 }}>{unit}</span>
              </div>
              <CounterBtn
                disabled={tmpCount >= max}
                onClick={() => setTmpCount(Math.min(max, tmpCount + step))}
                icon={<Plus size={20} />}
                size={44}
              />
            </div>
          </div>
        )}

        {saveError && (
          <div
            className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl"
            style={{ backgroundColor: 'rgba(255,90,90,0.1)', border: '1px solid rgba(255,90,90,0.2)' }}
          >
            <AlertCircle size={14} color="#FF5A5A" />
            <span style={{ color: '#FF5A5A', fontSize: 13 }}>{saveError}</span>
          </div>
        )}

        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full rounded-2xl mt-6"
          style={{
            height: 56,
            backgroundColor: saving ? '#2C6B5E' : '#3FFDD4',
            border: 'none',
            color: '#0A1A16',
            fontSize: 16,
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? (
            <>
              <div className="rounded-full animate-spin" style={{ width: 18, height: 18, border: '2px solid #0A1A16', borderTopColor: 'transparent' }} />
              저장 중...
            </>
          ) : (
            <><Check size={18} />저장하기</>
          )}
        </button>
      </div>
    </div>
  );
}

function CounterBtn({
  onClick, disabled, icon, size = 36,
}: { onClick: () => void; disabled: boolean; icon: React.ReactNode; size?: number }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: size, height: size, borderRadius: 10,
        backgroundColor: disabled ? '#222226' : '#3A3A3E',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: disabled ? '#444444' : '#FFFFFF', flexShrink: 0, transition: 'all 0.15s',
      }}
    >
      {icon}
    </button>
  );
}

function ConfirmSheet({
  message, subMessage, confirmLabel, confirmColor,
  onConfirm, onCancel, icon, iconBg, iconBorder, disabled,
}: {
  message: string; subMessage?: string; confirmLabel: string; confirmColor: string;
  onConfirm: () => void; onCancel: () => void;
  icon?: React.ReactNode; iconBg?: string; iconBorder?: string; disabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 flex justify-center items-end" style={{ zIndex: 300, backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full rounded-t-3xl px-6 pt-5 pb-10"
        style={{ maxWidth: 390, backgroundColor: '#242428', border: '1px solid #3A3A3E' }}
      >
        <div className="mx-auto mb-6 rounded-full" style={{ width: 40, height: 4, backgroundColor: '#3A3A3E' }} />
        <div className="flex justify-center mb-4">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 56, height: 56,
              backgroundColor: iconBg ?? 'rgba(255,90,90,0.12)',
              border: `1px solid ${iconBorder ?? 'rgba(255,90,90,0.3)'}`,
            }}
          >
            {icon ?? <LogOut size={24} color="#FF5A5A" />}
          </div>
        </div>
        <p style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>{message}</p>
        <p style={{ color: '#888888', fontSize: 13, textAlign: 'center', marginBottom: 28 }}>
          {subMessage ?? '로그아웃 후 다시 로그인이 필요해요'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={disabled}
            style={{ flex: 1, height: 52, backgroundColor: '#2C2C30', border: '1px solid #3A3A3E', color: '#CCCCCC', fontSize: 15, fontWeight: 600, cursor: 'pointer', borderRadius: 16 }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled}
            style={{ flex: 1, height: 52, backgroundColor: confirmColor, border: 'none', color: '#FFFFFF', fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1, borderRadius: 16 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}