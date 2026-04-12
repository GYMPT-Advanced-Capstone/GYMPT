import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { authApi } from '../../api/authApi';

type Step = 'verify' | 'reset' | 'done';

function Spinner({ color = '#3FFDD4' }: { color?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke={color}
        strokeWidth="1.8"
        strokeDasharray="24"
        strokeDashoffset="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FindPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('verify');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const [sendError, setSendError] = useState('');
  const [resetError, setResetError] = useState('');

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const pwValid = newPw.length >= 8;
  const pwMatch = newPw === confirmPw && confirmPw.length > 0;

  const verifyReady = codeSent && code.trim().length === 6;
  const resetReady = pwValid && pwMatch && !loadingReset;

  const handleSendCode = async () => {
    if (!isEmailValid || loadingSend) return;
    setSendError('');
    setLoadingSend(true);
    setCodeSent(false);
    setCode('');

    try {
      await authApi.requestPasswordReset(email.trim());
      setCodeSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '코드 발송에 실패했어요.';
      if (
        message.toLowerCase().includes('not found') ||
        message.toLowerCase().includes('존재하지')
      ) {
        setSendError('가입되지 않은 이메일이에요. 이메일을 확인해주세요.');
      } else {
        setSendError(message);
      }
    } finally {
      setLoadingSend(false);
    }
  };

  const handleVerify = () => {
    if (!verifyReady) return;
    setResetError('');
    setStep('reset');
  };

  const handleReset = async () => {
    if (!resetReady) return;
    setResetError('');
    setLoadingReset(true);

    try {
      await authApi.resetPassword(email.trim(), code.trim(), newPw);
      setStep('done');
    } catch (err) {
      const message = err instanceof Error ? err.message : '비밀번호 재설정에 실패했어요.';
      if (
        message.toLowerCase().includes('invalid') ||
        message.toLowerCase().includes('expired') ||
        message.toLowerCase().includes('code')
      ) {
        setResetError('인증 코드가 올바르지 않거나 만료되었어요. 처음부터 다시 시도해주세요.');
      } else {
        setResetError(message);
      }
    } finally {
      setLoadingReset(false);
    }
  };

  const handleBack = () => {
    if (step === 'reset') {
      setStep('verify');
      setResetError('');
    } else {
      navigate(-1);
    }
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
        <div
          className="flex items-center px-4"
          style={{ paddingTop: 56, paddingBottom: 20 }}
        >
          <button
            onClick={handleBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginRight: 8 }}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </button>
          <p style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700 }}>비밀번호 찾기</p>
        </div>

        <div className="flex items-center px-6 mb-8 gap-2">
          {(['verify', 'reset', 'done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2" style={{ flex: i < 2 ? 'none' : undefined }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  backgroundColor:
                    step === s
                      ? '#3FFDD4'
                      : (['verify', 'reset', 'done'].indexOf(step) > i)
                      ? 'rgba(63,253,212,0.3)'
                      : '#2C2C30',
                  border:
                    step === s
                      ? 'none'
                      : (['verify', 'reset', 'done'].indexOf(step) > i)
                      ? '1px solid rgba(63,253,212,0.4)'
                      : '1px solid #3A3A3E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      step === s
                        ? '#0A1A16'
                        : (['verify', 'reset', 'done'].indexOf(step) > i)
                        ? '#3FFDD4'
                        : '#555',
                  }}
                >
                  {i + 1}
                </span>
              </div>
              {i < 2 && (
                <div
                  style={{
                    width: 16,
                    height: 1,
                    backgroundColor:
                      ['verify', 'reset', 'done'].indexOf(step) > i
                        ? 'rgba(63,253,212,0.4)'
                        : '#2C2C30',
                    transition: 'background-color 0.3s',
                  }}
                />
              )}
            </div>
          ))}
          <div className="ml-2 flex gap-4">
            {[
              { s: 'verify', label: '이메일 인증' },
              { s: 'reset', label: '비밀번호 재설정' },
              { s: 'done', label: '완료' },
            ].map(({ s, label }) => (
              <span
                key={s}
                style={{
                  fontSize: 11,
                  color: step === s ? '#3FFDD4' : '#555',
                  fontWeight: step === s ? 600 : 400,
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 px-6 flex flex-col">
          {step === 'verify' && (
            <>
              <div
                className="rounded-2xl px-4 py-4 mb-8"
                style={{
                  background: 'rgba(63,253,212,0.07)',
                  border: '1px solid rgba(63,253,212,0.2)',
                }}
              >
                <p style={{ color: '#AAAAAA', fontSize: 11.8, lineHeight: 1.7 }}>
                  가입 시 등록한{' '}
                  <span style={{ color: '#3FFDD4', fontWeight: 600 }}>이메일 주소</span>로
                  인증 코드를 전송해드려요.<br />
                  <span style={{ color: '#3FFDD4', fontWeight: 600 }}>6자리 코드</span>를
                  입력하면 비밀번호를 재설정할 수 있어요.
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#CCCCCC', fontSize: 14, display: 'block', marginBottom: 8 }}>
                  이메일
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
                        email.trim()
                          ? isEmailValid
                            ? 'rgba(63,253,212,0.4)'
                            : 'rgba(255,80,80,0.35)'
                          : '#3A3A3E'
                      }`,
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <Mail size={18} color="#666666" />
                    <input
                      type="email"
                      placeholder="example@gmail.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setCodeSent(false);
                        setCode('');
                        setSendError('');
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
                  </div>
                  <button
                    onClick={handleSendCode}
                    disabled={!isEmailValid || loadingSend}
                    style={{
                      height: 54,
                      paddingLeft: 16,
                      paddingRight: 16,
                      borderRadius: 12,
                      border: `1.5px solid ${isEmailValid ? '#3FFDD4' : '#3A3A3E'}`,
                      backgroundColor: 'transparent',
                      color: isEmailValid ? '#3FFDD4' : '#555555',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: isEmailValid && !loadingSend ? 'pointer' : 'not-allowed',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'color 0.2s, border-color 0.2s',
                    }}
                  >
                    {loadingSend ? <Spinner /> : null}
                    {codeSent ? '재전송' : '인증하기'}
                  </button>
                </div>

                {sendError && (
                  <p style={{ color: '#FF6B6B', fontSize: 12, marginTop: 6 }}>{sendError}</p>
                )}
                {codeSent && !sendError && (
                  <p style={{ color: '#3FFDD4', fontSize: 12, marginTop: 6 }}>
                    ✓ 인증 코드가 이메일로 전송되었어요.
                  </p>
                )}
              </div>

              {codeSent && (
                <div className="flex items-center gap-2" style={{ marginBottom: 32, width: '100%' }}>
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
                      placeholder="인증번호 6자리를 입력해주세요"
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
                    onClick={handleVerify}
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
            </>
          )}

          {step === 'reset' && (
            <>
              <div
                className="rounded-2xl px-4 py-4 mb-8"
                style={{
                  background: 'rgba(63,253,212,0.07)',
                  border: '1px solid rgba(63,253,212,0.2)',
                }}
              >
                <p style={{ color: '#AAAAAA', fontSize: 13, lineHeight: 1.7 }}>
                  새로운 비밀번호를 설정해주세요.{' '}
                  <span style={{ color: '#3FFDD4', fontWeight: 600 }}>8자 이상</span>으로
                  입력해주세요.
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ color: '#CCCCCC', fontSize: 14, display: 'block', marginBottom: 8 }}>
                  새 비밀번호
                </label>
                <div
                  className="flex items-center gap-3 px-4"
                  style={{
                    backgroundColor: '#2C2C30',
                    borderRadius: 12,
                    height: 54,
                    border: `1px solid ${
                      newPw
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
                    type={showNew ? 'text' : 'password'}
                    placeholder="8자 이상 입력하세요"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
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
                    onClick={() => setShowNew(!showNew)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {showNew ? <EyeOff size={18} color="#666666" /> : <Eye size={18} color="#666666" />}
                  </button>
                </div>
                {newPw && !pwValid && (
                  <p style={{ color: '#FF6B6B', fontSize: 12, marginTop: 6 }}>8자 이상 입력해주세요.</p>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
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
                  <Lock size={18} color="#666666" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="비밀번호를 다시 입력하세요"
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
                  <p style={{ color: '#FF6B6B', fontSize: 12, marginTop: 6 }}>비밀번호가 일치하지 않아요.</p>
                )}
                {pwMatch && (
                  <p style={{ color: '#3FFDD4', fontSize: 12, marginTop: 6 }}>✓ 비밀번호가 일치해요.</p>
                )}
              </div>

              {resetError && (
                <div
                  className="flex items-center gap-2"
                  style={{
                    marginBottom: 16,
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
                  <p style={{ color: '#FF6B6B', fontSize: 13, lineHeight: 1.4 }}>{resetError}</p>
                </div>
              )}

              <button
                onClick={handleReset}
                disabled={!resetReady}
                style={{
                  width: '100%',
                  height: 56,
                  backgroundColor: resetReady ? '#3FFDD4' : '#2C2C30',
                  borderRadius: 14,
                  border: 'none',
                  color: resetReady ? '#0A1A16' : '#555555',
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: resetReady ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s, color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {loadingReset ? (
                  <>
                    <Spinner color="#0A1A16" />
                    변경 중...
                  </>
                ) : (
                  '비밀번호 변경'
                )}
              </button>
            </>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 pb-16">
              <div
                className="flex items-center justify-center rounded-full mb-2"
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: 'rgba(63,253,212,0.12)',
                  border: '2px solid rgba(63,253,212,0.4)',
                }}
              >
                <CheckCircle size={40} color="#3FFDD4" />
              </div>
              <p style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 800, textAlign: 'center' }}>
                비밀번호 변경 완료!
              </p>
              <p style={{ color: '#AAAAAA', fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
                새로운 비밀번호로<br />로그인해 주세요.
              </p>
              <button
                onClick={() => navigate('/')}
                style={{
                  marginTop: 16,
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
                로그인하러 가기
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
