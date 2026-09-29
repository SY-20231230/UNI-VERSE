import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { formatDate } from '../lib/format';
import AdminReportPanel from '../components/admin/AdminReportPanel';
import ConfirmModal from '../components/ConfirmModal';
import useAdminReportApi from '../lib/useAdminReportApi';
import { REPORT_TYPES } from '../lib/reportLabels';

function isToday(ts) {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function todayStart() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00`;
}

/** 실제 로그인한 관리자면 서버에서 대시보드 숫자·정지 회원·유형별 통계를 모은다. */
function useServerDashboard(api, enabled, revision) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const count = (input) => api.count(input, options).catch(() => 0);
    Promise.all([
      count({ status: 'PENDING' }),
      count({ from: todayStart() }),
      count({ status: 'PROCESSED' }),
      count({ status: 'REJECTED' }),
      Promise.all(Object.keys(REPORT_TYPES).map((type) => count({ reportType: type }).then((n) => [REPORT_TYPES[type], n]))),
      Promise.all(['SUSPENDED', 'BANNED'].map((status) => api.users(status, options).catch(() => []))),
    ]).then(async ([pending, today, processed, rejected, byType, [suspended, banned]]) => {
      const withEnd = await Promise.all(suspended.map((u) => api.latestSanction(u.userId, options)
        .then((s) => ({ ...u, endAt: s?.endAt || null })).catch(() => ({ ...u, endAt: null }))));
      setData({
        pending, today, resolved: processed + rejected,
        reasonCounts: Object.fromEntries(byType.filter(([, n]) => n > 0)),
        suspendedUsers: [
          ...withEnd.map((u) => ({ id: u.userId, name: u.nickname, permanent: false, until: u.endAt })),
          ...banned.map((u) => ({ id: u.userId, name: u.nickname, permanent: true, until: null })),
        ],
      });
    }).catch(() => {});
    return () => controller.abort();
  }, [api, enabled, revision]);
  return data;
}

import SchoolAdminPage from './SchoolAdminPage';

export default function AdminPage() {
  const { state, liftSuspension } = useApp();
  const { toast, openModal, closeOverlay } = useUI();
  const reportApi = useAdminReportApi();
  const isServer = state.authMode === 'server' && !state.isSchoolAdmin;
  const [revision, setRevision] = useState(0);
  const server = useServerDashboard(reportApi, isServer, revision);

  if (state.isSchoolAdmin) {
    return <SchoolAdminPage />;
  }

  const records = [...(state.reportRecords || [])].sort((a, b) => b.time - a.time);
  const demoSuspended = Object.values(state.users).filter(
    (u) => u.suspendedPermanently || (u.suspendedUntil && u.suspendedUntil > Date.now())
  ).map((u) => ({ id: u.id, name: u.name, permanent: !!u.suspendedPermanently, until: u.suspendedUntil, user: u, dept: u.dept }));
  const pendingCount = isServer ? server?.pending ?? '–' : records.filter((r) => r.status === '대기중').length;
  const resolvedCount = isServer ? server?.resolved ?? '–' : records.filter((r) => r.status === '처리완료').length;
  const todayCount = isServer ? server?.today ?? '–' : records.filter((r) => isToday(r.time)).length;
  const suspendedUsers = isServer ? server?.suspendedUsers || [] : demoSuspended;

  const reasonCounts = isServer ? server?.reasonCounts || {} : records.reduce((acc, r) => {
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

  const [releasing, setReleasing] = useState(null);
  function askRelease(u) {
    openModal(
      <ConfirmModal
        title={`${u.name}님의 정지를 해제할까요?`}
        desc="남은 정지 기간과 관계없이 바로 모든 기능을 다시 쓸 수 있게 돼요."
        confirmLabel="정지 해제"
        onClose={closeOverlay}
        onConfirm={() => {
          setReleasing(u.id);
          reportApi.releaseSuspension(u.id)
            .then(() => { toast(u.name + '님의 정지를 해제했습니다'); setRevision((v) => v + 1); })
            .catch((error) => toast(error.message || '정지를 해제하지 못했습니다'))
            .finally(() => setReleasing(null));
        }}
      />
    );
  }

  const untilText = (u) => {
    if (u.permanent) return '영구정지';
    if (!u.until) return '기간 확인 불가';
    return `${formatDate(typeof u.until === 'number' ? u.until : new Date(u.until).getTime())}까지`;
  };

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
        <AdminReportPanel api={reportApi} onNotice={toast} onChanged={() => setRevision((v) => v + 1)} />

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
                    {u.user ? (
                      <Link className="admin-report-user" to={`/users/${u.id}?from=admin`}>
                        <Avatar user={u.user} size={28} />
                        <span>{u.name}</span>
                      </Link>
                    ) : (
                      <strong style={{ fontSize: 13.5 }}>{u.name}</strong>
                    )}
                    <div className="row g6 wrap" style={{ marginTop: 8 }}>
                      <span className={'chip ' + (u.permanent ? 'danger' : 'warn')}>{untilText(u)}</span>
                      {u.dept && <span className="faint" style={{ fontSize: 11.5 }}>{u.dept}</span>}
                    </div>
                    {!isServer && (
                      <button className="btn btn-outline btn-sm btn-full" style={{ marginTop: 10 }} onClick={() => unsuspend(u.user)}>
                        정지 해제
                      </button>
                    )}
                    {isServer && !u.permanent && (
                      <button className="btn btn-outline btn-sm btn-full" style={{ marginTop: 10 }} disabled={releasing === u.id}
                        onClick={() => askRelease(u)}>
                        {releasing === u.id ? '해제 중…' : '정지 해제'}
                      </button>
                    )}
                  </div>
                ))}
                {isServer && <p className="faint" style={{ fontSize: 11.5, marginTop: 10, lineHeight: 1.6 }}>일시정지는 기간이 끝나면 자동으로 해제되고, 필요하면 바로 해제할 수도 있어요.</p>}
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