import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { REPORT_TYPES, REPORT_STATUS } from '../../lib/reportLabels';
import { evidenceLink, reportSearchQuery, REPORT_SANCTIONS, REPORT_SORTS } from '../../lib/adminReportApi';
import './adminReports.css';

const INITIAL = { status: 'PENDING', reportType: '', targetUserId: '', from: '', to: '', sort: 'createdAt,desc', size: 20 };
const date = (value) => value ? value.replace('T', ' ').slice(0, 19) : '—';
const statusClass = (status) => status === 'PENDING' ? 'warn' : status === 'PROCESSED' ? 'success' : 'outline';

const CONTENT_STATUS = { SELLING: '판매중', TRADING: '예약중', COMPLETED: '거래완료', CANCELLED: '거래취소', ACTIVE: '게시중', DELETED: '삭제됨', BLOCKED: '차단됨' };
const ACCOUNT_STATUS = { ACTIVE: '정상', SUSPENDED: '일시정지', BANNED: '영구정지', DELETED: '탈퇴' };
const SUSPENSION_PRESETS = [1, 3, 7, 14, 30];
const untilLabel = (days) => { const d = new Date(Date.now() + days * 86400000); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };

// 상품 페이지 등을 보고 돌아왔을 때 필터·페이지·열어 둔 신고·스크롤을 그대로 보여주기 위해 탭 단위로 기억한다.
const VIEW_KEY = 'universe_admin_report_view';
function loadView() {
  try { return JSON.parse(sessionStorage.getItem(VIEW_KEY) || 'null') || {}; } catch { return {}; }
}
function saveView(view) {
  try { sessionStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch { /* storage unavailable */ }
}

export default function AdminReportPanel({ api, onNotice = () => {}, onChanged = () => {} }) {
  const [saved] = useState(loadView);
  const [draft, setDraft] = useState(saved.draft || INITIAL);
  const [query, setQuery] = useState(saved.query || { ...INITIAL, page: 0 });
  const [revision, setRevision] = useState(0);
  const [resource, setResource] = useState(null);
  const current = resource?.api === api && resource?.query === query && resource?.revision === revision;
  const loading = !current;
  const result = current ? resource.page : null;
  const error = current ? resource.error : '';
  useEffect(() => {
    // 목록이 다시 그려진 뒤에 마지막 스크롤 위치로 돌려놓는다 (처음 한 번만).
    if (!result || scrollRestored.current) return;
    scrollRestored.current = true;
    requestAnimationFrame(() => window.scrollTo(0, saved.scrollY));
  }, [result, saved.scrollY]);
  const [filterError, setFilterError] = useState('');
  const [selected, setSelected] = useState(saved.selected ?? null);
  const scrollRestored = useRef(saved.scrollY == null);
  // 스크롤할 때마다 저장하면 버벅이므로, 화면 상태는 바뀔 때만·스크롤 위치는 페이지를 떠날 때 한 번만 저장한다.
  const view = useRef({ draft, query, selected });
  useEffect(() => { view.current = { draft, query, selected }; }, [draft, query, selected]);
  useEffect(() => () => saveView({ ...view.current, scrollY: window.scrollY }), []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    Promise.resolve().then(() => api.search(query, { signal: controller.signal }))
      .then((page) => {
        if (!active) return;
        if (page.content.length === 0 && query.page > 0) {
          setQuery((value) => ({ ...value, page: Math.max(0, Math.min(query.page - 1, page.totalPages - 1)) }));
        } else setResource({ api, query, revision, page, error: '' });
      })
      .catch((failure) => { if (active && failure.name !== 'AbortError') setResource({ api, query, revision, page: null, error: failure.message }); });
    return () => { active = false; controller.abort(); };
  }, [api, query, revision]);

  function change(key, value) { setDraft((current) => ({ ...current, [key]: value })); }
  function apply(event) {
    event.preventDefault();
    if (busy) return;
    try { setQuery(reportSearchQuery({ ...draft, page: 0 })); setSelected(null); setFilterError(''); }
    catch (failure) { setFilterError(failure.message); }
  }
  function processed(message) { onNotice(message); setRevision((value) => value + 1); onChanged(); }

  return (
    <section className="card admin-reports" aria-label="관리자 신고 관리">
      <h2 className="h3">신고 처리 관리</h2>
      <form onSubmit={apply} className="admin-report-filters">
        <fieldset disabled={busy} className="admin-report-filter-main">
          <label className="field">신고 상태<select className="input" value={draft.status} onChange={(e) => change('status', e.target.value)}>
            <option value="">전체 상태</option>{Object.entries(REPORT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="field">신고 유형<select className="input" value={draft.reportType} onChange={(e) => change('reportType', e.target.value)}>
            <option value="">전체 유형</option>{Object.entries(REPORT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <div className="row g8 admin-report-filter-actions"><button className="btn btn-primary btn-sm" type="submit">조회</button>
            <button className="btn btn-outline btn-sm" type="button" onClick={() => { setDraft(INITIAL); setQuery({ ...INITIAL, page: 0 }); setSelected(null); setFilterError(''); }}>초기화</button></div>
        </fieldset>
        <details className="admin-report-more">
          <summary>상세 필터 (회원 ID · 기간 · 정렬 · 건수)</summary>
          <fieldset disabled={busy}>
          <label className="field">대상 회원 ID<input className="input" inputMode="numeric" value={draft.targetUserId} onChange={(e) => change('targetUserId', e.target.value)} placeholder="전체 회원" /></label>
          <label className="field">접수 시작 시각<input className="input" type="datetime-local" value={draft.from} onChange={(e) => change('from', e.target.value)} /></label>
          <label className="field">접수 종료 시각<input className="input" type="datetime-local" value={draft.to} onChange={(e) => change('to', e.target.value)} /></label>
          <label className="field">정렬<select className="input" value={draft.sort} onChange={(e) => change('sort', e.target.value)}>
            {Object.entries(REPORT_SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="field">페이지당 건수<select className="input" value={draft.size} onChange={(e) => change('size', Number(e.target.value))}>
            {[10, 20, 50].map((size) => <option key={size} value={size}>{size}건</option>)}
          </select></label>
          </fieldset>
        </details>
      </form>
      {filterError && <p role="alert">{filterError}</p>}
      <div aria-live="polite">
        {loading && <p className="muted">신고 목록을 불러오는 중…</p>}
        {error && <div role="alert"><p>{error}</p><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setRevision((value) => value + 1)}>목록 다시 불러오기</button></div>}
        {!loading && !error && result && <>
          <p className="muted admin-report-count">조회 결과 {result.totalElements}건</p>
          {!result.content.length && <p className="empty">조건에 맞는 신고가 없습니다.</p>}
          {result.content.length > 0 && <ul className="admin-report-list">
            {result.content.map((report) => <li key={report.reportId}>
              <button type="button" className={'admin-rpt-item' + (selected === report.reportId ? ' on' : '')} disabled={busy}
                aria-pressed={selected === report.reportId} aria-label={`신고 #${report.reportId} 상세 보기`} onClick={() => setSelected(report.reportId)}>
                <span className={'chip ' + statusClass(report.status)}>{REPORT_STATUS[report.status] || report.status}</span>
                <span className="admin-rpt-item-main">
                  <strong>#{report.reportId} {REPORT_TYPES[report.reportType] || report.reportType}</strong>
                  <span className="faint">{report.reporterNickname || '알 수 없음'} → {report.targetNickname || '알 수 없음'}</span>
                </span>
                <span className="faint admin-rpt-item-date">{date(report.createdAt).slice(0, 16)}</span>
                <span className="admin-rpt-item-go" aria-hidden="true">›</span>
              </button>
            </li>)}
          </ul>}
          <nav className="row between admin-report-pagination" aria-label="신고 목록 페이지">
            <button className="btn btn-outline btn-sm" type="button" disabled={busy || query.page === 0} onClick={() => setQuery((value) => ({ ...value, page: value.page - 1 }))}>이전</button>
            <span>{result.totalPages ? query.page + 1 : 0} / {result.totalPages}</span>
            <button className="btn btn-outline btn-sm" type="button" disabled={busy || query.page + 1 >= result.totalPages} onClick={() => setQuery((value) => ({ ...value, page: value.page + 1 }))}>다음</button>
          </nav>
        </>}
      </div>
      {selected != null && <div className="admin-report-drawer-backdrop" onClick={() => { if (!busy) setSelected(null); }}>
        <div className="admin-report-drawer" onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => { if (event.key === 'Escape' && !busy) setSelected(null); }}>
          <AdminReportDetail key={String(selected)} id={selected} api={api} revision={revision}
            onBusy={setBusy} onProcessed={processed} onRefresh={() => setRevision((value) => value + 1)} onClose={() => { if (!busy) setSelected(null); }} />
        </div>
      </div>}
    </section>
  );
}

function AdminReportDetail({ id, api, revision, onBusy, onProcessed, onRefresh, onClose }) {
  const [resource, setResource] = useState(null);
  const [actionError, setActionError] = useState('');
  const [note, setNote] = useState('');
  const [sanction, setSanction] = useState('');
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [completed, setCompleted] = useState(false);
  const current = resource?.api === api && resource?.revision === revision && resource?.refresh === refresh;
  const loading = !current;
  const detail = current ? resource.detail : null;
  const error = current ? resource.error : '';
  const submitting = useRef(false);
  const heading = useRef(null);

  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    Promise.resolve().then(() => api.getDetail(id, { signal: controller.signal }))
      .then((data) => { if (active) setResource({ api, revision, refresh, detail: data, error: '' }); })
      .catch((failure) => { if (active && failure.name !== 'AbortError') setResource({ api, revision, refresh, detail: null, error: failure.message }); });
    return () => { active = false; controller.abort(); };
  }, [id, api, revision, refresh]);

  async function submit(decision) {
    if (submitting.current || completed || !decision || !note.trim() || detail?.report.status !== 'PENDING') return;
    submitting.current = true; setBusy(true); onBusy(true); setActionError('');
    try {
      if (decision === 'approve') await api.approve(id, { adminNote: note, sanctionType: sanction || undefined, suspensionDays: sanction === 'SUSPENSION' ? days : undefined });
      else await api.dismiss(id, { adminNote: note });
      setCompleted(true); setNote('');
      onProcessed(decision === 'approve' ? '신고를 확정했습니다.' : '신고를 기각했습니다.');
    } catch (failure) {
      setActionError(failure.message);
      // Re-read after any failed mutation: the request may have committed before a network failure.
      onRefresh();
    } finally { submitting.current = false; setBusy(false); onBusy(false); }
  }

  return <section className="admin-report-detail" aria-label={`신고 ${id} 상세`}>
    <div className="row between g8"><h3 className="h3" ref={heading} tabIndex={-1}>신고 #{id} 상세</h3>
      <button className="btn btn-outline btn-sm" type="button" onClick={onClose} disabled={busy}>닫기</button></div>
    {loading && <p role="status">상세 정보를 불러오는 중…</p>}
    {error && <div role="alert"><p>{error}</p><button className="btn btn-outline btn-sm" type="button" onClick={() => setRefresh((value) => value + 1)}>상세 다시 불러오기</button></div>}
    {actionError && <p role="alert">{actionError}</p>}
    {completed && <p role="status">처리가 완료되었습니다.</p>}
    {detail && <>
      <dl className="admin-report-facts">
        <dt>상태</dt><dd>{REPORT_STATUS[detail.report.status] || detail.report.status}</dd>
        <dt>유형</dt><dd>{REPORT_TYPES[detail.report.reportType] || detail.report.reportType}</dd>
        <dt>신고자</dt><dd>{detail.reporterNickname || '알 수 없음'}<span className="admin-rpt-id">{detail.reporterEmail || '—'}</span></dd>
        <dt>대상 회원</dt><dd>{detail.targetUser.nickname}<span className="admin-rpt-id">{detail.targetUser.email || '—'}</span></dd>
        <dt>신뢰점수</dt><dd>{detail.targetUser.trustScore}점</dd>
        <dt>계정 상태</dt><dd>{ACCOUNT_STATUS[detail.targetUser.accountStatus] || detail.targetUser.accountStatus}</dd>
        <dt>접수 시각</dt><dd>{date(detail.report.createdAt)}</dd>
        <dt>처리 시각</dt><dd>{date(detail.report.processedAt)}</dd>
        {!detail.content && !detail.trade && <><dt>관련 항목</dt><dd>없음</dd></>}
      </dl>
      {detail.content && <>
        <h4>신고된 {detail.content.kind === 'ITEM' ? '상품' : '게시글'}</h4>
        <div className="admin-rpt-content">
          {detail.content.imageUrls?.length > 0 && <div className="admin-rpt-content-images">
            {detail.content.imageUrls.slice(0, 4).map((url) => <img key={url} src={url} alt="신고된 상품 사진" loading="lazy" />)}
          </div>}
          <strong className="admin-rpt-content-title">{detail.content.title}</strong>
          <div className="faint admin-rpt-content-meta">
            {[detail.content.price != null ? `${Number(detail.content.price).toLocaleString()}원` : null,
              CONTENT_STATUS[detail.content.status] || detail.content.status].filter(Boolean).join(' · ')}
          </div>
          {detail.content.kind === 'ITEM' && <Link className="link admin-rpt-content-link" to={`/market/${detail.content.id}?from=admin`}>상품 페이지로 이동 →</Link>}
        </div>
      </>}
      <h4>신고 내용</h4><p className="admin-report-text">{detail.description}</p>
      {detail.trade && <><h4>관련 거래</h4><p>거래 #{detail.trade.tradeId} · 판매자 #{detail.trade.sellerId} · 구매자 #{detail.trade.buyerId}</p>
        <p>상태 {detail.trade.status} · 거래 금액 {detail.trade.finalPrice ?? detail.trade.listedPrice}원</p></>}
      {detail.evidences.length > 0 && <><h4>증빙자료</h4><ul>{detail.evidences.map((evidence, index) => <li key={evidence.evidenceId}>
        {evidenceLink(evidence.fileUrl) ? <a href={evidenceLink(evidence.fileUrl)} target="_blank" rel="noopener noreferrer">증빙자료 {index + 1} 열기</a> : <span>열 수 없는 증빙 주소입니다.</span>}
      </li>)}</ul> </>}
      {detail.report.status !== 'PENDING' && <><h4>관리자 처리 사유</h4><p className="admin-report-text">{detail.adminNote || '—'}</p><p className="faint">처리한 관리자: {detail.adminNickname || '—'}</p></>}
      {detail.report.status === 'PENDING' && !completed && <form onSubmit={(event) => event.preventDefault()} className="admin-report-decision">
        <label className="field">관리자 처리 사유<textarea className="input" rows={4} required maxLength={10000} value={note} disabled={busy} onChange={(event) => { setNote(event.target.value); }} placeholder="확정 또는 기각하는 근거를 남겨주세요." /></label>
        <div className="field">
          <span className="admin-rpt-label">확정 시 추가 제재</span>
          <div className="admin-rpt-options" role="radiogroup" aria-label="확정 시 추가 제재">
            {[['', '없음'], ...Object.entries(REPORT_SANCTIONS)].map(([value, label]) => (
              <button key={value || 'none'} type="button" role="radio" aria-checked={sanction === value} disabled={busy}
                className={'admin-rpt-option' + (sanction === value ? ' on' : '') + (value === 'BAN' ? ' danger' : '')}
                onClick={() => { setSanction(value); }}>{label}</button>
            ))}
          </div>
        </div>
        {sanction === 'SUSPENSION' && <div className="field admin-rpt-days">
          <span className="admin-rpt-label">정지 기간</span>
          <div className="admin-rpt-options">
            {SUSPENSION_PRESETS.map((n) => (
              <button key={n} type="button" disabled={busy} className={'admin-rpt-option' + (days === n ? ' on' : '')}
                onClick={() => { setDays(n); }}>{n}일</button>
            ))}
            <label className="admin-rpt-custom">
              <input className="input" type="number" min={1} max={3650} value={days} disabled={busy}
                onChange={(event) => { setDays(Math.max(1, Math.min(3650, Number(event.target.value) || 1))); }} />일
            </label>
          </div>
          <span className="faint admin-rpt-hint">{untilLabel(days)}까지 정지돼요</span>
        </div>}
        <p className="admin-rpt-summary">
          <b>확정</b> 시 추가 제재: {sanction === 'SUSPENSION' ? `일시정지 ${days}일 (${untilLabel(days)}까지)` : REPORT_SANCTIONS[sanction] || '없음'}
          {' · '}신뢰점수 {sanction === 'WARNING' ? '-1점' : sanction === 'SUSPENSION' ? `-${days * 2}점` : sanction === 'BAN' ? '0점으로' : '변화 없음'}
          {sanction === 'BAN' && <><br /><strong>영구정지하면 해당 회원은 서비스를 이용할 수 없습니다.</strong></>}
        </p>
        <div className="row wrap g8 admin-rpt-actions">
          <button className="btn btn-primary" type="button" disabled={busy || !note.trim()} onClick={() => submit('approve')}>{busy ? '처리 중…' : '신고 확정'}</button>
          <button className="btn btn-outline" type="button" disabled={busy || !note.trim()} onClick={() => submit('dismiss')}>신고 기각</button>
        </div>
      </form>}
    </>}
  </section>;
}
