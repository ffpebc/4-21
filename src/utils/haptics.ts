export type HapticKind = 'tap' | 'selection' | 'medium' | 'success' | 'error' | 'streak';

const HAPTICS_STORAGE_KEY = 'ege-haptics-enabled';
const SOUND_STORAGE_KEY = 'ege-tactile-sound-enabled';
const MIN_HAPTIC_GAP_MS = 22;

const VIBRATE_PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 7,
  selection: 5,
  medium: 13,
  success: [9, 32, 15],
  error: [20, 38, 22],
  streak: [10, 26, 13, 26, 22],
};

let lastHapticTimestamp = 0;
let sharedAudioCtx: AudioContext | null = null;

export function getHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(HAPTICS_STORAGE_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HAPTICS_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage quota errors
  }
}

export function getSoundFeedbackEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundFeedbackEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage quota errors
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playSoftTactileTone(kind: HapticKind): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const scheduleTone = (freqStart: number, freqEnd: number, delay: number, duration: number, peakGain: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqStart, now + delay);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + delay + duration);

    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.linearRampToValueAtTime(peakGain, now + delay + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + duration + 0.005);
  };

  if (kind === 'selection') {
    scheduleTone(520, 340, 0, 0.022, 0.026);
  } else if (kind === 'tap') {
    scheduleTone(440, 260, 0, 0.028, 0.03);
  } else if (kind === 'medium') {
    scheduleTone(360, 220, 0, 0.036, 0.04);
  } else if (kind === 'success') {
    scheduleTone(523.25, 587.33, 0, 0.055, 0.045);
    scheduleTone(659.25, 783.99, 0.055, 0.075, 0.045);
  } else if (kind === 'streak') {
    scheduleTone(523.25, 587.33, 0, 0.05, 0.04);
    scheduleTone(659.25, 783.99, 0.05, 0.055, 0.042);
    scheduleTone(783.99, 1046.5, 0.105, 0.09, 0.045);
  } else if (kind === 'error') {
    scheduleTone(230, 175, 0, 0.06, 0.045);
    scheduleTone(185, 140, 0.065, 0.075, 0.04);
  }
}

/**
 * Triggers non-blocking haptic vibration (and optional soft tactile audio feedback) when enabled.
 */
export function triggerHaptic(kind: HapticKind = 'tap', forceIgnoreCooldown = false): boolean {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (!forceIgnoreCooldown && now - lastHapticTimestamp < MIN_HAPTIC_GAP_MS) {
    return false;
  }
  lastHapticTimestamp = now;

  let fired = false;
  if (getHapticsEnabled() && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      fired = navigator.vibrate(VIBRATE_PATTERNS[kind]) !== false;
    } catch {
      fired = false;
    }
  }

  if (getSoundFeedbackEnabled()) {
    playSoftTactileTone(kind);
    fired = true;
  }

  return fired;
}

export const haptics = {
  tap: () => triggerHaptic('tap'),
  selection: () => triggerHaptic('selection'),
  medium: () => triggerHaptic('medium'),
  success: () => triggerHaptic('success', true),
  error: () => triggerHaptic('error', true),
  streak: () => triggerHaptic('streak', true),
};
