import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  TaskId,
  TaskBlockId,
  TASK_IDS,
  TASK_BLOCKS,
  TASK_META,
  SprintGameMode,
  LabSubMode,
  StatSubMode,
  TrainerQuestion,
  TrainerState,
  ErrorBankEntry,
  FLASHCARDS_BANK,
  HOMOPHONE_PAIRS_BANK,
  createInitialState,
  createDefaultEnabledTasks,
  checkFipiQuestionAnswer,
  getTrainerBank,
  clampTaskQty,
  stepTaskQty,
  calculateTotalPlanned,
  calculateAccuracyPercent,
  normalizeKimDigits,
  buildWorkoutQueue,
  balanceSprintQuestionsList,
  buildBalancedHomophoneDeck,
  shuffleArray,
  applyAnswerToState,
  encodeBackupCode,
  decodeBackupCode,
  cleanWord,
  cleanExplanation,
  resolveTask15Sentence,
  formatTask14SolvedWord,
  BALANCED_30_QUANTITIES,
} from './utils/trainerLogic';
import {
  loadInitialStateSync,
  loadFromIndexedDB,
  persistStateMultiLayer,
  pushStateToCloudPin,
  pullStateFromCloudPin,
} from './utils/storageSync';
import { CheatsheetModal } from './components/CheatsheetModal';
import { SyncModal } from './components/SyncModal';
import { QuestionCardView } from './components/QuestionCardView';
import { Task15SentenceView } from './components/Task15SentenceView';
import { FormattedInstruction } from './components/FormattedInstruction';
import {
  PresetsModal,
  RuleInspectorModal,
  StructuredErrorCard,
  DictionaryModal,
  AppearanceModal,
  LiquidGlassStyle,
} from './components/WorkWindows';
import {
  LiquidGlassSegmented,
  LiquidGlassTabBar,
  QuizletFlashcardDeck,
  SwipeableSheet,
} from './components/LiquidGlassControls';

type ActiveTab = 'workout' | 'sprint' | 'lab' | 'errors' | 'stats';
type WorkoutSubView = 'builder' | 'active' | 'summary';

const TAB_ORDER: Record<ActiveTab, number> = {
  workout: 0,
  sprint: 1,
  lab: 2,
  errors: 3,
  stats: 4,
};

const WORKOUT_VIEW_ORDER: Record<WorkoutSubView, number> = {
  builder: 0,
  active: 1,
  summary: 2,
};

const LAB_MODE_ORDER: Record<LabSubMode, number> = {
  flashcards: 0,
  pairs: 1,
  kim: 2,
};

const STAT_MODE_ORDER: Record<StatSubMode, number> = {
  overview: 0,
  journal: 1,
  cloud: 2,
};

const iosScreenSlideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 84 : direction < 0 ? -84 : 0,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: 'spring' as const, stiffness: 290, damping: 30, mass: 0.8 },
      opacity: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const },
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -48 : direction < 0 ? 48 : 0,
    opacity: 0,
    pointerEvents: 'none' as const,
    transition: {
      x: { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const },
      opacity: { duration: 0.16, ease: 'easeOut' as const },
    },
  }),
};

interface SessionMistakeItem {
  question: TrainerQuestion;
  userChoice: string;
}

const createEmptyTaskTallies = (): Record<TaskId, { solved: number; correct: number }> => {
  const rec = {} as Record<TaskId, { solved: number; correct: number }>;
  TASK_IDS.forEach((id) => {
    rec[id] = { solved: 0, correct: 0 };
  });
  return rec;
};

const createEmptyKimAnswers = (): Record<TaskId, string> => {
  const rec = {} as Record<TaskId, string>;
  TASK_IDS.forEach((id) => {
    rec[id] = '';
  });
  return rec;
};

export default function App() {
  const [bankRev, setBankRev] = useState(0);
  useEffect(() => {
    const syncAppViewport = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const h = Math.max(vh || 0, window.innerHeight || 0);
      if (h && h > 0) {
        document.documentElement.style.setProperty('--app-height', `${Math.round(h)}px`);
      }
    };
    syncAppViewport();
    window.addEventListener('resize', syncAppViewport, { passive: true });
    window.addEventListener('orientationchange', syncAppViewport, { passive: true });
    window.addEventListener('pageshow', syncAppViewport, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncAppViewport, { passive: true });
      window.visualViewport.addEventListener('scroll', syncAppViewport, { passive: true });
    }
    const t1 = window.setTimeout(syncAppViewport, 60);
    const t2 = window.setTimeout(syncAppViewport, 250);
    const t3 = window.setTimeout(syncAppViewport, 600);

    const onLoaded = () => setBankRev((r) => r + 1);
    window.addEventListener('ege-bank-loaded', onLoaded);

    const onFocusOut = () => {
      const resetScroll = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (document.body) document.body.scrollTop = 0;
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      };
      resetScroll();
      syncAppViewport();
      window.setTimeout(resetScroll, 50);
      window.setTimeout(resetScroll, 150);
      window.setTimeout(resetScroll, 300);
      window.setTimeout(resetScroll, 500);
      window.setTimeout(syncAppViewport, 520);
    };
    window.addEventListener('focusout', onFocusOut);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener('resize', syncAppViewport);
      window.removeEventListener('orientationchange', syncAppViewport);
      window.removeEventListener('pageshow', syncAppViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', syncAppViewport);
        window.visualViewport.removeEventListener('scroll', syncAppViewport);
      }
      window.removeEventListener('ege-bank-loaded', onLoaded);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);
  const bank = useMemo(() => getTrainerBank(), [bankRev]);

  const [state, setState] = useState<TrainerState>(() => loadInitialStateSync());
  const [activeTab, setActiveTab] = useState<ActiveTab>('workout');
  const [workoutView, setWorkoutView] = useState<WorkoutSubView>('builder');
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<TaskBlockId, boolean>>({
    speech: false,
    ortho: false,
    punct: false,
    expressive: false,
  });

  // Liquid Glass optical customization state
  const [glassStyle, setGlassStyle] = useState<LiquidGlassStyle>('clear');
  const [specularEnabled, setSpecularEnabled] = useState(true);

  // Active workout session state
  const [sessionQueue, setSessionQueue] = useState<TrainerQuestion[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [sessionTaskTallies, setSessionTaskTallies] = useState<
    Record<TaskId, { solved: number; correct: number }>
  >(createEmptyTaskTallies);
  const [sessionMistakes, setSessionMistakes] = useState<SessionMistakeItem[]>([]);
  const [showSessionErrorsDrawer, setShowSessionErrorsDrawer] = useState(false);

  // Quick Sprint & Arcade Modes state
  const [sprintGameMode, setSprintGameMode] = useState<SprintGameMode>('endless');
  const [sprintFilter, setSprintFilter] = useState<'all' | TaskId>('all');
  const [sprintCursor, setSprintCursor] = useState(0);
  const [blitzTimeLeft, setBlitzTimeLeft] = useState(60);
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzFinished, setBlitzFinished] = useState(false);
  const [survivalLives, setSurvivalLives] = useState(3);
  const [survivalScore, setSurvivalScore] = useState(0);
  const [survivalFinished, setSurvivalFinished] = useState(false);

  // Lab 4–22 Tab state (3D Flashcards, Homophone Pairs, KIM 4–22 Simulator)
  const [labSubMode, setLabSubMode] = useState<LabSubMode>('flashcards');
  const [fcFilter, setFcFilter] = useState<'all' | TaskId>('all');
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);

  const [pairFilter, setPairFilter] = useState<'all' | TaskId>('all');
  const [pairDeck, setPairDeck] = useState(() =>
    buildBalancedHomophoneDeck(HOMOPHONE_PAIRS_BANK)
  );
  const [pairIndex, setPairIndex] = useState(0);
  const [pairSelectedOption, setPairSelectedOption] = useState<string | null>(null);

  const [kimVariantIdx, setKimVariantIdx] = useState(0);
  const [kimActiveTask, setKimActiveTask] = useState<TaskId>('4');
  const [kimAnswers, setKimAnswers] = useState<Record<TaskId, string>>(createEmptyKimAnswers);
  const [kimChecked, setKimChecked] = useState(false);

  // Stats Sub-mode state
  const [statSubMode, setStatSubMode] = useState<StatSubMode>('overview');
  const [cloudCodeText, setCloudCodeText] = useState('');
  const [cloudBannerMsg, setCloudBannerMsg] = useState('');

  // Synchronous direction tracking for native iOS horizontal sliding transitions
  const prevTabRef = useRef<ActiveTab>(activeTab);
  const tabDirectionRef = useRef<number>(1);
  if (prevTabRef.current !== activeTab) {
    tabDirectionRef.current =
      TAB_ORDER[activeTab] >= TAB_ORDER[prevTabRef.current] ? 1 : -1;
    prevTabRef.current = activeTab;
  }
  const tabDirection = tabDirectionRef.current;

  const prevWorkoutViewRef = useRef<WorkoutSubView>(workoutView);
  const workoutDirectionRef = useRef<number>(1);
  if (prevWorkoutViewRef.current !== workoutView) {
    workoutDirectionRef.current =
      WORKOUT_VIEW_ORDER[workoutView] >=
      WORKOUT_VIEW_ORDER[prevWorkoutViewRef.current]
        ? 1
        : -1;
    prevWorkoutViewRef.current = workoutView;
  }
  const workoutDirection = workoutDirectionRef.current;

  const prevLabModeRef = useRef<LabSubMode>(labSubMode);
  const labDirectionRef = useRef<number>(1);
  if (prevLabModeRef.current !== labSubMode) {
    labDirectionRef.current =
      LAB_MODE_ORDER[labSubMode] >= LAB_MODE_ORDER[prevLabModeRef.current]
        ? 1
        : -1;
    prevLabModeRef.current = labSubMode;
  }
  const labDirection = labDirectionRef.current;

  const prevStatModeRef = useRef<StatSubMode>(statSubMode);
  const statDirectionRef = useRef<number>(1);
  if (prevStatModeRef.current !== statSubMode) {
    statDirectionRef.current =
      STAT_MODE_ORDER[statSubMode] >= STAT_MODE_ORDER[prevStatModeRef.current]
        ? 1
        : -1;
    prevStatModeRef.current = statSubMode;
  }
  const statDirection = statDirectionRef.current;

  // Auto-scroll viewport back to top on tab or workout subview transitions
  useEffect(() => {
    const sc = document.getElementById('app-scroll-container');
    if (sc) {
      sc.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeTab, workoutView]);

  // Liquid Glass Windows (Modals) state
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [rulesInitialSection, setRulesInitialSection] = useState<'all' | TaskId>('all');
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [inspectedQuestion, setInspectedQuestion] = useState<TrainerQuestion | null>(null);
  const [inspectedError, setInspectedError] = useState<ErrorBankEntry | null>(null);
  const [isRuleInspectorOpen, setIsRuleInspectorOpen] = useState(false);
  const [allMistakesCollapsed, setAllMistakesCollapsed] = useState(false);
  const [allErrorsCollapsed, setAllErrorsCollapsed] = useState(false);

  const openRuleInspector = (q: TrainerQuestion | null, err?: ErrorBankEntry | null) => {
    setInspectedQuestion(q);
    setInspectedError(err || null);
    setIsRuleInspectorOpen(true);
  };

  const closeRuleInspector = () => {
    setIsRuleInspectorOpen(false);
    // Keep data during 440ms smooth slide-down sheet animation before nullifying!
    setTimeout(() => {
      setInspectedQuestion(null);
      setInspectedError(null);
    }, 480);
  };

  // 1. Load IndexedDB + Hosted Server Memory after initial paint so cold start is 0ms non-blocking
  useEffect(() => {
    const idbTimer = window.setTimeout(() => {
      loadFromIndexedDB().then((idbState) => {
        if (idbState) {
          setState((prev) => (idbState.totalSolved > prev.totalSolved ? idbState : prev));
        }
      });
    }, 60);

    const cloudTimer = window.setTimeout(() => {
      let initialPin: string | undefined;
      try {
        const hash = window.location.hash.replace(/^#/, '');
        const params = new URLSearchParams(hash);
        const urlPin = params.get('pin');
        if (urlPin && urlPin.trim().length >= 2) {
          initialPin = urlPin.trim().toUpperCase();
        }
      } catch {
        // Ignore
      }

      pullStateFromCloudPin(initialPin).then((res) => {
        if (res.found && res.state) {
          setState((prev) =>
            res.state!.totalSolved > prev.totalSolved ? res.state! : prev
          );
        }
      });
    }, 450);

    return () => {
      window.clearTimeout(idbTimer);
      window.clearTimeout(cloudTimer);
    };
  }, []);

  // 2. Non-blocking debounced persistence (zero redundant background requests or double re-renders)
  useEffect(() => {
    const localTimer = setTimeout(() => {
      persistStateMultiLayer(state);
    }, 250);

    let cloudTimer: NodeJS.Timeout | undefined;
    if (state.profilePin && state.profilePin.trim().length >= 2) {
      cloudTimer = setTimeout(() => {
        pushStateToCloudPin(state.profilePin, state);
      }, 2500);
    }

    return () => {
      clearTimeout(localTimer);
      if (cloudTimer) clearTimeout(cloudTimer);
    };
  }, [state]);

  // Populate backup code textarea only when user opens Stats -> Память sub-tab
  useEffect(() => {
    if (activeTab === 'stats' && statSubMode === 'cloud') {
      setCloudCodeText(encodeBackupCode(state));
    }
  }, [activeTab, statSubMode, state]);

  // 3. Sync Dark Mode & Liquid Glass optical classes
  useEffect(() => {
    const root = document.documentElement;
    if (state.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (glassStyle === 'frosted') {
      root.classList.add('glass-frosted');
    } else {
      root.classList.remove('glass-frosted');
    }
    if (!specularEnabled) {
      root.classList.add('no-specular');
    } else {
      root.classList.remove('no-specular');
    }
    const themeMeta = document.getElementById('app-theme-color');
    if (themeMeta) {
      themeMeta.setAttribute('content', state.darkMode ? '#000000' : '#EAEFF8');
    }
  }, [state.darkMode, glassStyle, specularEnabled]);

  // 5. Blitz 60s countdown timer
  useEffect(() => {
    if (activeTab !== 'sprint' || sprintGameMode !== 'blitz60' || blitzFinished) {
      return;
    }
    const interval = setInterval(() => {
      setBlitzTimeLeft((prev) => {
        if (prev <= 1) {
          setBlitzFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTab, sprintGameMode, blitzFinished]);

  const resetViewportOnBlur = useCallback(() => {
    const restore = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.body) document.body.scrollTop = 0;
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      const vp = document.querySelector('meta[name="viewport"]');
      if (vp) {
        vp.setAttribute(
          'content',
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        );
      }
    };
    restore();
    window.setTimeout(restore, 50);
    window.setTimeout(restore, 150);
    window.setTimeout(restore, 300);
    window.setTimeout(restore, 500);
  }, []);

  useEffect(() => {
    const el = document.getElementById('app-scroll-container');
    if (el) {
      el.scrollTop = 0;
    }
  }, [activeTab, workoutView]);

  const totalPlanned = useMemo(
    () => calculateTotalPlanned(state.quantities, state.enabledTasks),
    [state.quantities, state.enabledTasks]
  );

  const isScrollLocked = useMemo(() => {
    if (activeTab === 'workout') {
      if (workoutView === 'builder') return false;
      if (workoutView === 'active') return true;
      if (workoutView === 'summary') return true;
    }
    if (activeTab === 'sprint') {
      return true;
    }
    if (activeTab === 'lab') {
      if (labSubMode === 'flashcards' || labSubMode === 'pairs') return true;
      return false;
    }
    if (activeTab === 'errors') {
      return state.errorBank.length <= 3;
    }
    if (activeTab === 'stats') {
      if (statSubMode === 'cloud') return true;
      if (statSubMode === 'overview') return false;
      if (statSubMode === 'journal') {
        return !state.sessionJournal || state.sessionJournal.length <= 2;
      }
    }
    return false;
  }, [
    activeTab,
    workoutView,
    showSessionErrorsDrawer,
    sessionMistakes.length,
    labSubMode,
    statSubMode,
    state.errorBank.length,
    state.sessionJournal,
  ]);

  const enabledMap = useMemo(
    () => ({ ...createDefaultEnabledTasks(), ...(state.enabledTasks || {}) }),
    [state.enabledTasks]
  );

  // Filtered and balanced pool for Quick Sprint
  const sprintPool = useMemo(() => {
    const filtered =
      sprintFilter === 'all'
        ? bank.sprintQuestions.filter((q) => enabledMap[q.task] !== false)
        : bank.sprintQuestions.filter((q) => q.task === sprintFilter);
    const pool = filtered.length > 0 ? filtered : bank.sprintQuestions;
    return balanceSprintQuestionsList(shuffleArray(pool));
  }, [bank.sprintQuestions, sprintFilter, enabledMap]);

  const currentSprintQuestion =
    sprintPool[sprintCursor % Math.max(1, sprintPool.length)] ||
    bank.sprintQuestions[0];

  // Filtered Flashcards
  const filteredFlashcards = useMemo(() => {
    if (fcFilter === 'all') {
      const activeCards = FLASHCARDS_BANK.filter((fc) => enabledMap[fc.task] !== false);
      return activeCards.length > 0 ? activeCards : FLASHCARDS_BANK;
    }
    return FLASHCARDS_BANK.filter((fc) => fc.task === fcFilter);
  }, [fcFilter, enabledMap]);

  const currentFlashcard =
    filteredFlashcards[fcIndex % Math.max(1, filteredFlashcards.length)] ||
    FLASHCARDS_BANK[0];

  const filteredPairs = useMemo(() => {
    if (pairFilter === 'all') {
      const activePairs = pairDeck.filter((p) => enabledMap[p.task] !== false);
      return activePairs.length > 0 ? activePairs : pairDeck;
    }
    const byTask = pairDeck.filter((p) => p.task === pairFilter);
    return byTask.length > 0 ? byTask : pairDeck;
  }, [pairDeck, pairFilter, enabledMap]);

  const currentPair =
    filteredPairs[pairIndex % Math.max(1, filteredPairs.length)] ||
    HOMOPHONE_PAIRS_BANK[0];

  const currentKimVariant =
    bank.kimVariants[kimVariantIdx % Math.max(1, bank.kimVariants.length)] ||
    bank.kimVariants[0];
  const currentKimTaskQuestion =
    currentKimVariant?.tasks?.[kimActiveTask] ||
    currentKimVariant?.tasks?.['4'] ||
    bank.fipiQuestions[0];

  const handleApplyBalanced30 = useCallback(() => {
    const allEnabled = {} as Record<TaskId, boolean>;
    TASK_IDS.forEach((id) => {
      allEnabled[id] = true;
    });
    setState((prev) => ({
      ...prev,
      enabledTasks: allEnabled,
      quantities: { ...BALANCED_30_QUANTITIES },
      workoutMode: 'fipi',
    }));
  }, []);

  const handleToggleTaskEnabled = (task: TaskId) => {
    setState((prev) => {
      const currEnabled = prev.enabledTasks?.[task] !== false;
      const nextEnabled = !currEnabled;
      const nextQty = nextEnabled
        ? Math.max(1, prev.quantities[task] || 3)
        : 0;
      return {
        ...prev,
        enabledTasks: {
          ...createDefaultEnabledTasks(),
          ...(prev.enabledTasks || {}),
          [task]: nextEnabled,
        },
        quantities: {
          ...prev.quantities,
          [task]: nextQty,
        },
      };
    });
  };

  const handleToggleBlockEnabled = (blockId: TaskBlockId) => {
    const block = TASK_BLOCKS.find((b) => b.id === blockId);
    if (!block) return;
    setState((prev) => {
      const currMap = { ...createDefaultEnabledTasks(), ...(prev.enabledTasks || {}) };
      const allActive = block.tasks.every((t) => currMap[t] !== false);
      const nextVal = !allActive;
      const nextEnabled = { ...currMap };
      const nextQuantities = { ...prev.quantities };
      block.tasks.forEach((t) => {
        nextEnabled[t] = nextVal;
        nextQuantities[t] = nextVal ? Math.max(1, prev.quantities[t] || 3) : 0;
      });
      return {
        ...prev,
        enabledTasks: nextEnabled,
        quantities: nextQuantities,
      };
    });
  };

  const handleSetTaskQty = (task: TaskId, newQty: number) => {
    const clamped = clampTaskQty(newQty);
    setState((prev) => ({
      ...prev,
      enabledTasks: {
        ...createDefaultEnabledTasks(),
        ...(prev.enabledTasks || {}),
        [task]: clamped > 0,
      },
      quantities: {
        ...prev.quantities,
        [task]: clamped,
      },
    }));
  };

  const handleStepTask = (task: TaskId, delta: number) => {
    setState((prev) => {
      const nextQty = stepTaskQty(prev.quantities[task] || 0, delta);
      return {
        ...prev,
        enabledTasks: {
          ...createDefaultEnabledTasks(),
          ...(prev.enabledTasks || {}),
          [task]: nextQty > 0,
        },
        quantities: {
          ...prev.quantities,
          [task]: nextQty,
        },
      };
    });
  };

  const handleApplyPreset = (qtyEach: number) => {
    const clamped = clampTaskQty(qtyEach);
    setState((prev) => {
      const nextEnabled = {} as Record<TaskId, boolean>;
      const nextQuantities = {} as Record<TaskId, number>;
      TASK_IDS.forEach((id) => {
        nextQuantities[id] = clamped;
        nextEnabled[id] = clamped > 0;
      });
      return {
        ...prev,
        enabledTasks: nextEnabled,
        quantities: nextQuantities,
      };
    });
  };

  const handleApplyCustomQuantities = (quantities: Partial<Record<TaskId, number>>) => {
    setState((prev) => {
      const nextEnabled = { ...createDefaultEnabledTasks(), ...(prev.enabledTasks || {}) };
      const nextQuantities = { ...prev.quantities };
      TASK_IDS.forEach((id) => {
        const v = clampTaskQty(quantities[id] ?? 0);
        nextQuantities[id] = v;
        nextEnabled[id] = v > 0;
      });
      return {
        ...prev,
        enabledTasks: nextEnabled,
        quantities: nextQuantities,
      };
    });
  };

  const startSessionWithQueue = (queue: TrainerQuestion[]) => {
    if (queue.length === 0) return;
    setSessionQueue(queue);
    setSessionIndex(0);
    setSessionCorrect(0);
    setSessionWrong(0);
    setSessionMistakes([]);
    setShowSessionErrorsDrawer(false);
    setSessionTaskTallies(createEmptyTaskTallies());
    setActiveTab('workout');
    setWorkoutView('active');
  };

  const handleStartPlannedWorkout = () => {
    const queue = buildWorkoutQueue(state.quantities, state.workoutMode, {
      randomize: true,
      shuffleTasks: state.isShuffled,
      enabledTasks: state.enabledTasks,
    });
    startSessionWithQueue(queue);
  };

  const handleStartWeakestTaskWorkout = (taskId: TaskId) => {
    const customQty = {} as Record<TaskId, number>;
    TASK_IDS.forEach((id) => {
      customQty[id] = id === taskId ? 20 : 0;
    });
    const queue = buildWorkoutQueue(customQty, state.workoutMode, {
      randomize: true,
      shuffleTasks: false,
    });
    startSessionWithQueue(queue);
  };

  const handleStartRealKimWorkout = () => {
    const kimQty = {} as Record<TaskId, number>;
    const allEnabled = {} as Record<TaskId, boolean>;
    TASK_IDS.forEach((id) => {
      kimQty[id] = 1;
      allEnabled[id] = true;
    });
    setState((prev) => ({
      ...prev,
      enabledTasks: allEnabled,
      quantities: kimQty,
      workoutMode: 'fipi',
    }));
    const queue = buildWorkoutQueue(kimQty, 'fipi', {
      randomize: true,
      shuffleTasks: false,
      enabledTasks: allEnabled,
    });
    startSessionWithQueue(queue);
  };

  const handleStartBalanced30Workout = () => {
    handleApplyBalanced30();
    const allEnabled = {} as Record<TaskId, boolean>;
    TASK_IDS.forEach((id) => {
      allEnabled[id] = true;
    });
    const queue = buildWorkoutQueue(BALANCED_30_QUANTITIES, 'fipi', {
      randomize: true,
      shuffleTasks: state.isShuffled,
      enabledTasks: allEnabled,
    });
    startSessionWithQueue(queue);
  };

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('autostart') === 'kim') {
          handleStartRealKimWorkout();
        } else if (params.get('task')) {
          const t = params.get('task') as TaskId;
          if (TASK_IDS.includes(t)) {
            handleStartWeakestTaskWorkout(t);
          }
        }
      }
    } catch {}
  }, []);

  const handleStartFipiTrapsWorkout = () => {
    const freshTraps = balanceSprintQuestionsList(shuffleArray(bank.trapQuestions)).slice(0, 15);
    startSessionWithQueue(freshTraps);
  };

  const handleStartErrorBankWorkout = () => {
    const questionsFromErrors: TrainerQuestion[] = [];
    for (const err of state.errorBank) {
      const q = bank.byId.get(err.questionId);
      if (q) questionsFromErrors.push(q);
    }
    if (questionsFromErrors.length > 0) {
      startSessionWithQueue(questionsFromErrors);
    } else {
      handleStartFipiTrapsWorkout();
    }
  };

  const recordJournalEntry = useCallback((title: string, total: number, correct: number) => {
    if (total <= 0) return;
    const accuracy = calculateAccuracyPercent(correct, total);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setState((prev) => ({
      ...prev,
      sessionsCompleted: prev.sessionsCompleted + 1,
      sessionJournal: [
        {
          id: `sj-${Date.now()}`,
          title,
          total,
          correct,
          accuracy,
          dateLabel: `Сегодня, ${timeStr}`,
        },
        ...(prev.sessionJournal || []),
      ].slice(0, 25),
    }));
  }, []);

  const handleSessionAnswer = useCallback((isCorrect: boolean, userChoiceLabel: string) => {
    const currentQ = sessionQueue[sessionIndex];
    if (!currentQ) return;

    setState((prev) => applyAnswerToState(prev, currentQ, isCorrect, userChoiceLabel, false));

    setSessionTaskTallies((prev) => {
      const t = currentQ.task;
      return {
        ...prev,
        [t]: {
          solved: (prev[t]?.solved || 0) + 1,
          correct: (prev[t]?.correct || 0) + (isCorrect ? 1 : 0),
        },
      };
    });

    const nextCorrect = sessionCorrect + (isCorrect ? 1 : 0);
    const nextWrong = sessionWrong + (isCorrect ? 0 : 1);

    if (isCorrect) {
      setSessionCorrect(nextCorrect);
    } else {
      setSessionWrong(nextWrong);
      setSessionMistakes((prev) => [
        ...prev,
        { question: currentQ, userChoice: userChoiceLabel },
      ]);
    }

    if (sessionIndex + 1 < sessionQueue.length) {
      setSessionIndex((idx) => idx + 1);
    } else {
      recordJournalEntry(
        `Занятие (${sessionQueue.length} зад.)`,
        nextCorrect + nextWrong,
        nextCorrect
      );
      setWorkoutView('summary');
    }
  }, [sessionQueue, sessionIndex, sessionCorrect, sessionWrong, recordJournalEntry]);

  const handleAbortWorkout = () => {
    const totalDone = sessionCorrect + sessionWrong;
    if (totalDone > 0) {
      recordJournalEntry(`Занятие (${totalDone} зад.)`, totalDone, sessionCorrect);
      setWorkoutView('summary');
    } else {
      setWorkoutView('builder');
    }
  };

  const handleSelectSprintMode = (mode: SprintGameMode) => {
    setSprintGameMode(mode);
    if (mode === 'blitz60') {
      setBlitzTimeLeft(60);
      setBlitzScore(0);
      setBlitzFinished(false);
    } else if (mode === 'survival') {
      setSurvivalLives(3);
      setSurvivalScore(0);
      setSurvivalFinished(false);
    }
  };

  const handleRestartArcadeSprint = () => {
    if (sprintGameMode === 'blitz60') {
      setBlitzTimeLeft(60);
      setBlitzScore(0);
      setBlitzFinished(false);
      setSprintCursor((c) => c + 1);
    } else if (sprintGameMode === 'survival') {
      setSurvivalLives(3);
      setSurvivalScore(0);
      setSurvivalFinished(false);
      setSprintCursor((c) => c + 1);
    }
  };

  const handleSprintAnswer = useCallback((isCorrect: boolean, userChoiceLabel: string) => {
    if (sprintGameMode === 'blitz60' && blitzFinished) return;
    if (sprintGameMode === 'survival' && survivalFinished) return;

    let nextBlitzRecord = state.bestBlitz60 || 0;
    let nextSurvivalRecord = state.bestSurvival || 0;

    if (sprintGameMode === 'blitz60') {
      const nextScore = blitzScore + (isCorrect ? 1 : 0);
      setBlitzScore(nextScore);
      if (nextScore > nextBlitzRecord) {
        nextBlitzRecord = nextScore;
      }
    } else if (sprintGameMode === 'survival') {
      if (isCorrect) {
        const nextSurv = survivalScore + 1;
        setSurvivalScore(nextSurv);
        if (nextSurv > nextSurvivalRecord) {
          nextSurvivalRecord = nextSurv;
        }
      } else {
        const nextLives = survivalLives - 1;
        setSurvivalLives(nextLives);
        if (nextLives <= 0) {
          setSurvivalFinished(true);
        }
      }
    }

    setState((prev) => {
      const updated = applyAnswerToState(
        prev,
        currentSprintQuestion,
        isCorrect,
        userChoiceLabel,
        true
      );
      return {
        ...updated,
        bestBlitz60: Math.max(updated.bestBlitz60 || 0, nextBlitzRecord),
        bestSurvival: Math.max(updated.bestSurvival || 0, nextSurvivalRecord),
      };
    });
    setSprintCursor((c) => c + 1);
  }, [
    sprintGameMode,
    blitzFinished,
    survivalFinished,
    state.bestBlitz60,
    state.bestSurvival,
    blitzScore,
    survivalScore,
    survivalLives,
    currentSprintQuestion,
  ]);

  // KIM 4–22 Blank handlers
  const handleSelectKimVariant = (newIdx: number) => {
    const wrapped = (newIdx + bank.kimVariants.length) % bank.kimVariants.length;
    setKimVariantIdx(wrapped);
    setKimActiveTask('4');
    setKimAnswers(createEmptyKimAnswers());
    setKimChecked(false);
  };

  const kimVariantScore = useMemo(() => {
    if (!kimChecked || !currentKimVariant) return null;
    let earned = 0;
    let maxP = 0;
    for (const t of TASK_IDS) {
      const fq = currentKimVariant.tasks?.[t];
      if (!fq) continue;
      const ans = (kimAnswers[t] || '').trim();
      const c = checkFipiQuestionAnswer(fq, ans);
      earned += c.pointsEarned;
      maxP += c.maxPoints;
    }
    return {
      earned,
      maxP,
      percent: calculateAccuracyPercent(earned, Math.max(1, maxP)),
    };
  }, [kimChecked, currentKimVariant, kimAnswers]);

  const handleToggleKimRowDigit = (rowNumber1Based: number) => {
    if (kimChecked) return;
    const digit = String(rowNumber1Based);
    const currentVal = kimAnswers[kimActiveTask] || '';
    // For matching_grid (8, 22), append up to 5 digits in order
    if (kimActiveTask === '8' || kimActiveTask === '22') {
      const nextRaw = currentVal.includes(digit)
        ? currentVal.replace(digit, '')
        : (currentVal + digit).slice(0, 5);
      setKimAnswers((prev) => ({
        ...prev,
        [kimActiveTask]: nextRaw.replace(/[^1-9]/g, ''),
      }));
      return;
    }
    const nextRaw = currentVal.includes(digit)
      ? currentVal.replace(digit, '')
      : currentVal + digit;
    setKimAnswers((prev) => ({
      ...prev,
      [kimActiveTask]: normalizeKimDigits(nextRaw, 9),
    }));
  };

  const handleKimInputDirect = (val: string) => {
    if (kimChecked) return;
    if (['5', '6', '7'].includes(kimActiveTask)) {
      setKimAnswers((prev) => ({
        ...prev,
        [kimActiveTask]: val.replace(/\s+/g, '').toUpperCase(),
      }));
      return;
    }
    if (kimActiveTask === '8' || kimActiveTask === '22') {
      setKimAnswers((prev) => ({
        ...prev,
        [kimActiveTask]: val.replace(/[^1-9]/g, '').slice(0, 5),
      }));
      return;
    }
    setKimAnswers((prev) => ({
      ...prev,
      [kimActiveTask]: normalizeKimDigits(val, 9),
    }));
  };

  const handleCheckKimVariant = () => {
    if (kimChecked) {
      handleSelectKimVariant(kimVariantIdx + 1);
      return;
    }
    setKimChecked(true);
    let variantPrimaryScore = 0;
    let variantMaxScore = 0;

    setState((prev) => {
      let nextState = { ...prev };
      for (const t of TASK_IDS) {
        const fq = currentKimVariant?.tasks?.[t];
        if (!fq) continue;
        const userAns = (kimAnswers[t] || '').trim();
        const check = checkFipiQuestionAnswer(fq, userAns);
        variantPrimaryScore += check.pointsEarned;
        variantMaxScore += check.maxPoints;
        nextState = applyAnswerToState(
          nextState,
          fq,
          check.isCorrect,
          userAns || 'пусто',
          false
        );
      }
      const accuracy = calculateAccuracyPercent(variantPrimaryScore, Math.max(1, variantMaxScore));
      const timeStr = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        ...nextState,
        sessionsCompleted: nextState.sessionsCompleted + 1,
        sessionJournal: [
          {
            id: `sj-kim-${Date.now()}`,
            title: `${currentKimVariant.title} (Задания 4–22)`,
            total: variantMaxScore,
            correct: variantPrimaryScore,
            accuracy,
            dateLabel: `Сегодня, ${timeStr}`,
          },
          ...(nextState.sessionJournal || []),
        ].slice(0, 25),
      };
    });
  };

  const handleConfirmResetStats = () => {
    setState((prev) => ({
      ...createInitialState(),
      darkMode: prev.darkMode,
      profilePin: prev.profilePin,
    }));
    setIsResetOpen(false);
  };

  const modeIndex = 0;
  const sprintModeIndex =
    sprintGameMode === 'endless' ? 0 : sprintGameMode === 'blitz60' ? 1 : 2;
  const labModeIndex =
    labSubMode === 'flashcards' ? 0 : labSubMode === 'pairs' ? 1 : 2;
  const statModeIndex =
    statSubMode === 'overview' ? 0 : statSubMode === 'journal' ? 1 : 2;

  const tabIndex =
    activeTab === 'workout'
      ? 0
      : activeTab === 'sprint'
      ? 1
      : activeTab === 'lab'
      ? 2
      : activeTab === 'errors'
      ? 3
      : 4;

  const sessionTotalAnswered = sessionCorrect + sessionWrong;
  const sessionAccuracy = calculateAccuracyPercent(sessionCorrect, sessionTotalAnswered);
  const globalAccuracy = calculateAccuracyPercent(state.totalCorrect, state.totalSolved);
  const sprintAccuracy = calculateAccuracyPercent(state.sprintCorrect, state.sprintTotal);

  return (
    <>
      {/* SVG Sprite for crisp iOS SF Symbols & Optical Filters */}
      <svg style={{ display: 'none' }} xmlns="http://www.w3.org/2000/svg">
        <symbol id="sf-play-circle-fill" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 14.5v-9l7 4.5-7 4.5z" />
        </symbol>
        <symbol id="sf-bolt-fill" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 2L4.8 13.4h6.3L9.5 22l9.7-11.4h-6.3L13.5 2z" />
        </symbol>
        <symbol id="sf-sparkles" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.5 2L13.8 7.8L19.5 10L13.8 12.2L11.5 18L9.2 12.2L3.5 10L9.2 7.8L11.5 2ZM18.5 15L19.6 17.6L22.2 18.7L19.6 19.8L18.5 22.4L17.4 19.8L14.8 18.7L17.4 17.6L18.5 15Z" />
        </symbol>
        <symbol id="sf-warning-fill" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0v-4a1 1 0 0 1 1-1zm0 9a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 12 18z" />
        </symbol>
        <symbol id="sf-chart-fill" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="13" width="4.2" height="8" rx="1.2" />
          <rect x="9.9" y="8" width="4.2" height="13" rx="1.2" />
          <rect x="16.8" y="3" width="4.2" height="18" rx="1.2" />
        </symbol>
        <symbol id="sf-check-circle-fill" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.7 7.7l-5.4 5.4a1 1 0 0 1-1.4 0l-2.6-2.6a1 1 0 1 1 1.4-1.4l1.9 1.9 4.7-4.7a1 1 0 0 1 1.4 1.4z" />
        </symbol>
        <symbol id="sf-xmark-circle-fill" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm3.7 12.3a1 1 0 0 1-1.4 1.4L12 13.4l-2.3 2.3a1 1 0 0 1-1.4-1.4L10.6 12 8.3 9.7a1 1 0 0 1 1.4-1.4L12 10.6l2.3-2.3a1 1 0 0 1 1.4 1.4L13.4 12l2.3 2.3z" />
        </symbol>
        <symbol id="sf-book-fill" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v18H6.5A2.5 2.5 0 0 0 4 22.5v-18zm16 0A2.5 2.5 0 0 0 17.5 2H13v18h4.5a2.5 2.5 0 0 1 2.5 2.5v-18z" />
        </symbol>
        <symbol id="sf-bookmark-fill" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4V3z" />
        </symbol>
        <symbol id="sf-cloud-fill" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.4 10.2A6.5 6.5 0 0 0 6 9.1 5 5 0 0 0 6.5 19h11.4a4.5 4.5 0 0 0 .5-8.8z" />
        </symbol>
        <symbol id="sf-sliders" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="9" cy="6" r="2.2" fill="currentColor" />
          <circle cx="15" cy="12" r="2.2" fill="currentColor" />
          <circle cx="10" cy="18" r="2.2" fill="currentColor" />
        </symbol>
        <symbol id="sf-moon-fill" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </symbol>
        <symbol id="sf-sun-fill" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="4.5" />
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"
          />
        </symbol>
        <symbol
          id="sf-refresh"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <polyline points="3 3 3 8 8 8" />
        </symbol>
        <symbol
          id="sf-shuffle"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </symbol>
      </svg>

      {/* Top Floating Spatial Liquid Glass Capsule Navbar */}
      <header className="ios-navbar" role="banner">
        <div className="ios-navbar-inner">
          <div className="flex items-center justify-start gap-1.5 min-w-0">
            <button
              id="nav-rules-btn"
              type="button"
              onClick={() => {
                setRulesInitialSection('all');
                setIsRulesOpen(true);
              }}
              className="flex items-center gap-1 text-[12px] font-bold whitespace-nowrap shrink-0 cursor-pointer py-2 px-3 min-h-[36px] rounded-full active:scale-95 transition-transform"
              style={{
                background: 'var(--ios-blue-soft)',
                color: 'var(--ios-blue)',
              }}
              aria-label="Шпаргалка правил ФИПИ"
            >
              <svg className="w-3.5 h-3.5 shrink-0">
                <use href="#sf-book-fill" />
              </svg>
              <span>Шпаргалка</span>
            </button>
            <button
              id="nav-dict-btn"
              type="button"
              onClick={() => setIsDictionaryOpen(true)}
              className="flex items-center gap-1 text-[12px] font-bold px-3 py-2 min-h-[36px] rounded-full whitespace-nowrap shrink-0 cursor-pointer active:scale-95 transition-transform"
              style={{
                background: 'var(--ios-purple-soft)',
                color: 'var(--ios-purple)',
              }}
              aria-label="Словарь исключений и ловушек ФИПИ"
            >
              <span>Словарь</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-1.5 min-w-0">
            <button
              id="nav-sync-btn"
              type="button"
              onClick={() => setIsSyncOpen(true)}
              className="flex items-center gap-1 text-[12px] font-bold px-3 py-2 min-h-[36px] rounded-full whitespace-nowrap shrink-0 cursor-pointer active:scale-95 transition-transform"
              style={{ background: 'var(--ios-blue-soft)', color: 'var(--ios-blue)' }}
              aria-label="Память и сохранение"
            >
              <svg className="w-3.5 h-3.5 shrink-0">
                <use href="#sf-cloud-fill" />
              </svg>
              <span id="nav-sync-label" className="text-[11.5px] font-bold max-w-[76px] truncate">
                {state.profilePin ? state.profilePin : 'Память'}
              </span>
            </button>
            <button
              id="nav-appearance-btn"
              type="button"
              onClick={() => setIsAppearanceOpen(true)}
              className="flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] rounded-full shrink-0 cursor-pointer active:scale-95 transition-transform"
              style={{ background: 'var(--ios-bg-tertiary)', color: 'var(--ios-blue)' }}
              aria-label="Настройки Liquid Glass и темы"
            >
              <svg className="w-4 h-4 shrink-0">
                <use href={state.darkMode ? '#sf-sun-fill' : '#sf-moon-fill'} />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport Scroll Container */}
      <div id="app-scroll-container" className={`ios-viewport-scroll ${isScrollLocked ? 'ios-scroll-locked' : ''}`}>
        <main className={`max-w-[600px] mx-auto px-3.5 pt-0.5 relative overflow-x-hidden ${isScrollLocked ? 'h-full min-h-0' : 'min-h-full'} flex flex-col w-full flex-grow flex-shrink-0`}>
          <AnimatePresence initial={false} custom={tabDirection} mode="popLayout">
            {/* ======================================================================
                TAB 1: WORKOUT BUILDER, ACTIVE WORKOUT & POST-SESSION SUMMARY
               ====================================================================== */}
            {activeTab === 'workout' && (
              <motion.section
                key="tab-workout"
                id="screen-workout"
                aria-label="Конструктор занятия"
                className="min-h-full flex-1 flex flex-col w-full"
                custom={tabDirection}
                variants={iosScreenSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <AnimatePresence
                  initial={false}
                  custom={workoutDirection}
                  mode="popLayout"
                >
                  {workoutView === 'builder' && (
                    <motion.div
                      key="workout-builder"
                      id="workout-builder-view"
                      className="ios-screen-stack is-scrollable"
                      custom={workoutDirection}
                      variants={iosScreenSlideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                    >
                  <div>
                    {/* Clean Header with 1-tap Presets Trigger */}
                    <div className="flex items-center justify-between gap-1.5 mt-0.5 mb-2.5 min-w-0">
                      <h1 className="ios-large-title !m-0">Новое занятие</h1>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          id="open-presets-modal-btn"
                          onClick={() => setIsPresetsOpen(true)}
                          className="liquid-pill-btn flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full text-[11.5px] font-bold cursor-pointer shrink-0"
                          aria-label="Шаблоны тренировок"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0">
                            <use href="#sf-sliders" />
                          </svg>
                          <span>Шаблоны</span>
                        </button>
                      </div>
                    </div>

                    <div
                      className="px-1 mb-2 text-[11px] flex items-center justify-between"
                      style={{ color: 'var(--ios-label-sec)' }}
                    >
                      <span>Настройте количество заданий каждого типа (4–22):</span>
                      <span className="font-semibold" style={{ color: 'var(--ios-blue)' }}>
                        {totalPlanned > 0 ? `Выбрано: ${totalPlanned}` : 'Не выбрано'}
                      </span>
                    </div>

                    {/* Shuffle Order Switch (Вразброс / По порядку) */}
                    <div className="ios-inset-group !mb-3">
                      <div
                        id="shuffle-toggle-row"
                        className="ios-cell cursor-pointer select-none"
                        onClick={() =>
                          setState((prev) => ({ ...prev, isShuffled: !prev.isShuffled }))
                        }
                        role="switch"
                        aria-checked={state.isShuffled}
                        aria-label="Вразброс: перемешать задания"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setState((prev) => ({ ...prev, isShuffled: !prev.isShuffled }));
                          }
                        }}
                      >
                        <div
                          className="ios-row-icon shrink-0 transition-colors duration-200"
                          style={{
                            background: state.isShuffled
                              ? 'linear-gradient(135deg, #0A84FF, #007AFF)'
                              : 'var(--ios-fill-tertiary)',
                            color: state.isShuffled ? '#FFFFFF' : 'var(--ios-label-sec)',
                          }}
                        >
                          <svg className="w-4 h-4 shrink-0">
                            <use href="#sf-shuffle" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-[13.5px] font-bold tracking-[-0.2px] leading-tight text-[var(--ios-label)]">
                            Вразброс
                          </div>
                          <div
                            className="text-[11px] leading-tight truncate mt-0.5"
                            style={{ color: 'var(--ios-label-sec)' }}
                          >
                            {state.isShuffled
                              ? 'Случайный порядок (разные задания чередуются)'
                              : 'По порядку (сначала 9, затем 10, 11...)'}
                          </div>
                        </div>
                        <div
                          id="shuffle-switch-btn"
                          className={`ios-switch shrink-0 ${state.isShuffled ? 'is-active' : ''}`}
                          aria-hidden="true"
                        >
                          <div className="ios-switch-knob" />
                        </div>
                      </div>
                    </div>

                    {/* Tasks 4–22 Grouped by Official FIPI Blocks + iOS Switches */}
                    {TASK_BLOCKS.map((block) => {
                      const isBlockEnabled = block.tasks.every((t) => enabledMap[t] !== false);
                      const isBlockCollapsed = collapsedBlocks[block.id];
                      const activeCountInBlock = block.tasks.filter((t) => enabledMap[t] !== false).length;

                      return (
                        <div key={block.id} className="mb-3">
                          <div className="flex items-center justify-between gap-2 px-1 mb-1 min-w-0">
                            <button
                              type="button"
                              aria-expanded={!isBlockCollapsed}
                              aria-label={`${block.title} (${block.badge}), ${activeCountInBlock} из ${block.tasks.length} заданий выбрано. Нажмите чтобы ${isBlockCollapsed ? 'развернуть' : 'свернуть'}`}
                              onClick={() =>
                                setCollapsedBlocks((prev) => ({
                                  ...prev,
                                  [block.id]: !prev[block.id],
                                }))
                              }
                              className="flex items-center gap-1.5 text-left cursor-pointer min-w-0 flex-1 overflow-hidden py-1.5 min-h-[36px]"
                            >
                              <span className="ios-section-header !m-0 !p-0 truncate min-w-0">
                                {block.title} ({block.badge})
                              </span>
                              <span
                                className="text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0"
                                style={{
                                  background: 'var(--ios-bg-tertiary)',
                                  color: 'var(--ios-label-sec)',
                                }}
                              >
                                {activeCountInBlock}/{block.tasks.length}
                              </span>
                              <svg
                                className={`w-3.5 h-3.5 shrink-0 ios-accordion-arrow ${
                                  isBlockCollapsed ? 'rotated' : ''
                                }`}
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

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className="text-[10.5px] font-bold"
                                style={{ color: 'var(--ios-label-sec)' }}
                              >
                                Блок
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isBlockEnabled}
                                aria-label={`Включить или выключить блок ${block.title}`}
                                onClick={() => handleToggleBlockEnabled(block.id)}
                                className={`ios-switch shrink-0 ${isBlockEnabled ? 'is-active' : ''}`}
                              >
                                <div className="ios-switch-knob" />
                              </button>
                            </div>
                          </div>

                          {!isBlockCollapsed && (
                            <div className="ios-inset-group !mb-0">
                              {block.tasks.map((taskId) => {
                                const meta = TASK_META[taskId];
                                const isTaskEnabled = enabledMap[taskId] !== false;
                                const qty = isTaskEnabled ? state.quantities[taskId] || 0 : 0;
                                return (
                                  <div
                                    key={taskId}
                                    onClick={() => handleToggleTaskEnabled(taskId)}
                                    className={`ios-cell cursor-pointer select-none transition-opacity ${
                                      !isTaskEnabled ? 'opacity-55' : ''
                                    }`}
                                  >
                                    <div
                                      className="ios-row-icon shrink-0"
                                      style={{ background: meta.gradient }}
                                    >
                                      {taskId}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-1.5">
                                      <div className="text-[13px] font-bold tracking-[-0.25px] leading-tight whitespace-nowrap truncate">
                                        {meta.title}
                                      </div>
                                      <div
                                        className="text-[11px] leading-tight truncate mt-0.5"
                                        style={{ color: 'var(--ios-label-sec)' }}
                                      >
                                        {meta.subtitle}
                                      </div>
                                    </div>

                                    {/* Per-Task iOS Switch */}
                                    <button
                                      id={`task-switch-${taskId}`}
                                      type="button"
                                      role="switch"
                                      aria-checked={isTaskEnabled}
                                      aria-label={`Переключатель задания ${taskId}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleTaskEnabled(taskId);
                                      }}
                                      className={`ios-switch shrink-0 ${
                                        isTaskEnabled ? 'is-active' : ''
                                      }`}
                                    >
                                      <div className="ios-switch-knob" />
                                    </button>

                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1.5 shrink-0"
                                    >
                                      <input
                                        id={`qty-badge-${taskId}`}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={4}
                                        value={qty}
                                        onChange={(e) => {
                                          const cleaned = e.target.value.replace(/[^0-9]/g, '');
                                          handleSetTaskQty(
                                            taskId,
                                            cleaned === '' ? 0 : Number(cleaned)
                                          );
                                        }}
                                        onBlur={resetViewportOnBlur}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            (e.target as HTMLInputElement).blur();
                                          }
                                        }}
                                        className={`ios-count-badge ${qty > 0 ? 'has-value' : ''}`}
                                        aria-label={`Количество заданий ${taskId}`}
                                      />
                                      <div className="ios-stepper">
                                        <button
                                          type="button"
                                          className="ios-stepper-btn"
                                          disabled={qty <= 0}
                                          onClick={() => handleStepTask(taskId, -1)}
                                          aria-label={`Уменьшить задание ${taskId}`}
                                        >
                                          −
                                        </button>
                                        <div className="ios-stepper-divider" />
                                        <button
                                          type="button"
                                          className="ios-stepper-btn"
                                          disabled={qty >= 1000}
                                          onClick={() => handleStepTask(taskId, 1)}
                                          aria-label={`Увеличить задание ${taskId}`}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Ergonomic Action Bar: Primary Start CTA Positioned Comfortably Above TabBar */}
                  <div className="mt-auto pt-2 pb-1">
                    <button
                      type="button"
                      id="start-workout-btn"
                      disabled={totalPlanned <= 0}
                      onClick={handleStartPlannedWorkout}
                      className="ios-btn-primary"
                    >
                      <svg className="w-5 h-5 shrink-0">
                        <use href="#sf-play-circle-fill" />
                      </svg>
                      <span id="start-workout-label">
                        {totalPlanned > 0
                          ? `Начать занятие (${totalPlanned} заданий)`
                          : 'Выберите хотя бы 1 задание'}
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}

              {workoutView === 'active' && sessionQueue[sessionIndex] && (
                <motion.div
                  key="workout-active"
                  id="workout-active-view"
                  className="ios-screen-stack"
                  custom={workoutDirection}
                  variants={iosScreenSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <div className="ios-inset-group px-3 py-1.5 !mb-0 shrink-0">
                    <div className="flex items-center justify-between gap-1.5 mb-1 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap shrink-0">
                        <span style={{ color: 'var(--ios-blue)' }} className="font-extrabold">
                          Задание {sessionQueue[sessionIndex].task}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span style={{ color: 'var(--ios-label-sec)' }} className="font-bold">
                          {sessionIndex + 1} из {sessionQueue.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          id="open-rule-inspector-btn"
                          onClick={() => openRuleInspector(sessionQueue[sessionIndex], null)}
                          className="text-[10.5px] font-bold px-2 py-0.5 rounded-full cursor-pointer whitespace-nowrap shrink-0"
                          style={{
                            background: 'var(--ios-blue-soft)',
                            color: 'var(--ios-blue)',
                          }}
                        >
                          Правило ?
                        </button>
                        <button
                          type="button"
                          id="abort-workout-btn"
                          onClick={handleAbortWorkout}
                          className="text-[10.5px] font-bold px-2 py-0.5 rounded-full cursor-pointer whitespace-nowrap shrink-0"
                          style={{
                            background: 'var(--ios-red-soft)',
                            color: 'var(--ios-red)',
                          }}
                        >
                          Завершить
                        </button>
                      </div>
                    </div>

                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden mb-1.5"
                      style={{ background: 'var(--ios-bg-tertiary)' }}
                    >
                      <div
                        id="session-progress-fill"
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(
                            6,
                            Math.round(((sessionIndex + 1) / sessionQueue.length) * 100)
                          )}%`,
                          background: 'var(--ios-blue)',
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div id="live-correct-pill" className="score-pill-correct flex-1 justify-center py-1 text-[11px]">
                        <svg className="w-3.5 h-3.5 shrink-0">
                          <use href="#sf-check-circle-fill" />
                        </svg>
                        <span>
                          Верно: <strong id="live-correct-val">{sessionCorrect}</strong>
                        </span>
                      </div>
                      <div id="live-wrong-pill" className="score-pill-wrong flex-1 justify-center py-1 text-[11px]">
                        <svg className="w-3.5 h-3.5 shrink-0">
                          <use href="#sf-xmark-circle-fill" />
                        </svg>
                        <span>
                          Ошибок: <strong id="live-wrong-val">{sessionWrong}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    key={
                      sessionQueue[sessionIndex]?.instanceId ||
                      `${sessionIndex}-${sessionQueue[sessionIndex]?.id}`
                    }
                    id="session-question-card"
                    className="ios-inset-group px-3 py-2 sm:px-3.5 sm:py-2.5 !mb-0 flex-1 min-h-0 flex flex-col justify-between ios-subview-animate"
                  >
                    <QuestionCardView
                      key={
                        sessionQueue[sessionIndex]?.instanceId ||
                        `${sessionIndex}-${sessionQueue[sessionIndex]?.id}`
                      }
                      question={sessionQueue[sessionIndex]}
                      onAnswer={handleSessionAnswer}
                    />
                  </div>
                </motion.div>
              )}

              {workoutView === 'summary' && (
                <motion.div
                  key="workout-summary"
                  id="workout-summary-view"
                  className="ios-screen-stack w-full h-full min-h-0 flex flex-col justify-between"
                  custom={workoutDirection}
                  variants={iosScreenSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  {/* Top scrollable area for result stats and mistake reviews */}
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col pr-0.5 ios-touch-scroll">
                    <div className="ios-inset-group p-2.5 py-2 text-center !mb-1 shrink-0">
                      <div
                        id="summary-percent-badge"
                        className="text-[28px] font-black leading-none mb-0.5"
                        style={{
                          color:
                            sessionAccuracy >= 80
                              ? 'var(--ios-green)'
                              : sessionAccuracy >= 50
                              ? 'var(--ios-orange)'
                              : 'var(--ios-red)',
                        }}
                      >
                        {sessionAccuracy}%
                      </div>
                      <h2
                        id="summary-headline"
                        className="text-[17px] font-extrabold tracking-tight leading-tight mb-0.5"
                      >
                        {sessionAccuracy >= 85
                          ? 'Отличный результат!'
                          : sessionAccuracy >= 60
                          ? 'Хорошая тренировка!'
                          : 'Есть над чем поработать'}
                      </h2>
                      <p
                        id="summary-subline"
                        className="text-[11.5px] font-medium leading-tight mb-1.5"
                        style={{ color: 'var(--ios-label-sec)' }}
                      >
                        Выполнено: {sessionTotalAnswered} · Правильных: {sessionCorrect} · Ошибок:{' '}
                        {sessionWrong}
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <div
                          className="py-1.5 px-3 rounded-xl flex flex-col items-center justify-center"
                          style={{
                            background: 'var(--ios-green-soft)',
                            color: 'var(--ios-green)',
                          }}
                        >
                          <div className="text-[18px] font-black leading-none">{sessionCorrect}</div>
                          <div className="text-[10.5px] font-bold mt-0.5">Правильно</div>
                        </div>
                        <div
                          className="py-1.5 px-3 rounded-xl flex flex-col items-center justify-center"
                          style={{
                            background: 'var(--ios-red-soft)',
                            color: 'var(--ios-red)',
                          }}
                        >
                          <div className="text-[18px] font-black leading-none">{sessionWrong}</div>
                          <div className="text-[10.5px] font-bold mt-0.5">Ошибок</div>
                        </div>
                      </div>
                    </div>

                    <div className="ios-section-header !mt-0.5 !mb-1 text-[10.5px] font-bold uppercase tracking-wider shrink-0">
                      Точность по заданиям в занятии
                    </div>

                    <div className="ios-inset-group !mb-1.5 shrink-0">
                      {TASK_IDS.map((taskId) => {
                        const tally = sessionTaskTallies[taskId] || { solved: 0, correct: 0 };
                        if (tally.solved === 0) return null;
                        const acc = calculateAccuracyPercent(tally.correct, tally.solved);
                        return (
                          <div key={taskId} className="ios-cell !py-1 !min-h-[32px]">
                            <div
                              className="ios-row-icon !w-5 !h-5 !rounded-md !text-[10px] !font-black"
                              style={{ background: TASK_META[taskId].gradient }}
                            >
                              {taskId}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="text-[12.5px] font-bold truncate leading-tight">
                                {TASK_META[taskId].title}
                              </div>
                              <div
                                className="text-[10px] leading-tight"
                                style={{ color: 'var(--ios-label-sec)' }}
                              >
                                Верно {tally.correct} из {tally.solved}
                              </div>
                            </div>
                            <div
                              className="text-[13px] font-extrabold shrink-0"
                              style={{
                                color:
                                  acc >= 80
                                    ? 'var(--ios-green)'
                                    : acc >= 50
                                    ? 'var(--ios-orange)'
                                    : 'var(--ios-red)',
                              }}
                            >
                              {acc}%
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {sessionMistakes.length > 0 && (
                      <div className="mt-1 mb-1.5 shrink-0">
                        <button
                          type="button"
                          id="toggle-session-mistakes-drawer-btn"
                          onClick={() => setShowSessionErrorsDrawer((v) => !v)}
                          className="ios-btn-primary"
                          style={{ background: 'var(--ios-orange)' }}
                        >
                          <svg className="w-5 h-5 shrink-0">
                            <use href="#sf-warning-fill" />
                          </svg>
                          <span>
                            {showSessionErrorsDrawer
                              ? 'Скрыть разбор ошибок'
                              : `Ошибки (${sessionMistakes.length}) — открыть разбор`}
                          </span>
                        </button>
                      </div>
                    )}

                    <div className={`ios-accordion-grid ${showSessionErrorsDrawer && sessionMistakes.length > 0 ? 'open' : ''} mb-2`}>
                      <div className="ios-accordion-content">
                        <div className="flex items-center justify-between mb-2">
                          <div className="ios-section-header !mb-0">Подробный разбор допущенных ошибок</div>
                          <button
                            type="button"
                            id="toggle-all-mistakes-btn"
                            onClick={() => setAllMistakesCollapsed((c) => !c)}
                            className="liquid-pill-btn text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                            style={{
                              background: allMistakesCollapsed ? 'var(--ios-blue-soft)' : undefined,
                              color: allMistakesCollapsed ? 'var(--ios-blue)' : undefined,
                            }}
                          >
                            <span>{allMistakesCollapsed ? 'Развернуть все' : 'Свернуть все'}</span>
                            <svg
                              className={`w-3.5 h-3.5 ios-accordion-arrow ${allMistakesCollapsed ? 'rotated' : ''}`}
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
                        <div className="flex flex-col gap-2.5">
                          {sessionMistakes.map((m, idx) => {
                            const q = m.question;
                            const isOrthoSprint = ['9', '10', '11', '12', '13', '14', '15'].includes(q.task);
                            const wordTitle =
                              q.kind === 'sprint'
                                ? !isOrthoSprint
                                  ? ['4', '5', '6', '7'].includes(q.task)
                                    ? q.answer
                                    : q.suffix || q.context || q.answer
                                  : q.task === '13'
                                  ? `${q.prefix.replace(/[()]/g, '')}${
                                      q.answer === 'СЛИТНО' ? '' : ' '
                                    }${q.suffix}`
                                  : q.task === '14'
                                  ? formatTask14SolvedWord(q.prefix, q.suffix, q.answer)
                                  : `${q.prefix}${q.answer.toLowerCase()}${q.suffix}`
                                : `Задание № ${q.task} · ФИПИ`;
                            const correctChoice =
                              q.kind === 'sprint' ? q.answer : q.correctIndices.join('');
                            const explanation =
                              q.kind === 'sprint'
                                ? q.explanation
                                : q.rows
                                    .map((r, rIdx) =>
                                       r.isCorrectRow
                                         ? `Строка ${rIdx + 1} (${r.letter}): ${r.solvedWords.join(', ')}`
                                         : null
                                     )
                                    .filter(Boolean)
                                    .join(' | ');
                            return (
                              <StructuredErrorCard
                                key={`${q.id}-${idx}`}
                                forceCollapsed={allMistakesCollapsed}
                                task={q.task}
                                topic={q.topic}
                                wordTitle={wordTitle}
                                context={q.kind === 'sprint' ? q.context : undefined}
                                userChoice={m.userChoice}
                                correctChoice={correctChoice}
                                explanation={explanation}
                                rule={q.rule}
                                question={q}
                                onInspectRule={() => {
                                  openRuleInspector(q, {
                                    id: `err-${q.id}`,
                                    task: q.task,
                                    topic: q.topic,
                                    wordDisplay: q.kind === 'sprint' ? (!isOrthoSprint ? wordTitle : `${q.prefix}..${q.suffix}`) : wordTitle,
                                    correctWord: wordTitle,
                                    userChoice: m.userChoice,
                                    correctChoice: correctChoice,
                                    context: q.kind === 'sprint' ? q.context : undefined,
                                    explanation: explanation,
                                    rule: q.rule,
                                    timestamp: Date.now(),
                                    questionId: q.id,
                                  });
                                }}
                                staggerIndex={idx}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pinned Bottom Deck: Always sitting right above the bottom menu, no scrolling past it */}
                  <div className="shrink-0 flex flex-col gap-1.5 pt-2 pb-1">
                    {sessionMistakes.length > 0 && (
                      <button
                        type="button"
                        id="summary-retry-mistakes-btn"
                        onClick={() =>
                          startSessionWithQueue(sessionMistakes.map((m) => m.question))
                        }
                        className="ios-btn-primary"
                        style={{ background: 'var(--ios-indigo)' }}
                      >
                        <svg className="w-5 h-5 shrink-0">
                          <use href="#sf-refresh" />
                        </svg>
                        <span>Отработать ошибки этого занятия</span>
                      </button>
                    )}

                    <button
                      type="button"
                      id="summary-repeat-random-btn"
                      onClick={handleStartPlannedWorkout}
                      className="ios-btn-primary"
                    >
                      <svg className="w-5 h-5 shrink-0">
                        <use href="#sf-sparkles" />
                      </svg>
                      <span>Новый случайный вариант ({totalPlanned} зад.)</span>
                    </button>

                    <button
                      type="button"
                      id="back-to-builder-btn"
                      onClick={() => setWorkoutView('builder')}
                      className="ios-btn-glass-secondary"
                    >
                      <span>Настроить конструктор</span>
                    </button>
                  </div>
                </motion.div>
              )}
                </AnimatePresence>
              </motion.section>
            )}

            {/* ======================================================================
                TAB 2: QUICK SPRINT & ARCADE MODES (БЕСКОНЕЧНЫЙ / БЛИЦ 60С / 3 ЖИЗНИ)
               ====================================================================== */}
            {activeTab === 'sprint' && (
              <motion.section
                key="tab-sprint"
                id="screen-sprint"
                aria-label="Быстрый спринт"
                className="min-h-full flex-1 flex flex-col w-full"
                custom={tabDirection}
                variants={iosScreenSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="ios-screen-stack">
                <div>
                  <div className="flex items-center justify-between gap-1.5 mt-0.5 mb-2 min-w-0 whitespace-nowrap">
                    <h1 className="ios-large-title !m-0">Спринт</h1>
                    <div className="flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0">
                      {sprintGameMode === 'blitz60' && (
                        <span
                          id="sprint-timer-pill"
                          className="px-2 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap shrink-0"
                          style={{
                            background: 'var(--ios-blue-soft)',
                            color: 'var(--ios-blue)',
                          }}
                        >
                          00:{String(blitzTimeLeft).padStart(2, '0')} · {blitzScore}
                        </span>
                      )}
                      {sprintGameMode === 'survival' && (
                        <span
                          id="sprint-lives-pill"
                          className="px-2 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap shrink-0"
                          style={{
                            background: 'var(--ios-red-soft)',
                            color: 'var(--ios-red)',
                          }}
                        >
                          {'♥'.repeat(Math.max(0, survivalLives))}
                          {'♡'.repeat(Math.max(0, 3 - survivalLives))} · {survivalScore}
                        </span>
                      )}
                      <span
                        id="sprint-streak-pill"
                        className="px-2 py-1 rounded-full whitespace-nowrap shrink-0"
                        style={{
                          background: 'var(--ios-orange-soft)',
                          color: 'var(--ios-orange)',
                        }}
                      >
                        Серия: {state.sprintStreak}
                      </span>
                      <button
                        type="button"
                        id="sprint-rule-btn"
                        onClick={() => openRuleInspector(currentSprintQuestion, null)}
                        className="liquid-pill-btn px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Правило ?
                      </button>
                    </div>
                  </div>

                  {/* Arcade Sprint Mode Segmented Control (Draggable Apple Liquid Glass) */}
                  <div className="mb-2">
                    <LiquidGlassSegmented
                      id="sprint-mode-segmented"
                      ariaLabel="Режим спринта"
                      value={sprintGameMode}
                      onChange={handleSelectSprintMode}
                      options={[
                        { key: 'endless', label: 'Бесконечный' },
                        { key: 'blitz60', label: 'Блиц 60с' },
                        { key: 'survival', label: '3 жизни' },
                      ]}
                    />
                  </div>

                  <div
                    id="sprint-task-filter-segmented"
                    role="tablist"
                    aria-label="Фильтр спринта по заданиям"
                    className="mb-1 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={sprintFilter === 'all'}
                      onClick={() => setSprintFilter('all')}
                      className="px-3 py-1 rounded-full text-[11.5px] font-extrabold shrink-0 cursor-pointer transition-all"
                      style={{
                        background:
                          sprintFilter === 'all' ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
                        color: sprintFilter === 'all' ? '#FFFFFF' : 'var(--ios-label-sec)',
                      }}
                    >
                      Все активные
                    </button>
                    {TASK_IDS.map((tId) => {
                      const isActive = enabledMap[tId] !== false;
                      return (
                        <button
                          key={tId}
                          type="button"
                          role="tab"
                          aria-selected={sprintFilter === tId}
                          onClick={() => setSprintFilter(tId)}
                          className={`px-2.5 py-1 rounded-full text-[11.5px] font-extrabold shrink-0 cursor-pointer transition-all ${
                            !isActive && sprintFilter !== tId ? 'opacity-50' : ''
                          }`}
                          style={{
                            background:
                              sprintFilter === tId ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
                            color: sprintFilter === tId ? '#FFFFFF' : 'var(--ios-label-sec)',
                          }}
                        >
                          № {tId}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Either Active Question Card or Arcade Game Over Screen */}
                {(sprintGameMode === 'blitz60' && blitzFinished) ||
                (sprintGameMode === 'survival' && survivalFinished) ? (
                  <div className="ios-inset-group p-6 !mb-0 flex-1 flex flex-col items-center justify-center text-center">
                    <div
                      className="text-[40px] font-extrabold mb-1"
                      style={{ color: 'var(--ios-blue)' }}
                    >
                      {sprintGameMode === 'blitz60' ? blitzScore : survivalScore}
                    </div>
                    <h2 className="text-[21px] font-extrabold mb-1">
                      {sprintGameMode === 'blitz60'
                        ? 'Время вышло! Блиц 60с завершён'
                        : 'Жизни закончились! Режим «3 жизни»'}
                    </h2>
                    <p
                      className="text-[13px] mb-5"
                      style={{ color: 'var(--ios-label-sec)' }}
                    >
                      {sprintGameMode === 'blitz60'
                        ? `Ваш результат: ${blitzScore} верных · Рекорд: ${state.bestBlitz60}`
                        : `Ваш результат: ${survivalScore} подряд · Рекорд: ${state.bestSurvival}`}
                    </p>
                    <button
                      type="button"
                      onClick={handleRestartArcadeSprint}
                      className="ios-btn-primary max-w-[280px]"
                    >
                      <svg className="w-5 h-5 shrink-0">
                        <use href="#sf-refresh" />
                      </svg>
                      <span>Сыграть ещё раз</span>
                    </button>
                  </div>
                ) : (
                  <div
                    id="quick-sprint-host"
                    className="ios-inset-group p-4 !mb-0 flex-1 flex flex-col justify-between"
                  >
                    <QuestionCardView
                      question={currentSprintQuestion}
                      onAnswer={handleSprintAnswer}
                    />
                  </div>
                )}
              </div>
              </motion.section>
            )}

            {/* ======================================================================
                TAB 3: LAB 4–22 (3D FLASHCARDS, HOMOPHONE PAIRS & KIM 4–22 SIMULATOR)
               ====================================================================== */}
            {activeTab === 'lab' && (
              <motion.section
                key="tab-lab"
                id="screen-lab"
                aria-label="Лаборатория 4–22"
                className="min-h-full flex-1 flex flex-col w-full"
                custom={tabDirection}
                variants={iosScreenSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="ios-screen-stack !justify-start">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mt-0.5 mb-1.5 min-w-0 whitespace-nowrap">
                      <h1 className="ios-large-title !m-0">Лаборатория 4–22</h1>
                      <button
                        type="button"
                        id="lab-traps-dict-btn"
                        onClick={() => setIsDictionaryOpen(true)}
                        className="liquid-pill-btn px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Словарь ловушек
                      </button>
                    </div>

                    {/* Lab Mode Segmented Control (Draggable Apple Liquid Glass) */}
                    <div className="mb-1.5">
                      <LiquidGlassSegmented
                        id="lab-mode-segmented"
                        ariaLabel="Режим лаборатории"
                        value={labSubMode}
                        onChange={setLabSubMode}
                        options={[
                          { key: 'flashcards', label: 'Карточки' },
                          { key: 'pairs', label: 'Омофоны' },
                          { key: 'kim', label: 'КИМ 4–22' },
                        ]}
                      />
                    </div>
                  </div>

                  <AnimatePresence
                    initial={false}
                    custom={labDirection}
                    mode="popLayout"
                  >
                    {/* SUB-VIEW A: QUIZLET-STYLE 3D FLASHCARD STACK (NO BOTTOM BUTTONS) */}
                    {labSubMode === 'flashcards' && (
                      <motion.div
                        key="lab-flashcards"
                        className="flex-1 flex flex-col"
                        custom={labDirection}
                        variants={iosScreenSlideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                      >
                        <QuizletFlashcardDeck
                          cards={filteredFlashcards}
                          filterTask={fcFilter}
                          onChangeFilterTask={setFcFilter}
                        />
                      </motion.div>
                    )}

                    {/* SUB-VIEW B: HOMOPHONE PAIRS DUEL */}
                    {labSubMode === 'pairs' && (
                      <motion.div
                        key="lab-pairs"
                        id="lab-pairs-view"
                        className="ios-inset-group p-4 !mb-0 flex-1 flex flex-col justify-between"
                        custom={labDirection}
                        variants={iosScreenSlideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                      >
                    <div className="mb-1 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      <button
                        type="button"
                        onClick={() => {
                          setPairFilter('all');
                          setPairIndex(0);
                        }}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 cursor-pointer"
                        style={{
                          background:
                            pairFilter === 'all' ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
                          color: pairFilter === 'all' ? '#FFFFFF' : 'var(--ios-label-sec)',
                        }}
                      >
                        Все активные
                      </button>
                      {TASK_IDS.map((tId) => (
                        <button
                          key={tId}
                          type="button"
                          onClick={() => {
                            setPairFilter(tId);
                            setPairIndex(0);
                          }}
                          className="px-2 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 cursor-pointer"
                          style={{
                            background:
                              pairFilter === tId ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
                            color: pairFilter === tId ? '#FFFFFF' : 'var(--ios-label-sec)',
                          }}
                        >
                          № {tId}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2 whitespace-nowrap">
                      <span
                        className="text-[11.5px] font-bold px-2.5 py-1 rounded-full truncate"
                        style={{
                          background: 'var(--ios-purple-soft)',
                          color: 'var(--ios-purple)',
                        }}
                      >
                        № {currentPair.task} · {currentPair.topic}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: 'var(--ios-label-sec)' }}
                        >
                          {(pairIndex % filteredPairs.length) + 1}/
                          {filteredPairs.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const sampleForTask = bank.sprintQuestions.find(
                              (q) => q.task === currentPair.task
                            );
                            if (sampleForTask) openRuleInspector(sampleForTask, null);
                          }}
                          className="liquid-pill-btn text-[11px] font-bold px-2 py-0.5 rounded-full cursor-pointer shrink-0"
                        >
                          Правило ?
                        </button>
                      </div>
                    </div>

                    <div
                      key={pairIndex}
                      className="my-auto py-2 flex flex-col gap-2 word-stage-animate"
                    >
                      <div
                        className="text-[12px] font-bold text-center whitespace-nowrap"
                        style={{ color: 'var(--ios-label-sec)' }}
                      >
                        {currentPair.task === '13'
                          ? 'Выберите слитное или раздельное написание:'
                          : 'Выберите пару букв по смыслу в скобках:'}
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div
                          className="p-3 rounded-2xl"
                          style={{
                            background: 'var(--ios-bg-secondary)',
                            border: '0.5px solid var(--ios-separator)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <div
                              className="text-[10.5px] font-bold uppercase"
                              style={{ color: 'var(--ios-blue)' }}
                            >
                              1-е словосочетание
                            </div>
                            {pairSelectedOption && (
                              <span
                                className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-md"
                                style={{
                                  background: 'var(--ios-green-soft)',
                                  color: 'var(--ios-green)',
                                }}
                              >
                                {currentPair.leftAns === 'СЛИТНО' ||
                                currentPair.leftAns === 'РАЗДЕЛЬНО' ||
                                currentPair.leftAns === 'ДЕФИСНО'
                                  ? currentPair.leftAns
                                  : `Буква ${currentPair.leftAns}`}
                              </span>
                            )}
                          </div>
                          <div className="text-[18px] font-extrabold leading-tight">
                            {pairSelectedOption
                              ? currentPair.leftWordGap.includes('..')
                                ? currentPair.leftWordGap.replace(
                                    '..',
                                    currentPair.leftAns
                                  )
                                : currentPair.leftAns === 'СЛИТНО'
                                ? currentPair.leftWordGap.replace(
                                    /\(([^)]+)\)\s*/g,
                                    '$1'
                                  )
                                : currentPair.leftAns === 'ДЕФИСНО'
                                ? currentPair.leftWordGap.replace(
                                    /\(([^)]+)\)\s*/g,
                                    '$1-'
                                  )
                                : currentPair.leftWordGap.replace(
                                    /\(([^)]+)\)\s*/g,
                                    '$1 '
                                  )
                              : currentPair.leftWordGap}
                          </div>
                          <div
                            className="text-[13px] font-semibold mt-0.5 leading-snug"
                            style={{ color: 'var(--ios-label-sec)' }}
                          >
                            {currentPair.leftContext}
                          </div>
                        </div>

                        <div
                          className="p-3 rounded-2xl"
                          style={{
                            background: 'var(--ios-bg-secondary)',
                            border: '0.5px solid var(--ios-separator)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <div
                              className="text-[10.5px] font-bold uppercase"
                              style={{ color: 'var(--ios-purple)' }}
                            >
                              2-е словосочетание
                            </div>
                            {pairSelectedOption && (
                              <span
                                className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-md"
                                style={{
                                  background: 'var(--ios-green-soft)',
                                  color: 'var(--ios-green)',
                                }}
                              >
                                {currentPair.rightAns === 'СЛИТНО' ||
                                currentPair.rightAns === 'РАЗДЕЛЬНО' ||
                                currentPair.rightAns === 'ДЕФИСНО'
                                  ? currentPair.rightAns
                                  : `Буква ${currentPair.rightAns}`}
                              </span>
                            )}
                          </div>
                          <div className="text-[18px] font-extrabold leading-tight">
                            {pairSelectedOption
                              ? currentPair.rightWordGap.includes('..')
                                ? currentPair.rightWordGap.replace(
                                    '..',
                                    currentPair.rightAns
                                  )
                                : currentPair.rightAns === 'СЛИТНО'
                                ? currentPair.rightWordGap.replace(
                                    /\(([^)]+)\)\s*/g,
                                    '$1'
                                  )
                                : currentPair.rightAns === 'ДЕФИСНО'
                                ? currentPair.rightWordGap.replace(
                                    /\(([^)]+)\)\s*/g,
                                    '$1-'
                                  )
                                : currentPair.rightWordGap.replace(
                                    /\(([^)]+)\)\s*/g,
                                    '$1 '
                                  )
                              : currentPair.rightWordGap}
                          </div>
                          <div
                            className="text-[13px] font-semibold mt-0.5 leading-snug"
                            style={{ color: 'var(--ios-label-sec)' }}
                          >
                            {currentPair.rightContext}
                          </div>
                        </div>
                      </div>

                      {/* Fixed-height feedback slot so buttons never jump */}
                      <div className="min-h-[38px] flex items-center justify-center">
                        {pairSelectedOption ? (
                          <div
                            className="px-3 py-1.5 rounded-xl text-[12px] font-bold leading-snug text-center w-full ios-feedback-pop"
                            style={{
                              background:
                                pairSelectedOption === currentPair.correctOption
                                  ? 'var(--ios-green-soft)'
                                  : 'var(--ios-red-soft)',
                              color:
                                pairSelectedOption === currentPair.correctOption
                                  ? 'var(--ios-green)'
                                  : 'var(--ios-red)',
                            }}
                          >
                            {currentPair.explanation}
                          </div>
                        ) : (
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: 'var(--ios-label-ter)' }}
                          >
                            Сравните значения обоих слов перед ответом
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {currentPair.options.map((opt, idx) => {
                          let stateClass = '';
                          if (pairSelectedOption) {
                            if (opt === currentPair.correctOption) stateClass = 'ok';
                            else if (opt === pairSelectedOption) stateClass = 'bad';
                          }
                          const hasTwoParts = opt.includes(' / ');
                          const [firstPart, secondPart] = hasTwoParts
                            ? opt.split(' / ')
                            : [opt, ''];
                          const firstDisplay =
                            firstPart.length <= 2
                              ? firstPart
                              : firstPart.charAt(0).toUpperCase() +
                                firstPart.slice(1).toLowerCase();
                          const secondDisplay =
                            secondPart.length <= 2
                              ? secondPart
                              : secondPart.charAt(0).toUpperCase() +
                                secondPart.slice(1).toLowerCase();

                          return (
                            <button
                              key={`pair-opt-${idx}-${opt}`}
                              type="button"
                              id={`pair-opt-btn-${idx}`}
                              disabled={pairSelectedOption !== null}
                              onClick={() => {
                                setPairSelectedOption(opt);
                                setTimeout(() => {
                                  setPairSelectedOption(null);
                                  setPairIndex((prevIdx) => {
                                    const nextIdx = prevIdx + 1;
                                    if (nextIdx >= pairDeck.length) {
                                      setPairDeck(
                                        buildBalancedHomophoneDeck(
                                          HOMOPHONE_PAIRS_BANK
                                        )
                                      );
                                      return 0;
                                    }
                                    return nextIdx;
                                  });
                                }, 650);
                              }}
                              className={`choice-card-btn ${
                                hasTwoParts ? 'pair-word-mode' : 'word-mode'
                              } ${stateClass}`}
                            >
                              <span
                                className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-extrabold shrink-0"
                                style={{
                                  background: 'var(--ios-bg-secondary)',
                                  color: 'var(--ios-label-sec)',
                                }}
                              >
                                {idx + 1}
                              </span>
                              {hasTwoParts ? (
                                <div className="flex flex-col items-start justify-center leading-tight text-left min-w-0 w-full overflow-hidden py-0.5">
                                  <div className="text-[12px] sm:text-[13px] font-extrabold tracking-tight truncate w-full text-left">
                                    1: {firstDisplay}
                                  </div>
                                  <div
                                    className="text-[12px] sm:text-[13px] font-extrabold tracking-tight truncate w-full text-left mt-0.5"
                                    style={{ color: 'var(--ios-label-sec)' }}
                                  >
                                    2: {secondDisplay}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[19px] font-extrabold tracking-tight">
                                  {opt}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* SUB-VIEW C: KIM 4–22 BLANK SIMULATOR (25 VARIANTS) */}
                {labSubMode === 'kim' && (
                  <motion.div
                    key="lab-kim"
                    id="lab-kim-view"
                    className="flex-1 flex flex-col justify-between gap-2"
                    custom={labDirection}
                    variants={iosScreenSlideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <div>
                      {/* Variant Selector Header */}
                      <div className="flex items-center justify-between gap-2 mb-2 px-1">
                        <button
                          type="button"
                          id="kim-prev-var"
                          onClick={() => handleSelectKimVariant(kimVariantIdx - 1)}
                          className="liquid-pill-btn px-3 py-1 rounded-full text-[12px] font-bold cursor-pointer"
                          style={{ color: 'var(--ios-label)' }}
                        >
                          ← Пред.
                        </button>
                        <div
                          id="kim-var-title"
                          className="text-[14px] font-extrabold text-center"
                        >
                          {currentKimVariant.title} из {bank.kimVariants.length}
                        </div>
                        <button
                          type="button"
                          id="kim-next-var"
                          onClick={() => handleSelectKimVariant(kimVariantIdx + 1)}
                          className="liquid-pill-btn px-3 py-1 rounded-full text-[12px] font-bold cursor-pointer"
                          style={{ color: 'var(--ios-label)' }}
                        >
                          След. →
                        </button>
                      </div>

                      {/* 19 Task Tabs (4–22) */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2 no-scrollbar">
                        {TASK_IDS.map((tId) => {
                          const fq = currentKimVariant?.tasks?.[tId];
                          const userAns = (kimAnswers[tId] || '').trim();
                          let checkClass = '';
                          if (kimChecked && fq) {
                            const check = checkFipiQuestionAnswer(fq, userAns);
                            checkClass = check.isCorrect ? 'checked-ok' : 'checked-bad';
                          }
                          return (
                            <button
                              key={tId}
                              type="button"
                              onClick={() => setKimActiveTask(tId)}
                              className={`kim-task-tab shrink-0 !min-w-[54px] !px-2 ${
                                kimActiveTask === tId ? 'active' : ''
                              } ${checkClass}`}
                            >
                              <span className="text-[11.5px] font-extrabold">№ {tId}</span>
                              <span
                                className="text-[10px] font-mono font-bold truncate max-w-[52px]"
                                style={{ color: 'var(--ios-label-sec)' }}
                              >
                                {userAns || '—'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Current KIM Task Card + Official Blank Answer Input */}
                      <div
                        key={`${kimVariantIdx}-${kimActiveTask}`}
                        className="ios-inset-group p-3 !mb-0 word-stage-animate"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <div className="min-w-0 flex-1 pr-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-[12.5px] font-extrabold whitespace-nowrap"
                                style={{ color: 'var(--ios-blue)' }}
                              >
                                Задание № {kimActiveTask} · {TASK_META[kimActiveTask]?.title}
                              </span>
                              <button
                                type="button"
                                onClick={() => openRuleInspector(currentKimTaskQuestion, null)}
                                className="liquid-pill-btn text-[10.5px] font-bold px-2 py-0.5 rounded-full cursor-pointer shrink-0"
                              >
                                Шпора
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className="text-[11px] font-bold whitespace-nowrap"
                              style={{ color: 'var(--ios-label-sec)' }}
                            >
                              Бланк №1:
                            </span>
                            <input
                              id="kim-blank-input"
                              type="text"
                              inputMode={
                                ['5', '6', '7'].includes(kimActiveTask) ? 'text' : 'numeric'
                              }
                              maxLength={['5', '6', '7'].includes(kimActiveTask) ? 28 : 9}
                              value={kimAnswers[kimActiveTask] || ''}
                              onChange={(e) => handleKimInputDirect(e.target.value)}
                              onBlur={resetViewportOnBlur}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              placeholder={
                                ['5', '6', '7'].includes(kimActiveTask)
                                  ? 'СЛОВО'
                                  : ['8', '22'].includes(kimActiveTask)
                                    ? 'АБВГД'
                                    : '12...'
                              }
                              aria-label={`Ответ бланка для задания ${kimActiveTask}`}
                              className={`ege-blank-input ${
                                ['5', '6', '7'].includes(kimActiveTask)
                                  ? 'is-word-input !w-[165px] !text-[16px] !tracking-normal'
                                  : ''
                              }`}
                            />
                          </div>
                        </div>

                        {/* Official Instruction Box in KIM */}
                        <div
                          className="px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl mb-2.5 text-left border border-[var(--ios-separator)] shadow-xs"
                          style={{ background: 'var(--ios-bg-secondary)', color: 'var(--ios-label)' }}
                        >
                          <div className="text-[14px] sm:text-[15.5px] font-semibold leading-relaxed">
                            <FormattedInstruction
                              rule={currentKimTaskQuestion.instruction || currentKimTaskQuestion.rule}
                              task={kimActiveTask}
                            />
                          </div>
                        </div>

                        {/* Numbered Gaps in Sentence (Tasks 15, 17, 18, 19, 20) */}
                        {['15', '17', '18', '19', '20'].includes(kimActiveTask) ? (
                          <div className="flex flex-col gap-2 my-1">
                            <div
                              className="p-3.5 rounded-2xl mb-1 text-left border border-[var(--ios-separator)] shadow-xs"
                              style={{
                                background: 'var(--ios-bg-secondary)',
                                color: 'var(--ios-label)',
                              }}
                            >
                              <div
                                className="text-[10px] font-extrabold uppercase tracking-wider mb-1.5 opacity-70"
                                style={{ color: 'var(--ios-blue)' }}
                              >
                                Предложение задания:
                              </div>
                              <Task15SentenceView
                                sentence={resolveTask15Sentence(currentKimTaskQuestion)}
                                rows={currentKimTaskQuestion.rows}
                                selectedDigits={(kimAnswers[kimActiveTask] || '')
                                  .split('')
                                  .map(Number)
                                  .filter(Boolean)}
                                isSubmitted={kimChecked}
                                onToggleDigit={handleToggleKimRowDigit}
                              />
                            </div>

                            <div className="flex items-center justify-center flex-wrap gap-2.5 my-1 w-full mx-auto">
                              {currentKimTaskQuestion.rows.map((row, idx) => {
                                const digit = idx + 1;
                                const isPicked = (kimAnswers[kimActiveTask] || '').includes(
                                  String(digit)
                                );
                                let circleClass =
                                  'w-10 h-10 sm:w-12 sm:h-12 rounded-full text-[17px] sm:text-[19px] font-black flex items-center justify-center transition-all select-none shadow-xs active:scale-95 cursor-pointer';
                                let circleStyle: React.CSSProperties = {
                                  background: 'var(--ios-bg-secondary)',
                                  color: 'var(--ios-label)',
                                  border: '1.5px solid var(--ios-separator)',
                                };

                                if (kimChecked) {
                                  if (row.isCorrectRow && isPicked) {
                                    circleStyle = {
                                      background: 'var(--ios-green-soft)',
                                      color: 'var(--ios-green)',
                                      border: '2px solid var(--ios-green)',
                                    };
                                  } else if (row.isCorrectRow && !isPicked) {
                                    circleStyle = {
                                      background: 'var(--ios-orange-soft)',
                                      color: 'var(--ios-orange)',
                                      border: '1.5px solid var(--ios-orange)',
                                    };
                                  } else if (!row.isCorrectRow && isPicked) {
                                    circleStyle = {
                                      background: 'var(--ios-red-soft)',
                                      color: 'var(--ios-red)',
                                      border: '2px solid var(--ios-red)',
                                    };
                                  }
                                } else if (isPicked) {
                                  circleStyle = {
                                    background: 'var(--ios-blue)',
                                    color: '#FFFFFF',
                                    border: '2px solid var(--ios-blue)',
                                  };
                                  circleClass += ' scale-105';
                                }

                                return (
                                  <button
                                    key={digit}
                                    id={`kim-row-${digit}`}
                                    type="button"
                                    onClick={() => handleToggleKimRowDigit(digit)}
                                    className={circleClass}
                                    style={circleStyle}
                                  >
                                    <span>{digit}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : ['5', '6', '7'].includes(kimActiveTask) ? (
                          /* Word Input Tasks 5, 6, 7 in KIM Blank Simulator */
                          <div className="flex flex-col gap-2">
                            {currentKimTaskQuestion.rows.length > 1 ? (
                              currentKimTaskQuestion.rows.map((row, idx) => (
                                <div
                                  key={idx}
                                  className="px-3 py-2 rounded-xl border border-[var(--ios-separator)] text-[12.5px] font-semibold leading-snug text-left"
                                  style={{ background: 'var(--ios-bg-secondary)' }}
                                >
                                  <span className="opacity-60 font-extrabold mr-1.5">
                                    {idx + 1})
                                  </span>
                                  <span>
                                    {(kimChecked ? row.solvedWords : row.words).join(' ')}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div
                                className="p-3 rounded-2xl border border-[var(--ios-separator)] text-[13.5px] font-semibold leading-relaxed text-left whitespace-pre-line"
                                style={{ background: 'var(--ios-bg-secondary)' }}
                              >
                                {currentKimTaskQuestion.sentence ||
                                  (currentKimTaskQuestion.rows[0]?.words || []).join(' ')}
                              </div>
                            )}
                          </div>
                        ) : ['8', '22'].includes(kimActiveTask) ? (
                          /* Matching Grid Tasks 8 & 22 in KIM Blank Simulator */
                          <div className="flex flex-col gap-2">
                            {currentKimTaskQuestion.matchingLetters &&
                              currentKimTaskQuestion.matchingLetters.length > 0 && (
                                <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
                                  {currentKimTaskQuestion.matchingLetters.map((letterDesc, idx) => {
                                    const rawLetterText =
                                      typeof letterDesc === 'string'
                                        ? letterDesc
                                        : letterDesc.text || '';
                                    return (
                                      <div
                                        key={idx}
                                        className="px-2.5 py-1.5 rounded-xl border border-[var(--ios-separator)] text-[11.5px] font-semibold text-left"
                                        style={{ background: 'var(--ios-bg-secondary)' }}
                                      >
                                        <strong className="mr-1.5" style={{ color: 'var(--ios-blue)' }}>
                                          {['А', 'Б', 'В', 'Г', 'Д'][idx]})
                                        </strong>
                                        {rawLetterText.replace(/^[А-ДA-E]\)\s*/i, '')}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            <div className="flex flex-col gap-1 max-h-[210px] overflow-y-auto">
                              {currentKimTaskQuestion.rows.map((row, idx) => {
                                const rowNum = idx + 1;
                                const isPicked = (kimAnswers[kimActiveTask] || '').includes(
                                  String(rowNum)
                                );
                                return (
                                  <button
                                    key={rowNum}
                                    type="button"
                                    onClick={() => handleToggleKimRowDigit(rowNum)}
                                    className="px-2.5 py-1.5 rounded-xl border border-[var(--ios-separator)] text-[11.5px] font-medium text-left flex items-start gap-2 cursor-pointer"
                                    style={{
                                      background: isPicked
                                        ? 'var(--ios-blue-soft)'
                                        : 'var(--ios-bg-secondary)',
                                    }}
                                  >
                                    <span className="font-extrabold">{rowNum})</span>
                                    <span className="flex-1">
                                      {row.words.join(' ').replace(/^\d+\)\s*/, '')}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          /* Multi-Row Tasks (4, 9–14, 16, 21) */
                          <div className="flex flex-col gap-1.5">
                            {currentKimTaskQuestion.rows.map((row, idx) => {
                              const rowNum = idx + 1;
                              const isPicked = (kimAnswers[kimActiveTask] || '').includes(
                                String(rowNum)
                              );
                              let rowStateClass = isPicked ? 'selected' : '';
                              if (kimChecked) {
                                if (row.isCorrectRow && isPicked) rowStateClass = 'ok';
                                else if (row.isCorrectRow && !isPicked)
                                  rowStateClass = 'missed';
                                else if (!row.isCorrectRow && isPicked)
                                  rowStateClass = 'bad';
                              }

                              const displayWords = kimChecked ? row.solvedWords : row.words;

                              return (
                                <button
                                  key={rowNum}
                                  type="button"
                                  onClick={() => handleToggleKimRowDigit(rowNum)}
                                  className={`fipi-row-cell ${rowStateClass}`}
                                >
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-extrabold shrink-0"
                                    style={{
                                      background: isPicked
                                        ? 'var(--ios-blue)'
                                        : 'var(--ios-bg-tertiary)',
                                      color: isPicked ? '#FFFFFF' : 'var(--ios-label)',
                                    }}
                                  >
                                    {rowNum}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-bold leading-snug">
                                      {displayWords.join(', ')}
                                    </div>
                                    {kimChecked && row.explanation && (
                                      <div
                                        className="text-[10.5px] mt-0.5 line-clamp-2 opacity-85 leading-tight"
                                        style={{ color: 'var(--ios-label-sec)' }}
                                      >
                                        {row.explanation}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {kimChecked && (
                          <div className="flex flex-col gap-1.5 mt-2.5">
                            <div
                              className="p-2.5 rounded-xl text-[12px] font-bold flex items-center justify-between flex-wrap gap-2"
                              style={{
                                background: 'var(--ios-bg-secondary)',
                                color: 'var(--ios-label)',
                              }}
                            >
                              <span>
                                Ваш ответ:{' '}
                                <strong>
                                  {kimAnswers[kimActiveTask] || 'пусто'}
                                </strong>
                              </span>
                              <span style={{ color: 'var(--ios-green)' }}>
                                Эталон ФИПИ:{' '}
                                {
                                  checkFipiQuestionAnswer(
                                    currentKimTaskQuestion,
                                    kimAnswers[kimActiveTask] || ''
                                  ).correctAnswerDisplay
                                }
                              </span>
                            </div>
                            {kimVariantScore && (
                              <div
                                id="kim-variant-score-banner"
                                className="px-3 py-2 rounded-xl text-[12px] font-extrabold flex items-center justify-between"
                                style={{
                                  background:
                                    kimVariantScore.percent >= 60
                                      ? 'var(--ios-green-soft)'
                                      : 'var(--ios-orange-soft)',
                                  color:
                                    kimVariantScore.percent >= 60
                                      ? 'var(--ios-green)'
                                      : 'var(--ios-orange)',
                                }}
                              >
                                <span>Итог варианта КИМ (№ 4–22):</span>
                                <span>
                                  {kimVariantScore.earned} из {kimVariantScore.maxP} баллов ({kimVariantScore.percent}%)
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto pt-1">
                      <button
                        type="button"
                        id="kim-check-all-btn"
                        onClick={handleCheckKimVariant}
                        className="ios-btn-primary"
                      >
                        <svg className="w-5 h-5 shrink-0">
                          <use href="#sf-check-circle-fill" />
                        </svg>
                        <span>
                          {kimChecked
                            ? 'Следующий вариант КИМ →'
                            : 'Проверить вариант КИМ (4–22)'}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
                  </AnimatePresence>
                </div>
              </motion.section>
            )}

            {/* ======================================================================
                TAB 4: GLOBAL ERROR BANK (БАНК ОШИБОК + ОДНОСТРОЧНАЯ КНОПКА ВНИЗУ)
               ====================================================================== */}
            {activeTab === 'errors' && (
              <motion.section
                key="tab-errors"
                id="screen-errors"
                aria-label="Банк ошибок"
                className="min-h-full flex-1 flex flex-col w-full"
                custom={tabDirection}
                variants={iosScreenSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="ios-screen-stack">
                <div>
                  <div className="flex items-center justify-between gap-2 mt-0.5 mb-2.5 min-w-0">
                    <h1 className="ios-large-title !m-0">Банк ошибок</h1>
                    {state.errorBank.length > 0 ? (
                      <button
                        type="button"
                        id="start-error-workout-btn"
                        onClick={handleStartErrorBankWorkout}
                        className="ios-btn-tinted shrink-0"
                      >
                        <svg className="w-4 h-4 shrink-0">
                          <use href="#sf-play-circle-fill" />
                        </svg>
                        <span>Отработать все ({state.errorBank.length})</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDictionaryOpen(true)}
                        className="liquid-pill-btn px-2.5 py-1 rounded-full text-[11.5px] font-bold cursor-pointer shrink-0"
                      >
                        Словарь ФИПИ
                      </button>
                    )}
                  </div>

                  <div id="global-errors-container">
                    {state.errorBank.length > 0 && (
                      <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-[12px] font-bold" style={{ color: 'var(--ios-label-sec)' }}>
                          Ошибок в банке: {state.errorBank.length}
                        </span>
                        <button
                          type="button"
                          id="toggle-all-errors-btn"
                          onClick={() => setAllErrorsCollapsed((c) => !c)}
                          className="liquid-pill-btn text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                          style={{
                            background: allErrorsCollapsed ? 'var(--ios-blue-soft)' : undefined,
                            color: allErrorsCollapsed ? 'var(--ios-blue)' : undefined,
                          }}
                        >
                          <span>{allErrorsCollapsed ? 'Развернуть все' : 'Свернуть все'}</span>
                          <svg
                            className={`w-3.5 h-3.5 ios-accordion-arrow ${allErrorsCollapsed ? 'rotated' : ''}`}
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
                    )}
                    {state.errorBank.length === 0 ? (
                      <div className="ios-inset-group p-6 text-center">
                        <div
                          className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                          style={{
                            background: 'var(--ios-green-soft)',
                            color: 'var(--ios-green)',
                          }}
                        >
                          <svg className="w-6 h-6">
                            <use href="#sf-check-circle-fill" />
                          </svg>
                        </div>
                        <div className="text-[18px] font-extrabold mb-1">
                          Ошибок пока нет
                        </div>
                        <p
                          className="text-[13px] max-w-[320px] mx-auto"
                          style={{ color: 'var(--ios-label-sec)' }}
                        >
                          Все слова, в которых вы допустите ошибку в Занятии, Спринте или
                          КИМ, автоматически появятся здесь с правилом.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {state.errorBank.map((err: ErrorBankEntry, idx: number) => {
                          const linkedQuestion = bank.byId.get(err.questionId);
                          const targetQuestion: TrainerQuestion = linkedQuestion || {
                            id: err.questionId || err.id,
                            kind: 'sprint',
                            task: err.task,
                            topic: err.topic,
                            rule: err.rule,
                            prefix: err.wordDisplay.split('..')[0] || '',
                            suffix: err.wordDisplay.split('..')[1] || '',
                            answer: err.correctChoice,
                            options: [err.correctChoice, err.userChoice],
                            context: err.context || '',
                            explanation: err.explanation,
                          };

                          return (
                            <StructuredErrorCard
                              key={err.id}
                              forceCollapsed={allErrorsCollapsed}
                              task={err.task}
                              topic={err.topic}
                              wordTitle={err.correctWord}
                              context={err.context}
                              userChoice={err.userChoice}
                              correctChoice={err.correctChoice}
                              explanation={err.explanation}
                              rule={err.rule}
                              question={targetQuestion}
                              staggerIndex={idx}
                              onInspectRule={() => {
                                openRuleInspector(targetQuestion, err);
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Clean Single-Line Bottom Button */}
                <div id="errors-bottom-deck" className="mt-auto pt-2 pb-1">
                  <button
                    type="button"
                    id="train-fipi-traps-btn"
                    onClick={handleStartFipiTrapsWorkout}
                    className="ios-btn-primary whitespace-nowrap"
                  >
                    <svg className="w-5 h-5 shrink-0">
                      <use href="#sf-bolt-fill" />
                    </svg>
                    <span className="whitespace-nowrap">
                      Тренировать ловушки ФИПИ (15 шт.)
                    </span>
                  </button>
                </div>
              </div>
              </motion.section>
            )}

            {/* ======================================================================
                TAB 5: GLOBAL STATISTICS, JOURNAL & HOSTED MEMORY
               ====================================================================== */}
            {activeTab === 'stats' && (
              <motion.section
                key="tab-stats"
                id="screen-stats"
                aria-label="Статистика"
                className="min-h-full flex-1 flex flex-col w-full"
                custom={tabDirection}
                variants={iosScreenSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="ios-screen-stack">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mt-0.5 mb-2 min-w-0">
                      <h1 className="ios-large-title !m-0">Статистика</h1>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          id="open-sync-from-stats-btn"
                          onClick={() => setIsSyncOpen(true)}
                          className="liquid-pill-btn text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Синхронизация
                        </button>
                        <button
                          type="button"
                          id="open-reset-modal-btn"
                          onClick={() => setIsResetOpen(true)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer whitespace-nowrap shrink-0 active:scale-95 transition-transform"
                          style={{
                            background: 'var(--ios-red-soft)',
                            color: 'var(--ios-red)',
                          }}
                        >
                          Сбросить
                        </button>
                      </div>
                    </div>

                    {/* Stats Segmented Control: Обзор | Журнал | Память (Draggable Apple Liquid Glass) */}
                    <div className="mb-2.5">
                      <LiquidGlassSegmented
                        id="stats-mode-segmented"
                        ariaLabel="Разделы статистики"
                        value={statSubMode}
                        onChange={setStatSubMode}
                        options={[
                          { key: 'overview', label: 'Обзор' },
                          { key: 'journal', label: 'Журнал' },
                          { key: 'cloud', label: 'Память' },
                        ]}
                      />
                    </div>

                    <AnimatePresence
                      initial={false}
                      custom={statDirection}
                      mode="popLayout"
                    >
                      {statSubMode === 'overview' && (
                        <motion.div
                          key="stats-overview"
                          id="stats-overview-view"
                          custom={statDirection}
                          variants={iosScreenSlideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                        >
                      <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                        <div className="ios-inset-group !mb-0 p-3 text-center">
                          <div id="global-stat-total" className="text-[22px] font-extrabold">
                            {state.totalSolved}
                          </div>
                          <div
                            className="text-[11px] font-bold"
                            style={{ color: 'var(--ios-label-sec)' }}
                          >
                            Решено
                          </div>
                        </div>
                        <div className="ios-inset-group !mb-0 p-3 text-center">
                          <div
                            id="global-stat-acc"
                            className="text-[22px] font-extrabold"
                            style={{ color: 'var(--ios-green)' }}
                          >
                            {globalAccuracy}%
                          </div>
                          <div
                            className="text-[11px] font-bold"
                            style={{ color: 'var(--ios-label-sec)' }}
                          >
                            Точность
                          </div>
                        </div>
                        <div className="ios-inset-group !mb-0 p-3 text-center">
                          <div
                            id="global-stat-sessions"
                            className="text-[22px] font-extrabold"
                            style={{ color: 'var(--ios-blue)' }}
                          >
                            {state.sessionsCompleted}
                          </div>
                          <div
                            className="text-[11px] font-bold"
                            style={{ color: 'var(--ios-label-sec)' }}
                          >
                            Занятий
                          </div>
                        </div>
                      </div>

                      {/* Arcade Records Row */}
                      <div className="grid grid-cols-3 gap-2 mb-2.5">
                        <div className="ios-inset-group !mb-0 p-2.5 text-center">
                          <div
                            id="stat-best-streak"
                            className="text-[17px] font-extrabold"
                            style={{ color: 'var(--ios-orange)' }}
                          >
                            {state.bestStreak || 0}
                          </div>
                          <div
                            className="text-[10.5px] font-bold whitespace-nowrap truncate"
                            style={{ color: 'var(--ios-label-sec)' }}
                          >
                            Лучшая серия
                          </div>
                        </div>
                        <div className="ios-inset-group !mb-0 p-2.5 text-center">
                          <div
                            id="stat-best-blitz"
                            className="text-[17px] font-extrabold"
                            style={{ color: 'var(--ios-purple)' }}
                          >
                            {state.bestBlitz60 || 0}
                          </div>
                          <div
                            className="text-[10.5px] font-bold whitespace-nowrap truncate"
                            style={{ color: 'var(--ios-label-sec)' }}
                          >
                            Блиц 60 сек
                          </div>
                        </div>
                        <div className="ios-inset-group !mb-0 p-2.5 text-center">
                          <div
                            id="stat-best-surv"
                            className="text-[17px] font-extrabold"
                            style={{ color: 'var(--ios-pink)' }}
                          >
                            {state.bestSurvival || 0}
                          </div>
                          <div
                            className="text-[10.5px] font-bold whitespace-nowrap truncate"
                            style={{ color: 'var(--ios-label-sec)' }}
                          >
                            Выживание 3♥
                          </div>
                        </div>
                      </div>

                      <div className="ios-section-header">Освоение тем (Задания 4–22)</div>
                      <div id="global-task-bars" className="ios-inset-group !mb-0">
                        {TASK_IDS.map((taskId) => {
                          const meta = TASK_META[taskId];
                          const st = state.taskStats[taskId] || { solved: 0, correct: 0 };
                          const acc = calculateAccuracyPercent(st.correct, st.solved);
                          return (
                            <div key={taskId} className="ios-cell">
                              <div
                                className="ios-row-icon"
                                style={{ background: meta.gradient }}
                              >
                                {taskId}
                              </div>
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-[13px] font-bold tracking-[-0.2px] whitespace-nowrap truncate">
                                    {meta.title}
                                  </span>
                                  <span
                                    className="text-[11.5px] font-bold whitespace-nowrap shrink-0"
                                    style={{ color: 'var(--ios-label-sec)' }}
                                  >
                                    {st.correct}/{st.solved} ({acc}%)
                                  </span>
                                </div>
                                <div
                                  className="w-full h-2 rounded-full overflow-hidden"
                                  style={{ background: 'var(--ios-bg-tertiary)' }}
                                >
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${st.solved === 0 ? 0 : Math.max(6, acc)}%`,
                                      background:
                                        acc >= 80
                                          ? 'var(--ios-green)'
                                          : acc >= 50
                                          ? 'var(--ios-orange)'
                                          : 'var(--ios-red)',
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {statSubMode === 'journal' && (
                    <motion.div
                      key="stats-journal"
                      id="stats-journal-view"
                      custom={statDirection}
                      variants={iosScreenSlideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                    >
                      <div className="ios-section-header">
                        История завершённых тренировок и вариантов КИМ
                      </div>
                      <div id="session-journal-list" className="ios-inset-group !mb-0">
                        {!state.sessionJournal || state.sessionJournal.length === 0 ? (
                          <div
                            className="p-6 text-center text-[13px]"
                            style={{ color: 'var(--ios-label-sec)' }}
                          >
                            Завершите любое занятие или вариант КИМ, чтобы запись появилась в
                            журнале.
                          </div>
                        ) : (
                          state.sessionJournal.map((j) => (
                            <div key={j.id} className="ios-cell no-icon">
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="text-[14px] font-bold truncate">
                                  {j.title}
                                </div>
                                <div
                                  className="text-[12px]"
                                  style={{ color: 'var(--ios-label-sec)' }}
                                >
                                  {j.dateLabel} · Верно {j.correct} из {j.total}
                                </div>
                              </div>
                              <div
                                className="text-[15px] font-extrabold"
                                style={{
                                  color:
                                    j.accuracy >= 80
                                      ? 'var(--ios-green)'
                                      : j.accuracy >= 50
                                      ? 'var(--ios-orange)'
                                      : 'var(--ios-red)',
                                }}
                              >
                                {j.accuracy}%
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}

                  {statSubMode === 'cloud' && (
                    <motion.div
                      key="stats-cloud"
                      id="stats-cloud-view"
                      custom={statDirection}
                      variants={iosScreenSlideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                    >
                      <div className="ios-inset-group p-4 !mb-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-[15px] font-extrabold">
                            Серверная и локальная память
                          </div>
                          <span
                            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                            style={{
                              background: 'var(--ios-green-soft)',
                              color: 'var(--ios-green)',
                            }}
                          >
                            Автосохранение
                          </span>
                        </div>
                        <p
                          className="text-[12px] mb-3"
                          style={{ color: 'var(--ios-label-sec)' }}
                        >
                          При хостинге на этом сервере ваш прогресс автоматически
                          сохраняется в базе сервера и в браузере (IndexedDB +
                          localStorage). Ниже доступен резервный код для переноса между
                          устройствами.
                        </p>
                        <textarea
                          id="cloud-code-textarea"
                          rows={3}
                          value={cloudCodeText}
                          onChange={(e) => setCloudCodeText(e.target.value)}
                          onBlur={resetViewportOnBlur}
                          placeholder="Код прогресса EGE27-..."
                          className="w-full p-2.5 rounded-2xl text-[16px] font-mono mb-2.5 outline-none"
                          style={{
                            background: 'var(--ios-bg-secondary)',
                            border: '0.5px solid var(--ios-separator)',
                            color: 'var(--ios-label)',
                          }}
                        />
                        {cloudBannerMsg && (
                          <div
                            className="text-[12px] font-bold mb-2"
                            style={{ color: 'var(--ios-green)' }}
                          >
                            {cloudBannerMsg}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            id="copy-cloud-code-btn"
                            onClick={async () => {
                              const fresh = encodeBackupCode(state);
                              setCloudCodeText(fresh);
                              try {
                                await navigator.clipboard.writeText(fresh);
                                setCloudBannerMsg('Код скопирован в буфер обмена!');
                              } catch {
                                setCloudBannerMsg('Выделите и скопируйте код выше');
                              }
                            }}
                            className="ios-btn-tinted w-full"
                          >
                            Скопировать код
                          </button>
                          <button
                            type="button"
                            id="restore-cloud-code-btn"
                            onClick={() => {
                              const restored = decodeBackupCode(cloudCodeText, state);
                              if (restored) {
                                setState(restored);
                                setCloudBannerMsg('Прогресс успешно восстановлен!');
                              } else {
                                setCloudBannerMsg('Ошибка: неверный формат кода EGE27-...');
                              }
                            }}
                            className="ios-btn-tinted w-full"
                            style={{
                              background: 'var(--ios-green-soft)',
                              color: 'var(--ios-green)',
                            }}
                          >
                            Восстановить
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* 5-Tab iOS 26 / 27 Draggable Spatial Liquid Glass Capsule Tab Bar */}
      <LiquidGlassTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        items={[
          {
            key: 'workout',
            label: 'Занятие',
            iconHref: '#sf-play-circle-fill',
          },
          {
            key: 'sprint',
            label: 'Спринт',
            iconHref: '#sf-bolt-fill',
          },
          {
            key: 'lab',
            label: 'Лаб 4–22',
            iconHref: '#sf-sparkles',
          },
          {
            key: 'errors',
            label: 'Ошибки',
            iconHref: '#sf-warning-fill',
            badgeCount: state.errorBank.length,
          },
          {
            key: 'stats',
            label: 'Статистика',
            iconHref: '#sf-chart-fill',
          },
        ]}
      />

      {/* Window 1: Full Cheatsheet Modal (Шпаргалка по заданиям 4–22) */}
      <CheatsheetModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        initialSection={rulesInitialSection}
      />

      {/* Window 2: Hosted Memory & Sync Modal */}
      <SyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        state={state}
        onRestoreState={(newState) => setState(newState)}
      />

      {/* Window 3: Smart Workout Presets & Focus Sheet */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        state={state}
        onApplyPreset={handleApplyPreset}
        onApplyCustomQuantities={handleApplyCustomQuantities}
        onApplyBalanced30={handleApplyBalanced30}
        onStartBalanced30Workout={handleStartBalanced30Workout}
        onStartFipiTraps={handleStartFipiTrapsWorkout}
        onStartWeakestTaskWorkout={handleStartWeakestTaskWorkout}
        onStartRealKimWorkout={handleStartRealKimWorkout}
        onToggleShuffle={() =>
          setState((prev) => ({ ...prev, isShuffled: !prev.isShuffled }))
        }
      />

      {/* Window 4: Instant Rule & Algorithm Inspector Sheet */}
      <RuleInspectorModal
        isOpen={isRuleInspectorOpen}
        onClose={closeRuleInspector}
        question={inspectedQuestion}
        errorEntry={inspectedError}
        onOpenFullCheatsheet={(taskId) => {
          setRulesInitialSection(taskId);
          setIsRulesOpen(true);
        }}
      />

      {/* Window 5: Interactive Searchable FIPI Exceptions Dictionary Sheet */}
      <DictionaryModal
        isOpen={isDictionaryOpen}
        onClose={() => setIsDictionaryOpen(false)}
        onStartTrapsWorkout={handleStartFipiTrapsWorkout}
      />

      {/* Window 6: Apple Liquid Glass Physics & Theme Customization Sheet */}
      <AppearanceModal
        isOpen={isAppearanceOpen}
        onClose={() => setIsAppearanceOpen(false)}
        darkMode={state.darkMode}
        onToggleDarkMode={(dark) => setState((prev) => ({ ...prev, darkMode: dark }))}
        glassStyle={glassStyle}
        onChangeGlassStyle={setGlassStyle}
        specularEnabled={specularEnabled}
        onToggleSpecular={setSpecularEnabled}
        onOpenSyncModal={() => setIsSyncOpen(true)}
      />

      {/* Window 7: Reset Confirmation Sheet */}
      <SwipeableSheet
        id="reset-modal"
        handleId="reset-drag-handle"
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        ariaLabel="Подтверждение сброса статистики"
        handleAriaLabel="Потяните вниз, чтобы отменить сброс"
        maxWidthClass="max-w-[420px]"
      >
        <h3 className="text-[19px] font-extrabold text-center mb-1">
          Сбросить прогресс?
        </h3>
        <p
          className="text-[13px] text-center mb-4"
          style={{ color: 'var(--ios-label-sec)' }}
        >
          Вся статистика решённых заданий, журнал и Банк ошибок будут очищены.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            id="confirm-reset-btn"
            onClick={handleConfirmResetStats}
            className="ios-btn-primary"
            style={{ background: 'var(--ios-red)' }}
          >
            Да, сбросить статистику
          </button>
          <button
            type="button"
            id="cancel-reset-btn"
            onClick={() => setIsResetOpen(false)}
            className="ios-btn-tinted w-full"
          >
            Отмена
          </button>
        </div>
      </SwipeableSheet>
    </>
  );
}