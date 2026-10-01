import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthApi } from './authApi.js';

test('signup sends the member-entered university name', async () => {
  const calls = [];
  const api = createAuthApi({ fetchImpl: async (url, init) => {
    calls.push({ url, ...init });
    return Response.json({ success: true, data: {}, error: null });
  } });

  await api.signup({
    email: 'member@multiverse.ac.kr', password: 'password1', name: 'Member',
    nickname: 'member', department: '컴퓨터공학과', universityName: '멀티버스대학교',
  });

  assert.equal(calls[0].url, '/api/v1/auth/signup');
  assert.equal(JSON.parse(calls[0].body).universityName, '멀티버스대학교');
});
