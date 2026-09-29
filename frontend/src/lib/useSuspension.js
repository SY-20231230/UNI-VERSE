import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { createMypageApi } from './mypageApi';
import { sessionApiOptions } from './session';

const DAY = 24 * 60 * 60 * 1000;
// 정지 해제 안내는 해제 후 이 기간 안에 접속했을 때만 띄운다.
const RELEASE_NOTICE_WINDOW = 7 * DAY;

/** 마이페이지 요약 응답에서 정지 정보를 뽑는다. 정지 중이 아니면 null. */
export function suspensionOf(summary) {
  if (summary?.accountStatus !== 'SUSPENDED') return null;
  const from = summary.suspendedFrom ? new Date(summary.suspendedFrom).getTime() : null;
  const until = summary.suspendedUntil ? new Date(summary.suspendedUntil).getTime() : null;
  if (until != null && until <= Date.now()) return null;
  return { from, until, days: from != null && until != null ? Math.max(1, Math.round((until - from) / DAY)) : null };
}

/** 최근에 정지가 풀렸으면 { userId, at }, 아니면 null. */
function releaseOf(summary) {
  const at = summary?.suspensionReleasedAt ? new Date(summary.suspensionReleasedAt).getTime() : null;
  if (at == null || Number.isNaN(at) || Date.now() - at > RELEASE_NOTICE_WINDOW) return null;
  return { userId: summary.userId, at };
}

function stateOf(summary) {
  return { suspension: suspensionOf(summary), release: releaseOf(summary) };
}

const EMPTY = { suspension: null, release: null };

// 토큰별로 한 번만 조회한다. 마이페이지가 요약을 새로 받으면 rememberSuspension으로 갱신한다.
const cache = new Map();
export function rememberSuspension(token, summary) {
  if (token) cache.set(token, Promise.resolve(stateOf(summary)));
}

/** 로그인한 회원의 { suspension, release }. 서버 모드에서만 조회한다. */
export function useSuspensionState() {
  const { state } = useApp();
  const token = state.accessToken;
  const enabled = state.authMode === 'server' && typeof token === 'string' && token !== '';
  const [info, setInfo] = useState(EMPTY);

  useEffect(() => {
    if (!enabled) {
      setInfo(EMPTY);
      return undefined;
    }
    if (!cache.has(token)) {
      cache.set(token, createMypageApi(sessionApiOptions).summary().then(stateOf).catch(() => EMPTY));
    }
    let active = true;
    cache.get(token).then((value) => { if (active) setInfo(value); });
    return () => { active = false; };
  }, [enabled, token]);

  return info;
}

/** 로그인한 회원이 정지 중이면 { from, until, days }, 아니면 null. */
export default function useSuspension() {
  return useSuspensionState().suspension;
}
