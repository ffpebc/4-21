import {
  TaskId,
  TrainerState,
  TaskMasteryStat,
  ErrorBankEntry,
  SessionJournalEntry,
  createInitialState,
  createDefaultEnabledTasks,
  encodeBackupCode,
  decodeBackupCode,
  TASK_IDS,
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

  const defaultQty = {} as Record<TaskId, number>;
  for (const id of TASK_IDS) {
    defaultQty[id] = ['9', '10', '11', '12', '13', '14', '15'].includes(id) ? 5 : 3;
  }

  const mergedEnabled = createDefaultEnabledTasks();
  if (state.enabledTasks && typeof state.enabledTasks === 'object') {
    for (const id of TASK_IDS) {
      if (typeof state.enabledTasks[id] === 'boolean') {
        mergedEnabled[id] = state.enabledTasks[id];
      }
    }
  }

  // If ALL non-ortho tasks are disabled or 0 (which happens with old saves from 9-15 version),
  // re-enable all tasks 4-22 with default quantities so user is not stuck with only 9-15!
  const nonOrtho = ['4', '5', '6', '7', '8', '16', '17', '18', '19', '20', '21', '22'] as TaskId[];
  const allNonOrthoDisabled = nonOrtho.every(
    (id) => mergedEnabled[id] === false || !state.quantities?.[id]
  );
  if (allNonOrthoDisabled) {
    for (const id of TASK_IDS) {
      mergedEnabled[id] = true;
      if (!state.quantities?.[id]) {
        defaultQty[id] = ['9', '10', '11', '12', '13', '14', '15'].includes(id) ? 5 : 3;
      }
    }
  }

  const mergedQuantities: Record<TaskId, number> = { ...defaultQty, ...(state.quantities || {}) };
  for (const id of TASK_IDS) {
    if (mergedEnabled[id] && (!mergedQuantities[id] || mergedQuantities[id] <= 0)) {
      mergedQuantities[id] = ['9', '10', '11', '12', '13', '14', '15'].includes(id) ? 5 : 3;
    }
  }

  return {
    ...state,
    workoutMode: 'fipi',
    isShuffled: typeof state.isShuffled === 'boolean' ? state.isShuffled : true,
    quantities: mergedQuantities,
    enabledTasks: mergedEnabled,
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

export function getSyncApiUrl(
  pin: string,
  queryParams?: Record<string, string | number>
): string {
  const targetPin = encodeURIComponent((pin || DEFAULT_HOSTED_PIN).trim().toUpperCase());
  let base = '';
  if (typeof window !== 'undefined') {
    const pathName = window.location.pathname;
    const dir = pathName.replace(/\/([^\/]*\.[^\/]*|)$/, '');
    if (dir && dir !== '/') {
      base = dir;
    }
  }
  let url = `${base}/api/sync/${targetPin}`;
  if (queryParams) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(queryParams)) {
      search.set(k, String(v));
    }
    url += `?${search.toString()}`;
  }
  return url;
}

export function mergeTrainerStates(
  local: TrainerState,
  incoming: TrainerState,
  options?: { incomingIsNewer?: boolean }
): TrainerState {
  if (!local) return sanitizeLoadedState(incoming);
  if (!incoming) return sanitizeLoadedState(local);

  const sanitizedIncoming = sanitizeLoadedState(incoming);
  const sanitizedLocal = sanitizeLoadedState(local);

  // 1. Cumulative numerical progress: Monotonically advance so neither PC nor Phone ever loses solved tasks
  const totalSolved = Math.max(sanitizedLocal.totalSolved, sanitizedIncoming.totalSolved);
  const totalCorrect = Math.max(sanitizedLocal.totalCorrect, sanitizedIncoming.totalCorrect);
  const sessionsCompleted = Math.max(
    sanitizedLocal.sessionsCompleted,
    sanitizedIncoming.sessionsCompleted
  );
  const sprintStreak = Math.max(sanitizedLocal.sprintStreak, sanitizedIncoming.sprintStreak);
  const sprintTotal = Math.max(sanitizedLocal.sprintTotal, sanitizedIncoming.sprintTotal);
  const sprintCorrect = Math.max(sanitizedLocal.sprintCorrect, sanitizedIncoming.sprintCorrect);
  const bestStreak = Math.max(sanitizedLocal.bestStreak || 0, sanitizedIncoming.bestStreak || 0);
  const bestBlitz60 = Math.max(sanitizedLocal.bestBlitz60 || 0, sanitizedIncoming.bestBlitz60 || 0);
  const bestSurvival = Math.max(
    sanitizedLocal.bestSurvival || 0,
    sanitizedIncoming.bestSurvival || 0
  );

  // 2. Per-task mastery statistics: Max on solved & correct
  const taskStats: Record<TaskId, TaskMasteryStat> = { ...sanitizedLocal.taskStats };
  for (const id of TASK_IDS) {
    const loc = sanitizedLocal.taskStats?.[id] || { solved: 0, correct: 0 };
    const inc = sanitizedIncoming.taskStats?.[id] || { solved: 0, correct: 0 };
    taskStats[id] = {
      solved: Math.max(loc.solved, inc.solved),
      correct: Math.max(loc.correct, inc.correct),
    };
  }

  // 3. Error Bank: Union of errors by questionId with latest timestamp
  const errorMap = new Map<string, ErrorBankEntry>();
  for (const err of sanitizedLocal.errorBank || []) {
    if (err && err.questionId) {
      errorMap.set(err.questionId, err);
    }
  }
  for (const err of sanitizedIncoming.errorBank || []) {
    if (err && err.questionId) {
      const existing = errorMap.get(err.questionId);
      if (!existing || (err.timestamp || 0) >= (existing.timestamp || 0)) {
        errorMap.set(err.questionId, err);
      }
    }
  }
  const mergedErrorBank = Array.from(errorMap.values()).slice(0, 50);

  // 4. Session Journal: Deduplicate by title + dateLabel + total + correct
  const journalMap = new Map<string, SessionJournalEntry>();
  for (const j of sanitizedLocal.sessionJournal || []) {
    journalMap.set(`${j.title}|${j.dateLabel}|${j.total}|${j.correct}`, j);
  }
  for (const j of sanitizedIncoming.sessionJournal || []) {
    journalMap.set(`${j.title}|${j.dateLabel}|${j.total}|${j.correct}`, j);
  }
  const mergedJournal = Array.from(journalMap.values()).slice(0, 25);

  // 5. Settings: If incoming is newer or incoming has higher totalSolved, take incoming settings
  const takeIncomingSettings =
    options?.incomingIsNewer ?? (sanitizedIncoming.totalSolved > sanitizedLocal.totalSolved);

  const quantities = takeIncomingSettings
    ? sanitizedIncoming.quantities
    : sanitizedLocal.quantities;
  const enabledTasks = takeIncomingSettings
    ? sanitizedIncoming.enabledTasks
    : sanitizedLocal.enabledTasks;
  const isShuffled = takeIncomingSettings
    ? sanitizedIncoming.isShuffled
    : sanitizedLocal.isShuffled;
  const darkMode = takeIncomingSettings
    ? sanitizedIncoming.darkMode
    : sanitizedLocal.darkMode;
  const profilePin =
    sanitizedIncoming.profilePin || sanitizedLocal.profilePin || '';

  return {
    ...sanitizedLocal,
    workoutMode: 'fipi',
    isShuffled,
    darkMode,
    profilePin,
    quantities,
    enabledTasks,
    totalSolved,
    totalCorrect,
    sessionsCompleted,
    sprintStreak,
    sprintTotal,
    sprintCorrect,
    bestStreak,
    bestBlitz60,
    bestSurvival,
    taskStats,
    errorBank: mergedErrorBank,
    sessionJournal: mergedJournal,
  };
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
    const url = getSyncApiUrl(targetPin);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
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
  pin?: string,
  options?: { since?: number }
): Promise<{
  found: boolean;
  notModified?: boolean;
  state?: TrainerState;
  updatedAt?: number;
}> {
  const targetPin = (pin || DEFAULT_HOSTED_PIN).trim().toUpperCase();
  if (targetPin.length < 2) return { found: false };
  try {
    const queryParams: Record<string, string | number> = {
      t: Date.now(), // Anti-cache query for iOS WebKit & Safari
    };
    if (options?.since && options.since > 0) {
      queryParams.since = options.since;
    }
    const url = getSyncApiUrl(targetPin, queryParams);
    const res = await fetch(url, {
      headers: { 'Cache-Control': 'no-cache, no-store' },
      cache: 'no-store',
    });
    if (!res.ok) return { found: false };
    const data = await res.json();
    if (data.notModified) {
      return { found: true, notModified: true, updatedAt: data.updatedAt };
    }
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

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: number;
  message?: string;
}

export type SyncStatusListener = (status: SyncStatus) => void;
export type RemoteUpdateListener = (mergedState: TrainerState) => void;

class CloudSyncManagerImpl {
  private pin: string = '';
  private lastKnownServerUpdatedAt: number = 0;
  private lastPushedCode: string = '';
  private isPushing: boolean = false;
  private isPulling: boolean = false;
  private pollTimer: any = null;
  private pushTimer: any = null;
  private statusListeners = new Set<SyncStatusListener>();
  private updateListeners = new Set<RemoteUpdateListener>();
  private currentStateGetter: (() => TrainerState) | null = null;
  private isInitialized: boolean = false;

  public init(getState: () => TrainerState, initialPin?: string): void {
    this.currentStateGetter = getState;
    if (initialPin && initialPin.trim().length >= 2) {
      this.setPin(initialPin.trim().toUpperCase());
    }
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.poll(true));
      window.addEventListener('online', () => {
        this.poll(true);
        if (this.currentStateGetter) {
          this.notifyStateChanged(this.currentStateGetter(), true);
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.poll(true);
        }
      });
      window.addEventListener('pagehide', () => {
        this.flushPendingPush();
      });
      window.addEventListener('beforeunload', () => {
        this.flushPendingPush();
      });
    }

    this.scheduleNextPoll();
  }

  public subscribeStatus(listener: SyncStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  public subscribeRemoteUpdate(listener: RemoteUpdateListener): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  private emitStatus(status: SyncStatus): void {
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (_) {}
    }
  }

  private emitRemoteUpdate(merged: TrainerState): void {
    for (const listener of this.updateListeners) {
      try {
        listener(merged);
      } catch (_) {}
    }
  }

  public setPin(rawPin: string, immediateState?: TrainerState): void {
    const clean = (rawPin || '').trim().toUpperCase().replace(/[^A-ZА-ЯЁ0-9_-]/g, '').slice(0, 32);
    if (clean === this.pin && this.pin.length >= 2) return;
    this.pin = clean;
    this.lastKnownServerUpdatedAt = 0;
    this.lastPushedCode = '';

    if (this.pin.length >= 2) {
      this.emitStatus({ state: 'syncing', message: `Подключение к профилю «${this.pin}»...` });
      this.poll(true, immediateState);
    } else {
      this.emitStatus({ state: 'idle', message: 'Автосохранение активно локально' });
    }
  }

  public getPin(): string {
    return this.pin;
  }

  public notifyStateChanged(state: TrainerState, immediate = false): void {
    const pin = (state.profilePin || this.pin || '').trim().toUpperCase();
    if (pin.length < 2) return;
    this.pin = pin;

    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }

    if (immediate) {
      this.executePush(state);
    } else {
      this.pushTimer = setTimeout(() => {
        this.executePush(state);
      }, 500);
    }
  }

  private async executePush(state: TrainerState): Promise<void> {
    if (!this.pin || this.pin.length < 2) return;
    const code = encodeBackupCode(state);
    if (code === this.lastPushedCode) return;

    this.isPushing = true;
    this.emitStatus({ state: 'syncing', message: `Синхронизация профиля «${this.pin}»...` });

    try {
      const res = await pushStateToCloudPin(this.pin, state);
      if (res.ok) {
        this.lastPushedCode = code;
        if (res.updatedAt) {
          this.lastKnownServerUpdatedAt = res.updatedAt;
        }
        this.emitStatus({
          state: 'synced',
          lastSyncedAt: Date.now(),
          message: `Профиль «${this.pin}» синхронизирован на лету`,
        });
      } else {
        this.emitStatus({
          state: 'error',
          message: res.error || 'Локальное сохранение активно',
        });
      }
    } catch {
      this.emitStatus({
        state: 'error',
        message: 'Локальное сохранение активно',
      });
    } finally {
      this.isPushing = false;
    }
  }

  private flushPendingPush(): void {
    if (!this.pin || this.pin.length < 2 || !this.currentStateGetter) return;
    try {
      const state = this.currentStateGetter();
      const code = encodeBackupCode(state);
      if (code === this.lastPushedCode) return;
      const url = getSyncApiUrl(this.pin);
      const body = JSON.stringify({ payload: { code, totalSolved: state.totalSolved } });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(url, body);
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch (_) {}
  }

  public async poll(force = false, seedState?: TrainerState): Promise<void> {
    if (!this.pin || this.pin.length < 2 || this.isPushing) return;
    if (this.isPulling && !force) return;

    this.isPulling = true;
    try {
      const res = await pullStateFromCloudPin(this.pin, {
        since: this.lastKnownServerUpdatedAt > 0 ? this.lastKnownServerUpdatedAt : undefined,
      });

      if (res.found && res.state) {
        const remoteState = res.state;
        const current = this.currentStateGetter ? this.currentStateGetter() : seedState;
        if (current) {
          const merged = mergeTrainerStates(current, remoteState, { incomingIsNewer: true });
          this.lastKnownServerUpdatedAt = res.updatedAt || Date.now();
          this.lastPushedCode = encodeBackupCode(remoteState);
          this.emitRemoteUpdate(merged);
          persistStateMultiLayer(merged);
          this.emitStatus({
            state: 'synced',
            lastSyncedAt: Date.now(),
            message: `Синхронизировано на лету: ${this.pin}`,
          });
        }
      } else if (!res.found && seedState) {
        await this.executePush(seedState);
      }
    } catch (_) {
      // Ignore background network errors
    } finally {
      this.isPulling = false;
    }
  }

  private scheduleNextPoll(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    const isHidden = typeof document !== 'undefined' && document.hidden;
    const interval = isHidden ? 10000 : 2500;

    this.pollTimer = setTimeout(() => {
      this.poll().finally(() => {
        this.scheduleNextPoll();
      });
    }, interval);
  }
}

export const cloudSyncManager = new CloudSyncManagerImpl();
