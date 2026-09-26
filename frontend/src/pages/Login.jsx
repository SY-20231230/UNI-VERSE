import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { useMouseGlow } from '../lib/useMouseGlow';

const EMPTY_FORM = { email: '', password: '', name: '', nickname: '' };

export default function Login() {
  const { login, signup, loginDemo, loginDemoAdmin } = useApp();
  const { toast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const heroRef = useMouseGlow();

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isSignup = mode === 'signup';

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function switchMode() {
    setMode(isSignup ? 'login' : 'signup');
    setError('');
  }

  function goBack() {
    navigate(location.state?.from?.pathname || '/', { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const profile = isSignup ? await signup(form) : await login(form);
      toast(isSignup ? `${profile.nickname}님, 가입을 환영해요` : `${profile.nickname}님, 반가워요`);
      goBack();
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
    goBack();
  }

  return (
    <div className="login-wrap fade-enter">
      <div className="login-hero" ref={heroRef}>
        <div className="lh-inner">
          <div className="h1" style={{ color: '#fff', fontSize: 36, marginTop: 16 }}>
            UNI:VERSE
          </div>
          <div style={{ fontSize: 14.5, opacity: 0.86, marginTop: 12, lineHeight: 1.7, maxWidth: 360 }}>
            우리 학교의 더 가까운 커뮤니티, 더 안전한 거래.
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
                ? '가입 후 학교 이메일 인증을 마치면 커뮤니티와 중고거래를 이용할 수 있어요'
                : '학교 계정으로 로그인하면 커뮤니티와 중고거래를 바로 이용할 수 있어요'}
            </div>
          </div>
          <div className="field">
            <input className="input" type="email" autoComplete="email" placeholder="이메일"
              value={form.email} onChange={update('email')} required />
          </div>
          <div className="field">
            <input className="input" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'}
              placeholder={isSignup ? '비밀번호 (8자 이상)' : '비밀번호'} value={form.password} onChange={update('password')} required />
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
            </>
          )}
          {error && <div className="login-error" role="alert">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
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
