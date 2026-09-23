import Icon from '../lib/icons';

export default function ConfirmModal({ title, desc, confirmLabel = '삭제', onConfirm, onClose }) {
  return (
    <div>
      <div
        className="empty-icon"
        style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--danger-soft)', color: 'var(--danger)', margin: '0 auto 14px' }}
      >
        <Icon name="alert" size={24} />
      </div>
      <div className="h3" style={{ textAlign: 'center' }}>
        {title}
      </div>
      {desc && (
        <div className="muted" style={{ textAlign: 'center', fontSize: 12.5, marginTop: 6 }}>
          {desc}
        </div>
      )}
      <div className="row g10" style={{ marginTop: 18 }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
          취소
        </button>
        <button
          className="btn"
          style={{ flex: 1, background: 'var(--danger)', color: '#fff' }}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
