import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { createMypageApi } from './mypageApi';
import { sessionApiOptions } from './session';
import { rememberSuspension } from './useSuspension';

export const MYPAGE_PAGE_SIZE = 5;
const EMPTY = { summary: null, loading: false, error: null };
const EMPTY_LIST = { content: [], page: 0, totalPages: 0, totalElements: 0, loading: false };

/** 목록 하나를 페이지 단위로 불러온다. 한 탭의 페이지를 넘겨도 다른 탭은 다시 받지 않는다. */
function usePagedList(api, method, enabled) {
  const [page, setPage] = useState(0);
  const [list, setList] = useState(EMPTY_LIST);

  useEffect(() => {
    if (!enabled) {
      setList(EMPTY_LIST);
      return undefined;
    }
    const controller = new AbortController();
    setList((l) => ({ ...l, loading: true }));
    api[method]({ page, size: MYPAGE_PAGE_SIZE }, { signal: controller.signal })
      .then((res) => {
        // 마지막 페이지의 항목이 없어졌으면 한 페이지 앞으로 돌아간다.
        if (res.content.length === 0 && page > 0) setPage(Math.max(0, res.totalPages - 1));
        else setList({ content: res.content, page: res.page, totalPages: res.totalPages, totalElements: res.totalElements, loading: false });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setList((l) => ({ ...l, loading: false }));
      });
    return () => controller.abort();
  }, [api, method, enabled, page]);

  return { ...list, goPage: setPage };
}

/** 마이페이지 요약 + 목록 3개(글·등록 거래·찜). */
export default function useMyPage() {
  const { state, updateTrustScore } = useApp();
  const token = state.accessToken;
  const enabled = state.authMode === 'server' && typeof token === 'string' && token !== '';
  const api = useMemo(() => createMypageApi(sessionApiOptions), [token]);
  const [data, setData] = useState(EMPTY);

  useEffect(() => {
    if (!enabled) {
      setData(EMPTY);
      return undefined;
    }
    const controller = new AbortController();
    setData((d) => ({ ...d, loading: true, error: null }));
    api.summary({ signal: controller.signal })
      .then((summary) => {
        rememberSuspension(token, summary);
        setData({ summary, loading: false, error: null });
        if (summary && summary.trustScore !== undefined) updateTrustScore(summary.trustScore);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setData((d) => ({ ...d, loading: false, error: error.message }));
      });
    return () => controller.abort();
  }, [api, enabled, token, updateTrustScore]);

  const posts = usePagedList(api, 'posts', enabled);
  const items = usePagedList(api, 'marketItems', enabled);
  const favorites = usePagedList(api, 'favoriteItems', enabled);

  return { enabled, ...data, posts, items, favorites };
}
