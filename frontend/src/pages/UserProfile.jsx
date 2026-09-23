import { useParams, Navigate, Link, useSearchParams } from 'react-router-dom';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import VerifiedChip from '../components/VerifiedChip';
import ListingGridCard from '../components/ListingGridCard';
import { useApp } from '../context/AppContext';

export default function UserProfile() {
  const { id } = useParams();
  const { state } = useApp();
  const [searchParams] = useSearchParams();

  if (id === 'me') {
    return <Navigate to="/mypage" replace />;
  }

  const user = state.users[id];
  if (!user) {
    return (
      <div className="container mid fade-enter">
        <div className="empty">사용자를 찾을 수 없어요</div>
      </div>
    );
  }

  const onSaleListings = state.listings.filter((l) => l.sellerId === id && l.status === '판매중');
  const doneCount = state.listings.filter((l) => l.sellerId === id && l.status === '거래완료').length;
  const reportCount = (state.reportRecords || []).filter((r) => r.targetUserId === id).length;
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
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="row g8">
              <span className="h2">{user.name}</span>
              <VerifiedChip level={user.verified} />
              {suspended && (
                <span className={'chip ' + (user.suspendedPermanently ? 'danger' : 'warn')}>
                  {user.suspendedPermanently ? '영구정지' : '정지중'}
                </span>
              )}
            </div>
            {user.dept && (
              <div className="faint" style={{ fontSize: 12.5, marginTop: 5 }}>
                {user.dept}
              </div>
            )}
          </div>
        </div>
        <div className="profile-stats-row">
          <div className="profile-stat">
            <div className="profile-stat-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
              <Icon name="check" size={17} />
            </div>
            <div>
              <b className="tnum">{doneCount}</b>
              <span>거래완료</span>
            </div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent-soft-ink)' }}>
              <Icon name="box" size={17} />
            </div>
            <div>
              <b className="tnum">{user.trades ?? 0}</b>
              <span>거래 횟수</span>
            </div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              <Icon name="flag" size={17} />
            </div>
            <div>
              <b className="tnum">{reportCount}</b>
              <span>신고 횟수</span>
            </div>
          </div>
        </div>
      </div>

      {onSaleListings.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div className="h3" style={{ marginBottom: 14 }}>
            판매중인 매물
          </div>
          <div className="card-grid">
            {onSaleListings.map((l) => (
              <ListingGridCard key={l.id} listing={l} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
