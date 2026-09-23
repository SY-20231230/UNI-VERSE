export class ReportApiError extends Error {
  constructor(message, code, status = 0) {
    super(message);
    this.name = 'ReportApiError';
    this.code = code;
    this.status = status;
  }
}

export function requireId(value) {
  const id = String(value ?? '');
  if (!/^[1-9]\d*$/.test(id) || (typeof value === 'number' && !Number.isSafeInteger(value))) {
    throw new ReportApiError('실제 서버에 저장된 대상 정보가 필요합니다.', 'INVALID_TARGET');
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

function text(value, label, max = 10000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new ReportApiError(`${label}을(를) 입력해주세요.`, 'INVALID_INPUT');
  }
  return value.trim();
}

export function normalizePage(data, requestedPage = 0) {
  if (!data || !Array.isArray(data.content) || !Number.isInteger(data.totalElements)
    || data.totalElements < 0 || !Number.isInteger(data.totalPages) || data.totalPages < 0) {
    throw new ReportApiError('목록 응답을 확인할 수 없습니다. 다시 시도해주세요.', 'INVALID_RESPONSE');
  }
  const page = data.page ?? data.number ?? requestedPage;
  if (!Number.isInteger(page) || page < 0) throw new ReportApiError('페이지 정보가 올바르지 않습니다.', 'INVALID_RESPONSE');
  return { ...data, page };
}

export function createReportApi({ baseUrl = '/api/v1', getAccessToken = () => null, fetchImpl = globalThis.fetch } = {}) {
  const root = baseUrl.replace(/\/$/, '');

  async function request(path, { method = 'GET', body, signal, query } = {}) {
    const token = getAccessToken();
    if (typeof token !== 'string' || !token.trim()) {
      throw new ReportApiError('로그인 인증을 확인할 수 없습니다. 실제 계정으로 로그인한 뒤 다시 시도해주세요.', 'AUTH_REQUIRED', 401);
    }
    let response;
    try {
      response = await fetchImpl(root + path + queryString(query), {
        method, signal, credentials: 'omit', redirect: 'error',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}`,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new ReportApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', 'NETWORK_ERROR');
    }
    let envelope;
    try { envelope = await response.json(); } catch { envelope = null; }
    if (!response.ok || envelope?.success !== true) {
      const message = response.status === 401 ? '로그인이 만료되었거나 인증되지 않았습니다. 다시 로그인해주세요.'
        : response.status === 403 ? '이 기능을 사용할 권한이 없습니다.'
        : envelope?.error?.message || '요청을 처리하지 못했습니다. 다시 시도해주세요.';
      throw new ReportApiError(message, envelope?.error?.code || 'REQUEST_FAILED', response.status);
    }
    if (!Object.hasOwn(envelope, 'data')) throw new ReportApiError('서버 응답 형식이 올바르지 않습니다.', 'INVALID_RESPONSE');
    return envelope.data;
  }

  async function list(path, query = {}, options = {}) {
    const pageQuery = { page: 0, size: 20, ...query };
    return normalizePage(await request(path, { ...options, query: pageQuery }), pageQuery.page);
  }

  return {
    getMyReports: (query, options) => list('/reports/me', query, options),
    getMyReport: (id, options) => request(`/reports/${requireId(id)}`, options),
    createReport(input, options = {}) {
      if (!['SCAM', 'ABUSIVE', 'SPAM', 'INAPPROPRIATE'].includes(input.reportType)) {
        throw new ReportApiError('신고 유형을 선택해주세요.', 'INVALID_INPUT');
      }
      const body = { targetUserId: requireId(input.targetUserId), reportType: input.reportType,
        description: text(input.description, '신고 내용') };
      for (const key of ['tradeId', 'itemId', 'postId']) {
        if (input[key] !== undefined && input[key] !== null) body[key] = requireId(input[key]);
      }
      if (input.evidences?.length) body.evidences = input.evidences;
      return request('/reports', { ...options, method: 'POST', body });
    },
  };
}
