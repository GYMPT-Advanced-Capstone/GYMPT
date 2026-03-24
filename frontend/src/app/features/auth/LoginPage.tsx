import { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Lock } from 'lucide-react';
import { useGoal } from '../../context/GoalContext';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1603665409265-bdc00027c217?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwZ3ltJTIwZGFyayUyMHRyYWluaW5nfGVufDF8fHx8MTc3NDE3OTQ4M3ww&ixlib=rb-4.1.0&q=80&w=1080';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUserName } = useGoal();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [pwHover, setPwHover] = useState(false);

  const handleLogin = () => {
    setUserName(id.trim() || '박준서');
    navigate('/goal/birthday');
  };

  return (
    <div
      className="flex justify-center items-start"
      style={{ minHeight: '100dvh', backgroundColor: '#111111' }}
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: '100%',
          maxWidth: '390px',
          minHeight: '100dvh',
          backgroundColor: '#1A1A1A',
        }}
      >
        {/* Hero Image */}
        <div className="relative" style={{ height: 300, overflow: 'hidden' }}>
          <img
            src={HERO_IMAGE}
            alt="AI 피트니스 코칭"
            className="w-full h-full object-cover object-top"
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(26,26,26,0.95) 90%, #1A1A1A 100%)',
            }}
          />
          {/* Title text on image */}
          <div className="absolute bottom-2 left-6">
            <h1 style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>
              AI 피트니스 코칭
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 6 }}>
              당신만을 위한 맞춤형 AI 트레이너를 만나보세요
            </p>
          </div>
        </div>

        {/* Form Area */}
        <div className="flex-1 px-6 pt-16 pb-10 flex flex-col">
          {/* ID Input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: '#CCCCCC', fontSize: 14, display: 'block', marginBottom: 8 }}>
              아이디
            </label>
            <div
              className="flex items-center gap-3 px-4"
              style={{
                backgroundColor: '#2C2C30',
                borderRadius: 12,
                height: 54,
                border: '1px solid #3A3A3E',
              }}
            >
              <User size={18} color="#666666" />
              <input
                type="text"
                placeholder="아이디를 입력하세요"
                value={id}
                onChange={(e) => setId(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: 15,
                }}
                className="placeholder-[#555555]"
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: 36 }}>
            <label style={{ color: '#CCCCCC', fontSize: 14, display: 'block', marginBottom: 8 }}>
              비밀번호
            </label>
            <div
              className="flex items-center gap-3 px-4"
              style={{
                backgroundColor: '#2C2C30',
                borderRadius: 12,
                height: 54,
                border: '1px solid #3A3A3E',
              }}
            >
              <Lock size={18} color="#666666" />
              <input
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: 15,
                }}
                className="placeholder-[#555555]"
              />
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
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
              letterSpacing: 1,
            }}
          >
            로그인
          </button>

          {/* 비밀번호를 잊으셨나요? */}
          <div className="flex items-center justify-center mt-5">
            <button
              onClick={() => navigate('/find-password')}
              onMouseEnter={() => setPwHover(true)}
              onMouseLeave={() => setPwHover(false)}
              style={{
                background: 'none',
                border: 'none',
                color: pwHover ? '#3FFDD4' : '#888888',
                cursor: 'pointer',
                fontSize: 13,
                transition: 'color 0.2s',
              }}
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>

          <div className="flex items-center justify-center mt-3" style={{ fontSize: 13 }}>
            <span style={{ color: '#888888' }}>계정이 없으신가요?&nbsp;</span>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#3FFDD4',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 13,
              }}
              onClick={() => navigate('/signup')}
            >
              회원가입
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}