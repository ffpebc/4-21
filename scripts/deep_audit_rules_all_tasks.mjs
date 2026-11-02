import fs from 'node:fs';
import path from 'node:path';
import { classifyWordSubtopicAndException } from '../src/utils/wordClassifier.ts';

const publicData = path.resolve(process.cwd(), 'public/data');
const srcData = path.resolve(process.cwd(), 'src/data');

const wordsRaw = JSON.parse(fs.readFileSync(path.join(publicData, 'allWordsBank9_15.json'), 'utf8'));
const words = Array.isArray(wordsRaw) ? wordsRaw : wordsRaw.words;
const sprint = JSON.parse(fs.readFileSync(path.join(publicData, 'sprintBank9_15.json'), 'utf8'));
const fipi = JSON.parse(fs.readFileSync(path.join(publicData, 'fipiTasksBank9_15.json'), 'utf8'));
const starter = JSON.parse(fs.readFileSync(path.join(srcData, 'starterBank.json'), 'utf8'));

console.log(`Starting Deep Linguistic & Rule Audit across all tasks...`);

const findings = [];

function checkSprintWord(item, kind) {
  const t = String(item.task);
  const ans = (item.answer || item.missingLetter || '').toUpperCase().trim();
  const expl = (item.explanation || '').toLowerCase();
  const rule = (item.rule || '').toLowerCase();
  const topic = (item.topic || '').toLowerCase();
  const text = `${expl} ${rule} ${topic}`;
  const word = `${item.prefix || ''}${item.suffix || ''}`.toUpperCase().trim();

  // Task 9: Vowel alternation vs checked/unchecked
  if (t === '9') {
    // Check if topic or explanation mentions letter O but answer is A or vice versa
    if (ans === 'А') {
      if (/пишется\s+буква\s+о\b/.test(expl) || /пишется\s+о\b/.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 9 answer is А but expl says пишется буква О', word });
      }
    }
    if (ans === 'О') {
      if (/пишется\s+буква\s+а\b/.test(expl) || /пишется\s+а\b/.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 9 answer is О but expl says пишется буква А', word });
      }
    }
    if (ans === 'И') {
      if (/пишется\s+буква\s+е\b/.test(expl) || /пишется\s+е\b/.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 9 answer is И but expl says пишется буква Е', word });
      }
    }
    if (ans === 'Е') {
      if (/пишется\s+буква\s+и\b/.test(expl) || /пишется\s+и\b/.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 9 answer is Е but expl says пишется буква И', word });
      }
    }
  }

  // Task 10: Prefixes
  if (t === '10') {
    if (ans === 'З' && (/пишется\s+с\b/.test(expl) || /перед\s+глухим/.test(expl))) {
      findings.push({ t, id: item.id, kind, error: 'Task 10 answer is З but expl says С / глухой', word });
    }
    if (ans === 'С' && (/пишется\s+з\b/.test(expl) || /перед\s+звонким/.test(expl))) {
      findings.push({ t, id: item.id, kind, error: 'Task 10 answer is С but expl says З / звонкий', word });
    }
    if (ans === 'Ъ' && /пишется\s+ь\b/.test(expl)) {
      findings.push({ t, id: item.id, kind, error: 'Task 10 answer is Ъ but expl says Ь', word });
    }
    if (ans === 'Ь' && /пишется\s+ъ\b/.test(expl)) {
      findings.push({ t, id: item.id, kind, error: 'Task 10 answer is Ь but expl says Ъ', word });
    }
    if (ans === 'Ы' && /пишется\s+и\b/.test(expl) && !expl.includes('русских')) {
      findings.push({ t, id: item.id, kind, error: 'Task 10 answer is Ы but expl says И', word });
    }
    if (ans === 'И' && /пишется\s+ы\b/.test(expl)) {
      findings.push({ t, id: item.id, kind, error: 'Task 10 answer is И but expl says Ы', word });
    }
  }

  // Task 11: Suffixes
  if (t === '11') {
    if (ans === 'И' && /пишется\s+(?:буква\s+)?е\b/.test(expl)) {
      findings.push({ t, id: item.id, kind, error: 'Task 11 answer is И but expl says Е', word });
    }
    if (ans === 'Е' && /пишется\s+(?:буква\s+)?и\b/.test(expl)) {
      findings.push({ t, id: item.id, kind, error: 'Task 11 answer is Е but expl says И', word });
    }
    if (ans === 'О' && /пишется\s+(?:буква\s+)?а\b/.test(expl)) {
      findings.push({ t, id: item.id, kind, error: 'Task 11 answer is О but expl says А', word });
    }
    if (ans === 'А' && /пишется\s+(?:буква\s+)?о\b/.test(expl)) {
      findings.push({ t, id: item.id, kind, error: 'Task 11 answer is А but expl says О', word });
    }
  }

  // Task 12: Conjugation & Participles
  if (t === '12') {
    if ((ans === 'Е' || ans === 'У' || ans === 'Ю') && /пишется\s+(?:буква\s+)?(?:и|а|я)\b/.test(expl) && !expl.includes('1 спряжен') && !expl.includes('i спряжен')) {
      findings.push({ t, id: item.id, kind, error: `Task 12 answer is ${ans} but expl mentions И/А/Я`, word });
    }
    if ((ans === 'И' || ans === 'А' || ans === 'Я') && /пишется\s+(?:буква\s+)?(?:е|у|ю)\b/.test(expl) && !expl.includes('2 спряжен') && !expl.includes('ii спряжен')) {
      findings.push({ t, id: item.id, kind, error: `Task 12 answer is ${ans} but expl mentions Е/У/Ю`, word });
    }
  }

  // Task 13: НЕ / НИ
  if (t === '13') {
    if (ans === 'СЛИТНО') {
      if (topic.includes('(раздельно)')) {
        findings.push({ t, id: item.id, kind, error: 'Task 13 СЛИТНО but topic (раздельно)', word });
      }
      if (/поэтому\s+пишется\s+раздельно/i.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 13 СЛИТНО but expl says пишется раздельно', word });
      }
      if (/всегда\s+пишется\s+раздельно/i.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 13 СЛИТНО but expl says всегда раздельно', word });
      }
      if (expl.includes('есть зависимое слово') || expl.includes('есть зависимые слова')) {
        findings.push({ t, id: item.id, kind, error: 'Task 13 СЛИТНО but expl claims зависимое слово', word });
      }
      if (expl.includes('противопоставление с союзом а')) {
        findings.push({ t, id: item.id, kind, error: 'Task 13 СЛИТНО but expl claims противопоставление с А', word });
      }
    }
    if (ans === 'РАЗДЕЛЬНО') {
      if (topic.includes('(слитно)')) {
        findings.push({ t, id: item.id, kind, error: 'Task 13 РАЗДЕЛЬНО but topic (слитно)', word });
      }
      if (/поэтому\s+пишется\s+слитно/i.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 13 РАЗДЕЛЬНО but expl says пишется слитно', word });
      }
      if (/всегда\s+пишется\s+с\s+не\s+слитно/i.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 13 РАЗДЕЛЬНО but expl says всегда слитно', word });
      }
    }
  }

  // Task 14: СЛИТНО / ДЕФИСНО / РАЗДЕЛЬНО
  if (t === '14') {
    if (ans === 'СЛИТНО') {
      if (topic.includes('(через дефис)') || topic.includes('(раздельно)')) {
        findings.push({ t, id: item.id, kind, error: `Task 14 СЛИТНО but topic ${topic}`, word });
      }
      if (/поэтому\s+пишется\s+(?:через\s+дефис|дефисно|раздельно)/i.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 14 СЛИТНО but expl says дефис/раздельно', word });
      }
    }
    if (ans === 'ДЕФИСНО') {
      if (topic.includes('(слитно)') || topic.includes('(раздельно)')) {
        findings.push({ t, id: item.id, kind, error: `Task 14 ДЕФИСНО but topic ${topic}`, word });
      }
      if (/поэтому\s+пишется\s+(?:слитно|раздельно)/i.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 14 ДЕФИСНО but expl says слитно/раздельно', word });
      }
    }
    if (ans === 'РАЗДЕЛЬНО') {
      if (topic.includes('(слитно)') || topic.includes('(через дефис)')) {
        findings.push({ t, id: item.id, kind, error: `Task 14 РАЗДЕЛЬНО but topic ${topic}`, word });
      }
      if (/поэтому\s+пишется\s+(?:слитно|через\s+дефис|дефисно)/i.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 14 РАЗДЕЛЬНО but expl says слитно/дефис', word });
      }
      // Check for glued words in РАЗДЕЛЬНО explanation
      const sepMatch = expl.match(/поэтому пишется РАЗДЕЛЬНО\s*[-—]\s*«([^»]+)»/);
      if (sepMatch && !sepMatch[1].includes(' ') && !sepMatch[1].includes('-')) {
        findings.push({ t, id: item.id, kind, error: `Task 14 РАЗДЕЛЬНО with unspaced word: ${sepMatch[1]}`, word });
      }
      // Check for mislabeled conjunctions/particles as prepositional nouns
      if (/«([^»]+)»\s*—\s*наречное сочетание существительного с предлогом/i.test(expl)) {
        const m = expl.match(/«([^»]+)»/);
        const term = m ? m[1].toUpperCase() : '';
        if (['ТАК КАК', 'КАК БУДТО', 'ТО ЕСТЬ', 'ВСЁ ЖЕ', 'ВСЕ ЖЕ', 'ЕСЛИ БЫ', 'ЕДВА ЛИ', 'В ТЕЧЕНИЕ', 'В ПРОДОЛЖЕНИЕ', 'В ЗАКЛЮЧЕНИЕ', 'ВО ИЗБЕЖАНИЕ', 'В ВИДЕ', 'В СВЯЗИ', 'НА ПРОТЯЖЕНИИ', 'ОТ ЭТОГО', 'ПРИ ЭТОМ', 'ДРУГ ДРУГУ'].includes(term)) {
          findings.push({ t, id: item.id, kind, error: `Task 14 wrong grammar classification: ${term}`, word });
        }
      }
    }
  }

  // Task 15: Н / НН
  if (t === '15') {
    if (ans === 'Н') {
      if (topic.includes('-нн-') || topic.includes('две буквы н') || topic.includes('двух нн')) {
        findings.push({ t, id: item.id, kind, error: `Task 15 Н but topic ${topic}`, word });
      }
      if (/поэтому\s+пишется\s+две\s+буквы\s+нн/i.test(expl) || /поэтому\s+пишется\s+нн\b/i.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 15 Н but expl says пишется НН', word });
      }
    }
    if (ans === 'НН') {
      if (topic.includes('одна буква н') || topic.includes('одной н') || topic.includes('краткие причастия')) {
        findings.push({ t, id: item.id, kind, error: `Task 15 НН but topic ${topic}`, word });
      }
      if (/поэтому\s+пишется\s+одна\s+буква\s+н\b/i.test(expl) || /поэтому\s+пишется\s+н\b/i.test(expl)) {
        findings.push({ t, id: item.id, kind, error: 'Task 15 НН but expl says пишется Н', word });
      }
    }
  }
}

// Audit Sprint
for (const s of sprint) checkSprintWord(s, 'sprint');
// Audit Words
for (const w of words) checkSprintWord(w, 'words');
// Audit Starter
for (const s of starter.sprint) checkSprintWord(s, 'starter-sprint');
for (const w of starter.words) checkSprintWord(w, 'starter-words');

// Audit FIPI rows & structure
for (const f of fipi) {
  const t = String(f.task);

  // Check OCR defect (З) in sentences
  if (f.sentence && /\([Зз]\)/.test(f.sentence)) {
    findings.push({ t, id: f.id, kind: 'fipi-sentence', error: 'Cyrillic Ze (З) used instead of digit (3)' });
  }

  // Check valid correctIndices
  if (!Array.isArray(f.correctIndices) || f.correctIndices.length === 0) {
    findings.push({ t, id: f.id, kind: 'fipi-indices', error: 'empty correctIndices' });
  } else {
    for (const idx of f.correctIndices) {
      if (idx < 1 || idx > (f.rows || []).length) {
        findings.push({ t, id: f.id, kind: 'fipi-indices', error: `index ${idx} out of bounds (rowCount=${f.rows.length})` });
      }
    }
  }

  // Check matching isCorrectRow
  const trueIndices = [];
  (f.rows || []).forEach((r, idx) => {
    if (r.isCorrectRow) trueIndices.push(idx + 1);
  });
  const ci = [...(f.correctIndices || [])].sort((a, b) => a - b);
  const ti = [...trueIndices].sort((a, b) => a - b);
  if (JSON.stringify(ci) !== JSON.stringify(ti)) {
    findings.push({ t, id: f.id, kind: 'fipi-row-alignment', error: `correctIndices ${JSON.stringify(ci)} does not match isCorrectRow ${JSON.stringify(ti)}` });
  }

  for (let i = 0; i < (f.rows || []).length; i++) {
    const row = f.rows[i];
    const letVal = (row.letter || '').toUpperCase().trim();
    const expl = (row.explanation || '').toLowerCase();
    const solved = (row.solvedWords ? row.solvedWords[0] : '') || '';

    if (t === '13') {
      if (letVal === 'СЛИТНО' && (/поэтому\s+пишется\s+раздельно/i.test(expl) || /всегда\s+пишется\s+раздельно/i.test(expl))) {
        findings.push({ t, id: f.id, kind: `fipi-row-${i+1}`, error: 'FIPI row СЛИТНО but expl says РАЗДЕЛЬНО', word: solved });
      }
      if (letVal === 'РАЗДЕЛЬНО' && (/поэтому\s+пишется\s+слитно/i.test(expl) || /всегда\s+пишется\s+слитно/i.test(expl))) {
        findings.push({ t, id: f.id, kind: `fipi-row-${i+1}`, error: 'FIPI row РАЗДЕЛЬНО but expl says СЛИТНО', word: solved });
      }
    }
    if (t === '14') {
      if (letVal.includes('СЛИТНО') && !letVal.includes('РАЗДЕЛЬНО') && !letVal.includes('ДЕФИСНО')) {
        if (/поэтому\s+пишется\s+(?:через\s+дефис|дефисно|раздельно)/i.test(expl)) {
          findings.push({ t, id: f.id, kind: `fipi-row-${i+1}`, error: 'FIPI row СЛИТНО but expl says дефис/раздельно', word: solved });
        }
      }
    }
    if (t === '15') {
      if (letVal === 'Н' && (/поэтому\s+пишется\s+две\s+буквы\s+нн/i.test(expl) || /поэтому\s+пишется\s+нн\b/i.test(expl))) {
        findings.push({ t, id: f.id, kind: `fipi-row-${i+1}`, error: 'FIPI row Н but expl says НН', word: solved });
      }
      if (letVal === 'НН' && (/поэтому\s+пишется\s+одна\s+буква\s+н\b/i.test(expl) || /поэтому\s+пишется\s+н\b/i.test(expl))) {
        findings.push({ t, id: f.id, kind: `fipi-row-${i+1}`, error: 'FIPI row НН but expl says Н', word: solved });
      }
    }
  }
}

console.log(`Findings count: ${findings.length}`);
if (findings.length > 0) {
  console.log('First 20 findings:');
  console.log(JSON.stringify(findings.slice(0, 20), null, 2));
} else {
  console.log('Zero contradictions found across all checked patterns!');
}
