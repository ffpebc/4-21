import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../utils/haptics';
import {
  TrainerQuestion,
  FipiQuestion,
  resolveTask15Sentence,
  cleanWord,
  cleanScraperArtifacts,
  cleanExplanation,
  checkFipiQuestionAnswer,
} from '../utils/trainerLogic';
import { classifyWordSubtopicAndException } from '../utils/wordClassifier';
import type { SavedQuestionAnswerState } from '../utils/storageSync';
import { Task15SentenceView } from './Task15SentenceView';
import { FormattedInstruction } from './FormattedInstruction';
import { GeminiExplainBlock } from './GeminiExplainBlock';
import { buildFipiExplainPayload, buildSprintExplainPayload } from '../utils/geminiExplain';

const SHORT_MORPHEME_BY_TASK: Record<TrainerQuestion['task'], string> = {
  '4': 'Ударения',
  '5': 'Паронимы',
  '6': 'Лексические нормы',
  '7': 'Морфолог. нормы',
  '8': 'Синтаксич. нормы',
  '9': 'Корень слова',
  '10': 'Приставка',
  '11': 'Суффикс',
  '12': 'Глагол / причастие',
  '13': 'Слитно / раздельно',
  '14': 'Слитно / дефис / разд.',
  '15': 'Правописание Н / НН',
  '16': 'Однородные / ССП',
  '17': 'Обособление',
  '18': 'Вводные / обращения',
  '19': 'СПП (запятые)',
  '20': 'Стык союзов',
  '21': 'Пунктуац. анализ',
  '22': 'Средства выразит.',
};

interface QuestionCardViewProps {
  question: TrainerQuestion;
  onAnswer?: (isCorrect: boolean, userChoiceLabel: string) => void;
  onOpenRuleForTask?: (task: TrainerQuestion['task']) => void;
  savedAnswerState?: SavedQuestionAnswerState | null;
  onCheckAnswer?: (
    isCorrect: boolean,
    userAnswer: string,
    answerSnapshot: SavedQuestionAnswerState
  ) => void;
  onProceedNext?: () => void;
  onDraftChange?: (answerSnapshot: SavedQuestionAnswerState) => void;
}

export const QuestionCardView: React.FC<QuestionCardViewProps> = React.memo(({
  question,
  onAnswer,
  onOpenRuleForTask,
  savedAnswerState,
  onCheckAnswer,
  onProceedNext,
  onDraftChange,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(
    (savedAnswerState?.selectedChoice as any) || null
  );
  const [isExiting, setIsExiting] = useState(false);
  const [fipiSelectedRows, setFipiSelectedRows] = useState<number[]>(
    savedAnswerState?.selectedRows || []
  );
  const [fipiWordInput, setFipiWordInput] = useState<string>(
    savedAnswerState?.wordInput || ''
  );
  const [fipiMatchingDigits, setFipiMatchingDigits] = useState<number[]>(
    savedAnswerState?.matchingDigits || [0, 0, 0, 0, 0]
  );
  const [activeMatchSlot, setActiveMatchSlot] = useState<number>(0);
  const [fipiSubmitted, setFipiSubmitted] = useState<boolean>(
    Boolean(savedAnswerState?.isSubmitted)
  );
  const [fipiResultOk, setFipiResultOk] = useState<boolean | null>(
    savedAnswerState?.isSubmitted ? Boolean(savedAnswerState.resultOk) : null
  );
  const [showSprintAiExplain, setShowSprintAiExplain] = useState(false);

  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const answerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (answerTimerRef.current) clearTimeout(answerTimerRef.current);
    exitTimerRef.current = null;
    answerTimerRef.current = null;
  };

  const notifyDraft = (
    rows: number[],
    word: string,
    matching: number[],
    choice: string | null
  ) => {
    if (fipiSubmitted) return;
    if (onDraftChange) {
      onDraftChange({
        isSubmitted: false,
        resultOk: false,
        userAnswerStr: '',
        selectedRows: rows,
        wordInput: word,
        matchingDigits: matching,
        selectedChoice: choice as any,
      });
    }
  };

  useEffect(() => {
    clearTimers();
    setSelectedChoice((savedAnswerState?.selectedChoice as any) || null);
    setIsExiting(false);
    setFipiSelectedRows(savedAnswerState?.selectedRows || []);
    setFipiWordInput(savedAnswerState?.wordInput || '');
    setFipiMatchingDigits(savedAnswerState?.matchingDigits || [0, 0, 0, 0, 0]);
    setActiveMatchSlot(0);
    setFipiSubmitted(Boolean(savedAnswerState?.isSubmitted));
    setFipiResultOk(
      savedAnswerState?.isSubmitted ? Boolean(savedAnswerState.resultOk) : null
    );
    setShowSprintAiExplain(false);

    return () => clearTimers();
  }, [question.instanceId || question.id, savedAnswerState]);

  if (question.kind === 'sprint') {
    const isAnswered = selectedChoice !== null;
    const isCorrect = selectedChoice === question.answer;
    const isOrthographySlotTask = ['9', '10', '11', '12', '15'].includes(question.task);
    const isWordMode =
      question.task === '13' ||
      question.task === '14' ||
      !isOrthographySlotTask;

    const liveMeta = classifyWordSubtopicAndException(
      question.task,
      question.prefix,
      question.suffix,
      question.answer,
      question.explanation || question.rule,
      question.context,
      question.isTrap
    );

    const isExceptionWord =
      liveMeta.topic.toLowerCase().includes('исключен') ||
      /\bискл\./i.test(question.context || '') ||
      /\bискл\./i.test(question.explanation || '');

    const displayTopic =
      isExceptionWord && !liveMeta.topic.toLowerCase().includes('исключен')
        ? `Исключение: ${liveMeta.topic}`
        : liveMeta.topic;

    const shortExplanation = (question.explanation || liveMeta.rule || '').trim();

    const commitAnswer = (ok: boolean, opt: string) => {
      haptics.tap();
      clearTimers();
      setIsExiting(true);
      if (onCheckAnswer) {
        onCheckAnswer(ok, opt, {
          isSubmitted: true,
          resultOk: ok,
          userAnswerStr: opt,
          selectedChoice: opt as any,
        });
      }
      setTimeout(() => {
        if (onProceedNext) {
          onProceedNext();
        } else if (onAnswer) {
          onAnswer(ok, opt);
        }
      }, 160);
    };

    const handlePickOption = (opt: string) => {
      if (isAnswered) return;
      setSelectedChoice(opt);
      const ok = opt === question.answer;
      if (ok) {
        haptics.success();
      } else {
        haptics.error();
      }

      if (onCheckAnswer) {
        onCheckAnswer(ok, opt, {
          isSubmitted: true,
          resultOk: ok,
          userAnswerStr: opt,
          selectedChoice: opt as any,
        });
      }

      const exitTime = ok ? 360 : 840;
      const advanceTime = ok ? 480 : 980;

      exitTimerRef.current = setTimeout(() => {
        setIsExiting(true);
      }, exitTime);

      answerTimerRef.current = setTimeout(() => {
        if (onProceedNext) {
          onProceedNext();
        } else if (onAnswer) {
          onAnswer(ok, opt);
        }
      }, advanceTime);
    };

    const renderWordWithSlot = () => {
      const slotStateClass = !isAnswered ? '' : isCorrect ? 'ok' : 'bad';

      // Non-orthography tasks (4–8, 16–22): show prompt/statement cleanly
      if (!['9', '10', '11', '12', '13', '14', '15'].includes(question.task)) {
        const promptTitle = question.prefix.trim();
        const isSentenceTask = ['5', '6', '8', '16', '17', '18', '19', '20', '21', '22'].includes(
          question.task
        );
        const rawBody = isSentenceTask
          ? (question.context || question.suffix).trim()
          : (question.suffix || question.context).trim();
        const promptBody = rawBody === promptTitle ? '' : rawBody;
        return (
          <div className="my-2 flex flex-col items-center justify-center gap-1.5 px-1">
            {promptTitle && (
              <div className="text-[16px] sm:text-[18px] font-extrabold tracking-tight leading-snug text-center">
                {promptTitle}
              </div>
            )}
            {promptBody && (
              <div
                className="text-[14px] sm:text-[15.5px] font-semibold leading-snug text-center px-2.5 py-1.5 rounded-xl border border-[var(--ios-separator)]"
                style={{ background: 'var(--ios-bg-primary)', color: 'var(--ios-label)' }}
              >
                {promptBody}
              </div>
            )}
          </div>
        );
      }

      // Task 13: (НЕ) with word
      if (question.task === '13') {
        if (!isAnswered) {
          return (
            <div className="text-[25px] sm:text-[29px] font-extrabold tracking-tight leading-tight text-center my-2 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="slot-gap !min-w-[46px] !px-2 font-black">(НЕ)</span>
              <span>{question.suffix}</span>
            </div>
          );
        }

        const isSlitno = question.answer === 'СЛИТНО';
        return (
          <div className="text-[25px] sm:text-[29px] font-extrabold tracking-tight leading-tight text-center my-2 flex items-center justify-center flex-wrap">
            <span className={`slot-gap !min-w-0 !px-2 ${isSlitno ? '!mr-0' : '!mr-2'} ${slotStateClass}`}>
              НЕ
            </span>
            <span>{question.suffix}</span>
          </div>
        );
      }

      // Task 14: (ЧАСТЬ В СКОБКАХ) + ОСТАЛЬНАЯ ЧАСТЬ СЛОВА
      if (question.task === '14') {
        const parenMatch = question.prefix.match(/^(.*)\(([^)]+)\)\s*$/);
        const leadText = parenMatch ? parenMatch[1].trim() : '';
        const parenWord = parenMatch
          ? parenMatch[2].trim()
          : question.prefix.replace(/[()]/g, '').trim();

        const suffixTokens = question.suffix.trim().split(/\s+/);
        const targetWordRest = suffixTokens[0] || '';
        const remainingSentence = suffixTokens.slice(1).join(' ');

        if (!isAnswered) {
          return (
            <div className="text-[20px] sm:text-[25px] font-extrabold tracking-tight leading-snug text-center my-2 flex flex-wrap items-center justify-center gap-1.5">
              {leadText && (
                <span className="opacity-80 font-medium align-middle">
                  {leadText}
                </span>
              )}
              <span className="slot-gap !min-w-[42px] !px-2.5 font-black inline-flex items-center justify-center flex-wrap gap-1 align-middle">
                <span>({parenWord})</span>
                {targetWordRest && <span>{targetWordRest}</span>}
              </span>
              {remainingSentence && (
                <span className="opacity-85 font-medium text-[18px] sm:text-[21px] align-middle">
                  {remainingSentence}
                </span>
              )}
            </div>
          );
        }

        const isSlitno = question.answer === 'СЛИТНО';
        const isDefisno = question.answer === 'ДЕФИСНО';
        return (
          <div className="text-[20px] sm:text-[25px] font-extrabold tracking-tight leading-snug text-center my-2 flex flex-wrap items-center justify-center gap-1.5">
            {leadText && (
              <span className="opacity-80 font-medium align-middle">
                {leadText}
              </span>
            )}
            <span className={`slot-gap !min-w-0 !px-3 font-black inline-flex items-center justify-center flex-wrap align-middle ${slotStateClass}`}>
              {isSlitno && `${parenWord}${targetWordRest}`}
              {isDefisno && `${parenWord}-${targetWordRest}`}
              {!isSlitno && !isDefisno && `${parenWord} ${targetWordRest}`}
            </span>
            {remainingSentence && (
              <span className="opacity-85 font-medium text-[18px] sm:text-[21px] align-middle">
                {remainingSentence}
              </span>
            )}
          </div>
        );
      }

      // General Tasks (9, 10, 11, 12, 15): Atomic target word + context
      const slotChar = !isAnswered ? '..' : question.answer.toUpperCase();

      const prefixTokens = question.prefix.trim().split(/\s+/);
      const targetWordStem = prefixTokens[prefixTokens.length - 1] || '';
      const leadSentence = prefixTokens.slice(0, -1).join(' ');

      const suffixTokens = question.suffix.trim().split(/\s+/);
      const targetWordEnding = suffixTokens[0] || '';
      const tailSentence = suffixTokens.slice(1).join(' ');

      return (
        <div className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-snug text-center my-2">
          {leadSentence && (
            <span className="font-semibold text-[19px] sm:text-[22px] opacity-80 mr-2 align-middle">
              {leadSentence}
            </span>
          )}
          <span className="whitespace-nowrap inline-flex items-center align-middle">
            <span>{targetWordStem}</span>
            <span className={`slot-gap ${slotStateClass}`}>{slotChar}</span>
            <span>{targetWordEnding}</span>
          </span>
          {tailSentence && (
            <span className="font-semibold text-[19px] sm:text-[22px] opacity-85 ml-2 align-middle">
              {tailSentence}
            </span>
          )}
        </div>
      );
    };

    const getSprintStageSubtitle = () => {
      if (isExceptionWord) return 'Внимание: слово-исключение';
      switch (question.task) {
        case '4':
          return 'Орфоэпическая норма (ударение)';
        case '5':
          return 'Выберите верный пароним';
        case '6':
          return 'Лексическая сочетаемость';
        case '7':
          return 'Морфологическая форма слова';
        case '8':
          return 'Тип синтаксической ошибки';
        case '13':
          return 'Слитное или раздельное написание';
        case '14':
          return 'Слитное, дефисное или раздельное';
        case '15':
          return 'Правописание Н или НН';
        case '16':
        case '17':
        case '18':
        case '19':
        case '20':
        case '21':
          return 'Пунктуационная норма';
        case '22':
          return 'Средство выразительности';
        default:
          return 'Вставьте пропущенную букву';
      }
    };

    return (
      <div
        key={question.instanceId || question.id}
        className={`flex-1 flex flex-col justify-between gap-3 ${
          isExiting ? 'word-stage-exit' : ''
        }`}
      >
        {/* Top Meta Bar */}
        <div
          className="flex items-center justify-between gap-2 text-[11.5px] font-bold whitespace-nowrap"
          style={{ color: 'var(--ios-label-sec)' }}
        >
          <span
            className="truncate"
            style={{ color: isExceptionWord ? 'var(--ios-orange)' : 'var(--ios-blue)' }}
          >
            № {question.task} · {displayTopic}
          </span>
          <span
            className="shrink-0 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold"
            style={{
              background: isExceptionWord
                ? 'var(--ios-orange-soft)'
                : liveMeta.isTrap
                  ? 'var(--ios-purple-soft)'
                  : 'var(--ios-bg-secondary)',
              color: isExceptionWord
                ? 'var(--ios-orange)'
                : liveMeta.isTrap
                  ? 'var(--ios-purple)'
                  : 'var(--ios-label-sec)',
            }}
          >
            {isExceptionWord
              ? 'Исключение'
              : liveMeta.isTrap
                ? 'Ловушка ЕГЭ'
                : SHORT_MORPHEME_BY_TASK[question.task]}
          </span>
        </div>

        {/* Word Stage Card */}
        <div
          className="my-auto py-4 px-3 rounded-2xl text-center word-stage-animate"
          style={{ background: 'var(--ios-bg-secondary)' }}
        >
          <div
            className="text-[11px] font-bold uppercase tracking-wide mb-1 whitespace-nowrap truncate"
            style={{ color: isExceptionWord ? 'var(--ios-orange)' : 'var(--ios-label-sec)' }}
          >
            {getSprintStageSubtitle()}
          </div>

          {renderWordWithSlot()}

          {question.context &&
            ['9', '10', '11', '12', '13', '14', '15'].includes(question.task) && (
            <div
              className="text-[13.5px] font-medium mt-1 leading-snug px-1 text-center"
              style={{ color: 'var(--ios-label-sec)' }}
            >
              {question.context}
            </div>
          )}

          {/* Structured Feedback Area */}
          <div className="min-h-[42px] flex items-center justify-center mt-2">
            {isAnswered ? (
              <div
                className="w-full px-3.5 py-2 rounded-xl ios-feedback-pop text-[12.5px] font-medium leading-tight flex items-center justify-between gap-2"
                style={{
                  background: isCorrect ? 'var(--ios-green-soft)' : 'var(--ios-red-soft)',
                  color: isCorrect ? 'var(--ios-green)' : 'var(--ios-red)',
                }}
              >
                <div className="flex-1 flex flex-col items-start min-w-0 text-left">
                  <div className="flex items-center gap-1.5 w-full">
                    <span className="font-extrabold text-[13px] shrink-0">
                      {isCorrect ? 'Верно' : 'Ошибка'}
                    </span>
                    <span className="opacity-90 font-bold text-[12px] truncate">
                      {isCorrect ? `Ответ: ${question.answer}` : `Правильно: ${question.answer}`}
                    </span>
                  </div>
                  {shortExplanation && (
                    <span className="text-[11px] opacity-85 truncate w-full mt-0.5">
                      {shortExplanation}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!showSprintAiExplain && (
                    <button
                      type="button"
                      onClick={() => {
                        haptics.tap();
                        clearTimers();
                        setIsExiting(false);
                        setShowSprintAiExplain(true);
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer active:scale-[0.96] transition-transform"
                      style={{
                        background: 'var(--ios-purple-soft)',
                        color: 'var(--ios-purple)',
                      }}
                    >
                      ИИ-разбор
                    </button>
                  )}
                  {(!isCorrect || showSprintAiExplain) && (
                    <button
                      type="button"
                      onClick={() => commitAnswer(Boolean(isCorrect), selectedChoice || '')}
                      className="shrink-0 px-2.5 py-1 rounded-full text-[11.5px] font-bold cursor-pointer active:scale-[0.96] transition-transform"
                      style={{
                        background: isCorrect ? 'var(--ios-green)' : 'var(--ios-red)',
                        color: '#FFFFFF',
                      }}
                    >
                      Дальше →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <span
                className="text-[11px] font-semibold"
                style={{ color: 'var(--ios-label-ter)' }}
              >
                Нажмите вариант для ответа
              </span>
            )}
          </div>
          <AnimatePresence>
            {isAnswered && showSprintAiExplain && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: 'spring', duration: 0.28, bounce: 0 }}
              >
                <GeminiExplainBlock
                  compact
                  autoFetch
                  payload={buildSprintExplainPayload(question, selectedChoice || '')}
                  onOpenCheatsheet={onOpenRuleForTask}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Answer Options */}
        <div
          className={`grid gap-2 sm:gap-3 mt-auto ${
            question.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
          }`}
        >
          {question.options.map((opt, idx) => {
            let stateCls = '';
            if (isAnswered) {
              if (opt === question.answer) stateCls = 'ok';
              else if (opt === selectedChoice) stateCls = 'bad';
            }
            const isDash = opt === '—';
            return (
              <button
                key={`sprint-option-${idx}-${opt}`}
                id={`sprint-option-${idx}`}
                type="button"
                disabled={isAnswered}
                onClick={() => handlePickOption(opt)}
                className={`choice-card-btn ${isWordMode || isDash ? 'word-mode' : ''} ${stateCls} ${
                  opt.length > 7 ? '!text-[12.5px] sm:!text-[14px] !px-1.5' : ''
                }`}
              >
                {isDash ? '— (нет буквы)' : opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // FIPI Format (EГЭ Realistic Mode for Tasks 4–22)
  // ==========================================================================
  const fipiQ: FipiQuestion = question;
  const effectiveKind: NonNullable<FipiQuestion['questionKind']> =
    fipiQ.questionKind ||
    (['5', '6', '7'].includes(fipiQ.task)
      ? 'word_input'
      : ['8', '22'].includes(fipiQ.task)
        ? 'matching_grid'
        : ['15', '17', '18', '19', '20'].includes(fipiQ.task)
          ? 'numbered_gaps'
          : 'rows');

  const toggleRow = (rowIdx1Based: number) => {
    if (fipiSubmitted) return;
    haptics.selection();
    setFipiSelectedRows((prev) => {
      const next = prev.includes(rowIdx1Based)
        ? prev.filter((r) => r !== rowIdx1Based)
        : [...prev, rowIdx1Based].sort((a, b) => a - b);
      notifyDraft(next, fipiWordInput, fipiMatchingDigits, selectedChoice);
      return next;
    });
  };

  const assignMatchingDigit = (digit: number) => {
    if (fipiSubmitted) return;
    haptics.selection();
    let slotCleared = false;
    let nextDigits: number[] = [];
    setFipiMatchingDigits((prev) => {
      const next = [...prev];
      // If digit is already used in another slot, clear that slot first
      const existingSlot = next.indexOf(digit);
      if (existingSlot !== -1 && existingSlot !== activeMatchSlot) {
        next[existingSlot] = 0;
      }
      if (next[activeMatchSlot] === digit) {
        next[activeMatchSlot] = 0;
        slotCleared = true;
      } else {
        next[activeMatchSlot] = digit;
      }
      nextDigits = next;
      notifyDraft(fipiSelectedRows, fipiWordInput, next, selectedChoice);
      return next;
    });
    // Advance active slot only when digit is assigned, staying if deselected
    if (!slotCleared) {
      const slotsCount = fipiQ.correctIndices.length || 5;
      setActiveMatchSlot((prevSlot) => {
        for (let offset = 1; offset <= slotsCount; offset++) {
          const cand = (prevSlot + offset) % slotsCount;
          if (cand !== prevSlot && nextDigits[cand] === 0) {
            return cand;
          }
        }
        return prevSlot;
      });
    }
  };

  const getUserAnswerPayload = (): string => {
    if (effectiveKind === 'word_input') {
      return fipiWordInput.trim();
    }
    if (effectiveKind === 'matching_grid') {
      const slotsCount = fipiQ.correctIndices.length || 5;
      return fipiMatchingDigits.slice(0, slotsCount).map((d) => (d > 0 ? String(d) : '')).join('');
    }
    return fipiSelectedRows.slice().sort((a, b) => a - b).join('');
  };

  const canSubmitFipi = (): boolean => {
    if (fipiSubmitted) return false;
    if (effectiveKind === 'word_input') {
      return fipiWordInput.trim().length > 0;
    }
    if (effectiveKind === 'matching_grid') {
      const slotsCount = fipiQ.correctIndices.length || 5;
      return fipiMatchingDigits.slice(0, slotsCount).every((d) => d >= 1 && d <= 9);
    }
    return fipiSelectedRows.length > 0;
  };

  const checkResult = checkFipiQuestionAnswer(
    fipiQ,
    effectiveKind === 'rows' || effectiveKind === 'numbered_gaps'
      ? fipiSelectedRows
      : getUserAnswerPayload()
  );
  const correctStr = checkResult.correctAnswerDisplay;
  const userStr = getUserAnswerPayload();

  const isRowEffectivelyCorrect = (
    rowNum: number,
    row: FipiQuestion['rows'][number]
  ): boolean => {
    if (fipiSubmitted && fipiResultOk) {
      return fipiSelectedRows.includes(rowNum);
    }
    return Boolean(row.isCorrectRow);
  };

  const handleCheckFipi = () => {
    if (!canSubmitFipi()) return;
    const ok = Boolean(checkResult.isCorrect);
    if (ok) {
      haptics.success();
    } else {
      haptics.error();
    }
    const uStr = userStr || '—';
    setFipiSubmitted(true);
    setFipiResultOk(ok);

    const snapshot: SavedQuestionAnswerState = {
      isSubmitted: true,
      resultOk: ok,
      userAnswerStr: uStr,
      selectedRows: [...fipiSelectedRows],
      wordInput: fipiWordInput,
      matchingDigits: [...fipiMatchingDigits],
      selectedChoice: selectedChoice as any,
    };

    if (onCheckAnswer) {
      onCheckAnswer(ok, uStr, snapshot);
    }
  };

  const handleProceedFipi = () => {
    haptics.tap();
    const ok = Boolean(checkResult.isCorrect);
    setIsExiting(true);
    setTimeout(() => {
      if (onProceedNext) {
        onProceedNext();
      } else if (onAnswer) {
        onAnswer(ok, userStr || '—');
      }
    }, 180);
  };

  // Ergonomic Desktop Keyboard Shortcuts (Enter = check/advance, 1..9 = toggle/assign)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Enter') {
        if (!fipiSubmitted && canSubmitFipi()) {
          e.preventDefault();
          handleCheckFipi();
        } else if (fipiSubmitted) {
          e.preventDefault();
          handleProceedFipi();
        }
        return;
      }

      if (!fipiSubmitted && e.key >= '1' && e.key <= '9') {
        const digit = Number(e.key);
        if (effectiveKind === 'matching_grid') {
          if (digit >= 1 && digit <= fipiQ.rows.length) {
            e.preventDefault();
            assignMatchingDigit(digit);
          }
        } else if (effectiveKind === 'rows' || effectiveKind === 'numbered_gaps') {
          if (digit >= 1 && digit <= fipiQ.rows.length) {
            e.preventDefault();
            toggleRow(digit);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    fipiSubmitted,
    canSubmitFipi,
    handleCheckFipi,
    handleProceedFipi,
    effectiveKind,
    fipiQ.rows.length,
    activeMatchSlot,
  ]);

  const fipiHasExceptions = fipiQ.rows.some((r) =>
    /исключен|искл\./i.test(r.explanation || '')
  );

  const renderTopInstructionHint = () => {
    if (fipiSubmitted) return `Ответ: ${correctStr}`;
    if (effectiveKind === 'word_input') return 'Запишите слово';
    if (effectiveKind === 'matching_grid') return 'А Б В Г Д (2 балла)';
    if (effectiveKind === 'numbered_gaps') return 'Укажите цифры';
    return 'Укажите номера ответов';
  };

  const getRowFeedbackLabel = (
    row: FipiQuestion['rows'][number],
    rowIsCorrect: boolean = Boolean(row.isCorrectRow),
    rowNum?: number
  ): string => {
    if (fipiQ.task === '4') {
      return rowIsCorrect
        ? 'Верное ударение'
        : `Неверно (норма: ${row.solvedWords[0] || row.letter})`;
    }
    if (fipiQ.task === '15') {
      return `Пишется ${row.letter || '—'}`;
    }
    if (fipiQ.task === '16') {
      return rowIsCorrect ? 'Подходит: одна запятая' : `Не подходит (${row.letter})`;
    }
    if (fipiQ.task === '21') {
      const displayRuleOrNum =
        row.letter && row.letter !== '—' ? row.letter : String(rowNum ?? '');
      return rowIsCorrect
        ? `Входит в ответ (${displayRuleOrNum})`
        : row.letter && row.letter !== '—'
          ? row.letter
          : 'Не входит в ответ';
    }
    if (fipiQ.task === '13' || fipiQ.task === '14') {
      return rowIsCorrect ? `Подходит: ${row.letter}` : `Не подходит: ${row.letter}`;
    }
    return rowIsCorrect
      ? `Подходит: одна и та же буква «${row.letter}»`
      : 'Разные буквы в ряду';
  };

  return (
    <div
      key={fipiQ.instanceId || fipiQ.id}
      className={`flex-1 min-h-0 flex flex-col justify-between gap-1.5 sm:gap-2 word-stage-animate ${
        isExiting ? 'word-stage-exit' : ''
      }`}
    >
      {/* Top Meta Bar */}
      <div
        className="flex items-center justify-between gap-2 text-[11px] font-bold"
        style={{ color: 'var(--ios-label-sec)' }}
      >
        <span
          className="truncate"
          style={{ color: fipiHasExceptions ? 'var(--ios-orange)' : 'var(--ios-blue)' }}
        >
          № {fipiQ.task} · {fipiQ.topic}
          {fipiHasExceptions ? ' (есть исключения)' : ''}
        </span>
        <span className="shrink-0 text-right" style={{ color: 'var(--ios-label-sec)' }}>
          {renderTopInstructionHint()}
        </span>
      </div>

      {/* Official Instruction Box */}
      <div
        className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-left border border-[var(--ios-separator)] shadow-xs"
        style={{ background: 'var(--ios-bg-secondary)', color: 'var(--ios-label)' }}
      >
        <div className="text-[12.5px] sm:text-[13.5px] font-semibold leading-snug">
          <FormattedInstruction
            rule={fipiQ.rule}
            instruction={fipiQ.instruction}
            task={fipiQ.task}
            question={fipiQ}
            target={(fipiQ as any).target}
          />
        </div>
      </div>

      {/* ================================================================== */}
      {/* MODE 1: Numbered Gaps in Sentence (Tasks 15, 17, 18, 19, 20)       */}
      {/* ================================================================== */}
      {effectiveKind === 'numbered_gaps' && (
        <div className="flex flex-col gap-1.5 my-auto flex-1 min-h-0 overflow-y-auto pr-0.5 no-scrollbar">
          <div
            className="p-3 sm:p-3.5 rounded-xl text-left border border-[var(--ios-separator)] shadow-xs"
            style={{
              background: 'var(--ios-bg-secondary)',
              color: 'var(--ios-label)',
            }}
          >
            <div
              className="text-[10px] font-extrabold uppercase tracking-wider mb-1 opacity-70"
              style={{ color: 'var(--ios-blue)' }}
            >
              {fipiQ.task === '15' ? 'Предложение задания:' : 'Нажмите на цифры в предложении, где нужна запятая:'}
            </div>
            <Task15SentenceView
              sentence={resolveTask15Sentence(fipiQ)}
              rows={fipiQ.rows}
              selectedDigits={fipiSelectedRows}
              isSubmitted={fipiSubmitted}
              isAnswerCorrect={fipiResultOk}
              onToggleDigit={toggleRow}
              task={fipiQ.task}
            />
          </div>

          <div className="flex flex-col gap-1.5 my-1">
            <div
              className="text-[10.5px] font-bold text-center uppercase tracking-wider opacity-65"
              style={{ color: 'var(--ios-label-sec)' }}
            >
              {fipiSubmitted ? 'Результат по номерам:' : 'Выберите цифры ответа:'}
            </div>

            <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-2.5 my-0.5 w-full mx-auto">
              {fipiQ.rows.map((row, idx) => {
                const digit = idx + 1;
                const isSelected = fipiSelectedRows.includes(digit);
                const rowIsCorrect = isRowEffectivelyCorrect(digit, row);
                let circleClass =
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-full text-[15px] sm:text-[17px] font-black flex items-center justify-center transition-all select-none shadow-xs active:scale-95 cursor-pointer';
                let circleStyle: React.CSSProperties = {
                  background: 'var(--ios-bg-secondary)',
                  color: 'var(--ios-label)',
                  border: '1.5px solid var(--ios-separator)',
                };

                if (fipiSubmitted) {
                  if (rowIsCorrect && isSelected) {
                    circleStyle = {
                      background: 'var(--ios-green-soft)',
                      color: 'var(--ios-green)',
                      border: '2px solid var(--ios-green)',
                    };
                  } else if (rowIsCorrect && !isSelected) {
                    circleStyle = {
                      background: 'var(--ios-orange-soft)',
                      color: 'var(--ios-orange)',
                      border: '1.5px solid var(--ios-orange)',
                    };
                  } else if (!rowIsCorrect && isSelected) {
                    circleStyle = {
                      background: 'var(--ios-red-soft)',
                      color: 'var(--ios-red)',
                      border: '2px solid var(--ios-red)',
                    };
                  } else {
                    circleStyle = {
                      background: 'var(--ios-bg-secondary)',
                      color: 'var(--ios-label-sec)',
                      border: '1px solid var(--ios-separator)',
                      opacity: 0.45,
                    };
                  }
                } else if (isSelected) {
                  circleStyle = {
                    background: 'var(--ios-blue)',
                    color: '#FFFFFF',
                    border: '2px solid var(--ios-blue)',
                    boxShadow: '0 4px 14px rgba(0, 122, 255, 0.35)',
                  };
                  circleClass += ' scale-105';
                }

                return (
                  <button
                    key={digit}
                    id={`fipi-row-${digit}`}
                    type="button"
                    disabled={fipiSubmitted}
                    onClick={() => toggleRow(digit)}
                    className={circleClass}
                    style={circleStyle}
                    aria-label={`Цифра ${digit}${isSelected ? ' (выбрана)' : ''}`}
                  >
                    <span>{digit}</span>
                  </button>
                );
              })}
            </div>

            {fipiSubmitted && (
              <div className="flex flex-col gap-1.5 mt-2 text-left max-h-[220px] overflow-y-auto pr-1">
                {(() => {
                  const isSharedExplanation =
                    ['17', '18', '19', '20'].includes(fipiQ.task) ||
                    fipiQ.rows.every((r) => r.explanation === fipiQ.rows[0]?.explanation);
                  return (
                    <>
                      {fipiQ.rows.map((row, idx) => {
                        const digit = idx + 1;
                        const rowIsCorrect = isRowEffectivelyCorrect(digit, row);
                        const solvedWord = fipiQ.task === '15'
                          ? cleanWord(row.solvedWords[0] || row.words[0])
                          : `Позиция (${digit})`;
                        return (
                          <div
                            key={digit}
                            className="p-2.5 rounded-2xl border border-[var(--ios-separator)] text-[12px]"
                            style={{ background: 'var(--ios-bg-secondary)' }}
                          >
                            <div className="flex items-center gap-2 font-bold mb-0.5">
                              <span
                                className="w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0"
                                style={{
                                  background: rowIsCorrect ? 'var(--ios-green)' : 'var(--ios-bg-tertiary)',
                                  color: rowIsCorrect ? '#fff' : 'var(--ios-label-sec)',
                                }}
                              >
                                {digit}
                              </span>
                              <span className="font-extrabold" style={{ color: 'var(--ios-label)' }}>
                                {solvedWord}
                              </span>
                              <span
                                className="text-[11px] ml-auto font-semibold"
                                style={{ color: rowIsCorrect ? 'var(--ios-green)' : 'var(--ios-label-sec)' }}
                              >
                                {fipiQ.task === '15'
                                  ? `пишется «${row.letter}»`
                                  : rowIsCorrect
                                    ? 'запятая ставится'
                                    : 'без запятой'}
                              </span>
                            </div>
                            {!isSharedExplanation && row.explanation && (
                              <div className="text-[11px] opacity-85 leading-snug pl-7" style={{ color: 'var(--ios-label-sec)' }}>
                                {cleanExplanation(row.explanation)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {isSharedExplanation && fipiQ.rows[0]?.explanation && (
                        <div
                          className="p-2.5 rounded-2xl border border-[var(--ios-separator)] text-[11px] opacity-90 leading-snug mt-1"
                          style={{ background: 'var(--ios-bg-secondary)', color: 'var(--ios-label-sec)' }}
                        >
                          <div className="font-bold mb-1" style={{ color: 'var(--ios-blue)' }}>
                            Пояснение к знакам препинания:
                          </div>
                          {cleanExplanation(fipiQ.rows[0].explanation)}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODE 2: Word Input + Hybrid Choice Pills (Tasks 5, 6, 7)           */}
      {/* ================================================================== */}
      {effectiveKind === 'word_input' && (
        <div className="flex flex-col gap-2 my-auto flex-1 min-h-0 overflow-y-auto pr-0.5 no-scrollbar">
          {/* Sentence or 5 rows context */}
          {fipiQ.rows.length > 1 ? (
            <div className="flex flex-col gap-1.5 max-h-[210px] sm:max-h-[240px] overflow-y-auto pr-0.5">
              {fipiQ.rows.map((row, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-xl border border-[var(--ios-separator)] text-[12.5px] sm:text-[13.5px] font-semibold leading-snug text-left"
                  style={{
                    background:
                      fipiSubmitted && row.isCorrectRow
                        ? 'var(--ios-green-soft)'
                        : 'var(--ios-bg-secondary)',
                    color: 'var(--ios-label)',
                  }}
                >
                  <span className="opacity-60 font-extrabold mr-1.5">{idx + 1})</span>
                  <span>{(fipiSubmitted ? row.solvedWords : row.words).map(cleanScraperArtifacts).join(' ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="p-3.5 rounded-2xl border border-[var(--ios-separator)] text-[13.5px] sm:text-[14.5px] font-semibold leading-relaxed text-left whitespace-pre-line"
              style={{ background: 'var(--ios-bg-secondary)', color: 'var(--ios-label)' }}
            >
              {cleanScraperArtifacts(fipiQ.sentence || (fipiQ.rows[0]?.words || []).join(' '))}
            </div>
          )}

          {/* Hybrid Quick Choice Pills (if available) */}
          {fipiQ.choiceOptions && fipiQ.choiceOptions.length > 0 && !fipiSubmitted && (
            <div className="flex flex-col gap-1">
              <span
                className="text-[10.5px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--ios-label-sec)' }}
              >
                Быстрый выбор или введите ответ вручную:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {fipiQ.choiceOptions.map((pill, idx) => {
                  const isPicked = fipiWordInput.trim().toUpperCase() === pill.trim().toUpperCase();
                  return (
                    <button
                      key={`pill-${idx}-${pill}`}
                      type="button"
                      onClick={() => {
                        setFipiWordInput(pill);
                        notifyDraft(fipiSelectedRows, pill, fipiMatchingDigits, selectedChoice);
                      }}
                      className="px-3 py-1.5 rounded-xl text-[12.5px] font-extrabold transition-all cursor-pointer active:scale-95"
                      style={{
                        background: isPicked ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
                        color: isPicked ? '#FFFFFF' : 'var(--ios-label)',
                        border: isPicked
                          ? '1.5px solid var(--ios-blue)'
                          : '1px solid var(--ios-separator)',
                      }}
                    >
                      {pill}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Official Exam Blank Input */}
          <div className="flex flex-col gap-1">
            <input
              type="text"
              disabled={fipiSubmitted}
              value={fipiWordInput}
              onChange={(e) => {
                const val = e.target.value;
                setFipiWordInput(val);
                notifyDraft(fipiSelectedRows, val, fipiMatchingDigits, selectedChoice);
              }}
              onBlur={() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                if (document.body) document.body.scrollTop = 0;
                if (document.documentElement) document.documentElement.scrollTop = 0;
                if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                  if (canSubmitFipi()) {
                    handleCheckFipi();
                  }
                }
              }}
              placeholder="Введите слово в бланк без пробелов..."
              className="w-full px-3.5 py-2.5 rounded-xl text-[16px] font-extrabold tracking-wide uppercase outline-none border transition-all"
              style={{
                background: 'var(--ios-bg-secondary)',
                color: 'var(--ios-label)',
                borderColor: fipiSubmitted
                  ? fipiResultOk
                    ? 'var(--ios-green)'
                    : 'var(--ios-red)'
                  : 'var(--ios-separator)',
              }}
            />
            {fipiSubmitted && !fipiResultOk && (
              <div
                className="text-[12px] font-extrabold text-left px-1 mt-0.5"
                style={{ color: 'var(--ios-green)' }}
              >
                Верный ответ: {(fipiQ.textAnswers || []).join(' / ') || fipiQ.rows.find((r) => r.isCorrectRow)?.letter}
              </div>
            )}
          </div>

          {fipiSubmitted && (
            <div
              className="p-3 rounded-2xl border border-[var(--ios-separator)] text-[11.5px] leading-snug text-left"
              style={{ background: 'var(--ios-bg-secondary)', color: 'var(--ios-label-sec)' }}
            >
              {(() => {
                const targetRow =
                  fipiQ.rows.find(
                    (r) =>
                      r.isCorrectRow &&
                      r.explanation &&
                      !r.explanation.includes('употреблён верно') &&
                      !r.explanation.includes('образована верно')
                  ) ||
                  fipiQ.rows.find((r) => r.isCorrectRow) ||
                  fipiQ.rows.find(
                    (r) =>
                      r.explanation &&
                      !r.explanation.includes('употреблён верно') &&
                      !r.explanation.includes('образована верно')
                  ) ||
                  fipiQ.rows[0];
                let expl = cleanExplanation(targetRow?.explanation);
                if (!expl || expl.includes('употреблён верно') || expl.includes('образована верно')) {
                  const correctAns =
                    (fipiQ.textAnswers || [])[0] ||
                    (fipiQ.rows.find((r) => r.isCorrectRow)?.solvedWords || [])[0] ||
                    '';
                  if (fipiQ.task === '5') {
                    expl = `Ошибка в употреблении паронима. Правильный пароним: ${correctAns}.`;
                  } else if (fipiQ.task === '7') {
                    expl = `Ошибка в образовании формы слова. Правильная форма: ${correctAns}.`;
                  }
                }
                return expl;
              })()}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* MODE 3: 5-Letter Matching Matrix А Б В Г Д (Tasks 8 & 22)          */}
      {/* ================================================================== */}
      {effectiveKind === 'matching_grid' && (
        <div className="flex flex-col gap-2 my-auto">
          {/* Interactive 5-Cell А Б В Г Д Blank */}
          <div
            className="p-2.5 rounded-2xl border border-[var(--ios-separator)] flex flex-col gap-1.5"
            style={{ background: 'var(--ios-bg-secondary)' }}
          >
            <div className="flex items-center justify-between text-[11px] font-bold px-1">
              <span style={{ color: 'var(--ios-label-sec)' }}>
                Бланк ответа А–Д (нажмите букву, затем номер 1–9):
              </span>
              {fipiSubmitted && (
                <span style={{ color: 'var(--ios-blue)' }}>
                  Баллы: {checkResult.pointsEarned} из {checkResult.maxPoints}
                </span>
              )}
            </div>
            <div className={`grid ${fipiQ.correctIndices.length === 4 ? 'grid-cols-4' : 'grid-cols-5'} gap-1.5`}>
              {['А', 'Б', 'В', 'Г', 'Д'].slice(0, fipiQ.correctIndices.length || 5).map((letter, slotIdx) => {
                const userDigit = fipiMatchingDigits[slotIdx];
                const expectedDigit = fipiQ.correctIndices[slotIdx];
                const isSlotActive = !fipiSubmitted && activeMatchSlot === slotIdx;
                const isSlotCorrect = fipiSubmitted && userDigit === expectedDigit;

                return (
                  <button
                    key={letter}
                    type="button"
                    disabled={fipiSubmitted}
                    onClick={() => setActiveMatchSlot(slotIdx)}
                    className="py-1.5 px-2 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer"
                    style={{
                      background: fipiSubmitted
                        ? isSlotCorrect
                          ? 'var(--ios-green-soft)'
                          : 'var(--ios-red-soft)'
                        : isSlotActive
                          ? 'var(--ios-blue-soft)'
                          : 'var(--ios-bg-primary)',
                      border: fipiSubmitted
                        ? `1.5px solid ${isSlotCorrect ? 'var(--ios-green)' : 'var(--ios-red)'}`
                        : isSlotActive
                          ? '2px solid var(--ios-blue)'
                          : '1px solid var(--ios-separator)',
                    }}
                  >
                    <span className="text-[10px] font-extrabold opacity-70">{letter}</span>
                    <span className="text-[16px] font-black leading-tight">
                      {userDigit > 0 ? userDigit : '—'}
                    </span>
                    {fipiSubmitted && !isSlotCorrect && (
                      <span className="text-[9.5px] font-extrabold" style={{ color: 'var(--ios-green)' }}>
                        верно: {expectedDigit}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop 2-Column Split: Grammar Definitions (Left) + Sentences 1-9 (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3.5 items-start">
            {/* Letters А–Д Descriptions */}
            {fipiQ.matchingLetters && fipiQ.matchingLetters.length > 0 && (
              <div className="flex flex-col gap-1 max-h-[165px] md:max-h-[460px] overflow-y-auto pr-0.5">
                {fipiQ.matchingLetters.map((item, idx) => {
                  const isCurrent = !fipiSubmitted && activeMatchSlot === idx;
                  const assignedDigit = fipiMatchingDigits[idx];
                  const rawItemText = typeof item === 'string' ? item : item.text || '';
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={fipiSubmitted}
                      onClick={() => setActiveMatchSlot(idx)}
                      className="px-2.5 py-1.5 rounded-xl text-left text-[11.5px] sm:text-[12.5px] font-semibold leading-snug flex items-start gap-2 transition-all cursor-pointer"
                      style={{
                        background: isCurrent ? 'var(--ios-blue-soft)' : 'var(--ios-bg-secondary)',
                        border: isCurrent
                          ? '1.5px solid var(--ios-blue)'
                          : '1px solid var(--ios-separator)',
                        color: 'var(--ios-label)',
                      }}
                    >
                      <span
                        className="px-1.5 py-0.5 rounded-md text-[10.5px] font-black shrink-0"
                        style={{
                          background: assignedDigit > 0 ? 'var(--ios-blue)' : 'var(--ios-bg-tertiary)',
                          color: assignedDigit > 0 ? '#FFFFFF' : 'var(--ios-label)',
                        }}
                      >
                        {['А', 'Б', 'В', 'Г', 'Д'][idx]}
                        {assignedDigit > 0 ? ` → ${assignedDigit}` : ''}
                      </span>
                      <span className="flex-1">{rawItemText.replace(/^[А-ДA-E]\)\s*/i, '')}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Numbered Candidates 1–9 */}
            <div className="flex flex-col gap-1 max-h-[210px] md:max-h-[460px] overflow-y-auto pr-0.5">
              {fipiQ.rows.map((row, idx) => {
                const digit = idx + 1;
                const assignedSlotIdx = fipiMatchingDigits.indexOf(digit);
                const assignedLetter =
                  assignedSlotIdx !== -1 ? ['А', 'Б', 'В', 'Г', 'Д'][assignedSlotIdx] : null;
                return (
                  <button
                    key={digit}
                    type="button"
                    disabled={fipiSubmitted}
                    onClick={() => assignMatchingDigit(digit)}
                    className="px-2.5 py-1.5 rounded-xl text-left text-[11.5px] sm:text-[12.5px] font-medium leading-snug flex items-start gap-2 transition-all cursor-pointer"
                    style={{
                      background: assignedLetter ? 'var(--ios-blue-soft)' : 'var(--ios-bg-secondary)',
                      border: assignedLetter
                        ? '1.5px solid var(--ios-blue)'
                        : '1px solid var(--ios-separator)',
                      color: 'var(--ios-label)',
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: assignedLetter ? 'var(--ios-blue)' : 'var(--ios-bg-tertiary)',
                        color: assignedLetter ? '#FFFFFF' : 'var(--ios-label)',
                      }}
                    >
                      {digit}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div>{cleanScraperArtifacts(row.words.join(' ').replace(/^\d+\)\s*/, ''))}</div>
                      {fipiSubmitted && row.explanation && (
                        <div
                          className="text-[10px] mt-0.5 opacity-90 leading-tight font-semibold"
                          style={{ color: row.isCorrectRow ? 'var(--ios-blue)' : 'var(--ios-label-sec)' }}
                        >
                          {cleanExplanation(row.explanation)}
                        </div>
                      )}
                    </div>
                    {assignedLetter && (
                      <span
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0"
                        style={{ background: 'var(--ios-blue)', color: '#FFFFFF' }}
                      >
                        {assignedLetter}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODE 4: Multi-Row Selection (Tasks 4, 9–14, 16, 21)                */}
      {/* ================================================================== */}
      {effectiveKind === 'rows' && (
        <div className="flex flex-col gap-1 sm:gap-1.5 my-auto flex-1 min-h-0 overflow-y-auto pr-0.5 no-scrollbar">
          {fipiQ.rows.map((row, idx) => {
            const rowNum = idx + 1;
            const isSelected = fipiSelectedRows.includes(rowNum);
            const rowIsCorrect = isRowEffectivelyCorrect(rowNum, row);
            let rowState = isSelected ? 'selected' : '';
            if (fipiSubmitted) {
              if (rowIsCorrect && isSelected) rowState = 'ok';
              else if (rowIsCorrect && !isSelected) rowState = 'missed';
              else if (!rowIsCorrect && isSelected) rowState = 'bad';
            }
            return (
              <button
                key={rowNum}
                id={`fipi-row-${rowNum}`}
                type="button"
                disabled={fipiSubmitted}
                onClick={() => toggleRow(rowNum)}
                className={`fipi-row-cell ${rowState}`}
              >
                <span
                  className="w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0"
                  style={{
                    background: isSelected ? 'var(--ios-blue)' : 'var(--ios-bg-tertiary)',
                    color: isSelected ? '#FFFFFF' : 'var(--ios-label)',
                  }}
                >
                  {rowNum}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[12.5px] sm:text-[13px] font-bold leading-tight">
                    {(fipiSubmitted ? row.solvedWords : row.words)
                      .map((w) => cleanScraperArtifacts(w).replace(/^\(\d+\)\s*/, ''))
                      .join(', ')}
                  </div>
                  {fipiSubmitted && (
                    <div
                      className="text-[10.5px] mt-0.5 truncate font-semibold"
                      style={{
                        color: rowIsCorrect
                          ? 'var(--ios-green)'
                          : 'var(--ios-label-sec)',
                      }}
                    >
                      {getRowFeedbackLabel(row, rowIsCorrect, rowNum)}
                    </div>
                  )}
                  {fipiSubmitted && row.explanation && (
                    <div
                      className="text-[10px] mt-0.5 line-clamp-2 opacity-85 leading-tight"
                      style={{ color: 'var(--ios-label-sec)' }}
                    >
                      {cleanExplanation(row.explanation)}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Submission & Next Action Banner */}
      <div className="mt-auto pt-1 flex flex-col gap-1.5 shrink-0">
        {fipiSubmitted ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', duration: 0.28, bounce: 0 }}
            className="flex flex-col gap-1.5"
          >
            <div
              className="px-3.5 py-2 rounded-xl text-[12px] font-bold text-center"
              style={{
                background: fipiResultOk ? 'var(--ios-green-soft)' : 'var(--ios-red-soft)',
                color: fipiResultOk ? 'var(--ios-green)' : 'var(--ios-red)',
              }}
            >
              {fipiResultOk ? (
                <span>
                  Верно ({checkResult.pointsEarned}/{checkResult.maxPoints} б.). Ответ:{' '}
                  <strong>{correctStr}</strong>
                </span>
              ) : (
                <span>
                  Ошибка ({checkResult.pointsEarned}/{checkResult.maxPoints} б.). Правильный ответ:{' '}
                  <strong>{correctStr}</strong> (ваш ответ: <strong>{userStr || '—'}</strong>)
                </span>
              )}
            </div>

            <GeminiExplainBlock
              compact
              payload={buildFipiExplainPayload(fipiQ, userStr)}
              onOpenCheatsheet={onOpenRuleForTask}
            />

            <button
              id="next-fipi-btn"
              type="button"
              onClick={handleProceedFipi}
              className="ios-btn-primary"
            >
              <span>Следующее задание →</span>
            </button>
          </motion.div>
        ) : (
          <button
            id="submit-fipi-btn"
            type="button"
            disabled={!canSubmitFipi()}
            onClick={handleCheckFipi}
            className="ios-btn-primary"
          >
            <span>
              {effectiveKind === 'word_input'
                ? fipiWordInput.trim()
                  ? `Проверить слово «${fipiWordInput.trim().toUpperCase()}»`
                  : 'Введите или выберите слово-ответ'
                : effectiveKind === 'matching_grid'
                  ? canSubmitFipi()
                    ? `Проверить соответствие (${fipiMatchingDigits.join('')})`
                    : 'Заполните все 5 букв (А–Д)'
                  : fipiSelectedRows.length > 0
                    ? `Проверить ответ (${fipiSelectedRows.join(', ')})`
                    : effectiveKind === 'numbered_gaps'
                      ? `Выберите цифры (1–${fipiQ.rows.length})`
                      : 'Выберите номера ответов'}
            </span>
          </button>
        )}

        {/* Desktop Keyboard Helper Hint */}
        <div className="hidden md:flex items-center justify-between text-[11px] font-semibold opacity-60 px-1 pt-1 select-none">
          <span>[ Enter ] {fipiSubmitted ? 'следующее' : 'проверить'}</span>
          <span>[ 1–{fipiQ.rows.length} ] выбор строки</span>
        </div>
      </div>
    </div>
  );
});

QuestionCardView.displayName = 'QuestionCardView';
