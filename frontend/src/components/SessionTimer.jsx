import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const active = typeof state.accessToken === 'string' && state.accessToken !== '';
  const [remaining, setRemaining] = useState(() => idleTracker.remaining());
  const [extending, setExtending] = useState(false);
  const [relogging, setRelogging] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const expiredRef = useRef(false);
  const extendingRef = useRef(false);

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
      if (left > 0) {
        if (left <= SESSION_WARN_MS) setPromptOpen(true);
        return;
      }
      if (expiredRef.current || extendingRef.current) return;
      expiredRef.current = true;
      await logout();
      toast('세션이 만료됐어요. 다시 로그인하면 이용을 이어갈 수 있어요');
      navigate('/login', { replace: true, state: { from: location } });
    }

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const timer = setInterval(tick, 1000);
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(timer);
    };
  }, [active, location, logout, navigate, toast]);

  if (!active) return null;

  async function extend() {
    if (extending) return;
    setExtending(true);
    extendingRef.current = true;
    try {
      await authApi.me();
      idleTracker.touch();
      setRemaining(idleTracker.remaining());
      setPromptOpen(false);
      toast('로그인 시간을 30분 연장했어요');
    } catch (error) {
      if (!state.accessToken) {
        await logout();
        navigate('/login', { replace: true, state: { from: location } });
      } else {
        toast(error.message || '세션을 연장하지 못했어요. 다시 로그인해주세요');
      }
    } finally {
      extendingRef.current = false;
      setExtending(false);
    }
  }

  async function signInAgain() {
    if (relogging) return;
    setRelogging(true);
    await logout();
    navigate('/login', { replace: true, state: { from: location } });
  }

  const warn = remaining <= SESSION_WARN_MS;
  return (
    <>
      <button type="button" className={'session-timer' + (warn ? ' warn' : '')} onClick={extend} disabled={extending}
        title="누르면 로그인 시간을 30분 연장해요" aria-label={`로그인 남은 시간 ${formatRemaining(remaining)}, 눌러서 연장`}>
        <Icon name="clock" size={15} />
        <span className="session-timer-time">{formatRemaining(remaining)}</span>
        <span className="session-timer-extend">연장</span>
      </button>
      {promptOpen && <div className="modal-backdrop session-expiry-backdrop">
        <section className="modal-card session-expiry-modal" role="dialog" aria-modal="true" aria-labelledby="session-expiry-title">
          <Icon name="clock" size={24} />
          <h2 className="h3" id="session-expiry-title">로그인 시간이 얼마 남지 않았어요</h2>
          <p className="muted">30분 동안 활동이 없으면 로그아웃돼요. 이용을 계속하려면 연장하거나 다시 로그인해주세요.</p>
          <div className="row g10 session-expiry-actions">
            <button className="btn btn-outline" type="button" onClick={signInAgain} disabled={relogging || extending}>
              {relogging ? '로그아웃 중…' : '다시 로그인'}
            </button>
            <button className="btn btn-primary" type="button" onClick={extend} disabled={extending || relogging}>
              {extending ? '연장 중…' : '30분 연장'}
            </button>
          </div>
        </section>
      </div>}
    </>
  );
}
