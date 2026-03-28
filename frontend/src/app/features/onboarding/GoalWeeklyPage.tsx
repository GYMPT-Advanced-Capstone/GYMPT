import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GoalLayout } from './components/GoalLayout';
import { useGoal } from '../../context/GoalContext';

const weeklyOptions = [
  {
    count: 6,
    label: '6회',
    message: '운동 마니아시군요!\n 최상의 결과를 위해 열심히 달려봐요!',
  },
  {
    count: 5,
    label: '5회',
    message: '정말 열정적이에요!\n 몸의 회복도 함께 챙겨주세요!',
  },
  {
    count: 4,
    label: '4회',
    message: '일주일에 4번이나 운동한다니, 대단해요!\n꾸준히 할 수 있는 플랜을 추천할게요!',
  },
  {
    count: 3,
    label: '3회',
    message: '완벽한 균형이에요!\n 운동과 휴식이 딱 맞아요!',
  },
  {
    count: 2,
    label: '2회',
    message: '좋아요! 규칙적인 운동의 시작이에요!\nGYMPT와 함께 운동해봅시다!',
  },
  {
    count: 1,
    label: '1회',
    message: '첫 걸음이 가장 중요해요!\n 꾸준히 하는 것이 최고예요!',
  },
];

export function GoalWeeklyPage() {
  const navigate = useNavigate();
  const { goal, updateGoal } = useGoal();
  const [selected, setSelected] = useState(goal.weeklyFrequency);

  const handleNext = () => {
    updateGoal({ weeklyFrequency: selected });
    navigate('/goal/exercises');
  };

  return (
    <GoalLayout step={2} totalSteps={3} onBack={() => navigate('/goal/birthday')}>
      <div className="px-6 pt-4 flex flex-col flex-1">
        <h1
          style={{
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.3,
            marginTop: 15,
            marginBottom: 8,
          }}
        >
          일주일에 몇 번 운동하실<br />예정인가요?
        </h1>
        <p style={{ color: '#888888', fontSize: 14, marginBottom: 24 }}>
          언제든지 변경할 수 있어요.
        </p>

        <div className="flex flex-col gap-3">
          {weeklyOptions.map((option) => {
            const isSelected = selected === option.count;
            return (
              <button
                key={option.count}
                onClick={() => setSelected(option.count)}
                style={{
                  width: '100%',
                  backgroundColor: isSelected ? 'rgba(63,253,212,0.08)' : '#2C2C30',
                  border: isSelected ? '1.5px solid #3FFDD4' : '1.5px solid transparent',
                  borderRadius: 14,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    color: isSelected ? '#3FFDD4' : '#FFFFFF',
                    fontSize: 17,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {option.label}
                </div>

                {isSelected && (
                  <div
                    className="flex items-start gap-3 mt-3"
                    style={{ borderTop: '1px solid rgba(63,253,212,0.2)', paddingTop: 12 }}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0 rounded-full"
                      style={{
                        width: 36,
                        height: 36,
                        backgroundColor: '#1A3A32',
                        border: '1.5px solid #3FFDD4',
                        fontSize: 18,
                      }}
                    >
                      🤖
                    </div>
                    <p
                      style={{
                        color: '#3FFDD4',
                        fontSize: 13,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {option.message}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

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
          다음
        </button>
      </div>
    </GoalLayout>
  );
}
