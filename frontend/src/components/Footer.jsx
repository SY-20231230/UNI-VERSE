import { Link } from 'react-router-dom';
import { useUI } from '../context/UIContext';

export default function Footer() {
  const { toast } = useUI();
  return (
    <footer>
      <div className="footer-inner">
        <div style={{ maxWidth: 280 }}>
          <div className="footer-brand">
            UNI<span style={{ color: 'var(--accent)' }}>:</span>VERSE
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.7 }}>
            같은 학교, 더 가까운 커뮤니티, 더 안전한 거래.
            <br />
            학교 인증 기반 캠퍼스 플랫폼
          </div>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <h4>서비스</h4>
            <Link to="/community">커뮤니티</Link>
            <Link to="/market">중고거래</Link>
            <Link to="/chat">채팅</Link>
          </div>
          <div className="footer-col">
            <h4>정보</h4>
            <a onClick={() => toast('준비 중인 페이지예요')}>서비스 소개</a>
            <a onClick={() => toast('준비 중인 페이지예요')}>이용약관</a>
            <a onClick={() => toast('준비 중인 페이지예요')}>개인정보처리방침</a>
          </div>
        </div>
      </div>
      <div className="footer-inner" style={{ paddingTop: 0 }}>
        <div className="footer-bottom">© 2026 COPYRIGHT UNI:VERSE</div>
      </div>
    </footer>
  );
}
