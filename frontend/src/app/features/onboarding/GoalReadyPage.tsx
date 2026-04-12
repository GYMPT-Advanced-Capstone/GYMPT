import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGoal } from '../../context/GoalContext';
import { userApi, goalIdStorage, formatBirthDateForApi } from '../../api/userApi';
import { exerciseApi } from '../../api/exerciseApi';

const EXERCISE_NAME_MAP: Record<string, string> = {
  squat: '스쿼트',
  lunge: '런지',
  pushup: '푸시업',
  plank: '플랭크',
};

const DURATION_EXERCISES = new Set(['plank']);

function TrainerCharacter() {
  return (
    <svg
      viewBox="0 0 220 320"
      width="220"
      height="320"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 8px 40px rgba(63,253,212,0.25))' }}
    >
      <ellipse cx="110" cy="305" rx="60" ry="10" fill="rgba(63,253,212,0.15)" />
      <rect x="78" y="220" width="24" height="60" rx="12" fill="#2ECBA8" />
      <rect x="118" y="220" width="24" height="60" rx="12" fill="#2ECBA8" />
      <ellipse cx="90" cy="280" rx="16" ry="8" fill="#1A8A70" />
      <ellipse cx="130" cy="280" rx="16" ry="8" fill="#1A8A70" />
      <rect x="68" y="135" width="84" height="95" rx="20" fill="#3FFDD4" />
      <polygon points="110,148 98,165 122,165" fill="#2ECBA8" />
      <rect x="68" y="210" width="84" height="14" rx="4" fill="#1A8A70" />
      <rect x="104" y="211" width="12" height="12" rx="3" fill="#3FFDD4" />
      <rect x="30" y="138" width="22" height="65" rx="11" fill="#3FFDD4" />
      <circle cx="41" cy="208" r="11" fill="#3FFDD4" />
      <rect x="10" y="185" width="44" height="56" rx="5" fill="#E8FFF9" stroke="#2ECBA8" strokeWidth="2" />
      <rect x="25" y="180" width="14" height="10" rx="3" fill="#2ECBA8" />
      <line x1="18" y1="202" x2="46" y2="202" stroke="#2ECBA8" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="212" x2="46" y2="212" stroke="#2ECBA8" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="222" x2="38" y2="222" stroke="#2ECBA8" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="232" x2="42" y2="232" stroke="#2ECBA8" strokeWidth="2" strokeLinecap="round" />
      <polyline points="18,215 22,220 30,208" stroke="#3FFDD4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="168" y="120" width="22" height="65" rx="11" fill="#3FFDD4" transform="rotate(-25 179 152)" />
      <circle cx="182" cy="112" r="11" fill="#3FFDD4" />
      <rect x="179" y="95" width="6" height="18" rx="3" fill="#E8FFF9" />
      <rect x="101" y="118" width="18" height="22" rx="9" fill="#3FFDD4" />
      <ellipse cx="110" cy="100" rx="38" ry="42" fill="#3FFDD4" />
      <ellipse cx="110" cy="62" rx="38" ry="16" fill="#1A8A70" />
      <rect x="72" y="62" width="76" height="16" rx="0" fill="#1A8A70" />
      <path d="M72,68 Q90,55 110,58 Q130,55 148,68" stroke="#0D5E4A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="97" cy="100" rx="6" ry="7" fill="white" />
      <ellipse cx="123" cy="100" rx="6" ry="7" fill="white" />
      <circle cx="98" cy="101" r="3.5" fill="#0D2E25" />
      <circle cx="124" cy="101" r="3.5" fill="#0D2E25" />
      <circle cx="99.5" cy="99.5" r="1.2" fill="white" />
      <circle cx="125.5" cy="99.5" r="1.2" fill="white" />
      <path d="M91,91 Q97,87 103,91" stroke="#0D5E4A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M117,91 Q123,87 129,91" stroke="#0D5E4A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M98,113 Q110,123 122,113" stroke="#0D5E4A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="88" cy="110" rx="7" ry="4" fill="rgba(255,180,180,0.35)" />
      <ellipse cx="132" cy="110" rx="7" ry="4" fill="rgba(255,180,180,0.35)" />
      <rect x="92" y="168" width="36" height="18" rx="6" fill="#0D5E4A" />
      <text x="110" y="181" textAnchor="middle" fill="#3FFDD4" fontSize="9" fontWeight="bold">AI</text>
      <g fill="#3FFDD4" opacity="0.9">
        <polygon points="196,50 198,57 205,57 199,61 201,68 196,64 191,68 193,61 187,57 194,57" transform="scale(0.6) translate(130,30)" />
        <polygon points="196,50 198,57 205,57 199,61 201,68 196,64 191,68 193,61 187,57 194,57" transform="scale(0.4) translate(-30,100)" />
      </g>
    </svg>
  );
}

export function GoalReadyPage() {
  const navigate = useNavigate();
  const { goal } = useGoal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.allSettled([
        userApi.updateBirthDate(formatBirthDateForApi(goal.birthday)),
        userApi.updateWeeklyTarget(goal.weeklyFrequency),
      ]);

      const exercises = await exerciseApi.getList();
      const nameToId = Object.fromEntries(exercises.map((e) => [e.name, e.id]));

      for (const [key, count] of Object.entries(goal.exerciseCounts)) {
        const koreanName = EXERCISE_NAME_MAP[key];
        if (!koreanName) continue;
        const exerciseId = nameToId[koreanName];
        if (!exerciseId) continue;

        const isDuration = DURATION_EXERCISES.has(key);
        const data = isDuration
          ? { exercise_id: exerciseId, daily_target_duration: count }
          : { exercise_id: exerciseId, daily_target_count: count };

        try {
          const result = await userApi.createExerciseGoal(data);
          goalIdStorage.set(exerciseId, result.id);
        } catch {
        }
      }

      navigate('/main');
    } catch {
      setError('목표 저장 중 오류가 발생했어요. 다시 시도해주세요.');
      setLoading(false);
    }
  };

  return (
    <div
      className="flex justify-center items-start"
      style={{ minHeight: '100dvh', backgroundColor: '#111111' }}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: '100%',
          maxWidth: '390px',
          minHeight: '100dvh',
          backgroundColor: '#1A1A1A',
        }}
      >
        <div className="px-6 pt-28 pb-0">
          <p
            style={{
              color: '#3FFDD4',
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.45,
              marginBottom: 10,
            }}
          >
            목표 설정 완료!
          </p>
          <p
            style={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1.45,
              whiteSpace: 'pre-line',
            }}
          >
            {'AI 트레이너의 실시간 운동\n자세 분석부터 상세한 가이드까지.\n이번에는 분명 운동 목표를\n달성할 수 있을 거예요!'}
          </p>
        </div>

        <div
          className="flex-1 flex items-center justify-center"
          style={{ paddingTop: 8, paddingBottom: 16 }}
        >
          <TrainerCharacter />
        </div>

        <div className="px-6 pb-12">
          {error && (
            <p
              style={{
                color: '#FF5A5A',
                fontSize: 13,
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              {error}
            </p>
          )}
          <button
            onClick={handleStart}
            disabled={loading}
            style={{
              width: '100%',
              height: 58,
              backgroundColor: loading ? '#2C6B5E' : '#3FFDD4',
              borderRadius: 16,
              border: 'none',
              color: '#0A1A16',
              fontSize: 18,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    border: '2px solid #0A1A16',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                저장 중...
              </>
            ) : (
              '기대돼요!'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
