import type { TaskId, FipiQuestion, SprintQuestion } from '../utils/trainerLogic.ts';
import starterBank from './starterBank.json' with { type: 'json' };

export interface WordEntry {
  id: string;
  word: string;
  wordGap: string;
  prefix: string;
  missingLetter: string;
  suffix: string;
  task: TaskId;
  topic: string;
  category: string;
  rule: string;
  context: string;
  source: string;
  isTrap?: boolean;
}

const ALL_TASK_IDS_LIST: TaskId[] = [
  '4', '5', '6', '7', '8',
  '9', '10', '11', '12', '13', '14', '15',
  '16', '17', '18', '19', '20', '21', '22',
];

export function sprintToWordEntry(sq: SprintQuestion, index: number): WordEntry | null {
  const task = String(sq.task);
  const pref = sq.prefix || '';
  const suff = sq.suffix || '';
  const ans = sq.answer || '';

  // Skip punctuation-drill choices that don't represent words or terms
  if (
    ans === 'ЗАПЯТАЯ НУЖНА' ||
    ans === 'БЕЗ ЗАПЯТОЙ' ||
    ans === 'ОДНА ЗАПЯТАЯ' ||
    ans === 'БЕЗ / НЕСКОЛЬКО' ||
    ans === 'ВХОДИТ В ОТВЕТ' ||
    ans === 'ДРУГОЕ ПРАВИЛО'
  ) {
    return null;
  }

  let word = '';
  let missingLetter = ans;
  let wordGap = '';

  if (['9', '10', '11', '12', '15'].includes(task)) {
    word = pref + ans + suff;
    wordGap = (sq as any).wordGap || (pref && suff ? `${pref}..${suff}` : word);
    missingLetter = ans;
  } else if (['13', '14'].includes(task)) {
    const pClean = pref.replace(/[()]/g, '').trim();
    const sClean = suff.replace(/[()]/g, '').trim();
    if (ans === 'РАЗДЕЛЬНО' || ans === 'РАЗД.') {
      word = `${pClean} ${sClean}`.trim();
    } else if (ans === 'ДЕФИС' || ans === 'ДЕФИСНО') {
      word = `${pClean}-${sClean}`.trim();
    } else if (ans === 'СЛИТНО') {
      word = `${pClean}${sClean}`.trim();
    } else {
      word = (sq as any).word || ans;
    }
    wordGap = (sq as any).wordGap || (pClean && sClean ? `${pClean}..${sClean}` : word);
    missingLetter = ans;
  } else if (task === '4') {
    word = ans;
    const stressedMatch = ans.match(/[А-ЯЁ]/);
    missingLetter = stressedMatch ? stressedMatch[0] : ans;
    wordGap = pref || word.toLowerCase();
  } else if (task === '5') {
    word = (sq as any).word || ans;
    missingLetter = 'Пароним';
    wordGap = word;
  } else if (task === '6') {
    word = (sq as any).word || ans;
    missingLetter = 'Лексика';
    wordGap = word;
  } else if (task === '7') {
    const m = pref.match(/«([^»]+)»/);
    if (m && ans === 'ВЕРНО') {
      word = m[1].trim();
      missingLetter = 'Норма';
    } else {
      word = (sq as any).word || (pref ? `${pref} ${ans}`.trim() : ans);
      missingLetter = ans === 'ВЕРНО' ? 'Норма' : ans;
    }
    wordGap = word;
  } else if (task === '8') {
    word = ans;
    missingLetter = 'Синтаксис';
    wordGap = word;
  } else if (task === '22') {
    word = ans;
    missingLetter = 'Троп';
    wordGap = word;
  } else {
    word = (sq as any).word || ans;
    wordGap = (sq as any).wordGap || (pref && suff ? `${pref}..${suff}` : word);
    missingLetter = ans;
  }

  const cleanContext = (sq.context || '').replace(/^\[Позиция \(\d+\)\]\s*/i, '').trim();
  const ruleText = sq.explanation || sq.rule || '';

  return {
    id: sq.id ? sq.id.replace(/^sp-/, 'w-') : `w-${task}-${index + 1}`,
    word: word || '—',
    wordGap: wordGap || word || '—',
    prefix: pref,
    missingLetter,
    suffix: suff,
    task: sq.task,
    topic: sq.topic || '',
    category: sq.topic || '',
    rule: ruleText,
    context: cleanContext,
    source: sq.source || '',
    isTrap: sq.isTrap,
  };
}

let initialFipi: FipiQuestion[] = (starterBank.fipi || []) as FipiQuestion[];
let initialSprint: SprintQuestion[] = (starterBank.sprint || []) as SprintQuestion[];
let initialWords: WordEntry[] = ((starterBank as any).words && (starterBank as any).words.length > 0)
  ? ((starterBank as any).words as WordEntry[])
  : (initialSprint.map(sprintToWordEntry).filter(Boolean) as WordEntry[]);

// В среде Node.js (при прогоне тестов) считываем полную базу заданий из локальных файлов
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  try {
    const getModule = (name: string): any => {
      if (typeof (process as any).getBuiltinModule === 'function') {
        return (process as any).getBuiltinModule(name);
      }
      if (typeof require !== 'undefined') {
        return require(name);
      }
      return null;
    };

    const fs = getModule('node:fs');
    const path = getModule('node:path');
    if (fs && path) {
      let dataDir = path.resolve(process.cwd(), 'src/data');
      if (!fs.existsSync(path.join(dataDir, 'fipiTasksBank9_15.json')) && !fs.existsSync(path.join(dataDir, 'fipiTasksBank.json'))) {
        dataDir = path.resolve(process.cwd(), 'public/data');
      }
      const fipiPath = fs.existsSync(path.join(dataDir, 'fipiTasksBank9_15.json'))
        ? path.join(dataDir, 'fipiTasksBank9_15.json')
        : path.join(dataDir, 'fipiTasksBank.json');
      if (fs.existsSync(fipiPath)) {
        initialFipi = JSON.parse(fs.readFileSync(fipiPath, 'utf8'));
      }
      const sprintPath = fs.existsSync(path.join(dataDir, 'sprintBank9_15.json'))
        ? path.join(dataDir, 'sprintBank9_15.json')
        : path.join(dataDir, 'sprintBank.json');
      if (fs.existsSync(sprintPath)) {
        initialSprint = JSON.parse(fs.readFileSync(sprintPath, 'utf8'));
        initialWords = initialSprint.map(sprintToWordEntry).filter(Boolean) as WordEntry[];
      }
    }
  } catch (err) {
    // fallback на starterBank
  }
}

export const PARSED_WORDS: WordEntry[] = [...initialWords];
export const PARSED_FIPI_QUESTIONS: FipiQuestion[] = [...initialFipi];
export const PARSED_SPRINT_QUESTIONS: SprintQuestion[] = [...initialSprint];

export const PARSED_TASKS_MAP: Record<TaskId, FipiQuestion[]> = {
  '4': [], '5': [], '6': [], '7': [], '8': [],
  '9': [], '10': [], '11': [], '12': [], '13': [], '14': [], '15': [],
  '16': [], '17': [], '18': [], '19': [], '20': [], '21': [], '22': [],
};

export const PARSED_WORDS_DATABASE: Record<TaskId, WordEntry[]> = {
  '4': [], '5': [], '6': [], '7': [], '8': [],
  '9': [], '10': [], '11': [], '12': [], '13': [], '14': [], '15': [],
  '16': [], '17': [], '18': [], '19': [], '20': [], '21': [], '22': [],
};

export function refreshMaps() {
  for (const t of ALL_TASK_IDS_LIST) {
    PARSED_TASKS_MAP[t] = PARSED_FIPI_QUESTIONS.filter((q) => {
      if (String(q.task) !== t) return false;
      if (!Array.isArray(q.rows) || q.rows.length === 0) return false;
      if (!Array.isArray(q.correctIndices) || q.correctIndices.length === 0) return false;
      return true;
    });
    PARSED_WORDS_DATABASE[t] = PARSED_WORDS.filter((w) => String(w.task) === t);
  }
}

refreshMaps();

// Очищаем устаревший кэш с урезанной или поврежденной базой
const CURRENT_BANK_CACHE = 'ege-bank-cache-v34';
if (typeof window !== 'undefined' && 'caches' in window) {
  try {
    window.caches.keys().then((keys) => {
      keys.forEach((key) => {
        if (key.startsWith('ege-bank-cache-') && key !== CURRENT_BANK_CACHE) {
          window.caches.delete(key).catch(() => {});
        }
      });
    }).catch(() => {});
  } catch {}
}

async function fetchJsonWithCache(url: string, fallbackUrls: string[] = []): Promise<any> {
  const cacheName = CURRENT_BANK_CACHE;
  let cache: Cache | null = null;
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      cache = await window.caches.open(cacheName);
      const cached = await cache.match(url);
      if (cached) {
        const cachedData = await cached.json();
        const count = Array.isArray(cachedData) ? cachedData.length : cachedData?.words?.length || 0;
        if (count >= 20000 || (url.includes('fipiTasks') && count >= 6000) || (url.includes('sprint') && count >= 20000)) {
          return cachedData;
        }
      }
    } catch {}
  }

  // 1. Попытка загрузки из локальной или fallback баз (ветка data в GitHub)
  const allUrls = [url, ...fallbackUrls];
  for (const targetUrl of allUrls) {
    try {
      const res = await fetch(targetUrl);
      if (res.ok) {
        if (cache) {
          try {
            await cache.put(url, res.clone());
          } catch {}
        }
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.warn(`[EGE Bank] Fetch error for ${targetUrl}:`, err);
    }
  }

  return null;
}

let isFullBankLoaded = false;
let isFullBankLoading = false;

export async function loadFullDataBank(): Promise<boolean> {
  if (isFullBankLoaded || isFullBankLoading) return isFullBankLoaded;
  isFullBankLoading = true;

  try {
    const rawGithubBase = 'https://raw.githubusercontent.com/ffpebc/9-15/data/public/data';
    const vParam = '?v=34';
    const [fipiData, sprintData] = await Promise.all([
      fetchJsonWithCache(`/data/fipiTasksBank9_15.json${vParam}`, [
        `./data/fipiTasksBank9_15.json${vParam}`,
        `${rawGithubBase}/fipiTasksBank9_15.json${vParam}`,
        `${rawGithubBase}/fipiTasksBank.json${vParam}`,
      ]),
      fetchJsonWithCache(`/data/sprintBank9_15.json${vParam}`, [
        `./data/sprintBank9_15.json${vParam}`,
        `${rawGithubBase}/sprintBank9_15.json${vParam}`,
        `${rawGithubBase}/sprintBank.json${vParam}`,
      ]),
    ]);

    let updated = false;

    if (Array.isArray(fipiData) && fipiData.length > 0) {
      PARSED_FIPI_QUESTIONS.length = 0;
      PARSED_FIPI_QUESTIONS.push(...fipiData);
      updated = true;
    }

    if (Array.isArray(sprintData) && sprintData.length > 0) {
      PARSED_SPRINT_QUESTIONS.length = 0;
      PARSED_SPRINT_QUESTIONS.push(...sprintData);
      PARSED_WORDS.length = 0;
      PARSED_WORDS.push(...(sprintData.map(sprintToWordEntry).filter(Boolean) as WordEntry[]));
      updated = true;
    }

    if (updated) {
      refreshMaps();
      isFullBankLoaded = true;

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ege-bank-loaded', {
            detail: {
              totalWords: PARSED_WORDS.length,
              totalFipi: PARSED_FIPI_QUESTIONS.length,
              totalSprint: PARSED_SPRINT_QUESTIONS.length,
            },
          })
        );
      }
    }
    return true;
  } catch (err) {
    console.error('[EGE Bank] Failed to load full bank:', err);
    return false;
  } finally {
    isFullBankLoading = false;
  }
}

// Запуск моментальной фоновой подгрузки без ожидания
if (typeof window !== 'undefined') {
  loadFullDataBank();
}
