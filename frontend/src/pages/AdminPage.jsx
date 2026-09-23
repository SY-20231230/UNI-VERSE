import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import { useApp, REPORT_ACTIONS } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { timeAgo, formatDate } from '../lib/format';

const STATUS_VARIANT = {
  대기중: 'warn',
  처리완료: 'success',
  반려됨: 'outline',
};

const ACTION_VARIANT = {
  reject: 'outline',
  warn: 'outline',
  suspend_3: 'warn',
  suspend_7: 'warn',
  ban: 'danger',
};

export default function AdminPage() {
  const { state, userOf, resolveReport, liftSuspension } = useApp();
  const { toast } = useUI();
  const [actionDrafts, setActionDrafts] = useState({});

  const records = [...(state.reportRecords || [])].sort((a, b) => b.time - a.time);
  const pendingCount = records.filter((r) => r.status === '대기중').length;
  const suspendedUsers = Object.values(state.users).filter(
    (u) => u.suspendedPermanently || (u.suspendedUntil && u.suspendedUntil > Date.now())
  );

  function resolve(id) {
    const action = actionDrafts[id] || 'warn';
    resolveReport(id, action);
    toast(REPORT_ACTIONS[action].label + ' 처리했습니다');
  }

  function unsuspend(u) {
    liftSuspension(u.id);
    toast(u.name + '님의 정지를 해제했습니다');
  }

  return (
    <div className="container fade-enter">
      <h1 className="h1">관리자</h1>
      <p className="write-sub" style={{ marginTop: 8 }}>신고 처리와 커뮤니티 운영 현황을 확인하는 공간이에요.</p>

      <div className="admin-layout" style={{ marginTop: 26 }}>
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
                              className={'chip ' + (ACTION_VARIANT[k] || 'outline')}
                              style={{
                                border: '1.5px solid ' + (selectedAction === k ? 'var(--accent)' : 'transparent'),
                                fontWeight: selectedAction === k ? 800 : 600,
                              }}
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
