import {
  TrainerState,
  createInitialState,
  createDefaultEnabledTasks,
  encodeBackupCode,
  decodeBackupCode,
} from './trainerLogic';
import {
  cleanDisplayText,
  isolateTargetWordExplanation,
} from '../components/WorkWindows';

const STORAGE_KEY = 'ege_trainer_ios27_v3';
const IDB_NAME = 'ege_trainer_ios27_db';
const IDB_STORE = 'state_store';
const DEFAULT_HOSTED_PIN = 'HOSTED_DEFAULT';

export function sanitizeLoadedState(state: TrainerState): TrainerState {
  if (!state || !Array.isArray(state.errorBank)) return state;
  return {
    ...state,
    workoutMode: state.workoutMode === 'sprint' ? 'fipi' : (state.workoutMode || 'fipi'),
    isShuffled: typeof state.isShuffled === 'boolean' ? state.isShuffled : true,
    enabledTasks: {
      ...createDefaultEnabledTasks(),
      ...(state.enabledTasks || {}),
    },
    errorBank: state.errorBank.map((entry) => ({
      ...entry,
      explanation: cleanDisplayText(
        isolateTargetWordExplanation(
          entry.explanation || '',
          entry.correctWord || entry.wordDisplay
        )
      ),
      rule: cleanDisplayText(entry.rule || ''),
    })),
  };
}

function saveToIndexedDB(code: string): void {
  try {
    if (typeof indexedDB === 'undefined') return;
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(code, STORAGE_KEY);
    };
  } catch {
    // Ignore IndexedDB errors
  }
}

export function loadFromIndexedDB(): Promise<TrainerState | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, 'readonly');
        const getReq = tx.objectStore(IDB_STORE).get(STORAGE_KEY);
        getReq.onsuccess = () => {
          const val = getReq.result;
          if (typeof val === 'string' && val.startsWith('EGE27-')) {
            const decoded = decodeBackupCode(val);
            resolve(decoded ? sanitizeLoadedState(decoded) : null);
          } else {
            resolve(null);
          }
        };
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function loadInitialStateSync(): TrainerState {
  const fallback = createInitialState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw.startsWith('EGE27-')) {
      const decoded = decodeBackupCode(raw, fallback);
      if (decoded) return sanitizeLoadedState(decoded);
    }
  } catch {
    // Ignore
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw && raw.startsWith('EGE27-')) {
      const decoded = decodeBackupCode(raw, fallback);
      if (decoded) return sanitizeLoadedState(decoded);
    }
  } catch {
    // Ignore
  }

  try {
    if (typeof window.name === 'string' && window.name.startsWith('EGE27-')) {
      const decoded = decodeBackupCode(window.name, fallback);
      if (decoded) return sanitizeLoadedState(decoded);
    }
  } catch {
    // Ignore
  }

  return sanitizeLoadedState(fallback);
}

export function persistStateMultiLayer(state: TrainerState): string {
  const code = encodeBackupCode(state);

  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Ignore
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Ignore
  }

  try {
    window.name = code;
  } catch {
    // Ignore
  }

  saveToIndexedDB(code);
  return code;
}

export async function pushStateToCloudPin(
  pin: string,
  state: TrainerState
): Promise<{ ok: boolean; updatedAt?: number; error?: string }> {
  const targetPin = (pin || DEFAULT_HOSTED_PIN).trim().toUpperCase();
  if (targetPin.length < 2) {
    return { ok: false, error: 'Введите минимум 2 символа для кода профиля' };
  }
  try {
    const code = encodeBackupCode(state);
    const res = await fetch(`/api/sync/${encodeURIComponent(targetPin)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: { code, totalSolved: state.totalSolved } }),
    });
    if (!res.ok) {
      return { ok: false, error: 'Не удалось сохранить профиль на сервере' };
    }
    const data = await res.json();
    return { ok: true, updatedAt: data.updatedAt };
  } catch {
    return { ok: false, error: 'Локальное сохранение активно' };
  }
}

export async function pullStateFromCloudPin(
  pin?: string
): Promise<{ found: boolean; state?: TrainerState; updatedAt?: number }> {
  const targetPin = (pin || DEFAULT_HOSTED_PIN).trim().toUpperCase();
  if (targetPin.length < 2) return { found: false };
  try {
    const res = await fetch(`/api/sync/${encodeURIComponent(targetPin)}`);
    if (!res.ok) return { found: false };
    const data = await res.json();
    const code = data?.payload?.code;
    if (typeof code === 'string' && code.startsWith('EGE27-')) {
      const decoded = decodeBackupCode(code);
      if (decoded) {
        return {
          found: true,
          state: pin ? { ...decoded, profilePin: targetPin } : decoded,
          updatedAt: data.updatedAt,
        };
      }
    }
    return { found: false };
  } catch {
    return { found: false };
  }
}
