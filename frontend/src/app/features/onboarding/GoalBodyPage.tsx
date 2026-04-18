import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GoalLayout } from './components/GoalLayout';
import { ScrollPicker } from './components/ScrollPicker';
import { bodyStorage } from '../../api/userApi';

const HEIGHT_ITEMS = Array.from({ length: 121 }, (_, i) => `${100 + i}cm`);
const WEIGHT_ITEMS = Array.from({ length: 171 }, (_, i) => `${30 + i}kg`);

export function GoalBodyPage() {
  const navigate = useNavigate();
  const saved = bodyStorage.load();
  const [heightNum, setHeightNum] = useState(saved?.height ?? 170);
  const [weightNum, setWeightNum] = useState(saved?.weight ?? 65);

  const handleNext = () => {
    bodyStorage.save({ height: heightNum, weight: weightNum });
    navigate('/goal/weekly');
  };

  return (
    <GoalLayout step={2} totalSteps={4} onBack={() => navigate('/goal/birthday')}>
      <div className="px-6 pt-4 flex flex-col flex-1">
        <h1
          style={{
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.35,
            marginBottom: 12,
          }}
        >
          키와 몸무게를 알려주세요
        </h1>
        <p style={{ color: '#888888', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          더 정확한 운동 플랜 제공을 위해 사용돼요.
          <br />
          절대 외부에 공개되지 않아요.
        </p>

        <div
          className="flex items-center justify-center gap-8 mb-6"
          style={{
            backgroundColor: '#2C2C30',
            borderRadius: 16,
            height: 72,
            border: '1px solid rgba(63,253,212,0.2)',
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span style={{ color: '#888888', fontSize: 11 }}>키</span>
            <span style={{ color: '#3FFDD4', fontSize: 24, fontWeight: 700, letterSpacing: 0.5 }}>
              {heightNum}cm
            </span>
          </div>
          <div style={{ width: 1, height: 36, backgroundColor: '#3A3A3E' }} />
          <div className="flex flex-col items-center gap-0.5">
            <span style={{ color: '#888888', fontSize: 11 }}>몸무게</span>
            <span style={{ color: '#3FFDD4', fontSize: 24, fontWeight: 700, letterSpacing: 0.5 }}>
              {weightNum}kg
            </span>
          </div>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#2C2C30', border: '1px solid #3A3A3E' }}
        >
          <div className="flex">
            <div style={{ flex: 1 }}>
              <div
                className="flex items-center justify-center"
                style={{ height: 36, borderBottom: '1px solid #3A3A3E' }}
              >
                <span style={{ color: '#888888', fontSize: 12 }}>키</span>
              </div>
              <ScrollPicker
                items={HEIGHT_ITEMS}
                value={`${heightNum}cm`}
                onChange={(v) => setHeightNum(parseInt(v))}
              />
            </div>
            <div style={{ width: 1, backgroundColor: '#3A3A3E', alignSelf: 'stretch' }} />
            <div style={{ flex: 1 }}>
              <div
                className="flex items-center justify-center"
                style={{ height: 36, borderBottom: '1px solid #3A3A3E' }}
              >
                <span style={{ color: '#888888', fontSize: 12 }}>몸무게</span>
              </div>
              <ScrollPicker
                items={WEIGHT_ITEMS}
                value={`${weightNum}kg`}
                onChange={(v) => setWeightNum(parseInt(v))}
              />
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />
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
