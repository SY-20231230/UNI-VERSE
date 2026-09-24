import { Link } from 'react-router-dom';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { formatDate } from '../lib/format';
import AdminReportPanel from '../components/admin/AdminReportPanel';
import useAdminReportApi from '../lib/useAdminReportApi';

function isToday(ts) {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function AdminPage() {
  const { state, liftSuspension } = useApp();
  const { toast } = useUI();
  const reportApi = useAdminReportApi();

  const records = [...(state.reportRecords || [])].sort((a, b) => b.time - a.time);
  const pendingCount = records.filter((r) => r.status === '대기중').length;
  const resolvedCount = records.filter((r) => r.status === '처리완료').length;
  const todayCount = records.filter((r) => isToday(r.time)).length;
  const suspendedUsers = Object.values(state.users).filter(
    (u) => u.suspendedPermanently || (u.suspendedUntil && u.suspendedUntil > Date.now())
  );

  const reasonCounts = records.reduce((acc, r) => {
    acc[r.reason] = (acc[r.reason] || 0) + 1;
    return acc;
  }, {});
  const maxReasonCount = Math.max(1, ...Object.values(reasonCounts));
  const reasonStats = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count, pct: Math.round((count / maxReasonCount) * 100) }));

  function unsuspend(u) {
    liftSuspension(u.id);
    toast(u.name + '님의 정지를 해제했습니다');
  }

  return (
    <div className="container fade-enter">
      <h1 className="h1">관리자 대시보드</h1>

      <div className="admin-kpi-row" style={{ marginTop: 22 }}>
        <div className="admin-kpi-card highlight">
          <div className="admin-kpi-label">처리 대기 신고</div>
          <div className="admin-kpi-value">{pendingCount}건</div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">오늘 접수</div>
          <div className="admin-kpi-value">{todayCount}건</div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">정지 회원</div>
          <div className="admin-kpi-value">{suspendedUsers.length}명</div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">누적 처리완료</div>
          <div className="admin-kpi-value">{resolvedCount}건</div>
        </div>
      </div>

      <div className="admin-layout" style={{ marginTop: 20 }}>
        <AdminReportPanel api={reportApi} onNotice={toast} />

        <div className="wf-col g20" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

          <div className="card admin-stats-note">
            <div className="row g8">
              <Icon name="trend" size={14} />
              <span>신고 유형별 통계</span>
            </div>
            {reasonStats.length ? (
              <div className="admin-stat-bars">
                {reasonStats.map((s) => (
                  <div className="admin-stat-bar-row" key={s.reason}>
                    <span className="admin-stat-bar-label">{s.reason}</span>
                    <div className="admin-stat-bar-track">
                      <div className="admin-stat-bar-fill" style={{ width: `${s.pct}%` }}></div>
                    </div>
                    <span className="admin-stat-bar-count">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="faint" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
                아직 접수된 신고가 없어요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}