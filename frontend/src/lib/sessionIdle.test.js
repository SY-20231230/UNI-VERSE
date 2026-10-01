import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdleTracker, formatRemaining, SESSION_IDLE_MS } from './sessionIdle.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
    data,
  };
}

test('remaining time counts down from the last activity and touch resets it', () => {
  let t = 1_000_000;
  const tracker = createIdleTracker({ storage: memoryStorage(), now: () => t });
  tracker.start();
  t += 10 * 60 * 1000;
  assert.equal(tracker.remaining(), SESSION_IDLE_MS - 10 * 60 * 1000);
  tracker.touch();
  assert.equal(tracker.remaining(), SESSION_IDLE_MS);
  t += SESSION_IDLE_MS + 5;
  assert.equal(tracker.remaining(), 0);
});

test('start keeps an earlier activity so a reload does not extend the session', () => {
  let t = 5_000_000;
  const storage = memoryStorage({ universe_last_activity: String(t - 20 * 60 * 1000) });
  const tracker = createIdleTracker({ storage, now: () => t });
  tracker.start();
  assert.equal(tracker.remaining(), 10 * 60 * 1000);
  tracker.clear();
  assert.equal(storage.data.universe_last_activity, undefined);
});

test('remaining time is shown as m:ss', () => {
  assert.equal(formatRemaining(SESSION_IDLE_MS), '30:00');
  assert.equal(formatRemaining(61_000), '1:01');
  assert.equal(formatRemaining(400), '0:01');
  assert.equal(formatRemaining(-5), '0:00');
});
