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

let initialWords: WordEntry[] = (starterBank.words || []) as WordEntry[];
let initialFipi: FipiQuestion[] = (starterBank.fipi || []) as FipiQuestion[];
let initialSprint: SprintQuestion[] = (starterBank.sprint || []) as SprintQuestion[];

// В среде Node.js (при прогоне тестов) считываем полную базу из локальных файлов
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
      if (!fs.existsSync(path.join(dataDir, 'allWordsBank9_15.json'))) {
        dataDir = path.resolve(process.cwd(), 'public/data');
      }
      const allWordsPath = path.join(dataDir, 'allWordsBank9_15.json');
      if (fs.existsSync(allWordsPath)) {
        const parsed = JSON.parse(fs.readFileSync(allWordsPath, 'utf8'));
        initialWords = Array.isArray(parsed) ? parsed : parsed.words || [];
      }
      const fipiPath = path.join(dataDir, 'fipiTasksBank9_15.json');
      if (fs.existsSync(fipiPath)) {
        initialFipi = JSON.parse(fs.readFileSync(fipiPath, 'utf8'));
      }
      const sprintPath = path.join(dataDir, 'sprintBank9_15.json');
      if (fs.existsSync(sprintPath)) {
        initialSprint = JSON.parse(fs.readFileSync(sprintPath, 'utf8'));
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
if (typeof window !== 'undefined' && 'caches' in window) {
  try {
    for (let v = 1; v <= 23; v++) {
      window.caches.delete(`ege-bank-cache-v${v}`);
    }
  } catch {}
}

async function fetchJsonWithCache(url: string, fallbackUrls: string[] = []): Promise<any> {
  const cacheName = 'ege-bank-cache-v24';
  let cache: Cache | null = null;
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      cache = await window.caches.open(cacheName);
      const cached = await cache.match(url);
      if (cached) {
        const cachedData = await cached.json();
        const count = Array.isArray(cachedData) ? cachedData.length : cachedData?.words?.length || 0;
        if (count >= 20000 || (url.includes('fipiTasks') && count >= 5000) || (url.includes('sprint') && count >= 20000)) {
          return cachedData;
        }
      }
    } catch {}
  }

  // 1. Попытка загрузки из локальной или fallback CDN баз (ветка data в GitHub)
  const allUrls = [url, ...fallbackUrls];
  for (const targetUrl of allUrls) {
    try {
      const res = await fetch(targetUrl);
      if (res.ok) {
        const data = await res.json();
        if (cache) {
          try {
            await cache.put(url, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }));
          } catch {}
        }
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
    const localBase = '/data';
    const rawGithubBase = 'https://raw.githubusercontent.com/ffpebc/9-15/data/public/data';
    const cdnBase = 'https://cdn.jsdelivr.net/gh/ffpebc/9-15@data/public/data';
    const vParam = '?v=24';
    const [allWordsData, fipiData, sprintData] = await Promise.all([
      fetchJsonWithCache(`${localBase}/allWordsBank9_15.json${vParam}`, [
        `${rawGithubBase}/allWordsBank9_15.json${vParam}`,
        `${cdnBase}/allWordsBank9_15.json${vParam}`,
        `${rawGithubBase}/allWordsBank.json${vParam}`,
        `${cdnBase}/allWordsBank.json${vParam}`,
      ]),
      fetchJsonWithCache(`${localBase}/fipiTasksBank9_15.json${vParam}`, [
        `${rawGithubBase}/fipiTasksBank9_15.json${vParam}`,
        `${cdnBase}/fipiTasksBank9_15.json${vParam}`,
        `${rawGithubBase}/fipiTasksBank.json${vParam}`,
        `${cdnBase}/fipiTasksBank.json${vParam}`,
      ]),
      fetchJsonWithCache(`${localBase}/sprintBank9_15.json${vParam}`, [
        `${rawGithubBase}/sprintBank9_15.json${vParam}`,
        `${cdnBase}/sprintBank9_15.json${vParam}`,
        `${rawGithubBase}/sprintBank.json${vParam}`,
        `${cdnBase}/sprintBank.json${vParam}`,
      ]),
    ]);

    let updated = false;

    if (allWordsData) {
      const wordsArr = Array.isArray(allWordsData) ? allWordsData : allWordsData.words || [];
      if (wordsArr.length > 0) {
        PARSED_WORDS.length = 0;
        PARSED_WORDS.push(...wordsArr);
        updated = true;
      }
    }

    if (Array.isArray(fipiData) && fipiData.length > 0) {
      PARSED_FIPI_QUESTIONS.length = 0;
      PARSED_FIPI_QUESTIONS.push(...fipiData);
      updated = true;
    }

    if (Array.isArray(sprintData) && sprintData.length > 0) {
      PARSED_SPRINT_QUESTIONS.length = 0;
      PARSED_SPRINT_QUESTIONS.push(...sprintData);
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
