import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGoal } from '../../context/GoalContext';
import { BottomNav } from '../../components/BottomNav';
import { Trophy, TrendingUp, Zap } from 'lucide-react';
import { userApi, localExerciseGoalStorage, type UserProfile } from '../../api/userApi';

import squatImg from '../../../assets/exercises/squat.png';
import pushupImg from '../../../assets/exercises/pushup.png';
import lungeImg from '../../../assets/exercises/lunge.png';
import plankImg from '../../../assets/exercises/plank.png';

const EXERCISE_KEY_MAP: Record<string, string> = {
  스쿼트: 'squat',
  런지: 'lunge',
  푸시업: 'pushup',
  플랭크: 'plank',
};

const exercises = [
  { id: 'squat',  name: '스쿼트', img: squatImg, desc: '하체 강화' },
  { id: 'pushup', name: '푸시업', img: pushupImg, desc: '상체 강화' },
  { id: 'lunge',  name: '런지',   img: lungeImg, desc: '균형·하체' },
  { id: 'plank',  name: '플랭크', img: plankImg, desc: '코어 강화' },
];

const weeklyData = [
  { day: '월', done: true },
  { day: '화', done: true },
  { day: '수', done: false },
  { day: '목', done: true },
  { day: '금', done: false },
  { day: '토', done: false },
  { day: '일', done: false },
];

const badges = [
  { icon: '🔥', label: '3일 연속', active: true },
  { icon: '⚡', label: '첫 분석', active: true },
  { icon: '🏆', label: '주간 달성', active: false },
  { icon: '💎', label: '완벽 자세', active: false },
];

export function MainPage() {
  const navigate = useNavigate();
  const { goal, calibratedExercises } = useGoal();
  const { exerciseCounts } = goal;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [localCounts, setLocalCounts] = useState<Record<string, number>>(() => {
    const localGoals = localExerciseGoalStorage.load();
    if (localGoals.length === 0) return {};
    const counts: Record<string, number> = {};
    localGoals.forEach((g) => { counts[g.exercise_key] = g.target; });
    return counts;
  });

  useEffect(() => {
    userApi.getMe().then(setProfile).catch(() => {});

    if (localExerciseGoalStorage.load().length === 0) {
      userApi.getSummary().then((summary) => {
        if (summary && summary.exercise_goals.length > 0) {
          const counts: Record<string, number> = {};
          summary.exercise_goals.forEach((g) => {
            const key = EXERCISE_KEY_MAP[g.exercise_name];
            if (key) counts[key] = g.daily_target_count ?? g.daily_target_duration ?? 0;
          });
          if (Object.keys(counts).length > 0) {
            localExerciseGoalStorage.save(counts);
            setLocalCounts(counts);
          }
        }
      }).catch(() => {});
    }
  }, []);

  const displayName = profile?.name ?? '';
  const weeklyTarget = profile?.weekly_target ?? goal.weeklyFrequency;

  const getExerciseTarget = (id: string): number =>
    localCounts[id] ?? exerciseCounts[id as keyof typeof exerciseCounts];

  const handleExerciseClick = (exerciseId: string) => {
    if (calibratedExercises[exerciseId]) {
      navigate(`/workout/camera`);
    } else {
      navigate(`/workout/calibration/${exerciseId}`);
    }
};

  const todayProgress: Record<string, number> = {
    squat: 8,
    pushup: 5,
    lunge: 6,
    plank: 20,
  };

  return (
    <div
      className="flex justify-center items-start"
      style={{ minHeight: '100dvh', backgroundColor: '#111111' }}
    >
      <div
        className="flex flex-col"
        style={{
          width: '100%',
          maxWidth: '390px',
          minHeight: '100dvh',
          backgroundColor: '#1A1A1A',
          paddingBottom: 88,
        }}
      >
        <div
          className="flex items-center px-5"
          style={{ paddingTop: 56, paddingBottom: 24 }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 46,
                height: 46,
                backgroundColor: 'rgba(63,253,212,0.12)',
                border: '1.5px solid rgba(63,253,212,0.4)',
                fontSize: 22,
              }}
            >
              🦾
            </div>
            <div>
              <p style={{ color: '#888888', fontSize: 12, marginBottom: 2 }}>AI 트레이너</p>
              <p style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 700 }}>
                {displayName ? `환영합니다, ${displayName}님!` : '환영합니다!'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 mb-5">
          <div
            className="rounded-2xl px-5 py-4 flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, rgba(63,253,212,0.18) 0%, rgba(63,253,212,0.06) 100%)',
              border: '1px solid rgba(63,253,212,0.25)',
            }}
          >
            <div>
              <p style={{ color: '#3FFDD4', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
                오늘의 운동 달성률
              </p>
              <p style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 800 }}>
                50%
                <span style={{ color: '#888888', fontSize: 13, fontWeight: 400, marginLeft: 6 }}>완료</span>
              </p>
              <p style={{ color: '#AAAAAA', fontSize: 12, marginTop: 2 }}>
                4개 운동 중 2개 진행 중
              </p>
            </div>
            <div style={{ position: 'relative', width: 64, height: 64 }}>
              <svg viewBox="0 0 64 64" width="64" height="64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(63,253,212,0.15)" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="26"
                  fill="none"
                  stroke="#3FFDD4"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 26 * 0.5} ${2 * Math.PI * 26 * 0.5}`}
                  strokeDashoffset={2 * Math.PI * 26 * 0.25}
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#3FFDD4', fontSize: 13, fontWeight: 700 }}>50%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 700 }}>운동 시작하기</p>
            <div className="flex items-center gap-1">
              <Zap size={12} color="#3FFDD4" />
              <span style={{ color: '#3FFDD4', fontSize: 11, fontWeight: 600 }}>AI 실시간 분석</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {exercises.map((ex) => {
              const current = todayProgress[ex.id];
              const target = getExerciseTarget(ex.id);
              const pct = Math.min((current / target) * 100, 100);
              return (
                <button
                  key={ex.id}
                  onClick={() => handleExerciseClick(ex.id)}
                  style={{
                    backgroundColor: '#222228',
                    border: '1px solid #2C2C32',
                    borderRadius: 20,
                    padding: '20px 16px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.15s',
                  }}
                  onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                  onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                  onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                  onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: -20, right: -20,
                      width: 70, height: 70,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(63,253,212,0.07)',
                    }}
                  />
                  <img
                    src={ex.img}
                    alt={ex.name}
                    style={{
                      width: 58,
                      height: 58,
                      objectFit: 'contain',
                      marginBottom: 10
                    }}
                  />
                  <p style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{ex.name}</p>
                  <p style={{ color: '#666', fontSize: 11, marginBottom: 12 }}>{ex.desc}</p>
                  <div
                    style={{
                      width: '100%', height: 4, borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`, height: '100%',
                        backgroundColor: '#3FFDD4', borderRadius: 2,
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                  <p style={{ color: '#3FFDD4', fontSize: 11, fontWeight: 600 }}>
                    {current}/{target}{ex.id === 'plank' ? '초' : '개'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 700 }}>이번 주 운동</p>
            <div className="flex items-center gap-1">
              <TrendingUp size={13} color="#3FFDD4" />
              <span style={{ color: '#3FFDD4', fontSize: 12, fontWeight: 600 }}>목표 {weeklyTarget}회</span>
            </div>
          </div>
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: '#222228', border: '1px solid #2C2C32' }}
          >
            <div className="flex justify-between">
              {weeklyData.map(({ day, done }) => (
                <div key={day} className="flex flex-col items-center gap-2">
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      backgroundColor: done ? '#3FFDD4' : 'transparent',
                      border: done ? 'none' : '1.5px solid #3A3A3E',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {done && <span style={{ fontSize: 16 }}>✓</span>}
                  </div>
                  <span style={{ color: done ? '#3FFDD4' : '#666', fontSize: 11, fontWeight: done ? 600 : 400 }}>
                    {day}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #2C2C32' }}>
              <span style={{ color: '#888', fontSize: 12 }}>이번 주 달성</span>
              <span style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: '#3FFDD4' }}>3</span>/{weeklyTarget}회
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 700 }}>획득한 배지</p>
            <div className="flex items-center gap-1">
              <Trophy size={13} color="#FFB830" />
              <span style={{ color: '#FFB830', fontSize: 12, fontWeight: 600 }}>2개 달성</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {badges.map((badge) => (
              <div
                key={badge.label}
                className="flex flex-col items-center gap-2 rounded-2xl py-4"
                style={{
                  backgroundColor: badge.active ? 'rgba(63,253,212,0.08)' : '#222228',
                  border: `1px solid ${badge.active ? 'rgba(63,253,212,0.3)' : '#2C2C32'}`,
                  opacity: badge.active ? 1 : 0.5,
                }}
              >
                <span style={{ fontSize: 24, filter: badge.active ? 'none' : 'grayscale(1)' }}>
                  {badge.icon}
                </span>
                <span style={{ color: badge.active ? '#3FFDD4' : '#666', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 mb-4">
          <div
            className="rounded-2xl px-5 py-4"
            style={{
              background: 'linear-gradient(135deg, #1E2E2A 0%, #1A2420 100%)',
              border: '1px solid rgba(63,253,212,0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 18 }}>🤖</span>
              <span style={{ color: '#3FFDD4', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
                AI PT쌤 한마디
              </span>
            </div>
            <p style={{ color: '#CCCCCC', fontSize: 13, lineHeight: 1.6 }}>
              오늘 스쿼트 자세가 어제보다 <span style={{ color: '#3FFDD4', fontWeight: 700 }}>15% 개선</span>됐어요!
              무릎 각도를 조금 더 신경 써보면 완벽한 자세가 될 것 같아요. 파이팅! 💪
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}