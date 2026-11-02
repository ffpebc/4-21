import fs from 'node:fs';
import path from 'node:path';

const publicData = path.resolve(process.cwd(), 'public/data');
const srcData = path.resolve(process.cwd(), 'src/data');

const wordsRaw = JSON.parse(fs.readFileSync(path.join(publicData, 'allWordsBank9_15.json'), 'utf8'));
const words = Array.isArray(wordsRaw) ? wordsRaw : wordsRaw.words;
const sprint = JSON.parse(fs.readFileSync(path.join(publicData, 'sprintBank9_15.json'), 'utf8'));
const fipi = JSON.parse(fs.readFileSync(path.join(publicData, 'fipiTasksBank9_15.json'), 'utf8'));
const starter = JSON.parse(fs.readFileSync(path.join(srcData, 'starterBank.json'), 'utf8'));

console.log(`Auditing datasets:`);
console.log(`- allWordsBank: ${words.length}`);
console.log(`- sprintBank: ${sprint.length}`);
console.log(`- fipiTasksBank: ${fipi.length}`);
console.log(`- starterBank: sprint=${starter.sprint.length}, fipi=${starter.fipi.length}, words=${starter.words.length}`);

let issues = [];

const SUSPICIOUS_STRINGS = [
  'undefined',
  'null',
  '[object Object]',
  'либо полное причастие',
  'наречие или производный предлог',
  'устойчивое сочетание / производный предлог',
  'ДРУГДРУГУ',
  'КВЕЧЕРУ',
  'TODO',
  'FIXME',
  'PLACEHOLDER'
];

function checkStringSanity(str, ctx) {
  if (typeof str !== 'string') return;
  for (const s of SUSPICIOUS_STRINGS) {
    if (str.includes(s)) {
      issues.push({ type: 'suspicious_string', str: s, ctx });
    }
  }
}

// 1. Audit all sprint items
for (const s of sprint) {
  const ctx = `Sprint task ${s.task} id=${s.id}`;
  if (!s.answer) issues.push({ type: 'missing_answer', ctx });
  if (!s.options || !s.options.includes(s.answer)) {
    issues.push({ type: 'answer_not_in_options', ctx, answer: s.answer, options: s.options });
  }
  checkStringSanity(s.question, ctx);
  checkStringSanity(s.answer, ctx);
  checkStringSanity(s.explanation, ctx);
  checkStringSanity(s.rule, ctx);
  checkStringSanity(s.topic, ctx);
}

// 2. Audit all word items
for (const w of words) {
  const ctx = `Word task ${w.task} id=${w.id}`;
  const ans = w.missingLetter || w.answer;
  if (!ans) issues.push({ type: 'missing_answer', ctx });
  checkStringSanity(w.word, ctx);
  checkStringSanity(w.explanation, ctx);
  checkStringSanity(w.rule, ctx);
  checkStringSanity(w.topic, ctx);
}

// 3. Audit all FIPI tasks
for (const f of fipi) {
  const ctx = `FIPI task ${f.task} id=${f.id}`;
  checkStringSanity(f.question, ctx);
  checkStringSanity(f.explanation, ctx);
  checkStringSanity(f.rule, ctx);
  
  if (!f.rows || !Array.isArray(f.rows) || f.rows.length === 0) {
    issues.push({ type: 'no_rows', ctx });
    continue;
  }
  
  // Tasks where row count is not 5:
  // 6 (1 sentence), 8 (9 sentences), 15 (sentence with gaps), 17-20 (sentence with gaps), 21 (text with numbered sentences)
  const variableRowTasks = new Set(['6', '8', '15', '17', '18', '19', '20', '21']);
  if (f.rows.length < 5 && !variableRowTasks.has(String(f.task))) {
    issues.push({ type: 'fewer_than_5_rows', ctx, count: f.rows.length });
  }

  if (!f.correctIndices || !Array.isArray(f.correctIndices) || f.correctIndices.length === 0) {
    issues.push({ type: 'empty_correct_indices', ctx });
  } else {
    for (const idx of f.correctIndices) {
      if (idx < 1 || idx > f.rows.length) {
        // In tasks 17-20, correctIndices are gap numbers which match row indices or text gaps
        issues.push({ type: 'index_out_of_range', ctx, idx, rowCount: f.rows.length });
      }
    }
  }

  for (let r = 0; r < f.rows.length; r++) {
    const row = f.rows[r];
    const rowCtx = `${ctx} row ${r+1}`;
    checkStringSanity(row.text, rowCtx);
    checkStringSanity(row.explanation, rowCtx);
    checkStringSanity(row.rule, rowCtx);
  }
}

// 4. Audit starter bank
for (const s of starter.sprint) {
  const ctx = `Starter Sprint task ${s.task} id=${s.id}`;
  if (!s.options || !s.options.includes(s.answer)) {
    issues.push({ type: 'starter_answer_not_in_options', ctx, answer: s.answer, options: s.options });
  }
  checkStringSanity(s.explanation, ctx);
  checkStringSanity(s.rule, ctx);
  checkStringSanity(s.topic, ctx);
}
for (const f of starter.fipi) {
  const ctx = `Starter FIPI task ${f.task} id=${f.id}`;
  if (!f.correctIndices || f.correctIndices.length === 0) {
    issues.push({ type: 'starter_empty_correct_indices', ctx });
  }
  checkStringSanity(f.explanation, ctx);
  checkStringSanity(f.rule, ctx);
}
for (const w of starter.words) {
  const ctx = `Starter Word task ${w.task} id=${w.id}`;
  checkStringSanity(w.explanation, ctx);
  checkStringSanity(w.rule, ctx);
  checkStringSanity(w.topic, ctx);
}

const byType = {};
for (const iss of issues) {
  byType[iss.type] = (byType[iss.type] || 0) + 1;
}

console.log(`Summary of issues by type:`, JSON.stringify(byType, null, 2));
console.log(`Total Sanity Issues Found: ${issues.length}`);
if (issues.length > 0) {
  console.log(JSON.stringify(issues.slice(0, 30), null, 2));
} else {
  console.log('PERFECT: Zero sanity issues found across all datasets!');
}
