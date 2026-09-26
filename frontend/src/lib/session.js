import { API_BASE_URL, createTransport } from './api.js';

const STORAGE_KEY = 'universe_session';

function hasToken(token) {
  return typeof token === 'string' && token.trim() !== '';
}

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * 로그인 토큰 보관과 재발급을 맡는다.
 * 재발급은 동시에 여러 요청이 401을 받아도 한 번만 보내고, 서버가 거절하면 세션을 비워 로그아웃시킨다.
 */
export function createSession({ storage = browserStorage(), fetchImpl = globalThis.fetch, baseUrl = API_BASE_URL } = {}) {
  const listeners = new Set();
  let current = read();
  let refreshing = null;

  function read() {
    try {
      const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
      return saved && hasToken(saved.accessToken) && hasToken(saved.refreshToken)
        ? { accessToken: saved.accessToken, refreshToken: saved.refreshToken } : null;
    } catch {
      return null;
    }
  }

  function set(tokens) {
    current = tokens && hasToken(tokens.accessToken) && hasToken(tokens.refreshToken)
      ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } : null;
    try {
      if (current) storage?.setItem(STORAGE_KEY, JSON.stringify(current));
      else storage?.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable: keep the session in memory only */
    }
    listeners.forEach((listener) => listener(current));
  }

  function refreshAccessToken() {
    if (!current) return Promise.resolve(null);
    if (!refreshing) {
      const { refreshToken } = current;
      refreshing = createTransport({ baseUrl, fetchImpl })('/auth/refresh', {
        method: 'POST', body: { refreshToken }, auth: false,
      }).then((tokens) => {
        set(tokens);
        return current?.accessToken ?? null;
      }).catch((error) => {
        // 네트워크 오류는 일시적일 수 있으므로 서버가 명시적으로 거절했을 때만 로그아웃한다.
        if (error.status >= 400 && current?.refreshToken === refreshToken) set(null);
        return null;
      }).finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }

  return {
    getAccessToken: () => current?.accessToken ?? null,
    isActive: () => current !== null,
    set,
    clear: () => set(null),
    refreshAccessToken,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const session = createSession();

/** 앱 전역 세션을 쓰는 API 모듈 공통 옵션. 토큰 만료 시 자동 재발급된다. */
export const sessionApiOptions = {
  baseUrl: API_BASE_URL,
  getAccessToken: () => session.getAccessToken(),
  refreshAccessToken: () => session.refreshAccessToken(),
};
