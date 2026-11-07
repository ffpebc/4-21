import React from 'react';
import { FipiRow, resolveTask15Sentence } from '../utils/trainerLogic';

export interface Task15SentenceViewProps {
  sentence: string;
  rows: FipiRow[];
  selectedDigits: number[];
  isSubmitted: boolean;
  isAnswerCorrect?: boolean | null;
  onToggleDigit?: (digit: number) => void;
  className?: string;
  task?: string;
}

export const Task15SentenceView: React.FC<Task15SentenceViewProps> = React.memo(({
  sentence,
  rows,
  selectedDigits,
  isSubmitted,
  isAnswerCorrect,
  onToggleDigit,
  className = '',
  task,
}) => {
  const effectiveSentence = React.useMemo(() => {
    return resolveTask15Sentence({ sentence, rows, task });
  }, [sentence, rows, task]);

  // Pattern matches either:
  // 1) Words with internal gaps like деревя(1)ая, письме(2)ый (Task 15) -> groups 1, 2, 3
  // 2) Standalone punctuation gaps like (1), (2) (Tasks 17, 18, 19, 20) -> group 4
  const regex = /([А-Яа-яЁё-]+)\((\d+)\)([А-Яа-яЁё-]*)|\((\d+)\)/g;
  const elements: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(effectiveSentence)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;
    const isWordGap = match[2] !== undefined;
    const prefix = isWordGap ? match[1] : '';
    const digitStr = isWordGap ? match[2] : match[4];
    const suffix = isWordGap ? match[3] : '';
    const digit = parseInt(digitStr, 10);
    const rowIdx = digit - 1;
    const row =
      (isWordGap
        ? rows.find((r) => r.words.some((w) => w.includes(`(${digit})`)))
        : rows[rowIdx]) || rows[rowIdx];

    // Append preceding plain text
    if (matchStart > lastIdx) {
      elements.push(effectiveSentence.slice(lastIdx, matchStart));
    }

    const isSelected = selectedDigits.includes(digit);

    let badgeClass = 'inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded-md text-[11px] font-extrabold transition-all select-none ';
    let badgeText = `(${digit})`;

    if (isSubmitted && row) {
      const isEffectivelyCorrect = isAnswerCorrect ? isSelected : row.isCorrectRow;
      const displayLetter = row.letter || (isEffectivelyCorrect ? ',' : '—');
      const stateBadge = isWordGap
        ? displayLetter
        : isEffectivelyCorrect
          ? `, (${digit})`
          : `(${digit})`;
      if (isEffectivelyCorrect && isSelected) {
        badgeClass += 'bg-[var(--ios-green-soft)] text-[var(--ios-green)] border border-[rgba(52,199,89,0.35)] shadow-xs';
        badgeText = stateBadge;
      } else if (isEffectivelyCorrect && !isSelected) {
        badgeClass += 'bg-[var(--ios-orange-soft)] text-[var(--ios-orange)] border border-[rgba(255,149,0,0.35)]';
        badgeText = stateBadge;
      } else if (!isEffectivelyCorrect && isSelected) {
        badgeClass += 'bg-[var(--ios-red-soft)] text-[var(--ios-red)] border border-[rgba(255,59,48,0.35)]';
        badgeText = stateBadge;
      } else {
        badgeClass += 'bg-[var(--ios-bg-tertiary)] text-[var(--ios-label-sec)] border border-transparent opacity-75';
        badgeText = stateBadge;
      }
    } else if (isSelected) {
      badgeClass += 'bg-[var(--ios-blue)] text-white shadow-xs scale-105 active:scale-95';
      if (!isWordGap) {
        badgeText = `, (${digit})`;
      }
    } else {
      badgeClass += 'bg-[var(--ios-bg-tertiary)] text-[var(--ios-blue)] hover:bg-[var(--ios-blue-soft)] active:scale-95 cursor-pointer';
    }

    elements.push(
      <span
        key={`gap-${digit}-${matchStart}`}
        className="inline-flex items-baseline align-baseline whitespace-nowrap font-bold cursor-pointer transition-transform"
        onClick={() => {
          if (!isSubmitted && onToggleDigit) {
            onToggleDigit(digit);
          }
        }}
        onKeyDown={(e) => {
          if (!isSubmitted && onToggleDigit && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggleDigit(digit);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Цифра ${digit}`}
      >
        {prefix && <span>{prefix}</span>}
        <span className={badgeClass}>{badgeText}</span>
        {suffix && <span>{suffix}</span>}
      </span>
    );

    lastIdx = matchEnd;
  }

  // Append trailing plain text
  if (lastIdx < effectiveSentence.length) {
    elements.push(effectiveSentence.slice(lastIdx));
  }

  return (
    <div className={`leading-relaxed text-[14px] sm:text-[15.5px] font-medium ${className}`}>
      {elements}
    </div>
  );
});

Task15SentenceView.displayName = 'Task15SentenceView';
