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
        department: field(input.department, '학과', 100),
        universityName: field(input.universityName, '대학교명', 100),
      } });
    },
    sendEmailCode(value) {
      return request('/auth/email-verifications', { method: 'POST', auth: false, body: { email: email(value) } });
    },
    confirmEmailCode(value, code) {
      const trimmed = typeof code === 'string' ? code.trim() : '';
      if (!/^\d{6}$/.test(trimmed)) invalid('인증번호 6자리를 입력해주세요.');
      return request('/auth/email-verifications/confirm', { method: 'POST', auth: false,
        body: { email: email(value), code: trimmed } });
    },
    logout: (options = {}) => request('/auth/logout', { ...options, method: 'POST' }),
    me: (options = {}) => request('/users/me', options),
    getUserProfile: (id, options = {}) => request(`/users/${id}/profile`, options),
  };
}
