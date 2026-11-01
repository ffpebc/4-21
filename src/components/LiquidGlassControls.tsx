import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlashcardItem, TaskId } from '../utils/trainerLogic';

/* ============================================================================
   1. DRAGGABLE APPLE LIQUID GLASS SEGMENTED CONTROL (FOR ALL 2/3/6-WAY BARS)
   Allows both tapping and continuous finger scrubbing with droplet lens physics
   ============================================================================ */
export interface SegmentedOption<T extends string> {
  key: T;
  label: string;
}

interface LiquidGlassSegmentedProps<T extends string> {
  id?: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (newValue: T) => void;
  ariaLabel?: string;
  compact?: boolean;
}

function LiquidGlassSegmentedInner<T extends string>({
  id,
  options,
  value,
  onChange,
  ariaLabel,
  compact = false,
}: LiquidGlassSegmentedProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const [velocityStretch, setVelocityStretch] = useState(0);
  const [morphTick, setMorphTick] = useState(0);
  const [isFlowing, setIsFlowing] = useState(false);

  const rafRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; moved: boolean } | null>(null);
  const lastXRef = useRef<number | null>(null);
  const decayTimerRef = useRef<number | null>(null);
  const flowTimerRef = useRef<number | null>(null);
  const prevIdxRef = useRef<number>(
    Math.max(
      0,
      options.findIndex((o) => o.key === value)
    )
  );

  const count = options.length;
  const activeIdx = Math.max(
    0,
    options.findIndex((o) => o.key === value)
  );

  const startLiquidFlow = (fromIdx: number, toIdx: number) => {
    if (toIdx === fromIdx) return;
    if (flowTimerRef.current) window.clearTimeout(flowTimerRef.current);
    setMorphTick((t) => t + 1);
    setIsFlowing(true);
    flowTimerRef.current = window.setTimeout(() => {
      setIsFlowing(false);
    }, 520);
  };

  useEffect(() => {
    if (prevIdxRef.current !== activeIdx) {
      startLiquidFlow(prevIdxRef.current, activeIdx);
      prevIdxRef.current = activeIdx;
    }
  }, [activeIdx]);

  useEffect(() => {
    return () => {
      if (decayTimerRef.current) window.clearTimeout(decayTimerRef.current);
      if (flowTimerRef.current) window.clearTimeout(flowTimerRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const currentContinuousIndex =
    isDragging && dragRatio !== null ? dragRatio : activeIdx;
  const hoveredIndex = Math.min(
    count - 1,
    Math.max(0, Math.round(currentContinuousIndex))
  );

  const computeRatioFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return activeIdx;
    const rect = el.getBoundingClientRect();
    const segWidth = rect.width / count;
    const raw = (clientX - rect.left - segWidth / 2) / segWidth;
    return Math.max(-0.06, Math.min(count - 0.94, raw));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: e.clientX, moved: false };
    lastXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const totalDx = Math.abs(e.clientX - pointerStartRef.current.x);
    if (!pointerStartRef.current.moved) {
      if (totalDx < 6) return;
      pointerStartRef.current.moved = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      setIsDragging(true);
    }

    if (lastXRef.current !== null) {
      const dx = Math.abs(e.clientX - lastXRef.current);
      setVelocityStretch(Math.min(0.16, dx * 0.007));
      if (decayTimerRef.current) window.clearTimeout(decayTimerRef.current);
      decayTimerRef.current = window.setTimeout(() => {
        setVelocityStretch(0);
      }, 90);
    }
    lastXRef.current = e.clientX;
    const clientX = e.clientX;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setDragRatio(computeRatioFromClientX(clientX));
      });
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasScrubbing = pointerStartRef.current?.moved ?? false;
    pointerStartRef.current = null;
    lastXRef.current = null;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!wasScrubbing && !isDragging) return;

    const finalRatio = computeRatioFromClientX(e.clientX);
    const targetIdx = Math.min(count - 1, Math.max(0, Math.round(finalRatio)));
    setIsDragging(false);
    setDragRatio(null);
    setVelocityStretch(0);
    if (options[targetIdx] && options[targetIdx].key !== value) {
      prevIdxRef.current = targetIdx;
      startLiquidFlow(activeIdx, targetIdx);
      onChange(options[targetIdx].key);
    }
  };

  const handleSelectOption = (targetKey: T, targetIdx: number) => {
    if (targetKey === value) return;
    prevIdxRef.current = targetIdx;
    startLiquidFlow(activeIdx, targetIdx);
    onChange(targetKey);
  };

  const isLiquidActive = isDragging || isFlowing;
  const dragScaleX = isDragging ? 1.07 + velocityStretch : 1;
  const dragScaleY = isDragging ? 1.08 - velocityStretch * 0.18 : 1;

  return (
    <div
      id={id}
      ref={trackRef}
      role="tablist"
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      className={`ios-segmented select-none touch-none ${
        compact ? 'ios-segmented-compact' : ''
      } ${isLiquidActive ? 'is-scrubbing' : ''}`}
      style={{
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
      }}
    >
      <div
        className="ios-seg-indicator-track"
        style={{
          width: `calc((100% - 6px) / ${count})`,
          transform: `translate3d(${currentContinuousIndex * 100}%, 0, 0)`,
          transition: isDragging
            ? 'transform 0.04s linear'
            : 'transform 0.46s var(--spring-snappy, cubic-bezier(0.22, 1.06, 0.32, 1))',
        }}
      >
        <div
          key={morphTick}
          className={`ios-seg-indicator ${
            isLiquidActive ? 'liquid-droplet-active' : ''
          } ${morphTick > 0 && !isDragging ? 'liquid-morph-anim' : ''}`}
          style={
            isDragging
              ? {
                  transform: `scale(${dragScaleX.toFixed(3)}, ${dragScaleY.toFixed(
                    3
                  )})`,
                }
              : undefined
          }
        />
      </div>
      {options.map((opt, idx) => {
        const isCurrent = idx === hoveredIndex;
        const dist = Math.abs(currentContinuousIndex - idx);
        const lensScale =
          isDragging && dist < 0.85
            ? 1 + (0.85 - dist) * 0.06
            : isCurrent
            ? 1.02
            : 1;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={value === opt.key}
            onClick={() => handleSelectOption(opt.key, idx)}
            className={`ios-seg-btn ${compact ? '!h-[29px] !text-[11.5px]' : ''} ${
              count >= 7 ? '!text-[10px] sm:!text-[12px] !px-0.5 tracking-tight' : ''
            } ${isCurrent ? 'active' : ''} ${isLiquidActive && isCurrent ? 'scrub-focus' : ''}`}
            style={{
              transform: `scale(${lensScale.toFixed(3)})`,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export const LiquidGlassSegmented = React.memo(LiquidGlassSegmentedInner) as typeof LiquidGlassSegmentedInner;

/* ============================================================================
   2. DRAGGABLE APPLE LIQUID GLASS 5-TAB BAR
   Tap any tab -> Page opens instantly (0ms) while the Liquid Glass droplet
   stretches, refracts, and flows smoothly into the tapped tab!
   Scrub finger horizontally -> Droplet follows finger and switches tab on release.
   ============================================================================ */
export interface TabBarItem<T extends string> {
  key: T;
  label: string;
  iconHref: string;
  badgeCount?: number;
}

interface LiquidGlassTabBarProps<T extends string> {
  items: readonly TabBarItem<T>[];
  activeTab: T;
  onSelectTab: (tab: T) => void;
}

function LiquidGlassTabBarInner<T extends string>({
  items,
  activeTab,
  onSelectTab,
}: LiquidGlassTabBarProps<T>) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const [velocityStretch, setVelocityStretch] = useState(0);
  const [morphTick, setMorphTick] = useState(0);
  const [isFlowing, setIsFlowing] = useState(false);

  const rafRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; moved: boolean } | null>(null);
  const lastXRef = useRef<number | null>(null);
  const decayTimerRef = useRef<number | null>(null);
  const flowTimerRef = useRef<number | null>(null);
  const prevIdxRef = useRef<number>(
    Math.max(
      0,
      items.findIndex((t) => t.key === activeTab)
    )
  );

  const count = items.length;
  const activeIdx = Math.max(
    0,
    items.findIndex((t) => t.key === activeTab)
  );

  const startLiquidFlow = (fromIdx: number, toIdx: number) => {
    if (toIdx === fromIdx) return;
    if (flowTimerRef.current) window.clearTimeout(flowTimerRef.current);
    setMorphTick((t) => t + 1);
    setIsFlowing(true);
    flowTimerRef.current = window.setTimeout(() => {
      setIsFlowing(false);
    }, 540);
  };

  useEffect(() => {
    if (prevIdxRef.current !== activeIdx) {
      startLiquidFlow(prevIdxRef.current, activeIdx);
      prevIdxRef.current = activeIdx;
    }
  }, [activeIdx]);

  useEffect(() => {
    return () => {
      if (decayTimerRef.current) window.clearTimeout(decayTimerRef.current);
      if (flowTimerRef.current) window.clearTimeout(flowTimerRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const currentContinuousIndex =
    isDragging && dragRatio !== null ? dragRatio : activeIdx;
  const hoveredIndex = Math.min(
    count - 1,
    Math.max(0, Math.round(currentContinuousIndex))
  );

  const computeRatioFromClientX = (clientX: number) => {
    const el = barRef.current;
    if (!el) return activeIdx;
    const rect = el.getBoundingClientRect();
    const tabWidth = rect.width / count;
    const raw = (clientX - rect.left - tabWidth / 2) / tabWidth;
    return Math.max(-0.06, Math.min(count - 0.94, raw));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: e.clientX, moved: false };
    lastXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const totalDx = Math.abs(e.clientX - pointerStartRef.current.x);
    if (!pointerStartRef.current.moved) {
      if (totalDx < 6) return;
      pointerStartRef.current.moved = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      setIsDragging(true);
    }

    if (lastXRef.current !== null) {
      const dx = Math.abs(e.clientX - lastXRef.current);
      setVelocityStretch(Math.min(0.16, dx * 0.008));
      if (decayTimerRef.current) window.clearTimeout(decayTimerRef.current);
      decayTimerRef.current = window.setTimeout(() => {
        setVelocityStretch(0);
      }, 90);
    }
    lastXRef.current = e.clientX;
    const clientX = e.clientX;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setDragRatio(computeRatioFromClientX(clientX));
      });
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasScrubbing = pointerStartRef.current?.moved ?? false;
    pointerStartRef.current = null;
    lastXRef.current = null;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!wasScrubbing && !isDragging) return;

    const finalRatio = computeRatioFromClientX(e.clientX);
    const targetIdx = Math.min(count - 1, Math.max(0, Math.round(finalRatio)));
    setIsDragging(false);
    setDragRatio(null);
    setVelocityStretch(0);
    if (items[targetIdx] && items[targetIdx].key !== activeTab) {
      prevIdxRef.current = targetIdx;
      startLiquidFlow(activeIdx, targetIdx);
      onSelectTab(items[targetIdx].key);
    }
  };

  const handleSelectTabImmediate = (targetKey: T, targetIdx: number) => {
    if (targetKey === activeTab) return;
    prevIdxRef.current = targetIdx;
    startLiquidFlow(activeIdx, targetIdx);
    onSelectTab(targetKey);
  };

  const isLiquidActive = isDragging || isFlowing;
  const dragScaleX = isDragging ? 1.10 + velocityStretch : 1;
  const dragScaleY = isDragging ? 1.10 - velocityStretch * 0.18 : 1;

  return (
    <nav
      className={`ios-tabbar select-none ${
        isDragging ? 'touch-none' : 'touch-pan-y'
      } ${isLiquidActive ? 'is-scrubbing' : ''}`}
      role="tablist"
      aria-label="Основная навигация"
    >
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        className="ios-tabbar-inner cursor-pointer"
      >
        <div
          className="ios-tab-indicator-track"
          style={{
            transform: `translate3d(${currentContinuousIndex * 100}%, 0, 0)`,
            transition: isDragging
              ? 'transform 0.04s linear'
              : 'transform 0.52s cubic-bezier(0.22, 1.06, 0.32, 1)',
          }}
        >
          <div
            id="tabbar-active-pill"
            key={morphTick}
            className={`ios-tab-indicator ${
              isLiquidActive ? 'liquid-droplet-active' : ''
            } ${morphTick > 0 && !isDragging ? 'liquid-morph-anim' : ''}`}
            style={
              isDragging
                ? {
                    transform: `scale(${dragScaleX.toFixed(
                      3
                    )}, ${dragScaleY.toFixed(3)})`,
                  }
                : undefined
            }
          />
        </div>

        {items.map((item, idx) => {
          const isCurrent = idx === hoveredIndex;
          const dist = Math.abs(currentContinuousIndex - idx);
          const iconScale =
            isDragging && dist < 0.9
              ? 1 + (0.9 - dist) * 0.14
              : isCurrent
              ? 1.06
              : 1;

          return (
            <button
              key={item.key}
              type="button"
              id={`tab-btn-${item.key}`}
              role="tab"
              aria-selected={activeTab === item.key}
              onClick={() => handleSelectTabImmediate(item.key, idx)}
              className={`ios-tab-item ${isCurrent ? 'active' : ''}`}
            >
              <div
                className="relative transition-transform duration-200"
                style={{
                  transform: `scale(${iconScale.toFixed(3)})`,
                }}
              >
                <svg className="w-[21px] h-[21px]">
                  <use href={item.iconHref} />
                </svg>
                {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                  <span
                    id={`tab-${item.key}-badge`}
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center text-white"
                    style={{ background: 'var(--ios-red)' }}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const LiquidGlassTabBar = React.memo(LiquidGlassTabBarInner) as typeof LiquidGlassTabBarInner;

/* ============================================================================
   3. QUIZLET-STYLE SWIPEABLE 3D FLASHCARD DECK (NO BOTTOM BUTTONS!)
   Tap card -> 3D Flip.
   Swipe Right -> "Знаю" (Green).
   Swipe Left -> "Учить ещё" (Orange).
   Seamless 120fps stack promotion with zero backward fly-in glitch!
   ============================================================================ */
const TASK_FILTER_OPTIONS: readonly SegmentedOption<'all' | TaskId>[] = [
  { key: 'all', label: 'Все' },
  { key: '9', label: '№ 9' },
  { key: '10', label: '№ 10' },
  { key: '11', label: '№ 11' },
  { key: '12', label: '№ 12' },
  { key: '13', label: '№ 13' },
  { key: '14', label: '№ 14' },
  { key: '15', label: '№ 15' },
];

export const FlashcardListItem: React.FC<{
  card: FlashcardItem;
  forceCollapsed?: boolean;
  staggerIndex?: number;
}> = React.memo(({ card, forceCollapsed, staggerIndex = 0 }) => {
  const [userOverride, setUserOverride] = useState<boolean | null>(null);
  const prevForceRef = useRef(forceCollapsed);
  if (prevForceRef.current !== forceCollapsed) {
    prevForceRef.current = forceCollapsed;
    if (userOverride !== null) {
      setUserOverride(null);
    }
  }
  const isCollapsed = userOverride !== null ? userOverride : (forceCollapsed ?? true);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setUserOverride((prev) => (prev !== null ? !prev : !isCollapsed))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setUserOverride((prev) => (prev !== null ? !prev : !isCollapsed));
        }
      }}
      className="ios-inset-group ios-scroll-item p-3 !mb-0 cursor-pointer active:scale-[0.985] hover:border-[var(--ios-blue)]/50 select-none transition-[border-color,box-shadow,background-color] duration-200"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-5 h-5 rounded-md text-[11px] font-extrabold flex items-center justify-center text-white shrink-0"
            style={{
              background:
                card.task === '9'
                  ? 'linear-gradient(135deg, #007AFF, #5856D6)'
                  : card.task === '10'
                  ? 'linear-gradient(135deg, #5856D6, #AF52DE)'
                  : card.task === '11'
                  ? 'linear-gradient(135deg, #AF52DE, #FF2D55)'
                  : card.task === '12'
                  ? 'linear-gradient(135deg, #FF2D55, #FF9500)'
                  : 'linear-gradient(135deg, #FF9500, #34C759)',
            }}
          >
            {card.task}
          </span>
          <span className="text-[11.5px] font-extrabold truncate" style={{ color: 'var(--ios-blue)' }}>
            {card.topic}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setUserOverride((prev) => (prev !== null ? !prev : !isCollapsed));
          }}
          className="liquid-pill-btn text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-colors"
          style={{
            background: isCollapsed ? 'var(--ios-blue-soft)' : undefined,
            color: isCollapsed ? 'var(--ios-blue)' : undefined,
          }}
        >
          <span>{isCollapsed ? 'Развернуть' : 'Свернуть'}</span>
          <svg
            className={`w-3.5 h-3.5 ios-accordion-arrow ${isCollapsed ? 'rotated' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>

      <div className="text-[16px] font-extrabold leading-snug">
        {card.frontWord}
      </div>
      <div className="text-[11.5px] font-medium mt-0.5" style={{ color: 'var(--ios-label-sec)' }}>
        {card.frontHint}
      </div>

      <div className={`ios-accordion-grid ${!isCollapsed ? 'open' : ''}`}>
        <div className="ios-accordion-content">
          <div className="pt-2 mt-2 border-t border-[var(--ios-separator)]/60 flex flex-col gap-1.5">
            <div
              className="p-2 rounded-xl text-[13px] font-black"
              style={{
                background: 'var(--ios-green-soft)',
                color: 'var(--ios-green)',
              }}
            >
              Ответ: {card.backWord}
            </div>
            <div
              className="p-2 rounded-xl text-[11.5px] font-semibold leading-relaxed"
              style={{
                background: 'var(--ios-bg-secondary)',
                color: 'var(--ios-label)',
              }}
            >
              <span className="font-extrabold mr-1" style={{ color: 'var(--ios-purple)' }}>
                Правило:
              </span>
              {card.backRule}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

interface QuizletFlashcardDeckProps {
  cards: FlashcardItem[];
  filterTask: 'all' | TaskId;
  onChangeFilterTask: (task: 'all' | TaskId) => void;
}

export const QuizletFlashcardDeck: React.FC<QuizletFlashcardDeckProps> = ({
  cards,
  filterTask,
  onChangeFilterTask,
}) => {
  const [deckMode, setDeckMode] = useState<'stack' | 'list'>('stack');
  const [allCardsCollapsed, setAllCardsCollapsed] = useState(true);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<Set<string>>(() => new Set());
  const [learningIds, setLearningIds] = useState<Set<string>>(() => new Set());
  const [history, setHistory] = useState<number[]>([]);

  // Drag physics state
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [flyOutDir, setFlyOutDir] = useState<'left' | 'right' | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null
  );
  const cardRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (cardRafRef.current !== null) {
        cancelAnimationFrame(cardRafRef.current);
      }
    };
  }, []);

  // Reset index & flip when filter changes
  useEffect(() => {
    setIndex(0);
    setIsFlipped(false);
    setDragOffset({ x: 0, y: 0 });
    setFlyOutDir(null);
  }, [filterTask]);

  const total = cards.length;
  const currentCard = cards[index % Math.max(1, total)] || cards[0];
  const nextCard = total > 1 ? cards[(index + 1) % total] : null;
  const thirdCard = total > 2 ? cards[(index + 2) % total] : null;

  const triggerSwipeComplete = (dir: 'left' | 'right') => {
    if (!currentCard || flyOutDir) return;
    setFlyOutDir(dir);

    if (dir === 'right') {
      setKnownIds((prev) => {
        const next = new Set(prev);
        next.add(currentCard.id);
        return next;
      });
      setLearningIds((prev) => {
        const next = new Set(prev);
        next.delete(currentCard.id);
        return next;
      });
    } else {
      setLearningIds((prev) => {
        const next = new Set(prev);
        next.add(currentCard.id);
        return next;
      });
    }

    setHistory((prev) => [...prev, index]);

    window.setTimeout(() => {
      setIsFlipped(false);
      setFlyOutDir(null);
      setDragOffset({ x: 0, y: 0 });
      setIndex((i) => (i + 1) % total);
    }, 280);
  };

  const handleUndoLastCard = () => {
    if (history.length === 0) return;
    const prevIdx = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setIsFlipped(false);
    setFlyOutDir(null);
    setDragOffset({ x: 0, y: 0 });
    setIndex(prevIdx);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (flyOutDir) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
    };
    setIsDraggingCard(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCard || !pointerStartRef.current || flyOutDir) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (cardRafRef.current === null) {
      cardRafRef.current = requestAnimationFrame(() => {
        cardRafRef.current = null;
        if (!pointerStartRef.current) return;
        const dx = clientX - pointerStartRef.current.x;
        const dy = (clientY - pointerStartRef.current.y) * 0.28;
        setDragOffset({ x: dx, y: dy });
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cardRafRef.current !== null) {
      cancelAnimationFrame(cardRafRef.current);
      cardRafRef.current = null;
    }
    if (!isDraggingCard || !pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const dt = performance.now() - pointerStartRef.current.time;

    setIsDraggingCard(false);
    pointerStartRef.current = null;

    // Quick tap (< 10px movement) -> flip 3D card!
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 450) {
      setDragOffset({ x: 0, y: 0 });
      setIsFlipped((f) => !f);
      return;
    }

    // Swipe threshold (60px or fast flick)
    const velocityX = Math.abs(dx) / Math.max(1, dt);
    if (dx > 60 || (dx > 28 && velocityX > 0.38)) {
      triggerSwipeComplete('right');
    } else if (dx < -60 || (dx < -28 && velocityX > 0.38)) {
      triggerSwipeComplete('left');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Seamless stack progress: 1.0 during flyOut so 2nd card rises all the way to (0,0) scale(1)!
  const stackProgress = flyOutDir
    ? 1
    : Math.min(1, Math.abs(dragOffset.x) / 110);

  const rightBadgeOpacity =
    flyOutDir === 'right'
      ? 1
      : dragOffset.x > 16
      ? Math.min(1, (dragOffset.x - 16) / 65)
      : 0;
  const leftBadgeOpacity =
    flyOutDir === 'left'
      ? 1
      : dragOffset.x < -16
      ? Math.min(1, (-dragOffset.x - 16) / 65)
      : 0;

  const activeTranslateX =
    flyOutDir === 'right'
      ? 410
      : flyOutDir === 'left'
      ? -410
      : dragOffset.x;
  const activeTranslateY = flyOutDir ? 12 : dragOffset.y;
  const activeRotateDeg =
    flyOutDir === 'right'
      ? 13
      : flyOutDir === 'left'
      ? -13
      : dragOffset.x * 0.05;

  return (
    <div
      id="lab-flashcards-view"
      className="flex-1 flex flex-col justify-start gap-1.5 select-none ios-subview-animate"
    >
      {/* Top Draggable Liquid Glass Filter Bar */}
      <div className="mb-0.5">
        <LiquidGlassSegmented
          id="fc-task-glass-filter"
          options={TASK_FILTER_OPTIONS}
          value={filterTask}
          onChange={onChangeFilterTask}
          ariaLabel="Фильтр карточек по заданиям"
          compact
        />
      </div>

      {/* 3D Quizlet Card Stack positioned higher up directly below filter */}
      <div key={filterTask} className="flex flex-col justify-start pt-0.5 ios-subview-animate">
        <div className="relative w-full h-[332px]">
          {/* 3rd Card in Stack */}
          {thirdCard && (
            <div
              aria-hidden="true"
              className="quizlet-stack-card pointer-events-none"
              style={{
                transform: `translate3d(0, ${(18 - stackProgress * 8).toFixed(
                  1
                )}px, 0) scale(${(0.92 + stackProgress * 0.035).toFixed(3)})`,
                opacity: 0.45 + stackProgress * 0.25,
                zIndex: 1,
                transition: isDraggingCard
                  ? 'none'
                  : 'transform 0.28s var(--spring-snappy), opacity 0.28s ease',
              }}
            />
          )}

          {/* 2nd Card in Stack (Rises seamlessly to (0,0) scale(1) as top card flies out) */}
          {nextCard && (
            <div
              aria-hidden="true"
              className="quizlet-stack-card pointer-events-none flex flex-col justify-between p-5"
              style={{
                transform: `translate3d(0, ${(9 - stackProgress * 9).toFixed(
                  1
                )}px, 0) scale(${(0.955 + stackProgress * 0.045).toFixed(3)})`,
                opacity: 0.86 + stackProgress * 0.14,
                zIndex: 2,
                transition: isDraggingCard
                  ? 'none'
                  : 'transform 0.28s var(--spring-snappy), opacity 0.28s ease',
              }}
            >
              <div
                className="flex-1 flex flex-col justify-between"
                style={{
                  opacity: Math.max(0, (stackProgress - 0.05) / 0.95),
                  transition: isDraggingCard ? 'none' : 'opacity 0.24s ease',
                }}
              >
                <div className="flex items-center justify-between gap-2 whitespace-nowrap">
                  <span
                    className="text-[11.5px] font-bold px-2.5 py-1 rounded-full truncate"
                    style={{
                      background: 'var(--ios-blue-soft)',
                      color: 'var(--ios-blue)',
                    }}
                  >
                    {nextCard.badge}
                  </span>
                  <span
                    className="text-[11px] font-bold shrink-0"
                    style={{ color: 'var(--ios-label-sec)' }}
                  >
                    {((index + 1) % total) + 1} / {total}
                  </span>
                </div>
                <div className="text-center my-auto py-3">
                  <div className="text-[26px] font-extrabold tracking-tight mb-2 leading-tight">
                    {nextCard.frontWord}
                  </div>
                  <div
                    className="text-[13.5px] font-medium max-w-[300px] mx-auto leading-snug"
                    style={{ color: 'var(--ios-label-sec)' }}
                  >
                    {nextCard.frontHint}
                  </div>
                </div>
                <div
                  className="flex items-center justify-between text-[11px] font-bold pt-2.5 whitespace-nowrap"
                  style={{
                    borderTop: '0.5px solid var(--ios-separator)',
                    color: 'var(--ios-label-sec)',
                  }}
                >
                  <span style={{ color: 'var(--ios-orange)' }}>← Свайп: Учить</span>
                  <span style={{ color: 'var(--ios-blue)' }}>Тап: Перевернуть</span>
                  <span style={{ color: 'var(--ios-green)' }}>Свайп: Знаю →</span>
                </div>
              </div>
            </div>
          )}

          {/* Top Interactive Draggable + 3D Flippable Card (keyed by card ID + index so new card never flies backwards!) */}
          <div
            key={`${currentCard.id}-${index}`}
            id="quizlet-top-card"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="button"
            tabIndex={0}
            aria-label="Карточка Quizlet: нажмите для переворота или свайпните влево/вправо"
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setIsFlipped((f) => !f);
              } else if (e.key === 'ArrowRight') {
                triggerSwipeComplete('right');
              } else if (e.key === 'ArrowLeft') {
                triggerSwipeComplete('left');
              }
            }}
            className="w-full h-[332px] flashcard-perspective touch-none cursor-grab active:cursor-grabbing relative"
            style={{
              zIndex: 10,
              opacity: flyOutDir ? 0 : 1,
              transform: `translate3d(${activeTranslateX.toFixed(
                1
              )}px, ${activeTranslateY.toFixed(1)}px, 0) rotate(${activeRotateDeg.toFixed(
                2
              )}deg)`,
              transition: isDraggingCard
                ? 'none'
                : flyOutDir
                ? 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.26s ease-out'
                : 'transform 0.34s var(--spring-bouncy)',
            }}
          >
            {/* Swipe Right "ЗНАЮ" Liquid Glass Stamp */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-4 left-4 z-30 px-3 py-1 rounded-full text-[13px] font-extrabold tracking-tight flex items-center gap-1.5 whitespace-nowrap"
              style={{
                opacity: rightBadgeOpacity,
                background: 'var(--ios-green)',
                color: '#FFFFFF',
                boxShadow: '0 6px 16px rgba(40, 205, 86, 0.35)',
                transform: `scale(${(0.86 + rightBadgeOpacity * 0.16).toFixed(
                  2
                )}) rotate(-7deg)`,
              }}
            >
              <svg className="w-4 h-4 shrink-0">
                <use href="#sf-check-circle-fill" />
              </svg>
              <span>ЗНАЮ</span>
            </div>

            {/* Swipe Left "УЧИТЬ ЕЩЁ" Liquid Glass Stamp */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-4 right-4 z-30 px-3 py-1 rounded-full text-[13px] font-extrabold tracking-tight flex items-center gap-1.5 whitespace-nowrap"
              style={{
                opacity: leftBadgeOpacity,
                background: 'var(--ios-orange)',
                color: '#FFFFFF',
                boxShadow: '0 6px 16px rgba(255, 149, 0, 0.35)',
                transform: `scale(${(0.86 + leftBadgeOpacity * 0.16).toFixed(
                  2
                )}) rotate(7deg)`,
              }}
            >
              <span>УЧИТЬ ЕЩЁ</span>
            </div>

            <div
              id="flashcard-3d-box"
              className={`flashcard-inner !h-[332px] !min-h-[332px] ${
                isFlipped ? 'is-flipped' : ''
              }`}
            >
              {/* Front Face */}
              <div className="flashcard-face">
                <div className="flex items-center justify-between gap-2 whitespace-nowrap">
                  <span
                    className="text-[11.5px] font-bold px-2.5 py-1 rounded-full truncate"
                    style={{
                      background: 'var(--ios-blue-soft)',
                      color: 'var(--ios-blue)',
                    }}
                  >
                    {currentCard.badge}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {history.length > 0 && (
                      <button
                        type="button"
                        id="quizlet-undo-btn"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUndoLastCard();
                        }}
                        className="liquid-pill-btn px-2 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer whitespace-nowrap shrink-0"
                        aria-label="Вернуть предыдущую карточку"
                      >
                        ← Назад
                      </button>
                    )}
                    <span
                      id="quizlet-counter-label"
                      className="text-[11px] font-extrabold shrink-0"
                      style={{ color: 'var(--ios-label-sec)' }}
                    >
                      {(index % total) + 1} / {total}
                    </span>
                  </div>
                </div>

                <div className="text-center my-auto py-3">
                  <div className="text-[26px] font-extrabold tracking-tight mb-2 leading-tight">
                    {currentCard.frontWord}
                  </div>
                  <div
                    className="text-[13.5px] font-medium max-w-[300px] mx-auto leading-snug"
                    style={{ color: 'var(--ios-label-sec)' }}
                  >
                    {currentCard.frontHint}
                  </div>
                </div>

                <div
                  className="flex items-center justify-between text-[11px] font-bold pt-2.5 whitespace-nowrap"
                  style={{
                    borderTop: '0.5px solid var(--ios-separator)',
                    color: 'var(--ios-label-sec)',
                  }}
                >
                  <span style={{ color: 'var(--ios-orange)' }}>← Свайп: Учить</span>
                  <span style={{ color: 'var(--ios-blue)' }}>Тап: Перевернуть</span>
                  <span style={{ color: 'var(--ios-green)' }}>Свайп: Знаю →</span>
                </div>
              </div>

              {/* Back Face */}
              <div className="flashcard-face flashcard-back">
                <div className="flex items-center justify-between gap-2 whitespace-nowrap">
                  <span
                    className="text-[11.5px] font-bold px-2.5 py-1 rounded-full shrink-0"
                    style={{
                      background: 'var(--ios-green-soft)',
                      color: 'var(--ios-green)',
                    }}
                  >
                    Ответ ФИПИ • № {currentCard.task}
                  </span>
                  <span
                    className="text-[11px] font-bold truncate"
                    style={{ color: 'var(--ios-label-sec)' }}
                  >
                    {currentCard.topic}
                  </span>
                </div>

                <div className="text-center my-auto py-2">
                  <div
                    className="text-[24px] font-extrabold tracking-tight mb-2 leading-tight"
                    style={{ color: 'var(--ios-green)' }}
                  >
                    {currentCard.backWord}
                  </div>
                  <div className="text-[13.5px] font-semibold leading-snug max-w-[320px] mx-auto">
                    {currentCard.backRule}
                  </div>
                </div>

                <div
                  className="flex items-center justify-between text-[11px] font-bold pt-2.5 whitespace-nowrap"
                  style={{
                    borderTop: '0.5px solid var(--ios-separator)',
                    color: 'var(--ios-label-sec)',
                  }}
                >
                  <span style={{ color: 'var(--ios-orange)' }}>← Свайп: Учить</span>
                  <span style={{ color: 'var(--ios-blue)' }}>Тап: Вопрос</span>
                  <span style={{ color: 'var(--ios-green)' }}>Свайп: Знаю →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   4. SWIPEABLE iOS 27 LIQUID GLASS BOTTOM SHEET (FOR ALL SLIDE-UP WINDOWS)
   Lazy-mounts children only when open or closing so closed modals consume 0 DOM
   and 0 GPU backdrop-filter layers!
   ============================================================================ */
export interface SwipeableSheetProps {
  id: string;
  sheetId?: string;
  handleId?: string;
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  handleAriaLabel?: string;
  sheetClassName?: string;
  maxWidthClass?: string;
  sheetStyle?: React.CSSProperties;
  children: React.ReactNode;
}

// Freezes inner DOM reconciliation while sheet is sliding down on close (0ms JS work during exit animation)
const FrozenSheetBody = React.memo<{
  isOpen: boolean;
  children: React.ReactNode;
}>(
  ({ children }) => <>{children}</>,
  (prev, next) => (!next.isOpen ? true : prev.children === next.children)
);

export const SwipeableSheet: React.FC<SwipeableSheetProps> = React.memo(({
  id,
  sheetId,
  handleId,
  isOpen,
  onClose,
  ariaLabel,
  handleAriaLabel = 'Потяните вниз за ползунок, чтобы закрыть окно',
  sheetClassName = '',
  maxWidthClass = '',
  sheetStyle,
  children,
}) => {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isActive, setIsActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const dragOffsetYRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const pendingClientYRef = useRef<number | null>(null);

  // Synchronously mount when opening and synchronously deactivate when closing
  // so there is zero extra render pass delay before the close animation starts!
  if (isOpen && !isMounted) {
    setIsMounted(true);
  }
  if (!isOpen && isActive) {
    setIsActive(false);
  }

  useEffect(() => {
    return () => {
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isOpen) {
      setIsMounted(true);
      dragOffsetYRef.current = 0;
      setIsDragging(false);
      startYRef.current = null;

      if (backdropRef.current) {
        backdropRef.current.style.transition = '';
        backdropRef.current.style.opacity = '';
      }
      if (sheetRef.current) {
        sheetRef.current.style.transition = '';
      }

      // Double rAF ensures browser paints initial off-screen state before triggering spring slide-up
      let r1 = 0;
      let r2 = 0;
      r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => {
          setIsActive(true);
        });
      });
      return () => {
        if (r1) cancelAnimationFrame(r1);
        if (r2) cancelAnimationFrame(r2);
      };
    } else {
      setIsActive(false);
      setIsDragging(false);
      startYRef.current = null;
      if (backdropRef.current) {
        backdropRef.current.style.transition = '';
        backdropRef.current.style.opacity = '';
      }
      timerRef.current = window.setTimeout(() => {
        setIsMounted(false);
        dragOffsetYRef.current = 0;
      }, 440);
      return () => {
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [isOpen]);

  const handleDragStart = (clientY: number) => {
    startYRef.current = clientY;
    startTimeRef.current = performance.now();
    dragOffsetYRef.current = 0;
    setIsDragging(true);
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
    if (backdropRef.current) {
      backdropRef.current.style.transition = 'none';
    }
  };

  const handleDragMove = (clientY: number) => {
    if (startYRef.current === null || !sheetRef.current) return;
    pendingClientYRef.current = clientY;
    if (dragRafRef.current === null) {
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        if (startYRef.current === null || !sheetRef.current || pendingClientYRef.current === null) return;
        const rawDelta = pendingClientYRef.current - startYRef.current;
        const nextOffset = rawDelta >= 0 ? rawDelta : rawDelta * 0.22;
        dragOffsetYRef.current = nextOffset;
        // Direct hardware-accelerated 120 FPS compositor transform with 0 React re-renders:
        sheetRef.current.style.transform = `translate3d(0, ${nextOffset.toFixed(1)}px, 0)`;
        if (backdropRef.current) {
          const sheetHeight = sheetRef.current.offsetHeight || 520;
          const progress = Math.min(1, Math.max(0, nextOffset / sheetHeight));
          backdropRef.current.style.opacity = (1 - progress * 0.88).toFixed(3);
        }
      });
    }
  };

  const handleDragEnd = () => {
    if (dragRafRef.current !== null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    if (startYRef.current === null) return;
    const finalDelta = dragOffsetYRef.current;
    const elapsedMs = Math.max(1, performance.now() - startTimeRef.current);
    const velocity = finalDelta / elapsedMs;

    startYRef.current = null;
    dragOffsetYRef.current = 0;
    setIsDragging(false);

    const shouldClose = finalDelta > 65 || (finalDelta > 24 && velocity > 0.38);

    if (shouldClose) {
      // Continue smoothly from current finger offset down off-screen with zero snap-back
      if (sheetRef.current) {
        sheetRef.current.style.transition =
          'transform 0.44s var(--spring-sheet, cubic-bezier(0.32, 0.72, 0, 1))';
        sheetRef.current.style.transform = 'translate3d(0, 104%, 0)';
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition =
          'opacity 0.40s var(--spring-smooth, cubic-bezier(0.32, 0.72, 0, 1))';
        backdropRef.current.style.opacity = '';
      }
      setIsActive(false);
      onClose();
    } else {
      // Smoothly spring back from current drag offset to open position
      if (sheetRef.current) {
        sheetRef.current.style.transition =
          'transform 0.44s var(--spring-snappy, cubic-bezier(0.22, 1, 0.36, 1))';
        sheetRef.current.style.transform = 'translate3d(0, 0, 0)';
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition =
          'opacity 0.38s var(--spring-smooth, cubic-bezier(0.22, 1, 0.36, 1))';
        backdropRef.current.style.opacity = '';
      }
    }
  };

  if (!isMounted && !isOpen) return null;

  const isSheetVisible = isOpen && isActive;
  const sheetTransform = isSheetVisible
    ? 'translate3d(0, 0, 0)'
    : 'translate3d(0, 104%, 0)';

  return (
    <div
      id={id}
      className={`ios-sheet-root ${isSheetVisible ? 'open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      aria-label={ariaLabel}
    >
      <div
        ref={backdropRef}
        className="ios-sheet-backdrop"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        id={sheetId}
        ref={sheetRef}
        className={`ios-sheet ${maxWidthClass} ${sheetClassName} ${isDragging ? 'dragging' : ''} ${
          !isSheetVisible ? 'closing' : ''
        }`}
        style={{
          ...sheetStyle,
          transform: sheetTransform,
          transition: isDragging
            ? 'none'
            : isSheetVisible
            ? 'transform 0.44s cubic-bezier(0.22, 1, 0.36, 1)'
            : 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div
          id={handleId || `${id}-drag-handle`}
          className={`sheet-drag-handle ${isDragging ? 'dragging' : ''}`}
          role="button"
          tabIndex={isOpen ? 0 : -1}
          aria-label={handleAriaLabel}
          onPointerDown={(e) => {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Ignore
            }
            handleDragStart(e.clientY);
          }}
          onPointerMove={(e) => {
            if (isDragging) handleDragMove(e.clientY);
          }}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') onClose();
          }}
        >
          <div className="sheet-grabber-pill" />
        </div>
        <FrozenSheetBody isOpen={isOpen}>{children}</FrozenSheetBody>
      </div>
    </div>
  );
});

