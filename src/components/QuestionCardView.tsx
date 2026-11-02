import React, { useState, useEffect, useRef } from 'react';
import {
  TrainerQuestion,
  FipiQuestion,
  resolveTask15Sentence,
  cleanWord,
  cleanExplanation,
  checkFipiQuestionAnswer,
} from '../utils/trainerLogic';
import { classifyWordSubtopicAndException } from '../utils/wordClassifier';
import { Task15SentenceView } from './Task15SentenceView';
import { FormattedInstruction } from './FormattedInstruction';

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
  onAnswer: (isCorrect: boolean, userChoiceLabel: string) => void;
  onOpenRuleForTask?: (task: TrainerQuestion['task']) => void;
}

export const QuestionCardView: React.FC<QuestionCardViewProps> = React.memo(({
  question,
  onAnswer,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [fipiSelectedRows, setFipiSelectedRows] = useState<number[]>([]);
  const [fipiWordInput, setFipiWordInput] = useState<string>('');
  const [fipiMatchingDigits, setFipiMatchingDigits] = useState<number[]>([0, 0, 0, 0, 0]);
  const [activeMatchSlot, setActiveMatchSlot] = useState<number>(0);
  const [fipiSubmitted, setFipiSubmitted] = useState(false);
  const [fipiResultOk, setFipiResultOk] = useState<boolean | null>(null);

  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const answerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (answerTimerRef.current) clearTimeout(answerTimerRef.current);
    exitTimerRef.current = null;
    answerTimerRef.current = null;
  };

  useEffect(() => {
    clearTimers();
    setSelectedChoice(null);
    setIsExiting(false);
    setFipiSelectedRows([]);
    setFipiWordInput('');
    setFipiMatchingDigits([0, 0, 0, 0, 0]);
    setActiveMatchSlot(0);
    setFipiSubmitted(false);
    setFipiResultOk(null);

    return () => clearTimers();
  }, [question.instanceId || question.id]);

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
      clearTimers();
      setIsExiting(true);
      setTimeout(() => {
        onAnswer(ok, opt);
      }, 160);
    };

    const handlePickOption = (opt: string) => {
      if (isAnswered) return;
      setSelectedChoice(opt);
      const ok = opt === question.answer;

      const exitTime = ok ? 360 : 840;
      const advanceTime = ok ? 480 : 980;

      exitTimerRef.current = setTimeout(() => {
        setIsExiting(true);
      }, exitTime);

      answerTimerRef.current = setTimeout(() => {
        onAnswer(ok, opt);
      }, advanceTime);
    };

    const renderWordWithSlot = () => {
      const slotStateClass = !isAnswered ? '' : isCorrect ? 'ok' : 'bad';

      // Non-orthography tasks (4–8, 16–22): show prompt/statement cleanly
      if (!['9', '10', '11', '12', '13', '14', '15'].includes(question.task)) {
        const promptTitle = question.prefix.trim();
        const promptBody = question.suffix.trim();
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

          {question.context && (
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

                {!isCorrect && (
                  <button
                    type="button"
                    onClick={() => commitAnswer(false, selectedChoice || '')}
                    className="shrink-0 px-2.5 py-1 rounded-full text-[11.5px] font-bold cursor-pointer active:scale-95 transition-transform"
                    style={{
                      background: 'var(--ios-red)',
                      color: '#FFFFFF',
                    }}
                  >
                    Дальше →
                  </button>
                )}
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
    setFipiSelectedRows((prev) =>
      prev.includes(rowIdx1Based)
        ? prev.filter((r) => r !== rowIdx1Based)
        : [...prev, rowIdx1Based].sort((a, b) => a - b)
    );
  };

  const assignMatchingDigit = (digit: number) => {
    if (fipiSubmitted) return;
    setFipiMatchingDigits((prev) => {
      const next = [...prev];
      // If digit is already used in another slot, clear that slot first
      const existingSlot = next.indexOf(digit);
      if (existingSlot !== -1 && existingSlot !== activeMatchSlot) {
        next[existingSlot] = 0;
      }
      next[activeMatchSlot] = next[activeMatchSlot] === digit ? 0 : digit;
      return next;
    });
    // Advance active slot to next empty slot
    setActiveMatchSlot((prevSlot) => {
      for (let offset = 1; offset <= 5; offset++) {
        const cand = (prevSlot + offset) % 5;
        if (cand !== prevSlot && fipiMatchingDigits[cand] === 0) {
          return cand;
        }
      }
      return Math.min(4, prevSlot + 1);
    });
  };

  const getUserAnswerPayload = (): string => {
    if (effectiveKind === 'word_input') {
      return fipiWordInput.trim();
    }
    if (effectiveKind === 'matching_grid') {
      return fipiMatchingDigits.map((d) => (d > 0 ? String(d) : '')).join('');
    }
    return fipiSelectedRows.slice().sort((a, b) => a - b).join('');
  };

  const canSubmitFipi = (): boolean => {
    if (fipiSubmitted) return false;
    if (effectiveKind === 'word_input') {
      return fipiWordInput.trim().length > 0;
    }
    if (effectiveKind === 'matching_grid') {
      return fipiMatchingDigits.every((d) => d >= 1 && d <= 9);
    }
    return fipiSelectedRows.length > 0;
  };

  const checkResult = checkFipiQuestionAnswer(fipiQ, getUserAnswerPayload());
  const correctStr = checkResult.correctAnswerDisplay;
  const userStr = getUserAnswerPayload();

  const handleCheckFipi = () => {
    if (!canSubmitFipi()) return;
    setFipiSubmitted(true);
    setFipiResultOk(checkResult.isCorrect);
  };

  const handleProceedFipi = () => {
    const ok = checkResult.isCorrect;
    setIsExiting(true);
    setTimeout(() => {
      onAnswer(ok, userStr || '—');
    }, 180);
  };

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

  const getRowFeedbackLabel = (row: FipiQuestion['rows'][number]): string => {
    if (fipiQ.task === '4') {
      return row.isCorrectRow ? `Верное ударение: ${row.letter}` : `Неверно (норма: ${row.letter})`;
    }
    if (fipiQ.task === '16') {
      return row.isCorrectRow ? 'Подходит: одна запятая' : `Не подходит (${row.letter})`;
    }
    if (fipiQ.task === '21') {
      return row.isCorrectRow ? `Входит в ответ (${row.letter})` : row.letter || 'Не входит в ответ';
    }
    if (fipiQ.task === '13' || fipiQ.task === '14') {
      return row.isCorrectRow ? `Подходит: ${row.letter}` : `Не подходит: ${row.letter}`;
    }
    return row.isCorrectRow
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
          <FormattedInstruction rule={fipiQ.rule} task={fipiQ.task} />
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
              onToggleDigit={toggleRow}
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
                let circleClass =
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-full text-[15px] sm:text-[17px] font-black flex items-center justify-center transition-all select-none shadow-xs active:scale-95 cursor-pointer';
                let circleStyle: React.CSSProperties = {
                  background: 'var(--ios-bg-secondary)',
                  color: 'var(--ios-label)',
                  border: '1.5px solid var(--ios-separator)',
                };

                if (fipiSubmitted) {
                  if (row.isCorrectRow && isSelected) {
                    circleStyle = {
                      background: 'var(--ios-green-soft)',
                      color: 'var(--ios-green)',
                      border: '2px solid var(--ios-green)',
                    };
                  } else if (row.isCorrectRow && !isSelected) {
                    circleStyle = {
                      background: 'var(--ios-orange-soft)',
                      color: 'var(--ios-orange)',
                      border: '1.5px solid var(--ios-orange)',
                    };
                  } else if (!row.isCorrectRow && isSelected) {
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
                {fipiQ.rows.map((row, idx) => {
                  const digit = idx + 1;
                  const solvedWord = cleanWord(row.solvedWords[0] || row.words[0]);
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
                            background: row.isCorrectRow ? 'var(--ios-green)' : 'var(--ios-bg-tertiary)',
                            color: row.isCorrectRow ? '#fff' : 'var(--ios-label-sec)',
                          }}
                        >
                          {digit}
                        </span>
                        <span className="font-extrabold" style={{ color: 'var(--ios-label)' }}>
                          {solvedWord}
                        </span>
                        <span
                          className="text-[11px] ml-auto font-semibold"
                          style={{ color: row.isCorrectRow ? 'var(--ios-green)' : 'var(--ios-label-sec)' }}
                        >
                          {fipiQ.task === '15'
                            ? `пишется «${row.letter}»`
                            : row.isCorrectRow
                              ? 'запятая ставится'
                              : 'без запятой'}
                        </span>
                      </div>
                      {row.explanation && (
                        <div className="text-[11px] opacity-85 leading-snug pl-7" style={{ color: 'var(--ios-label-sec)' }}>
                          {cleanExplanation(row.explanation)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODE 2: Word Input + Hybrid Choice Pills (Tasks 5, 6, 7)           */}
      {/* ================================================================== */}
      {effectiveKind === 'word_input' && (
        <div className="flex flex-col gap-2.5 my-auto">
          {/* Sentence or 5 rows context */}
          {fipiQ.rows.length > 1 ? (
            <div className="flex flex-col gap-1.5">
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
                  <span>{(fipiSubmitted ? row.solvedWords : row.words).join(' ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="p-3.5 rounded-2xl border border-[var(--ios-separator)] text-[13.5px] sm:text-[14.5px] font-semibold leading-relaxed text-left whitespace-pre-line"
              style={{ background: 'var(--ios-bg-secondary)', color: 'var(--ios-label)' }}
            >
              {fipiQ.sentence || (fipiQ.rows[0]?.words || []).join(' ')}
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
                      onClick={() => setFipiWordInput(pill)}
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
              onChange={(e) => setFipiWordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmitFipi()) {
                  handleCheckFipi();
                }
              }}
              placeholder="Введите слово в бланк без пробелов..."
              className="w-full px-3.5 py-2.5 rounded-xl text-[15px] font-extrabold tracking-wide uppercase outline-none border transition-all"
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
          </div>

          {fipiSubmitted && fipiQ.rows[0]?.explanation && (
            <div
              className="p-3 rounded-2xl border border-[var(--ios-separator)] text-[11.5px] leading-snug text-left"
              style={{ background: 'var(--ios-bg-secondary)', color: 'var(--ios-label-sec)' }}
            >
              {cleanExplanation(fipiQ.rows[0].explanation)}
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
            <div className="grid grid-cols-5 gap-1.5">
              {['А', 'Б', 'В', 'Г', 'Д'].map((letter, slotIdx) => {
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

          {/* Letters А–Д Descriptions */}
          {fipiQ.matchingLetters && fipiQ.matchingLetters.length > 0 && (
            <div className="flex flex-col gap-1 max-h-[165px] overflow-y-auto pr-0.5">
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
          <div className="flex flex-col gap-1 max-h-[210px] overflow-y-auto pr-0.5">
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
                  <span className="flex-1">{row.words.join(' ').replace(/^\d+\)\s*/, '')}</span>
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
      )}

      {/* ================================================================== */}
      {/* MODE 4: Multi-Row Selection (Tasks 4, 9–14, 16, 21)                */}
      {/* ================================================================== */}
      {effectiveKind === 'rows' && (
        <div className="flex flex-col gap-1 sm:gap-1.5 my-auto flex-1 min-h-0 overflow-y-auto pr-0.5 no-scrollbar">
          {fipiQ.rows.map((row, idx) => {
            const rowNum = idx + 1;
            const isSelected = fipiSelectedRows.includes(rowNum);
            let rowState = isSelected ? 'selected' : '';
            if (fipiSubmitted) {
              if (row.isCorrectRow && isSelected) rowState = 'ok';
              else if (row.isCorrectRow && !isSelected) rowState = 'missed';
              else if (!row.isCorrectRow && isSelected) rowState = 'bad';
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
                      .map((w) => (['9', '10', '11', '12', '13', '14', '15'].includes(fipiQ.task) ? cleanWord(w) : w))
                      .join(', ')}
                  </div>
                  {fipiSubmitted && (
                    <div
                      className="text-[10.5px] mt-0.5 truncate font-semibold"
                      style={{
                        color: row.isCorrectRow
                          ? 'var(--ios-green)'
                          : 'var(--ios-label-sec)',
                      }}
                    >
                      {getRowFeedbackLabel(row)}
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
          <div className="flex flex-col gap-1.5 ios-feedback-pop">
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

            <button
              id="next-fipi-btn"
              type="button"
              onClick={handleProceedFipi}
              className="ios-btn-primary"
            >
              <span>Следующее задание →</span>
            </button>
          </div>
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
      </div>
    </div>
  );
});

QuestionCardView.displayName = 'QuestionCardView';
