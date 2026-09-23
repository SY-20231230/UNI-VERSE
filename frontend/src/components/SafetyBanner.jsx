import Icon from '../lib/icons';

export default function SafetyBanner({ onClose }) {
  return (
    <div className="safety-banner">
      {onClose && (
        <button className="closex iconbtn ghost" style={{ position: 'absolute', right: 6, top: 6, width: 26, height: 26 }} onClick={onClose}>
          <Icon name="x" size={13} />
        </button>
      )}
      <Icon name="shield" size={16} />
      <div>
        <b>안전거래 안내</b>
        카카오톡·오픈채팅 등 외부 메신저 이동, 선입금 요구, 택배거래만 요구하는 경우 사기 위험이 있어요. 의심스러운 상황엔 거래를 중단하고 신고해주세요.
      </div>
    </div>
  );
}
