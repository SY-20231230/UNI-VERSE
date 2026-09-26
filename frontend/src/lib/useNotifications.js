import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { createNotificationApi, NOTIFICATION_POLL_MS } from './notificationApi';

/**
 * 서버 알림 상태. 로그인 토큰이 있을 때만 동작하며(enabled),
 * 탭이 보이는 동안 NOTIFICATION_POLL_MS 간격으로 안 읽은 개수를 폴링한다.
 */
export default function useNotifications() {
  const { state } = useApp();
  const token = state.accessToken;
  const enabled = typeof token === 'string' && token.trim() !== '';
  const api = useMemo(() => createNotificationApi({
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    getAccessToken: () => token,
  }), [token]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshCount = useCallback(async (signal) => {
    try {
      setUnreadCount(await api.unreadCount({ signal }));
    } catch (e) {
      if (e.name !== 'AbortError') setUnreadCount(0);
    }
  }, [api]);

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0);
      setItems([]);
      return undefined;
    }
    const controller = new AbortController();
    const tick = () => {
      if (document.visibilityState === 'visible') refreshCount(controller.signal);
    };
    tick();
    const timer = setInterval(tick, NOTIFICATION_POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [enabled, refreshCount]);

  const loadList = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const page = await api.list({ page: 0, size: 20 });
      setItems(page.content);
      refreshCount();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api, enabled, refreshCount]);

  const markRead = useCallback(async (notification) => {
    if (notification.isRead) return;
    setItems((list) => list.map((n) => (n.notificationId === notification.notificationId ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.markRead(notification.notificationId);
    } catch {
      refreshCount();
    }
  }, [api, refreshCount]);

  const markAllRead = useCallback(async () => {
    setItems((list) => list.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.markAllRead();
    } catch {
      refreshCount();
    }
  }, [api, refreshCount]);

  return { enabled, unreadCount, items, loading, error, loadList, markRead, markAllRead };
}
