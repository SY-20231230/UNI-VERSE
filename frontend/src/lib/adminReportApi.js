import { createReportTransport, normalizePage, requireId, ReportApiError } from './reportApi.js';
import { REPORT_TYPES, REPORT_STATUS } from './reportLabels.js';

export const REPORT_SANCTIONS = { WARNING: '경고', SUSPENSION: '일시정지', BAN: '영구정지' };
export const REPORT_SORTS = { 'createdAt,desc': '최신 접수순', 'createdAt,asc': '오래된 접수순' };

function invalid(message) { throw new ReportApiError(message, 'INVALID_INPUT'); }
function note(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 10000) invalid('처리 사유를 10,000자 이내로 입력해주세요.');
  return value.trim();
}
function dateTime(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value) || Number.isNaN(Date.parse(value))) invalid('조회 기간을 확인해주세요.');
  return value.length === 16 ? `${value}:00` : value;
}
export function reportSearchQuery(input = {}) {
  const query = { page: input.page ?? 0, size: input.size ?? 20, sort: input.sort || 'createdAt,desc' };
  if (!Number.isInteger(query.page) || query.page < 0 || !Number.isInteger(query.size) || query.size < 1 || query.size > 100) invalid('페이지 범위를 확인해주세요.');
  if (!Object.hasOwn(REPORT_SORTS, query.sort)) invalid('정렬 방식을 확인해주세요.');
  if (input.status) { if (!Object.hasOwn(REPORT_STATUS, input.status)) invalid('신고 상태를 확인해주세요.'); query.status = input.status; }
  if (input.reportType) { if (!Object.hasOwn(REPORT_TYPES, input.reportType)) invalid('신고 유형을 확인해주세요.'); query.reportType = input.reportType; }
  if (input.targetUserId) query.targetUserId = requireId(input.targetUserId);
  if (input.from) query.from = dateTime(input.from);
  if (input.to) query.to = dateTime(input.to);
  if (query.from && query.to && query.from > query.to) invalid('시작 시각은 종료 시각보다 늦을 수 없습니다.');
  return query;
}
export function evidenceLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

function requireReport(data, id, status) {
  if (!data || String(data.reportId) !== String(id) || !Object.hasOwn(REPORT_STATUS, data.status)
      || (status && data.status !== status)) {
    throw new ReportApiError('신고 응답을 확인할 수 없습니다. 새로 조회해주세요.', 'INVALID_RESPONSE');
  }
  return data;
}

export function createAdminReportApi(options = {}) {
  const request = createReportTransport(options);
  return {
    async search(input = {}, options = {}) {
      const query = reportSearchQuery(input);
      return normalizePage(await request('/admin/reports', { ...options, query }), query.page);
    },
    getDetail(id, options) {
      return request(`/admin/reports/${requireId(id)}`, options).then((data) => {
        requireReport(data?.report, id);
        if (!data.targetUser || typeof data.description !== 'string' || !Array.isArray(data.evidences)
            || data.evidences.some((evidence) => !evidence || typeof evidence.fileUrl !== 'string')) {
          throw new ReportApiError('신고 상세 응답을 확인할 수 없습니다. 다시 조회해주세요.', 'INVALID_RESPONSE');
        }
        return data;
      });
    },
    approve(id, input, options = {}) {
      const body = { adminNote: note(input.adminNote) };
      if (input.sanctionType) {
        if (!Object.hasOwn(REPORT_SANCTIONS, input.sanctionType)) invalid('제재 유형을 확인해주세요.');
        body.sanctionType = input.sanctionType;
      }
      return request(`/admin/reports/${requireId(id)}/approve`, { ...options, method: 'POST', body })
        .then((data) => { requireReport(data?.report, id, 'PROCESSED'); return data; });
    },
    dismiss(id, input, options = {}) {
      return request(`/admin/reports/${requireId(id)}/dismiss`, { ...options, method: 'POST', body: { adminNote: note(input.adminNote) } })
        .then((data) => requireReport(data, id, 'REJECTED'));
    },
  };
}
