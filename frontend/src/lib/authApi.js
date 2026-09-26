import { ApiError, createTransport } from './api.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function invalid(message) {
  throw new ApiError(message, 'INVALID_INPUT');
}

function email(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!EMAIL.test(trimmed) || trimmed.length > 150) invalid('이메일 형식을 확인해주세요.');
  return trimmed;
}

function field(value, label, max) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed || trimmed.length > max) invalid(`${label}을(를) ${max}자 이내로 입력해주세요.`);
  return trimmed;
}

export function createAuthApi(options = {}) {
  const request = createTransport(options);

  return {
    login(input) {
      if (typeof input.password !== 'string' || !input.password) invalid('비밀번호를 입력해주세요.');
      return request('/auth/login', { method: 'POST', auth: false,
        body: { email: email(input.email), password: input.password } });
    },
    signup(input) {
      if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 100) {
        invalid('비밀번호는 8자 이상 100자 이하로 입력해주세요.');
      }
      return request('/auth/signup', { method: 'POST', auth: false, body: {
        email: email(input.email), password: input.password,
        name: field(input.name, '이름', 50), nickname: field(input.nickname, '닉네임', 50),
      } });
    },
    logout: (options = {}) => request('/auth/logout', { ...options, method: 'POST' }),
    me: (options = {}) => request('/users/me', options),
  };
}
