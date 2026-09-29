import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransport } from './api.js';
import { createSession } from './session.js';
import { createAuthApi } from './authApi.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
    data,
  };
}

const tokens = (n) => ({ accessToken: `access-${n}`, refreshToken: `refresh-${n}` });

test('expired access token is refreshed once and the request retried', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, auth: init.headers.Authorization, body: init.body });
    if (url.endsWith('/auth/refresh')) return Response.json({ success: true, data: tokens(2), error: null });
    if (init.headers.Authorization === 'Bearer access-1') return Response.json({}, { status: 401 });
    return Response.json({ success: true, data: { ok: true }, error: null });
  };
  const session = createSession({ storage: memoryStorage(), fetchImpl });
  session.set(tokens(1));
  const request = createTransport({ fetchImpl, getAccessToken: session.getAccessToken, refreshAccessToken: session.refreshAccessToken });

  const results = await Promise.all([request('/users/me'), request('/notifications/unread-count')]);

  assert.deepEqual(results, [{ ok: true }, { ok: true }]);
  assert.equal(calls.filter((c) => c.url.endsWith('/auth/refresh')).length, 1);
  assert.equal(calls.find((c) => c.url.endsWith('/auth/refresh')).auth, undefined);
  assert.equal(session.getAccessToken(), 'access-2');
});

test('rejected refresh ends the session and notifies listeners', async () => {
  const fetchImpl = async () => Response.json({ success: false, data: null, error: { code: 'INVALID_REFRESH_TOKEN', message: 'x' } }, { status: 401 });
  const storage = memoryStorage();
  const session = createSession({ storage, fetchImpl });
  session.set(tokens(1));
  let notified = 'untouched';
  session.subscribe((current) => { notified = current; });

  assert.equal(await session.refreshAccessToken(), null);
  assert.equal(session.isActive(), false);
  assert.equal(notified, null);
  assert.equal(storage.data.universe_session, undefined);
});

test('network failure during refresh keeps the session', async () => {
  const session = createSession({ storage: memoryStorage(), fetchImpl: async () => { throw new TypeError('offline'); } });
  session.set(tokens(1));
  assert.equal(await session.refreshAccessToken(), null);
  assert.equal(session.isActive(), true);
});

test('session survives reload but ignores malformed storage', () => {
  const storage = memoryStorage();
  createSession({ storage }).set(tokens(1));
  assert.equal(createSession({ storage }).getAccessToken(), 'access-1');
  assert.equal(createSession({ storage: memoryStorage({ universe_session: '{"accessToken":""}' }) }).isActive(), false);
  assert.equal(createSession({ storage: memoryStorage({ universe_session: 'not json' }) }).isActive(), false);
});

test('login and signup never send a bearer token and trim input', async () => {
  const calls = [];
  const api = createAuthApi({ getAccessToken: () => 'stale-token', fetchImpl: async (url, init) => {
    calls.push({ url, ...init });
    return Response.json({ success: true, data: tokens(1), error: null });
  } });
  await api.login({ email: ' a@test.example ', password: 'pw' });
  await api.signup({ email: 'a@test.example', password: 'password1', name: ' 이름 ', nickname: '닉' });
  assert.equal(calls[0].url, '/api/v1/auth/login');
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(calls[0].body), { email: 'a@test.example', password: 'pw' });
  assert.equal(calls[1].headers.Authorization, undefined);
  assert.equal(JSON.parse(calls[1].body).name, '이름');
});

test('auth input is validated before any request', () => {
  const api = createAuthApi({ fetchImpl: () => assert.fail('should not call the server') });
  assert.throws(() => api.login({ email: 'nope', password: 'pw' }), { code: 'INVALID_INPUT' });
  assert.throws(() => api.signup({ email: 'a@test.example', password: 'short', name: 'n', nickname: 'n' }), { code: 'INVALID_INPUT' });
  assert.throws(() => api.signup({ email: 'a@test.example', password: 'password1', name: ' ', nickname: 'n' }), { code: 'INVALID_INPUT' });
});

test('login failure surfaces the server message', async () => {
  const api = createAuthApi({ fetchImpl: async () => Response.json(
    { success: false, data: null, error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' } }, { status: 401 }) });
  await assert.rejects(api.login({ email: 'a@test.example', password: 'wrong' }),
    { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
});
