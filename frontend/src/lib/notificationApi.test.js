import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationApi, notificationMeta } from './notificationApi.js';

function fixture(data) {
  const calls = [];
  const api = createNotificationApi({ getAccessToken: () => 'test-token', fetchImpl: async (url, options) => {
    calls.push({ url, ...options });
    return Response.json({ success: true, data, error: null });
  } });
  return { api, calls };
}

test('does not poll without a login token', async () => {
  let called = false;
  const api = createNotificationApi({ fetchImpl: () => { called = true; } });
  await assert.rejects(api.unreadCount(), { code: 'AUTH_REQUIRED' });
  assert.equal(called, false);
});

test('list and read actions use the notification routes with bearer auth', async () => {
  const { api, calls } = fixture({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
  await api.list();
  await api.markRead(5);
  await api.markAllRead();
  await api.remove('5');
  assert.deepEqual(calls.map((c) => `${c.method} ${c.url}`), [
    'GET /api/v1/notifications?page=0&size=20',
    'PATCH /api/v1/notifications/5/read',
    'PATCH /api/v1/notifications/read-all',
    'DELETE /api/v1/notifications/5',
  ]);
  assert.equal(calls[0].headers.Authorization, 'Bearer test-token');
});

test('unread count falls back to zero on a malformed payload', async () => {
  assert.equal(await fixture({ unreadCount: 3 }).api.unreadCount(), 3);
  assert.equal(await fixture({ unreadCount: -1 }).api.unreadCount(), 0);
  assert.equal(await fixture({}).api.unreadCount(), 0);
});

test('invalid ids are rejected before any request', () => {
  const { api } = fixture({});
  assert.throws(() => api.markRead('../1'), { code: 'INVALID_TARGET' });
});

test('each type links to its target and never builds a path from a bad id', () => {
  assert.deepEqual(notificationMeta({ type: 'COMMENT', targetId: 7 }), { icon: 'board', path: '/community/7' });
  assert.equal(notificationMeta({ type: 'FAVORITE_ITEM_PRICE', targetId: 3 }).path, '/market/3');
  assert.equal(notificationMeta({ type: 'CHAT_ACCEPTED', targetId: 9 }).path, '/chat/9');
  assert.equal(notificationMeta({ type: 'SANCTION', targetId: null }).path, '/mypage');
  assert.equal(notificationMeta({ type: 'COMMENT', targetId: null }).path, null);
  assert.equal(notificationMeta({ type: 'UNKNOWN', targetId: 1 }).path, null);
});
