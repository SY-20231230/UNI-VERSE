import Icon from '../lib/icons';

export default function ManageSheet({ onEdit, onDelete, onClose }) {
  return (
    <div className="stack g8">
      <button
        className="report-reason"
        onClick={() => {
          onClose();
          onEdit();
        }}
      >
        <span className="report-reason-icon">
          <Icon name="edit" size={16} />
        </span>
        <span style={{ flex: 1 }}>수정하기</span>
        <Icon name="chev" size={14} />
      </button>
      <button
        className="report-reason"
        onClick={() => {
          onClose();
          onDelete();
        }}
      >
        <span className="report-reason-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          <Icon name="x" size={16} />
        </span>
        <span style={{ flex: 1, color: 'var(--danger)' }}>삭제하기</span>
      </button>
    </div>
  );
}
