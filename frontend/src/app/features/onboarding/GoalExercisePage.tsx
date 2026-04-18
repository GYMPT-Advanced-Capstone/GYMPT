import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Minus, Plus } from 'lucide-react';
import { GoalLayout } from './components/GoalLayout';
import { useGoal } from '../../context/GoalContext';
import { localExerciseGoalStorage } from '../../api/userApi';

type ExerciseId = 'squat' | 'lunge' | 'pushup' | 'plank';

const exerciseData: Record<
  ExerciseId,
  {
    name: string;
    unit: string;
    nextPath: string;
    prevPath: string;
    image: string;
    description: string;
    min: number;
    max: number;
    stepSize: number;
    defaultCount: number;
    tip: string;
  }
> = {
  squat: {
    name: '스쿼트',
    unit: '개',
    nextPath: '/goal/exercise/lunge',
    prevPath: '/goal/weekly',
    image:
      'https://images.unsplash.com/photo-1770513649465-2c60c8039806?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcXVhdCUyMGV4ZXJjaXNlJTIwZml0bmVzcyUyMGRhcmt8ZW58MXx8fHwxNzczNTc0MTUzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    description: '하체 근력의 기본! 무릎과 허벅지를 집중 단련해요.',
    min: 5,
    max: 100,
    stepSize: 1,
    defaultCount: 15,
    tip: '무릎이 발끝을 넘지 않도록 주의해요.',
  },
  lunge: {
    name: '런지',
    unit: '개',
    nextPath: '/goal/exercise/pushup',
    prevPath: '/goal/exercise/squat',
    image:
      'https://images.unsplash.com/photo-1700784795176-7ff886439d79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdW5nZSUyMGV4ZXJjaXNlJTIwZml0bmVzcyUyMGRhcmslMjBiYWNrZ3JvdW5kfGVufDF8fHx8MTc3MzU3NDE1N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    description: '균형감각과 하체 근육을 동시에 키워요.',
    min: 5,
    max: 60,
    stepSize: 1,
    defaultCount: 12,
    tip: '앞무릎이 90도를 유지하도록 해요.',
  },
  pushup: {
    name: '푸시업',
    unit: '개',
    nextPath: '/goal/exercise/plank',
    prevPath: '/goal/exercise/lunge',
    image:
      'https://images.unsplash.com/photo-1676655079738-af54dfd6318e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwdXNodXAlMjBtYW4lMjBneW0lMjBkYXJrfGVufDF8fHx8MTc3MzU3NDE2MHww&ixlib=rb-4.1.0&q=80&w=1080',
    description: '상체 근력의 핵심! 가슴, 어깨, 삼두를 단련해요.',
    min: 3,
    max: 80,
    stepSize: 1,
    defaultCount: 10,
    tip: '몸통을 일직선으로 유지하며 내려가요.',
  },
  plank: {
    name: '플랭크',
    unit: '초',
    nextPath: '/goal/ready',
    prevPath: '/goal/exercise/pushup',
    image:
      'https://images.unsplash.com/photo-1765302741884-e846c7a178df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGFuayUyMGNvcmUlMjB3b3Jrb3V0JTIwZXhlcmNpc2V8ZW58MXx8fHwxNzczNTc0MTYwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    description: '코어 근육 강화! 전신 안정성을 높여줘요.',
    min: 10,
    max: 300,
    stepSize: 5,
    defaultCount: 30,
    tip: '허리가 처지지 않도록 복부에 힘을 줘요.',
  },
};

export function GoalExercisePage() {
  const navigate = useNavigate();
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const { goal, updateGoal } = useGoal();

  const id = (exerciseId as ExerciseId) || 'squat';
  const exercise = exerciseData[id];

  const [count, setCount] = useState(
    goal.exerciseCounts[id] || exercise.defaultCount
  );

  if (!exercise) {
    navigate('/goal/exercise/squat');
    return null;
  }

  const handleDecrease = () => {
    setCount((prev) => Math.max(exercise.min, prev - exercise.stepSize));
  };

  const handleIncrease = () => {
    setCount((prev) => Math.min(exercise.max, prev + exercise.stepSize));
  };

  const handleNext = () => {
    const updatedCounts = {
      ...goal.exerciseCounts,
      [id]: count,
    };
    updateGoal({ exerciseCounts: updatedCounts });

    // 마지막 운동(플랭크)일 때 localStorage에 전체 저장
    if (id === 'plank') {
      localExerciseGoalStorage.save(updatedCounts);
    }

    navigate(exercise.nextPath);
  };

  return (
    <GoalLayout step={4} totalSteps={4} onBack={() => navigate(exercise.prevPath)}>
      <div className="px-6 pt-2 flex flex-col flex-1">
        <h1
          style={{
            color: '#FFFFFF',
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.35,
            marginBottom: 6,
          }}
        >
          {exercise.name} 목표 횟수를{'\n'}정해볼까요?
        </h1>
        <p style={{ color: '#888888', fontSize: 13, marginBottom: 20 }}>
          {exercise.description}
        </p>

        {/* Exercise Image */}
        <div
          className="relative overflow-hidden mx-auto"
          style={{
            width: '100%',
            maxWidth: 320,
            height: 240,
            borderRadius: 20,
            border: '1px solid #3A3A3E',
            backgroundColor: '#0F0F0F',
          }}
        >
          <img
            src={exercise.image}
            alt={exercise.name}
            className="w-full h-full object-cover object-center"
          />
          {/* Overlay gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, transparent 50%, rgba(10,10,10,0.8) 100%)',
            }}
          />
          {/* Exercise name badge */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div
              style={{
                backgroundColor: 'rgba(63,253,212,0.15)',
                border: '1px solid rgba(63,253,212,0.4)',
                borderRadius: 20,
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: 6,
                paddingBottom: 6,
              }}
            >
              <span style={{ color: '#3FFDD4', fontSize: 15, fontWeight: 600 }}>
                {exercise.name}
              </span>
            </div>
          </div>
        </div>

        {/* Count Selector */}
        <div
          className="flex items-center justify-between mt-8 px-6"
          style={{
            backgroundColor: '#2C2C30',
            borderRadius: 18,
            height: 90,
            border: '1px solid #3A3A3E',
          }}
        >
          {/* Decrease button */}
          <button
            onClick={handleDecrease}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: count <= exercise.min ? '#222226' : '#3A3A3E',
              border: 'none',
              cursor: count <= exercise.min ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: count <= exercise.min ? '#444444' : '#FFFFFF',
              transition: 'all 0.2s',
            }}
          >
            <Minus size={20} />
          </button>

          {/* Count Display */}
          <div className="flex flex-col items-center">
            <span
              style={{
                color: '#3FFDD4',
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {count}
            </span>
            <span style={{ color: '#888888', fontSize: 14, marginTop: 4 }}>
              {exercise.unit}
            </span>
          </div>

          {/* Increase button */}
          <button
            onClick={handleIncrease}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: count >= exercise.max ? '#222226' : '#3A3A3E',
              border: 'none',
              cursor: count >= exercise.max ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: count >= exercise.max ? '#444444' : '#FFFFFF',
              transition: 'all 0.2s',
            }}
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Tip */}
        <div
          className="flex items-start gap-3 mt-4 px-4 py-3 rounded-xl"
          style={{ backgroundColor: 'rgba(63,253,212,0.06)', border: '1px solid rgba(63,253,212,0.15)' }}
        >
          <span style={{ fontSize: 16 }}>💡</span>
          <p style={{ color: '#3FFDD4', fontSize: 12, lineHeight: 1.5, opacity: 0.85 }}>
            {exercise.tip}
          </p>
        </div>

        <div style={{ flex: 1 }} />
      </div>

      {/* Next Button */}
      <div className="px-6 pb-10 pt-6">
        <button
          onClick={handleNext}
          style={{
            width: '100%',
            height: 56,
            backgroundColor: '#3FFDD4',
            borderRadius: 14,
            border: 'none',
            color: '#0A1A16',
            fontSize: 17,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {id === 'plank' ? '시작하기' : '다음'}
        </button>
      </div>
    </GoalLayout>
  );
}