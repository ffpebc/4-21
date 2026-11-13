import React, { useEffect, useMemo, useRef, useState } from 'react';
import { haptics } from '../utils/haptics';
import {
  buildLocalCheatsheetFallback,
  getAiAutoExplainEnabled,
  getCachedGeminiExplanation,
  getStoredGeminiApiKey,
  setAiAutoExplainEnabled,
  setStoredGeminiApiKey,
  streamGeminiExplanation,
  type ExplainRequestInput,
  type GeminiExplainResult,
} from '../utils/geminiExplain';
import type { TaskId } from '../utils/trainerLogic';

interface GeminiExplainBlockProps {
  payload: ExplainRequestInput;
  autoFetch?: boolean;
  compact?: boolean;
  onOpenCheatsheet?: (task: TaskId) => void;
}

function getInstantInitialResult(payload: ExplainRequestInput): GeminiExplainResult {
  return getCachedGeminiExplanation(payload) ?? buildLocalCheatsheetFallback(payload);
}

export const GeminiExplainBlock: React.FC<GeminiExplainBlockProps> = ({
  payload,
  autoFetch,
  compact = false,
  onOpenCheatsheet,
}) => {
  const shouldAuto = autoFetch ?? getAiAutoExplainEnabled();
  const payloadKey = useMemo(
    () =>
      [
        payload.task,
        payload.questionId || payload.promptText.slice(0, 60),
        payload.correctAnswer,
        payload.userAnswer || '',
      ].join('::'),
    [payload],
  );

  // Instant 0ms initial state from cache or deterministic cheatsheet rule.
  const [result, setResult] = useState<GeminiExplainResult>(() => getInstantInitialResult(payload));
  const [loading, setLoading] = useState<boolean>(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyDraft, setKeyDraft] = useState(() => getStoredGeminiApiKey());
  const abortRef = useRef<AbortController | null>(null);

  const runExplain = async (forceRefresh = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!forceRefresh) {
      const cached = getCachedGeminiExplanation(payload);
      if (cached) {
        setResult(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    const res = await streamGeminiExplanation(payload, {
      forceRefresh,
      signal: controller.signal,
      onPartial: (partial) => {
        if (!controller.signal.aborted && partial.explanation.trim().length > 0) {
          setResult(partial);
        }
      },
    });
    if (!controller.signal.aborted) {
      setResult(res);
      setLoading(false);
    }
  };

  useEffect(() => {
    abortRef.current?.abort();

    // Immediately swap visible explanation in 0ms on card/word change (zero blocking skeleton).
    const instant = getInstantInitialResult(payload);
    setResult(instant);

    if (!shouldAuto || (!instant.fromFallback && instant.cached)) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    streamGeminiExplanation(payload, {
      signal: controller.signal,
      onPartial: (partial) => {
        if (!controller.signal.aborted && partial.explanation.trim().length > 0) {
          setResult(partial);
        }
      },
    }).then((res) => {
      if (!controller.signal.aborted) {
        setResult(res);
        setLoading(false);
      }
    });

    return () => {
      controller.abort();
    };
  }, [payloadKey, shouldAuto]);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoredGeminiApiKey(keyDraft);
    setAiAutoExplainEnabled(true);
    setShowKeyForm(false);
    await runExplain(true);
  };

  return (
    <div
      className={compact ? 'mt-3 p-3 rounded-2xl text-left' : 'p-3.5 rounded-2xl text-left'}
      style={{
        background: 'var(--ios-bg-cell)',
        border: '1px solid var(--ios-separator)',
      }}
      data-gemini-explain-block="true"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            style={{
              background: result && !result.fromFallback ? 'var(--ios-purple-soft)' : 'var(--ios-blue-soft)',
              color: result && !result.fromFallback ? 'var(--ios-purple)' : 'var(--ios-blue)',
            }}
          >
            {result && !result.fromFallback ? 'Gemini AI · Шпаргалка' : 'Шпаргалка · База'}
          </span>
          {result?.model && !result.fromFallback && (
            <span className="text-[10.5px] font-semibold truncate" style={{ color: 'var(--ios-label-ter)' }}>
              {result.model}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenCheatsheet && (
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                onOpenCheatsheet(payload.task);
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-transform active:scale-[0.96]"
              style={{
                background: 'var(--ios-blue-soft)',
                color: 'var(--ios-blue)',
              }}
            >
              Шпаргалка №{payload.task}
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              haptics.tap();
              void runExplain(true);
            }}
            className="px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-transform active:scale-[0.96] disabled:opacity-50"
            style={{
              background: 'var(--ios-purple-soft)',
              color: 'var(--ios-purple)',
            }}
          >
            {loading ? 'Уточняю ИИ…' : !result.fromFallback ? 'Обновить ИИ' : 'Уточнить с Gemini'}
          </button>
        </div>
      </div>

      <div>
        <div
          className="text-[12.5px] leading-relaxed whitespace-pre-line font-medium"
          style={{ color: 'var(--ios-label)' }}
        >
          {result.explanation}
        </div>

        {result.fromFallback && (
          <div
            className="mt-2.5 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px]"
            style={{ borderColor: 'var(--ios-separator)', color: 'var(--ios-label-sec)' }}
          >
            <span>
              {loading
                ? 'Мгновенный разбор по шпаргалке (нейросеть Gemini догружает уточнение в фоне…)'
                : result.needsApiKey
                  ? 'Для ответа нейросети Gemini укажите API-ключ (локально или в .env).'
                  : result.error
                    ? `Показан разбор по шпаргалке (${result.error}).`
                    : 'Мгновенный разбор строго по шпаргалке.'}
            </span>
            {result.needsApiKey && (
              <button
                type="button"
                onClick={() => setShowKeyForm((prev) => !prev)}
                className="font-extrabold cursor-pointer underline"
                style={{ color: 'var(--ios-purple)' }}
              >
                {showKeyForm ? 'Скрыть' : 'Ввести ключ Gemini API'}
              </button>
            )}
          </div>
        )}

        {showKeyForm && (
          <form onSubmit={handleSaveKey} className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="Вставьте GEMINI_API_KEY (AIza... / AQ...)"
              className="flex-1 px-3 py-1.5 rounded-xl text-[13px] outline-none"
              style={{
                background: 'var(--ios-bg-secondary)',
                color: 'var(--ios-label)',
                border: '1px solid var(--ios-separator)',
              }}
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl text-[12px] font-bold text-white cursor-pointer"
              style={{ background: 'var(--ios-purple)' }}
            >
              Сохранить и объяснить
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
