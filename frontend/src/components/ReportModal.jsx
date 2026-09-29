import { useRef, useState } from 'react';
import Icon from '../lib/icons';
import { useUI } from '../context/UIContext';
import useReportApi from '../lib/useReportApi';
import { REPORT_TYPES } from '../lib/reportLabels';

export default function ReportModal({ onClose, targetUserId, listingId, tradeId, postId }) {
  const api = useReportApi();
  const { toast } = useUI();
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await api.createReport({ targetUserId, itemId: listingId, tradeId, postId, reportType, description });
      onClose();
      toast('신고가 접수되었습니다. 검토 후 처리됩니다.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack g16">
      <div className="row g8"><Icon name="flag" size={20} /><h2 className="h3">신고하기</h2></div>
      <p className="muted">신고 유형과 내용을 입력해주세요. 접수만으로 상대방의 점수가 차감되지는 않습니다.</p>
      <label className="field">
        <span>신고 유형</span>
        <select className="input" value={reportType} onChange={(event) => setReportType(event.target.value)} required disabled={busy}>
          <option value="">유형 선택</option>
          {Object.entries(REPORT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="field">
        <span>신고 내용</span>
        <textarea className="input" rows={5} maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="어떤 일이 있었는지 구체적으로 적어주세요." required disabled={busy} />
      </label>
      {error && <p className="muted" role="alert">{error}</p>}
      <button className="btn btn-primary btn-full" type="submit" disabled={busy || !reportType || !description.trim()}>{busy ? '접수 중…' : '신고 접수'}</button>
      <button className="btn btn-outline btn-full" type="button" onClick={onClose} disabled={busy}>취소</button>
    </form>
  );
}
