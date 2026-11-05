import fs from 'node:fs';
import path from 'node:path';
import type { TaskId, FipiQuestion, SprintQuestion } from '../src/utils/trainerLogic.ts';
import {
  cleanHtmlText,
  normalizeRawQuestionToTrainer,
} from './normalizer.ts';
import type {
  RawParsedQuestion,
  WordEntry,
} from './normalizer.ts';

export interface ShkolkovoCategoryConfig {
  task: TaskId;
  name: string;
  id: number;
  priority: number;
}

export const SHKOLKOVO_CATEGORIES: ShkolkovoCategoryConfig[] = [
  // Task 4: Ударения
  { task: '4', name: '4. Дощинский-2026 (36 вар.)', id: 10598, priority: 1 },
  { task: '4', name: '4. Авторские задания', id: 3746, priority: 2 },
  { task: '4', name: '4. Банк ФИПИ', id: 2309, priority: 3 },

  // Task 5: Паронимы
  { task: '5', name: '5. Дощинский-2026 (36 вар.)', id: 10454, priority: 1 },
  { task: '5', name: '5. Банк ФИПИ', id: 2376, priority: 2 },
  { task: '5', name: '5. Авторские задания', id: 248, priority: 3 },

  // Task 6: Лексические нормы
  { task: '6', name: '6. Дощинский-2026 (36 вар.)', id: 10474, priority: 1 },
  { task: '6', name: '6. Банк ФИПИ', id: 2403, priority: 2 },
  { task: '6', name: '6. Авторские задания', id: 215, priority: 3 },

  // Task 7: Морфологические нормы
  { task: '7', name: '7. Дощинский-2026 (36 вар.)', id: 10673, priority: 1 },
  { task: '7', name: '7. Банк ФИПИ', id: 2377, priority: 2 },
  { task: '7', name: '7. Авторские задания', id: 216, priority: 3 },

  // Task 8: Синтаксические нормы
  { task: '8', name: '8. Дощинский-2026 (36 вар.)', id: 11947, priority: 1 },
  { task: '8', name: '8. Банк ФИПИ', id: 2402, priority: 2 },
  { task: '8', name: '8. Авторские задания', id: 217, priority: 3 },

  // Task 9: Правописание корней
  { task: '9', name: '9. Дощинский-2026 (36 вар.)', id: 11550, priority: 1 },
  { task: '9', name: '9. Демоверсии', id: 2342, priority: 2 },
  { task: '9', name: '9. Банк ФИПИ', id: 2378, priority: 3 },
  { task: '9', name: '9. Реальный ЕГЭ', id: 9089, priority: 4 },
  { task: '9', name: '9. Авторские задания', id: 3747, priority: 5 },

  // Task 10: Правописание приставок
  { task: '10', name: '10. Дощинский-2026 (36 вар.)', id: 11551, priority: 1 },
  { task: '10', name: '10. Демоверсии', id: 2343, priority: 2 },
  { task: '10', name: '10. Банк ФИПИ', id: 2312, priority: 3 },
  { task: '10', name: '10. Реальный ЕГЭ', id: 9090, priority: 4 },
  { task: '10', name: '10. Авторские задания', id: 3766, priority: 5 },

  // Task 11: Правописание суффиксов
  { task: '11', name: '11. Дощинский-2026 (36 вар.)', id: 11552, priority: 1 },
  { task: '11', name: '11. Демоверсии', id: 2344, priority: 2 },
  { task: '11', name: '11. Банк ФИПИ', id: 2313, priority: 3 },
  { task: '11', name: '11. Реальный ЕГЭ', id: 9091, priority: 4 },
  { task: '11', name: '11. Авторские задания', id: 3767, priority: 5 },

  // Task 12: Спряжения и личные окончания
  { task: '12', name: '12. Дощинский-2026 (36 вар.)', id: 10979, priority: 1 },
  { task: '12', name: '12. Демоверсии', id: 2345, priority: 2 },
  { task: '12', name: '12. Банк ФИПИ', id: 2379, priority: 3 },
  { task: '12', name: '12. Реальный ЕГЭ', id: 9092, priority: 4 },
  { task: '12', name: '12. Авторские задания', id: 3768, priority: 5 },

  // Task 13: Правописание НЕ и НИ
  { task: '13', name: '13. Дощинский-2026 (36 вар.)', id: 11553, priority: 1 },
  { task: '13', name: '13. Демоверсии', id: 2346, priority: 2 },
  { task: '13', name: '13. Банк ФИПИ', id: 2315, priority: 3 },
  { task: '13', name: '13. Реальный ЕГЭ', id: 9093, priority: 4 },
  { task: '13', name: '13. Авторские задания', id: 6456, priority: 5 },

  // Task 14: Слитное, дефисное, раздельное написание
  { task: '14', name: '14. Дощинский-2026 (36 вар.)', id: 11554, priority: 1 },
  { task: '14', name: '14. Банк ФИПИ', id: 2316, priority: 2 },
  { task: '14', name: '14. Авторские задания', id: 218, priority: 3 },

  // Task 15: Правописание Н и НН
  { task: '15', name: '15. Дощинский-2026 (36 вар.)', id: 12549, priority: 1 },
  { task: '15', name: '15. Банк ФИПИ', id: 2397, priority: 2 },
  { task: '15', name: '15. Авторские задания', id: 219, priority: 3 },

  // Task 16: Пунктуация в ССП и с однородными
  { task: '16', name: '16. Дощинский-2026 (36 вар.)', id: 12623, priority: 1 },
  { task: '16', name: '16. Банк ФИПИ', id: 2398, priority: 2 },
  { task: '16', name: '16. Авторские задания', id: 1656, priority: 3 },

  // Task 17: Обособленные члены
  { task: '17', name: '17. Дощинский-2026 (36 вар.)', id: 13432, priority: 1 },
  { task: '17', name: '17. Банк ФИПИ', id: 2399, priority: 2 },

  // Task 18: Вводные слова и обращения
  { task: '18', name: '18. Дощинский-2026 (36 вар.)', id: 13480, priority: 1 },
  { task: '18', name: '18. Банк ФИПИ', id: 2400, priority: 2 },

  // Task 19: Знаки в СПП
  { task: '19', name: '19. Дощинский-2026 (36 вар.)', id: 13637, priority: 1 },
  { task: '19', name: '19. Банк ФИПИ', id: 2401, priority: 2 },

  // Task 20: Знаки с разными видами связи
  { task: '20', name: '20. Дощинский-2026 (36 вар.)', id: 13638, priority: 1 },
  { task: '20', name: '20. Демоверсии', id: 2348, priority: 2 },

  // Task 21: Пунктуационный анализ
  { task: '21', name: '21. Дощинский-2026 (36 вар.)', id: 13727, priority: 1 },
  { task: '21', name: '21. Демоверсии', id: 2347, priority: 2 },

  // Task 22: Языковые средства выразительности
  { task: '22', name: '22. Дощинский-2026 (36 вар.)', id: 14369, priority: 1 },
  { task: '22', name: '22. Демоверсии', id: 2346, priority: 2 },
];

export interface ShkolkovoParseOptions {
  categories?: number[];
  tasks?: TaskId[];
  limitPerCategory?: number;
  useCache?: boolean;
  cacheDir?: string;
}

export interface ShkolkovoParseResult {
  fipiQuestions: FipiQuestion[];
  sprintQuestions: SprintQuestion[];
  words: WordEntry[];
  totalParsed: number;
}

export function extractQuestionListFromHtml(html: string): any {
  const startIdx = html.indexOf('"questionList":');
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  let endIdx = -1;
  const jsonStart = startIdx + '"questionList":'.length;

  for (let i = jsonStart; i < html.length; i++) {
    const ch = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') {
        depth--;
        if (depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
  }

  if (endIdx === -1) return null;
  try {
    return JSON.parse(html.slice(jsonStart, endIdx));
  } catch (e) {
    return null;
  }
}

export function parseShkolkovoQuestionHtml(qHtml: string, task: TaskId): {
  instruction: string;
  source: string;
  rows: Array<{ rowNum: number; rawText: string; words: string[] }>;
} {
  const clean = cleanHtmlText(qHtml);
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

  let instruction = '';
  let source = '';
  const rows: Array<{ rowNum: number; rawText: string; words: string[] }> = [];

  for (const line of lines) {
    const rowMatch = line.match(/^([1-5])\)\s*(.*)/);
    if (rowMatch) {
      const rowNum = parseInt(rowMatch[1], 10);
      const rawText = rowMatch[2].trim();

      let words: string[] = [];
      if (task === '13') {
        words = [rawText];
      } else {
        // Tasks 9, 10, 11, 12: split words by comma
        words = rawText.split(',').map((w) => w.trim()).filter(Boolean);
      }

      rows.push({ rowNum, rawText, words });
    } else if (line.startsWith('(') && line.endsWith(')')) {
      source = line.slice(1, -1).trim();
    } else if (!instruction && (line.includes('Укажите варианты') || line.includes('ответов'))) {
      instruction = line;
    }
  }

  if (!instruction) {
    if (task === '13') {
      instruction = 'Укажите варианты ответов, в которых НЕ (НИ) с выделенным словом пишется СЛИТНО. Запишите номера ответов.';
    } else if (task === '11' || task === '12') {
      instruction = 'Укажите варианты ответов, в которых в обоих словах одного ряда пропущена одна и та же буква. Запишите номера ответов.';
    } else {
      instruction = 'Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов.';
    }
  }

  return { instruction, source, rows };
}

export function parseShkolkovoSolutionHtml(sHtml: string, task: TaskId): {
  rowsExplanation: string[];
  lettersByRow: string[];
} {
  const clean = cleanHtmlText(sHtml);
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

  const rowsExplanation: string[] = ['', '', '', '', ''];
  let currentRow: number | null = null;

  for (const line of lines) {
    const match = line.match(/^([1-5])\)\s*(.*)/);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      currentRow = idx;
      rowsExplanation[idx] = (rowsExplanation[idx] ? rowsExplanation[idx] + ' ' : '') + match[2];
    } else if (currentRow !== null && !line.startsWith('Ответ:')) {
      rowsExplanation[currentRow] += ' ' + line;
    }
  }

  // Extract letters per row
  const lettersByRow: string[] = ['', '', '', '', ''];

  if (task === '13') {
    rowsExplanation.forEach((exp, idx) => {
      const lower = exp.toLowerCase();
      if (lower.includes('слитно')) {
        lettersByRow[idx] = 'СЛИТНО';
      } else if (lower.includes('раздельно')) {
        lettersByRow[idx] = 'РАЗДЕЛЬНО';
      } else {
        lettersByRow[idx] = '—';
      }
    });
  } else {
    // For tasks 9-12, extract strong letters from HTML for each row
    // Look at each paragraph in sHtml
    const pMatches = [...sHtml.matchAll(/<p[^>]*>(.*?)<\/p>/gis)];
    let pIdx = 0;
    for (const p of pMatches) {
      const pText = cleanHtmlText(p[1]);
      const rowMatch = pText.match(/^([1-5])\)/);
      if (rowMatch) {
        const rNum = parseInt(rowMatch[1], 10) - 1;
        const strongs = [...p[1].matchAll(/<strong>\s*([А-ЯЁа-яё])\s*<\/strong>/gi)].map((m) =>
          m[1].toUpperCase()
        );
        if (strongs.length > 0) {
          const allSame = strongs.every((s) => s === strongs[0]);
          lettersByRow[rNum] = allSame ? strongs[0] : '—';
        }
      }
    }
  }

  return { rowsExplanation, lettersByRow };
}

export async function parseShkolkovo(
  options: ShkolkovoParseOptions = {}
): Promise<ShkolkovoParseResult> {
  const cacheDir = options.cacheDir || path.join(process.cwd(), '.cache', 'shkolkovo');
  if (options.useCache !== false && !fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const selectedCategories = SHKOLKOVO_CATEGORIES.filter((c) => {
    if (options.tasks && !options.tasks.includes(c.task)) return false;
    if (options.categories && !options.categories.includes(c.id)) return false;
    return true;
  });

  const fipiQuestions: FipiQuestion[] = [];
  const sprintQuestions: SprintQuestion[] = [];
  const words: WordEntry[] = [];
  let totalParsed = 0;

  for (const cat of selectedCategories) {
    const cacheFile = path.join(cacheDir, `cat_${cat.id}.json`);
    let qList: any = null;

    if (options.useCache !== false && fs.existsSync(cacheFile)) {
      try {
        qList = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      } catch (e) {
        qList = null;
      }
    }

    if (!qList) {
      try {
        const url = `https://3.shkolkovo.online/catalog/${cat.id}`;
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[Shkolkovo Parser] Category ${cat.id} returned status ${res.status}`);
          continue;
        }
        const html = await res.text();
        qList = extractQuestionListFromHtml(html);
        if (qList && options.useCache !== false) {
          fs.writeFileSync(cacheFile, JSON.stringify(qList), 'utf-8');
        }
      } catch (err: any) {
        console.warn(`[Shkolkovo Parser] Failed to fetch category ${cat.id}: ${err.message}`);
        continue;
      }
    }

    if (!qList || !qList.questions || !Array.isArray(qList.questions)) {
      continue;
    }

    const questionsToProcess = options.limitPerCategory
      ? qList.questions.slice(0, options.limitPerCategory)
      : qList.questions;

    for (const q of questionsToProcess) {
      try {
        const qHtml = qList.dependencies?.TexSessionsMap?.[q.QuestionTexSessionId]?.Html || '';
        const sHtml = qList.dependencies?.TexSessionsMap?.[q.SolutionTexSessionId]?.Html || '';
        const answerRaw = String(q.Answer?.text || '').trim();

        // Parse answer digits 1-5
        const answerDigits = [...new Set(answerRaw.match(/[1-5]/g) || [])]
          .map((d) => parseInt(d, 10))
          .sort((a, b) => a - b);

        if (answerDigits.length < 2 || answerDigits.length > 4) {
          // If answer digits are invalid, skip
          continue;
        }

        const parsedQ = parseShkolkovoQuestionHtml(qHtml, cat.task);
        if (parsedQ.rows.length !== 5) {
          // Official format must have exactly 5 rows
          continue;
        }

        const parsedS = parseShkolkovoSolutionHtml(sHtml, cat.task);

        const rows = parsedQ.rows.map((r, rIdx) => {
          const isCorrect = answerDigits.includes(r.rowNum);
          const letter = parsedS.lettersByRow[rIdx] || (isCorrect ? '✓' : '—');
          const explanation = parsedS.rowsExplanation[rIdx] || r.rawText;

          return {
            rawText: r.rawText,
            words: r.words,
            solvedWords: r.words,
            letter,
            explanation,
          };
        });

        const rawObj: RawParsedQuestion = {
          externalId: `shkolkovo-${cat.task}-${q.Id}`,
          task: cat.task,
          source: parsedQ.source || `${cat.name} (№${q.Name || q.Id})`,
          instruction: parsedQ.instruction,
          rows,
          correctIndices: answerDigits,
        };

        const normalized = normalizeRawQuestionToTrainer(rawObj);
        fipiQuestions.push(normalized.fipiQuestion);
        sprintQuestions.push(...normalized.sprintQuestions);
        words.push(...normalized.words);
        totalParsed++;
      } catch (err: any) {
        // Keep parsing remaining questions
      }
    }
  }

  return {
    fipiQuestions,
    sprintQuestions,
    words,
    totalParsed,
  };
}

if (process.argv[1] && process.argv[1].endsWith('parser-shkolkovo.ts')) {
  console.log('--- Testing Shkolkovo Parser ---');
  parseShkolkovo({ limitPerCategory: 5 }).then((res) => {
    console.log(`Parsed ${res.fipiQuestions.length} FIPI questions`);
    console.log(`Extracted ${res.sprintQuestions.length} Sprint questions`);
    console.log(`Extracted ${res.words.length} Words`);
    if (res.fipiQuestions[0]) {
      console.log('Sample Task 9:', res.fipiQuestions[0].id, res.fipiQuestions[0].rule);
      console.log('Sample Rows:', res.fipiQuestions[0].rows);
      console.log('Answer:', res.fipiQuestions[0].correctIndices);
    }
  });
}
