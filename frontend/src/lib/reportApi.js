import { ApiError, createTransport, normalizePage, requireId } from './api.js';

// 공통 모듈(api.js)로 옮긴 요청 코드를 기존 이름으로도 쓸 수 있게 다시 내보낸다.
export { ApiError as ReportApiError, normalizePage, requireId };
export const createReportTransport = createTransport;

function text(value, label, max = 10000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new ApiError(`${label}을(를) 입력해주세요.`, 'INVALID_INPUT');
  }
  return value.trim();
}

export function createReportApi(options = {}) {
  const request = createReportTransport(options);

  async function list(path, query = {}, options = {}) {
    const pageQuery = { page: 0, size: 20, ...query };
    return normalizePage(await request(path, { ...options, query: pageQuery }), pageQuery.page);
  }

  return {
    getMyReports: (query, options) => list('/reports/me', query, options),
    getMyReport: (id, options) => request(`/reports/${requireId(id)}`, options),
    createReport(input, options = {}) {
      if (!['SCAM', 'ABUSIVE', 'SPAM', 'INAPPROPRIATE'].includes(input.reportType)) {
        throw new ApiError('신고 유형을 선택해주세요.', 'INVALID_INPUT');
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
