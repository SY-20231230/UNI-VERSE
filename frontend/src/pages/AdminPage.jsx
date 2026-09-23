import { Link } from 'react-router-dom';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { formatDate } from '../lib/format';

<<<<<<< HEAD
const STATUS_VARIANT = {
  대기중: 'warn',
  처리완료: 'success',
  반려됨: 'outline',
};

function isToday(ts) {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
=======
import AdminReportPanel from '../components/admin/AdminReportPanel';
import useAdminReportApi from '../lib/useAdminReportApi';
>>>>>>> baek

export default function AdminPage() {
  const { state, liftSuspension } = useApp();
  const { toast } = useUI();
  const reportApi = useAdminReportApi();

<<<<<<< HEAD
  const records = [...(state.reportRecords || [])].sort((a, b) => b.time - a.time);
  const pendingCount = records.filter((r) => r.status === '대기중').length;
  const resolvedCount = records.filter((r) => r.status === '처리완료').length;
  const todayCount = records.filter((r) => isToday(r.time)).length;
=======
>>>>>>> baek
  const suspendedUsers = Object.values(state.users).filter(
    (u) => u.suspendedPermanently || (u.suspendedUntil && u.suspendedUntil > Date.now())
  );

<<<<<<< HEAD
  const reasonCounts = records.reduce((acc, r) => {
    acc[r.reason] = (acc[r.reason] || 0) + 1;
    return acc;
  }, {});
  const maxReasonCount = Math.max(1, ...Object.values(reasonCounts));
  const reasonStats = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count, pct: Math.round((count / maxReasonCount) * 100) }));

  function resolve(id) {
    const action = actionDrafts[id] || 'warn';
    resolveReport(id, action);
    toast(REPORT_ACTIONS[action].label + ' 처리했습니다');
  }

=======
>>>>>>> baek
  function unsuspend(u) {
    liftSuspension(u.id);
    toast(u.name + '님의 정지를 해제했습니다');
  }

  return (
    <div className="container fade-enter">
      <h1 className="h1">관리자 대시보드</h1>
      <p className="write-sub" style={{ marginTop: 8 }}>신고 처리와 회원 제재를 관리해요.</p>

<<<<<<< HEAD
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
        <div className="card" style={{ padding: 24 }}>
          <div className="row between">
            <div className="h3">신고 처리 관리</div>
            {pendingCount > 0 && <span className="chip warn">대기중 {pendingCount}건</span>}
          </div>

          {records.length === 0 ? (
            <div className="empty" style={{ padding: '40px 20px' }}>
              <div className="empty-icon">
                <Icon name="flag" size={26} />
              </div>
              <div className="h2" style={{ fontSize: 15, marginTop: 10 }}>
                접수된 신고가 없어요
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 6 }}>
              {records.map((r) => {
                const reporter = userOf(r.reporterId);
                const target = r.targetUserId ? userOf(r.targetUserId) : null;
                const listing = r.listingId ? state.listings.find((l) => l.id === r.listingId) : null;
                const pending = r.status === '대기중';
                const selectedAction = actionDrafts[r.id] || 'warn';
                return (
                  <div className="admin-report-row" key={r.id}>
                    <div className="row between">
                      <div className="admin-report-parties">
                        <Link className="admin-report-user" to={`/users/${reporter.id}?from=admin`}>
                          <Avatar user={reporter} size={28} />
                          <span>{reporter.name}</span>
                        </Link>
                        <Icon name="chev" size={13} className="admin-report-arrow" />
                        {target ? (
                          <Link className="admin-report-user" to={`/users/${target.id}?from=admin`}>
                            <Avatar user={target} size={28} />
                            <span>{target.name}</span>
                          </Link>
                        ) : (
                          <div className="admin-report-user" style={{ cursor: 'default' }}>
                            <Avatar user={{ name: '?', color: '#9195A6' }} size={28} />
                            <span>알 수 없음</span>
                          </div>
                        )}
                      </div>
                      <span className="faint" style={{ fontSize: 11, flex: 'none' }}>
                        {timeAgo(r.time)}
                      </span>
                    </div>

                    <div className="row g6 wrap" style={{ marginTop: 12 }}>
                      <span className="chip outline">{r.reason}</span>
                      <span className={'chip ' + (STATUS_VARIANT[r.status] || 'outline')}>{r.status}</span>
                      {target?.suspendedPermanently && <span className="chip danger">영구정지</span>}
                      {!target?.suspendedPermanently && target?.suspendedUntil > Date.now() && (
                        <span className="chip warn">{formatDate(target.suspendedUntil)}까지 정지</span>
                      )}
                      {listing && (
                        <Link className="chip outline admin-listing-chip" to={`/market/${listing.id}?from=admin`}>
                          <Icon name="tag" size={11} />
                          <span>{listing.title}</span>
                        </Link>
                      )}
                    </div>

                    {pending ? (
                      <div style={{ marginTop: 16 }}>
                        <div className="row g6 wrap">
                          {Object.entries(REPORT_ACTIONS).map(([k, a]) => (
                            <button
                              key={k}
                              type="button"
                              className="chip outline"
                              style={
                                selectedAction === k
                                  ? { background: 'var(--accent-soft)', color: 'var(--accent-soft-ink)', borderColor: 'var(--accent)', fontWeight: 800 }
                                  : { fontWeight: 600 }
                              }
                              onClick={() => setActionDrafts((d) => ({ ...d, [r.id]: k }))}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                        <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => resolve(r.id)}>
                          처리하기
                        </button>
                      </div>
                    ) : (
                      r.action && (
                        <div className="faint" style={{ fontSize: 12, marginTop: 10 }}>
                          처리: {REPORT_ACTIONS[r.action]?.label}
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
=======
      <div className="admin-layout" style={{ marginTop: 26 }}>
        <AdminReportPanel api={reportApi} onNotice={toast} />
>>>>>>> baek

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
