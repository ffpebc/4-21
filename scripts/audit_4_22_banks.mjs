import fs from 'node:fs';
import path from 'node:path';

const ALL_TASKS = [
  '4', '5', '6', '7', '8',
  '9', '10', '11', '12', '13', '14', '15',
  '16', '17', '18', '19', '20', '21', '22',
];

const publicData = path.resolve(process.cwd(), 'public/data');
const srcData = path.resolve(process.cwd(), 'src/data');

const words = JSON.parse(fs.readFileSync(path.join(publicData, 'allWordsBank9_15.json'), 'utf8'));
const fipi = JSON.parse(fs.readFileSync(path.join(publicData, 'fipiTasksBank9_15.json'), 'utf8'));
const sprint = JSON.parse(fs.readFileSync(path.join(publicData, 'sprintBank9_15.json'), 'utf8'));
const starter = JSON.parse(fs.readFileSync(path.join(srcData, 'starterBank.json'), 'utf8'));

let errors = 0;

for (const t of ALL_TASKS) {
  const tw = words.filter((w) => String(w.task) === t);
  const tf = fipi.filter((q) => String(q.task) === t);
  const ts = sprint.filter((q) => String(q.task) === t);
  const sw = starter.words.filter((w) => String(w.task) === t);
  const sf = starter.fipi.filter((q) => String(q.task) === t);
  const ss = starter.sprint.filter((q) => String(q.task) === t);

  if (tw.length === 0 || tf.length === 0 || ts.length === 0) {
    console.error(`[FAIL] Task ${t} is empty in full bank!`);
    errors++;
  }
  if (sw.length === 0 || sf.length === 0 || ss.length === 0) {
    console.error(`[FAIL] Task ${t} is empty in starterBank.json!`);
    errors++;
  }

  for (const fq of tf) {
    if (!fq.id || !Array.isArray(fq.rows) || fq.rows.length === 0) {
      console.error(`[FAIL] Invalid FIPI question ${fq.id} in task ${t}`);
      errors++;
    }
    if (!Array.isArray(fq.correctIndices) || fq.correctIndices.length === 0) {
      console.error(`[FAIL] Empty correctIndices in ${fq.id} (task ${t})`);
      errors++;
    }
  }

  for (const sq of ts) {
    if (!sq.id || !sq.answer || !Array.isArray(sq.options) || sq.options.length < 2) {
      console.error(`[FAIL] Invalid Sprint question ${sq.id} in task ${t}`);
      errors++;
    }
  }
}

console.log(
  `[AUDIT OK] Verified ${ALL_TASKS.length} tasks (4–22): words=${words.length}, fipi=${fipi.length}, sprint=${sprint.length}, errors=${errors}`
);
if (errors > 0) process.exit(1);
