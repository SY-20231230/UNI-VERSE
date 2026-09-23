import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminReportApi, reportSearchQuery, evidenceLink } from './adminReportApi.js';

function fixture(data, status = 200) {
  const calls = [];
  const api = createAdminReportApi({ getAccessToken: () => 'admin-test-token', fetchImpl: async (url, options) => {
    calls.push({ url, ...options });
    let payload = data;
    if (payload === undefined) {
      const report = { reportId: 7, status: url.endsWith('/dismiss') ? 'REJECTED' : 'PROCESSED' };
      payload = url.endsWith('/approve') ? { report, trustScore: 30 }
        : url.endsWith('/dismiss') ? report : /\/reports\/7$/.test(url)
          ? { report, description: 'test', targetUser: { userId: 2 }, evidences: [] }
          : { content: [], page: 0, size: 20, totalPages: 0, totalElements: 0 };
    }
    return Response.json({ success: status < 400, data: payload, error: status >= 400 ? { code: 'REPORT_ALREADY_PROCESSED', message: '이미 처리된 신고입니다.' } : null }, { status });
  } });
  return { api, calls };
}

test('admin list sends only CSV filters and bearer token', async () => {
  const { api, calls } = fixture();
  await api.search({ status: 'PENDING', reportType: 'SCAM', targetUserId: '42', from: '2026-09-01T00:00', to: '2026-09-23T23:59', page: 2, size: 10, sort: 'createdAt,asc', adminId: 99, currentUserId: 88 });
  const url = new URL(calls[0].url, 'https://example.com');
  assert.equal(url.pathname, '/api/v1/admin/reports');
  assert.equal(url.searchParams.get('targetUserId'), '42');
  assert.equal(url.searchParams.get('from'), '2026-09-01T00:00:00');
  assert.equal(url.searchParams.get('to'), '2026-09-23T23:59:00');
  assert.equal(url.searchParams.get('sort'), 'createdAt,asc');
  assert.equal(url.searchParams.get('status'), 'PENDING');
  assert.equal(url.searchParams.get('reportType'), 'SCAM');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.has('adminId'), false);
  assert.equal(url.searchParams.has('currentUserId'), false);
  assert.equal(calls[0].headers.Authorization, 'Bearer admin-test-token');
});

test('admin detail uses existing route', async () => {
  const { api, calls } = fixture(); await api.getDetail(7);
  assert.equal(calls[0].url, '/api/v1/admin/reports/7');
});

test('approval whitelists note and optional sanction, never identity or period', async () => {
  const { api, calls } = fixture();
  await api.approve(7, { adminNote: '  確認  ', sanctionType: 'SUSPENSION', adminId: 9, userId: 1, days: 3, endAt: '2026-12-01' });
  assert.equal(calls[0].url, '/api/v1/admin/reports/7/approve');
  assert.equal(calls[0].method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].body), { adminNote: '確認', sanctionType: 'SUSPENSION' });
});

test('approval can omit sanctions and supports all existing sanction enums', async () => {
  const { api, calls } = fixture();
  await api.approve('7', { adminNote: 'confirmed' });
  assert.deepEqual(JSON.parse(calls[0].body), { adminNote: 'confirmed' });
  for (const sanctionType of ['WARNING', 'SUSPENSION', 'BAN']) await api.approve(7, { adminNote: 'confirmed', sanctionType });
  assert.equal(calls.length, 4);
});

test('dismiss sends only adminNote to dismiss endpoint', async () => {
  const { api, calls } = fixture();
  await api.dismiss(7, { adminNote: 'insufficient evidence', sanctionType: 'BAN', adminId: 9 });
  assert.equal(calls[0].url, '/api/v1/admin/reports/7/dismiss');
  assert.deepEqual(JSON.parse(calls[0].body), { adminNote: 'insufficient evidence' });
});

test('rejects invalid notes ids and unsupported sanctions before network', () => {
  const { api, calls } = fixture();
  assert.throws(() => api.approve(7, { adminNote: ' ' }), { code: 'INVALID_INPUT' });
  assert.throws(() => api.dismiss(7, { adminNote: 'x'.repeat(10001) }), { code: 'INVALID_INPUT' });
  assert.throws(() => api.approve(7, { adminNote: 'reason', sanctionType: 'suspend_3' }), { code: 'INVALID_INPUT' });
  assert.throws(() => api.getDetail('rp1'), { code: 'INVALID_TARGET' });
  assert.equal(calls.length, 0);
});

test('rejects reversed dates invalid paging status type and arbitrary sorting', () => {
  for (const input of [{ from: '2026-09-24T12:00', to: '2026-09-23T12:00' }, { from: 'oops' }, { size: 101 }, { page: -1 }, { status: '대기중' }, { reportType: 'UNKNOWN' }, { sort: 'targetUser.password,asc' }]) {
    assert.throws(() => reportSearchQuery(input), { code: 'INVALID_INPUT' });
  }
});

test('no token never falls back to demo admin data', async () => {
  const api = createAdminReportApi({ fetchImpl: () => { throw new Error('must not call'); } });
  await assert.rejects(api.search(), { code: 'AUTH_REQUIRED' });
});

test('401 403 and concurrent processing failure propagate to UI', async () => {
  for (const status of [401, 403, 409]) {
    const { api } = fixture(null, status);
    await assert.rejects(api.approve(7, { adminNote: 'reason' }), { status });
  }
});

test('cancelled list requests remain cancellable', async () => {
  const api = createAdminReportApi({ getAccessToken: () => 'test', fetchImpl: async () => { throw new DOMException('cancelled', 'AbortError'); } });
  await assert.rejects(api.search(), { name: 'AbortError' });
});

test('evidence links allow only https without embedded credentials', () => {
  assert.equal(evidenceLink('https://example.com/evidence/a.png'), 'https://example.com/evidence/a.png');
  for (const value of ['javascript:alert(1)', 'data:text/html,unsafe', 'http://example.com', '/relative', 'https://user:password@example.com']) assert.equal(evidenceLink(value), null);
});


test('malformed detail and processing responses are rejected instead of crashing or claiming success', async () => {
  const { api } = fixture({});
  await assert.rejects(api.getDetail(7), { code: 'INVALID_RESPONSE' });
  await assert.rejects(api.approve(7, { adminNote: 'reviewed' }), { code: 'INVALID_RESPONSE' });
  await assert.rejects(api.dismiss(7, { adminNote: 'reviewed' }), { code: 'INVALID_RESPONSE' });
  const other = fixture({ report: { reportId: 8, status: 'PROCESSED' } });
  await assert.rejects(other.api.approve(7, { adminNote: 'reviewed' }), { code: 'INVALID_RESPONSE' });
});
