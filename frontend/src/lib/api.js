export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  constructor(message, code, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function requireId(value) {
  const id = String(value ?? '');
  if (!/^[1-9]\d*$/.test(id) || (typeof value === 'number' && !Number.isSafeInteger(value))) {
    throw new ApiError('실제 서버에 저장된 대상 정보가 필요합니다.', 'INVALID_TARGET');
  }
  return id;
}

function queryString(values = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  return query.size ? `?${query}` : '';
}

export function normalizePage(data, requestedPage = 0) {
  if (!data || !Array.isArray(data.content) || !Number.isInteger(data.totalElements)
    || data.totalElements < 0 || !Number.isInteger(data.totalPages) || data.totalPages < 0) {
    throw new ApiError('목록 응답을 확인할 수 없습니다. 다시 시도해주세요.', 'INVALID_RESPONSE');
  }
  const page = data.page ?? data.number ?? requestedPage;
  if (!Number.isInteger(page) || page < 0) throw new ApiError('페이지 정보가 올바르지 않습니다.', 'INVALID_RESPONSE');
  return { ...data, page };
}

function hasToken(token) {
  return typeof token === 'string' && token.trim() !== '';
}

/**
 * 백엔드 공통 응답({ success, data, error: { code, message } })을 풀어 data 만 돌려주는 요청 함수를 만든다.
 * - auth: false 인 요청(로그인·회원가입 등)에는 토큰을 싣지 않는다. 만료된 토큰이 실리면 서버가 401로 막는다.
 * - refreshAccessToken 이 있으면 401 응답 시 한 번 재발급받아 다시 요청한다.
 */
export function createTransport({
  baseUrl = API_BASE_URL,
  getAccessToken = () => null,
  refreshAccessToken = null,
  fetchImpl = globalThis.fetch,
} = {}) {
  const root = baseUrl.replace(/\/$/, '');

  async function send(path, { method, body, signal, query }, token) {
    try {
      return await fetchImpl(root + path + queryString(query), {
        method, signal, credentials: 'omit', redirect: 'error',
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new ApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', 'NETWORK_ERROR');
    }
  }

  return async function request(path, { method = 'GET', body, signal, query, auth = true } = {}) {
    let token = null;
    if (auth) {
      token = getAccessToken();
      if (!hasToken(token)) {
        throw new ApiError('로그인 인증을 확인할 수 없습니다. 실제 계정으로 로그인한 뒤 다시 시도해주세요.', 'AUTH_REQUIRED', 401);
      }
    }
    const init = { method, body, signal, query };
    let response = await send(path, init, token);
    if (auth && response.status === 401 && refreshAccessToken) {
      const renewed = await refreshAccessToken();
      if (hasToken(renewed)) response = await send(path, init, renewed);
    }

    let envelope;
    try { envelope = await response.json(); } catch { envelope = null; }
    if (!response.ok || envelope?.success !== true) {
      const serverMessage = envelope?.error?.message || envelope?.message;
      const message = response.status === 401 && auth ? '로그인이 만료되었거나 인증되지 않았습니다. 다시 로그인해주세요.'
        : response.status === 403 && auth ? '이 기능을 사용할 권한이 없습니다.'
        : serverMessage || '요청을 처리하지 못했습니다. 다시 시도해주세요.';
      throw new ApiError(message, envelope?.error?.code || envelope?.code || 'REQUEST_FAILED', response.status);
    }
    if (!Object.hasOwn(envelope, 'data')) throw new ApiError('서버 응답 형식이 올바르지 않습니다.', 'INVALID_RESPONSE');
    return envelope.data;
  };
}
