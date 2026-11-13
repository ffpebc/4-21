import { GoogleGenAI } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  buildCheatsheetGroundedPrompt,
  getCheatsheetKnowledgeForTask,
  type ExplainPromptInput,
} from '../src/data/cheatsheetKnowledge';
import { TASK_IDS, type TaskId } from '../src/utils/trainerLogic';

export interface ExplainRequestBody extends ExplainPromptInput {
  questionId?: string;
  model?: string;
}

export interface ExplainResponseBody {
  explanation: string;
  sourceSection: string;
  grounded: boolean;
  cached: boolean;
  model: string;
  needsApiKey?: boolean;
  error?: string;
}

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const CACHE_LIMIT = 800;
const MAX_OUTPUT_TOKENS = 280;
const serverExplainCache = new Map<string, Omit<ExplainResponseBody, 'cached'>>();
const inflightExplainRequests = new Map<string, Promise<{ status: number; data: ExplainResponseBody }>>();

function resolveApiKey(headerApiKey?: string): string {
  const custom = typeof headerApiKey === 'string' ? headerApiKey.trim() : '';
  if (custom) return custom;
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
}

export function resolveConfiguredModel(requestedModel?: string): string {
  const custom = typeof requestedModel === 'string' ? requestedModel.trim() : '';
  return custom || (process.env.GEMINI_MODEL || '').trim() || DEFAULT_GEMINI_MODEL;
}

export function getGeminiStatus(headerApiKey?: string): {
  configured: boolean;
  model: string;
  source: 'env' | 'client' | 'none';
} {
  const custom = typeof headerApiKey === 'string' ? headerApiKey.trim() : '';
  if (custom) {
    return { configured: true, model: resolveConfiguredModel(), source: 'client' };
  }
  const envKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (envKey) {
    return { configured: true, model: resolveConfiguredModel(), source: 'env' };
  }
  return { configured: false, model: resolveConfiguredModel(), source: 'none' };
}

function buildCacheKey(body: ExplainRequestBody, model: string): string {
  return [
    model,
    body.task,
    body.questionId || body.promptText.slice(0, 120),
    body.correctAnswer,
    body.userAnswer || '',
    body.rowDetails?.slice(0, 120) || '',
  ].join('|');
}

function setCacheEntry(key: string, value: Omit<ExplainResponseBody, 'cached'>): void {
  if (serverExplainCache.size >= CACHE_LIMIT) {
    const oldestKey = serverExplainCache.keys().next().value;
    if (oldestKey !== undefined) serverExplainCache.delete(oldestKey);
  }
  serverExplainCache.set(key, value);
}

interface PreparedExplainRequest {
  normalizedInput: ExplainRequestBody;
  model: string;
  apiKey: string;
  cacheKey: string;
  sectionTitle: string;
  systemInstruction: string;
  userPrompt: string;
}

function prepareExplainRequest(
  rawBody: Partial<ExplainRequestBody> | null | undefined,
  headerApiKey?: string,
): { ok: true; prepared: PreparedExplainRequest } | { ok: false; status: number; data: ExplainResponseBody } {
  if (!rawBody || typeof rawBody !== 'object') {
    return {
      ok: false,
      status: 400,
      data: {
        explanation: '',
        sourceSection: '',
        grounded: false,
        cached: false,
        model: resolveConfiguredModel(),
        error: 'Некорректное тело запроса.',
      },
    };
  }

  const task = String(rawBody.task || '') as TaskId;
  if (!TASK_IDS.includes(task)) {
    return {
      ok: false,
      status: 400,
      data: {
        explanation: '',
        sourceSection: '',
        grounded: false,
        cached: false,
        model: resolveConfiguredModel(),
        error: `Неподдерживаемый номер задания: ${rawBody.task ?? 'не указан'}.`,
      },
    };
  }

  const promptText = typeof rawBody.promptText === 'string' ? rawBody.promptText.trim() : '';
  const correctAnswer = typeof rawBody.correctAnswer === 'string' ? rawBody.correctAnswer.trim() : '';
  if (!promptText || !correctAnswer) {
    return {
      ok: false,
      status: 400,
      data: {
        explanation: '',
        sourceSection: getCheatsheetKnowledgeForTask(task).title,
        grounded: false,
        cached: false,
        model: resolveConfiguredModel(rawBody.model),
        error: 'Нужно передать условие задания (promptText) и правильный ответ (correctAnswer).',
      },
    };
  }

  const sheet = getCheatsheetKnowledgeForTask(task);
  const model = resolveConfiguredModel(rawBody.model);
  const apiKey = resolveApiKey(headerApiKey);

  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      data: {
        explanation: '',
        sourceSection: sheet.title,
        grounded: false,
        cached: false,
        model,
        needsApiKey: true,
        error: 'Ключ Gemini API не настроен. Укажите GEMINI_API_KEY в .env или в настройках приложения.',
      },
    };
  }

  const normalizedInput: ExplainRequestBody = {
    task,
    questionId: typeof rawBody.questionId === 'string' ? rawBody.questionId : undefined,
    questionKind: rawBody.questionKind === 'sprint' ? 'sprint' : 'fipi',
    topic: typeof rawBody.topic === 'string' ? rawBody.topic : undefined,
    promptText,
    correctAnswer,
    userAnswer: typeof rawBody.userAnswer === 'string' ? rawBody.userAnswer : undefined,
    rowDetails: typeof rawBody.rowDetails === 'string' ? rawBody.rowDetails : undefined,
    referenceExplanation:
      typeof rawBody.referenceExplanation === 'string' ? rawBody.referenceExplanation : undefined,
    model,
  };

  const cacheKey = buildCacheKey(normalizedInput, model);
  const { systemInstruction, userPrompt, sectionTitle } = buildCheatsheetGroundedPrompt(normalizedInput);

  return {
    ok: true,
    prepared: {
      normalizedInput,
      model,
      apiKey,
      cacheKey,
      sectionTitle,
      systemInstruction,
      userPrompt,
    },
  };
}

function buildApiErrorResponse(err: unknown, sectionTitle: string, model: string): { status: number; data: ExplainResponseBody } {
  const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Ошибка обращения к Gemini API';
  const isAuthErr = /API_KEY|API key|401|403|permission|unauthenticated/i.test(message);
  return {
    status: isAuthErr ? 401 : 502,
    data: {
      explanation: '',
      sourceSection: sectionTitle,
      grounded: false,
      cached: false,
      model,
      needsApiKey: isAuthErr,
      error: isAuthErr
        ? 'Неверный или недействительный ключ Gemini API.'
        : `Не удалось получить объяснение Gemini: ${message}`,
    },
  };
}

/**
 * Generates an EGE explanation using Gemini strictly grounded in the app cheatsheet.
 */
export async function explainWithGemini(
  rawBody: Partial<ExplainRequestBody> | null | undefined,
  headerApiKey?: string,
): Promise<{ status: number; data: ExplainResponseBody }> {
  const prep = prepareExplainRequest(rawBody, headerApiKey);
  if (!prep.ok) {
    return { status: prep.status, data: prep.data };
  }

  const { model, apiKey, cacheKey, sectionTitle, systemInstruction, userPrompt } = prep.prepared;
  const cached = serverExplainCache.get(cacheKey);
  if (cached) {
    return { status: 200, data: { ...cached, cached: true } };
  }

  const existingInflight = inflightExplainRequests.get(cacheKey);
  if (existingInflight) {
    return existingInflight;
  }

  const promise = (async (): Promise<{ status: number; data: ExplainResponseBody }> => {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      });

      const text = (response.text || '').trim();
      if (!text) {
        return {
          status: 502,
          data: {
            explanation: '',
            sourceSection: sectionTitle,
            grounded: false,
            cached: false,
            model,
            error: 'Модель Gemini вернула пустой ответ.',
          },
        };
      }

      const result: Omit<ExplainResponseBody, 'cached'> = {
        explanation: text,
        sourceSection: sectionTitle,
        grounded: true,
        model,
      };
      setCacheEntry(cacheKey, result);
      return { status: 200, data: { ...result, cached: false } };
    } catch (err) {
      return buildApiErrorResponse(err, sectionTitle, model);
    } finally {
      inflightExplainRequests.delete(cacheKey);
    }
  })();

  inflightExplainRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Streams NDJSON chunks for an EGE explanation from cache or Gemini generateContentStream.
 */
export async function streamExplainResponse(
  rawBody: Partial<ExplainRequestBody> | null | undefined,
  res: ServerResponse,
  headerApiKey?: string,
): Promise<void> {
  const prep = prepareExplainRequest(rawBody, headerApiKey);
  if (!prep.ok) {
    res.statusCode = prep.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(prep.data));
    return;
  }

  const { model, apiKey, cacheKey, sectionTitle, systemInstruction, userPrompt } = prep.prepared;
  const cached = serverExplainCache.get(cacheKey);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('X-Accel-Buffering', 'no');

  if (cached) {
    res.end(JSON.stringify({ type: 'done', ...cached, cached: true }) + '\n');
    return;
  }

  try {
    res.write(
      JSON.stringify({
        type: 'meta',
        sourceSection: sectionTitle,
        model,
      }) + '\n',
    );

    const ai = new GoogleGenAI({ apiKey });
    const stream = await ai.models.generateContentStream({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    });

    let fullText = '';
    for await (const chunk of stream) {
      const piece = chunk.text || '';
      if (!piece) continue;
      fullText += piece;
      res.write(JSON.stringify({ type: 'delta', text: piece }) + '\n');
    }

    const finalExplanation = fullText.trim();
    if (!finalExplanation) {
      res.end(
        JSON.stringify({
          type: 'error',
          error: 'Модель Gemini вернула пустой ответ.',
          sourceSection: sectionTitle,
          model,
        }) + '\n',
      );
      return;
    }

    const result: Omit<ExplainResponseBody, 'cached'> = {
      explanation: finalExplanation,
      sourceSection: sectionTitle,
      grounded: true,
      model,
    };
    setCacheEntry(cacheKey, result);
    res.end(JSON.stringify({ type: 'done', ...result, cached: false }) + '\n');
  } catch (err) {
    const errRes = buildApiErrorResponse(err, sectionTitle, model);
    res.end(
      JSON.stringify({
        type: 'error',
        status: errRes.status,
        ...errRes.data,
      }) + '\n',
    );
  }
}

/**
 * Node HTTP middleware helper for Vite dev/preview server (/api/explain, /api/explain/stream, /api/explain/status).
 */
export async function handleNodeExplainMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const rawUrl = req.url || '';
  const cleanUrl = rawUrl.split('?')[0];
  if (
    cleanUrl !== '/api/explain' &&
    cleanUrl !== '/api/explain/stream' &&
    cleanUrl !== '/api/explain/status'
  ) {
    return false;
  }

  const headerKey =
    typeof req.headers['x-gemini-api-key'] === 'string'
      ? req.headers['x-gemini-api-key']
      : undefined;

  res.setHeader('Cache-Control', 'no-store');

  if (cleanUrl === '/api/explain/status' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    res.end(JSON.stringify(getGeminiStatus(headerKey)));
    return true;
  }

  if ((cleanUrl === '/api/explain' || cleanUrl === '/api/explain/stream') && req.method === 'POST') {
    let rawBody = '';
    for await (const chunk of req) {
      rawBody += chunk;
      if (rawBody.length > 256 * 1024) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Payload too large' }));
        return true;
      }
    }
    let parsed: any = null;
    try {
      parsed = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return true;
    }

    if (cleanUrl === '/api/explain/stream') {
      await streamExplainResponse(parsed, res, headerKey);
      return true;
    }

    const { status, data } = await explainWithGemini(parsed, headerKey);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = status;
    res.end(JSON.stringify(data));
    return true;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method not allowed' }));
  return true;
}
