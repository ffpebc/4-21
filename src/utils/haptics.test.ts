import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHapticsEnabled,
  getSoundFeedbackEnabled,
  triggerHaptic,
  haptics,
} from './haptics';

test('Haptics triggers navigator.vibrate safely and throttles rapid selection bursts', () => {
  const calls: Array<number | number[]> = [];
  const prevNav = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      vibrate: (pattern: number | number[]) => {
        calls.push(pattern);
        return true;
      },
    },
  });

  try {
    assert.equal(getHapticsEnabled(), true);
    assert.equal(getSoundFeedbackEnabled(), false);

    // Distinct forced feedback (success/error/streak) must always fire immediately
    assert.equal(haptics.success(), true);
    assert.equal(haptics.error(), true);
    assert.equal(haptics.streak(), true);
    assert.equal(calls.length, 3);
    assert.deepEqual(calls[0], [9, 32, 15]);
    assert.deepEqual(calls[1], [20, 38, 22]);

    // Rapid unforced burst immediately after should be throttled by cooldown
    assert.equal(triggerHaptic('selection', false), false);
    assert.equal(calls.length, 3);
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: prevNav,
    });
  }
});
