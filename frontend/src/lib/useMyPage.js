import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { createMypageApi } from './mypageApi';
import { sessionApiOptions } from './session';

const EMPTY = { summary: null, posts: [], items: [], loading: false, error: null };

/** 실제 로그인(서버 모드)일 때 마이페이지 요약·내 글·내 상품을 불러온다. 데모 모드에서는 요청하지 않는다. */
export default function useMyPage() {
  const { state } = useApp();
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
    const options = { signal: controller.signal };
    setData((d) => ({ ...d, loading: true, error: null }));
    Promise.all([api.summary(options), api.posts({}, options), api.marketItems({}, options)])
      .then(([summary, posts, items]) => {
        setData({ summary, posts: posts.content, items: items.content, loading: false, error: null });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setData((d) => ({ ...d, loading: false, error: error.message }));
      });
    return () => controller.abort();
  }, [api, enabled]);

  return { enabled, ...data };
}
