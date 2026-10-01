import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../lib/icons';
import { authApi, useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { formatRemaining, idleTracker, SESSION_WARN_MS } from '../lib/sessionIdle';

// 클릭·키 입력 같은 실제 사용만 활동으로 본다. 알림 폴링처럼 저절로 나가는 요청으로는 연장하지 않는다.
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
const TOUCH_THROTTLE_MS = 5000;

/** 상단바 로그인 세션 남은 시간. 무활동 30분이 지나면 로그아웃하고, 누르면 바로 연장한다. */
export default function SessionTimer() {
  const { state, logout } = useApp();
  const { toast } = useUI();
  const navigate = useNavigate();
  const active = typeof state.accessToken === 'string' && state.accessToken !== '';
  const [remaining, setRemaining] = useState(() => idleTracker.remaining());
  const [extending, setExtending] = useState(false);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!active) {
      idleTracker.clear();
      return undefined;
    }
    expiredRef.current = false;
    idleTracker.start();
    setRemaining(idleTracker.remaining());

    let lastTouch = 0;
    function onActivity() {
      const now = Date.now();
      if (now - lastTouch < TOUCH_THROTTLE_MS) return;
      lastTouch = now;
      idleTracker.touch();
      setRemaining(idleTracker.remaining());
    }

    async function tick() {
      const left = idleTracker.remaining();
      setRemaining(left);
      if (left > 0 || expiredRef.current) return;
      expiredRef.current = true;
      await logout();
      toast('30분 동안 활동이 없어 자동으로 로그아웃됐어요');
      navigate('/login', { replace: true });
    }

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const timer = setInterval(tick, 1000);
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(timer);
    };
  }, [active, logout, navigate, toast]);

  if (!active) return null;

  async function extend() {
    if (extending) return;
    setExtending(true);
    idleTracker.touch();
    setRemaining(idleTracker.remaining());
    try {
      // 서버 세션의 마지막 활동 시각도 함께 갱신한다. 이미 끝난 세션이면 여기서 로그아웃 흐름을 탄다.
      await authApi.me();
      toast('로그인 시간을 30분 연장했어요');
    } catch {
      /* 실패는 세션 구독이 처리한다 */
    } finally {
      setExtending(false);
    }
  }

  const warn = remaining <= SESSION_WARN_MS;
  return (
    <button type="button" className={'session-timer' + (warn ? ' warn' : '')} onClick={extend} disabled={extending}
      title="누르면 로그인 시간을 30분 연장해요" aria-label={`로그인 남은 시간 ${formatRemaining(remaining)}, 눌러서 연장`}>
      <Icon name="clock" size={15} />
      <span className="session-timer-time">{formatRemaining(remaining)}</span>
      <span className="session-timer-extend">연장</span>
    </button>
  );
}
