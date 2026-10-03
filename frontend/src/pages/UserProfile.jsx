import { useParams, Navigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
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
  // 들어온 화면이 돌아갈 곳을 넘겨주면 그쪽으로 돌아간다.
  const back = location.state?.back;
  const backTo = fromAdmin ? '/admin' : back?.to || '/market';
  const backLabel = fromAdmin ? '관리자 페이지로 돌아가기' : back?.label || '중고거래 목록으로 돌아가기';
  const stats = [
    { label: '신뢰점수', value: `${user.trustScore ?? 0}점`, accent: true },
    { label: '거래완료', value: `${doneCount}건` },
    { label: '거래 횟수', value: `${user.trades ?? 0}건` },
    { label: '신고 횟수', value: `${reportCount}건` },
  ];

  return (
    <div className="container mypage-container fade-enter">
      <Link className="backlink" to={backTo}>
        <Icon name="back" size={15} />
        {backLabel}
      </Link>

      <div className="card profile-card">
        <div className="profile-body">
          <div className="profile-avatar-wrap">
            <Avatar user={user} size={96} />
          </div>
          <div className="profile-info">
            <div className="row g8 wrap">
              <span className="profile-name">{user.name}</span>
              <span className={'chip ' + (user.verified ? 'success' : 'warn')}>
                {user.verified ? '학교 인증 완료' : '학교 인증 필요'}
              </span>
              {suspended && (
                <span className={'chip ' + (user.suspendedPermanently ? 'danger' : 'warn')}>
                  {user.suspendedPermanently ? '영구정지' : '정지중'}
                </span>
              )}
            </div>
            {(user.dept || user.school) && (
              <div className="profile-line">{[user.school || '학교 미등록', user.dept].filter(Boolean).join(' · ')}</div>
            )}
          </div>
        </div>
        <div className="stat-row-plain">
          {stats.map((s) => (
            <div className="stat-plain" key={s.label}>
              <span>{s.label}</span>
              <b className="tnum" style={s.accent ? { color: 'var(--accent)' } : undefined}>{s.value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
