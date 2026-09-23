import { useNavigate } from 'react-router-dom';
import Icon from '../lib/icons';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { useMouseGlow } from '../lib/useMouseGlow';

export default function Login() {
  const { login, loginAsAdmin } = useApp();
  const { toast } = useUI();
  const navigate = useNavigate();
  const heroRef = useMouseGlow();

  function handleLogin() {
    login();
    toast('한빛대학교 학생 인증이 완료되었습니다');
    navigate('/');
  }

  function handleAdminLogin() {
    loginAsAdmin();
    toast('관리자로 로그인했습니다');
    navigate('/');
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
        <div className="login-form-inner stack g20">
          <div>
            <div className="h2">로그인</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              학교 계정으로 인증하면 커뮤니티와 중고거래를 바로 이용할 수 있어요
            </div>
          </div>
          <button className="btn btn-dark btn-full" onClick={handleLogin}>
            <Icon name="shield" size={17} />
            학교 계정으로 인증하기
          </button>
          <div className="row g10">
            <span className="divider" style={{ flex: 1 }}></span>
            <span className="faint" style={{ fontSize: 12 }}>
              또는
            </span>
            <span className="divider" style={{ flex: 1 }}></span>
          </div>
          <div className="field">
            <input className="input" placeholder="학교 이메일" defaultValue="suah.lee@hanbit.ac.kr" />
          </div>
          <div className="field">
            <input className="input" type="password" placeholder="비밀번호" defaultValue="••••••••" />
          </div>
          <button className="btn btn-primary btn-full" onClick={handleLogin}>
            로그인
          </button>
          <button className="btn btn-outline btn-full" onClick={handleLogin}>
            이메일로 회원가입
          </button>
          <button className="link" style={{ alignSelf: 'center', marginTop: 2 }} onClick={handleAdminLogin}>
            관리자로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
