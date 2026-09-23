import { useEffect, useRef, useState } from 'react';
import { REPORT_TYPES, REPORT_STATUS } from '../../lib/reportLabels';
import { evidenceLink, reportSearchQuery, REPORT_SANCTIONS, REPORT_SORTS } from '../../lib/adminReportApi';
import './adminReports.css';

const INITIAL = { status: 'PENDING', reportType: '', targetUserId: '', from: '', to: '', sort: 'createdAt,desc', size: 20 };
const date = (value) => value ? value.replace('T', ' ').slice(0, 19) : '—';
const statusClass = (status) => status === 'PENDING' ? 'warn' : status === 'PROCESSED' ? 'success' : 'outline';

export default function AdminReportPanel({ api, onNotice = () => {} }) {
  const [draft, setDraft] = useState(INITIAL);
  const [query, setQuery] = useState({ ...INITIAL, page: 0 });
  const [revision, setRevision] = useState(0);
  const [resource, setResource] = useState(null);
  const current = resource?.api === api && resource?.query === query && resource?.revision === revision;
  const loading = !current;
  const result = current ? resource.page : null;
  const error = current ? resource.error : '';
  const [filterError, setFilterError] = useState('');
  const [selected, setSelected] = useState(null);
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
  function processed(message) { onNotice(message); setRevision((value) => value + 1); }

  return (
    <section className="card admin-reports" aria-label="관리자 신고 관리">
      <h2 className="h3">신고 처리 관리</h2>
      <form onSubmit={apply} className="admin-report-filters">
        <fieldset disabled={busy}>
          <label className="field">신고 상태<select className="input" value={draft.status} onChange={(e) => change('status', e.target.value)}>
            <option value="">전체 상태</option>{Object.entries(REPORT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="field">신고 유형<select className="input" value={draft.reportType} onChange={(e) => change('reportType', e.target.value)}>
            <option value="">전체 유형</option>{Object.entries(REPORT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="field">대상 회원 ID<input className="input" inputMode="numeric" value={draft.targetUserId} onChange={(e) => change('targetUserId', e.target.value)} placeholder="전체 회원" /></label>
          <label className="field">접수 시작 시각<input className="input" type="datetime-local" value={draft.from} onChange={(e) => change('from', e.target.value)} /></label>
          <label className="field">접수 종료 시각<input className="input" type="datetime-local" value={draft.to} onChange={(e) => change('to', e.target.value)} /></label>
          <label className="field">정렬<select className="input" value={draft.sort} onChange={(e) => change('sort', e.target.value)}>
            {Object.entries(REPORT_SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="field">페이지당 건수<select className="input" value={draft.size} onChange={(e) => change('size', Number(e.target.value))}>
            {[10, 20, 50].map((size) => <option key={size} value={size}>{size}건</option>)}
          </select></label>
          <div className="row g8 wrap"><button className="btn btn-primary btn-sm" type="submit">조회</button>
            <button className="btn btn-outline btn-sm" type="button" onClick={() => { setDraft(INITIAL); setQuery({ ...INITIAL, page: 0 }); setSelected(null); setFilterError(''); }}>초기화</button></div>
        </fieldset>
      </form>
      {filterError && <p role="alert">{filterError}</p>}
      <div aria-live="polite">
        {loading && <p className="muted">신고 목록을 불러오는 중…</p>}
        {error && <div role="alert"><p>{error}</p><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setRevision((value) => value + 1)}>목록 다시 불러오기</button></div>}
        {!loading && !error && result && <>
          <p className="muted">조회 결과 {result.totalElements}건</p>
          {!result.content.length && <p className="empty">조건에 맞는 신고가 없습니다.</p>}
          {result.content.map((report) => <article key={report.reportId} className="admin-report-row">
            <div className="row between wrap g8"><strong>신고 #{report.reportId}</strong><span className={'chip ' + statusClass(report.status)}>{REPORT_STATUS[report.status] || report.status}</span></div>
            <p>{REPORT_TYPES[report.reportType] || report.reportType} · 신고자 #{report.reporterId} → 대상 #{report.targetUserId}</p>
            <div className="row between wrap g8"><span className="faint">접수 {date(report.createdAt)}</span>
              <button className="btn btn-outline btn-sm" type="button" disabled={busy} aria-pressed={selected === report.reportId} onClick={() => setSelected(report.reportId)}>신고 #{report.reportId} 상세 보기</button></div>
          </article>)}
          <nav className="row between admin-report-pagination" aria-label="신고 목록 페이지">
            <button className="btn btn-outline btn-sm" type="button" disabled={busy || query.page === 0} onClick={() => setQuery((value) => ({ ...value, page: value.page - 1 }))}>이전</button>
            <span>{result.totalPages ? query.page + 1 : 0} / {result.totalPages}</span>
            <button className="btn btn-outline btn-sm" type="button" disabled={busy || query.page + 1 >= result.totalPages} onClick={() => setQuery((value) => ({ ...value, page: value.page + 1 }))}>다음</button>
          </nav>
        </>}
      </div>
      {selected != null && <AdminReportDetail key={String(selected)} id={selected} api={api} revision={revision}
        onBusy={setBusy} onProcessed={processed} onRefresh={() => setRevision((value) => value + 1)} onClose={() => { if (!busy) setSelected(null); }} />}
    </section>
  );
}

function AdminReportDetail({ id, api, revision, onBusy, onProcessed, onRefresh, onClose }) {
  const [resource, setResource] = useState(null);
  const [actionError, setActionError] = useState('');
  const [note, setNote] = useState('');
  const [sanction, setSanction] = useState('');
  const [decision, setDecision] = useState(null);
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

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || completed || !decision || !note.trim() || detail?.report.status !== 'PENDING') return;
    submitting.current = true; setBusy(true); onBusy(true); setActionError('');
    try {
      if (decision === 'approve') await api.approve(id, { adminNote: note, sanctionType: sanction || undefined });
      else await api.dismiss(id, { adminNote: note });
      setCompleted(true); setDecision(null); setNote('');
      onProcessed(decision === 'approve' ? '신고를 확정했습니다.' : '신고를 기각했습니다.');
    } catch (failure) {
      setActionError(failure.message);
      setDecision(null);
      // Re-read after any failed mutation: the request may have committed before a network failure.
      onRefresh();
    } finally { submitting.current = false; setBusy(false); onBusy(false); }
  }

  return <section className="admin-report-detail" aria-label={`신고 ${id} 상세`}>
    <div className="row between g8"><h3 className="h3" ref={heading} tabIndex={-1}>신고 #{id} 상세</h3>
      <button className="btn btn-outline btn-sm" type="button" onClick={onClose} disabled={busy}>상세 닫기</button></div>
    {loading && <p role="status">상세 정보를 불러오는 중…</p>}
    {error && <div role="alert"><p>{error}</p><button className="btn btn-outline btn-sm" type="button" onClick={() => setRefresh((value) => value + 1)}>상세 다시 불러오기</button></div>}
    {actionError && <p role="alert">{actionError}</p>}
    {completed && <p role="status">처리가 완료되었습니다.</p>}
    {detail && <>
      <dl className="admin-report-facts">
        <dt>상태</dt><dd>{REPORT_STATUS[detail.report.status] || detail.report.status}</dd>
        <dt>유형</dt><dd>{REPORT_TYPES[detail.report.reportType] || detail.report.reportType}</dd>
        <dt>신고자</dt><dd>회원 #{detail.reporterId}</dd>
        <dt>대상 회원</dt><dd>{detail.targetUser.name} ({detail.targetUser.nickname}) · #{detail.targetUser.userId}</dd>
        <dt>신뢰점수 / 계정</dt><dd>{detail.targetUser.trustScore}점 · {detail.targetUser.accountStatus}</dd>
        <dt>접수 시각</dt><dd>{date(detail.report.createdAt)}</dd>
        <dt>처리 시각</dt><dd>{date(detail.report.processedAt)}</dd>
        <dt>관련 항목</dt><dd>{[['상품', detail.report.itemId], ['게시글', detail.report.postId], ['거래', detail.report.tradeId]].filter(([, value]) => value != null).map(([label, value]) => `${label} #${value}`).join(' / ') || '없음'}</dd>
      </dl>
      <h4>신고 내용</h4><p className="admin-report-text">{detail.description}</p>
      {detail.trade && <><h4>관련 거래</h4><p>거래 #{detail.trade.tradeId} · 판매자 #{detail.trade.sellerId} · 구매자 #{detail.trade.buyerId}</p>
        <p>상태 {detail.trade.status} · 거래 금액 {detail.trade.finalPrice ?? detail.trade.listedPrice}원</p></>}
      <h4>증빙자료</h4>
      {detail.evidences.length ? <ul>{detail.evidences.map((evidence, index) => <li key={evidence.evidenceId}>
        {evidenceLink(evidence.fileUrl) ? <a href={evidenceLink(evidence.fileUrl)} target="_blank" rel="noopener noreferrer">증빙자료 {index + 1} 열기</a> : <span>열 수 없는 증빙 주소입니다.</span>}
      </li>)}</ul> : <p className="muted">첨부된 증빙자료가 없습니다.</p>}
      {detail.report.status !== 'PENDING' && <><h4>관리자 처리 사유</h4><p className="admin-report-text">{detail.adminNote || '—'}</p><p className="faint">처리 관리자 #{detail.adminId ?? '—'}</p></>}
      {detail.report.status === 'PENDING' && !completed && <form onSubmit={submit} className="admin-report-decision">
        <label className="field">관리자 처리 사유<textarea className="input" rows={4} required maxLength={10000} value={note} disabled={busy} onChange={(event) => { setNote(event.target.value); setDecision(null); }} placeholder="확정 또는 기각하는 근거를 남겨주세요." /></label>
        <label className="field">확정 시 추가 제재<select className="input" value={sanction} disabled={busy} onChange={(event) => { setSanction(event.target.value); setDecision(null); }}>
          <option value="">추가 제재 없음</option>{Object.entries(REPORT_SANCTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        {sanction === 'SUSPENSION' && <p className="muted">일시정지 기간은 운영 정책에 따라 적용됩니다.</p>}
        <div className="row wrap g8"><button className="btn btn-primary" type="button" disabled={busy || !note.trim()} onClick={() => setDecision('approve')}>신고 확정</button>
          <button className="btn btn-outline" type="button" disabled={busy || !note.trim()} onClick={() => setDecision('dismiss')}>신고 기각</button></div>
        {decision && <div className="admin-report-confirm" role="group" aria-label="신고 처리 확인">
          <p>{decision === 'approve' ? `신고를 확정하고 신뢰점수를 30점으로 설정합니다. 추가 제재: ${REPORT_SANCTIONS[sanction] || '없음'}.` : '신고를 기각합니다. 신뢰점수와 제재는 변경하지 않습니다.'}</p>
          {decision === 'approve' && sanction === 'BAN' && <p><strong>영구정지하면 해당 회원은 서비스를 이용할 수 없습니다.</strong></p>}
          <div className="row wrap g8"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? '처리 중…' : '확인 후 처리'}</button>
            <button className="btn btn-outline" type="button" disabled={busy} onClick={() => setDecision(null)}>돌아가기</button></div>
        </div>}
      </form>}
    </>}
  </section>;
}
