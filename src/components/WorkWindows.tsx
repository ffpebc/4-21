import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TaskId,
  TASK_IDS,
  TASK_META,
  TrainerQuestion,
  TrainerState,
  calculateAccuracyPercent,
  ErrorBankEntry,
  getTrainerBank,
  formatTask14SolvedWord,
  BALANCED_30_QUANTITIES,
} from '../utils/trainerLogic';
import { SwipeableSheet, LiquidGlassSegmented } from './LiquidGlassControls';
import { PARSED_WORDS, PARSED_WORDS_DATABASE, PARSED_SPRINT_QUESTIONS, sprintToWordEntry } from '../data/tasksBankData.ts';
import { classifyWordSubtopicAndException } from '../utils/wordClassifier.ts';

/* ============================================================================
   1. ОКНО «ШАБЛОНЫ И УМНЫЙ ПОДБОР ЗАНЯТИЯ» (PresetsModal)
   ============================================================================ */
interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: TrainerState;
  onApplyPreset: (qtyEach: number) => void;
  onApplyCustomQuantities: (quantities: Partial<Record<TaskId, number>>) => void;
  onApplyBalanced30?: () => void;
  onStartBalanced30Workout?: () => void;
  onStartFipiTraps: () => void;
  onStartWeakestTaskWorkout: (taskId: TaskId) => void;
  onStartRealKimWorkout?: () => void;
  onToggleShuffle?: () => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = React.memo(({
  isOpen,
  onClose,
  state,
  onApplyPreset,
  onApplyCustomQuantities,
  onApplyBalanced30,
  onStartBalanced30Workout,
  onStartFipiTraps,
  onStartWeakestTaskWorkout,
  onStartRealKimWorkout,
  onToggleShuffle,
}) => {
  const [customCountInput, setCustomCountInput] = useState('5');
  const customCount = Math.min(1000, Math.max(1, parseInt(customCountInput, 10) || 1));

  const handleStepCustomCount = (delta: number) => {
    const cur = parseInt(customCountInput, 10) || 1;
    const next = Math.min(1000, Math.max(1, cur + delta));
    setCustomCountInput(String(next));
  };

  const weakestTask = useMemo<TaskId>(() => {
    let worstId: TaskId = '12';
    let worstAcc = 101;
    for (const id of TASK_IDS) {
      const st = state.taskStats[id];
      if (st && st.solved > 0) {
        const acc = calculateAccuracyPercent(st.correct, st.solved);
        if (acc < worstAcc) {
          worstAcc = acc;
          worstId = id;
        }
      }
    }
    return worstId;
  }, [state.taskStats]);

  const weakestStat = state.taskStats[weakestTask] || { solved: 0, correct: 0 };
  const weakestAcc = calculateAccuracyPercent(weakestStat.correct, weakestStat.solved);

  return (
    <SwipeableSheet
      id="presets-modal"
      handleId="presets-drag-handle"
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Шаблоны и умный подбор занятия"
      handleAriaLabel="Потяните вниз, чтобы закрыть шаблоны занятия"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-[18px] font-extrabold tracking-tight leading-tight whitespace-nowrap truncate">
            Шаблоны занятия
          </h3>
          <span
            className="block text-[11.5px] truncate whitespace-nowrap mt-0.5"
            style={{ color: 'var(--ios-label-sec)' }}
          >
            Быстрый выбор объёма или старт в 1 касание
          </span>
        </div>
        <button
          id="close-presets-modal"
          type="button"
          onClick={onClose}
          className="liquid-pill-btn px-3.5 py-1.5 rounded-full text-[13.5px] font-bold cursor-pointer shrink-0"
        >
          Готово
        </button>
      </div>

      {/* 9 Uniform Template Tiles (Photo 5 design) */}
      <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch no-scrollbar space-y-2 pr-0.5 pb-6">
        {/* 1. Слабая тема */}
        <button
          type="button"
          id="smart-weakest-btn"
          onClick={() => {
            onClose();
            onStartWeakestTaskWorkout(weakestTask);
          }}
          className="ios-inset-group !mb-0 p-3 text-left flex items-center justify-between gap-2.5 cursor-pointer w-full rounded-2xl"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="ios-row-icon !w-9 !h-9 !rounded-xl !text-[13px] font-black !m-0 shrink-0"
              style={{ background: TASK_META[weakestTask].gradient }}
            >
              {weakestTask}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-extrabold leading-tight whitespace-nowrap truncate">
                Слабая тема: № {weakestTask} ({weakestAcc}%)
              </div>
              <div
                className="text-[11.5px] leading-tight mt-0.5 truncate whitespace-nowrap"
                style={{ color: 'var(--ios-label-sec)' }}
              >
                {TASK_META[weakestTask].title} · 20 заданий
              </div>
            </div>
          </div>
          <span
            className="text-[11.5px] font-bold px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ background: 'var(--ios-blue-soft)', color: 'var(--ios-blue)' }}
          >
            Старт →
          </span>
        </button>

        {/* 2. Ловушки ФИПИ */}
        <button
          type="button"
          id="smart-traps-btn"
          onClick={() => {
            onClose();
            onStartFipiTraps();
          }}
          className="ios-inset-group !mb-0 p-3 text-left flex items-center justify-between gap-2.5 cursor-pointer w-full rounded-2xl"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="ios-row-icon !w-9 !h-9 !rounded-xl !text-[14px] !m-0 shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF9500, #FF3B30)', color: '#FFFFFF' }}
            >
              !
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-extrabold leading-tight whitespace-nowrap truncate">
                Ловушки ФИПИ (15 слов)
              </div>
              <div
                className="text-[11.5px] leading-tight mt-0.5 truncate whitespace-nowrap"
                style={{ color: 'var(--ios-label-sec)' }}
              >
                Главные слова-исключения и ловушки заданий 4–22
              </div>
            </div>
          </div>
          <span
            className="text-[11.5px] font-bold px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ background: 'var(--ios-orange-soft)', color: 'var(--ios-orange)' }}
          >
            Старт →
          </span>
        </button>

        {/* 3. Полный КИМ */}
        <button
          type="button"
          id="smart-real-kim-btn"
          onClick={() => {
            onClose();
            if (onStartRealKimWorkout) {
              onStartRealKimWorkout();
            } else {
              const allActive: Record<TaskId, number> = {} as Record<TaskId, number>;
              TASK_IDS.forEach((id) => {
                allActive[id] = 1;
              });
              onApplyCustomQuantities(allActive);
            }
          }}
          className="ios-inset-group !mb-0 p-3 text-left flex items-center justify-between gap-2.5 cursor-pointer w-full rounded-2xl"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="ios-row-icon !w-9 !h-9 !rounded-xl !text-[12px] font-black !m-0 shrink-0"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)', color: '#FFFFFF' }}
            >
              КИМ
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-extrabold leading-tight whitespace-nowrap truncate">
                Полный КИМ ЕГЭ (19 заданий)
              </div>
              <div
                className="text-[11.5px] leading-tight mt-0.5 truncate whitespace-nowrap"
                style={{ color: 'var(--ios-label-sec)' }}
              >
                По 1 заданию на каждое из 19 заданий (№ 4–22)
              </div>
            </div>
          </div>
          <span
            className="text-[11.5px] font-bold px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ background: 'var(--ios-blue-soft)', color: 'var(--ios-blue)' }}
          >
            Старт →
          </span>
        </button>

        {/* 4. По 1 заданию */}
        <button
          type="button"
          id="preset-modal-1"
          onClick={() => {
            onApplyPreset(1);
            onClose();
          }}
          className="ios-inset-group !mb-0 p-3 text-left flex items-center justify-between gap-2.5 cursor-pointer w-full rounded-2xl"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="ios-row-icon !w-9 !h-9 !rounded-xl !text-[13px] font-black !m-0 shrink-0"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)', color: '#FFFFFF' }}
            >
              1
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-extrabold leading-tight whitespace-nowrap truncate">
                По 1 заданию (19 заданий)
              </div>
              <div
                className="text-[11.5px] leading-tight mt-0.5 truncate whitespace-nowrap"
                style={{ color: 'var(--ios-label-sec)' }}
              >
                Ровно по 1 заданию на все 19 заданий (№ 4–22)
              </div>
            </div>
          </div>
          <span
            className="text-[11.5px] font-bold px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ background: 'var(--ios-blue-soft)', color: 'var(--ios-blue)' }}
          >
            Применить →
          </span>
        </button>

        {/* 5. По 5 заданий */}
        <button
          type="button"
          id="preset-modal-5"
          onClick={() => {
            onApplyPreset(5);
            onClose();
          }}
          className="ios-inset-group !mb-0 p-3 text-left flex items-center justify-between gap-2.5 cursor-pointer w-full rounded-2xl"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="ios-row-icon !w-9 !h-9 !rounded-xl !text-[13px] font-black !m-0 shrink-0"
              style={{ background: 'linear-gradient(135deg, #5856D6, #AF52DE)', color: '#FFFFFF' }}
            >
              5
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-extrabold leading-tight whitespace-nowrap truncate">
                По 5 заданий (95 заданий)
              </div>
              <div
                className="text-[11.5px] leading-tight mt-0.5 truncate whitespace-nowrap"
                style={{ color: 'var(--ios-label-sec)' }}
              >
                Ровно по 5 заданий на все 19 заданий (№ 4–22)
              </div>
            </div>
          </div>
          <span
            className="text-[11.5px] font-bold px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ background: 'var(--ios-indigo-soft)', color: 'var(--ios-indigo)' }}
          >
            Применить →
          </span>
        </button>

        {/* 6. По 30 заданий */}
        <button
          type="button"
          id="preset-modal-30"
          onClick={() => {
            onApplyPreset(30);
            onClose();
          }}
          className="ios-inset-group !mb-0 p-3 text-left flex items-center justify-between gap-2.5 cursor-pointer w-full rounded-2xl"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="ios-row-icon !w-9 !h-9 !rounded-xl !text-[13px] font-black !m-0 shrink-0"
              style={{ background: 'linear-gradient(135deg, #30D158, #0A84FF)', color: '#FFFFFF' }}
            >
              30
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-extrabold leading-tight whitespace-nowrap truncate">
                По 30 заданий (570 заданий)
              </div>
              <div
                className="text-[11.5px] leading-tight mt-0.5 truncate whitespace-nowrap"
                style={{ color: 'var(--ios-label-sec)' }}
              >
                Ровно по 30 заданий на все 19 заданий (№ 4–22)
              </div>
            </div>
          </div>
          <span
            className="text-[11.5px] font-bold px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ background: 'var(--ios-green-soft)', color: 'var(--ios-green)' }}
          >
            Применить →
          </span>
        </button>

        {/* 7. По 50 заданий */}
        <button
          type="button"
          id="preset-modal-50"
          onClick={() => {
            onApplyPreset(50);
            onClose();
          }}
          className="ios-inset-group !mb-0 p-3 text-left flex items-center justify-between gap-2.5 cursor-pointer w-full rounded-2xl"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="ios-row-icon !w-9 !h-9 !rounded-xl !text-[13px] font-black !m-0 shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF9500, #FF2D55)', color: '#FFFFFF' }}
            >
              50
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-extrabold leading-tight whitespace-nowrap truncate">
                По 50 заданий (950 заданий)
              </div>
              <div
                className="text-[11.5px] leading-tight mt-0.5 truncate whitespace-nowrap"
                style={{ color: 'var(--ios-label-sec)' }}
              >
                Ровно по 50 заданий на все 19 заданий (№ 4–22)
              </div>
            </div>
          </div>
          <span
            className="text-[11.5px] font-bold px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ background: 'var(--ios-orange-soft)', color: 'var(--ios-orange)' }}
          >
            Применить →
          </span>
        </button>

        {/* 8. Настраиваемый шаблон */}
        <div
          id="preset-modal-custom"
          className="ios-inset-group !mb-0 p-3 text-left flex items-center justify-between gap-2 rounded-2xl w-full"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="ios-row-icon !w-9 !h-9 !rounded-xl !text-[13px] font-black !m-0 shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF9500, #FF6B00)', color: '#FFFFFF' }}
            >
              N
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-extrabold leading-tight whitespace-nowrap truncate">
                Настраиваемый шаблон
              </div>
              <div
                className="text-[11.5px] leading-tight mt-0.5 truncate whitespace-nowrap"
                style={{ color: 'var(--ios-label-sec)' }}
              >
                по {customCount} на тему (= {customCount * 19} зад.)
              </div>
            </div>
          </div>
          <div
            className="flex items-center justify-end gap-1.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={customCountInput}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                setCustomCountInput(cleaned);
              }}
              onBlur={() => {
                const n = parseInt(customCountInput, 10);
                if (!n || n < 1) setCustomCountInput('1');
                else if (n > 1000) setCustomCountInput('1000');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onApplyPreset(customCount);
                  onClose();
                }
              }}
              className="ios-count-badge has-value !w-10 !h-7 !text-[13px] text-center font-bold shrink-0"
              aria-label="Количество заданий на тему"
            />
            <div className="ios-stepper !h-7 shrink-0">
              <button
                type="button"
                className="ios-stepper-btn !w-7"
                disabled={customCount <= 1}
                onClick={() => handleStepCustomCount(-1)}
                aria-label="Уменьшить количество"
              >
                −
              </button>
              <div className="ios-stepper-divider" />
              <button
                type="button"
                className="ios-stepper-btn !w-7"
                disabled={customCount >= 1000}
                onClick={() => handleStepCustomCount(1)}
                aria-label="Увеличить количество"
              >
                +
              </button>
            </div>
            <button
              type="button"
              id="apply-custom-count-btn"
              onClick={() => {
                onApplyPreset(customCount);
                onClose();
              }}
              className="text-[11.5px] font-bold px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap cursor-pointer active:scale-95 transition-transform"
              style={{ background: 'var(--ios-orange-soft)', color: 'var(--ios-orange)' }}
            >
              Применить →
            </button>
          </div>
        </div>

        {/* 9. Сбросить всё в 0 */}
        <button
          type="button"
          id="preset-modal-clear"
          onClick={() => {
            onApplyPreset(0);
            onClose();
          }}
          className="ios-inset-group !mb-0 p-3 text-left flex items-center justify-between gap-2.5 cursor-pointer w-full rounded-2xl"
          style={{ background: 'var(--ios-red-soft)', borderColor: 'rgba(255, 59, 48, 0.2)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="ios-row-icon !w-9 !h-9 !rounded-xl !text-[13px] font-black !m-0 shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF3B30, #FF453A)', color: '#FFFFFF' }}
            >
              0
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-extrabold leading-tight text-[var(--ios-red)] whitespace-nowrap truncate">
                Сбросить всё в 0
              </div>
              <div
                className="text-[11.5px] leading-tight mt-0.5 truncate whitespace-nowrap"
                style={{ color: 'var(--ios-label-sec)' }}
              >
                Установить 0 заданий на все темы (№ 4–22)
              </div>
            </div>
          </div>
          <span
            className="text-[11.5px] font-bold px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ background: 'var(--ios-red)', color: '#FFFFFF' }}
          >
            Сбросить
          </span>
        </button>
      </div>
    </SwipeableSheet>
  );
});

/* ============================================================================
   2. ОКНО «РАЗБОР ПРАВИЛА И АЛГОРИТМА ФИПИ» (RuleInspectorModal)
      + КОМПОНЕНТ СТРУКТУРИРОВАННОЙ КАРТОЧКИ ОШИБКИ (StructuredErrorCard)
   ============================================================================ */
interface RuleInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: TrainerQuestion | null;
  errorEntry?: ErrorBankEntry | null;
  onOpenFullCheatsheet: (taskId: TaskId) => void;
}

interface StructuredStep {
  title: string;
  detail: string;
}

interface RuleComparisonPair {
  leftBadge: string;
  leftItems: string[];
  rightBadge: string;
  rightItems: string[];
}

const TASK_RULE_COMPARISON: Record<TaskId, RuleComparisonPair> = {
  '4': {
    leftBadge: 'Ударное окончание',
    leftItems: [
      'Глаголы ж.р. прош. вр.: брала́, взяла́, звала́, гнала́, лила́, пила́',
      'Краткие причастия ж.р.: взята́, начата́, принята́, снята́',
      'Глаголы на -ИТЬ в 3 л.: звони́т, включи́т, вручи́т, сверли́т, укрепи́т',
    ],
    rightBadge: 'Ударение на основе',
    rightItems: [
      'Исключения ж.р. прош. вр.: кла́ла, кра́ла, сла́ла, посла́ла, отосла́ла',
      'Наречия с ДО- и ЗА-: до́верху, до́низу, до́суха, за́светло, за́темно',
      'Деепричастия на -В/-ВШИ: нача́в, поня́в, прибы́в, созда́в',
    ],
  },
  '5': {
    leftBadge: 'Абонент / Адресат / Дипломат',
    leftItems: [
      'Абонент — человек (пользователь), абонемент — документ (билет)',
      'Адресат — получатель письма, адресант — отправитель',
      'Дипломат — должностное лицо, дипломант — призер конкурса',
    ],
    rightBadge: 'Суффиксы -ИЧЕСК- vs -ИЧН-',
    rightItems: [
      'Дипломатический (посольство) vs дипломатичный (тактичный ответ)',
      'Экономический (кризис, закон) vs экономичный (двигатель) vs экономный (хозяин)',
      'Зачинатель (доброго дела) vs зачинщик (ссоры, драки)',
    ],
  },
  '6': {
    leftBadge: 'Исключить лишнее (плеоназм)',
    leftItems: [
      'Убрать избыточное слово: «памятный сувенир» → сувенир',
      '«Первая премьера» → премьера; «свободная вакансия» → вакансия',
      '«Главная суть» → суть; «коллега по работе» → коллега',
    ],
    rightBadge: 'Заменить слово (пароним/фразеологизм)',
    rightItems: [
      'ИГРАТЬ роль (не значение) / ИМЕТЬ значение (не роль)',
      'ОДЕРЖАТЬ победу / ПОТЕРПЕТЬ поражение / ПОВЫСИТЬ уровень',
      'ПРЕДПРИНЯТЬ меры (или ПРИНЯТЬ меры, но не «принять шаги»)',
    ],
  },
  '7': {
    leftBadge: 'Сущ. мн. ч. и числительные',
    leftItems: [
      'Р.п. мн. ч.: чулок, ботинок, погон, эполет, яблок, мест, дел',
      'Овощи/фрукты на -ОВ: помидоров, томатов, апельсинов, мандаринов',
      'Числительные: пятисот рублей, обоими руками → обеими руками',
    ],
    rightBadge: 'Степени сравнения и глаголы',
    rightItems: [
      'Нельзя смешивать простую и составную: «более лучше» → лучше / более хорошо',
      'Повелительное накл.: поезжай (не едь), ляг / лягте (не ляжь), положи (не ложи)',
      'Деепричастия на -Я/-В: испекши → испёкши, ехав → проехав',
    ],
  },
  '8': {
    leftBadge: 'Обороты (причастный, деепричастный, ПО)',
    leftItems: [
      'Причастный оборот не должен разрываться определяемым словом и должен согласовываться в падеже',
      'Деепричастный оборот относится к подлежащему в И.п. (нельзя в безличном предложении без инфинитива)',
      'Предлог ПО в значении «после» требует П.п. (-ИИ): по приезде, по окончании, по прибытии',
    ],
    rightBadge: 'Связь подлеж. и сказ. / Косвенная речь',
    rightItems: [
      'ТЕ, КТО... требуют мн. ч. для ТЕ и ед. ч. для КТО: «Все, кто пришёл (ед.), сдали (мн.) работу»',
      'Несогласованное приложение в кавычках при родовом слове стоит в И.п.: в романе «Война и мир»',
      'Однородные члены: общий предлог и падеж для обоих сказуемых («любить и гордиться книгой» — ошибка)',
    ],
  },
  '9': {
    leftBadge: 'Пишем И / А',
    leftItems: [
      'Суффикс -А- после корня (-бир-, -кас-, -лаг-)',
      'Под ударением в -гар-, -клан-, -твар-',
      'Без ударения в -зар-, -плав-',
    ],
    rightBadge: 'Пишем Е / О',
    rightItems: [
      'Нет суффикса -А- (-бер-, -кос-, -лож-)',
      'Без ударения в -гор-, -клон-, -твор-',
      'Перед С в -рос- и Ч в -скоч-',
    ],
  },
  '10': {
    leftBadge: 'ПРЕ- / Ъ / И',
    leftItems: [
      'ПРЕ- = «очень» или близко к ПЕРЕ-',
      'Ъ — после приставок перед Е, Ё, Ю, Я',
      'И — после МЕЖ-, СВЕРХ- и иноязычных',
    ],
    rightBadge: 'ПРИ- / Ь / Ы',
    rightItems: [
      'ПРИ- = близость, присоединение, неполнота',
      'Ь — внутри корня (подьячий, пьедестал)',
      'Ы — после русских приставок на согл.',
    ],
  },
  '11': {
    leftBadge: 'Суффиксы с И / О / А',
    leftItems: [
      '-ЧИВ- и -ЛИВ- (всегда пишется И)',
      '-ЫВА-/-ИВА- (если в 1 л. «я -ываю»)',
      'Наречия с ИЗ-, ДО-, С- → суффикс -А',
    ],
    rightBadge: 'Суффиксы с Е / О',
    rightItems: [
      'Без ударения в прил. → суффикс -ЕВ-',
      '-ОВА-/-ЕВА- (если в 1 л. «я -ую/-юю»)',
      'Наречия с В-, НА-, ЗА- → суффикс -О',
    ],
  },
  '12': {
    leftBadge: 'I спряжение (Е, У, Ю)',
    leftItems: [
      'Глаголы не на -ИТЬ (колоть, бороться)',
      'Все глаголы на -ЯТЬ (сеять, лелеять, веять)',
      'Исключения: брить, стелить, зиждиться',
    ],
    rightBadge: 'II спряжение (И, А, Я)',
    rightItems: [
      'Все глаголы на -ИТЬ (клеить, строить)',
      '7 глаголов на -ЕТЬ (видеть, ненавидеть)',
      '4 глагола на -АТЬ (дышать, слышать, гнать, держать)',
    ],
  },
  '13': {
    leftBadge: 'Пишем СЛИТНО',
    leftItems: [
      'Без НЕ не употребляется (негодуя, нелепый)',
      'Полные причастия без зависимых слов',
      'С наречиями меры (очень, крайне, абсолютно)',
    ],
    rightBadge: 'Пишем РАЗДЕЛЬНО',
    rightItems: [
      'Глаголы, деепричастия, краткие причастия',
      'Причастия с зависимыми словами',
      'Маркеры: отнюдь не, вовсе не, далеко не',
    ],
  },
  '14': {
    leftBadge: 'Пишем СЛИТНО',
    leftItems: [
      'Союзы ЧТОБЫ, ТАКЖЕ, ТОЖЕ (заменяются на союз И или ДЛЯ ТОГО ЧТОБЫ)',
      'Производные предлоги: ВВИДУ, ВСЛЕДСТВИЕ, НАВСТРЕЧУ (ввиду = из-за)',
      'Слова с ПОЛ- перед согласной (кроме Л): полгорода, полчаса',
    ],
    rightBadge: 'ДЕФИСНО / РАЗДЕЛЬНО',
    rightItems: [
      'Омонимичные сочетания: ЧТО БЫ (бы убирается), ТАК ЖЕ (как), В ВИДУ',
      'Предлоги времени раздельно с Е: В ТЕЧЕНИЕ, В ПРОДОЛЖЕНИЕ',
      'Дефис: частицы -то, -либо, -нибудь, кое-, приставка по- + -ому/-ему/-и, корень пол- (ЮЛЯ)',
    ],
  },
  '15': {
    leftBadge: 'Одна буква Н',
    leftItems: [
      'Суффиксы -АН-, -ЯН-, -ИН- (глиняный, утиный, искл.: стеклянный, оловянный, деревянный)',
      'Отглагольные прил. без приставки и зависимых слов (жареный, варёный, кованый)',
      'Краткие страдательные причастия всегда с одной Н (книга прочитана, задача решена)',
    ],
    rightBadge: 'Две буквы НН',
    rightItems: [
      'Суффиксы -ЕНН-, -ОНН- (соломенный, экскурсионный, искл.: ветреный)',
      'Стык основы на Н + суффикс Н (туманный, старинный, осенний)',
      'Полные причастия: есть приставка (пожаренный), зависимое слово (жаренный с грибами)',
    ],
  },
  '16': {
    leftBadge: 'Запятая СТАВИТСЯ',
    leftItems: [
      'Между частями ССП без общего второстепенного члена',
      'При повторяющихся союзах И...И, ИЛИ...ИЛИ (если однородных членов ≥ 2)',
      'Перед второй частью двойного союза (не только..., но и...)',
    ],
    rightBadge: 'Запятая НЕ СТАВИТСЯ',
    rightItems: [
      'В ССП есть общий второстепенный член, общая придаточная часть или вводное слово',
      'Однородные члены соединены попарно (А и Б, В и Г)',
      'Два разных ряда однородных членов (например, определения и сказуемые)',
    ],
  },
  '17': {
    leftBadge: 'Обособляется запятыми',
    leftItems: [
      'Причастный оборот ПОСЛЕ определяемого слова',
      'Любой причастный или деепричастный оборот, относящийся к личному местоимению',
      'Одиночное деепричастие и деепричастный оборот в любой позиции',
    ],
    rightBadge: 'НЕ обособляется',
    rightItems: [
      'Причастный оборот ПЕРЕД определяемым существительным (без причины/уступки)',
      'Два однородных оборота, соединённых одиночным союзом И (между ними запятой нет)',
      'Фразеологизмы с деепричастием (сломя голову, затаив дыхание, спустя рукава)',
    ],
  },
  '18': {
    leftBadge: 'Вводные слова и обращения',
    leftItems: [
      'Уверенность/неуверенность: конечно, несомненно, кажется, вероятно, может быть',
      'Источник и связь мыслей: по-моему, во-первых, итак, следовательно, напротив',
      'Обращения со всеми зависимыми словами выделяются запятыми',
    ],
    rightBadge: 'Лжевводные частицы (БЕЗ запятых)',
    rightItems: [
      'Частицы: будто, как будто, вряд ли, едва ли, почти, именно, исключительно',
      'Наречия и частицы: вдруг, ведь, вот, все-таки, даже, однажды, словно, якобы',
      'Союз ОДНАКО в начале предложения (= НО) не обособляется',
    ],
  },
  '19': {
    leftBadge: 'Запятая в СПП ставится',
    leftItems: [
      'На границах главного и придаточного предложения перед союзами что, чтобы, где, когда',
      'Перед словом КОТОРЫЙ (или предлог + который); но НЕ после слова «который»',
      'Между неоднородными придаточными предложениями',
    ],
    rightBadge: 'Запятая НЕ ставится',
    rightItems: [
      'Между двумя однородными придаточными, соединёнными одиночным союзом И / ИЛИ',
      'Внутри придаточного с союзным словом «в результате которого / книги которого»',
    ],
  },
  '20': {
    leftBadge: 'Стык союзов: запятая СТАВИТСЯ',
    leftItems: [
      'После придаточного НЕТ второй части двойного союза ТО, НО или ТАК',
      'Придаточное можно опустить без перестройки главной части («Я знал, что, если приду, он обрадуется»)',
    ],
    rightBadge: 'Стык союзов: запятая НЕ ставится',
    rightItems: [
      'Дальше в предложении ЕСТЬ слова ТО, НО или ТАК («Я знал, что если приду, ТО он обрадуется»)',
      'Между однородными придаточными с одиночным союзом И',
    ],
  },
  '21': {
    leftBadge: 'Тире: разные правила',
    leftItems: [
      'Тире между подлежащим и сказуемым (сущ. И.п. — сущ. И.п.)',
      'Тире при обособленном приложении vs тире после однородных перед обобщающим словом',
      'Тире в БСП vs тире в неполном предложении или при вставной конструкции',
    ],
    rightBadge: 'Двоеточие и запятые: разные правила',
    rightItems: [
      'Двоеточие при обобщающем слове vs в БСП vs при прямой речи',
      'Запятые: ССП, СПП, БСП, причастный/деепричастный оборот, вводное слово, однородные, приложение, сравнит. оборот',
    ],
  },
  '22': {
    leftBadge: 'Тропы (переносное значение)',
    leftItems: [
      'Эпитет — образное определение («золотая тоска», «серебряный ветер»)',
      'Метафора — скрытое сравнение («пожар рябины», «костер зари»)',
      'Олицетворение — неживое как живое («ветер шепчет»); Сравнение (как, словно, точно)',
    ],
    rightBadge: 'Фигуры речи (строение)',
    rightItems: [
      'Анафора (единоначатие строк) vs Эпифора (одинаковая концовка строк)',
      'Антитеза (противопоставление) vs Оксюморон («живой труп», «горячий снег»)',
      'Парцелляция (дробление точками), Синтаксический параллелизм, Градация, Инверсия',
    ],
  },
};

const TASK_STRUCTURED_STEPS: Record<TaskId, StructuredStep[]> = {
  '4': [
    { title: 'Определите часть речи слова', detail: 'Глаголы, причастия, деепричастия, существительные и наречия подчиняются разным акцентным моделям.' },
    { title: 'Проверьте женский род прошедшего времени', detail: 'В большинстве глаголов и кратких причастий ж.р. ударение падает на -ЛА́ / -ТА́ (кроме кла́ла, кра́ла, сла́ла, посла́ла, отосла́ла).' },
    { title: 'Сверьте со словником ФИПИ', detail: 'Запомните неизменное ударение: балова́ть — балу́ясь, то́рты, ба́нты, ша́рфы, кра́ны, ле́кторы.' },
  ],
  '5': [
    { title: 'Найдите выделенное слово', detail: 'Проверьте лексическую сочетаемость выделенного слова с главным или зависимым словом.' },
    { title: 'Вспомните паронимическую пару', detail: 'Разграничьте оттенки значения суффиксов (-ическ-/-ичн-, -тельн-/-ск-, -абонент/-абонемент).' },
    { title: 'Поставьте пароним в нужную форму', detail: 'В бланк ответа записывается подобранный пароним в той же грамматической форме (род, число, падеж).' },
  ],
  '6': [
    { title: 'Прочитайте условие: исключить или заменить', detail: 'Если нужно ИСКЛЮЧИТЬ — ищите плеоназм (дублирование смысла). Если ЗАМЕНИТЬ — ищите нарушение лексической сочетаемости.' },
    { title: 'Найдите смысловое дублирование', detail: '«Памятный сувенир», «свободная вакансия», «первая премьера», «главная суть».' },
    { title: 'Запишите одно слово в бланк', detail: 'Запишите лишнее или заменяющее слово без пробелов и знаков препинания.' },
  ],
  '7': [
    { title: 'Проверьте группу выделенных слов', detail: 'Определите часть речи: существительное (Р.п. мн. ч.), числительное, степень сравнения прил., местоимение или глагол.' },
    { title: 'Найдите грамматическую ошибку', detail: 'Например: «более лучше», «пятистами рублями», «ехай», «пара носок», «по приезду».' },
    { title: 'Запишите исправленную форму', detail: 'В бланк выписывается ТОЛЬКО исправленное слово (без предлогов и зависимых слов).' },
  ],
  '8': [
    { title: 'Прочитайте список ошибок А–Д', detail: 'Выделите 5 искомых типов ошибок (причастный/деепричастный оборот, связь подлеж. и сказ., предлог, СПП и др.).' },
    { title: 'Промаркируйте предложения 1–9', detail: 'В каждом предложении найдите грамматическую основу, причастные/деепричастные обороты и предлоги (по, благодаря, вопреки).' },
    { title: 'Сопоставьте А–Д с цифрами', detail: 'Запишите 5 цифр в строгом порядке букв А Б В Г Д (задание оценивается в 2 первичных балла).' },
  ],
  '9': [
    {
      title: 'Выделите корень и смысл',
      detail: 'Отбросьте омонимичные корни по подсказке в скобках (мирить ≠ мерить).',
    },
    {
      title: 'Условие чередования',
      detail: 'Проверьте суффикс -А- (-бир-/-бер-, -кас-/-кос-), ударение (-гар-/-гор-) или согласную.',
    },
    {
      title: 'Сверка со списком ФИПИ',
      detail: 'Исключения: выгарки, полог, росток, отрасль, скачок, пловец, сочетать.',
    },
  ],
  '10': [
    {
      title: 'Граница приставки и корня',
      detail: 'В словах несгораемый, несдобровать две приставки: НЕ- + С- (приставки З- нет).',
    },
    {
      title: 'Значение ПРЕ- и ПРИ-',
      detail: 'ПРЕ- = «очень» или «пере-»; ПРИ- = приближение, присоединение, неполнота.',
    },
    {
      title: 'Стык приставки (Ъ/Ь и Ы/И)',
      detail: 'После русских приставок пишем Ы (кроме взимать), после МЕЖ-, СВЕРХ- и иноязычных — И.',
    },
  ],
  '11': [
    {
      title: 'Определите часть речи',
      detail: 'Правило выбора суффикса зависит от того, глагол это, прилагательное или сущ.',
    },
    {
      title: 'Форма 1-го лица у глаголов',
      detail: '«Я что делаю?»: на -УЮ/-ЮЮ → -ОВА-/-ЕВА- (но затмевать, продлевать, застревать — Е).',
    },
    {
      title: 'Ударение в прилагательных',
      detail: 'В -ЧИВ-/-ЛИВ- всегда И; без ударения -ЕВ- (исключения: милостивый, юродивый).',
    },
  ],
  '12': [
    {
      title: 'Определите время формы',
      detail: 'Для настоящего/будущего нужно спряжение; для прошедшего (-ВШ-, -НН-) — буква перед -ТЬ.',
    },
    {
      title: 'Спряжение по инфинитиву',
      detail: 'I спр. (вкл. брить, стелить и на -ЯТЬ) → Е/У/Ю; II спр. (на -ИТЬ + 11 искл.) → И/А/Я.',
    },
    {
      title: 'Страдательные причастия (-НН-)',
      detail: 'На -АТЬ/-ЯТЬ → -АНН-/-ЯНН-; на -ИТЬ/-ЕТЬ → -ЕНН- (выкатить → выкаченный).',
    },
  ],
  '13': [
    {
      title: 'Употребляется ли без НЕ',
      detail: 'Слова вроде негодуя, невзлюбить, нелепый, неряха всегда пишутся слитно.',
    },
    {
      title: 'Часть речи (глагол / причастие)',
      detail: 'Глаголы, деепричастия и краткие причастия — раздельно (но предлог «несмотря на» — слитно).',
    },
    {
      title: 'Зависимые слова и маркеры',
      detail: 'Причастие с зависимым словом или «отнюдь не / вовсе не» — раздельно; «очень / крайне» — слитно.',
    },
  ],
  '14': [
    {
      title: 'Проверка союзов и омонимов',
      detail: 'ЧТОБЫ (= для того чтобы) vs ЧТО БЫ (частицу БЫ можно опустить или переставить без потери смысла).',
    },
    {
      title: 'Производные предлоги',
      detail: 'ВВИДУ (= из-за), ВСЛЕДСТВИЕ (= из-за) — слитно. В ВИДУ (иметь в виду) и В ТЕЧЕНИЕ, В ПРОДОЛЖЕНИЕ — раздельно с буквой Е на конце.',
    },
    {
      title: 'Дефисные правила и корень ПОЛ-',
      detail: 'Дефис: частицы -то, -либо, -нибудь, кое-, приставка по- + -ому/-ему/-и. Корень пол- пишется через дефис по правилу ЮЛИ (перед гласной, буквой Л, заглавной).',
    },
  ],
  '15': [
    {
      title: 'Часть речи и способ образования',
      detail: 'Определите, от чего образовано слово: от существительного (отыменное) или от глагола (отглагольное/причастие).',
    },
    {
      title: 'Отыменные: суффиксы и стык корня',
      detail: 'Суффиксы -АН-/-ЯН-/-ИН- (глиняный, искл.: стеклянный, оловянный, деревянный — НН). Стык корня на Н + суффикс Н (каменный). С суффиксом -ЕНН-/-ОНН- — НН (искл.: ветреный).',
    },
    {
      title: 'Глагольные: 4 признака двух букв НН',
      detail: 'Пишем НН, если: есть приставка (кроме НЕ-), есть зависимое слово, суффиксы -ОВА-/-ЕВА- или сов. вид глагола. Краткие страдательные причастия ВСЕГДА пишутся с одной буквой Н.',
    },
  ],
  '16': [
    { title: 'Выделите грамматические основы', detail: 'Определите, простое это предложение с однородными членами или сложносочинённое (ССП).' },
    { title: 'Проверьте общий второстепенный член в ССП', detail: 'Если в начале ССП есть общее обстоятельство места/времени, запятая перед И не ставится.' },
    { title: 'Проверьте группы однородных членов', detail: 'При попарном соединении (А и Б, В и Г) или повторяющихся союзах правильно расставьте запятые.' },
  ],
  '17': [
    { title: 'Найдите причастные и деепричастные обороты', detail: 'Определите границы каждого оборота и слово, к которому относится причастный оборот.' },
    { title: 'Проверьте позицию причастного оборота', detail: 'После определяемого слова — обособляется; перед определяемым существительным — не обособляется.' },
    { title: 'Проверьте союз И между однородными оборотами', detail: 'Если два оборота относятся к одному слову и соединены одиночным союзом И, запятая вокруг И не ставится.' },
  ],
  '18': [
    { title: 'Проверьте слова на вводность', detail: 'Вводное слово не является членом предложения, к нему нельзя задать вопрос, его можно опустить.' },
    { title: 'Отделите лжевводные частицы', detail: 'Слова БУДТО, ВДРУГ, ВЕДЬ, ВРЯД ЛИ, ДАЖЕ, ИМЕННО, КАК БУДТО, ПОЧТИ никогда не выделяются запятыми.' },
    { title: 'Найдите обращения', detail: 'Обращение называет того, к кому обращаются с речью, и обособляется вместе со всеми зависимыми словами.' },
  ],
  '19': [
    { title: 'Найдите границы главного и придаточных', detail: 'Выделите подчинительные союзы и союзные слова (что, чтобы, где, который).' },
    { title: 'Внимание на союзное слово КОТОРЫЙ', detail: 'Запятая ставится в начале придаточного (иногда за 1–2 слова ДО слова «который»), но не сразу после него.' },
    { title: 'Проверьте однородные придаточные', detail: 'Между однородными придаточными, соединёнными союзом И, запятая не ставится.' },
  ],
  '20': [
    { title: 'Найдите стык двух союзов', detail: 'Обычно это сочетания ЧТО ЕСЛИ, ЧТО КОГДА, И ЕСЛИ, НО КОГДА, И ХОТЯ.' },
    { title: 'Проверьте наличие ТО, НО, ТАК дальше', detail: 'Если после придаточного ЕСТЬ слова ТО, НО, ТАК — на стыке союзов запятая НЕ ставится; если их НЕТ — запятая ставится.' },
    { title: 'Проверьте границы всех частей', detail: 'Не забудьте закрыть придаточное предложение запятой.' },
  ],
  '21': [
    { title: 'Прочитайте, какой знак нужно искать', detail: 'ТИРЕ, ДВОЕТОЧИЕ или ЗАПЯТУЮ.' },
    { title: 'Определите правило в каждом предложении', detail: 'Выпишите для каждого предложения со знаком его точное правило (например: СПП, вводное слово, причастный оборот, тире между подлеж. и сказ.).' },
    { title: 'Сгруппируйте совпавшие номера', detail: 'В ответ идут номера предложений, объединённых ОДНИМ и тем же пунктуационным правилом.' },
  ],
  '22': [
    { title: 'Прочитайте 5 фрагментов А–Д', detail: 'Обратите внимание на подсказки в самих примерах (повторы в начале строк → анафора, вопросы → риторический вопрос, КАК/СЛОВНО → сравнение).' },
    { title: 'Сверьте со списком терминов 1–9', detail: 'Разграничьте тропы (эпитет, метафора, олицетворение, гипербола) и фигуры речи (анафора, антитеза, парцелляция, инверсия, градация).' },
    { title: 'Запишите 5 цифр в порядке А Б В Г Д', detail: 'Каждой букве соответствует ровно одна цифра из списка 1–9 (задание даёт 2 первичных балла).' },
  ],
};

const TASK_KEY_EXCEPTIONS: Record<TaskId, string[]> = {
  '4': ['клала', 'крала', 'слала', 'послала', 'отослала', 'звонит', 'торты', 'банты'],
  '5': ['абонент / абонемент', 'адресат / адресант', 'дипломат / дипломант', 'эффектный / эффективный'],
  '6': ['памятный сувенир', 'свободная вакансия', 'играть роль', 'иметь значение', 'одержать победу'],
  '7': ['чулок', 'носков', 'помидоров', 'поезжай', 'лягте', 'обеими руками', 'пятисот'],
  '8': ['по приезде', 'по окончании', 'благодаря знанию', 'все, кто пришёл, сдали'],
  '9': ['выгарки', 'полог', 'росток', 'отрасль', 'скачок', 'пловец', 'сочетать'],
  '10': ['взимать', 'несгораемый', 'подьячий', 'сверхизысканный', 'адъютант'],
  '11': ['милостивый', 'юродивый', 'затмевать', 'продлевать', 'застревать'],
  '12': ['стелющийся', 'бреющий', 'зиждущийся', 'клеящий', 'выкаченный'],
  '13': ['несмотря на', 'негодуя', 'вовсе не', 'отнюдь не', 'далеко не'],
  '14': ['чтобы', 'также', 'тоже', 'ввиду', 'в течение', 'по-новому', 'пол-яблока'],
  '15': ['стеклянный', 'оловянный', 'деревянный', 'ветреный', 'кованый', 'раненый', 'жареный'],
  '16': ['общий второстепенный член', 'попарное соединение', 'и... и...', 'не только..., но и'],
  '17': ['обособление после сущ.', 'личное местоимение', 'сломя голову', 'затаив дыхание'],
  '18': ['будто', 'вряд ли', 'даже', 'именно', 'как будто', 'почти', 'вдруг', 'ведь'],
  '19': ['дом, в котором', 'книга, страницы которой', 'однородные придаточные'],
  '20': ['что если ... то', 'что, если (без то)', 'стык союзов'],
  '21': ['тире между подлеж. и сказ.', 'приложение', 'БСП', 'обобщающее слово'],
  '22': ['метафора', 'эпитет', 'олицетворение', 'анафора', 'антитеза', 'парцелляция'],
};

export function cleanDisplayText(text: string): string {
  if (!text) return '';
  let s = String(text);
  // Truncate scraper tail metadata (e.g. .4b:T95d,1 or 4a:T729 or 3f:[[[ or Ответ:/Источник:)
  s = s.replace(/(?:[\s.]*\d+[a-zA-Z0-9]*:[a-zA-Z0-9]+|\b[0-9a-f]{2}:\[\[\[|(?:\b|\n|\.)\s*(?:Ответ|Источник)\s*:).*$/is, '');
  s = s.replace(/\b(?:Ответ|Источник)\s*:[^.\n]*(?:\.|$)/gi, '');
  s = s
    .replace(/\\+r\\+n/g, '\n')
    .replace(/\\+n/g, '\n')
    .replace(/\\+r/g, '')
    .replace(/\\+«/g, '«')
    .replace(/\\+»/g, '»')
    .replace(/\\+"/g, '"');
  s = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&eacute;/gi, 'е́')
    .replace(/&(?:ldquo|rdquo|quot);/gi, '"')
    .replace(/&(?:rarr|rightarrow);/gi, '→')
    .replace(/&(?:mdash|ndash);/gi, '—')
    .replace(/&(?:laquo|raquo);/gi, '«')
    .replace(/&[a-zA-Z0-9#]+;/g, '');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/=>/g, '→');
  s = s.replace(/[\u200b\u200c\u200d\u200e\u200f\ufeff\xad]/g, '');
  s = s.replace(/^[1-5Зз]\s*[\)\.\-–:]\s*/gm, '');
  s = s.replace(/(?:\n|\.\s*)[1-5Зз]\s*[\)\.\-–:]\s*/g, '\n');
  s = s
    .replace(/\bпров\.?\s*гл\.?\s*[:—\-–]?/g, 'проверочное слово: ')
    .replace(/\bнепровер(?:яемая)?\.?\s*гл(?:асная)?\.?(?:\s*\(словарное слово\))*/g, 'непроверяемая гласная (словарное слово)')
    .replace(/\(словарное слово\)(?:\s*\(словарное слово\))+/g, '(словарное слово)')
    .replace(/\bЧГ\b/g, 'чередование корней')
    .replace(/\bПГ,\s*([А-Яа-яЁё]+)/g, 'проверочное слово: «$1»')
    .replace(/\bПГ\b/g, 'проверяемая безударная гласная')
    .replace(/\bНГ\b/g, 'непроверяемая гласная (словарное слово)')
    .replace(/\bискл\.(?!\w)/g, 'исключение')
    .replace(/["“]([^"”]+)["”]/g, '«$1»');
  s = s.replace(/^([А-Яа-яЁё]+)[»"]\s*([—–-])/g, '«$1» $2');
  // Only strip unclosed trailing parenthesis if truncated
  s = s.replace(/[,;]?\s*\([^\)]*$/g, '').replace(/[,;.\s]+$/g, '');
  return s.trim();
}

function normalizeWordForMatch(w: string): string {
  return String(w || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^а-яa-z]/g, '');
}

/**
 * Splits a single line into individual word explanation segments, respecting parenthesis depth.
 * Handles both:
 * 1) "слово1 (разбор1), слово2 (контекст) (разбор2), слово3 (разбор3)"
 * 2) "слово1 — разбор1, слово2 — разбор2"
 * while keeping shared-rule lists like "слово1, слово2, слово3 — общее правило" together.
 */
function splitLineIntoWordChunks(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  const chunks: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '(') {
      parenDepth++;
      current += ch;
      continue;
    }
    if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      current += ch;
      continue;
    }

    if (parenDepth === 0 && (ch === ';' || ch === ',')) {
      const rest = trimmed.slice(i + 1).trimStart();
      if (ch === ';') {
        // Only split on `;` if `rest` starts a NEW word head followed by ` — ` or `(...)`,
        // AND that leading word is not a rule continuation word (like "пишется", "слово", "можно", "поэтому", etc.)
        const semiWordMatch = rest.match(
          /^(?:\([^)]+\)\s*)?([А-Яа-яЁё\u0300-\u036f\-]+)(?:\s*\([^)]+\))?\s*(?:—|–|-\s|\()/
        );
        const firstWordLow = semiWordMatch
          ? semiWordMatch[1].toLowerCase().replace(/ё/g, 'е')
          : '';
        const isContinuationWord =
          /^(?:пишется|пишем|слово|слова|можно|нельзя|так|поэтому|следовательно|например|исключение|исключения|проверочное|проверка|инфинитив|глагол|причастие|деепричастие|наречие|прилагательное|существительное|местоимение|предлог|союз|частица|корень|корни|приставка|приставки|суффикс|суффиксы|окончание|выбор|зависит|употребляется|образует|имеет|сохраняется|меняется|относится|подбираем|определяем|смотрим|ставим|входит|сочетание|перед|после|между|при|без|для|или|либо|если|хотя|однако|зато|тоже|также)$/.test(
            firstWordLow
          );
        if (semiWordMatch && !isContinuationWord) {
          if (current.trim()) chunks.push(current.trim());
          current = '';
          while (i + 1 < trimmed.length && /\s/.test(trimmed[i + 1])) i++;
          continue;
        }
        current += ch;
        continue;
      }

      // At a top-level comma: check if `current` already has an explanation (a closed `)` or `—`/` - `)
      // AND `rest` starts a new word explanation entry
      const currentHasParenOrDash =
        /\)/.test(current) || /\s(?:—|–|-\s)/.test(current);
      const restStartsParentheticalWord =
        /^(?:\([^)]+\)\s*)?[А-Яа-яЁё\u0300-\u036f\-]+(?:\s+[А-Яа-яЁё\u0300-\u036f\-]+)?(?:\s*\([^)]+\))?\s*\(/.test(
          rest
        );
      const restStartsDashWord =
        /^(?:\([^)]+\)\s*)?[А-Яа-яЁё\u0300-\u036f\-]+(?:\s*\([^)]+\))?\s+(?:—|–|-\s)/.test(
          rest
        );
      // Also handle "слово1 (словарное), слово2, слово3 (общее правило)" where current ends with `)`
      const currentEndsWithParen = /\)\s*$/.test(current);
      const restStartsWordListWithParen =
        /^[А-Яа-яЁё\u0300-\u036f\-]+(?:\s*,\s*[А-Яа-яЁё\u0300-\u036f\-]+)+\s*\(/.test(
          rest
        );

      if (
        currentHasParenOrDash &&
        (restStartsParentheticalWord ||
          restStartsDashWord ||
          (currentEndsWithParen && restStartsWordListWithParen))
      ) {
        if (current.trim()) chunks.push(current.trim());
        current = '';
        while (i + 1 < trimmed.length && /\s/.test(trimmed[i + 1])) i++;
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Extracts the top-level head (word/words) and body (explanation) from a single chunk.
 */
function splitChunkHeadAndBody(chunk: string): { head: string; body: string; hasExplanation: boolean } {
  const s = chunk.trim();
  if (!s) return { head: '', body: '', hasExplanation: false };

  // 1. Check for top-level dash ` — `, ` – `, or ` - ` (at parenDepth === 0)
  let parenDepth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (parenDepth === 0 && (ch === '—' || ch === '–' || ch === '-')) {
      const prevChar = i > 0 ? s[i - 1] : '';
      const nextChar = i + 1 < s.length ? s[i + 1] : '';
      // Must be surrounded by spaces (not a hyphen inside a word like пол-яблока or -лаг-)
      if (/\s/.test(prevChar) && /\s/.test(nextChar)) {
        const head = s.slice(0, i).trim();
        const body = s.slice(i + 1).trim();
        if (head && body) {
          return { head, body, hasExplanation: true };
        }
      }
    }
  }

  // 2. Check if the chunk ends with a top-level parenthetical `( ... )` after a short word head
  if (s.endsWith(')')) {
    let depth = 0;
    let openIdx = -1;
    for (let i = s.length - 1; i >= 0; i--) {
      if (s[i] === ')') depth++;
      else if (s[i] === '(') {
        depth--;
        if (depth === 0) {
          openIdx = i;
          break;
        }
      }
    }
    if (openIdx > 0) {
      const head = s.slice(0, openIdx).trim();
      const body = s.slice(openIdx + 1, s.length - 1).trim();
      const headWordCount = head.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean).length;
      if (head && body && headWordCount <= 4 && !head.includes(';') && !/пишется/i.test(head)) {
        // Check if `body` is actually an explanation/check-word vs just a context noun like `(противника)` or `(из задания №9 ЕГЭ)`
        const isContextPlaceholder = /^из задания/i.test(body);
        const hasRuleKeywords =
          /(?:проверочн|словарн|запомнить|чередован|корень|корн|приставк|суффикс|окончан|спряжен|глагол|причаст|деепричаст|прилагат|наречи|предлог|союз|частиц|местоим|исключен|пишется|пишем|буква|гласн|согласн|ударен|безударн|инфинитив|значен|слитно|раздельно|дефис|→|=>|—|:|;)/i.test(
            body
          );
        const hasCapitalStress = /[А-ЯЁ]/.test(body) || /\u0301/.test(body);
        const normHead = normalizeWordForMatch(head);
        const normBody = normalizeWordForMatch(body);
        const sharesRoot =
          normHead.length >= 3 &&
          normBody.length >= 3 &&
          normHead.slice(0, 3) === normBody.slice(0, 3);

        const isRealExplanation =
          !isContextPlaceholder &&
          (hasRuleKeywords || hasCapitalStress || sharesRoot || body.length > 22);
        return { head, body, hasExplanation: isRealExplanation };
      }
    }
  }

  return { head: s, body: '', hasExplanation: false };
}

export function isolateTargetWordExplanation(
  explanation: string,
  targetWord?: string | null
): string {
  if (!explanation) return '';
  let s = String(explanation);
  // Strip scraper tail metadata first so other tasks after .4b:T95d never pollute candidates
  s = s.replace(/(?:[\s.]*\d+[a-zA-Z0-9]*:[a-zA-Z0-9]+|\b[0-9a-f]{2}:\[\[\[|(?:\b|\n|\.)\s*(?:Ответ|Источник)\s*:).*$/is, '');
  s = s.replace(/\b(?:Ответ|Источник)\s*:[^.\n]*(?:\.|$)/gi, '');
  s = s
    .replace(/\\+r\\+n/g, '\n')
    .replace(/\\+n/g, '\n')
    .replace(/\\+r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const rawTarget = (targetWord || '').replace(/\(.*?\)/g, '').trim();
  const normTarget = normalizeWordForMatch(rawTarget);
  if (!normTarget || normTarget.startsWith('задание')) {
    return cleanDisplayText(s);
  }

  // Split by newlines and numbered row prefixes (including Cyrillic З)
  const rawLines = s
    .replace(/(?:^|\n|\.\s+)[1-5Зз]\s*[\)\.\-–:]\s*/g, '\n')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates: string[] = [];
  for (const line of rawLines) {
    // Also split sentences like "Слово1 — разбор. Слово2 — разбор"
    const sentenceParts = line
      .split(/\.\s+(?=[А-Яа-яЁё\u0300-\u036f\-]+\s*(?:\([^)]+\)\s*)?[—–-])/)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const part of sentenceParts) {
      candidates.push(...splitLineIntoWordChunks(part));
    }
  }

  if (candidates.length === 0) return '';

  // Score each candidate for matching `normTarget` + having a real explanation
  let bestCandidate = '';
  let bestScore = -1;

  const targetStem = normTarget.length >= 5 ? normTarget.slice(0, -2) : normTarget;

  for (const cand of candidates) {
    const { head, body, hasExplanation } = splitChunkHeadAndBody(cand);
    const headWithoutParens = head.replace(/\(.*?\)/g, ' ');
    const headWords = headWithoutParens
      .split(/[^А-Яа-яЁё\u0300-\u036fA-Za-z]+/)
      .map(normalizeWordForMatch)
      .filter(Boolean);
    const normHeadFull = normalizeWordForMatch(headWithoutParens);

    let matchLevel = 0;
    if (
      normHeadFull === normTarget ||
      headWords.includes(normTarget)
    ) {
      matchLevel = 3; // Exact head word match
    } else if (
      normHeadFull &&
      (normHeadFull.includes(normTarget) || normTarget.includes(normHeadFull))
    ) {
      matchLevel = 2; // Head phrase contains target word (e.g. Task 13/14 sentence)
    } else if (
      targetStem.length >= 4 &&
      headWords.some((hw) => hw.startsWith(targetStem) || targetStem.startsWith(hw))
    ) {
      matchLevel = 1; // Inflected stem match in head
    }

    if (matchLevel > 0) {
      const explScore = hasExplanation ? 1000 + Math.min(body.length, 300) : 10;
      const totalScore = matchLevel * 10000 + explScore;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestCandidate = cand;
      }
    }
  }

  if (bestCandidate) {
    return cleanDisplayText(bestCandidate);
  }

  // Fallback: check if any candidate mentions the target word anywhere
  for (const cand of candidates) {
    const { hasExplanation } = splitChunkHeadAndBody(cand);
    if (hasExplanation && normalizeWordForMatch(cand).includes(targetStem)) {
      return cleanDisplayText(cand);
    }
  }

  // If there was only 1 candidate and it doesn't belong to a different word, return it
  if (candidates.length === 1) {
    return cleanDisplayText(candidates[0]);
  }

  return '';
}

export interface StructuredExplanation {
  targetWord?: string;
  checkWord?: string;
  orthogramType?: string;
  steps?: string[];
  warningNote?: string;
  ruleNote: string;
}

export function parseStructuredExplanation(
  text: string,
  fallbackWord?: string | null,
  task?: TaskId
): StructuredExplanation {
  const cleaned = cleanDisplayText(text);
  if (!cleaned) return { ruleNote: '' };

  let targetWord = fallbackWord || '';
  let checkWord = '';
  let orthogramType = '';
  let warningNote = '';

  const { head, body, hasExplanation } = splitChunkHeadAndBody(cleaned);
  let ruleNote = hasExplanation ? body : cleaned;

  if (head && hasExplanation && !targetWord) {
    targetWord = head.replace(/^[,;.\s]+|[,;.\s]+$/g, '').trim();
  }

  // Filter out bare word lists or tautological placeholders like "В слове «X» пишется буква «Y»"
  const isTautology =
    /^в слове\s+[«"']?[а-яё\u0300-\u036f\-]+[»"']?\s+пишется\s+(?:безударная\s+)?(?:гласная\s+|буква\s+)?[«"']?[а-яё]+[»"']?\.?$/i.test(
      ruleNote.trim()
    );
  const looksLikeBareWordList =
    !hasExplanation &&
    !/(?:пишется|пишем|корень|корн|приставк|суффикс|окончан|спряжен|проверочн|словарн|исключен|глагол|причаст|прилагат|наречи|предлог|союз|частиц|слитно|раздельно|дефис)/i.test(
      ruleNote
    );

  if (isTautology || looksLikeBareWordList) {
    return {
      targetWord: targetWord || undefined,
      ruleNote: '',
      steps: [],
    };
  }

  // Clean verbose filler intros
  ruleNote = ruleNote
    .replace(
      /^корень изменился,\s*но\s+[А-ЯЁа-яё]\s+продолжает писаться по правилу чередования корней/i,
      'Чередование корней'
    )
    .replace(/;\s*вопрос о статусе корня[^;.)]*/gi, '')
    .replace(/можно запомнить таким образом:\s*/gi, '');

  // Extract nested `(исключения: ...)` or `(не путать с ...)` into `warningNote`
  const warningMatches: string[] = [];
  ruleNote = ruleNote.replace(
    /\(\s*((?:исключени[ея]|не путать|не путайте|примечание|внимание)[^()]*)\)/gi,
    (_m, inner) => {
      warningMatches.push(inner.trim());
      return '';
    }
  );
  ruleNote = ruleNote.replace(
    /;\s*((?:не путать|не путайте|внимание\s*:)[^;]+)$/i,
    (_m, inner) => {
      warningMatches.push(inner.trim());
      return '';
    }
  );
  if (warningMatches.length > 0) {
    const rawWarn = warningMatches.join('. ').replace(/[,;.\s]+$/, '');
    warningNote = rawWarn.charAt(0).toUpperCase() + rawWarn.slice(1) + '.';
  }

  const isGrammarTerm = (w: string) =>
    /^(?:словарное|запомнить|исключение|сущ|существительное|прил|прилагательное|глаг|глагол|нареч|наречие|местоим|местоимение|прич|причастие|дееприч|деепричастие|предлог|союз|частица|числительное|междометие|категория|корень|суффикс|приставка|окончание|инфинитив|оканчивающееся|оканчивающийся|образованное|образованный|совершенного|несовершенного|переходный|непереходный|возвратный|страдательное|действительное|краткое|полное|вводное|производный|сочинительный|подчинительный|пояснительных|пояснительное|зависимое|зависимых)$/i.test(
      w.trim()
    );

  // Extract checkWord (проверочное слово / инфинитив) — strictly for Tasks 9 and 12 ONLY
  const isCheckWordEligible = task === '9' || task === '12';
  if (isCheckWordEligible) {
    const cwMatch1 = ruleNote.match(
      /(?:проверочное слово|проверка|проверяется словом|где гласная стоит под ударением)[:—\-–\s]+[«"']?([А-Яа-яЁё\u0300-\u036f]+)[»"']?/i
    );
    if (cwMatch1 && !isGrammarTerm(cwMatch1[1])) {
      checkWord = cwMatch1[1];
    } else {
      const cwMatch2 = ruleNote.match(
        /проверяемая\s+[А-Яа-яЁё]+\s*\(([А-Яа-яЁё\u0300-\u036f]+)\)/i
      );
      if (cwMatch2 && !isGrammarTerm(cwMatch2[1])) {
        checkWord = cwMatch2[1];
        ruleNote = ruleNote.replace(`(${checkWord})`, '').trim();
      } else {
        const infMatch = ruleNote.match(
          /(?:инфинитив|образовано от глагола)\s*[—–\-:]?\s*[«"']([А-Яа-яЁё\u0300-\u036f]+)[»"']/i
        );
        if (infMatch && !isGrammarTerm(infMatch[1])) {
          checkWord = infMatch[1];
        } else if (/^[А-Яа-яЁё\u0300-\u036f]+$/.test(ruleNote.trim())) {
          const single = ruleNote.trim();
          if (/^(?:словарное|запомнить)$/i.test(single)) {
            ruleNote = 'Непроверяемая гласная в корне (словарное слово, написание нужно запомнить).';
          } else if (!isGrammarTerm(single)) {
            checkWord = single;
            ruleNote = `Безударная гласная в корне проверяется ударением (проверочное слово — «${single}»).`;
          }
        }
      }
    }
  }

  // Expand shorthand notes like "словарное слово; запомнить"
  if (/^словарное(?:\s+слово)?(?:\s*[;,]\s*запомнить)?\.?$/i.test(ruleNote.trim())) {
    ruleNote = 'В корне пишется непроверяемая гласная (словарное слово, написание нужно запомнить).';
    orthogramType = 'Словарное слово';
  }

  // Identify orthogramType badge if not yet set
  if (!orthogramType) {
    if (task === '13') {
      const targetLower = (targetWord || '').toLowerCase().replace(/ё/g, 'е').trim();
      const cleanTargetUpper = (targetWord || '').replace(/[()]/g, '').trim().toUpperCase();
      const isParticiple =
        /причаст/i.test(ruleNote) ||
        /(?:ущ|ющ|ащ|ящ|вш|ш|ем|им|ом|енн|ённ|анн|янн|т)(?:ый|ая|ое|ые|ого|ому|ым|им|ом|ем|ую|юю|ой|ей|ых|их|ыми|ими)(?:ся|сь)?$/i.test(targetLower);
      const isAdjective =
        /прилагательн/i.test(ruleNote) ||
        /(?:[а-яё]ая|[а-яё]яя|[а-яё]ья|ое|ее|ый|ий|ой|ые|ие|ого|его|ому|ему|ым|им|ом|ем|ую|юю|ей|ых|их|ыми|ими)$/i.test(targetLower);

      const isSlitno13 =
        /пишется\s+(?:с\s+не\s+)?слитно|поэтому\s+слитно/i.test(ruleNote) ||
        (cleanTargetUpper.startsWith('НЕ') && !cleanTargetUpper.includes(' ') && !cleanTargetUpper.includes('-'));
      const isRazdelno13 =
        /пишется\s+(?:с\s+не\s+)?раздельно|поэтому\s+раздельно/i.test(ruleNote) ||
        cleanTargetUpper.startsWith('НЕ ') ||
        cleanTargetUpper.startsWith('НИ ');

      if (isParticiple) {
        if (isSlitno13) {
          orthogramType = 'Одиночные полные причастия с НЕ (слитно)';
        } else if (/кратк/i.test(ruleNote)) {
          orthogramType = 'Краткие причастия с НЕ (всегда раздельно)';
        } else if (/противопоставл/i.test(ruleNote) || /\bа\s+[а-яё]+/i.test(ruleNote)) {
          orthogramType = 'Полные причастия с противопоставлением (раздельно)';
        } else if (/(?:есть|наличи[еи]|с)\s+зависим/i.test(ruleNote)) {
          orthogramType = 'Полные причастия с зависимыми словами (раздельно)';
        } else if (isRazdelno13) {
          orthogramType = 'Полные причастия с НЕ (раздельно)';
        } else {
          orthogramType = 'Одиночные полные причастия с НЕ (слитно)';
        }
      } else if (isAdjective) {
        orthogramType = 'Правописание НЕ с прилагательными';
      } else if (
        !isAdjective &&
        (/деепричаст/i.test(ruleNote) ||
          (/(?:[аеёиоуыэюя]ясь?|[жшчщ]ась?|[аяу]чи|вши?|вшись)$/i.test(targetLower) &&
            !/(?:ая|яя|ое|ее|ый|ий|ой|ые|ие)$/i.test(targetLower)))
      ) {
        orthogramType = isSlitno13
          ? 'Деепричастия без НЕ не употребляющиеся (слитно)'
          : 'Правописание НЕ с деепричастиями (раздельно)';
      } else if (/существительн/i.test(ruleNote)) {
        orthogramType = isSlitno13
          ? 'Правописание НЕ с существительными (слитно)'
          : 'Правописание НЕ с существительными (раздельно)';
      } else if (/глагол/i.test(ruleNote)) {
        orthogramType = isSlitno13
          ? 'Глаголы с приставкой НЕДО- или без НЕ (слитно)'
          : 'Правописание НЕ и НИ с глаголами (раздельно)';
      } else if (/наречи/i.test(ruleNote)) {
        orthogramType = isSlitno13
          ? 'Правописание НЕ и НИ с наречиями (слитно)'
          : 'Правописание НЕ и НИ с наречиями (раздельно)';
      } else if (/местоимен/i.test(ruleNote)) {
        orthogramType = isSlitno13
          ? 'Правописание НЕ и НИ с местоимениями (слитно)'
          : 'Правописание НЕ и НИ с местоимениями (раздельно)';
      } else if (/категори|состояни|рад|готов|должен/i.test(ruleNote)) {
        orthogramType = isSlitno13
          ? 'Слова категории состояния на -О (слитно)'
          : 'Слова категории состояния с НЕ (всегда раздельно)';
      } else {
        orthogramType = isSlitno13
          ? 'Слитное написание НЕ и НИ'
          : 'Раздельное написание НЕ и НИ';
      }
    } else if (task === '14') {
      const lowerWord = (targetWord || '').toLowerCase().replace(/ё/g, 'е').trim();
      const cleanUpper = (targetWord || '').replace(/[()]/g, '').trim().toUpperCase();

      const isDefis14 =
        /пишется\s+через\s+дефис|поэтому\s+через\s+дефис|пишется\s+дефисно/i.test(ruleNote) ||
        cleanUpper.includes('-');
      const isRazdelno14 =
        !isDefis14 &&
        (/пишется\s+раздельно|поэтому\s+раздельно|пишутся\s+раздельно/i.test(ruleNote) ||
          cleanUpper.includes(' '));
      const isSlitno14 =
        !isDefis14 &&
        !isRazdelno14 &&
        (/пишется\s+слитно|поэтому\s+слитно|пишутся\s+слитно/i.test(ruleNote) ||
          (!cleanUpper.includes(' ') && !cleanUpper.includes('-')));

      if (isDefis14) {
        if (/оттенок цвета|цвет/i.test(ruleNote)) {
          orthogramType = 'Сложные прилагательные (оттенки цветов, через дефис)';
        } else if (/предлог|из-за|из-под/i.test(ruleNote) || /из-за|из-под/.test(lowerWord)) {
          orthogramType = 'Сложные предлоги (через дефис)';
        } else if (/пол-|юли/i.test(ruleNote) || lowerWord.startsWith('пол-')) {
          orthogramType = 'Корень ПОЛ- (Правило ЮЛИ, через дефис)';
        } else if (/наречи|по-/i.test(ruleNote) || lowerWord.startsWith('по-') || lowerWord.startsWith('во-')) {
          orthogramType = 'Наречия с приставками ПО-, В-/ВО- (через дефис)';
        } else if (/-то|-либо|-нибудь|-ка|-таки/i.test(ruleNote) || /(?:то|либо|нибудь|ка|таки)$/i.test(lowerWord)) {
          orthogramType = 'Неопределённые местоимения и частицы (через дефис)';
        } else {
          orthogramType = 'Сложные слова (через дефис)';
        }
      } else if (isRazdelno14) {
        if (/в конце концов|в то же время|рука об руку|бок о бок|устойчив/i.test(ruleNote) || lowerWord.includes('в конце концов')) {
          orthogramType = 'Устойчивые сочетания (раздельно)';
        } else if (/как будто/i.test(ruleNote) || lowerWord.includes('как будто')) {
          orthogramType = 'Сравнительный союз «как будто» (раздельно)';
        } else if (/в течение|в продолжение|в заключение|в виде|в связи с|на протяжении/i.test(ruleNote)) {
          orthogramType = 'Производные предлоги и сочетания (раздельно)';
        } else if (/союз|местоимен/i.test(ruleNote) || /^(?:что бы|так же|то же|за то|по этому|по тому)$/i.test(lowerWord)) {
          orthogramType = 'Омонимичные местоимения с частицами или предлогами (раздельно)';
        } else {
          orthogramType = 'Раздельное написание слов';
        }
      } else {
        if (/союз/i.test(ruleNote) || /^(?:чтобы|также|тоже|зато|притом|причем|поэтому|потому|оттого)$/i.test(lowerWord)) {
          orthogramType = 'Сочинительные и подчинительные союзы (слитно)';
        } else if (/предлог/i.test(ruleNote) || /^(?:ввиду|вследствие|наподобие|вместо|навстречу|насчет)$/i.test(lowerWord)) {
          orthogramType = 'Производные предлоги (слитно)';
        } else if (/пол-|полу-/i.test(ruleNote) || lowerWord.startsWith('полу') || lowerWord.startsWith('пол')) {
          orthogramType = 'Корень ПОЛ- и приставка ПОЛУ- (слитно)';
        } else if (/сложн.*прилаг/i.test(ruleNote)) {
          orthogramType = 'Сложные прилагательные (слитно)';
        } else if (/наречи/i.test(ruleNote)) {
          orthogramType = 'Наречия (слитно)';
        } else {
          orthogramType = 'Слитное написание слов';
        }
      }
    } else if (task === '15') {
      const isOneN =
        /пишется\s+одна\s+(?:буква\s+)?н\b|поэтому\s+одна\s+(?:буква\s+)?н\b|одна\s+буква\s+н\b/i.test(ruleNote);
      const isTwoNN =
        /пишется\s+две\s+(?:буквы\s+)?нн?\b|поэтому\s+две\s+(?:буквы\s+)?нн?\b|две\s+буквы\s+нн?\b/i.test(ruleNote);

      if (isOneN && !isTwoNN) {
        if (/кратк.*причаст/i.test(ruleNote)) {
          orthogramType = 'Краткие страдательные причастия (одна буква Н)';
        } else if (/-ин-|-ан-|-ян-/i.test(ruleNote)) {
          orthogramType = 'Суффиксы -АН-, -ЯН-, -ИН- в прилагательных (одна буква Н)';
        } else if (/отглагольн|несовершенн/i.test(ruleNote)) {
          orthogramType = 'Отглагольные прилагательные несовершенного вида (одна буква Н)';
        } else if (/ветрен/i.test(ruleNote)) {
          orthogramType = 'Исключение: ветреный (одна буква Н)';
        } else {
          orthogramType = 'Правописание одной буквы Н';
        }
      } else if (isTwoNN && !isOneN) {
        if (/стеклян|оловян|деревян/i.test(ruleNote)) {
          orthogramType = 'Исключения: стеклянный, оловянный, деревянный (две буквы НН)';
        } else if (/стык|основы на н/i.test(ruleNote)) {
          orthogramType = 'Стык основы на -Н- и суффикса -Н- (две буквы НН)';
        } else if (/-енн-|-онн-/i.test(ruleNote)) {
          orthogramType = 'Суффиксы -ЕНН-, -ОНН- в прилагательных (две буквы НН)';
        } else if (/причаст|отглагольн/i.test(ruleNote)) {
          orthogramType = 'Причастия и отглагольные прилагательные (две буквы НН)';
        } else {
          orthogramType = 'Правописание двух букв НН';
        }
      } else {
        if (/кратк/i.test(ruleNote)) {
          orthogramType = 'Краткие формы (Н и НН)';
        } else if (/причаст|отглагольн/i.test(ruleNote)) {
          orthogramType = 'Н и НН в причастиях и отглагольных прилагательных';
        } else {
          orthogramType = 'Правописание Н и НН в суффиксах';
        }
      }
    } else {
      const chgMatch = ruleNote.match(/чередовани[ея]\s+(?:корней\s+|в корне\s+)?([А-Яа-яЁё\-\/()\s]+?)(?=[:;,.]|$)/i);
      if (chgMatch) {
        orthogramType = `Чередование ${chgMatch[1].trim()}`;
      } else if (/непроверяемая|словарное/i.test(ruleNote)) {
        orthogramType = 'Словарное слово (непроверяемая гласная)';
      } else if (/проверяемая|проверочное слово/i.test(ruleNote) || (task === '9' && checkWord)) {
        orthogramType = 'Проверяемая гласная в корне';
      } else if (/приставк/i.test(ruleNote)) {
        orthogramType = 'Правописание приставки';
      } else if (/спряжен/i.test(ruleNote)) {
        orthogramType = 'Личное окончание / суффикс причастия';
      } else if (/суффикс/i.test(ruleNote)) {
        orthogramType = 'Правописание суффикса';
      } else if (/слитно|раздельно|дефис/i.test(ruleNote)) {
        orthogramType = 'Слитное, раздельное или дефисное написание';
      }
    }
  }

  // Split ruleNote into sequential, easy-to-read steps
  const rawSteps: string[] = [];
  let stepBuf = '';
  let pDepth = 0;
  for (let i = 0; i < ruleNote.length; i++) {
    const ch = ruleNote[i];
    if (ch === '(') pDepth++;
    else if (ch === ')') pDepth = Math.max(0, pDepth - 1);

    if (pDepth === 0 && (ch === ';' || ch === '→')) {
      if (stepBuf.trim()) rawSteps.push(stepBuf.trim());
      stepBuf = '';
      continue;
    }
    if (
      pDepth === 0 &&
      ch === ':' &&
      /^(?:чередование|по правилу чередования)/i.test(stepBuf.trim())
    ) {
      if (stepBuf.trim()) rawSteps.push(stepBuf.trim());
      stepBuf = '';
      continue;
    }
    stepBuf += ch;
  }
  if (stepBuf.trim()) rawSteps.push(stepBuf.trim());

  let steps = rawSteps
    .map((st) => {
      let cleanSt = st.replace(/^[,;.\s—–-]+|[,;.\s]+$/g, '').trim();
      if (!cleanSt) return '';
      if (!cleanSt.endsWith('.')) cleanSt += '.';
      return cleanSt.charAt(0).toUpperCase() + cleanSt.slice(1);
    })
    .filter(Boolean);

  // Filter out contradictory steps and sanitize conclusions
  if (task === '13') {
    const hasDependentWord = steps.some((s) =>
      /(?:есть\s+зависим|наличи[еи]\s+зависим|(?:полное\s+)?причасти[ея]\s+с\s+зависим|зависим(?:ым|ого|ые|ых|ое)\s+слов(?:ом|а|ам|ами|ах)?\s*[«\-(])/i.test(s) &&
      !/(?:нет|отсутстви[еи]|не\s+имеет|без)\s+зависим/i.test(s)
    );
    const hasOpposition = steps.some((s) =>
      /(?:есть|наличи[еи]|прямым|с\s+прямым)\s+противопоставлен/i.test(s) &&
      !/(?:нет|отсутстви[еи]|без)\s+противопоставлен/i.test(s)
    );

    const cleanTarget = (targetWord || '').replace(/[()]/g, '').trim();
    const splitTarget = cleanTarget.startsWith('НЕ ') ? cleanTarget : cleanTarget.replace(/^НЕ(?=[А-ЯЁа-яё])/i, 'НЕ ');

    if (hasDependentWord) {
      steps = steps.filter(
        (s) =>
          !/нет\s+зависимых|отсутстви[еи]\s+зависимых/i.test(s) &&
          !/нет\s+противопоставления\s+с\s+союзом\s+«?А»?,\s*зависимых/i.test(s) &&
          !/пишется\s+СЛИТНО/i.test(s)
      );
      if (!steps.some((s) => /пишется\s+РАЗДЕЛЬНО/i.test(s))) {
        steps.push(`Поэтому пишется РАЗДЕЛЬНО${splitTarget ? ` — «${splitTarget}»` : ''}.`);
      }
    } else if (hasOpposition) {
      steps = steps.filter(
        (s) =>
          !/нет\s+противопоставления/i.test(s) &&
          !/пишется\s+СЛИТНО/i.test(s)
      );
      if (!steps.some((s) => /пишется\s+РАЗДЕЛЬНО/i.test(s))) {
        steps.push(`Поэтому пишется РАЗДЕЛЬНО${splitTarget ? ` — «${splitTarget}»` : ''}.`);
      }
    } else if (steps.some((s) => /нет\s+зависимых|отсутстви[еи]\s+зависимых|пишется\s+(?:с\s+не\s+)?слитно/i.test(s))) {
      steps = steps.filter((s) => !/пишется\s+РАЗДЕЛЬНО/i.test(s));
    }
  } else if (task === '14') {
    const nonHyphenWords = [
      'ПОЭТОМУ', 'ПОТОМУ', 'ПОЧЕМУ', 'ПОСКОЛЬКУ', 'ОТТОГО', 'ОТЧЕГО',
      'ЗАТО', 'ТАКЖЕ', 'ТОЖЕ', 'ЧТОБЫ', 'ВВИДУ', 'НАЗАВТРА', 'ВСЛЕДСТВИЕ',
      'НАВСТРЕЧУ', 'НАПОДОБИЕ', 'ПОНЕМНОГУ', 'СНАЧАЛА', 'ВНАЧАЛЕ', 'ИТАК'
    ];
    const upperTarget = (targetWord || '').replace(/[-()]/g, '').toUpperCase();
    for (const nh of nonHyphenWords) {
      const mentionsNH = steps.some((s) => s.toUpperCase().includes(nh)) || upperTarget.includes(nh);
      if (mentionsNH) {
        steps = steps.filter((s) => {
          const isBogusHyphenRule = /такие\s+наречия\s+всегда\s+пишутся\s+через\s+дефис/i.test(s);
          const isBogusHyphenConclusion = /через\s+дефис/i.test(s) && s.toUpperCase().includes(nh);
          return !isBogusHyphenRule && !isBogusHyphenConclusion;
        });
        if (upperTarget === nh && !steps.some((s) => /пишется\s+СЛИТНО/i.test(s))) {
          steps.push(`Поэтому пишется СЛИТНО — «${nh}».`);
        }
      }
    }

    // Color shade compound adjectives
    const isColorShade = (token: string) => {
      const clean = token.toLowerCase().replace(/[-()]/g, '').replace(/ё/g, 'е');
      const colorPrefixes = ['темно', 'светло', 'ярко', 'бледно', 'тускло', 'густо', 'иссиня', 'изжелта', 'золотисто', 'серебристо', 'молочно', 'дымчато', 'сизо', 'пепельно', 'розово', 'буро', 'лилово', 'русо', 'желто', 'сине', 'красно', 'зелено', 'серо', 'бело', 'черно'];
      const colorRoots = ['коричнев', 'син', 'красн', 'желт', 'зелен', 'сер', 'голуб', 'бел', 'черн', 'розов', 'фиолет', 'оранж', 'свинцов', 'стальн', 'лилов', 'бур', 'вишнев', 'малинов', 'каштан', 'золот', 'бордов', 'рыж'];
      for (const cp of colorPrefixes) {
        if (clean.startsWith(cp)) {
          const rem = clean.slice(cp.length);
          for (const cr of colorRoots) {
            if (rem.includes(cr)) {
              if (['снежн', 'мрамор', 'кочан', 'лоб', 'глаз', 'волос', 'груд', 'влас', 'бров', 'крыл', 'рук', 'ног', 'хвост', 'кож'].some(exc => clean.includes(exc))) {
                return false;
              }
              return true;
            }
          }
        }
      }
      return false;
    };

    const targetRaw = targetWord || '';
    if (isColorShade(targetRaw) || /оттенок цвета/i.test(ruleNote)) {
      orthogramType = 'Сложные прилагательные (оттенки цветов)';
      steps = steps.filter((s) => !/наречие,\s*производный\s*предлог|пишется\s+СЛИТНО/i.test(s));
      const cleanTarget = targetRaw.replace(/[()]/g, '').toUpperCase();
      const hyphenTarget = cleanTarget.includes('-') ? cleanTarget : cleanTarget.replace(/^([А-ЯЁ]+?)(?=[А-ЯЁ]+$)/, '$1-');
      if (!steps.some((s) => /оттенок цвета/i.test(s))) {
        steps.unshift(`Слово «${hyphenTarget}» — сложное прилагательное, обозначающее оттенок цвета.`);
      }
      if (!steps.some((s) => /через\s+дефис/i.test(s))) {
        steps.push(`По орфографическому правилу сложные прилагательные, обозначающие оттенки цветов, пишутся через дефис.`);
        steps.push(`Поэтому пишется ЧЕРЕЗ ДЕФИС — «${hyphenTarget}».`);
      }
    }

    // КАК БУДТО
    if (/как\s*будто/i.test(targetRaw) || /как\s*будто/i.test(ruleNote)) {
      orthogramType = 'Устойчивые сочетания (раздельно)';
      steps = steps.filter((s) => !/через\s+дефис|пишется\s+СЛИТНО/i.test(s));
      if (!steps.some((s) => /пишется\s+РАЗДЕЛЬНО/i.test(s))) {
        steps = [
          'Сравнительный союз «КАК БУДТО».',
          'Сравнительный союз «как будто» всегда пишется раздельно в два слова без дефиса.',
          'Поэтому пишется РАЗДЕЛЬНО — «КАК БУДТО».'
        ];
      }
    }

    // Postfixed words with -ТО, -ЛИБО, -НИБУДЬ, -КА, -ТАКИ, КОЕ-
    const hasPostfix = /(?:-|\()(?:то|либо|нибудь|ка|таки)\)?$/i.test(targetRaw) || /(?:-|\()(?:то|либо|нибудь|ка|таки)\)?$/i.test(ruleNote);
    const hasKoe = /^кое[-()]/i.test(targetRaw) || /^кое/i.test(targetRaw);
    if ((hasPostfix || hasKoe) && !['будто', 'вместо', 'зато', 'что', 'это'].includes(targetRaw.toLowerCase().replace(/[-()]/g, ''))) {
      orthogramType = 'Неопределённые местоимения и наречия (через дефис)';
      steps = steps.filter((s) => !/пишется\s+СЛИТНО/i.test(s));
    }
  }

  // Deduplicate identical steps
  const seenSteps = new Set<string>();
  steps = steps.filter((s) => {
    const key = s.trim().toLowerCase();
    if (seenSteps.has(key)) return false;
    seenSteps.add(key);
    return true;
  });

  ruleNote = steps.join(' ');

  return {
    targetWord: targetWord || undefined,
    checkWord: checkWord || undefined,
    orthogramType: orthogramType || undefined,
    steps,
    warningNote: warningNote || undefined,
    ruleNote,
  };
}

function splitFormulaSteps(rawExplanation: string): { head: string; tail: string } {
  const arrowMatch = rawExplanation.split(/\s*(?:→|←|—|=)\s*/);
  if (arrowMatch.length >= 2) {
    return {
      head: arrowMatch[0].trim(),
      tail: arrowMatch.slice(1).join(' → ').trim(),
    };
  }
  return { head: 'Алгоритм', tail: rawExplanation };
}

export interface StructuredErrorCardProps {
  task: TaskId;
  topic: string;
  wordTitle: string;
  context?: string;
  userChoice: string;
  correctChoice: string;
  explanation: string;
  rule?: string;
  question?: TrainerQuestion;
  onInspectRule: () => void;
  staggerIndex?: number;
  forceCollapsed?: boolean;
}

export const StructuredErrorCard: React.FC<StructuredErrorCardProps> = React.memo(({
  task,
  topic,
  wordTitle,
  context,
  userChoice,
  correctChoice,
  explanation,
  rule,
  question,
  onInspectRule,
  staggerIndex = 0,
  forceCollapsed,
}) => {
  const isFipi5Row =
    question?.kind === 'fipi' ||
    wordTitle.startsWith('Задание №') ||
    explanation.includes('Строка ');
  const cleanExpl = isFipi5Row
    ? cleanDisplayText(explanation)
    : cleanDisplayText(isolateTargetWordExplanation(explanation, wordTitle));
  const parsedCardExpl = useMemo(
    () => (isFipi5Row ? null : parseStructuredExplanation(cleanExpl, wordTitle, task)),
    [isFipi5Row, cleanExpl, wordTitle, task]
  );
  const isolatedRule = isFipi5Row
    ? cleanDisplayText(rule || '')
    : cleanDisplayText(isolateTargetWordExplanation(rule || '', wordTitle));
  const formula = splitFormulaSteps(parsedCardExpl?.ruleNote || cleanExpl);
  const shortRule =
    parsedCardExpl?.orthogramType ||
    (isolatedRule && !isolatedRule.startsWith('Укажите варианты')
      ? isolatedRule.split('.')[0] + '.'
      : TASK_META[task].subtitle);
  
  // Synchronous override state - guarantees zero frame lag when forceCollapsed changes
  const [userOverride, setUserOverride] = useState<boolean | null>(null);
  const prevForceRef = useRef(forceCollapsed);
  if (prevForceRef.current !== forceCollapsed) {
    prevForceRef.current = forceCollapsed;
    if (userOverride !== null) {
      setUserOverride(null);
    }
  }
  const isCollapsed = userOverride !== null ? userOverride : (forceCollapsed ?? false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onInspectRule}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onInspectRule();
        }
      }}
      className="ios-inset-group ios-scroll-item p-3.5 !mb-0 ios-stagger-card cursor-pointer active:scale-[0.985] hover:border-[var(--ios-blue)]/50 hover:shadow-sm select-none transition-[border-color,box-shadow,background-color] duration-200"
      style={{ animationDelay: `${Math.min(staggerIndex * 35, 180)}ms` }}
    >
      {/* Top Row: Task Badge + Topic (left) | Rule pill + Circular Chevron toggle (right) */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className="w-5 h-5 rounded-md text-[10.5px] font-black flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ background: TASK_META[task].gradient }}
          >
            {task}
          </span>
          <span
            className="text-[12px] font-extrabold truncate"
            style={{ color: 'var(--ios-blue)' }}
          >
            {topic}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspectRule();
            }}
            className="px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-transform active:scale-95 flex items-center gap-0.5"
            style={{
              background: 'var(--ios-blue-soft)',
              color: 'var(--ios-blue)',
            }}
            title="Открыть справочник по этому правилу"
          >
            <span>Правило</span>
            <span className="opacity-70">?</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setUserOverride((prev) => (prev !== null ? !prev : !isCollapsed));
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-95"
            style={{
              background: isCollapsed ? 'var(--ios-bg-secondary)' : 'var(--ios-blue-soft)',
              color: isCollapsed ? 'var(--ios-label-sec)' : 'var(--ios-blue)',
            }}
            aria-label={isCollapsed ? 'Развернуть' : 'Свернуть'}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${!isCollapsed ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Middle Row: Word + Context (left) | Clean Comparison Pill [Вы: X] -> [Верно: Y] (right) */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-black tracking-tight leading-snug truncate">
            {isFipi5Row ? `Задание № ${task} · ФИПИ` : wordTitle}
          </div>
          {context && !isFipi5Row && (
            <div
              className="text-[11.5px] font-medium leading-tight mt-0.5 truncate"
              style={{ color: 'var(--ios-label-sec)' }}
            >
              {context}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-extrabold">
          <span
            className="px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs"
            style={{
              background: 'var(--ios-red-soft)',
              color: 'var(--ios-red)',
            }}
          >
            <span className="opacity-75 text-[10px]">Вы:</span>
            <span className="line-through decoration-1.5">{userChoice}</span>
          </span>
          <span className="text-[11px] opacity-40 font-bold">→</span>
          <span
            className="px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs"
            style={{
              background: 'var(--ios-green-soft)',
              color: 'var(--ios-green)',
            }}
          >
            <span className="opacity-75 text-[10px]">Верно:</span>
            <span>{correctChoice}</span>
          </span>
        </div>
      </div>

      {/* Collapsible Section with 120 FPS CSS Grid Spring Fold Animation */}
      <div className={`ios-accordion-grid ${!isCollapsed ? 'open' : ''}`}>
        <div className="ios-accordion-content">
          <div className="pt-2 flex flex-col gap-2">
            {/* Bottom Structured Breakdown (Zero Wall-of-Text!) */}
            {question && question.kind === 'fipi' ? (
              <div className="rounded-2xl p-2.5 flex flex-col gap-1.5" style={{ background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)' }}>
                {question.rows.map((r, rIdx) => {
                  const rowNum = rIdx + 1;
                  const userPicked = userChoice.includes(String(rowNum));
                  return (
                    <div
                      key={rowNum}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-[11.5px]"
                      style={{
                        background: r.isCorrectRow
                          ? 'var(--ios-green-soft)'
                          : userPicked
                          ? 'var(--ios-red-soft)'
                          : 'var(--ios-bg-tertiary)',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0"
                          style={{
                            background: r.isCorrectRow
                              ? 'var(--ios-green)'
                              : userPicked
                              ? 'var(--ios-red)'
                              : 'var(--ios-bg-tertiary)',
                            color: r.isCorrectRow || userPicked ? '#FFFFFF' : 'var(--ios-label-sec)',
                          }}
                        >
                          {rowNum}
                        </span>
                        <span className="font-bold truncate">
                          {r.solvedWords.join(', ')}
                        </span>
                      </div>
                      <span
                        className="text-[10.5px] font-extrabold shrink-0 whitespace-nowrap"
                        style={{
                          color: r.isCorrectRow
                            ? 'var(--ios-green)'
                            : userPicked
                            ? 'var(--ios-red)'
                            : 'var(--ios-label-sec)',
                        }}
                      >
                        {r.isCorrectRow ? `Буква ${r.letter}` : 'Разные'}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-1 mt-0.5 border-t border-[var(--ios-separator)]/40 text-[11px]">
                  <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--ios-label-sec)' }}>
                    {shortRule}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectRule();
                    }}
                    className="shrink-0 flex items-center gap-0.5 font-bold active:opacity-60 transition-opacity ml-2"
                    style={{ color: 'var(--ios-blue)' }}
                  >
                    <span>Подробнее</span>
                    <span className="text-[13px] leading-none">›</span>
                  </button>
                </div>
              </div>
            ) : isFipi5Row ? (
              <div
                className="rounded-2xl p-2.5 flex flex-col gap-1.5"
                style={{
                  background: 'var(--ios-bg-secondary)',
                  border: '1px solid var(--ios-card-border)',
                }}
              >
                {cleanExpl
                  .split(/\s*(?:\||;)\s*/)
                  .filter(Boolean)
                  .map((part, pIdx) => (
                    <div
                      key={pIdx}
                      className="text-[11.5px] font-semibold flex items-center gap-2"
                      style={{ color: 'var(--ios-label)' }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: 'var(--ios-green)' }}
                      />
                      <span className="truncate">{part}</span>
                    </div>
                  ))}
                <div
                  className="flex items-center justify-between text-[11px] pt-1.5 mt-0.5 border-t border-[var(--ios-separator)]/40"
                >
                  <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--ios-label-sec)' }}>
                    {shortRule}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectRule();
                    }}
                    className="shrink-0 flex items-center gap-0.5 text-[11px] font-bold active:opacity-60 transition-opacity ml-2"
                    style={{ color: 'var(--ios-blue)' }}
                  >
                    <span>Подробнее</span>
                    <span className="text-[13px] leading-none">›</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl p-2.5 flex flex-col gap-2"
                style={{
                  background: 'var(--ios-bg-secondary)',
                  border: '1px solid var(--ios-card-border)',
                }}
              >
                {parsedCardExpl?.checkWord && (task === '9' || task === '12') && (
                  <div
                    className="px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5"
                    style={{
                      background: 'var(--ios-green-soft)',
                      color: 'var(--ios-green)',
                    }}
                  >
                    <span className="opacity-80">🔍 Проверка:</span>
                    <span className="font-extrabold underline decoration-1.5 underline-offset-2">
                      {parsedCardExpl.checkWord}
                    </span>
                  </div>
                )}

                <div className="text-[11.5px] leading-relaxed font-medium" style={{ color: 'var(--ios-label)' }}>
                  {parsedCardExpl?.ruleNote || formula.tail || cleanExpl || shortRule}
                </div>

                <div
                  className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[var(--ios-separator)]/40"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span
                      className="font-extrabold shrink-0 text-[9.5px] px-1.5 py-0.5 rounded-md"
                      style={{
                        background: 'var(--ios-purple-soft)',
                        color: 'var(--ios-purple)',
                      }}
                    >
                      Орфограмма
                    </span>
                    <span className="truncate text-[11px] font-semibold" style={{ color: 'var(--ios-label-sec)' }}>
                      {shortRule}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectRule();
                    }}
                    className="shrink-0 flex items-center gap-0.5 text-[11px] font-bold active:opacity-60 transition-opacity ml-2"
                    style={{ color: 'var(--ios-blue)' }}
                  >
                    <span>Подробнее</span>
                    <span className="text-[13px] leading-none">›</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
  );
});

export const RuleInspectorModal: React.FC<RuleInspectorModalProps> = React.memo(({
  isOpen,
  onClose,
  question,
  errorEntry,
  onOpenFullCheatsheet,
}) => {
  // Cache the last active question and errorEntry so that during the 440ms exit slide-down animation,
  // the content remains fully rendered while sliding down smoothly!
  const cachedDataRef = useRef<{
    question: TrainerQuestion | null;
    errorEntry: ErrorBankEntry | null;
  }>({ question: null, errorEntry: null });

  if (question || errorEntry) {
    cachedDataRef.current = { question, errorEntry: errorEntry ?? null };
  }

  const activeQuestion = question || cachedDataRef.current.question;
  const activeError = errorEntry || cachedDataRef.current.errorEntry;

  const task = (activeError?.task || activeQuestion?.task || '9') as TaskId;
  const meta = TASK_META[task];
  const ruleHeading =
    meta?.block === 'punct'
      ? 'Правило пунктуации ФИПИ:'
      : meta?.block === 'speech'
      ? 'Норма речи ФИПИ:'
      : meta?.block === 'expressive'
      ? 'Средство выразительности ФИПИ:'
      : 'Правило орфографии ФИПИ:';
  const topic = activeError?.topic || activeQuestion?.topic || 'Орфография';
  const steps = TASK_STRUCTURED_STEPS[task] || [];
  const comparison = TASK_RULE_COMPARISON[task];
  const exceptionChips = TASK_KEY_EXCEPTIONS[task] || [];

  const userChoice = activeError?.userChoice;
  const correctChoice =
    activeError?.correctChoice ||
    (activeQuestion?.kind === 'sprint'
      ? activeQuestion.answer
      : activeQuestion?.correctIndices?.join(''));

  const solvedWordPreview =
    activeError?.correctWord && !activeError.correctWord.startsWith('Задание №')
      ? activeError.correctWord
      : activeQuestion?.kind === 'sprint'
      ? activeQuestion.task === '13'
        ? `${activeQuestion.prefix.replace(/[()]/g, '')}${
            activeQuestion.answer === 'СЛИТНО' ? '' : ' '
          }${activeQuestion.suffix}`
        : activeQuestion.task === '14'
        ? formatTask14SolvedWord(
            activeQuestion.prefix,
            activeQuestion.suffix,
            activeQuestion.answer
          )
        : ['9', '10', '11', '12', '15'].includes(activeQuestion.task)
        ? `${activeQuestion.prefix}${activeQuestion.answer.toLowerCase()}${activeQuestion.suffix}`
        : ['4', '5', '6', '7'].includes(activeQuestion.task)
        ? activeQuestion.answer
        : activeQuestion.suffix || activeQuestion.context || activeQuestion.answer
      : null;

  const rawExplanation = cleanDisplayText(
    isolateTargetWordExplanation(
      activeError?.explanation ||
      (activeQuestion?.kind === 'sprint' ? activeQuestion.explanation : '') ||
      '',
      solvedWordPreview
    )
  );
  const parsedExplanation = useMemo(() => {
    return parseStructuredExplanation(rawExplanation, solvedWordPreview, task);
  }, [rawExplanation, solvedWordPreview, task]);

  const contextText =
    activeError?.context ||
    (activeQuestion?.kind === 'sprint' ? activeQuestion.context : undefined);

  const liveMeta = useMemo(() => {
    if (activeQuestion && activeQuestion.kind === 'sprint') {
      return classifyWordSubtopicAndException(
        task,
        activeQuestion.prefix,
        activeQuestion.suffix,
        activeQuestion.answer,
        rawExplanation,
        contextText
      );
    }
    if (activeError && activeError.correctWord && !activeError.correctWord.startsWith('Задание №')) {
      const parts = (activeError.wordDisplay || '').split('..');
      return classifyWordSubtopicAndException(
        task,
        parts[0] || '',
        parts[1] || '',
        activeError.correctChoice || '',
        rawExplanation,
        contextText
      );
    }
    return null;
  }, [activeQuestion, activeError, task, rawExplanation, contextText]);

  // Build structured per-word breakdowns for all 5 rows when inspecting a FIPI 5-row task
  const fipiRowsBreakdown = useMemo(() => {
    if (!activeQuestion || activeQuestion.kind !== 'fipi') return null;
    return activeQuestion.rows.map((r, rIdx) => {
      const wordBreakdowns = r.solvedWords.map((solvedW, wIdx) => {
        const rawGapW = r.words[wIdx] || '';
        const isolated = isolateTargetWordExplanation(r.explanation || '', solvedW);
        const parsed = parseStructuredExplanation(isolated, solvedW, task);

        // Fallback to wordClassifier if the row explanation in the bank was just a bare list of words
        let fallbackRule = '';
        let fallbackTopic = '';
        if (!parsed.ruleNote && !parsed.checkWord) {
          const gapParts = rawGapW.replace(/\(.*?\)/g, '').trim().split('..');
          const prefix = gapParts[0] || '';
          const suffix = gapParts[1] || '';
          const letterMatch = solvedW.replace(/\(.*?\)/g, '').match(/[А-ЯЁ]+/);
          const ansLetter = letterMatch ? letterMatch[0] : r.letter !== '—' ? r.letter : '';
          const classified = classifyWordSubtopicAndException(
            task,
            prefix,
            suffix,
            ansLetter,
            '',
            ''
          );
          fallbackRule = classified.rule;
          fallbackTopic = classified.topic;
        }

        return {
          word: solvedW,
          checkWord: parsed.checkWord,
          orthogramType: parsed.orthogramType || fallbackTopic,
          steps:
            parsed.steps && parsed.steps.length > 0
              ? parsed.steps
              : fallbackRule
              ? [fallbackRule]
              : [],
          warningNote: parsed.warningNote,
          ruleNote: parsed.ruleNote || fallbackRule,
        };
      });

      return {
        rowNum: rIdx + 1,
        isCorrectRow: r.isCorrectRow,
        letter: r.letter,
        solvedWords: r.solvedWords,
        wordBreakdowns,
      };
    });
  }, [activeQuestion, task]);

  if (!activeQuestion && !activeError) return null;

  const displayTopic = liveMeta?.topic || topic;

  // Prefer the clean classifier rule for the general rule box; never show raw multi-word dumps or exam instructions
  const rawRuleCandidate = liveMeta?.rule
    ? cleanDisplayText(liveMeta.rule)
    : solvedWordPreview
    ? cleanDisplayText(
        isolateTargetWordExplanation(
          activeError?.rule || activeQuestion?.rule || '',
          solvedWordPreview
        )
      )
    : cleanDisplayText(activeError?.rule || activeQuestion?.rule || '');
  const isExamInstruction =
    /^(?:Укажите|Расставьте|Найдите|В одном из|Отредактируйте|Установите)/i.test(rawRuleCandidate);
  const generalRule = rawRuleCandidate && !isExamInstruction ? rawRuleCandidate : '';
  const wordSteps =
    parsedExplanation.steps && parsedExplanation.steps.length > 0
      ? parsedExplanation.steps
      : [];

  const itemTypeLabel = solvedWordPreview
    ? ['16', '17', '18', '19', '20', '21'].includes(task)
      ? 'Предложение из задания'
      : task === '8'
      ? 'Предложение из задания'
      : task === '22'
      ? 'Фрагмент из задания'
      : task === '4'
      ? 'Слово с верным ударением'
      : task === '5'
      ? 'Пароним из задания'
      : task === '6'
      ? 'Лексическая норма'
      : task === '7'
      ? 'Морфологическая форма'
      : 'Слово из задания'
    : 'Разбор задания ФИПИ';

  const stepBoxHeading =
    meta?.block === 'punct'
      ? 'Пунктуационный анализ:'
      : task === '8'
      ? 'Грамматический анализ:'
      : meta?.block === 'speech'
      ? 'Нормативный разбор:'
      : meta?.block === 'expressive'
      ? 'Анализ средств выразительности:'
      : 'Пошаговый разбор слова:';

  return (
    <SwipeableSheet
      id="rule-inspector-modal"
      handleId="rule-inspector-drag-handle"
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Разбор правила задания"
      handleAriaLabel="Потяните вниз, чтобы закрыть разбор правила"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-start gap-2.5 min-w-0 flex-1 pr-1">
          <div
            className="ios-row-icon !w-9 !h-9 !rounded-xl !m-0 shrink-0 mt-0.5"
            style={{ background: meta.gradient }}
          >
            {task}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] sm:text-[17px] font-extrabold tracking-tight leading-snug break-words">
              Задание {task} · Полный разбор
            </h3>
            <span
              className="block text-[11.5px] leading-snug break-words mt-0.5 font-bold"
              style={{ color: 'var(--ios-blue)' }}
            >
              {displayTopic}
            </span>
          </div>
        </div>
        <button
          id="close-rule-inspector"
          type="button"
          onClick={onClose}
          className="liquid-pill-btn px-3.5 py-1.5 rounded-full text-[13px] font-bold cursor-pointer shrink-0"
          aria-label="Закрыть разбор правила"
        >
          Понятно
        </button>
      </div>

      <div className="cheat-reader flex-1 mb-2">
        {/* 1. Main Word Breakdown Card */}
        <div className="ios-inset-group p-3.5 !mb-2.5 ios-stagger-card">
          <div className="flex flex-col gap-1.5 mb-2">
            <span
              className="text-[10px] font-extrabold uppercase tracking-wider"
              style={{ color: 'var(--ios-blue)' }}
            >
              {itemTypeLabel}
            </span>
            {(userChoice || correctChoice) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {userChoice && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold leading-snug break-words"
                    style={{
                      background: 'var(--ios-red-soft)',
                      color: 'var(--ios-red)',
                    }}
                  >
                    Вы ответили: {userChoice}
                  </span>
                )}
                {correctChoice && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold leading-snug break-words"
                    style={{
                      background: 'var(--ios-green-soft)',
                      color: 'var(--ios-green)',
                    }}
                  >
                    Верно: {correctChoice}
                  </span>
                )}
              </div>
            )}
          </div>

          <div
            className="text-[20px] sm:text-[23px] font-black leading-tight tracking-tight mb-1 break-words"
            style={{ color: 'var(--ios-label)' }}
          >
            {solvedWordPreview || `Задание № ${task} · ФИПИ`}
          </div>

          {contextText && (
            <div
              className="text-[12.5px] font-semibold mb-2"
              style={{ color: 'var(--ios-label-sec)' }}
            >
              {contextText}
            </div>
          )}

          {/* Sequential Step-by-Step Word Explanation Box */}
          {(wordSteps.length > 0 || parsedExplanation.checkWord) && (
            <div
              className="p-3.5 rounded-2xl flex flex-col gap-2.5 mt-2 border border-[var(--ios-separator)]/60"
              style={{ background: 'var(--ios-bg-secondary)' }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div
                  className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide"
                  style={{ color: 'var(--ios-blue)' }}
                >
                  <svg className="w-3.5 h-3.5 shrink-0"><use href="#sf-sparkles" /></svg>
                  <span>{stepBoxHeading}</span>
                </div>
                {(parsedExplanation.orthogramType || displayTopic) && (
                  <span
                    className="px-2 py-0.5 rounded-lg text-[10.5px] font-extrabold leading-snug break-words"
                    style={{
                      background: 'var(--ios-blue-soft)',
                      color: 'var(--ios-blue)',
                    }}
                  >
                    {parsedExplanation.orthogramType || displayTopic}
                  </span>
                )}
              </div>

              {parsedExplanation.checkWord && (task === '9' || task === '12') && (
                <div className="flex items-center gap-2">
                  <div
                    className="px-2.5 py-1 rounded-xl text-[12.5px] font-extrabold flex items-center gap-1.5"
                    style={{
                      background: 'var(--ios-green-soft)',
                      color: 'var(--ios-green)',
                    }}
                  >
                    <span>🔍 Проверочное / исходное слово:</span>
                    <span className="font-black underline decoration-2 underline-offset-2">
                      {parsedExplanation.checkWord}
                    </span>
                  </div>
                </div>
              )}

              {wordSteps.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {wordSteps.map((stepText, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex items-start gap-2 text-[13px] sm:text-[13.5px] font-medium leading-relaxed break-words"
                      style={{ color: 'var(--ios-label)' }}
                    >
                      {wordSteps.length > 1 && (
                        <span
                          className="w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background: 'var(--ios-blue-soft)',
                            color: 'var(--ios-blue)',
                          }}
                        >
                          {sIdx + 1}
                        </span>
                      )}
                      <span className="flex-1">{stepText}</span>
                    </div>
                  ))}
                </div>
              )}

              {parsedExplanation.warningNote && (
                <div
                  className="p-2.5 rounded-xl text-[12px] font-semibold leading-snug flex items-start gap-1.5"
                  style={{
                    background: 'var(--ios-orange-soft)',
                    color: 'var(--ios-orange)',
                  }}
                >
                  <span className="shrink-0 font-extrabold">⚠️ Важно:</span>
                  <span>{parsedExplanation.warningNote}</span>
                </div>
              )}
            </div>
          )}

          {/* Full Rule Box */}
          {generalRule && (
            <div
              className="p-3 rounded-2xl flex flex-col gap-1.5 mt-2 border border-[var(--ios-separator)]/60"
              style={{ background: 'var(--ios-bg-secondary)' }}
            >
              <div
                className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide"
                style={{ color: 'var(--ios-purple)' }}
              >
                <svg className="w-3.5 h-3.5 shrink-0">
                  <use href="#sf-book-fill" />
                </svg>
                <span>{ruleHeading}</span>
              </div>
              <div
                className="text-[13px] sm:text-[13.5px] font-semibold leading-relaxed break-words"
                style={{ color: 'var(--ios-label)' }}
              >
                {generalRule}
              </div>
            </div>
          )}
        </div>

        {/* 2. FIPI 5-row per-word breakdown if applicable */}
        {fipiRowsBreakdown && (
          <div className="ios-inset-group p-3 !mb-2.5 ios-stagger-card">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className="text-[10px] font-extrabold uppercase tracking-wider"
                style={{ color: 'var(--ios-blue)' }}
              >
                Разбор каждого слова по строкам
              </span>
              {activeQuestion && activeQuestion.kind === 'fipi' && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11.5px] font-extrabold shrink-0"
                  style={{
                    background: 'var(--ios-green-soft)',
                    color: 'var(--ios-green)',
                  }}
                >
                  Ответ: {activeQuestion.correctIndices.join('')}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {fipiRowsBreakdown.map((row) => (
                <div
                  key={row.rowNum}
                  className="p-2.5 rounded-2xl border border-[var(--ios-separator)]/50 flex flex-col gap-2"
                  style={{
                    background: row.isCorrectRow
                      ? 'var(--ios-green-soft)'
                      : 'var(--ios-bg-secondary)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-extrabold">
                      Строка {row.rowNum}
                    </span>
                    <span
                      className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                      style={{
                        background: row.isCorrectRow
                          ? 'var(--ios-green)'
                          : 'var(--ios-bg-tertiary)',
                        color: row.isCorrectRow ? '#FFFFFF' : 'var(--ios-label-sec)',
                      }}
                    >
                      {row.isCorrectRow
                        ? ['13', '14', '15'].includes(task)
                          ? `Подходит · ${row.letter}`
                          : `Подходит · Буква ${row.letter}`
                        : ['13', '14', '15'].includes(task)
                        ? `Не подходит · ${row.letter}`
                        : 'Разные буквы'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {row.wordBreakdowns.map((wb, wIdx) => (
                      <div
                        key={wIdx}
                        className="p-2.5 rounded-xl flex flex-col gap-1"
                        style={{ background: 'var(--ios-bg-cell-hover)' }}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span
                            className="text-[13px] font-black"
                            style={{ color: 'var(--ios-label)' }}
                          >
                            {wb.word}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {wb.checkWord && (
                              <span
                                className="px-2 py-0.5 rounded-lg text-[10.5px] font-extrabold"
                                style={{
                                  background: 'var(--ios-green-soft)',
                                  color: 'var(--ios-green)',
                                }}
                              >
                                🔍 {wb.checkWord}
                              </span>
                            )}
                            {wb.orthogramType && (
                              <span
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                                style={{
                                  background: 'var(--ios-blue-soft)',
                                  color: 'var(--ios-blue)',
                                }}
                              >
                                {wb.orthogramType}
                              </span>
                            )}
                          </div>
                        </div>
                        {wb.ruleNote && (
                          <div
                            className="text-[12px] font-medium leading-snug"
                            style={{ color: 'var(--ios-label-sec)' }}
                          >
                            {wb.ruleNote}
                          </div>
                        )}
                        {wb.warningNote && (
                          <div
                            className="text-[11px] font-semibold leading-snug"
                            style={{ color: 'var(--ios-orange)' }}
                          >
                            ⚠️ {wb.warningNote}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Structured 2-Column Visual Rule Schema */}
        <div
          className="ios-inset-group p-3 !mb-2 ios-stagger-card"
          style={{ animationDelay: '35ms' }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className="text-[10px] font-extrabold uppercase tracking-wider"
              style={{ color: 'var(--ios-blue)' }}
            >
              Структурная схема правила ФИПИ
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--ios-blue-soft)',
                color: 'var(--ios-blue)',
              }}
            >
              {meta.cheatPages}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div
              className="p-2.5 rounded-xl"
              style={{ background: 'var(--ios-bg-secondary)' }}
            >
              <div
                className="text-[11px] font-extrabold mb-1 px-2 py-0.5 rounded-md inline-block"
                style={{
                  background: 'var(--ios-blue-soft)',
                  color: 'var(--ios-blue)',
                }}
              >
                {comparison.leftBadge}
              </div>
              <ul className="m-0 pl-3.5 text-[11px] leading-snug space-y-1 font-semibold">
                {comparison.leftItems.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </div>

            <div
              className="p-2.5 rounded-xl"
              style={{ background: 'var(--ios-bg-secondary)' }}
            >
              <div
                className="text-[11px] font-extrabold mb-1 px-2 py-0.5 rounded-md inline-block"
                style={{
                  background: 'var(--ios-purple-soft)',
                  color: 'var(--ios-purple)',
                }}
              >
                {comparison.rightBadge}
              </div>
              <ul className="m-0 pl-3.5 text-[11px] leading-snug space-y-1 font-semibold">
                {comparison.rightItems.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Visual Exception Chips */}
          <div
            className="p-2 rounded-xl"
            style={{ background: 'var(--ios-orange-soft)' }}
          >
            <div
              className="text-[10px] font-extrabold uppercase tracking-wider mb-1"
              style={{ color: 'var(--ios-orange)' }}
            >
              Главные слова-ловушки задания № {task}:
            </div>
            <div className="flex flex-wrap gap-1">
              {exceptionChips.map((chip) => (
                <span
                  key={chip}
                  className="px-2 py-0.5 rounded-full text-[11px] font-extrabold"
                  style={{
                    background: 'var(--ios-bg-cell-hover)',
                    color: 'var(--ios-orange)',
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Structured 3-Step Algorithm Cards */}
        <div
          className="ios-inset-group p-3 !mb-1 ios-stagger-card"
          style={{ animationDelay: '70ms' }}
        >
          <div
            className="text-[10px] font-extrabold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--ios-purple)' }}
          >
            Алгоритм проверки в 3 шага
          </div>
          <div className="flex flex-col gap-1.5">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 rounded-xl"
                style={{ background: 'var(--ios-bg-secondary)' }}
              >
                <span
                  className="w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: 'var(--ios-purple-soft)',
                    color: 'var(--ios-purple)',
                  }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-extrabold leading-tight">
                    {step.title}
                  </div>
                  <div
                    className="text-[11px] leading-snug mt-0.5"
                    style={{ color: 'var(--ios-label-sec)' }}
                  >
                    {step.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          onClose();
          onOpenFullCheatsheet(task);
        }}
        className="ios-btn-primary !min-h-[46px] !text-[14.5px]"
      >
        <span>Открыть полный конспект № {task} ({meta.cheatPages})</span>
      </button>
    </SwipeableSheet>
  );
});

/* ============================================================================
   3. ОКНО «СЛОВАРЬ ИСКЛЮЧЕНИЙ И ЛОВУШЕК ФИПИ 4–22» (DictionaryModal)
   ============================================================================ */
interface DictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTrapsWorkout: () => void;
}

interface DictEntry {
  task: TaskId;
  word: string;
  highlight: string;
  category: string;
  note: string;
  source?: string;
}

const FIPI_DICTIONARY: DictEntry[] = [
  { task: '4', word: 'кла́ла, кра́ла, сла́ла, посла́ла, отосла́ла', highlight: 'А́', category: 'Исключения ж.р. прош. вр.', note: 'В отличие от остальных глаголов ж.р. (брала́, звала́), ударение остаётся на основе', source: 'ФИПИ Ловушка' },
  { task: '4', word: 'балова́ть, балу́ю, балу́ясь, избало́ванный', highlight: 'А́ / У́ / О́', category: 'Корень -БАЛ-', note: 'В формах со словами баловать корень -БАЛ- никогда не бывает ударным (кроме ба́ловень)', source: 'ФИПИ Ловушка' },
  { task: '4', word: 'до́верху, до́низу, до́суха, за́светло, за́темно', highlight: 'ДО́- / ЗА́-', category: 'Наречия с приставками', note: 'Приставки ДО- и ЗА- перетягивают ударение на себя', source: 'ФИПИ Ловушка' },
  { task: '5', word: 'абонент (связи) / абонемент (в бассейн)', highlight: 'ЛИЦО / ДОКУМЕНТ', category: 'Паронимы', note: 'Абонент — человек, пользующийся услугой; абонемент — документ на право посещения', source: 'ФИПИ Ловушка' },
  { task: '5', word: 'дипломат (посол) / дипломант (конкурса)', highlight: 'ПОСОЛ / ПРИЗЁР', category: 'Паронимы', note: 'Дипломат — должностное лицо МИД; дипломант — награждённый дипломом', source: 'ФИПИ Ловушка' },
  { task: '6', word: 'памятный сувенир, свободная вакансия, первая премьера', highlight: 'ПЛЕОНАЗМ', category: 'Лексическая избыточность', note: 'Сувенир уже памятный, вакансия уже свободная, премьера уже первая — определения лишние', source: 'ФИПИ Ловушка' },
  { task: '6', word: 'играть роль / иметь значение', highlight: 'СОЧЕТАЕМОСТЬ', category: 'Фразеологическая контаминация', note: 'Нельзя говорить «играть значение» или «иметь роль»', source: 'ФИПИ Ловушка' },
  { task: '7', word: 'чулок, ботинок, погон, эполет / носков, помидоров', highlight: 'Р.п. мн. ч.', category: 'Морфологические нормы', note: 'Парная обувь и воинские знаки — нулевое окончание (кроме носков); овощи и фрукты — -ОВ', source: 'ФИПИ Ловушка' },
  { task: '7', word: 'поезжай, ляг, лягте, положи', highlight: 'ПОВЕЛИТ.', category: 'Глагольные формы', note: 'Формы «ехай», «едь», «ляжь», «ложи» являются грубым нарушением нормы', source: 'ФИПИ Ловушка' },
  { task: '8', word: 'по приезде, по окончании, по прибытии, по истечении', highlight: 'П.п. (-ИИ/-Е)', category: 'Предлог ПО = «после»', note: 'Предлог ПО в значении «после чего-либо» требует предложного падежа, а не дательного (-У)', source: 'ФИПИ Ловушка' },
  { task: '9', word: 'выгарки, изгарь, пригарь', highlight: 'А', category: 'Исключения -ГАР-/-ГОР-', note: 'Без ударения пишется А (вопреки правилу -ГОР-)', source: 'ФИПИ Ловушка' },
  { task: '9', word: 'зоревать', highlight: 'О', category: 'Исключение -ЗАР-/-ЗОР-', note: 'Без ударения пишется О («не спать на заре»)', source: 'ФИПИ Ловушка' },
  { task: '9', word: 'полог', highlight: 'О', category: 'Исключение -ЛАГ-/-ЛОЖ-', note: 'Перед Г без суффикса -А- пишется О', source: 'ФИПИ Ловушка' },
  { task: '9', word: 'отрасль', highlight: 'А', category: 'Исключение -РАСТ-/-РОС-', note: 'Перед С пишется А', source: 'ФИПИ Ловушка' },
  { task: '9', word: 'росток, ростовщик, подростковый, заросли', highlight: 'О', category: 'Исключения -РАСТ-/-РОС-', note: 'Перед СТ пишется О', source: 'ФИПИ Ловушка' },
  { task: '9', word: 'скачок, скачу, скачи', highlight: 'А', category: 'Исключения -СКАК-/-СКОЧ-', note: 'Перед Ч пишется А', source: 'ФИПИ Ловушка' },
  { task: '9', word: 'пловец, пловчиха', highlight: 'О', category: 'Исключения -ПЛАВ-/-ПЛОВ-', note: 'В корне пишется О (плывун — Ы)', source: 'ФИПИ Ловушка' },
  { task: '9', word: 'утварь', highlight: 'А', category: 'Исключение -ТВАР-/-ТВОР-', note: 'Под ударением и без ударения А', source: 'ФИПИ Ловушка' },
  { task: '9', word: 'уровень, ровесник, поровну', highlight: 'О', category: 'Исключения -РАВН-/-РОВН-', note: 'Пишется с буквой О', source: 'ФИПИ Ловушка' },
  { task: '9', word: 'равнина, равняйсь, равнение', highlight: 'А', category: 'Исключения -РАВН-/-РОВН-', note: 'Пишется с буквой А', source: 'ФИПИ Ловушка' },
  { task: '9', word: 'сочетать, сочетание, словосочетание', highlight: 'Е', category: 'Исключения -ЧЕТ-/-ЧИТ-', note: 'Даже перед суффиксом -А- пишется Е', source: 'ФИПИ Ловушка' },
  { task: '10', word: 'несгораемый, несдобровать, несговорчивый', highlight: 'С', category: 'Две приставки НЕ- + С-', note: 'Приставки З- не существует', source: 'ФИПИ Ловушка' },
  { task: '10', word: 'взимать', highlight: 'И', category: 'Исключение Ы/И после приставок', note: 'После русской приставки ВЗ- сохраняется И', source: 'ФИПИ Ловушка' },
  { task: '10', word: 'сверхизысканный, межинститутский', highlight: 'И', category: 'Приставки СВЕРХ- и МЕЖ-', note: 'После МЕЖ- и СВЕРХ- всегда сохраняется И', source: 'ФИПИ Ловушка' },
  { task: '10', word: 'адъютант, конъюнктура, инъекция, фельдъегерь', highlight: 'Ъ', category: 'Разделительный Ъ', note: 'После иноязычных приставок перед Е, Ё, Ю, Я', source: 'ФИПИ Ловушка' },
  { task: '10', word: 'подьячий, пьедестал, бурьян', highlight: 'Ь', category: 'Разделительный Ь в корне', note: 'Подьячий образовано от «дьяк» (Ь внутри корня)', source: 'ФИПИ Ловушка' },
  { task: '10', word: 'преемник (традиций) / приёмник (радио)', highlight: 'Е / И', category: 'Омофоны ПРЕ-/ПРИ-', note: 'Преемник = перенимает; приёмник = принимает', source: 'ФИПИ Ловушка' },
  { task: '10', word: 'преходящий (временный) / приходящий (гость)', highlight: 'Е / И', category: 'Омофоны ПРЕ-/ПРИ-', note: 'Преходящий = проходящий; приходящий = приходит', source: 'ФИПИ Ловушка' },
  { task: '10', word: 'претворить (мечту) / притворить (дверь)', highlight: 'Е / И', category: 'Омофоны ПРЕ-/ПРИ-', note: 'Претворить = воплотить; притворить = прикрыть', source: 'ФИПИ Ловушка' },
  { task: '11', word: 'милостивый, юродивый', highlight: 'И', category: 'Исключения суффиксов прил.', note: 'В безударном положении пишется суффикс -ИВ-', source: 'ФИПИ Ловушка' },
  { task: '11', word: 'гуттаперчевый, фланелевый, щавелевый', highlight: 'Е', category: 'Безударный суффиксы -ЕВ-', note: 'Без ударения пишется -ЕВ-', source: 'ФИПИ Ловушка' },
  { task: '11', word: 'затмевать, продлевать, застревать, намереваться', highlight: 'Е', category: 'Глаголы перед ударным -ВА-', note: 'Исключения: перед ударным -ВА- пишется Е', source: 'ФИПИ Ловушка' },
  { task: '11', word: 'потчевать, проповедовать, заведовать', highlight: 'Е / О', category: 'Суффиксы -ОВА-/-ЕВА-', note: 'В 1-м лице: я потчую, проповедую (-УЮ/-ЮЮ)', source: 'ФИПИ Ловушка' },
  { task: '12', word: 'стелющийся, бреющий, зиждущийся', highlight: 'Ю / У', category: 'Исключения I спряжения', note: 'Брить, стелить, зиждиться — I спр. → -УЩ-/-ЮЩ-', source: 'ФИПИ Ловушка' },
  { task: '12', word: 'лелеющий, сеющий, веющий, тающий, кающийся', highlight: 'Ю', category: 'Глаголы на -ЯТЬ (I спр.)', note: 'Все глаголы на -ЯТЬ относятся к I спряжению', source: 'ФИПИ Ловушка' },
  { task: '12', word: 'клеящий, строящийся, дышащий, зависящий', highlight: 'Я / А', category: 'Глаголы II спряжения', note: 'Клеить (на -ИТЬ) и исключения II спр. → -АЩ-/-ЯЩ-', source: 'ФИПИ Ловушка' },
  { task: '12', word: 'выкачанная (нефть) / выкаченная (бочка)', highlight: 'А / Е', category: 'Причастия на -АНН-/-ЕНН-', note: 'Выкачать нефть (-АТЬ → А); выкатить бочку (-ИТЬ → Е)', source: 'ФИПИ Ловушка' },
  { task: '12', word: 'замешанный (в деле) / замешенное (тесто)', highlight: 'А / Е', category: 'Причастия на -АНН-/-ЕНН-', note: 'Замешать (-АТЬ → А); замесить тесто (-ИТЬ → Е)', source: 'ФИПИ Ловушка' },
  { task: '13', word: 'несмотря на (шторм) / не смотря (по сторонам)', highlight: 'СЛИТНО / РАЗД.', category: 'Предлог vs деепричастие', note: 'Вопреки = слитно; не глядя глазами = раздельно', source: 'ФИПИ Ловушка' },
  { task: '13', word: 'абсолютно нерискованный / вовсе не интересный', highlight: 'СЛИТНО / РАЗД.', category: 'Наречия меры vs отрицание', note: 'Абсолютно/очень = слитно; отнюдь не/вовсе не/далеко не = раздельно', source: 'ФИПИ Ловушка' },
  { task: '14', word: 'чтобы (успеть) / что бы (ни говорили)', highlight: 'СЛИТНО / РАЗД.', category: 'Союз vs местоимение с частицей', note: 'Чтобы = для того чтобы (слитно); что бы = бы можно опустить (раздельно)', source: 'ФИПИ Ловушка' },
  { task: '14', word: 'также, тоже / так же, то же', highlight: 'СЛИТНО / РАЗД.', category: 'Союзы vs местоимения/наречия', note: 'Также/тоже = и (слитно); так же, как / то же самое — раздельно', source: 'ФИПИ Ловушка' },
  { task: '14', word: 'ввиду (непогоды) / иметь в виду', highlight: 'СЛИТНО / РАЗД.', category: 'Предлог vs устойчивое сочетание', note: 'Ввиду = из-за (слитно); иметь в виду — раздельно в 3 слова', source: 'ФИПИ Ловушка' },
  { task: '14', word: 'в течение, в продолжение, в заключение', highlight: 'РАЗДЕЛЬНО (-Е)', category: 'Производные предлоги времени', note: 'Всегда пишутся раздельно с буквой Е на конце', source: 'ФИПИ Ловушка' },
  { task: '14', word: 'пол-лимона, пол-яблока, пол-Москвы / полгорода', highlight: 'ДЕФИС / СЛИТНО', category: 'Корень ПОЛ- (Правило ЮЛИ)', note: 'Перед Л, гласной и прописной — через дефис; перед согласной — слитно', source: 'ФИПИ Ловушка' },
  { task: '15', word: 'стеклянный, оловянный, деревянный', highlight: 'НН', category: 'Исключения суффиксов -АН-/-ЯН-', note: 'Три классических исключения с суффиксом -ЯНН- (пишутся с двумя НН)', source: 'ФИПИ Ловушка' },
  { task: '15', word: 'ветреный (день) / безветренный', highlight: 'Н / НН', category: 'Исключение суффикса -ЕН-', note: 'Ветреный — с одной Н; с приставкой безветренный — с двумя НН', source: 'ФИПИ Ловушка' },
  { task: '15', word: 'жареный (карась) / пожаренный, жаренный с луком', highlight: 'Н / НН', category: 'Отглагольное прил. vs причастие', note: 'Без приставки и зависимых слов — одна Н; с приставкой или завис. словом — НН', source: 'ФИПИ Ловушка' },
  { task: '15', word: 'кованый, жеваный', highlight: 'Н', category: 'Отглагольные прил. на -ОВАННЫЙ', note: '-ОВ- и -ЕВ- входят в состав корня, без приставок пишется одна Н', source: 'ФИПИ Ловушка' },
  { task: '15', word: 'задача решена / девушка умна и воспитанна', highlight: 'Н / НН', category: 'Краткие причастия vs краткие прил.', note: 'В кратких причастиях ВСЕГДА одна Н; в кратких прил. — столько Н, сколько в полной форме', source: 'ФИПИ Ловушка' },
  { task: '16', word: 'В лесу было тихо и пахло хвоей', highlight: 'БЕЗ ЗАПЯТОЙ', category: 'Общий второстепенный член в ССП', note: 'При наличии общего обстоятельства («В лесу») запятая перед союзом И в ССП не ставится', source: 'ФИПИ Ловушка' },
  { task: '17', word: 'сломя голову, затаив дыхание, спустя рукава', highlight: 'БЕЗ ЗАПЯТОЙ', category: 'Фразеологизмы с деепричастиями', note: 'Устойчивые фразеологические обороты не обособляются запятыми', source: 'ФИПИ Ловушка' },
  { task: '18', word: 'будто, вряд ли, едва ли, даже, именно, как будто, почти', highlight: 'БЕЗ ЗАПЯТОЙ', category: 'Лжевводные частицы и наречия', note: 'Эти слова НИКОГДА не бывают вводными и не выделяются запятыми', source: 'ФИПИ Ловушка' },
  { task: '19', word: 'дом, крыша которого... / книга, о которой...', highlight: 'ПЕРЕД ЧАСТЬЮ', category: 'Придаточное с союзным словом КОТОРЫЙ', note: 'Запятая ставится на границе придаточного, а не непосредственно перед словом «который»', source: 'ФИПИ Ловушка' },
  { task: '20', word: 'что если ... ТО (без запятой) / что, если ... (с запятой)', highlight: 'СТЫК СОЮЗОВ', category: 'Правило ТО, НО, ТАК', note: 'На стыке союзов запятая ставится только тогда, когда дальше нет второй части союза (ТО, НО, ТАК)', source: 'ФИПИ Ловушка' },
  { task: '21', word: 'Тире: подлежащее и сказуемое vs приложение vs БСП', highlight: 'РАЗНЫЕ ПРАВИЛА', category: 'Пунктуационный анализ', note: 'Нельзя объединять в один ответ тире между подлеж. и сказ. и тире при приложении или в БСП', source: 'ФИПИ Ловушка' },
  { task: '22', word: 'Анафора (начало) / Эпифора (конец) / Парцелляция (точки)', highlight: 'ФИГУРЫ РЕЧИ', category: 'Средства выразительности', note: 'Анафора — повтор в начале строк; эпифора — в конце; парцелляция — отделение членов предложения точкой', source: 'ФИПИ Ловушка' },
];

const buildFullDatabaseEntries = (): DictEntry[] => {
  const map = new Map<string, DictEntry>();

  // 1. Curated top FIPI traps (priority)
  FIPI_DICTIONARY.forEach((item) => {
    map.set(item.word.toLowerCase().trim(), item);
  });

  // 2. Real parsed words database from exam variants (all 18,070 authentic words)
  const wordsList: any[] = Array.isArray(PARSED_WORDS)
    ? PARSED_WORDS
    : Array.isArray(PARSED_WORDS_DATABASE)
      ? (PARSED_WORDS_DATABASE as any)
      : typeof PARSED_WORDS_DATABASE === 'object' && PARSED_WORDS_DATABASE !== null
        ? Object.values(PARSED_WORDS_DATABASE).flat()
        : [];

  wordsList.forEach((item) => {
    const displayWord = item.word || '—';
    const cleanContext = item.context
      ? (item.context.startsWith('(') ? item.context : `(${item.context})`)
      : '';
    const fullLabel = cleanContext ? `${displayWord} ${cleanContext}` : displayWord;
    const key = item.id || (displayWord + '_' + item.task + '_' + cleanContext).toLowerCase().trim();
    if (!map.has(key)) {
      const explicitRule = item.rule || '';
      map.set(key, {
        task: item.task as TaskId,
        word: fullLabel,
        highlight: item.missingLetter || (item as any).letter || '—',
        category: item.category || (item as any).topic || TASK_META[item.task as TaskId]?.title || `Задание № ${item.task}`,
        note: cleanDisplayText(explicitRule || isolateTargetWordExplanation((item as any).explanation || '', displayWord)),
        source: item.source || 'ФИПИ 2026–2027',
      });
    }
  });

  // 3. Fallback: only if main words bank is empty, populate from sprint questions
  if (wordsList.length === 0 && Array.isArray(PARSED_SPRINT_QUESTIONS)) {
    PARSED_SPRINT_QUESTIONS.forEach((sq, idx) => {
      const entry = sprintToWordEntry(sq, idx);
      if (!entry) return;
      const displayWord = entry.word || '—';
      const cleanContext = entry.context
        ? (entry.context.startsWith('(') ? entry.context : `(${entry.context})`)
        : '';
      const fullLabel = cleanContext ? `${displayWord} ${cleanContext}` : displayWord;
      const key = entry.id || (displayWord + '_' + entry.task + '_' + cleanContext).toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          task: entry.task as TaskId,
          word: fullLabel,
          highlight: entry.missingLetter || '—',
          category: entry.category || TASK_META[entry.task as TaskId]?.title || `Задание № ${entry.task}`,
          note: cleanDisplayText(entry.rule),
          source: entry.source || 'Банк ФИПИ / Школково',
        });
      }
    });
  }

  // 4. Ensure bank fills across all tasks if needed
  try {
    const bank = getTrainerBank();
    if (bank && Array.isArray(bank.sprintQuestions)) {
      bank.sprintQuestions.forEach((sq, idx) => {
        if (map.size >= 5000) return;
        const entry = sprintToWordEntry(sq, idx);
        if (!entry) return;
        const displayWord = entry.word || '—';
        const cleanContext = entry.context
          ? (entry.context.startsWith('(') ? entry.context : `(${entry.context})`)
          : '';
        const fullLabel = cleanContext ? `${displayWord} ${cleanContext}` : displayWord;
        const key = (displayWord + '_' + entry.task + '_' + cleanContext + '_' + idx).toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, {
            task: entry.task as TaskId,
            word: fullLabel,
            highlight: entry.missingLetter || '—',
            category: entry.category || TASK_META[entry.task as TaskId]?.title || `Задание № ${entry.task}`,
            note: cleanDisplayText(entry.rule),
            source: entry.source || 'Банк заданий ФИПИ 2026–2027',
          });
        }
      });
    }
  } catch {}

  return Array.from(map.values());
};

let cachedFullDatabaseEntries: DictEntry[] | null = null;
const getFullDatabaseEntries = (): DictEntry[] => {
  if (cachedFullDatabaseEntries) return cachedFullDatabaseEntries;
  cachedFullDatabaseEntries = buildFullDatabaseEntries();
  return cachedFullDatabaseEntries;
};

if (typeof window !== 'undefined') {
  window.addEventListener('ege-bank-loaded', () => {
    cachedFullDatabaseEntries = null;
  });
}

export const DictionaryModal: React.FC<DictionaryModalProps> = React.memo(({
  isOpen,
  onClose,
  onStartTrapsWorkout,
}) => {
  const [filterTask, setFilterTask] = useState<'all' | TaskId>('all');
  const [sourceMode, setSourceMode] = useState<'all' | 'traps'>('all');
  const [query, setQuery] = useState('');
  const [bankRev, setBankRev] = useState(0);
  const hasOpenedRef = useRef(isOpen);
  if (isOpen) hasOpenedRef.current = true;

  useEffect(() => {
    const onLoaded = () => {
      cachedFullDatabaseEntries = null;
      setBankRev((r) => r + 1);
    };
    window.addEventListener('ege-bank-loaded', onLoaded);
    return () => window.removeEventListener('ege-bank-loaded', onLoaded);
  }, []);

  useEffect(() => {
    if (isOpen && !cachedFullDatabaseEntries) {
      setBankRev((r) => r + 1);
    }
  }, [isOpen]);

  const hasOpened = hasOpenedRef.current;
  const fullEntries = useMemo(
    () => (hasOpened ? getFullDatabaseEntries() : FIPI_DICTIONARY),
    [hasOpened, bankRev]
  );

  const activePool = sourceMode === 'traps' ? FIPI_DICTIONARY : fullEntries;

  const filtered = useMemo(() => {
    if (!hasOpenedRef.current) return [];
    const q = query.trim().toLowerCase();
    return activePool.filter((item) => {
      if (filterTask !== 'all' && item.task !== filterTask) return false;
      if (!q) return true;
      return (
        Boolean(item.word?.toLowerCase().includes(q)) ||
        Boolean(item.category?.toLowerCase().includes(q)) ||
        Boolean(item.note?.toLowerCase().includes(q)) ||
        Boolean(item.source?.toLowerCase().includes(q))
      );
    });
  }, [activePool, filterTask, query]);

  // Cap visible items to first 60 for 60fps scrolling performance
  const visibleItems = useMemo(() => filtered.slice(0, 60), [filtered]);

  return (
    <SwipeableSheet
      id="dictionary-modal"
      handleId="dictionary-drag-handle"
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Словарь исключений и база слов ФИПИ"
      handleAriaLabel="Потяните вниз, чтобы закрыть словарь"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-[18px] font-extrabold tracking-tight leading-tight whitespace-nowrap truncate">
            Словарь и база ЕГЭ 4–22
          </h3>
          <span
            className="block text-[11.5px] truncate whitespace-nowrap mt-0.5"
            style={{ color: 'var(--ios-label-sec)' }}
          >
            Официальная база 2026–2027 и ловушки ФИПИ
          </span>
        </div>
        <button
          id="close-dictionary-modal"
          type="button"
          onClick={onClose}
          className="liquid-pill-btn px-3.5 py-1.5 rounded-full text-[13.5px] font-bold cursor-pointer shrink-0"
        >
          Закрыть
        </button>
      </div>

      <div className="mb-2">
        <LiquidGlassSegmented
          id="dict-source-glass-mode"
          ariaLabel="Выбор режима базы слов"
          value={sourceMode}
          onChange={setSourceMode}
          compact
          options={[
            { key: 'all', label: `База 2026–2027 (${fullEntries.length})` },
            { key: 'traps', label: `Топ-ловушки (${FIPI_DICTIONARY.length})` },
          ]}
        />
      </div>

      <input
        id="dictionary-search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск слова, правила или источника (полог, стелить, звонит)..."
        aria-label="Поиск по словарю"
        className="w-full px-3.5 py-2 rounded-2xl text-[16px] outline-none mb-2"
        style={{
          background: 'var(--ios-bg-secondary)',
          border: '0.5px solid var(--ios-separator)',
          color: 'var(--ios-label)',
        }}
      />

      <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setFilterTask('all')}
          className="px-3 py-1 rounded-full text-[11.5px] font-extrabold shrink-0 cursor-pointer transition-all"
          style={{
            background: filterTask === 'all' ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
            color: filterTask === 'all' ? '#FFFFFF' : 'var(--ios-label-sec)',
          }}
        >
          Все
        </button>
        {TASK_IDS.map((tId) => (
          <button
            key={tId}
            type="button"
            onClick={() => setFilterTask(tId)}
            className="px-2.5 py-1 rounded-full text-[11.5px] font-extrabold shrink-0 cursor-pointer transition-all"
            style={{
              background: filterTask === tId ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
              color: filterTask === tId ? '#FFFFFF' : 'var(--ios-label-sec)',
            }}
          >
            № {tId}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11.5px] px-1 mb-1.5" style={{ color: 'var(--ios-label-sec)' }}>
        <span>
          Найдено: <b>{filtered.length}</b> {sourceMode === 'traps' ? 'ловушек' : 'слов'}
        </span>
        {filtered.length > 60 && (
          <span className="text-[10.5px] opacity-75">показаны первые 60 для скорости</span>
        )}
      </div>

      <div className="cheat-reader flex-1 mb-2.5">
        <div className="flex flex-col gap-2 pb-1">
          {visibleItems.map((item, idx) => (
            <div key={idx} className="ios-inset-group ios-scroll-item p-3.5 !mb-0 shrink-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    className="text-[11px] font-bold truncate"
                    style={{ color: 'var(--ios-blue)' }}
                  >
                    Задание {item.task} · {item.category}
                  </span>
                  {item.source && (
                    <span
                      className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded shrink-0 truncate max-w-[150px]"
                      style={{ background: 'var(--ios-bg-secondary)', color: 'var(--ios-label-sec)' }}
                    >
                      {item.source}
                    </span>
                  )}
                </div>
                <span
                  className="text-[11px] font-extrabold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: 'var(--ios-green-soft)',
                    color: 'var(--ios-green)',
                  }}
                >
                  {item.highlight}
                </span>
              </div>
              <div className="text-[15px] font-extrabold leading-snug">{item.word}</div>
              <div
                className="text-[12px] mt-0.5 leading-snug"
                style={{ color: 'var(--ios-label-sec)' }}
              >
                {item.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          onClose();
          onStartTrapsWorkout();
        }}
        className="ios-btn-primary !text-[15px]"
      >
        <span>Тренировать ловушки ФИПИ (15 слов)</span>
      </button>
    </SwipeableSheet>
  );
});

/* ============================================================================
   4. ОКНО «НАСТРОЙКИ LIQUID GLASS И ЭКРАНА» (AppearanceModal)
   ============================================================================ */
export type LiquidGlassStyle = 'clear' | 'frosted';

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: (dark: boolean) => void;
  glassStyle: LiquidGlassStyle;
  onChangeGlassStyle: (style: LiquidGlassStyle) => void;
  specularEnabled: boolean;
  onToggleSpecular: (enabled: boolean) => void;
  onOpenSyncModal: () => void;
}

export const AppearanceModal: React.FC<AppearanceModalProps> = React.memo(({
  isOpen,
  onClose,
  darkMode,
  onToggleDarkMode,
  glassStyle,
  onChangeGlassStyle,
  specularEnabled,
  onToggleSpecular,
  onOpenSyncModal,
}) => {
  return (
    <SwipeableSheet
      id="appearance-modal"
      handleId="appearance-drag-handle"
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Настройки Liquid Glass и экрана"
      handleAriaLabel="Потяните вниз, чтобы закрыть настройки дизайна"
      sheetClassName="max-w-[460px]"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-[18px] font-extrabold tracking-tight leading-tight whitespace-nowrap truncate">
            Дизайн Liquid Glass
          </h3>
          <span
            className="block text-[11.5px] truncate whitespace-nowrap mt-0.5"
            style={{ color: 'var(--ios-label-sec)' }}
          >
            Оптическая физика стекла iOS 26 / iOS 27
          </span>
        </div>
        <button
          id="close-appearance-modal"
          type="button"
          onClick={onClose}
          className="liquid-pill-btn px-3.5 py-1.5 rounded-full text-[13.5px] font-bold cursor-pointer shrink-0"
        >
          Готово
        </button>
      </div>

      {/* Theme Mode */}
      <div className="ios-section-header !px-1">Цветовая среда</div>
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <button
          type="button"
          id="theme-light-btn"
          onClick={() => onToggleDarkMode(false)}
          className="ios-inset-group !mb-0 p-3 text-left cursor-pointer"
          style={{
            borderColor: !darkMode ? 'var(--ios-blue)' : undefined,
            boxShadow: !darkMode ? '0 0 0 2px var(--ios-blue-soft)' : undefined,
          }}
        >
          <div className="text-[13.5px] font-extrabold mb-0.5 whitespace-nowrap">
            Светлая (Spatial)
          </div>
          <div className="text-[11px] truncate" style={{ color: 'var(--ios-label-sec)' }}>
            Оптическая линза
          </div>
        </button>

        <button
          type="button"
          id="theme-dark-btn"
          onClick={() => onToggleDarkMode(true)}
          className="ios-inset-group !mb-0 p-3 text-left cursor-pointer"
          style={{
            borderColor: darkMode ? 'var(--ios-blue)' : undefined,
            boxShadow: darkMode ? '0 0 0 2px var(--ios-blue-soft)' : undefined,
          }}
        >
          <div className="text-[13.5px] font-extrabold mb-0.5 whitespace-nowrap">
            Тёмная (OLED #000)
          </div>
          <div className="text-[11px] truncate" style={{ color: 'var(--ios-label-sec)' }}>
            Чистый чёрный фон
          </div>
        </button>
      </div>

      {/* Apple WWDC 2026 Liquid Glass Material Selector */}
      <div className="ios-section-header !px-1">Преломление и прозрачность стекла</div>
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <button
          type="button"
          onClick={() => onChangeGlassStyle('clear')}
          className="ios-inset-group !mb-0 p-3.5 text-left cursor-pointer"
          style={{
            borderColor: glassStyle === 'clear' ? 'var(--ios-blue)' : undefined,
            boxShadow:
              glassStyle === 'clear' ? '0 0 0 2px var(--ios-blue-soft)' : undefined,
          }}
        >
          <div className="text-[14px] font-extrabold mb-0.5">Жидкая линза</div>
          <div className="text-[11px]" style={{ color: 'var(--ios-label-sec)' }}>
            Глубокая рефракция и объёмный край
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChangeGlassStyle('frosted')}
          className="ios-inset-group !mb-0 p-3.5 text-left cursor-pointer"
          style={{
            borderColor: glassStyle === 'frosted' ? 'var(--ios-blue)' : undefined,
            boxShadow:
              glassStyle === 'frosted' ? '0 0 0 2px var(--ios-blue-soft)' : undefined,
          }}
        >
          <div className="text-[14px] font-extrabold mb-0.5">Матовый криолит</div>
          <div className="text-[11px]" style={{ color: 'var(--ios-label-sec)' }}>
            Повышенная плотность для чтения
          </div>
        </button>
      </div>

      {/* Specular Rim Lensing Toggle */}
      <div className="ios-inset-group p-3.5 !mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[14px] font-extrabold">Динамические блики граней</div>
          <div className="text-[11.5px]" style={{ color: 'var(--ios-label-sec)' }}>
            Реакция светового контура (Specular Rim) на касание и курсор
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleSpecular(!specularEnabled)}
          className="px-3.5 py-1.5 rounded-full text-[12px] font-extrabold cursor-pointer shrink-0"
          style={{
            background: specularEnabled
              ? 'var(--ios-green-soft)'
              : 'var(--ios-bg-tertiary)',
            color: specularEnabled ? 'var(--ios-green)' : 'var(--ios-label-sec)',
          }}
        >
          {specularEnabled ? 'Активно' : 'Выкл.'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          onClose();
          onOpenSyncModal();
        }}
        className="ios-btn-tinted w-full"
      >
        <span>Открыть окно «Память и синхронизация»</span>
      </button>
    </SwipeableSheet>
  );
});

export const GlassSettingsModal = AppearanceModal;
export type GlassSettingsModalProps = AppearanceModalProps;