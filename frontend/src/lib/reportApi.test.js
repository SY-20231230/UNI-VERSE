import test from 'node:test';
import assert from 'node:assert/strict';
import { createReportApi, normalizePage, requireId } from './reportApi.js';

const page = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 };
function fixture(data = page) {
  const calls = [];
  const api = createReportApi({ getAccessToken: () => 'test-token', fetchImpl: async (url, options) => {
    calls.push({ url, ...options });
    return Response.json({ success: true, data, error: null });
  } });
  return { api, calls };
}

test('does not send a request without a login token', async () => {
  let called = false;
  const api = createReportApi({ fetchImpl: () => { called = true; } });
  await assert.rejects(api.getMyReports(), { code: 'AUTH_REQUIRED' });
  assert.equal(called, false);
});

test('registration uses the CSV route and bearer header', async () => {
  const { api, calls } = fixture({ reportId: 9 });
  await api.createReport({ targetUserId: '2', itemId: '3', reportType: 'SCAM', description: 'reason' });
  assert.equal(calls[0].url, '/api/v1/reports');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].headers.Authorization, 'Bearer test-token');
  assert.equal(calls[0].credentials, 'omit');
});

test('reporter identity and chatId are never copied from the browser payload', async () => {
  const { api, calls } = fixture();
  await api.createReport({ targetUserId: '2', itemId: '3', reportType: 'SCAM', description: '  reason  ', reporterId: 77, userId: 88, currentUserId: 99, adminId: 1, chatId: 'fake-chat' });
  assert.deepEqual(JSON.parse(calls[0].body), { targetUserId: '2', itemId: '3', reportType: 'SCAM', description: 'reason' });
});

test('sample ids and unsafe numbers are rejected instead of guessed', () => {
  for (const id of ['me', 'u2', 'm3', '../2', 0, -1, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => requireId(id), { code: 'INVALID_TARGET' });
  assert.equal(requireId('9223372036854775807'), '9223372036854775807');
});

test('type and description must be valid', () => {
  const { api } = fixture();
  assert.throws(() => api.createReport({ targetUserId: 2, reportType: 'SCAM', description: '  ' }), { code: 'INVALID_INPUT' });
  assert.throws(() => api.createReport({ targetUserId: 2, reportType: 'UNKNOWN', description: 'reason' }), { code: 'INVALID_INPUT' });
});

test('preserves optional report references and evidence urls', async () => {
  const { api, calls } = fixture();
  await api.createReport({ targetUserId: 2, tradeId: 3, itemId: 4, postId: 5, reportType: 'SPAM', description: 'reason', evidences: ['https://example.com/evidence.png'] });
  const body = JSON.parse(calls[0].body);
  assert.equal(body.tradeId, '3'); assert.equal(body.itemId, '4'); assert.equal(body.postId, '5');
  assert.equal(body.evidences.length, 1);
});

test('my reports preserves pagination and status', async () => {
  const { api, calls } = fixture({ ...page, page: 2 });
  const result = await api.getMyReports({ page: 2, size: 10, status: 'PENDING' });
  assert.equal(calls[0].url, '/api/v1/reports/me?page=2&size=10&status=PENDING');
  assert.equal(result.page, 2);
});

test('detail uses the report id in the path', async () => {
  const { api, calls } = fixture({ report: { reportId: 3 } });
  await api.getMyReport(3);
  assert.equal(calls[0].url, '/api/v1/reports/3');
  assert.equal(calls[0].method, 'GET');
});

test('server failures do not become successful submissions', async () => {
  const api = createReportApi({ getAccessToken: () => 'test', fetchImpl: async () => Response.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: '접근 권한이 없습니다.' } }, { status: 403 }) });
  await assert.rejects(api.createReport({ targetUserId: 2, reportType: 'SCAM', description: 'reason' }), { code: 'FORBIDDEN', status: 403 });
});

test('401 is propagated instead of reading demo reports', async () => {
  const api = createReportApi({ getAccessToken: () => 'test', fetchImpl: async () => Response.json({}, { status: 401 }) });
  await assert.rejects(api.getMyReports(), { status: 401 });
});

test('HTML fallback and invalid page envelopes are rejected', async () => {
  const api = createReportApi({ getAccessToken: () => 'test', fetchImpl: async () => new Response('<html>Vite fallback</html>') });
  await assert.rejects(api.getMyReports(), { code: 'REQUEST_FAILED' });
  assert.throws(() => normalizePage({}), { code: 'INVALID_RESPONSE' });
});

test('network failures and cancellation remain distinct', async () => {
  const offline = createReportApi({ getAccessToken: () => 'test', fetchImpl: async () => { throw new TypeError('offline'); } });
  await assert.rejects(offline.getMyReports(), { code: 'NETWORK_ERROR' });
  const cancelled = createReportApi({ getAccessToken: () => 'test', fetchImpl: async () => { throw new DOMException('aborted', 'AbortError'); } });
  await assert.rejects(cancelled.getMyReports(), { name: 'AbortError' });
});

test('configured base URL does not change the contract suffix', async () => {
  let actual;
  const api = createReportApi({ baseUrl: 'https://api.example.com/api/v1/', getAccessToken: () => 'test', fetchImpl: async (url) => { actual = url; return Response.json({ success: true, data: {} }); } });
  await api.getMyReport(2);
  assert.equal(actual, 'https://api.example.com/api/v1/reports/2');
});
