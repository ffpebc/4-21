/**
 * Dumps every FIPI-format task (4–22) the way the student sees it in QuestionCardView:
 * instruction box, sentence/rows, answer key, and post-answer feedback.
 *
 * Usage: npx tsx scripts/dump_rendered_tasks.ts [samplesPerTask=6] [task]
 * Writes .cache/rendered_tasks_dump.txt
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  getTrainerBank,
  cleanScraperArtifacts,
  cleanExplanation,
  cleanWord,
  resolveTask15Sentence,
  checkFipiQuestionAnswer,
  type FipiQuestion,
} from '../src/utils/trainerLogic.ts';

const perTask = Number(process.argv[2] || 6);
const onlyTask = process.argv[3];

const bank = getTrainerBank();
const T = (s: string, n = 200) => (s.length > n ? s.slice(0, n) + `…[+${s.length - n}]` : s);
const out: string[] = [];

function render(q: FipiQuestion): string {
  const lines: string[] = [];
  const kind = q.questionKind;
  lines.push(`--- [${q.id}] task ${q.task} kind=${kind} src=${q.source || '-'}`);
  lines.push(`TOPIC: ${q.topic}`);
  lines.push(`INSTR: ${q.instruction || q.rule}`);
  if (kind === 'numbered_gaps') {
    lines.push(`SENT: ${resolveTask15Sentence(q)}`);
    q.rows.forEach((r, i) =>
      lines.push(
        `  (${i + 1}) ${q.task === '15' ? cleanWord(r.solvedWords[0] || r.words[0]) : ''} letter=${r.letter} ok=${r.isCorrectRow} | ${T(cleanExplanation(r.explanation))}`
      )
    );
  } else if (kind === 'word_input') {
    if (q.rows.length > 1) {
      q.rows.forEach((r, i) =>
        lines.push(`  ${i + 1}) ${r.words.map(cleanScraperArtifacts).join(' ')}   => ${r.solvedWords.join(' ')} ok=${r.isCorrectRow} | ${T(cleanExplanation(r.explanation))}`)
      );
    } else {
      lines.push(`SENT: ${cleanScraperArtifacts(q.sentence || (q.rows[0]?.words || []).join(' '))}`);
      q.rows.forEach((r) => lines.push(`  expl: ${T(cleanExplanation(r.explanation))}`));
    }
    lines.push(`  choice: ${(q.choiceOptions || []).join(' | ')}`);
    lines.push(`  textAnswers: ${(q.textAnswers || []).join(' / ')}`);
  } else if (kind === 'matching_grid') {
    (q.matchingLetters || []).forEach((m: any, i) =>
      lines.push(`  ${'АБВГД'[i]}) ${(typeof m === 'string' ? m : m.text)}  [digit=${m.correctDigit}]`)
    );
    q.rows.forEach((r, i) =>
      lines.push(`  ${i + 1}. ${cleanScraperArtifacts(r.words.join(' '))} ok=${r.isCorrectRow} | ${T(cleanExplanation(r.explanation))}`)
    );
  } else {
    q.rows.forEach((r, i) =>
      lines.push(
        `  ${i + 1}. ${r.words.map((w) => cleanScraperArtifacts(w)).join(', ')}  =>  ${r.solvedWords.map((w) => cleanScraperArtifacts(w)).join(', ')}  [${r.letter}] ok=${r.isCorrectRow} | ${T(cleanExplanation(r.explanation))}`
      )
    );
  }
  lines.push(`ANSWER: ${checkFipiQuestionAnswer(q, '').correctAnswerDisplay}  correctIndices=${JSON.stringify(q.correctIndices)}`);
  return lines.join('\n');
}

const byTask = new Map<string, FipiQuestion[]>();
for (const q of bank.fipiQuestions) {
  const arr = byTask.get(q.task) || [];
  arr.push(q);
  byTask.set(q.task, arr);
}

for (const t of ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22']) {
  if (onlyTask && t !== onlyTask) continue;
  const list = byTask.get(t) || [];
  out.push(`\n================ TASK ${t}: ${list.length} questions ================`);
  const step = Math.max(1, Math.floor(list.length / perTask));
  for (let i = 0, n = 0; i < list.length && n < perTask; i += step, n++) {
    out.push(render(list[i]));
  }
}

const dest = path.resolve('.cache/rendered_tasks_dump.txt');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out.join('\n'));
console.log(`wrote ${dest}`);
for (const [t, l] of byTask) console.log(t, l.length);
