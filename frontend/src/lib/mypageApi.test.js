import test from 'node:test';
import assert from 'node:assert/strict';
import { createMypageApi } from './mypageApi.js';

const page = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 };

test('my page reads use the CSV routes with bearer auth and bounded paging', async () => {
  const calls = [];
  const api = createMypageApi({ getAccessToken: () => 'test-token', fetchImpl: async (url, init) => {
    calls.push({ url, ...init });
    return Response.json({ success: true, data: url.endsWith('/mypage') ? { userId: 1 } : page, error: null });
  } });
  await api.summary();
  await api.posts();
  await api.marketItems({ page: 1, size: 5 });
  await api.trustHistory();
  assert.deepEqual(calls.map((c) => c.url), [
    '/api/v1/mypage',
    '/api/v1/mypage/posts?page=0&size=20',
    '/api/v1/mypage/market-items?page=1&size=5',
    '/api/v1/mypage/trust-history?page=0&size=20',
  ]);
  assert.equal(calls[0].headers.Authorization, 'Bearer test-token');
});

test('my page is not requested without a login token', async () => {
  const api = createMypageApi({ fetchImpl: () => assert.fail('should not call the server') });
  await assert.rejects(api.summary(), { code: 'AUTH_REQUIRED' });
});
