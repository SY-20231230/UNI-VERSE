import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import Icon from '../lib/icons';

const EMPTY_FORM = { email: '', password: '', name: '', nickname: '', department: '', universityName: '' };
// 인증 단계: idle(미발송) → sent(인증번호 발송됨) → verified(인증 완료)
const EMPTY_VERIFY = { step: 'idle', code: '', devCode: '', sending: false, confirming: false };

export default function Login() {
  const { login, signup, sendEmailCode, confirmEmailCode, loginDemo, loginDemoAdmin } = useApp();
  const { toast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verify, setVerify] = useState(EMPTY_VERIFY);
  const [showPassword, setShowPassword] = useState(false);
  // 회원가입은 1단계(학교 인증) → 2단계(계정 정보)로 나눠 한 화면이 길어지지 않게 한다.
  const [signupStep, setSignupStep] = useState(1);
  const isSignup = mode === 'signup';
  const emailVerified = verify.step === 'verified';

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function switchMode() {
    setMode(isSignup ? 'login' : 'signup');
    // 로그인에 입력하던 값이 회원가입 칸(학교 이메일 등)으로 이어지지 않게 비운다.
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setError('');
    setVerify(EMPTY_VERIFY);
    setSignupStep(1);
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

  function goNextStep() {
    if (!form.universityName.trim()) {
      setError('대학교명을 입력해주세요.');
      return;
    }
    if (!form.department.trim()) {
      setError('학과를 입력해주세요.');
      return;
    }
    if (!emailVerified) {
      setError('학교 이메일 인증을 먼저 완료해주세요.');
      return;
    }
    setError('');
    setSignupStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (isSignup && signupStep === 1) {
      goNextStep();
      return;
    }
    if (isSignup && !form.universityName.trim()) {
      setError('대학교명을 입력해주세요.');
      return;
    }
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
      const isAdmin = profile.role === 'ADMIN' || profile.role === 'SCHOOL_ADMIN';
      navigate(isAdmin ? '/admin' : '/', { replace: true });
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
      <div className="login-hero">
        {/* 배경색 덩어리들이 아주 천천히 움직인다 */}
        <span className="lh-blob b1" aria-hidden="true" />
        <span className="lh-blob b2" aria-hidden="true" />
        <span className="lh-blob b3" aria-hidden="true" />
        <span className="lh-blob b4" aria-hidden="true" />
        <span className="lh-blob b5" aria-hidden="true" />
        <div className="lh-inner">
          <div className="lh-brand">UNI:VERSE</div>
          <div className="lh-brand-sub">CAMPUS PLATFORM</div>
          <div
            role="status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              width: 'fit-content',
              marginTop: 18,
              padding: '8px 13px',
              border: '1px solid rgba(255,255,255,.38)',
              borderRadius: 999,
              background: 'rgba(16,185,129,.22)',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '.04em',
            }}
          >
            <span aria-hidden="true">●</span>
            CI/CD 자동 배포 테스트
          </div>
          <h1 className="lh-title">
            우리 학교에서,
            <br />
            <span className="lh-em">더 가벼운 소통</span> <span className="lh-em">더 안전한 거래</span>
          </h1>
          <p className="lh-sub">같은 학교, 더 안전하게. 익명은 그대로, 거래는 신뢰있게.</p>
        </div>
      </div>
      <div className="login-formside">
        <form className="login-form-inner login-card stack g16" onSubmit={handleSubmit} noValidate>
          <div className="login-card-head">
            <div className="login-card-title">{isSignup ? '회원가입' : '로그인'}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
              {isSignup
                ? '학교 이메일로 인증해야 가입할 수 있어요'
                : '학교 계정으로 커뮤니티와 중고거래를 이용해보세요'}
            </div>
          </div>
          {isSignup && (
            <div className="signup-steps" aria-label={`회원가입 ${signupStep}/2단계`}>
              <span className={signupStep === 1 ? 'on' : 'done'}><b>1</b>학교 인증</span>
              <span className="signup-steps-line" />
              <span className={signupStep === 2 ? 'on' : ''}><b>2</b>계정 정보</span>
            </div>
          )}
          {isSignup && signupStep === 1 && (
            <div className="form-grid two signup-row">
              <div className="field">
                <label className="login-label">대학교</label>
                <input className="input" autoComplete="organization" placeholder="대학교명" maxLength={100}
                  value={form.universityName} onChange={update('universityName')} required />
              </div>
              <div className="field">
                <label className="login-label">학과</label>
                <input className="input" placeholder="학과" maxLength={100}
                  value={form.department} onChange={update('department')} required />
              </div>
            </div>
          )}
          {isSignup ? signupStep === 1 && (
            <div className="field">
              <label className="login-label">학교 이메일</label>
              <div className="row g8">
                <input className="input" type="email" autoComplete="email"
                  placeholder="학교 이메일"
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
                <div className="faint" style={{ fontSize: 12 }}>학교에서 발급한 메일만 사용할 수 있어요</div>
              )}
              {emailVerified && <span className="chip verified" style={{ alignSelf: 'flex-start' }}>✓ 학교 이메일 인증 완료</span>}
            </div>
          ) : (
            <div className="field">
              <label className="login-label">이메일</label>
              <input className="input" type="email" autoComplete="email" placeholder="학교 이메일"
                value={form.email} onChange={update('email')} required />
            </div>
          )}
          {isSignup && signupStep === 1 && verify.step === 'sent' && (
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
          {(!isSignup || signupStep === 2) && <div className="field">
            <label className="login-label">비밀번호</label>
            <div className="pw-field">
              <input className="input" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder={isSignup ? '비밀번호 (8자 이상)' : '비밀번호'} value={form.password} onChange={update('password')} required />
              <button type="button" className="pw-toggle" onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'} aria-pressed={showPassword}>
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          </div>}
          {isSignup && signupStep === 2 && (
            <div className="form-grid two signup-row">
              <div className="field">
                <label className="login-label">이름</label>
                <input className="input" autoComplete="name" placeholder="이름" maxLength={50}
                  value={form.name} onChange={update('name')} required />
              </div>
              <div className="field">
                <label className="login-label">닉네임</label>
                <input className="input" autoComplete="nickname" placeholder="닉네임" maxLength={50}
                  value={form.nickname} onChange={update('nickname')} required />
              </div>
            </div>
          )}
          {error && <div className="login-error" role="alert">{error}</div>}
          {isSignup && signupStep === 1 ? (
            <button type="submit" className="btn btn-primary btn-full" disabled={!emailVerified}>
              다음
            </button>
          ) : (
            <div className="row g8">
              {isSignup && (
                <button type="button" className="btn btn-outline" style={{ flex: 'none' }}
                  onClick={() => { setError(''); setSignupStep(1); }} disabled={submitting}>
                  이전
                </button>
              )}
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting || (isSignup && !emailVerified)}>
                {submitting ? '처리 중…' : isSignup ? '가입하기' : '로그인'}
              </button>
            </div>
          )}
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
