import { getCheatsheetKnowledgeForTask, type ExplainPromptInput } from '../data/cheatsheetKnowledge';
import {
  cleanExplanation,
  type FipiQuestion,
  type SprintQuestion,
  type TaskId,
} from './trainerLogic';

export interface ExplainRequestInput extends ExplainPromptInput {
  questionId?: string;
}

export interface GeminiExplainResult {
  explanation: string;
  sourceSection: string;
  grounded: boolean;
  fromFallback: boolean;
  needsApiKey: boolean;
  cached: boolean;
  model?: string;
  error?: string;
}

const API_KEY_STORAGE = 'ege-gemini-api-key';
const AUTO_EXPLAIN_STORAGE = 'ege-ai-auto-explain';
const CACHE_STORAGE_KEY = 'ege-ai-expl-cache-v1';
const MEMORY_CACHE_LIMIT = 400;
const STORAGE_CACHE_LIMIT = 200;

const memoryCache = new Map<string, GeminiExplainResult>();
const inflightClientRequests = new Map<string, Promise<GeminiExplainResult>>();

export function getStoredGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (window.localStorage.getItem(API_KEY_STORAGE) || '').trim();
  } catch {
    return '';
  }
}

export function setStoredGeminiApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = key.trim();
    if (trimmed) {
      window.localStorage.setItem(API_KEY_STORAGE, trimmed);
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE);
    }
    memoryCache.clear();
  } catch {}
}

export function getAiAutoExplainEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(AUTO_EXPLAIN_STORAGE);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setAiAutoExplainEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTO_EXPLAIN_STORAGE, enabled ? 'true' : 'false');
  } catch {}
}

function getCacheKey(input: ExplainRequestInput): string {
  return [
    input.task,
    input.questionId || input.promptText.slice(0, 80),
    input.correctAnswer,
    input.userAnswer || '',
  ].join('::');
}

function readPersistentCache(): Record<string, GeminiExplainResult> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePersistentCache(key: string, value: GeminiExplainResult): void {
  if (typeof window === 'undefined') return;
  try {
    const store = readPersistentCache();
    store[key] = { ...value, cached: true };
    const entries = Object.entries(store);
    const trimmed =
      entries.length > STORAGE_CACHE_LIMIT
        ? Object.fromEntries(entries.slice(entries.length - STORAGE_CACHE_LIMIT))
        : store;
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function buildSprintExplainPayload(q: SprintQuestion, userAnswer?: string): ExplainRequestInput {
  const promptWord = `${q.prefix || ''}[..]${q.suffix || ''}`.replace(/\s+/g, ' ').trim();
  const ctx = q.context ? ` (${q.context})` : '';
  return {
    task: q.task,
    questionId: q.id,
    questionKind: 'sprint',
    topic: q.topic,
    promptText: `${promptWord}${ctx}\nВарианты ответа: ${(q.options || []).join(' / ')}`,
    correctAnswer: q.answer,
    userAnswer,
    referenceExplanation: q.explanation || q.rule,
  };
}

export function buildFipiExplainPayload(q: FipiQuestion, userAnswer?: string): ExplainRequestInput {
  const rowLines: string[] = [];
  if (q.matchingLetters?.length && q.choiceOptions?.length) {
    rowLines.push('Предложения:');
    for (const m of q.matchingLetters) {
      rowLines.push(`${m.label}) ${m.text} → правильная цифра ${m.correctDigit}`);
    }
    rowLines.push(`Список вариантов: ${q.choiceOptions.map((c, idx) => `${idx + 1}) ${c}`).join('; ')}`);
  } else {
    (q.rows || []).forEach((r, idx) => {
      const label = q.questionKind === 'numbered_gaps' ? `Позиция (${idx + 1})` : `${idx + 1})`;
      const wordsStr = (r.words || []).join(', ');
      const solvedStr = (r.solvedWords || []).join(', ');
      const expl = cleanExplanation(r.explanation || '');
      rowLines.push(
        `${label} ${wordsStr}${solvedStr && solvedStr !== wordsStr ? ` → ${solvedStr}` : ''} [буква/ответ: ${r.letter || (r.isCorrectRow ? 'верно' : '—')}]${expl ? ` | ключ: ${expl}` : ''}`,
      );
    });
  }

  let correctAnswer = '';
  if (q.textAnswers?.length) {
    correctAnswer = q.textAnswers.join(' / ');
  } else if (q.matchingLetters?.length) {
    correctAnswer = q.matchingLetters.map((m) => `${m.label}-${m.correctDigit}`).join(', ');
  } else {
    correctAnswer = (q.correctIndices || []).join('');
  }

  const promptParts = [
    q.instruction || '',
    q.sentence ? `Текст/предложение:\n${q.sentence}` : '',
    q.target ? `Условие выбора: ${q.target}` : '',
  ].filter(Boolean);

  return {
    task: q.task,
    questionId: q.id,
    questionKind: 'fipi',
    topic: q.topic,
    promptText: promptParts.join('\n') || `Задание №${q.task}`,
    correctAnswer,
    userAnswer,
    rowDetails: rowLines.join('\n'),
    referenceExplanation: cleanExplanation(q.explanation || ''),
  };
}

export function buildErrorExplainPayload(item: {
  task: TaskId;
  questionId?: string;
  wordDisplay?: string;
  correctWord?: string;
  correctChoice?: string;
  userChoice?: string;
  context?: string;
  topic?: string;
  rule?: string;
  explanation?: string;
}): ExplainRequestInput {
  const display = item.wordDisplay || item.correctWord || `Задание №${item.task}`;
  const ctx = item.context ? ` (${item.context})` : '';
  const solved =
    item.correctWord && item.wordDisplay && item.correctWord !== item.wordDisplay
      ? `\nПолная форма: ${item.correctWord}`
      : '';
  return {
    task: item.task,
    questionId: item.questionId,
    questionKind: 'sprint',
    topic: item.topic,
    promptText: `${display}${ctx}${solved}`,
    correctAnswer: item.correctChoice || item.correctWord || '—',
    userAnswer: item.userChoice,
    referenceExplanation: cleanExplanation(item.explanation || item.rule || ''),
  };
}

function storeInCaches(key: string, result: GeminiExplainResult): void {
  if (memoryCache.size >= MEMORY_CACHE_LIMIT) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.set(key, result);
  writePersistentCache(key, result);
}

/**
 * Synchronous 0ms lookup in memory and persistent storage cache.
 */
export function getCachedGeminiExplanation(input: ExplainRequestInput): GeminiExplainResult | null {
  const key = getCacheKey(input);
  const memHit = memoryCache.get(key);
  if (memHit) return { ...memHit, cached: true };
  const stored = readPersistentCache()[key];
  if (stored && !stored.fromFallback) {
    memoryCache.set(key, stored);
    return { ...stored, cached: true };
  }
  return null;
}

/**
 * Deterministic instant fallback built strictly from the task's cheatsheet text and task explanation.
 */
export function buildLocalCheatsheetFallback(
  input: ExplainRequestInput,
  extra?: { needsApiKey?: boolean; error?: string },
): GeminiExplainResult {
  const sheet = getCheatsheetKnowledgeForTask(input.task);
  const sheetLines = sheet.content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const searchTokens = `${input.promptText} ${input.topic || ''} ${input.correctAnswer} ${input.referenceExplanation || ''}`
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^а-яa-z0-9-]+/i)
    .filter((tok) => tok.length >= 4);

  const scored = sheetLines
    .map((line) => {
      const low = line.toLowerCase().replace(/ё/g, 'е');
      let score = 0;
      for (const tok of searchTokens) {
        if (low.includes(tok) || low.includes(tok.slice(0, Math.max(4, tok.length - 2)))) {
          score += 2;
        }
      }
      if (/^[⚡⭐⛔1-3]\./.test(line)) score += 1;
      return { line, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.line);

  const ruleBullets = scored.length > 0 ? scored : sheetLines.slice(0, 3);
  const refExpl = cleanExplanation(input.referenceExplanation || '');
  const hasUserMistake =
    Boolean(input.userAnswer) &&
    input.userAnswer?.trim().toLowerCase() !== input.correctAnswer.trim().toLowerCase();

  const summaryLines = [
    `Правило («${sheet.title}»):`,
    ...ruleBullets,
    ...(refExpl && !ruleBullets.some((b) => b.toLowerCase().includes(refExpl.toLowerCase().slice(0, 24)))
      ? [`Разбор: ${refExpl}`]
      : []),
    hasUserMistake
      ? `Почему ошибка: выбран ответ «${input.userAnswer}», а верно — «${input.correctAnswer}».`
      : `Верный ответ: ${input.correctAnswer}.`,
  ];

  return {
    explanation: summaryLines.join('\n'),
    sourceSection: sheet.title,
    grounded: true,
    fromFallback: true,
    needsApiKey: Boolean(extra?.needsApiKey),
    cached: false,
    error: extra?.error,
  };
}

export async function checkGeminiBackendStatus(): Promise<{
  configured: boolean;
  model: string;
  source: 'env' | 'client' | 'none';
}> {
  const localKey = getStoredGeminiApiKey();
  try {
    const res = await fetch('/api/explain/status', {
      headers: localKey ? { 'X-Gemini-Api-Key': localKey } : undefined,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return {
      configured: Boolean(localKey),
      model: 'gemini-3.5-flash-lite',
      source: localKey ? 'client' : 'none',
    };
  }
}

/**
 * Fetches a cheatsheet-grounded explanation from Gemini via `/api/explain`, with local caching and fallback.
 */
export async function fetchGeminiExplanation(
  input: ExplainRequestInput,
  options?: { forceRefresh?: boolean },
): Promise<GeminiExplainResult> {
  const key = getCacheKey(input);
  if (!options?.forceRefresh) {
    const cached = getCachedGeminiExplanation(input);
    if (cached) return cached;
    const inflight = inflightClientRequests.get(key);
    if (inflight) return inflight;
  }

  const customApiKey = getStoredGeminiApiKey();
  const promise = (async (): Promise<GeminiExplainResult> => {
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customApiKey ? { 'X-Gemini-Api-Key': customApiKey } : {}),
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.explanation) {
        const result: GeminiExplainResult = {
          explanation: String(data.explanation),
          sourceSection: String(data.sourceSection || getCheatsheetKnowledgeForTask(input.task).title),
          grounded: Boolean(data.grounded),
          fromFallback: false,
          needsApiKey: false,
          cached: Boolean(data.cached),
          model: typeof data.model === 'string' ? data.model : undefined,
        };
        storeInCaches(key, result);
        return result;
      }

      const needsApiKey = Boolean(data?.needsApiKey || res.status === 401);
      const errorMsg = typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`;
      return buildLocalCheatsheetFallback(input, { needsApiKey, error: errorMsg });
    } catch (err: any) {
      return buildLocalCheatsheetFallback(input, {
        needsApiKey: false,
        error: err?.message ? String(err.message) : 'Сервер объяснений недоступен',
      });
    } finally {
      inflightClientRequests.delete(key);
    }
  })();

  inflightClientRequests.set(key, promise);
  return promise;
}

/**
 * Streams a Gemini cheatsheet-grounded explanation via `/api/explain/stream` without blocking UI.
 */
export async function streamGeminiExplanation(
  input: ExplainRequestInput,
  options?: {
    forceRefresh?: boolean;
    onPartial?: (partial: GeminiExplainResult) => void;
    signal?: AbortSignal;
  },
): Promise<GeminiExplainResult> {
  const key = getCacheKey(input);
  if (!options?.forceRefresh) {
    const cached = getCachedGeminiExplanation(input);
    if (cached) return cached;
  }

  const customApiKey = getStoredGeminiApiKey();
  const defaultSection = getCheatsheetKnowledgeForTask(input.task).title;

  try {
    const res = await fetch('/api/explain/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(customApiKey ? { 'X-Gemini-Api-Key': customApiKey } : {}),
      },
      body: JSON.stringify(input),
      signal: options?.signal ?? AbortSignal.timeout(15000),
    });

    if (!res.ok || !res.body) {
      return fetchGeminiExplanation(input, { forceRefresh: options?.forceRefresh });
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('ndjson')) {
      return fetchGeminiExplanation(input, { forceRefresh: options?.forceRefresh });
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';
    let sectionTitle = defaultSection;
    let modelName: string | undefined;
    let finalResult: GeminiExplainResult | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        let evt: any = null;
        try {
          evt = JSON.parse(line);
        } catch {
          continue;
        }
        if (evt.type === 'meta') {
          if (typeof evt.sourceSection === 'string') sectionTitle = evt.sourceSection;
          if (typeof evt.model === 'string') modelName = evt.model;
        } else if (evt.type === 'delta' && typeof evt.text === 'string') {
          accumulated += evt.text;
          options?.onPartial?.({
            explanation: accumulated.trimStart(),
            sourceSection: sectionTitle,
            grounded: true,
            fromFallback: false,
            needsApiKey: false,
            cached: false,
            model: modelName,
          });
        } else if (evt.type === 'done' && evt.explanation) {
          finalResult = {
            explanation: String(evt.explanation),
            sourceSection: String(evt.sourceSection || sectionTitle),
            grounded: Boolean(evt.grounded),
            fromFallback: false,
            needsApiKey: false,
            cached: Boolean(evt.cached),
            model: typeof evt.model === 'string' ? evt.model : modelName,
          };
        } else if (evt.type === 'error') {
          return buildLocalCheatsheetFallback(input, {
            needsApiKey: Boolean(evt.needsApiKey),
            error: typeof evt.error === 'string' ? evt.error : 'Ошибка потока Gemini',
          });
        }
      }
    }

    if (finalResult) {
      storeInCaches(key, finalResult);
      return finalResult;
    }
    if (accumulated.trim()) {
      const completed: GeminiExplainResult = {
        explanation: accumulated.trim(),
        sourceSection: sectionTitle,
        grounded: true,
        fromFallback: false,
        needsApiKey: false,
        cached: false,
        model: modelName,
      };
      storeInCaches(key, completed);
      return completed;
    }

    return buildLocalCheatsheetFallback(input);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return getCachedGeminiExplanation(input) ?? buildLocalCheatsheetFallback(input);
    }
    return fetchGeminiExplanation(input, { forceRefresh: options?.forceRefresh });
  }
}

/**
 * Quietly pre-warms explanation cache in the background without blocking UI rendering.
 */
export function prefetchGeminiExplanation(input: ExplainRequestInput): void {
  if (typeof window === 'undefined' || !getAiAutoExplainEnabled()) return;
  if (getCachedGeminiExplanation(input)) return;
  void fetchGeminiExplanation(input).catch(() => {});
}
