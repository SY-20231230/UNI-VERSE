/** 채팅방 거래 상태가 바뀌었을 때 띄우는 알림 팝업 (거래 요청 도착·수락·완료 등) */
const TONES = {
  accent: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  success: { bg: 'var(--success-soft)', fg: 'var(--success)' },
  danger: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
};

export default function TradeStatusModal({ emoji, title, desc, tone = 'accent', itemTitle, price, actionLabel, onAction, closeLabel = '확인', onClose }) {
  const color = TONES[tone] || TONES.accent;
  return (
    <div className="trade-modal">
      <div className="trade-modal-icon" style={{ background: color.bg, color: color.fg }} aria-hidden="true">{emoji}</div>
      <div className="h3" style={{ textAlign: 'center' }}>{title}</div>
      {desc && <div className="muted trade-modal-desc">{desc}</div>}
      {itemTitle && (
        <div className="trade-modal-item">
          <strong>{itemTitle}</strong>
          {price != null && <span>{Number(price).toLocaleString()}원</span>}
        </div>
      )}
      <div className="row g10" style={{ marginTop: 20 }}>
        {onAction && (
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>{closeLabel === '확인' ? '나중에' : closeLabel}</button>
        )}
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => { onClose(); onAction?.(); }}
        >
          {onAction ? actionLabel : closeLabel}
        </button>
      </div>
    </div>
  );
}
