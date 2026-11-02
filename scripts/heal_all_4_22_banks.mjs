import fs from 'node:fs';
import path from 'node:path';
import { classifyWordSubtopicAndException } from '../src/utils/wordClassifier.ts';

const publicData = path.resolve(process.cwd(), 'public/data');
const srcData = path.resolve(process.cwd(), 'src/data');

const TASK_RULES = {
  '4': 'Орфоэпические нормы: постановка ударения в существительных, прилагательных, глаголах и причастиях по словнику ФИПИ.',
  '5': 'Лексические нормы: правильное употребление паронимов в контексте предложений.',
  '6': 'Лексические нормы: устранение речевой избыточности (плеоназма, тавтологии) или исправление неверно употреблённого слова.',
  '7': 'Морфологические нормы: правила образования грамматических форм слов (числительных, существительных, глаголов).',
  '8': 'Синтаксические нормы: грамматические ошибки в построении предложений различных типов.',
  '9': 'Правописание безударных проверяемых, непроверяемых и чередующихся гласных в корне слова.',
  '10': 'Правописание приставок (на -З/-С, ПРЕ-/ПРИ-, буквы Ы/И после приставок, разделительные Ъ и Ь).',
  '11': 'Правописание суффиксов различных частей речи (существительных, прилагательных, глаголов, наречий).',
  '12': 'Правописание личных окончаний глаголов и суффиксов причастий настоящего времени.',
  '13': 'Правописание НЕ и НИ с различными частями речи (слитное и раздельное написание).',
  '14': 'Слитное, дефисное и раздельное написание слов (предлоги, союзы, частицы, наречия, сложные слова).',
  '15': 'Правописание -Н- и -НН- в суффиксах различных частей речи.',
  '16': 'Пунктуация в сложносочинённом предложении (ССП) и в предложениях с однородными членами.',
  '17': 'Знаки препинания в предложениях с обособленными членами (причастными, деепричастными оборотами).',
  '18': 'Знаки препинания в предложениях с вводными словами, конструкциями и обращениями.',
  '19': 'Знаки препинания в сложноподчинённом предложении (СПП) с придаточными.',
  '20': 'Знаки препинания в сложных предложениях с разными видами связи (на стыке союзов).',
  '21': 'Пунктуационный анализ текста: постановка знака препинания по единому правилу синтаксиса.',
  '22': 'Языковые средства выразительности: распознавание тропов, фигур речи, лексических и синтаксических средств.',
};

const wordsRaw = JSON.parse(fs.readFileSync(path.join(publicData, 'allWordsBank9_15.json'), 'utf8'));
const words = Array.isArray(wordsRaw) ? wordsRaw : wordsRaw.words;
const sprint = JSON.parse(fs.readFileSync(path.join(publicData, 'sprintBank9_15.json'), 'utf8'));
const fipi = JSON.parse(fs.readFileSync(path.join(publicData, 'fipiTasksBank9_15.json'), 'utf8'));
const starter = JSON.parse(fs.readFileSync(path.join(srcData, 'starterBank.json'), 'utf8'));

console.log(`[HEAL] Starting healing across all banks: words=${words.length}, sprint=${sprint.length}, fipi=${fipi.length}`);

// 1. Heal Sprint items
let sprintHealed = 0;
for (const s of sprint) {
  const meta = classifyWordSubtopicAndException(
    s.task,
    s.prefix || '',
    s.suffix || '',
    s.answer || '',
    s.explanation || s.rule || '',
    s.context || '',
    s.isTrap
  );

  if (s.topic !== meta.topic || s.rule !== meta.rule) {
    s.topic = meta.topic;
    s.rule = meta.rule;
    sprintHealed++;
  }
  if (meta.isTrap) s.isTrap = true;

  // Sanitize rule if it accidentally still contains exam prompt
  if (/^(?:Укажите|Расставьте|Найдите|В одном из|Отредактируйте|Установите)/i.test(s.rule)) {
    s.rule = TASK_RULES[String(s.task)] || meta.rule;
  }
}
console.log(`[HEAL] Sprint items healed: ${sprintHealed} / ${sprint.length}`);

// 2. Heal Words items
let wordsHealed = 0;
for (const w of words) {
  const meta = classifyWordSubtopicAndException(
    w.task,
    w.prefix || '',
    w.suffix || '',
    w.missingLetter || w.answer || '',
    w.explanation || w.rule || '',
    w.context || '',
    w.isTrap
  );

  if (w.topic !== meta.topic || w.rule !== meta.rule) {
    w.topic = meta.topic;
    w.rule = meta.rule;
    wordsHealed++;
  }
  if (meta.isTrap) w.isTrap = true;

  if (/^(?:Укажите|Расставьте|Найдите|В одном из|Отредактируйте|Установите)/i.test(w.rule)) {
    w.rule = TASK_RULES[String(w.task)] || meta.rule;
  }
}
console.log(`[HEAL] Words items healed: ${wordsHealed} / ${words.length}`);

// 3. Heal FIPI tasks & Linguistic Anomalies
let fipiHealed = 0;
for (const q of fipi) {
  const t = String(q.task);
  if (/^(?:Укажите|Расставьте|Найдите|В одном из|Отредактируйте|Установите)/i.test(q.rule)) {
    q.rule = TASK_RULES[t] || q.rule;
    fipiHealed++;
  }

  // Task 15 data corrections for 6 historical anomalies
  if (q.id === 'fipi-15-neofamily-15-49972' && q.rows && q.rows.length >= 4) {
    q.rows[0].solvedWords = ['Растерзанная'];
    q.rows[0].letter = 'НН';
    q.rows[0].isCorrectRow = true;
    q.rows[0].explanation = 'Растерзанная — полное причастие сов. вида (растерзать) с зависимым словом «тигром», пишется две буквы НН.';
    q.rows[1].solvedWords = ['заваленной'];
    q.rows[1].letter = 'НН';
    q.rows[1].isCorrectRow = true;
    q.rows[1].explanation = 'заваленной — полное причастие сов. вида с приставкой ЗА- и зависимым словом «опилками», пишется две буквы НН.';
    q.rows[2].solvedWords = ['разъярённый'];
    q.rows[2].letter = 'НН';
    q.rows[2].isCorrectRow = true;
    q.rows[2].explanation = 'разъярённый — причастие сов. вида с приставкой РАЗ-, пишется две буквы НН.';
    q.rows[3].solvedWords = ['намеренно'];
    q.rows[3].letter = 'НН';
    q.rows[3].isCorrectRow = true;
    q.rows[3].explanation = 'намеренно — наречие на -О, образовано от прилагательного «намеренный», пишется две буквы НН.';
    q.correctIndices = [1, 2, 3, 4];
    fipiHealed++;
  }

  if (q.id === 'fipi-15-neofamily-15-29688' && q.rows && q.rows.length >= 3) {
    q.rows[0].solvedWords = ['Диковинная'];
    q.rows[0].letter = 'НН';
    q.rows[0].isCorrectRow = true;
    q.rows[0].explanation = 'Диковинная — отымённое прилагательное на стыке основы на -Н (диковина) и суффикса -Н-, пишется две буквы НН.';
    q.rows[1].solvedWords = ['выполненная'];
    q.rows[1].letter = 'НН';
    q.rows[1].isCorrectRow = true;
    q.rows[1].explanation = 'выполненная — полное причастие сов. вида с приставкой ВЫ- и зависимым словом «мастером», пишется две буквы НН.';
    q.rows[2].solvedWords = ['связанной'];
    q.rows[2].letter = 'НН';
    q.rows[2].isCorrectRow = true;
    q.rows[2].explanation = 'связанной — полное причастие сов. вида с приставкой С- и зависимым словом, пишется две буквы НН.';
    q.correctIndices = [1, 2, 3];
    fipiHealed++;
  }

  if (q.id === 'fipi-15-neofamily-15-9748' && q.rows && q.rows.length >= 5) {
    q.rows[4].solvedWords = ['скованно'];
    q.rows[4].letter = 'НН';
    q.rows[4].isCorrectRow = true;
    q.rows[4].explanation = 'скованно — наречие на -О, образовано от причастия сов. вида «скованный» (приставка С-), пишется две буквы НН.';
    fipiHealed++;
  }

  if (q.id === 'fipi-15-umschool-15-216272' && q.rows && q.rows.length >= 4) {
    q.rows[0].solvedWords = ['рискованны'];
    q.rows[0].letter = 'НН';
    q.rows[0].isCorrectRow = true;
    q.rows[0].explanation = 'рискованны — краткое прилагательное, образованное от «рискованный» (суффикс -ОВА-), пишется две буквы НН.';
    q.rows[1].solvedWords = ['обдуманы'];
    q.rows[1].letter = 'Н';
    q.rows[1].isCorrectRow = false;
    q.rows[1].explanation = 'обдуманы — краткое страдательное причастие прошедшего времени, всегда пишется с одной буквой Н.';
    q.rows[2].solvedWords = ['озабочены'];
    q.rows[2].letter = 'Н';
    q.rows[2].isCorrectRow = false;
    q.rows[2].explanation = 'озабочены — краткое страдательное причастие прошедшего времени, всегда пишется с одной буквой Н.';
    q.rows[3].solvedWords = ['уверены'];
    q.rows[3].letter = 'Н';
    q.rows[3].isCorrectRow = false;
    q.rows[3].explanation = 'уверены — краткая форма, пишется одна буква Н.';
    fipiHealed++;
  }

  if (q.id === 'fipi-15-100points-15-1084' && q.rows && q.rows.length >= 5) {
    q.rows[2].solvedWords = ['кованый'];
    q.rows[2].letter = 'Н';
    q.rows[2].isCorrectRow = true;
    q.rows[2].explanation = 'кованый — отглагольное прилагательное несовершенного вида без приставок и зависимых слов (-ов- входит в корень: ков-а-ть), пишется одна буква Н.';
    q.correctIndices = [1, 2, 3];
    fipiHealed++;
  }

  if (q.id === 'fipi-15-100points-15-6824' && q.rows && q.rows.length >= 4) {
    q.rows[0].solvedWords = ['названы'];
    q.rows[0].letter = 'Н';
    q.rows[0].isCorrectRow = false;
    q.rows[0].explanation = 'названы — краткое страдательное причастие прошедшего времени, пишется одна буква Н.';
    q.rows[1].solvedWords = ['деревянные'];
    q.rows[1].letter = 'НН';
    q.rows[1].isCorrectRow = true;
    q.rows[1].explanation = 'деревянные — слово-исключение с суффиксом -ЯНН-, пишется две буквы НН.';
    q.rows[2].solvedWords = ['украшенные'];
    q.rows[2].letter = 'НН';
    q.rows[2].isCorrectRow = true;
    q.rows[2].explanation = 'украшенные — полное причастие сов. вида с зависимым словом «завитком», пишется две буквы НН.';
    q.rows[3].solvedWords = ['лошадиной'];
    q.rows[3].letter = 'Н';
    q.rows[3].isCorrectRow = false;
    q.rows[3].explanation = 'лошадиной — отымённое прилагательное с суффиксом -ИН-, пишется одна буква Н.';
    q.correctIndices = [2, 3];
    fipiHealed++;
  }
}

// Heal matching sprint items
for (const s of sprint) {
  if (s.id === 'sp-15-neofamily-15-49972-r1-w1') {
    s.prefix = 'Растерза';
    s.suffix = 'ая';
    s.answer = 'НН';
    s.explanation = 'Растерзанная — полное причастие сов. вида (растерзать) с зависимым словом «тигром», пишется две буквы НН.';
    s.rule = 'Две буквы НН пишутся в причастиях и отглагольных словах при наличии хотя бы одного условия: 1) есть приставка кроме НЕ-; 2) есть зависимые слова; 3) суффиксы -ОВА-/-ЕВА-; 4) образовано от глагола совершенного вида (купленный, решённый, украшенный).';
    s.topic = 'Причастия и отглагольные прилагательные (две буквы НН)';
  }
  if (s.id === 'sp-15-neofamily-15-29688-r1-w1') {
    s.prefix = 'Дикови';
    s.suffix = 'ая';
    s.answer = 'НН';
    s.explanation = 'Диковинная — отымённое прилагательное на стыке основы на -Н (диковина) и суффикса -Н-, пишется две буквы НН.';
    s.rule = 'На стыке основы (корня) на -Н- и суффикса -Н- всегда пишется две буквы НН (туман → туманный, осень → осенний, старина → старинный).';
    s.topic = 'Стык основы на -Н- и суффикса -Н- (две буквы НН)';
  }
}
console.log(`[HEAL] FIPI questions healed: ${fipiHealed} / ${fipi.length}`);

// 4. Synchronize starterBank.json
const sprintMap = new Map(sprint.map((s) => [s.id, s]));
const wordsMap = new Map(words.map((w) => [w.id, w]));
const fipiMap = new Map(fipi.map((f) => [f.id, f]));

starter.sprint = starter.sprint.map((s) => sprintMap.get(s.id) || s);
starter.words = starter.words.map((w) => wordsMap.get(w.id) || w);
starter.fipi = starter.fipi.map((f) => fipiMap.get(f.id) || f);

// 5. Write to public/data and src/data
fs.writeFileSync(path.join(publicData, 'sprintBank9_15.json'), JSON.stringify(sprint), 'utf8');
fs.writeFileSync(path.join(publicData, 'sprintBank.json'), JSON.stringify(sprint), 'utf8');

fs.writeFileSync(
  path.join(publicData, 'allWordsBank9_15.json'),
  JSON.stringify(Array.isArray(wordsRaw) ? words : { ...wordsRaw, words }),
  'utf8'
);
fs.writeFileSync(
  path.join(publicData, 'allWordsBank.json'),
  JSON.stringify(Array.isArray(wordsRaw) ? words : { ...wordsRaw, words }),
  'utf8'
);

fs.writeFileSync(path.join(publicData, 'fipiTasksBank9_15.json'), JSON.stringify(fipi), 'utf8');
fs.writeFileSync(path.join(publicData, 'fipiTasksBank.json'), JSON.stringify(fipi), 'utf8');

fs.writeFileSync(path.join(srcData, 'starterBank.json'), JSON.stringify(starter), 'utf8');

console.log('[HEAL COMPLETE] All full banks and starterBank successfully healed and synchronized!');
