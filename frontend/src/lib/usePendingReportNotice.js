import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import useAdminReportApi from './useAdminReportApi';

const SEEN_KEY = 'universe_admin_report_seen';

function loadSeen() {
  try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; }
}
function saveSeen(id) {
  try { localStorage.setItem(SEEN_KEY, String(id)); } catch { /* storage unavailable */ }
}

/**
 * 관리자 알림의 "새로운 신고 N건". 서버 모드는 실제 검토 대기 신고를, 데모 모드는 로컬 기록을 센다.
 * 가장 최근 대기 신고를 확인(markSeen)하면 새 신고가 들어올 때까지 빨간 점에서 빠진다.
 * refreshKey가 바뀔 때마다(페이지 이동·알림창 열기) 서버 건수를 다시 받는다.
 */
export default function usePendingReportNotice(refreshKey) {
  const { state } = useApp();
  const api = useAdminReportApi();
  const isServer = state.authMode === 'server';
  const enabled = state.isAdmin;
  const [server, setServer] = useState({ count: 0, latestId: 0 });
  const [seen, setSeen] = useState(loadSeen);

  useEffect(() => {
    if (!enabled || !isServer) return undefined;
    const controller = new AbortController();
    api.search({ status: 'PENDING', page: 0, size: 1 }, { signal: controller.signal })
      .then((page) => setServer({ count: page.totalElements ?? 0, latestId: Number(page.content[0]?.reportId) || 0 }))
      .catch(() => {});
    return () => controller.abort();
  }, [api, enabled, isServer, refreshKey]);

  const local = (state.reportRecords || []).filter((r) => r.status === '대기중');
  const count = !enabled ? 0 : isServer ? server.count : local.length;
  const latestId = isServer ? server.latestId : local.length;

  const markSeen = useCallback(() => {
    if (!latestId) return;
    saveSeen(latestId);
    setSeen(latestId);
  }, [latestId]);

  return { count, unseen: count > 0 && latestId > seen, markSeen };
}
