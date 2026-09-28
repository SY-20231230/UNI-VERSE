import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { createMypageApi } from './mypageApi';
import { sessionApiOptions } from './session';

const EMPTY = { summary: null, posts: [], items: [], loading: false, error: null };

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
    const options = { signal: controller.signal };
    setData((d) => ({ ...d, loading: true, error: null }));
    Promise.all([api.summary(options), api.posts({}, options), api.marketItems({}, options)])
      .then(([summary, posts, items]) => {
        setData({ summary, posts: posts.content, items: items.content, loading: false, error: null });
        if (summary && summary.trustScore !== undefined) {
          updateTrustScore(summary.trustScore);
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setData((d) => ({ ...d, loading: false, error: error.message }));
      });
    return () => controller.abort();
  }, [api, enabled, updateTrustScore]);

  return { enabled, ...data };
}
