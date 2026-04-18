import { useState, useMemo } from 'react';  // useEffect 제거
import { useNavigate } from 'react-router';
import { GoalLayout } from './components/GoalLayout';
import { ScrollPicker } from './components/ScrollPicker';
import { useGoal } from '../../context/GoalContext';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function padTwo(n: number) {
  return String(n).padStart(2, '0');
}

export function GoalBirthdayPage() {
  const navigate = useNavigate();
  const { goal, updateGoal } = useGoal();

  const [yearNum, setYearNum] = useState(goal.birthday.year);
  const [monthNum, setMonthNum] = useState(goal.birthday.month);
  const [dayNum, setDayNum] = useState(goal.birthday.day);

  const maxDay = getDaysInMonth(yearNum, monthNum);
  const clampedDayNum = Math.min(dayNum, maxDay);

  const yearItems = useMemo(
    () => Array.from({ length: 80 }, (_, i) => `${1940 + i}년`),
    []
  );
  const monthItems = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${i + 1}월`),
    []
  );
  const dayItems = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => `${i + 1}일`),
    [maxDay]
  );

  const yearValue = `${yearNum}년`;
  const monthValue = `${monthNum}월`;
  const dayValue = `${clampedDayNum}일`;

  const handleNext = () => {
    updateGoal({ birthday: { year: yearNum, month: monthNum, day: clampedDayNum } });
    navigate('/goal/body');
  };

  return (
    <GoalLayout step={1} totalSteps={4} onBack={() => navigate('/')}>
      <div className="px-6 pt-4 flex flex-col flex-1">
        <h1
          style={{
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.35,
            marginBottom: 12,
            whiteSpace: 'nowrap',
          }}
        >
          생년월일이 어떻게 되시나요?
        </h1>
        <p style={{ color: '#888888', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          나이는 신체 수준을 파악하여 운동 플랜을 제공하는데
          <br />
          필요해요. 절대 외부에 공개되지 않아요.
        </p>

        {/* Date Display Box */}
        <div
          className="flex items-center justify-center mb-6"
          style={{
            backgroundColor: '#2C2C30',
            borderRadius: 16,
            height: 72,
            border: '1px solid rgba(63,253,212,0.2)',
          }}
        >
          <span style={{ color: '#3FFDD4', fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>
            {yearNum}년&nbsp;{padTwo(monthNum)}월&nbsp;{padTwo(dayNum)}일
          </span>
        </div>

        {/* Scroll Pickers */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#2C2C30', border: '1px solid #3A3A3E' }}
        >
          <div className="flex">
            {/* Year picker */}
            <div style={{ flex: 5 }}>
              <ScrollPicker
                items={yearItems}
                value={yearValue}
                onChange={(v) => setYearNum(parseInt(v))}
              />
            </div>
            {/* Divider */}
            <div style={{ width: 1, backgroundColor: '#3A3A3E', alignSelf: 'stretch' }} />
            {/* Month picker */}
            <div style={{ flex: 3 }}>
              <ScrollPicker
                items={monthItems}
                value={monthValue}
                onChange={(v) => setMonthNum(parseInt(v))}
              />
            </div>
            {/* Divider */}
            <div style={{ width: 1, backgroundColor: '#3A3A3E', alignSelf: 'stretch' }} />
            {/* Day picker */}
            <div style={{ flex: 3 }}>
              <ScrollPicker
                items={dayItems}
                value={dayValue}
                onChange={(v) => setDayNum(parseInt(v))}
              />
            </div>
          </div>
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
          다음
        </button>
      </div>
    </GoalLayout>
  );
}