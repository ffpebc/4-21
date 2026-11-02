import type { TaskId, FipiQuestion, FipiRow, SprintQuestion } from '../src/utils/trainerLogic.ts';
import { classifyWordSubtopicAndException } from '../src/utils/wordClassifier.ts';
export { classifyWordSubtopicAndException };

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

export interface RawParsedQuestion {
  externalId: string | number;
  task: TaskId;
  source: string;
  topic?: string;
  rule?: string;
  instruction: string;
  rows: Array<{
    rowNumber?: number;
    rawText: string;
    words: string[];
    solvedWords?: string[];
    letter?: string;
    isCorrect?: boolean;
    explanation?: string;
  }>;
  correctIndices: number[];
  rawAnswerString?: string;
}

export function cleanHtmlText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&laquo;/gi, '«')
    .replace(/&raquo;/gi, '»')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&aacute;/gi, 'а́')
    .replace(/[ \t]+/g, ' ')
    .trim();
}
export const cleanHtmlToText = cleanHtmlText;

export function parseWordGap(rawWordWithContext: string): {
  prefix: string;
  suffix: string;
  context: string;
  cleanWordGap: string;
} | null {
  let clean = rawWordWithContext.trim().replace(/^[,;.\s]+|[,;.\s]+$/g, '');
  if (!clean) return null;

  let context = '';
  const parenMatch = clean.match(/\(([^)]+)\)/);
  if (parenMatch && !clean.startsWith('(НЕ)') && !clean.startsWith('(НИ)')) {
    context = `(${parenMatch[1].trim()})`;
    clean = clean.replace(parenMatch[0], '').trim();
  }

  const parts = clean.split(/\s+/);
  if (parts.length > 1) {
    const gapTokenIdx = parts.findIndex((p) => /\.\.|__|\(НЕ\)|\(НИ\)/i.test(p));
    if (gapTokenIdx !== -1) {
      const gapToken = parts[gapTokenIdx];
      const otherTokens = parts.filter((_, i) => i !== gapTokenIdx).join(' ');
      context = context ? `${context} ${otherTokens}` : `(${otherTokens})`;
      clean = gapToken;
    }
  }

  const gapIdx = clean.search(/\.\.+|_{1,}/);
  if (gapIdx === -1) {
    return null;
  }

  const gapMatch = clean.match(/\.\.+|_{1,}/)![0];
  const prefix = clean.slice(0, gapIdx).trim();
  const suffix = clean.slice(gapIdx + gapMatch.length).trim();
  const cleanWordGap = `${prefix}..${suffix}`;

  return {
    prefix,
    suffix,
    context,
    cleanWordGap,
  };
}

function splitTopLevelCommas(str: string): string[] {
  const cleaned = str.replace(/\.\s*(?:Везде буква|Буквы разные)[^.]*\.?$/i, '').trim();
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '(') depth++;
    else if (ch === ')' && depth > 0) depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function extractWordExplanationsFromRow(rowWords: string[], rowExpl: string = ''): string[] {
  const cleaned = (rowExpl || '')
    .replace(/&aacute;/gi, 'а́')
    .replace(/\.\s*(?:Везде буква|Буквы разные)[^.]*\.?$/i, '')
    .trim();
  if (!cleaned || rowWords.length <= 1) return rowWords.map(() => cleaned);

  const commaParts = splitTopLevelCommas(cleaned);
  if (commaParts.length === rowWords.length) {
    return commaParts;
  }

  const cleanNoAcc = cleaned.replace(/\u0301/g, '');
  const indices: number[] = [];
  let searchFrom = 0;

  for (let i = 0; i < rowWords.length; i++) {
    const rawW = rowWords[i]
      .replace(/\([^)]*\)/g, '')
      .replace(/\u0301/g, '')
      .trim()
      .split(/\s+/)[0];
    const gapMatch = rawW.match(/\.\.+|_{1,}/);
    if (!gapMatch) {
      indices.push(-1);
      continue;
    }
    const gapIdx = rawW.indexOf(gapMatch[0]);
    const pref = rawW.slice(0, gapIdx).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const suff = rawW.slice(gapIdx + gapMatch[0].length).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:\\([^)]+\\)\\s*)?${pref}[А-ЯЁа-яё.]*${suff}`, 'i');
    const sub = cleanNoAcc.slice(searchFrom);
    const m = sub.match(re);
    if (m && m.index !== undefined) {
      const foundIdx = searchFrom + m.index;
      indices.push(foundIdx);
      searchFrom = foundIdx + m[0].length;
    } else {
      indices.push(-1);
    }
  }

  if (indices.every((idx) => idx !== -1)) {
    return indices.map((startIdx, i) => {
      const endIdx = i + 1 < indices.length ? indices[i + 1] : cleanNoAcc.length;
      return cleanNoAcc.slice(startIdx, endIdx).replace(/[,;\s]+$/, '').trim();
    });
  }

  return rowWords.map(() => cleaned);
}

export function detectSpecificSubtopic(
  task: TaskId,
  prefix: string = '',
  suffix: string = '',
  answer: string = '',
  explanation: string = '',
  rule: string = ''
): string {
  return classifyWordSubtopicAndException(task, prefix, suffix, answer, explanation || rule).topic;
}

export function determineSprintOptions(
  task: TaskId,
  letter: string,
  prefix: string = '',
  suffix: string = ''
): [string, string] {
  const origUpper = letter.toUpperCase().trim();
  const cleanPref = prefix.toLowerCase().replace(/[́()`']/g, '');
  const cleanSuf = suffix.toLowerCase().replace(/[́()`']/g, '');

  if (task === '13' || origUpper === 'СЛИТНО' || origUpper === 'РАЗДЕЛЬНО') {
    return ['СЛИТНО', 'РАЗДЕЛЬНО'];
  }

  if (task === '10') {
    if (origUpper === 'Ъ' || origUpper === 'Ь') return ['Ъ', 'Ь'];
    if (origUpper === 'Ы') return ['Ы', 'И'];
    if (origUpper === 'И') {
      if (cleanPref.endsWith('пр') || cleanPref.endsWith('н')) return ['Е', 'И'];
      return ['Ы', 'И'];
    }
    if (origUpper === 'ПРЕ' || origUpper === 'ПРИ' || origUpper === 'Е') return ['Е', 'И'];
    if (origUpper === 'З' || origUpper === 'С') return ['З', 'С'];
    if (origUpper === 'О' || origUpper === 'А') return ['О', 'А'];
    if (origUpper === 'Д' || origUpper === 'Т') return ['Д', 'Т'];
    return ['Е', 'И'];
  }

  if (task === '12') {
    // 1. Past passive participles (-НН- / -Н-): выкачАнный vs выкачЕнный, посеЯнный vs посеЕнный
    if (/^н/.test(cleanSuf)) {
      if (origUpper === 'А') return ['А', 'Е'];
      if (origUpper === 'Я') return ['Я', 'Е'];
      if (origUpper === 'Е' || origUpper === 'Ё') {
        if (/[жшчщ]$/.test(cleanPref)) return ['Е', 'А'];
        if (/[аеёиоуыэюя]$/.test(cleanPref)) return ['Е', 'Я'];
        return ['Е', 'И'];
      }
    }
    // 2. Past active participles (-ВШ- / -Ш-) and past tense (-Л-): полаЯвший vs полаЕвший, услышАвший vs услышЕвший
    if (/^(вш|ш|л)/.test(cleanSuf)) {
      if (origUpper === 'А') return ['А', 'Е'];
      if (origUpper === 'Я') return ['Я', 'Е'];
      if (origUpper === 'Е' || origUpper === 'И') return ['Е', 'И'];
      if (origUpper === 'У') return ['У', 'А'];
      if (origUpper === 'Ю') return ['Ю', 'Я'];
    }
    // 3. Present/future verb endings and present participles: I спряжение vs II спряжение
    if (origUpper === 'У' || origUpper === 'А') return ['У', 'А'];
    if (origUpper === 'Ю' || origUpper === 'Я') return ['Ю', 'Я'];
    if (origUpper === 'Е' || origUpper === 'И' || origUpper === 'Ё') return ['Е', 'И'];
    return ['Е', 'И'];
  }

  if (task === '11') {
    if (origUpper === 'С' || origUpper === '—') return ['С', '—'];
    if (origUpper === 'Ч' || origUpper === 'Щ') return ['Ч', 'Щ'];
    if (/^ва/.test(cleanSuf)) {
      if (origUpper === 'О' || origUpper === 'Ы') return ['О', 'Ы'];
      if (origUpper === 'Е' || origUpper === 'И') return ['Е', 'И'];
      if (origUpper === 'Я') return ['Я', 'Е'];
    }
    if (cleanSuf === '') {
      if (origUpper === 'О' || origUpper === 'А') return ['А', 'О'];
      if (origUpper === 'Е' || origUpper === 'И') return ['Е', 'И'];
    }
    if (/[жшчщц]$/.test(cleanPref)) {
      if (/^в/.test(cleanSuf) && (origUpper === 'О' || origUpper === 'Е')) return ['О', 'Е'];
      if (origUpper === 'А') return ['А', 'Е'];
      if (origUpper === 'Ё' || origUpper === 'О') return ['Ё', 'О'];
    }
    if (origUpper === 'И' || origUpper === 'Е') return ['И', 'Е'];
    if (origUpper === 'Ы' || origUpper === 'О') {
      if (/^ва/.test(cleanSuf) || origUpper === 'Ы') return ['О', 'Ы'];
      return ['А', 'О'];
    }
    if (origUpper === 'А') {
      if (/^(н|л|т)/.test(cleanSuf)) return ['А', 'Е'];
      return ['А', 'О'];
    }
    if (origUpper === 'Я') return ['Я', 'Е'];
    if (origUpper === 'Ё') return ['Ё', 'О'];
    return ['И', 'Е'];
  }

  if (task === '9') {
    if (origUpper === 'Е' || origUpper === 'И') return ['Е', 'И'];
    if (origUpper === 'О' || origUpper === 'А') return ['О', 'А'];
    if (origUpper === 'Ы') return ['Ы', 'И'];
    if (origUpper === 'Э') return ['Э', 'Е'];
    if (origUpper === 'Ю' || origUpper === 'У') return ['Ю', 'У'];
    if (origUpper === 'Я') return ['Я', 'Е'];
    return ['О', 'А'];
  }

  return ['А', 'О'];
}

export function normalizeRawQuestionToTrainer(raw: RawParsedQuestion): {
  fipiQuestion: FipiQuestion;
  sprintQuestions: SprintQuestion[];
  words: WordEntry[];
} {
  const rows: FipiRow[] = [];
  const sprintQuestions: SprintQuestion[] = [];
  const words: WordEntry[] = [];

  const defaultTopicByTask: Record<TaskId, string> = {
    '4': 'Орфоэпические нормы (постановка ударения)',
    '5': 'Лексические нормы (употребление паронимов)',
    '6': 'Лексические нормы (исключение и замена слова)',
    '7': 'Морфологические нормы (образование форм слова)',
    '8': 'Синтаксические нормы (грамматические ошибки А–Д)',
    '9': 'Правописание корней (проверяемые, непроверяемые, чередующиеся)',
    '10': 'Правописание приставок (ПРЕ/ПРИ, З/С, Ы/И, Ъ/Ь)',
    '11': 'Правописание суффиксов (сущ., прил., глаголы)',
    '12': 'Личные окончания глаголов и суффиксы причастий',
    '13': 'Правописание НЕ и НИ с разными частями речи',
    '14': 'Слитное, дефисное, раздельное написание слов',
    '15': 'Правописание Н и НН в суффиксах частей речи',
    '16': 'Пунктуация в ССП и предложениях с однородными членами',
    '17': 'Знаки препинания в предложениях с обособленными членами',
    '18': 'Знаки препинания при словах и конструкциях, грамматически не связанных с членами предложения',
    '19': 'Знаки препинания в сложноподчинённом предложении',
    '20': 'Знаки препинания в сложном предложении с разными видами связи',
    '21': 'Пунктуационный анализ текста (тире, двоеточие, запятая)',
    '22': 'Языковые средства выразительности (тропы и фигуры речи А–Д)',
  };

  const topic = raw.topic || defaultTopicByTask[raw.task];

  raw.rows.forEach((r, idx) => {
    const rowNum = idx + 1;
    const isCorrectRow = raw.correctIndices.includes(rowNum);

    const safeWords = r.words.length > 0 ? r.words : [r.rawText];
    const safeSolved =
      r.solvedWords && r.solvedWords.length === safeWords.length ? r.solvedWords : safeWords;

    const letter = r.letter || (isCorrectRow ? '✓' : '—');
    const explanation = r.explanation || safeSolved.join(', ');

    rows.push({
      words: safeWords as [string, string, string],
      solvedWords: safeSolved as [string, string, string],
      letter,
      isCorrectRow,
      explanation,
    });

    if (raw.task === '13') {
      const sentence = r.rawText;
      const neMatch = sentence.match(/\((НЕ|НИ)\)\s*([А-ЯЁа-яё\-]+)/i);
      if (neMatch) {
        const particle = neMatch[1].toUpperCase();
        const mainWord = neMatch[2];
        const isSlitno = r.explanation
          ? r.explanation.toLowerCase().includes('слитно')
          : isCorrectRow;
        const answer = isSlitno ? 'СЛИТНО' : 'РАЗДЕЛЬНО';
        const classified = classifyWordSubtopicAndException(
          raw.task,
          `(${particle})`,
          mainWord,
          answer,
          r.explanation || '',
          sentence
        );

        const spId = `sp-${raw.task}-${raw.externalId}-r${rowNum}`;
        sprintQuestions.push({
          id: spId,
          kind: 'sprint',
          task: raw.task,
          topic: classified.topic,
          rule: classified.rule,
          prefix: `(${particle})`,
          suffix: mainWord,
          answer,
          options: ['СЛИТНО', 'РАЗДЕЛЬНО'],
          context: sentence,
          explanation:
            r.explanation || `Слово «${particle} ${mainWord}» пишется ${answer.toLowerCase()}.`,
          isTrap: classified.isTrap,
        });

        words.push({
          id: `w-${raw.task}-${raw.externalId}-r${rowNum}`,
          word: isSlitno
            ? `${particle}${mainWord.toLowerCase()}`
            : `${particle} ${mainWord.toLowerCase()}`,
          wordGap: `(${particle})${mainWord}`,
          prefix: `(${particle})`,
          missingLetter: answer,
          suffix: mainWord,
          task: raw.task,
          topic: classified.topic,
          category: classified.topic,
          rule: classified.rule,
          context: sentence,
          source: raw.source,
          isTrap: classified.isTrap,
        });
      }
    } else {
      const rowSolvedWords: string[] = [];
      const perWordExplanations = extractWordExplanationsFromRow(safeWords, r.explanation || '');

      safeWords.forEach((wordText, wIdx) => {
        const parsed = parseWordGap(wordText);
        if (parsed) {
          let wordLetter = '';
          const singleWordExpl = perWordExplanations[wIdx] || r.explanation || '';

          if (singleWordExpl) {
            try {
              const safePrefix = parsed.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const safeSuffix = parsed.suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const re = new RegExp(`${safePrefix}([А-ЯЁа-яё]+?)${safeSuffix}`, 'i');
              const m = singleWordExpl.match(re) || (r.explanation || '').match(re);
              if (m && m[1]) {
                const upperMatch = m[1].replace(/[^А-ЯЁ]/g, '');
                if (upperMatch.length > 0) {
                  wordLetter = upperMatch[0];
                } else {
                  wordLetter = m[1][0].toUpperCase();
                }
              }
            } catch {
              // Ignore regex errors
            }
          }

          if (!wordLetter && r.letter && r.letter !== '✓' && r.letter !== '—') {
            wordLetter = r.letter.toUpperCase();
          }

          if (!wordLetter) {
            const solvedText = safeSolved[wIdx] || '';
            const capMatch = solvedText.replace(/[^А-ЯЁ]/g, '')[0];
            if (capMatch) {
              wordLetter = capMatch;
            } else if (r.letter && r.letter !== '✓') {
              wordLetter = r.letter.toUpperCase();
            } else {
              wordLetter = '';
            }
          }

          const isKOnly =
            raw.task === '11' &&
            (parsed.prefix === 'рез' ||
              parsed.prefix === 'бедняц' ||
              parsed.prefix === 'моряц' ||
              parsed.prefix === 'низ' ||
              parsed.prefix === 'немец');
          if (isKOnly) {
            wordLetter = '—';
          }

          const classified = classifyWordSubtopicAndException(
            raw.task,
            parsed.prefix,
            parsed.suffix,
            wordLetter,
            singleWordExpl,
            parsed.context
          );

          const options = determineSprintOptions(raw.task, wordLetter, parsed.prefix, parsed.suffix);
          const solvedWordWithCap = `${parsed.prefix}${
            wordLetter === '—' ? '' : wordLetter.toUpperCase()
          }${parsed.suffix}`;
          const fullSolvedWithContext = parsed.context
            ? parsed.context.startsWith('(')
              ? `${solvedWordWithCap} ${parsed.context}`
              : `${solvedWordWithCap} (${parsed.context})`
            : solvedWordWithCap;

          rowSolvedWords.push(fullSolvedWithContext);

          const spId = `sp-${raw.task}-${raw.externalId}-r${rowNum}-w${wIdx + 1}`;
          sprintQuestions.push({
            id: spId,
            kind: 'sprint',
            task: raw.task,
            topic: classified.topic,
            rule: classified.rule,
            prefix: parsed.prefix,
            suffix: parsed.suffix,
            answer: wordLetter,
            options,
            context: parsed.context || `(из задания №${raw.task} ЕГЭ)`,
            explanation:
              singleWordExpl || `В слове «${solvedWordWithCap}» пишется буква «${wordLetter}».`,
            isTrap: classified.isTrap,
          });

          words.push({
            id: `w-${raw.task}-${raw.externalId}-r${rowNum}-w${wIdx + 1}`,
            word: solvedWordWithCap,
            wordGap: parsed.cleanWordGap,
            prefix: parsed.prefix,
            missingLetter: wordLetter,
            suffix: parsed.suffix,
            task: raw.task,
            topic: classified.topic,
            category: classified.topic,
            rule: classified.rule,
            context: parsed.context,
            source: raw.source,
            isTrap: classified.isTrap,
          });
        }
      });

      if (rowSolvedWords.length === safeWords.length) {
        rows[rows.length - 1].solvedWords = rowSolvedWords as [string, string, string];
      }
    }
  });

  const fipiQuestion: FipiQuestion = {
    id: `fipi-${raw.task}-${raw.externalId}`,
    kind: 'fipi',
    task: raw.task,
    topic,
    rule: raw.instruction,
    rows,
    correctIndices: raw.correctIndices.slice().sort((a, b) => a - b),
  };

  return {
    fipiQuestion,
    sprintQuestions,
    words,
  };
}
