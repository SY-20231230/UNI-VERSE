import Icon from '../lib/icons';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';

const REASONS = [
  { label: '외부 메신저 유도', icon: 'chat' },
  { label: '선입금 요구', icon: 'alert' },
  { label: '택배거래만 요구', icon: 'box' },
  { label: '허위 매물/스팸', icon: 'tag' },
  { label: '기타', icon: 'star' },
];

export default function ReportModal({ onClose, targetUserId, listingId, chatId }) {
  const { report } = useApp();
  const { toast } = useUI();

  function confirm(reason) {
    report({ reason, targetUserId, listingId, chatId });
    onClose();
    setTimeout(() => toast('신고가 접수되었습니다. 검토 후 조치할게요'), 150);
  }

  return (
    <div>
      <div className="empty-icon" style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--danger-soft)', color: 'var(--danger)', margin: '0 auto 14px' }}>
        <Icon name="flag" size={24} />
      </div>
      <div className="h3" style={{ textAlign: 'center' }}>
        신고하기
      </div>
      <div className="muted" style={{ textAlign: 'center', fontSize: 12.5, marginTop: 6 }}>
        신고 사유를 선택해주세요
      </div>
      <div className="stack g8" style={{ marginTop: 18 }}>
        {REASONS.map((r) => (
          <button key={r.label} className="report-reason" onClick={() => confirm(r.label)}>
            <span className="report-reason-icon">
              <Icon name={r.icon} size={16} />
            </span>
            <span style={{ flex: 1 }}>{r.label}</span>
            <Icon name="chev" size={14} />
          </button>
        ))}
      </div>
      <button className="btn btn-outline btn-full" style={{ marginTop: 16 }} onClick={onClose}>
        취소
      </button>
    </div>
  );
}
