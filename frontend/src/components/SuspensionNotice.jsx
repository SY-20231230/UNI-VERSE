import { useState } from 'react';
import Icon from '../lib/icons';
import { formatDate, hm } from '../lib/format';

const RELEASE_SEEN_KEY = 'universe_suspension_release_seen';

function releaseSeen(release) {
  try { return localStorage.getItem(`${RELEASE_SEEN_KEY}_${release.userId}`) === String(release.at); } catch { return false; }
}
function markReleaseSeen(release) {
  try { localStorage.setItem(`${RELEASE_SEEN_KEY}_${release.userId}`, String(release.at)); } catch { /* storage unavailable */ }
}

/**
 * 메인 상단 계정 안내. useSuspensionState의 { suspension, release }를 받는다.
 * - 정지 중: 닫아도 새로고침하면 다시 뜬다.
 * - 정지 해제: 한 번 닫으면 그 해제 건으로는 다시 뜨지 않는다.
 */
export default function SuspensionNotice({ suspension, release, style }) {
  const [closed, setClosed] = useState(false);
  const showRelease = !suspension && release && !releaseSeen(release);
  if (closed || (!suspension && !showRelease)) return null;

  function close() {
    if (showRelease) markReleaseSeen(release);
    setClosed(true);
  }

  return (
    <div className={'suspension-notice' + (showRelease ? ' released' : '')} role="status" style={style}>
      <Icon name={showRelease ? 'check' : 'shield'} size={18} />
      {showRelease ? (
        <div style={{ flex: 1 }}>
          <strong>이용 정지가 해제됐어요</strong>
          <span>{formatDate(release.at)} {hm(release.at)}부터 모든 기능을 다시 쓸 수 있어요. 운영 정책을 지켜 즐겁게 이용해 주세요.</span>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          <strong>
            {suspension.days ? `${suspension.days}일 이용 정지 중이에요` : '이용 정지 중이에요'}
            {suspension.until && ` · ${formatDate(suspension.until)} ${hm(suspension.until)}까지`}
          </strong>
          <span>정지 기간에는 글쓰기, 댓글, 거래, 채팅 같은 기능을 쓸 수 없고 조회만 할 수 있어요.</span>
        </div>
      )}
      <button type="button" className="suspension-notice-close" aria-label="안내 닫기" onClick={close}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
