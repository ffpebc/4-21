import fs from 'node:fs';
import path from 'node:path';

const ALL_TASKS = [
  '4', '5', '6', '7', '8',
  '9', '10', '11', '12', '13', '14', '15',
  '16', '17', '18', '19', '20', '21', '22',
];

const publicData = path.resolve(process.cwd(), 'public/data');
const srcData = path.resolve(process.cwd(), 'src/data');

const wordsPath = path.join(publicData, 'allWordsBank9_15.json');
const wordsRaw = fs.existsSync(wordsPath) ? JSON.parse(fs.readFileSync(wordsPath, 'utf8')) : [];
const words = (Array.isArray(wordsRaw) ? wordsRaw : wordsRaw.words) || [];
const fipi = JSON.parse(fs.readFileSync(path.join(publicData, 'fipiTasksBank9_15.json'), 'utf8'));
const sprint = JSON.parse(fs.readFileSync(path.join(publicData, 'sprintBank9_15.json'), 'utf8'));
const starter = JSON.parse(fs.readFileSync(path.join(srcData, 'starterBank.json'), 'utf8'));
const starterWords = (starter.words || starter.sprint || []);

let errors = 0;
let contradictions = 0;
let instructionRules = 0;

const EXAM_PROMPT_REGEX = /^(?:Укажите|Расставьте|Найдите|В одном из|Отредактируйте|Установите)/i;

function auditContradiction(task, id, ans, topic, rule, kind) {
  const a = (ans || '').toUpperCase().trim();
  const top = topic || '';
  const r = rule || '';

  if (task === '13') {
    if (a === 'СЛИТНО') {
      if (top.includes('(раздельно)')) {
        console.error(`[CONTRADICTION] Task 13 ${kind} ${id} has answer СЛИТНО but topic "${top}"`);
        contradictions++;
        errors++;
      }
      if (r.toLowerCase().includes('всегда пишутся раздельно') || r.toLowerCase().includes('всегда пишется раздельно')) {
        console.error(`[CONTRADICTION] Task 13 ${kind} ${id} has answer СЛИТНО but rule "${r}"`);
        contradictions++;
        errors++;
      }
    }
    if (a === 'РАЗДЕЛЬНО') {
      if (top.includes('(слитно)')) {
        console.error(`[CONTRADICTION] Task 13 ${kind} ${id} has answer РАЗДЕЛЬНО but topic "${top}"`);
        contradictions++;
        errors++;
      }
      if (r.toLowerCase().includes('всегда пишутся с не слитно') || r.toLowerCase().includes('всегда пишется с не слитно')) {
        console.error(`[CONTRADICTION] Task 13 ${kind} ${id} has answer РАЗДЕЛЬНО but rule "${r}"`);
        contradictions++;
        errors++;
      }
    }
  }

  if (task === '14') {
    if (a === 'СЛИТНО' && (top.includes('(через дефис)') || top.includes('(раздельно)'))) {
      console.error(`[CONTRADICTION] Task 14 ${kind} ${id} has answer СЛИТНО but topic "${top}"`);
      contradictions++;
      errors++;
    }
    if (a === 'ДЕФИСНО' && (top.includes('(слитно)') || top.includes('(раздельно)'))) {
      console.error(`[CONTRADICTION] Task 14 ${kind} ${id} has answer ДЕФИСНО but topic "${top}"`);
      contradictions++;
      errors++;
    }
    if (a === 'РАЗДЕЛЬНО' && (top.includes('(слитно)') || top.includes('(через дефис)'))) {
      console.error(`[CONTRADICTION] Task 14 ${kind} ${id} has answer РАЗДЕЛЬНО but topic "${top}"`);
      contradictions++;
      errors++;
    }
  }

  if (task === '15') {
    if (a === 'Н' && (top.includes('-НН-') || top.includes('две буквы Н') || top.includes('двух НН'))) {
      console.error(`[CONTRADICTION] Task 15 ${kind} ${id} has answer Н but topic "${top}"`);
      contradictions++;
      errors++;
    }
    if (a === 'НН' && (top.includes('одна буква Н') || top.includes('одной Н') || top.includes('краткие причастия'))) {
      console.error(`[CONTRADICTION] Task 15 ${kind} ${id} has answer НН but topic "${top}"`);
      contradictions++;
      errors++;
    }
  }
}

for (const t of ALL_TASKS) {
  const tw = words.filter((w) => String(w.task) === t);
  const tf = fipi.filter((q) => String(q.task) === t);
  const ts = sprint.filter((q) => String(q.task) === t);
  const sw = starterWords.filter((w) => String(w.task) === t);
  const sf = starter.fipi.filter((q) => String(q.task) === t);
  const ss = starter.sprint.filter((q) => String(q.task) === t);

  if ((words.length > 0 && tw.length === 0) || tf.length === 0 || ts.length === 0) {
    console.error(`[FAIL] Task ${t} is empty in full bank!`);
    errors++;
  }
  if (sw.length === 0 || sf.length === 0 || ss.length === 0) {
    console.error(`[FAIL] Task ${t} is empty in starterBank.json!`);
    errors++;
  }

  // 1. Audit FIPI tasks
  for (const fq of tf) {
    if (!fq.id || !Array.isArray(fq.rows) || fq.rows.length === 0) {
      console.error(`[FAIL] Invalid FIPI question ${fq.id} in task ${t}`);
      errors++;
    }
    if (!Array.isArray(fq.correctIndices) || fq.correctIndices.length === 0) {
      console.error(`[FAIL] Empty correctIndices in ${fq.id} (task ${t})`);
      errors++;
    }
    if (EXAM_PROMPT_REGEX.test(fq.rule || '')) {
      console.error(`[FAIL] FIPI question ${fq.id} in task ${t} has exam instruction as rule: "${fq.rule}"`);
      instructionRules++;
      errors++;
    }

    // Audit FIPI rows for linguistic contradictions
    for (let rIdx = 0; rIdx < fq.rows.length; rIdx++) {
      const row = fq.rows[rIdx];
      const letVal = (row.letter || '').toUpperCase().trim();
      const expl = row.explanation || '';
      const solved = (row.solvedWords ? row.solvedWords[0] : '') || '';

      if (t === '13') {
        if (letVal === 'СЛИТНО' && /поэтому\s+пишется\s+РАЗДЕЛЬНО/i.test(expl)) {
          console.error(`[CONTRADICTION] FIPI row ${fq.id} row ${rIdx+1} answer СЛИТНО but expl: "${expl}"`);
          contradictions++;
          errors++;
        }
        if (letVal === 'РАЗДЕЛЬНО' && /поэтому\s+пишется\s+СЛИТНО/i.test(expl)) {
          console.error(`[CONTRADICTION] FIPI row ${fq.id} row ${rIdx+1} answer РАЗДЕЛЬНО but expl: "${expl}"`);
          contradictions++;
          errors++;
        }
      }
      if (t === '15') {
        if (letVal === 'Н' && (/пишутся\s+две\s+буквы\s+НН/i.test(expl) || /пишется\s+две\s+буквы\s+НН/i.test(expl) || /пишется\s+НН\b/i.test(expl))) {
          console.error(`[CONTRADICTION] FIPI row ${fq.id} row ${rIdx+1} answer Н but expl: "${expl}"`);
          contradictions++;
          errors++;
        }
        if (letVal === 'НН' && (/пишется\s+одна\s+буква\s+Н/i.test(expl) || /пишется\s+одна\s+Н\b/i.test(expl))) {
          console.error(`[CONTRADICTION] FIPI row ${fq.id} row ${rIdx+1} answer НН but expl: "${expl}"`);
          contradictions++;
          errors++;
        }
        if (letVal === 'НН' && solved && !/НН/i.test(solved)) {
          console.error(`[CONTRADICTION] FIPI row ${fq.id} row ${rIdx+1} answer НН but solved word: "${solved}"`);
          contradictions++;
          errors++;
        }
      }
    }
  }

  // 2. Audit Sprint tasks
  for (const sq of ts) {
    if (!sq.id || !sq.answer || !Array.isArray(sq.options) || sq.options.length < 2) {
      console.error(`[FAIL] Invalid Sprint question ${sq.id} in task ${t}`);
      errors++;
    }
    if (!sq.options.includes(sq.answer)) {
      console.error(`[FAIL] Sprint question ${sq.id} answer "${sq.answer}" not in options [${sq.options.join(', ')}]`);
      errors++;
    }
    if (EXAM_PROMPT_REGEX.test(sq.rule || '')) {
      console.error(`[FAIL] Sprint question ${sq.id} in task ${t} has exam instruction as rule: "${sq.rule}"`);
      instructionRules++;
      errors++;
    }
    auditContradiction(t, sq.id, sq.answer, sq.topic, sq.rule, 'Sprint');
  }

  // 3. Audit Words tasks
  for (const wq of tw) {
    const ans = wq.missingLetter || wq.answer || '';
    if (EXAM_PROMPT_REGEX.test(wq.rule || '')) {
      console.error(`[FAIL] Word ${wq.id} in task ${t} has exam instruction as rule: "${wq.rule}"`);
      instructionRules++;
      errors++;
    }
    auditContradiction(t, wq.id, ans, wq.topic, wq.rule, 'Word');
  }

  // 4. Audit Starter tasks
  for (const sfq of sf) {
    if (EXAM_PROMPT_REGEX.test(sfq.rule || '')) {
      console.error(`[FAIL] Starter FIPI ${sfq.id} in task ${t} has exam instruction as rule: "${sfq.rule}"`);
      instructionRules++;
      errors++;
    }
  }
  for (const ssq of ss) {
    auditContradiction(t, ssq.id, ssq.answer, ssq.topic, ssq.rule, 'Starter Sprint');
  }
  for (const swq of sw) {
    const ans = swq.missingLetter || swq.answer || '';
    auditContradiction(t, swq.id, ans, swq.topic, swq.rule, 'Starter Word');
  }
}

console.log(
  `[AUDIT OK] Verified ${ALL_TASKS.length} tasks (4–22): words=${words.length}, fipi=${fipi.length}, sprint=${sprint.length}`
);
console.log(`[AUDIT METRICS] contradictions=${contradictions}, instructionAsRuleErrors=${instructionRules}, totalErrors=${errors}`);
if (errors > 0) process.exit(1);
