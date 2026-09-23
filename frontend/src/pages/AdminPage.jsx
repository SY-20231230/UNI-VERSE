import { Link } from 'react-router-dom';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { formatDate } from '../lib/format';

import AdminReportPanel from '../components/admin/AdminReportPanel';
import useAdminReportApi from '../lib/useAdminReportApi';

export default function AdminPage() {
  const { state, liftSuspension } = useApp();
  const { toast } = useUI();
  const reportApi = useAdminReportApi();

  const suspendedUsers = Object.values(state.users).filter(
    (u) => u.suspendedPermanently || (u.suspendedUntil && u.suspendedUntil > Date.now())
  );

  function unsuspend(u) {
    liftSuspension(u.id);
    toast(u.name + '님의 정지를 해제했습니다');
  }

  return (
    <div className="container fade-enter">
      <h1 className="h1">관리자</h1>
      <p className="write-sub" style={{ marginTop: 8 }}>신고 처리와 커뮤니티 운영 현황을 확인하는 공간이에요.</p>

      <div className="admin-layout" style={{ marginTop: 26 }}>
        <AdminReportPanel api={reportApi} onNotice={toast} />

        <div className="card" style={{ padding: 24 }}>
          <div className="row between">
            <div className="h3">정지된 회원 관리</div>
            {suspendedUsers.length > 0 && <span className="chip danger">{suspendedUsers.length}명</span>}
          </div>

          {suspendedUsers.length === 0 ? (
            <div className="empty" style={{ padding: '30px 16px' }}>
              <div className="empty-icon">
                <Icon name="shield" size={22} />
              </div>
              <div className="h2" style={{ fontSize: 13.5, marginTop: 8 }}>
                정지된 회원이 없어요
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 6 }}>
              {suspendedUsers.map((u) => (
                <div className="admin-report-row" key={u.id}>
                  <Link className="admin-report-user" to={`/users/${u.id}?from=admin`}>
                    <Avatar user={u} size={28} />
                    <span>{u.name}</span>
                  </Link>
                  <div className="row g6 wrap" style={{ marginTop: 8 }}>
                    <span className={'chip ' + (u.suspendedPermanently ? 'danger' : 'warn')}>
                      {u.suspendedPermanently ? '영구정지' : `${formatDate(u.suspendedUntil)}까지`}
                    </span>
                    {u.dept && <span className="faint" style={{ fontSize: 11.5 }}>{u.dept}</span>}
                  </div>
                  <button className="btn btn-outline btn-sm btn-full" style={{ marginTop: 10 }} onClick={() => unsuspend(u)}>
                    정지 해제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card admin-stats-note" style={{ marginTop: 20 }}>
        <div className="row g8">
          <Icon name="trend" size={14} />
          <span>불만 통계</span>
        </div>
        <div className="faint" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
          신고 유형별 통계와 추이는 추후 제공될 예정이에요.
        </div>
      </div>
    </div>
  );
}
