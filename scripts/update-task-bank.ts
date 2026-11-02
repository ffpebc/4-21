import fs from 'node:fs';
import path from 'node:path';
import type { TaskId, FipiQuestion, SprintQuestion } from '../src/utils/trainerLogic.ts';
import { parseFipiOfficial } from './parser-fipi.ts';
import { parseShkolkovo } from './parser-shkolkovo.ts';
import type { WordEntry } from './normalizer.ts';

export interface UpdateBankOptions {
  source?: 'all' | 'fipi' | 'shkolkovo';
  tasks?: TaskId[];
  limitPerCategory?: number;
  useCache?: boolean;
  dryRun?: boolean;
}

export interface BankDatabaseBundle {
  metadata: {
    generatedAt: string;
    schoolYear: string;
    version: string;
    sources: string[];
    taskCounts: Record<TaskId, number>;
    totalTasks: number;
    totalSprintQuestions: number;
    totalWords: number;
  };
  tasks: Record<TaskId, FipiQuestion[]>;
  fipiQuestions: FipiQuestion[];
  sprintQuestions: SprintQuestion[];
  words: WordEntry[];
}

export async function updateTaskBank(options: UpdateBankOptions = {}): Promise<BankDatabaseBundle> {
  const source = options.source || 'all';
  const tasksFilter = options.tasks;
  const limit = options.limitPerCategory;

  console.log('================================================================');
  console.log('  ЕГЭ РУССКИЙ ЯЗЫК 9–13: ОБНОВЛЕНИЕ БАНКА ЗАДАНИЙ НА 2026–2027');
  console.log('================================================================');
  console.log(`Режим источников: ${source.toUpperCase()}`);
  if (tasksFilter) console.log(`Фильтр заданий: ${tasksFilter.join(', ')}`);
  if (limit) console.log(`Лимит на категорию: ${limit}`);

  const allFipiQuestions: FipiQuestion[] = [];
  const allSprintQuestions: SprintQuestion[] = [];
  const allWords: WordEntry[] = [];
  const recordedSources = new Set<string>();

  // 1. Parse official FIPI materials
  if (source === 'all' || source === 'fipi') {
    console.log('\n[1/2] Парсинг официальных КИМ ФИПИ (2026-2027 и 2025)...');
    const fipiResult = parseFipiOfficial();
    for (const q of fipiResult.fipiQuestions) {
      if (!tasksFilter || tasksFilter.includes(q.task)) {
        allFipiQuestions.push(q);
        recordedSources.add('ФИПИ (Официальные Демоверсии 2025–2027)');
      }
    }
    for (const sp of fipiResult.sprintQuestions) {
      if (!tasksFilter || tasksFilter.includes(sp.task)) {
        allSprintQuestions.push(sp);
      }
    }
    for (const w of fipiResult.words) {
      if (!tasksFilter || tasksFilter.includes(w.task)) {
        allWords.push(w);
      }
    }
    console.log(`  ✓ Получено из ФИПИ: ${fipiResult.fipiQuestions.length} целых заданий, ${fipiResult.sprintQuestions.length} спринт-карточек, ${fipiResult.words.length} слов.`);
  }

  // 2. Parse Shkolkovo catalog
  if (source === 'all' || source === 'shkolkovo') {
    console.log('\n[2/2] Парсинг базы Школково (Дощинский-2026, Банк ФИПИ, Реальный ЕГЭ, Демоверсии)...');
    const shkolkovoResult = await parseShkolkovo({
      tasks: tasksFilter,
      limitPerCategory: limit,
      useCache: options.useCache !== false,
    });

    for (const q of shkolkovoResult.fipiQuestions) {
      allFipiQuestions.push(q);
      recordedSources.add('Школково (Дощинский-2026, Банк ФИПИ, Авторские)');
    }
    for (const sp of shkolkovoResult.sprintQuestions) {
      allSprintQuestions.push(sp);
    }
    for (const w of shkolkovoResult.words) {
      allWords.push(w);
    }
    console.log(`  ✓ Получено из Школково: ${shkolkovoResult.fipiQuestions.length} целых заданий, ${shkolkovoResult.sprintQuestions.length} спринт-карточек, ${shkolkovoResult.words.length} слов.`);
  }

  // Deduplicate and validate Fipi Questions
  const fipiById = new Map<string, FipiQuestion>();
  for (const q of allFipiQuestions) {
    if (!fipiById.has(q.id)) {
      // Validate 5 rows and correctIndices between 1 and 5
      if (
        q.rows.length === 5 &&
        q.correctIndices.length >= 2 &&
        q.correctIndices.length <= 4 &&
        q.correctIndices.every((i) => i >= 1 && i <= 5)
      ) {
        fipiById.set(q.id, q);
      }
    }
  }

  const finalFipiQuestions = Array.from(fipiById.values());

  // Deduplicate and validate Sprint Questions
  const sprintById = new Map<string, SprintQuestion>();
  for (const sp of allSprintQuestions) {
    if (!sprintById.has(sp.id)) {
      sprintById.set(sp.id, sp);
    }
  }
  const finalSprintQuestions = Array.from(sprintById.values());

  // Deduplicate and index Words Database
  const wordsByUniqueKey = new Map<string, WordEntry>();
  for (const w of allWords) {
    const key = `${w.task}-${w.word.toLowerCase()}-${w.context || ''}`;
    if (!wordsByUniqueKey.has(key)) {
      wordsByUniqueKey.set(key, w);
    }
  }
  const finalWords = Array.from(wordsByUniqueKey.values()).sort((a, b) =>
    a.word.localeCompare(b.word, 'ru')
  );

  // Group by task ID
  const tasksMap: Record<TaskId, FipiQuestion[]> = {
    '4': [],
    '5': [],
    '6': [],
    '7': [],
    '8': [],
    '9': [],
    '10': [],
    '11': [],
    '12': [],
    '13': [],
    '14': [],
    '15': [],
    '16': [],
    '17': [],
    '18': [],
    '19': [],
    '20': [],
    '21': [],
    '22': [],
  };

  const taskCounts: Record<TaskId, number> = {
    '4': 0,
    '5': 0,
    '6': 0,
    '7': 0,
    '8': 0,
    '9': 0,
    '10': 0,
    '11': 0,
    '12': 0,
    '13': 0,
    '14': 0,
    '15': 0,
    '16': 0,
    '17': 0,
    '18': 0,
    '19': 0,
    '20': 0,
    '21': 0,
    '22': 0,
  };

  for (const q of finalFipiQuestions) {
    tasksMap[q.task].push(q);
    taskCounts[q.task]++;
  }

  const bundle: BankDatabaseBundle = {
    metadata: {
      generatedAt: new Date().toISOString(),
      schoolYear: '2026-2027',
      version: '2.0.0-fipi-2027',
      sources: Array.from(recordedSources),
      taskCounts,
      totalTasks: finalFipiQuestions.length,
      totalSprintQuestions: finalSprintQuestions.length,
      totalWords: finalWords.length,
    },
    tasks: tasksMap,
    fipiQuestions: finalFipiQuestions,
    sprintQuestions: finalSprintQuestions,
    words: finalWords,
  };

  console.log('\n----------------------------------------------------------------');
  console.log('  ИТОГОВАЯ СТАТИСТИКА БАНКА 2026–2027:');
  console.log('----------------------------------------------------------------');
  console.log(`  Всего целых заданий 9–13:    ${bundle.metadata.totalTasks}`);
  console.log(`    • Задание №9 (Корни):      ${taskCounts['9']} заданий`);
  console.log(`    • Задание №10 (Приставки):  ${taskCounts['10']} заданий`);
  console.log(`    • Задание №11 (Суффиксы):   ${taskCounts['11']} заданий`);
  console.log(`    • Задание №12 (Спряжения):  ${taskCounts['12']} заданий`);
  console.log(`    • Задание №13 (НЕ и НИ):    ${taskCounts['13']} заданий`);
  console.log(`  Всего вопросов для Спринта:  ${bundle.metadata.totalSprintQuestions}`);
  console.log(`  Слов в базе орфографии:      ${bundle.metadata.totalWords}`);
  console.log('----------------------------------------------------------------');

  if (!options.dryRun) {
    // Write out files
    const srcDataDir = path.join(process.cwd(), 'src', 'data');
    const dotDataDir = path.join(process.cwd(), '.data');

    if (!fs.existsSync(srcDataDir)) fs.mkdirSync(srcDataDir, { recursive: true });
    if (!fs.existsSync(dotDataDir)) fs.mkdirSync(dotDataDir, { recursive: true });

    // 1. tasksBank2026_2027.json
    const tasksJson = JSON.stringify(bundle, null, 2);
    const srcTasksPath = path.join(srcDataDir, 'tasksBank2026_2027.json');
    const dotTasksPath = path.join(dotDataDir, 'tasks-bank-2026-2027.json');
    fs.writeFileSync(srcTasksPath, tasksJson, 'utf-8');
    fs.writeFileSync(dotTasksPath, tasksJson, 'utf-8');
    console.log(`  ✓ Сохранен банк задач: ${srcTasksPath}`);
    console.log(`  ✓ Сохранен банк задач: ${dotTasksPath}`);

    // 2. wordsDatabase2026_2027.json
    const wordsBundle = {
      metadata: {
        generatedAt: new Date().toISOString(),
        schoolYear: '2026-2027',
        totalWords: finalWords.length,
        taskBreakdown: {
          '9': finalWords.filter((w) => w.task === '9').length,
          '10': finalWords.filter((w) => w.task === '10').length,
          '11': finalWords.filter((w) => w.task === '11').length,
          '12': finalWords.filter((w) => w.task === '12').length,
          '13': finalWords.filter((w) => w.task === '13').length,
        },
      },
      words: finalWords,
    };
    const wordsJson = JSON.stringify(wordsBundle, null, 2);
    const srcWordsPath = path.join(srcDataDir, 'wordsDatabase2026_2027.json');
    const dotWordsPath = path.join(dotDataDir, 'words-database.json');
    fs.writeFileSync(srcWordsPath, wordsJson, 'utf-8');
    fs.writeFileSync(dotWordsPath, wordsJson, 'utf-8');
    console.log(`  ✓ Сохранена база слов: ${srcWordsPath}`);
    console.log(`  ✓ Сохранена база слов: ${dotWordsPath}`);

    // 3. tasksBankData.ts (Compact, deduplicated TypeScript module for instant cold start)
    const stringPool: string[] = [];
    const stringIndexMap = new Map<string, number>();
    const getStrIdx = (s: string): number => {
      const val = s || '';
      let idx = stringIndexMap.get(val);
      if (idx === undefined) {
        idx = stringPool.length;
        stringPool.push(val);
        stringIndexMap.set(val, idx);
      }
      return idx;
    };

    const compactFipiTuples = bundle.fipiQuestions.map((fq) => [
      fq.id,
      fq.task,
      getStrIdx(fq.topic),
      getStrIdx(fq.rule),
      fq.rows.map((r) => [
        r.words,
        r.solvedWords,
        r.letter,
        r.isCorrectRow ? 1 : 0,
        getStrIdx(r.explanation),
      ]),
      fq.correctIndices,
    ]);

    const compactSprintTuples = bundle.sprintQuestions.map((sq) => [
      sq.id,
      sq.task,
      getStrIdx(sq.topic),
      getStrIdx(sq.rule),
      sq.prefix,
      sq.suffix,
      sq.answer,
      sq.options[0],
      sq.options[1],
      sq.context,
      getStrIdx(sq.explanation),
      sq.isTrap ? 1 : 0,
    ]);

    const tsContent = `// Auto-generated by scripts/update-task-bank.ts on ${bundle.metadata.generatedAt}
// DO NOT EDIT MANUALLY. Run 'npm run update-bank' to refresh.
import type { FipiQuestion, SprintQuestion, TaskId } from '../utils/trainerLogic.ts';

export interface BankWordItem {
  id: string;
  task: TaskId;
  word: string;
  wordGap?: string;
  prefix?: string;
  missingLetter?: string;
  suffix?: string;
  topic?: string;
  category?: string;
  rule?: string;
  context?: string;
  source?: string;
}

export const BANK_METADATA = ${JSON.stringify(bundle.metadata, null, 2)} as const;

const SPRINT_STRINGS: string[] = ${JSON.stringify(stringPool)};

type CompactFipiRowTuple = [string[], string[], string, number, number];
type CompactFipiTuple = [string, TaskId, number, number, CompactFipiRowTuple[], number[]];

const RAW_FIPI_TUPLES: CompactFipiTuple[] = ${JSON.stringify(compactFipiTuples)};

export const PARSED_FIPI_QUESTIONS: FipiQuestion[] = RAW_FIPI_TUPLES.map((f) => ({
  id: f[0],
  kind: 'fipi',
  task: f[1],
  topic: SPRINT_STRINGS[f[2]],
  rule: SPRINT_STRINGS[f[3]],
  rows: f[4].map((r) => ({
    words: r[0],
    solvedWords: r[1],
    letter: r[2],
    isCorrectRow: Boolean(r[3]),
    explanation: SPRINT_STRINGS[r[4]],
  })),
  correctIndices: f[5],
}));

type CompactSprintTuple = [
  string,
  TaskId,
  number,
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  number
];

const RAW_SPRINT_TUPLES: CompactSprintTuple[] = ${JSON.stringify(compactSprintTuples)};

export const PARSED_SPRINT_QUESTIONS: SprintQuestion[] = RAW_SPRINT_TUPLES.map((t) => ({
  id: t[0],
  kind: 'sprint',
  task: t[1],
  topic: SPRINT_STRINGS[t[2]],
  rule: SPRINT_STRINGS[t[3]],
  prefix: t[4],
  suffix: t[5],
  answer: t[6],
  options: [t[7], t[8]],
  context: t[9],
  explanation: SPRINT_STRINGS[t[10]],
  ...(t[11] ? { isTrap: true } : {}),
}));

export const PARSED_TASKS_MAP: Record<TaskId, FipiQuestion[]> = {
  '9': [],
  '10': [],
  '11': [],
  '12': [],
  '13': [],
};
for (const q of PARSED_FIPI_QUESTIONS) {
  PARSED_TASKS_MAP[q.task].push(q);
}

let cachedWordsDb: BankWordItem[] | null = null;
export function getParsedWordsDatabase(): BankWordItem[] {
  if (cachedWordsDb) return cachedWordsDb;
  cachedWordsDb = PARSED_SPRINT_QUESTIONS.map((sq) => {
    const isTask13 = sq.task === '13';
    const word = isTask13
      ? sq.answer === 'СЛИТНО'
        ? \`\${sq.prefix.replace(/[()]/g, '')}\${sq.suffix.toLowerCase()}\`
        : \`\${sq.prefix.replace(/[()]/g, '')} \${sq.suffix.toLowerCase()}\`
      : \`\${sq.prefix}\${sq.answer === '—' ? '' : sq.answer.toUpperCase()}\${sq.suffix}\`;
    return {
      id: \`w-\${sq.id}\`,
      task: sq.task,
      word,
      wordGap: isTask13 ? \`\${sq.prefix}\${sq.suffix}\` : \`\${sq.prefix}..\${sq.suffix}\`,
      prefix: sq.prefix,
      missingLetter: sq.answer,
      suffix: sq.suffix,
      topic: sq.topic,
      category: sq.topic,
      rule: sq.explanation,
      context: sq.context,
      source: 'ФИПИ / Школково 2026–2027',
    };
  });
  return cachedWordsDb;
}

export const PARSED_WORDS_DATABASE: BankWordItem[] = [];
`;
    const srcTsPath = path.join(process.cwd(), 'src', 'data', 'tasksBankData.ts');
    fs.writeFileSync(srcTsPath, tsContent, 'utf-8');
    console.log(`  ✓ Сгенерирован компактный TypeScript-модуль банка: ${srcTsPath}`);
  }

  return bundle;
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('update-task-bank.ts')) {
  const args = process.argv.slice(2);
  const options: UpdateBankOptions = {};

  for (const arg of args) {
    if (arg === '--fipi-only') options.source = 'fipi';
    else if (arg === '--shkolkovo-only') options.source = 'shkolkovo';
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--no-cache') options.useCache = false;
    else if (arg.startsWith('--limit=')) {
      options.limitPerCategory = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--tasks=')) {
      options.tasks = arg.split('=')[1].split(',') as TaskId[];
    }
  }

  updateTaskBank(options)
    .then(() => {
      console.log('\nОбновление банка задач 2026-2027 успешно завершено!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\nОшибка обновления банка задач:', err);
      process.exit(1);
    });
}
