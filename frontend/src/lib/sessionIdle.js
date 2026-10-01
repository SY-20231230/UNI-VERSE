/** 백엔드 LoginSessionService.IDLE_TIMEOUT 과 같은 값. 이 시간 동안 활동이 없으면 서버 세션도 끝난다. */
export const SESSION_IDLE_MS = 30 * 60 * 1000;
/** 남은 시간이 이보다 적으면 경고 표시로 바꾼다. */
export const SESSION_WARN_MS = 5 * 60 * 1000;

const STORAGE_KEY = 'universe_last_activity';

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * 마지막 활동 시각을 기록하고 남은 세션 시간을 계산한다.
 * 시각은 저장소에 두어 새로고침 후에도 이어지고, 여러 탭이 같은 값을 본다.
 */
export function createIdleTracker({ storage = browserStorage(), now = Date.now, idleMs = SESSION_IDLE_MS } = {}) {
  let memory = null;

  function read() {
    try {
      const saved = Number(storage?.getItem(STORAGE_KEY));
      if (Number.isFinite(saved) && saved > 0) return saved;
    } catch {
      /* storage unavailable */
    }
    return memory;
  }

  function write(value) {
    memory = value;
    try {
      if (value === null) storage?.removeItem(STORAGE_KEY);
      else storage?.setItem(STORAGE_KEY, String(value));
    } catch {
      /* storage unavailable: keep it in memory only */
    }
  }

  return {
    touch: () => write(now()),
    clear: () => write(null),
    /** 기록이 없으면(막 로그인했거나 저장소가 비었으면) 지금부터 센다. */
    start: () => { if (read() === null) write(now()); },
    remaining: () => {
      const last = read();
      return last === null ? idleMs : Math.max(0, last + idleMs - now());
    },
  };
}

export const idleTracker = createIdleTracker();

/** 밀리초를 m:ss 로. */
export function formatRemaining(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
