import { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Lock } from 'lucide-react';
import { useGoal } from '../../context/GoalContext';
import { authApi, tokenStorage } from '../../api/authApi';
import { userApi } from '../../api/userApi';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1603665409265-bdc00027c217?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwZ3ltJTIwZGFyayUyMHRyYWluaW5nfGVufDF8fHx8MTc3NDE3OTQ4M3ww&ixlib=rb-4.1.0&q=80&w=1080';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUserName } = useGoal();

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [pwHover, setPwHover] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canLogin = id.trim().length > 0 && password.length > 0 && !isLoading;

  const handleLogin = async () => {
    if (!canLogin) return;
    setLoginError('');
    setIsLoading(true);

    try {
      const res = await authApi.login({ email: id.trim(), pw: password });

      tokenStorage.setTokens(res.access_token, res.refresh_token);

      try {
        const profile = await userApi.getMe();
        tokenStorage.setUserId(profile.id);
        tokenStorage.setUserName(profile.name);
        setUserName(profile.name);
      } catch {
        setUserName(id.trim());
      }

      navigate('/goal/birthday');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '로그인에 실패했어요.';

      if (
        message.toLowerCase().includes('incorrect') ||
        message.toLowerCase().includes('invalid') ||
        message.toLowerCase().includes('not found') ||
        message.includes('401')
      ) {
        setLoginError('아이디 또는 비밀번호가 올바르지 않아요.');
      } else {
        setLoginError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canLogin) handleLogin();
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
        <div className="relative" style={{ height: 300, overflow: 'hidden' }}>
          <img
            src={HERO_IMAGE}
            alt="AI 피트니스 코칭"
            className="w-full h-full object-cover object-top"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(26,26,26,0.95) 90%, #1A1A1A 100%)',
            }}
          />
          <div className="absolute bottom-2 left-6">
            <h1 style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>
              AI 피트니스 코칭
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 6 }}>
              당신만을 위한 맞춤형 AI 트레이너를 만나보세요
            </p>
          </div>
        </div>

        <div className="flex-1 px-6 pt-16 pb-10 flex flex-col">
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
                border: `1px solid ${loginError ? 'rgba(255,80,80,0.4)' : '#3A3A3E'}`,
                transition: 'border-color 0.2s',
              }}
            >
              <User size={18} color="#666666" />
              <input
                type="text"
                placeholder="이메일을 입력하세요"
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  setLoginError('');
                }}
                onKeyDown={handleKeyDown}
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

          <div style={{ marginBottom: loginError ? 12 : 36 }}>
            <label style={{ color: '#CCCCCC', fontSize: 14, display: 'block', marginBottom: 8 }}>
              비밀번호
            </label>
            <div
              className="flex items-center gap-3 px-4"
              style={{
                backgroundColor: '#2C2C30',
                borderRadius: 12,
                height: 54,
                border: `1px solid ${loginError ? 'rgba(255,80,80,0.4)' : '#3A3A3E'}`,
                transition: 'border-color 0.2s',
              }}
            >
              <Lock size={18} color="#666666" />
              <input
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError('');
                }}
                onKeyDown={handleKeyDown}
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

          {loginError && (
            <div
              className="flex items-center gap-2"
              style={{
                marginBottom: 20,
                padding: '10px 14px',
                backgroundColor: 'rgba(255,80,80,0.08)',
                borderRadius: 10,
                border: '1px solid rgba(255,80,80,0.25)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7.5" cy="7.5" r="6.5" stroke="#FF6B6B" strokeWidth="1.4" />
                <path d="M7.5 4.5V8" stroke="#FF6B6B" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="7.5" cy="10.5" r="0.75" fill="#FF6B6B" />
              </svg>
              <p style={{ color: '#FF6B6B', fontSize: 13, lineHeight: 1.4 }}>{loginError}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!canLogin}
            style={{
              width: '100%',
              height: 56,
              backgroundColor: canLogin ? '#3FFDD4' : '#2C2C30',
              borderRadius: 14,
              border: 'none',
              color: canLogin ? '#0A1A16' : '#555555',
              fontSize: 17,
              fontWeight: 700,
              cursor: canLogin ? 'pointer' : 'not-allowed',
              letterSpacing: 1,
              transition: 'background-color 0.2s, color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {isLoading ? (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  style={{ animation: 'spin 0.8s linear infinite' }}
                >
                  <circle
                    cx="9"
                    cy="9"
                    r="7"
                    stroke="#0A1A16"
                    strokeWidth="2"
                    strokeDasharray="30"
                    strokeDashoffset="10"
                    strokeLinecap="round"
                  />
                </svg>
                로그인 중...
              </>
            ) : (
              '로그인'
            )}
          </button>

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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}