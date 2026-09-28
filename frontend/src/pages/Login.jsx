import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { useMouseGlow } from '../lib/useMouseGlow';
import Icon from '../lib/icons';

const EMPTY_FORM = { email: '', password: '', name: '', nickname: '', department: '' };
// 인증 단계: idle(미발송) → sent(인증번호 발송됨) → verified(인증 완료)
const EMPTY_VERIFY = { step: 'idle', code: '', devCode: '', sending: false, confirming: false };

export default function Login() {
  const { login, signup, sendEmailCode, confirmEmailCode, loginDemo, loginDemoAdmin } = useApp();
  const { toast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const heroRef = useMouseGlow();

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verify, setVerify] = useState(EMPTY_VERIFY);
  const [showPassword, setShowPassword] = useState(false);
  const isSignup = mode === 'signup';
  const emailVerified = verify.step === 'verified';

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function switchMode() {
    setMode(isSignup ? 'login' : 'signup');
    setError('');
    setVerify(EMPTY_VERIFY);
  }

  function resetEmail() {
    setVerify(EMPTY_VERIFY);
    setError('');
  }

  async function handleSendCode() {
    if (verify.sending) return;
    setError('');
    setVerify((v) => ({ ...v, sending: true }));
    try {
      const res = await sendEmailCode(form.email);
      setVerify({ ...EMPTY_VERIFY, step: 'sent', devCode: res?.verificationCode || '' });
      toast('학교 이메일로 인증번호를 보냈어요');
    } catch (err) {
      setVerify((v) => ({ ...v, sending: false }));
      setError(err.message || '인증번호를 보내지 못했습니다.');
    }
  }

  async function handleConfirmCode() {
    if (verify.confirming) return;
    setError('');
    setVerify((v) => ({ ...v, confirming: true }));
    try {
      await confirmEmailCode(form.email, verify.code);
      setVerify({ ...EMPTY_VERIFY, step: 'verified' });
      toast('학교 이메일 인증이 완료됐어요');
    } catch (err) {
      setVerify((v) => ({ ...v, confirming: false }));
      setError(err.message || '인증번호를 확인하지 못했습니다.');
    }
  }

  function goBack() {
    navigate(location.state?.from?.pathname || '/', { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (isSignup && !emailVerified) {
      setError('학교 이메일 인증을 먼저 완료해주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const profile = isSignup ? await signup(form) : await login(form);
      toast(isSignup ? `${profile.nickname}님, 가입을 환영해요` : `${profile.nickname}님, 반가워요`);
      // 관리자 계정은 관리자 페이지로, 그 외 회원은 항상 홈 화면으로 보낸다.
      navigate(profile.role === 'ADMIN' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(err.message || '요청을 처리하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDemo(asAdmin) {
    if (asAdmin) loginDemoAdmin();
    else loginDemo();
    toast(asAdmin ? '데모 관리자로 둘러봅니다' : '데모 계정으로 둘러봅니다');
    if (asAdmin) navigate('/admin', { replace: true });
    else goBack();
  }

  return (
    <div className="login-wrap fade-enter">
      <div className="login-hero" ref={heroRef}>
        <div className="lh-inner">
          <div className="h1" style={{ color: '#fff', fontSize: 36, marginTop: 16 }}>
            UNI:VERSE
          </div>
          <div style={{ fontSize: 14.5, opacity: 0.86, marginTop: 12, lineHeight: 1.7, maxWidth: 360 }}>
            우리 학교에서, 더 가벼운 소통 더 안전한 거래
            <br />
            같은 학교, 더 안전하게. 익명은 그대로, 거래는 신뢰있게.
          </div>
        </div>
      </div>
      <div className="login-formside">
        <form className="login-form-inner stack g20" onSubmit={handleSubmit} noValidate>
          <div>
            <div className="h2">{isSignup ? '회원가입' : '로그인'}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              {isSignup
                ? '학교 이메일(예: 학번@mjc.ac.kr)로 인증해야 가입할 수 있어요'
                : '학교 계정으로 로그인하면 커뮤니티와 중고거래를 바로 이용할 수 있어요'}
            </div>
          </div>
          {isSignup ? (
            <div className="field">
              <div className="row g8">
                <input className="input" type="email" autoComplete="email" placeholder="학교 이메일"
                  style={{ flex: 1, minWidth: 0 }} value={form.email} onChange={update('email')}
                  disabled={verify.step !== 'idle'} required />
                {verify.step === 'idle' ? (
                  <button type="button" className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}
                    onClick={handleSendCode} disabled={verify.sending || !form.email.trim()}>
                    {verify.sending ? '발송 중…' : '인증번호 받기'}
                  </button>
                ) : (
                  <button type="button" className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}
                    onClick={resetEmail} disabled={submitting}>
                    이메일 변경
                  </button>
                )}
              </div>
              {verify.step === 'idle' && (
                <div className="faint" style={{ fontSize: 12 }}>네이버·다음·구글 등 일반 메일은 사용할 수 없어요 (학교에서 발급한 메일만 가능)</div>
              )}
              {emailVerified && <span className="chip verified" style={{ alignSelf: 'flex-start' }}>✓ 학교 이메일 인증 완료</span>}
            </div>
          ) : (
            <div className="field">
              <input className="input" type="email" autoComplete="email" placeholder="이메일"
                value={form.email} onChange={update('email')} required />
            </div>
          )}
          {isSignup && verify.step === 'sent' && (
            <div className="field">
              <div className="row g8">
                <input className="input" inputMode="numeric" autoComplete="one-time-code" placeholder="인증번호 6자리"
                  maxLength={6} style={{ flex: 1, minWidth: 0 }} value={verify.code}
                  onChange={(e) => setVerify((v) => ({ ...v, code: e.target.value.replace(/\D/g, '') }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirmCode(); } }} />
                <button type="button" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}
                  onClick={handleConfirmCode} disabled={verify.confirming || verify.code.length !== 6}>
                  {verify.confirming ? '확인 중…' : '확인'}
                </button>
              </div>
              <div className="row g8 faint" style={{ fontSize: 12 }}>
                <span>인증번호는 5분간 유효해요.</span>
                <button type="button" className="link" style={{ fontSize: 12 }} onClick={handleSendCode} disabled={verify.sending}>
                  다시 받기
                </button>
              </div>
              {verify.devCode && (
                <div className="faint" style={{ fontSize: 12 }}>[개발용] 메일 서버 미설정 — 인증번호: <b>{verify.devCode}</b></div>
              )}
            </div>
          )}
          <div className="field">
            <div className="pw-field">
              <input className="input" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder={isSignup ? '비밀번호 (8자 이상)' : '비밀번호'} value={form.password} onChange={update('password')} required />
              <button type="button" className="pw-toggle" onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'} aria-pressed={showPassword}>
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          </div>
          {isSignup && (
            <>
              <div className="field">
                <input className="input" autoComplete="name" placeholder="이름" maxLength={50}
                  value={form.name} onChange={update('name')} required />
              </div>
              <div className="field">
                <input className="input" autoComplete="nickname" placeholder="닉네임" maxLength={50}
                  value={form.nickname} onChange={update('nickname')} required />
              </div>
              <div className="field">
                <input className="input" placeholder="학과 (예: 컴퓨터공학과)" maxLength={100}
                  value={form.department} onChange={update('department')} required />
              </div>
            </>
          )}
          {error && <div className="login-error" role="alert">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={submitting || (isSignup && !emailVerified)}>
            {submitting ? '처리 중…' : isSignup ? '가입하기' : '로그인'}
          </button>
          <button type="button" className="btn btn-outline btn-full" onClick={switchMode} disabled={submitting}>
            {isSignup ? '이미 계정이 있어요' : '이메일로 회원가입'}
          </button>
          {import.meta.env.DEV && (
            <div className="row g10" style={{ justifyContent: 'center' }}>
              <button type="button" className="link" onClick={() => handleDemo(false)}>데모로 둘러보기</button>
              <span className="faint" style={{ fontSize: 12 }}>·</span>
              <button type="button" className="link" onClick={() => handleDemo(true)}>데모 관리자</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
