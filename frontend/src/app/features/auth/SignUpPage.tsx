import { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Mail, Lock, Eye, EyeOff, RefreshCw, Hash } from 'lucide-react';
import { useGoal } from '../../context/GoalContext';

export function SignUpPage() {
  const navigate = useNavigate();
  const { setUserName } = useGoal();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const pwValid = password.length >= 8;
  const pwMatch = password === confirmPw && confirmPw.length > 0;
  const verifyReady = codeSent && code.trim().length === 6;

  const canSubmit =
    name.trim().length > 0 &&
    nickname.trim().length > 0 &&
    emailVerified &&
    pwValid &&
    pwMatch &&
    agreed;

  const handleSendCode = () => {
    // 이 부분 추후 백엔드 API 연결 시 이메일로 인증 코드 발송 구현
    setCodeSent(true);
    setCode('');
    setEmailVerified(false);
  };

  const handleVerifyCode = () => {
    // 이 부분 추후 백엔드 API 연결 시 코드 검증
    setEmailVerified(true);
  };

  const handleSignUp = () => {
    // 이 부분 추후 백엔드 API 연결 시 아래 localStorage 로직을 API 호출로 교체
    localStorage.setItem('registered_email', email.trim());
    localStorage.setItem('registered_password', password);
    localStorage.setItem('registered_name', name.trim());
    setUserName(name.trim());
    navigate('/');
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
        }}
      >
        <div style={{ paddingLeft: 24, paddingTop: 56, paddingBottom: 36 }}>
          <h1
            style={{
              color: '#FFFFFF',
              fontSize: 30,
              fontWeight: 800,
              lineHeight: 1.25,
              marginBottom: 10,
            }}
          >
            건강한 미래와<br />함께하세요
          </h1>
          <p style={{ color: '#888888', fontSize: 14 }}>
            AI 코칭과 함께 맞춤형 운동을 시작해보세요.
          </p>
        </div>

        <div className="flex-1 px-6 flex flex-col">

          <div style={{ marginBottom: 18 }}>
            <label style={{ color: '#CCCCCC', fontSize: 14, display: 'block', marginBottom: 8 }}>
              이름
            </label>
            <div
              className="flex items-center gap-3 px-4"
              style={{
                backgroundColor: '#2C2C30',
                borderRadius: 12,
                height: 54,
                border: `1px solid ${name.trim() ? 'rgba(63,253,212,0.4)' : '#3A3A3E'}`,
                transition: 'border-color 0.2s',
              }}
            >
              <User size={18} color="#666666" />
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
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

          <div style={{ marginBottom: 18 }}>
            <label style={{ color: '#CCCCCC', fontSize: 14, display: 'block', marginBottom: 8 }}>
              닉네임
              <span style={{ color: '#555555', fontSize: 12, marginLeft: 6 }}>커뮤니티에서 사용될 이름이에요</span>
            </label>
            <div
              className="flex items-center gap-3 px-4"
              style={{
                backgroundColor: '#2C2C30',
                borderRadius: 12,
                height: 54,
                border: `1px solid ${nickname.trim() ? 'rgba(63,253,212,0.4)' : '#3A3A3E'}`,
                transition: 'border-color 0.2s',
              }}
            >
              <Hash size={18} color="#666666" />
              <input
                type="text"
                placeholder="닉네임을 입력하세요"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
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

          <div style={{ marginBottom: 18 }}>
            <label style={{ color: '#CCCCCC', fontSize: 14, display: 'block', marginBottom: 8 }}>
              아이디
            </label>

            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-3 px-4"
                style={{
                  flex: 1,
                  backgroundColor: '#2C2C30',
                  borderRadius: 12,
                  height: 54,
                  border: `1px solid ${
                    emailVerified
                      ? 'rgba(63,253,212,0.4)'
                      : email.trim()
                      ? isEmailValid
                        ? 'rgba(63,253,212,0.25)'
                        : 'rgba(255,80,80,0.4)'
                      : '#3A3A3E'
                  }`,
                  transition: 'border-color 0.2s',
                  opacity: emailVerified ? 0.6 : 1,
                }}
              >
                <Mail size={18} color="#666666" />
                <input
                  type="email"
                  placeholder="이메일을 입력하세요"
                  value={email}
                  readOnly={emailVerified}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setCodeSent(false);
                    setCode('');
                    setEmailVerified(false);
                  }}
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
                {emailVerified && (
                  <span style={{ color: '#3FFDD4', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>✓ 인증됨</span>
                )}
              </div>
              {!emailVerified && (
                <button
                  onClick={handleSendCode}
                  disabled={!isEmailValid}
                  style={{
                    height: 54,
                    paddingLeft: 14,
                    paddingRight: 14,
                    borderRadius: 12,
                    border: `1.5px solid ${isEmailValid ? '#3FFDD4' : '#3A3A3E'}`,
                    backgroundColor: 'transparent',
                    color: isEmailValid ? '#3FFDD4' : '#555555',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isEmailValid ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.2s, border-color 0.2s',
                  }}
                >
                  {codeSent ? '재전송' : '인증하기'}
                </button>
              )}
            </div>

            {email.trim() && !isEmailValid && (
              <p style={{ color: '#FF6B6B', fontSize: 12, marginTop: 5 }}>
                올바른 이메일 형식을 입력해주세요.
              </p>
            )}
            {codeSent && !emailVerified && (
              <p style={{ color: '#3FFDD4', fontSize: 12, marginTop: 6 }}>
                ✓ 인증 코드가 이메일로 전송되었어요.
              </p>
            )}

            {codeSent && !emailVerified && (
              <div className="flex items-center gap-2" style={{ marginTop: 10, width: '100%' }}>
                <div
                  className="flex items-center gap-3 px-4"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    backgroundColor: '#2C2C30',
                    borderRadius: 12,
                    height: 54,
                    border: `1px solid ${code.trim() ? 'rgba(63,253,212,0.4)' : '#3A3A3E'}`,
                    transition: 'border-color 0.2s',
                  }}
                >
                  <input
                    type="text"
                    placeholder="인증번호 6자리"
                    value={code}
                    maxLength={6}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#FFFFFF',
                      fontSize: 15,
                      letterSpacing: code ? 4 : 0,
                    }}
                    className="placeholder-[#555555]"
                  />
                  {code.length === 6 && (
                    <span style={{ color: '#3FFDD4', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>✓</span>
                  )}
                </div>
                <button
                  onClick={handleVerifyCode}
                  disabled={!verifyReady}
                  style={{
                    flexShrink: 0,
                    width: 80,
                    height: 54,
                    borderRadius: 12,
                    border: `1.5px solid ${verifyReady ? '#3FFDD4' : '#3A3A3E'}`,
                    backgroundColor: 'transparent',
                    color: verifyReady ? '#3FFDD4' : '#555555',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: verifyReady ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.2s, border-color 0.2s',
                  }}
                >
                  인증 확인
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ color: '#CCCCCC', fontSize: 14, display: 'block', marginBottom: 8 }}>
              비밀번호
            </label>
            <div
              className="flex items-center gap-3 px-4"
              style={{
                backgroundColor: '#2C2C30',
                borderRadius: 12,
                height: 54,
                border: `1px solid ${
                  password
                    ? pwValid
                      ? 'rgba(63,253,212,0.4)'
                      : 'rgba(255,80,80,0.4)'
                    : '#3A3A3E'
                }`,
                transition: 'border-color 0.2s',
              }}
            >
              <Lock size={18} color="#666666" />
              <input
                type={showPw ? 'text' : 'password'}
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
              <button
                onClick={() => setShowPw(!showPw)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showPw
                  ? <EyeOff size={18} color="#666666" />
                  : <Eye size={18} color="#666666" />}
              </button>
            </div>
            {password && !pwValid && (
              <p style={{ color: '#FF6B6B', fontSize: 12, marginTop: 5 }}>
                8자 이상 입력해주세요.
              </p>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ color: '#CCCCCC', fontSize: 14, display: 'block', marginBottom: 8 }}>
              비밀번호 확인
            </label>
            <div
              className="flex items-center gap-3 px-4"
              style={{
                backgroundColor: '#2C2C30',
                borderRadius: 12,
                height: 54,
                border: `1px solid ${
                  confirmPw
                    ? pwMatch
                      ? 'rgba(63,253,212,0.4)'
                      : 'rgba(255,80,80,0.4)'
                    : '#3A3A3E'
                }`,
                transition: 'border-color 0.2s',
              }}
            >
              <RefreshCw size={18} color="#666666" />
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="다시 한번 입력하세요"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
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
              <button
                onClick={() => setShowConfirm(!showConfirm)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showConfirm
                  ? <EyeOff size={18} color="#666666" />
                  : <Eye size={18} color="#666666" />}
              </button>
            </div>
            {confirmPw && !pwMatch && (
              <p style={{ color: '#FF6B6B', fontSize: 12, marginTop: 5 }}>
                비밀번호가 일치하지 않아요.
              </p>
            )}
            {pwMatch && (
              <p style={{ color: '#3FFDD4', fontSize: 12, marginTop: 5 }}>
                ✓ 비밀번호가 일치해요.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3" style={{ marginBottom: 28 }}>
            <button
              onClick={() => setAgreed(!agreed)}
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                border: `1.5px solid ${agreed ? '#3FFDD4' : '#555555'}`,
                backgroundColor: agreed ? '#3FFDD4' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background-color 0.2s, border-color 0.2s',
              }}
            >
              {agreed && (
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path d="M1 4L4 7.5L10 1" stroke="#0A1A16" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <p style={{ color: '#888888', fontSize: 13, lineHeight: 1.5 }}>
              <span style={{ color: '#3FFDD4', cursor: 'pointer', textDecoration: 'underline' }}>
                이용약관
              </span>
              {' '}및{' '}
              <span style={{ color: '#3FFDD4', cursor: 'pointer', textDecoration: 'underline' }}>
                개인정보 처리방침
              </span>
              에 동의합니다.
            </p>
          </div>

          <button
            onClick={handleSignUp}
            disabled={!canSubmit}
            style={{
              width: '100%',
              height: 56,
              backgroundColor: canSubmit ? '#3FFDD4' : '#2C2C30',
              borderRadius: 14,
              border: 'none',
              color: canSubmit ? '#0A1A16' : '#555555',
              fontSize: 17,
              fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s, color 0.2s',
              marginBottom: 24,
            }}
          >
            계정 만들기
          </button>

          <div className="flex items-center justify-center pb-10" style={{ fontSize: 13 }}>
            <span style={{ color: '#888888' }}>이미 계정이 있으신가요?&nbsp;</span>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#3FFDD4',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              로그인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}