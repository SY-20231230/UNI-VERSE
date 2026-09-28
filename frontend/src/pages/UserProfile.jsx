import { useParams, Navigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import VerifiedChip from '../components/VerifiedChip';
import { useApp, authApi } from '../context/AppContext';

export default function UserProfile() {
  const { id } = useParams();
  const { state, userOf } = useApp();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [realUser, setRealUser] = useState(null);

  useEffect(() => {
    if (id && id !== 'me' && authApi) {
      authApi.getUserProfile(id).then(res => {
        setRealUser({
          id: res.userId,
          name: res.nickname || res.name,
          color: passedUser?.color || userOf(id).color,
          dept: res.department,
          school: res.schoolName,
          verified: res.schoolVerified,
          trustScore: res.trustScore,
          trades: res.completedTradeCount, // mapping completedTradeCount to trades
          reportCount: res.reportCount,
          suspendedPermanently: res.suspendedPermanently,
          suspendedUntil: res.suspendedUntil
        });
      }).catch(() => {});
    }
  }, [id]);

  if (id === 'me') {
    return <Navigate to="/mypage" replace />;
  }

  const passedUser = location.state?.user;
  const user = realUser || passedUser || state.users[id] || userOf(id);
  
  if (!user || user.name === '알 수 없음') {
    return (
      <div className="container mid fade-enter">
        <div className="empty">사용자를 찾을 수 없어요</div>
      </div>
    );
  }


  const onSaleListings = state.listings.filter((l) => l.sellerId === id && l.status === '판매중');
  const doneCount = user.trades ?? state.listings.filter((l) => l.sellerId === id && l.status === '거래완료').length;
  const reportCount = user.reportCount ?? (state.reportRecords || []).filter((r) => r.targetUserId === id).length;
  const suspended = user.suspendedPermanently || (user.suspendedUntil && user.suspendedUntil > Date.now());
  const fromAdmin = searchParams.get('from') === 'admin';
  const backTo = fromAdmin ? '/admin' : '/market';
  const backLabel = fromAdmin ? '관리자' : '중고거래';

  return (
    <div className="container mid fade-enter">
      <Link className="backlink" to={backTo}>
        <Icon name="back" size={13} />
        {backLabel}
      </Link>

      <div className="card profile-card">
        <div className="profile-cover">
          <div className="hero-dots"></div>
        </div>
        <div className="profile-body">
          <div className="profile-avatar-wrap">
            <Avatar user={user} size={96} />
          </div>
          <div className="profile-info">
            <div className="row g8">
              <span className="h2">{user.name}</span>
              {user.verified && <VerifiedChip level={user.verified} score={user.trustScore} />}
              {suspended && (
                <span className={'chip ' + (user.suspendedPermanently ? 'danger' : 'warn')}>
                  {user.suspendedPermanently ? '영구정지' : '정지중'}
                </span>
              )}
            </div>
            {(user.dept || user.school) && (
              <div className="faint" style={{ fontSize: 12.5, marginTop: 5 }}>
                {[user.school || '학교 미등록', user.dept, user.verified ? '학교 인증 완료' : '학교 인증 필요'].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </div>
        <div className="stat-row-plain">
          <div className="stat-plain">
            <b className="tnum" style={{ color: 'var(--accent)' }}>{user.trustScore ?? 0}점</b>
            <span>신뢰점수</span>
          </div>
          <div className="stat-plain">
            <b className="tnum">{doneCount}</b>
            <span>거래완료</span>
          </div>
          <div className="stat-plain">
            <b className="tnum">{user.trades ?? 0}</b>
            <span>거래 횟수</span>
          </div>
          <div className="stat-plain">
            <b className="tnum">{reportCount}</b>
            <span>신고 횟수</span>
          </div>
        </div>
      </div>
    </div>
  );
}
