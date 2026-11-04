import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTrainerBank,
  createInitialState,
  calculateTotalPlanned,
  stepTaskQty,
  buildWorkoutQueue,
  applyAnswerToState,
  encodeBackupCode,
  decodeBackupCode,
  calculateAccuracyPercent,
  normalizeKimDigits,
  FLASHCARDS_BANK,
  HOMOPHONE_PAIRS_BANK,
  cleanScraperArtifacts,
  cleanWord,
  cleanExplanation,
  cleanQuestionRule,
  resolveTask15Sentence,
  checkFipiQuestionAnswer,
  formatTask14SolvedWord,
  TASK_IDS,
  TASK_BLOCKS,
} from './trainerLogic.ts';
import { parseStructuredExplanation } from '../components/WorkWindows.tsx';
import { classifyWordSubtopicAndException } from './wordClassifier.ts';
import { sanitizeLoadedState } from './storageSync.ts';

test('FIPI bank generates sprint questions + FIPI sets + KIM variants + flashcards & homophones', () => {
  const bank = getTrainerBank();
  const isFullBank = bank.sprintQuestions.length >= 1000;
  if (isFullBank) {
    assert.equal(bank.sprintQuestions.length >= 5000, true);
    assert.equal(bank.fipiQuestions.length >= 250, true);
  } else {
    assert.equal(bank.sprintQuestions.length >= 200, true);
    assert.equal(bank.fipiQuestions.length >= 25, true);
  }
  assert.equal(bank.trapQuestions.length >= 15, true);
  assert.equal(bank.kimVariants.length >= 25, true);
  assert.equal(FLASHCARDS_BANK.length >= 14, true);
  assert.equal(HOMOPHONE_PAIRS_BANK.length >= 8, true);

  // Verify KIM Variant 1 has varied correctIndices across tasks 9-15 (not all identical)
  const v1 = bank.kimVariants[0];
  const distinctAnswers = new Set(
    (['9', '10', '11', '12', '13', '14', '15'] as const).map((t) => v1.tasks[t].correctIndices.join(''))
  );
  assert.equal(distinctAnswers.size >= 3, true);
});

test('task quantities step, clamp, and sum accurately for tasks 4-22 including enabledTasks filter', () => {
  const state = createInitialState();
  // 7 orthography tasks (9-15) * 5 = 35, plus 12 other tasks (4-8, 16-22) * 3 = 36 => 71
  assert.equal(calculateTotalPlanned(state.quantities), 71);
  assert.equal(calculateTotalPlanned(state.quantities, { ...state.enabledTasks, '4': false, '22': false }), 65);
  assert.equal(stepTaskQty(5, -10), 0);
  assert.equal(stepTaskQty(995, 20), 1000);

  const q14 = buildWorkoutQueue({ '14': 5 }, 'sprint');
  assert.equal(q14.length, 5);
  assert.equal(q14.every((q) => q.task === '14'), true);

  const q15 = buildWorkoutQueue({ '15': 5 }, 'sprint');
  assert.equal(q15.length, 5);
  assert.equal(q15.every((q) => q.task === '15'), true);
});

test('KIM blank digit normalization sorts and deduplicates answer digits 1-5', () => {
  assert.equal(normalizeKimDigits('41319'), '134');
  assert.equal(normalizeKimDigits('52'), '25');
});

test('applyAnswerToState updates streaks, taskStats, and errorBank accurately', () => {
  const bank = getTrainerBank();
  const sampleQ = bank.sprintQuestions[0];
  let state = createInitialState();

  state = applyAnswerToState(state, sampleQ, false, 'А', true);
  assert.equal(state.totalSolved, 1);
  assert.equal(state.errorBank.length, 1);

  state = applyAnswerToState(state, sampleQ, true, sampleQ.answer, true);
  assert.equal(state.totalSolved, 2);
  assert.equal(state.totalCorrect, 1);
  assert.equal(state.bestStreak, 1);
  assert.equal(state.errorBank.length, 0);
  assert.equal(calculateAccuracyPercent(state.totalCorrect, state.totalSolved), 50);
});

test('Backup code encodes and restores all 5-tab state fields including records and journal', () => {
  const bank = getTrainerBank();
  let state = createInitialState();
  state = applyAnswerToState(state, bank.sprintQuestions[2], false, 'А', false);
  state.sessionsCompleted = 4;
  state.bestStreak = 18;
  state.bestBlitz60 = 24;
  state.bestSurvival = 15;
  state.darkMode = true;
  state.profilePin = 'ALEX99';
  state.sessionJournal = [
    {
      id: 'sj-1',
      title: 'Занятие (25 заданий)',
      total: 25,
      correct: 23,
      accuracy: 92,
      dateLabel: 'Сегодня',
    },
  ];

  const code = encodeBackupCode(state);
  const restored = decodeBackupCode(code);
  assert.notEqual(restored, null);
  assert.equal(restored?.totalSolved, 1);
  assert.equal(restored?.bestStreak, 18);
  assert.equal(restored?.bestBlitz60, 24);
  assert.equal(restored?.bestSurvival, 15);
  assert.equal(restored?.darkMode, true);
  assert.equal(restored?.profilePin, 'ALEX99');
  assert.equal(restored?.errorBank.length, 1);
  assert.equal(restored?.sessionJournal.length, 1);
});

test('buildWorkoutQueue randomizes selection and assigns unique instanceIds across sessions', () => {
  const qA = buildWorkoutQueue({ '9': 10, '10': 0, '11': 0, '12': 0, '13': 0, '14': 0, '15': 0 }, 'sprint');
  const qB = buildWorkoutQueue({ '9': 10, '10': 0, '11': 0, '12': 0, '13': 0, '14': 0, '15': 0 }, 'sprint');

  assert.equal(qA.length, 10);
  assert.equal(qB.length, 10);

  // Every question in a session has a unique instanceId
  const instanceIdsA = new Set(qA.map((q) => q.instanceId));
  assert.equal(instanceIdsA.size, 10);

  // Multiple sessions generate different starting word sequences (randomized, realistic exam practice)
  const idsA = qA.map((q) => q.id).join(',');
  const idsB = qB.map((q) => q.id).join(',');
  assert.notEqual(idsA, idsB);
});

test('sprint questions have exact per-word topics and mark exceptions explicitly', () => {
  const bank = getTrainerBank();

  const raskachatsya = bank.sprintQuestions.find(
    (q) => q.prefix === 'раск' && q.suffix === 'чаться'
  );
  assert.ok(raskachatsya);
  assert.equal(raskachatsya.topic, 'Проверяемая безударная гласная в корне');
  assert.equal(Boolean(raskachatsya.isTrap), false);

  const rostok = bank.sprintQuestions.find(
    (q) => q.prefix === 'р' && q.suffix === 'сток'
  );
  assert.ok(rostok);
  assert.ok(rostok.topic.startsWith('Исключение:'));
  assert.equal(rostok.isTrap, true);

  const utvar = bank.sprintQuestions.find(
    (q) => q.prefix === 'утв' && q.suffix === 'рь'
  );
  assert.ok(utvar);
  assert.equal(utvar.topic, 'Исключение: корень -ТВАР-/-ТВОР-');
  assert.equal(utvar.isTrap, true);

  const nedoumevaya = bank.sprintQuestions.find(
    (q) => q.prefix === 'недоум' && q.suffix === 'вая'
  );
  assert.ok(nedoumevaya);
  assert.equal(nedoumevaya.topic, 'Исключение: глаголы перед ударным -ВА-');
  assert.equal(nedoumevaya.isTrap, true);
});

test('Homophone pairs and Task 12 conjugation questions have balanced non-obvious options', () => {
  // 1. Homophone pairs have 50/50 split and never > 2 identical correct button positions in a row
  let maxStreak = 0;
  let currentStreak = 0;
  let lastBtn = -1;
  let btn0Count = 0;

  for (const p of HOMOPHONE_PAIRS_BANK) {
    const btnIdx = p.options.indexOf(p.correctOption);
    assert.notEqual(btnIdx, -1);
    if (btnIdx === 0) btn0Count++;
    if (btnIdx === lastBtn) {
      currentStreak++;
    } else {
      lastBtn = btnIdx;
      currentStreak = 1;
    }
    if (currentStreak > maxStreak) maxStreak = currentStreak;
  }

  assert.equal(maxStreak <= 2, true);
  // Strict 50/50 split across all pairs
  assert.equal(btn0Count, HOMOPHONE_PAIRS_BANK.length / 2);

  // Verify task 14 and 15 homophone pairs exist
  const task14Pairs = HOMOPHONE_PAIRS_BANK.filter((p) => p.task === '14');
  const task15Pairs = HOMOPHONE_PAIRS_BANK.filter((p) => p.task === '15');
  assert.equal(task14Pairs.length >= 8, true);
  assert.equal(task15Pairs.length >= 8, true);

  // Verify task 14 and 15 flashcards exist
  const task14Cards = FLASHCARDS_BANK.filter((c) => c.task === '14');
  const task15Cards = FLASHCARDS_BANK.filter((c) => c.task === '15');
  assert.equal(task14Cards.length >= 8, true);
  assert.equal(task15Cards.length >= 8, true);

  // 2. Task 12 questions never pair same-conjugation У/Ю or А/Я together
  const bank = getTrainerBank();
  const task12Questions = bank.sprintQuestions.filter((q) => q.task === '12');
  for (const q of task12Questions) {
    const sortedPair = q.options.slice().sort().join('/');
    assert.notEqual(sortedPair, 'У/Ю', `Word ${q.prefix}..${q.suffix} had same-conjugation У/Ю`);
    assert.notEqual(sortedPair, 'А/Я', `Word ${q.prefix}..${q.suffix} had same-conjugation А/Я`);
  }
});

test('Task 15 FIPI questions have authentic sentences, non-empty gap tokens, and zero scraper artifacts', () => {
  const bank = getTrainerBank();
  const t15Questions = bank.fipiQuestions.filter((q) => q.task === '15');
  assert.equal(t15Questions.length >= 6, true, 'At least 6 Task 15 FIPI questions available');

  for (const q of t15Questions) {
    const sentence = q.sentence || q.instruction;
    assert.ok(sentence, `Task 15 question ${q.id} must have a non-empty sentence`);
    assert.equal(sentence.includes('— «...'), false, `Question ${q.id} sentence contains scraper artifact`);
    assert.equal(sentence.includes('«...—'), false, `Question ${q.id} sentence contains scraper artifact`);
    assert.equal(q.rule.includes('— «...'), false, `Question ${q.id} rule contains scraper artifact`);
    assert.equal(q.rule.includes('Предложение:'), false, `Question ${q.id} rule should not embed "Предложение:"`);

    // Must contain gap numbers (1), (2), etc.
    const gapMatches = [...sentence.matchAll(/([А-Яа-яЁё]+)\((\d+)\)([А-Яа-яЁё]*)/g)];
    assert.ok(gapMatches.length >= 2, `Question ${q.id} must contain at least 2 gap tokens in sentence`);
    assert.equal(gapMatches.length, q.rows.length, `Question ${q.id} gaps count must match rows count`);

    // Verify rows are clean
    for (const r of q.rows) {
      for (const w of r.words) {
        assert.equal(w.includes('— «...'), false, `Word "${w}" in ${q.id} contains scraper artifact`);
        assert.equal(w.includes('«...'), false, `Word "${w}" in ${q.id} contains scraper artifact`);
      }
    }

    // Verify correctIndices are within 1..rows.length
    for (const idx of q.correctIndices) {
      assert.ok(idx >= 1 && idx <= q.rows.length, `correctIndex ${idx} out of range in ${q.id}`);
    }
  }
});

test('resolveTask15Sentence and clean helpers heal broken screenshot question format', () => {
  const brokenQ = {
    task: '15',
    rule: 'Укажите цифру(-ы), на месте которой(-ых) пишется Н. Предложение: «глиня(1)ые — «...— «...глиня(1)ые...»»',
    rows: [
      {
        words: ['глиня(1)ые — «...— «...глиня(1)ые...»'],
        solvedWords: ['глиняные'],
        letter: 'Н',
        isCorrectRow: true,
        explanation: 'глиняный — суффикс -ЯН- отыменного прилагательного → одна Н — «...глиня(1)ые...»',
      },
      {
        words: ['глиня(2)ые — «...глиня(1)ые...»'],
        solvedWords: ['глиняные'],
        letter: 'Н',
        isCorrectRow: true,
        explanation: 'глиняный — суффикс -ЯН- отыменного прилагательного → одна Н',
      },
    ],
    correctIndices: [1, 2],
  };

  const cleanedRule = cleanQuestionRule(brokenQ.rule, '15');
  assert.equal(cleanedRule, 'Укажите цифру(-ы), на месте которой(-ых) пишется Н.');

  const resolvedSent = resolveTask15Sentence(brokenQ);
  assert.ok(resolvedSent.length >= 15, 'Resolved sentence must not be empty');
  assert.equal(resolvedSent.includes('— «...'), false, 'Must not have scraper artifact');
  assert.equal(resolvedSent.includes('«...—'), false, 'Must not have scraper artifact');
  assert.equal(resolvedSent.includes('(1)'), true, 'Must contain gap (1)');
  assert.equal(resolvedSent.includes('(2)'), true, 'Must contain gap (2)');

  const cleanWord1 = cleanWord(brokenQ.rows[0].words[0]);
  assert.equal(cleanWord1, 'глиня(1)ые');

  const cleanWord2 = cleanWord(brokenQ.rows[1].words[0]);
  assert.equal(cleanWord2, 'глиня(2)ые');

  const cleanExp1 = cleanExplanation(brokenQ.rows[0].explanation);
  assert.ok(cleanExp1.includes('глиняный — суффикс -ЯН- отыменного прилагательного → одна Н'));
  assert.equal(cleanExp1.includes('— «...'), false);

  // Test Cyrillic Ze homoglyph conversion
  const homoglyphSent = resolveTask15Sentence({
    task: '15',
    sentence: 'На карти(1)е были изображе(2)ы ю(З)ая девушка и стари(4)ый дом.',
    rows: [
      { words: ['карти(1)е'], solvedWords: ['картиНе'] },
      { words: ['изображе(2)ы'], solvedWords: ['изображеНы'] },
      { words: ['ю(З)ая'], solvedWords: ['юНая'] },
      { words: ['стари(4)ый'], solvedWords: ['стариННый'] },
    ],
  });
  assert.equal(homoglyphSent.includes('(3)'), true, 'Cyrillic Ze must be converted to digit 3');
  assert.equal(homoglyphSent.includes('(З)'), false);
});

test('All FIPI questions across tasks 4-22 in trainer bank have strictly valid row counts and indices', () => {
  const bank = getTrainerBank();
  for (const q of bank.fipiQuestions) {
    assert.ok(q.rule, `Question ${q.id} must have a non-empty rule`);
    assert.ok(q.correctIndices.length >= 1, `Question ${q.id} must have at least 1 correctIndex`);

    if (['4', '9', '10', '11', '12', '13', '14', '16'].includes(q.task)) {
      assert.equal(q.rows.length, 5, `Question ${q.id} (task ${q.task}) must have exactly 5 rows`);
    } else if (['15', '17', '18', '19', '20'].includes(q.task)) {
      assert.ok(q.rows.length >= 2, `Question ${q.id} (task ${q.task}) must have at least 2 rows`);
      const sent = q.sentence || q.instruction;
      assert.ok(sent && sent.length >= 15, `Question ${q.id} (task ${q.task}) must have a non-empty sentence`);
    } else if (['5', '6', '7'].includes(q.task)) {
      assert.ok(q.rows.length >= 1, `Question ${q.id} (task ${q.task}) must have at least 1 row`);
    } else if (['8', '21', '22'].includes(q.task)) {
      assert.ok(q.rows.length >= 4 && q.rows.length <= 9, `Question ${q.id} (task ${q.task}) must have 4..9 rows`);
    }

    for (const c of q.correctIndices) {
      const maxIdx = ['8', '22'].includes(q.task) ? 9 : q.rows.length;
      assert.ok(c >= 1 && c <= maxIdx, `correctIndex ${c} out of range in ${q.id}`);
    }

    for (const r of q.rows) {
      assert.ok(r.words.length >= 1, `Row in ${q.id} has empty words`);
      assert.ok(r.solvedWords.length >= 1, `Row in ${q.id} has empty solvedWords`);
      for (const w of r.words) {
        assert.equal(w.includes('— «...'), false, `Scraper artifact in word "${w}" of ${q.id}`);
      }
    }
  }
});

test('All sprint questions have answer strictly contained in options with zero hyphenated conjunction bugs', () => {
  const bank = getTrainerBank();
  for (const s of bank.sprintQuestions) {
    assert.ok(s.options && s.options.includes(s.answer), `Sprint question ${s.id} answer "${s.answer}" not in options [${s.options?.join(', ')}]`);
    if (s.task === '14') {
      const raw = `${s.prefix || ''}${s.suffix || ''}`.replace(/[()]/g, '').trim().toUpperCase();
      if (['ЗАТО', 'ПОТОМУ', 'ПОЭТОМУ', 'ОТТОГО', 'ПРИТОМ', 'ПРИЧЕМ', 'ТОЖЕ', 'ТАКЖЕ', 'ЧТОБЫ'].includes(raw)) {
        assert.notEqual(s.answer, 'ДЕФИСНО', `Sprint question ${s.id} (${raw}) must not have answer ДЕФИСНО`);
      }
    }
  }
});

test('Homophone pairs pair-15-1 and pair-15-3 have authentic solitary contexts with correct N/NN answers', () => {
  const pair1 = HOMOPHONE_PAIRS_BANK.find((p) => p.id === 'pair-15-1');
  assert.ok(pair1);
  assert.ok(pair1.options.includes(pair1.correctOption));
  const p1SingleWord = pair1.leftContext.includes('молодой спортсмен') ? pair1.leftAns : pair1.rightAns;
  const p1DependentWord = pair1.leftContext.includes('на тренировке') ? pair1.leftAns : pair1.rightAns;
  assert.equal(p1SingleWord, 'Н');
  assert.equal(p1DependentWord, 'НН');
  assert.equal(pair1.leftContext.includes('в плечо') || pair1.rightContext.includes('в плечо'), false);

  const pair3 = HOMOPHONE_PAIRS_BANK.find((p) => p.id === 'pair-15-3');
  assert.ok(pair3);
  assert.ok(pair3.options.includes(pair3.correctOption));
  const p3SingleWord = pair3.leftContext.includes('аппетитный картофель') ? pair3.leftAns : pair3.rightAns;
  const p3DependentWord = pair3.leftContext.includes('с грибами') || pair3.leftWordGap.includes('с грибами') ? pair3.leftAns : pair3.rightAns;
  assert.equal(p3SingleWord, 'Н');
  assert.equal(p3DependentWord, 'НН');
  assert.equal(pair3.leftContext.includes('на скорую руку') || pair3.rightContext.includes('на скорую руку'), false);
});

test('FIPI Task 14 explanations have zero contradictory hyphenated rules and deduplicated indices', () => {
  const bank = getTrainerBank();
  for (const q of bank.fipiQuestions) {
    const uniqueIndices = new Set(q.correctIndices);
    assert.equal(uniqueIndices.size, q.correctIndices.length, `FIPI question ${q.id} has duplicate correctIndices`);
    if (q.task === '14') {
      for (const r of q.rows) {
        assert.equal(
          /(?:ПО-ТОМУ|ПО-ЭТОМУ|ЗА-ТО|ОТ-ТОГО|ПРИ-ТОМ|ПРИ-ЧЕМ|ТО-ЖЕ|ТАК-ЖЕ|ЧТО-БЫ)/.test(r.explanation),
          false,
          `FIPI Task 14 question ${q.id} row has corrupted hyphenated conjunction in explanation: "${r.explanation}"`
        );
      }
    }
  }
});
test('Task 13 and Task 14 linguistic and classification fixes (Photos 1, 2, 3)', () => {
  const bank = getTrainerBank();

  // Photo 1: В КОНЦЕ КОНЦОВ is always separate (РАЗДЕЛЬНО)
  const fipi130924 = bank.fipiQuestions.find((q) => q.id === 'fipi-14-shkolkovo-14-130924');
  assert.ok(fipi130924);
  assert.equal(fipi130924.rows[0].letter, 'ДЕФИСНО / РАЗДЕЛЬНО');
  assert.equal(fipi130924.rows[0].isCorrectRow, false);
  assert.ok(fipi130924.rows[0].solvedWords[0].includes('В КОНЦЕ КОНЦОВ'));
  assert.ok(fipi130924.rows[0].explanation.includes('В КОНЦЕ КОНЦОВ'));

  for (const s of bank.sprintQuestions) {
    const full = `${s.prefix || ''}${s.suffix || ''}`.replace(/[()]/g, '').trim().toUpperCase();
    if (full.includes('КОНЦЕКОНЦОВ') || full === 'В КОНЦЕ КОНЦОВ') {
      assert.equal(s.answer, 'РАЗДЕЛЬНО', `Sprint ${s.id} with В КОНЦЕ КОНЦОВ must have answer РАЗДЕЛЬНО`);
    }
  }

  // Photo 2: СОРОКАМИНУТНЫЙ is a compound numeral adjective, not a preposition
  const spSorok = bank.sprintQuestions.find((s) => s.id === 'sp-14-neofamily-14-50547-r3-w1');
  if (spSorok) {
    assert.equal(spSorok.topic, 'Сложные прилагательные (слитно)');
    assert.ok(spSorok.explanation.includes('сложное прилагательное'));
    assert.equal(spSorok.explanation.includes('наречие, производный предлог или союз'), false);
  }

  // Photo 3: НЕ ВЫХОДЯЩИМИ has dependent phrase «за пределы простейших ощущений» -> РАЗДЕЛЬНО with zero contradictions
  const fipi54722 = bank.fipiQuestions.find((q) => q.id === 'fipi-13-neofamily-13-54722');
  assert.ok(fipi54722);
  const r3 = fipi54722.rows[2];
  assert.equal(r3.letter, 'РАЗДЕЛЬНО');
  assert.equal(r3.isCorrectRow, false);
  assert.ok(r3.solvedWords[0].includes('НЕ ВЫХОДЯЩИМИ'));
  assert.ok(r3.explanation.includes('зависимым'));
  assert.equal(r3.explanation.includes('нет зависимых'), false);

  const sp54722 = bank.sprintQuestions.find((s) => s.id === 'sp-13-neofamily-13-54722-r3-w1');
  if (sp54722) {
    assert.equal(sp54722.answer, 'РАЗДЕЛЬНО');
    assert.equal(sp54722.topic, 'Полные причастия с зависимыми словами (раздельно)');
    assert.equal(sp54722.explanation.includes('нет зависимых'), false);
  }

  // Verification: zero occurrences of placeholder in Task 14 FIPI and sprint
  for (const q of bank.fipiQuestions) {
    if (q.task === '14') {
      for (const r of q.rows) {
        assert.equal(
          r.explanation.includes('наречие, производный предлог или союз'),
          false,
          `FIPI ${q.id} still has placeholder in explanation: ${r.explanation}`
        );
      }
    }
  }

  // Verification: zero contradictions between dependent word/contrast and СЛИТНО in Task 13
  for (const q of bank.fipiQuestions) {
    if (q.task === '13') {
      for (let i = 0; i < q.rows.length; i++) {
        const r = q.rows[i];
        if (r.letter === 'СЛИТНО') {
          assert.equal(
            r.explanation.includes('есть зависимое слово') || r.explanation.includes('есть зависимые слова'),
            false,
            `Task 13 contradiction in ${q.id} row ${i + 1}: marked СЛИТНО but mentions dependent word`
          );
          assert.equal(
            r.explanation.includes('есть противопоставление'),
            false,
            `Task 13 contradiction in ${q.id} row ${i + 1}: marked СЛИТНО but mentions противопоставление`
          );
        }
      }
    }
  }
});

test('Task 13 multi-answer integrity, correctIndices alignment, and zero illegal СЛИТНО spellings', () => {
  const bank = getTrainerBank();

  // 1. Verify specific healed Task 13 questions
  const q54722 = bank.fipiQuestions.find((q) => q.id === 'fipi-13-neofamily-13-54722');
  assert.ok(q54722);
  assert.deepEqual(q54722.correctIndices, [2, 4, 5]);

  const q66995 = bank.fipiQuestions.find((q) => q.id === 'fipi-13-neofamily-13-66995');
  assert.ok(q66995);
  assert.deepEqual(q66995.correctIndices, [2, 3]);

  const q42727 = bank.fipiQuestions.find((q) => q.id === 'fipi-13-umschool-13-42727');
  assert.ok(q42727);
  assert.deepEqual(q42727.correctIndices, [2, 5]);

  const q18613 = bank.fipiQuestions.find((q) => q.id === 'fipi-13-neofamily-13-18613');
  assert.ok(q18613);
  assert.deepEqual(q18613.correctIndices, [1, 2, 4]);

  // 2. All Task 13 questions must have correctIndices that match their rows where isCorrectRow === true
  for (const q of bank.fipiQuestions) {
    if (q.task === '13') {
      const derivedIndices = q.rows
        .map((r, i) => (r.isCorrectRow ? i + 1 : null))
        .filter((x): x is number => x !== null);
      assert.deepEqual(
        q.correctIndices,
        derivedIndices,
        `Task 13 question ${q.id} correctIndices [${q.correctIndices}] does not match rows isCorrectRow [${derivedIndices}]`
      );
      assert.ok(
        q.correctIndices.length >= 2 && q.correctIndices.length <= 4,
        `Task 13 question ${q.id} has invalid number of correct answers (${q.correctIndices.length}) for standard 2-4 KIM answer format`
      );
    }
  }

  // 3. Zero instances of illegal СЛИТНО with verbs, short participles, comparatives in sprint questions
  const illegalSplitPatterns = [
    /^НЕ\s+(?:БЫЛ|СОБИРАЛСЯ|МОГ|ЗНАЛ|ВИДЕЛ|ПРИЗНАТЬСЯ)$/i,
    /^НЕ\s+(?:СВАРЕН|ПРОЧИТАН|ВЗЯТА|ЗАКРЫТА|ЗАКРУЧЕНА|РАЗЛИТ|ВЫПОЛНЕНЫ|НАСТРОЕНА)$/i,
    /^НЕ\s+(?:ВЫШЕ|МЕНЬШЕ|ГРОМЧЕ|ЯРЧЕ|БОЛЬШЕ)$/i,
    /^НЕ\s+ПО-[А-ЯЁ]+/i,
    /^НЕ\s+(?:КАЖДЫЙ|ВСЕ|ТОЙ)$/i,
    /^НЕ\s+РАЗ$/i,
  ];

  for (const s of bank.sprintQuestions) {
    if (s.task === '13') {
      const fullWord = `${s.prefix || ''}${s.suffix || ''}`.replace(/[()]/g, '').trim().toUpperCase();
      for (const pat of illegalSplitPatterns) {
        if (pat.test(fullWord)) {
          assert.equal(
            s.answer,
            'РАЗДЕЛЬНО',
            `Sprint question ${s.id} for "${fullWord}" must have answer РАЗДЕЛЬНО, but got ${s.answer}`
          );
        }
      }
    }
  }
});

test('Photos 1, 2, 3, 4, 5 regression tests & structured explanation sanitization', () => {
  const bank = getTrainerBank();

  // Photo 1: (НЕ)РАССЛЫШАННЫЙ преподавателем -> РАЗДЕЛЬНО with zero self-contradiction
  const fipi49277 = bank.fipiQuestions.find((q) => q.id === 'fipi-13-neofamily-13-49277');
  assert.ok(fipi49277);
  const p1Row = fipi49277.rows.find((r) => r.words[0].includes('РАССЛЫШАННЫЙ'));
  assert.ok(p1Row);
  assert.equal(p1Row.letter, 'РАЗДЕЛЬНО');
  assert.equal(p1Row.explanation.includes('нет зависимых'), false);
  assert.equal(p1Row.explanation.includes('пишется СЛИТНО'), false);
  assert.ok(p1Row.explanation.includes('зависимым'));

  // Photo 2: (НЕ)ДОЖДАВШИЕСЯ ужина -> РАЗДЕЛЬНО
  const fipi37254 = bank.fipiQuestions.find((q) => q.id === 'fipi-13-neofamily-13-37254');
  assert.ok(fipi37254);
  const p2Row = fipi37254.rows.find((r) => r.words[0].includes('ДОЖДАВШИЕСЯ'));
  assert.ok(p2Row);
  assert.equal(p2Row.letter, 'РАЗДЕЛЬНО');
  assert.equal(p2Row.explanation.includes('нет зависимых'), false);
  assert.equal(p2Row.explanation.includes('пишется СЛИТНО'), false);

  // Photo 3: (НА)ЗАВТРА ... (ПО)ЭТОМУ -> СЛИТНО, zero hyphen claims
  const fipi29683 = bank.fipiQuestions.find((q) => q.id === 'fipi-14-neofamily-14-29683');
  assert.ok(fipi29683);
  const p3Row = fipi29683.rows.find((r) => r.words[0].includes('НАЗАВТРА') || r.words[0].includes('(НА)ЗАВТРА'));
  assert.ok(p3Row);
  assert.equal(p3Row.letter, 'СЛИТНО / СЛИТНО');
  assert.equal(p3Row.explanation.includes('через дефис'), false);
  assert.equal(p3Row.explanation.includes('ДЕФИС'), false);

  // Photo 4: ИНЖЕНЕРОМ(ТЕХНОЛОГОМ) -> ДЕФИСНО
  const spCompound = bank.sprintQuestions.find((s) => s.id === 'sp-14-neofamily-14-50045-r3-w1');
  assert.ok(spCompound);
  assert.equal(spCompound.answer, 'ДЕФИСНО');
  assert.equal(spCompound.prefix, '(ИНЖЕНЕРОМ)');
  assert.equal(spCompound.suffix, 'ТЕХНОЛОГОМ');
  assert.ok(spCompound.options.includes('ДЕФИСНО'));

  // Photo 5: (НЕ)ХРУСТАЛЬНАЯ -> РАЗДЕЛЬНО, topic & category "Правописание НЕ с прилагательными"
  const fipi47871 = bank.fipiQuestions.find((q) => q.id === 'fipi-13-neofamily-13-47871');
  assert.ok(fipi47871);
  const p5Row = fipi47871.rows.find((r) => r.words[0].includes('ХРУСТАЛЬНАЯ'));
  assert.ok(p5Row);
  assert.equal(p5Row.letter, 'РАЗДЕЛЬНО');
  assert.ok(p5Row.explanation.includes('противопоставлением'));

  const sp47871 = bank.sprintQuestions.find((s) => s.id === 'sp-13-neofamily-13-47871-r3-w1');
  assert.ok(sp47871);
  assert.equal(sp47871.answer, 'РАЗДЕЛЬНО');
  assert.equal(sp47871.topic, 'Правописание НЕ с прилагательными');

  // Verify parseStructuredExplanation in WorkWindows: feminine adjective must NOT be gerund
  const parsedAdj = parseStructuredExplanation('НЕ ХРУСТАЛЬНАЯ — относительное прилагательное', 'нехрустальная', '13');
  assert.equal(parsedAdj.orthogramType, 'Правописание НЕ с прилагательными');

  // Verify step contradiction sanitization in parseStructuredExplanation
  const parsedContradiction = parseStructuredExplanation(
    'НЕ РАССЛЫШАННЫЙ — полное причастие с зависимым словом; нет зависимых слов; поэтому пишется СЛИТНО — «НЕ РАССЛЫШАННЫЙ».',
    'НЕ РАССЛЫШАННЫЙ',
    '13'
  );
  assert.ok(parsedContradiction.steps);
  assert.equal(parsedContradiction.steps.some((s) => s.includes('нет зависимых')), false);
  assert.equal(parsedContradiction.steps.some((s) => s.includes('СЛИТНО')), false);
  assert.ok(parsedContradiction.steps.some((s) => s.includes('РАЗДЕЛЬНО')));

  // Verify Task 14 hyphen sanitization in parseStructuredExplanation
  const parsedT14 = parseStructuredExplanation(
    'ПОЭТОМУ — такие наречия всегда пишутся через дефис; поэтому пишется ЧЕРЕЗ ДЕФИС — «ПОЭТОМУ».',
    'ПОЭТОМУ',
    '14'
  );
  assert.ok(parsedT14.steps);
  assert.equal(parsedT14.steps.some((s) => s.includes('дефис')), false);
  assert.ok(parsedT14.steps.some((s) => s.includes('СЛИТНО')));

  // Verify solitary participle without dependent words remains СЛИТНО in parseStructuredExplanation
  const parsedSolitary = parseStructuredExplanation(
    'НЕПРЕКРАЩАЮЩИЙСЯ — одиночное полное причастие; у причастия в данном предложении нет зависимых слов и нет противопоставления с союзом А; поэтому пишется СЛИТНО.',
    'НЕПРЕКРАЩАЮЩИЙСЯ',
    '13'
  );
  assert.ok(parsedSolitary.steps);
  assert.equal(parsedSolitary.steps.some((s) => s.includes('РАЗДЕЛЬНО')), false);
  assert.ok(parsedSolitary.steps.some((s) => s.includes('СЛИТНО')));
});

test('Full database integrity: zero contradictions, zero bogus hyphens, zero glued strings', () => {
  const bank = getTrainerBank();

  // 1. Zero glued strings
  const dump = JSON.stringify(bank);
  assert.equal(dump.includes('ЗА-ТОПО-ЭТОМУ'), false);
  assert.equal(dump.includes('ВНИЗПО-ЭТОМУ'), false);
  assert.equal(dump.includes('ПО-ЭТОМУВ ТЕЧЕНИЕ'), false);

  // 2. Zero ПО-ЧЕМУ with ДЕФИСНО
  const badPochemu = bank.sprintQuestions.filter(
    (s) => s.task === '14' && s.answer === 'ДЕФИСНО' && (s.prefix + s.suffix).includes('ПО-ЧЕМУ')
  );
  assert.equal(badPochemu.length, 0);

  // 3. Zero contradictions in sprint questions
  let contradictions = 0;
  for (const s of bank.sprintQuestions) {
    const ans = s.answer;
    const expl = s.explanation || s.rule || '';
    if (ans === 'СЛИТНО' && /поэтому\s+пишется\s+РАЗДЕЛЬНО/i.test(expl)) {
      contradictions++;
    } else if (ans === 'РАЗДЕЛЬНО' && /поэтому\s+пишется\s+СЛИТНО/i.test(expl)) {
      contradictions++;
    }
  }
  assert.equal(contradictions, 0);
});

test('buildWorkoutQueue respects shuffleTasks toggle: sequential when false, interleaved when true', () => {
  const multiQuantities = {
    '9': 15,
    '10': 15,
    '11': 15,
    '12': 15,
    '13': 15,
    '14': 15,
    '15': 15,
  };

  // 1. When shuffleTasks is false: tasks are strictly sequential in order 9, 10, 11, 12, 13, 14, 15
  const seqQueue = buildWorkoutQueue(multiQuantities, 'sprint', {
    randomize: true,
    shuffleTasks: false,
  });
  assert.equal(seqQueue.length, 105);

  const taskChunks: string[] = [];
  for (let i = 0; i < 7; i++) {
    const chunk = seqQueue.slice(i * 15, (i + 1) * 15);
    const expectedTask = ['9', '10', '11', '12', '13', '14', '15'][i];
    assert.equal(chunk.every((q) => q.task === expectedTask), true, `Chunk ${i} should all be Task ${expectedTask}`);
    taskChunks.push(expectedTask);
  }
  assert.deepEqual(taskChunks, ['9', '10', '11', '12', '13', '14', '15']);

  // 2. When shuffleTasks is true: tasks are interleaved (the first 15 questions contain diverse tasks)
  const shuffledQueue = buildWorkoutQueue(multiQuantities, 'sprint', {
    randomize: true,
    shuffleTasks: true,
  });
  assert.equal(shuffledQueue.length, 105);

  const first15Tasks = new Set(shuffledQueue.slice(0, 15).map((q) => q.task));
  // In a random shuffle of 7 distinct tasks of 15 items each, the first 15 items contain at least 3 distinct tasks
  assert.ok(first15Tasks.size >= 3, `Expected at least 3 distinct tasks in first 15 shuffled questions, got ${first15Tasks.size}`);

  // Total count of each task remains exact
  for (const tid of ['9', '10', '11', '12', '13', '14', '15'] as const) {
    assert.equal(shuffledQueue.filter((q) => q.task === tid).length, 15);
  }
});

test('TrainerState isShuffled flag encodes and restores accurately in backup code', () => {
  let state = createInitialState();
  assert.equal(state.isShuffled, true);

  // Toggle off
  state.isShuffled = false;
  const codeOff = encodeBackupCode(state);
  const restoredOff = decodeBackupCode(codeOff);
  assert.equal(restoredOff?.isShuffled, false);

  // Toggle on
  state.isShuffled = true;
  const codeOn = encodeBackupCode(state);
  const restoredOn = decodeBackupCode(codeOn);
  assert.equal(restoredOn?.isShuffled, true);
});

test('Authoritative orthography regression tests (Color adjectives, ЮЛЯ, particles, conjunctions, homophones)', () => {
  const bank = getTrainerBank();

  // 1. Color shade adjectives: ТЁМНО-КОРИЧНЕВЫХ, ЯРКО-КРАСНЫМИ, ТЁМНО-СИНЕЙ
  const darkBrownCls = classifyWordSubtopicAndException('14', 'тёмно', 'коричневых', 'ДЕФИСНО', 'оттенок цвета', 'в темно-коричневых волосах');
  assert.equal(darkBrownCls.topic, 'Сложные прилагательные (через дефис)');
  assert.ok(darkBrownCls.rule.includes('оттенки цветов') || darkBrownCls.rule.includes('через дефис'));

  const fipi49776 = bank.fipiQuestions.find((q) => q.id === 'fipi-14-neofamily-14-49776');
  assert.ok(fipi49776);
  // Row 3: (КАК)БУДТО ... (ТЕМНО)КОРИЧНЕВЫХ -> РАЗДЕЛЬНО / ДЕФИСНО
  assert.equal(fipi49776.rows[2].letter, 'РАЗДЕЛЬНО / ДЕФИСНО');
  assert.ok(fipi49776.rows[2].solvedWords[0].includes('ТЁМНО-КОРИЧНЕВЫХ') || fipi49776.rows[2].solvedWords[0].includes('ТЕМНО-КОРИЧНЕВЫХ'));
  assert.ok(fipi49776.rows[2].solvedWords[0].includes('КАК БУДТО'));

  // Row 4: (ИЗ)ЗА ... (ВО)ВРЕМЯ урока -> ДЕФИСНО / РАЗДЕЛЬНО
  assert.equal(fipi49776.rows[3].letter, 'ДЕФИСНО / РАЗДЕЛЬНО');
  assert.ok(fipi49776.rows[3].solvedWords[0].includes('ИЗ-ЗА'));
  assert.ok(fipi49776.rows[3].solvedWords[0].includes('ВО ВРЕМЯ'));

  // Row 5: (ПО)ЗИМНЕМУ городу ... (ЗА)ТО весело -> РАЗДЕЛЬНО / СЛИТНО
  assert.equal(fipi49776.rows[4].letter, 'РАЗДЕЛЬНО / СЛИТНО');
  assert.ok(fipi49776.rows[4].solvedWords[0].includes('ПО ЗИМНЕМУ'));
  assert.ok(fipi49776.rows[4].solvedWords[0].includes('ЗАТО'));

  // 2. Rule of ЮЛЯ and -КА particles in Task 14
  const fipi49389 = bank.fipiQuestions.find((q) => q.id === 'fipi-14-neofamily-14-49389');
  assert.ok(fipi49389);
  // Row 2: (ПОЛ)ЯЩИКА (ЯРКО)ОРАНЖЕВЫХ -> ДЕФИСНО / ДЕФИСНО
  assert.equal(fipi49389.rows[1].letter, 'ДЕФИСНО / ДЕФИСНО');
  assert.equal(fipi49389.rows[1].isCorrectRow, true);
  // Row 5: (ПО)ЗИМНЕМУ морозно ... (КОЕ)ГДЕ -> ДЕФИСНО / ДЕФИСНО
  assert.equal(fipi49389.rows[4].letter, 'ДЕФИСНО / ДЕФИСНО');
  assert.equal(fipi49389.rows[4].isCorrectRow, true);
  assert.deepEqual(fipi49389.correctIndices, [2, 5]);

  // 3. Task 130928: ЧТО-ТО, ПО-СВОЕМУ, ИЗ-ПОД
  const fipi130928 = bank.fipiQuestions.find((q) => q.id === 'fipi-14-shkolkovo-14-130928');
  assert.ok(fipi130928);
  // Row 1: ИЗ-ЗА ... ПОЛ-ЛИМОНА -> ДЕФИСНО / ДЕФИСНО (True)
  assert.equal(fipi130928.rows[0].letter, 'ДЕФИСНО / ДЕФИСНО');
  assert.equal(fipi130928.rows[0].isCorrectRow, true);
  // Row 2: ЧТО-ТО ... ПО-СВОЕМУ -> ДЕФИСНО / ДЕФИСНО (True)
  assert.equal(fipi130928.rows[1].letter, 'ДЕФИСНО / ДЕФИСНО');
  assert.equal(fipi130928.rows[1].isCorrectRow, true);
  // Row 5: ОТКУДА-ТО ... ИЗ-ПОД -> ДЕФИСНО / ДЕФИСНО (True)
  assert.equal(fipi130928.rows[4].letter, 'ДЕФИСНО / ДЕФИСНО');
  assert.equal(fipi130928.rows[4].isCorrectRow, true);
  assert.deepEqual(fipi130928.correctIndices, [1, 2, 5]);

  // 4. Sprint bank word checks
  for (const s of bank.sprintQuestions) {
    const raw = `${s.prefix || ''}${s.suffix || ''}`.replace(/[()]/g, '').trim().toUpperCase();
    if (raw === 'КАК БУДТО' || raw === 'КАКБУДТО') {
      assert.equal(s.answer, 'РАЗДЕЛЬНО');
    }
    if (raw === 'ЧТОТО' || raw === 'ЧТО-ТО') {
      assert.equal(s.answer, 'ДЕФИСНО');
    }
    if (raw === 'КОЕГДЕ' || raw === 'КОЕ-ГДЕ') {
      assert.equal(s.answer, 'ДЕФИСНО');
    }
    if (raw === 'ПОДХОДИТЕКА' || raw === 'ПОДХОДИТЕ-КА') {
      assert.equal(s.answer, 'ДЕФИСНО');
    }
    if (raw === 'ПОЛЯЩИКА' || raw === 'ПОЛ-ЯЩИКА') {
      assert.equal(s.answer, 'ДЕФИСНО');
    }
    if (raw === 'ПОЛЛИМОНА' || raw === 'ПОЛ-ЛИМОНА') {
      assert.equal(s.answer, 'ДЕФИСНО');
    }
  }
});

test('All 19 tasks (4-22) have Sprint and FIPI questions, 4 official blocks, and universal grading', () => {
  const bank = getTrainerBank();
  assert.equal(TASK_IDS.length, 19);
  assert.equal(TASK_BLOCKS.length, 4);

  for (const tid of TASK_IDS) {
    const sprintCount = bank.sprintQuestions.filter((q) => q.task === tid).length;
    const fipiCount = bank.fipiQuestions.filter((q) => q.task === tid).length;
    assert.ok(sprintCount >= 5, `Task ${tid} must have >= 5 sprint questions (found ${sprintCount})`);
    assert.ok(fipiCount >= 1, `Task ${tid} must have >= 1 FIPI question (found ${fipiCount})`);
  }

  // Verify word_input grading (Tasks 5-7)
  const q5 = bank.fipiQuestions.find((q) => q.task === '5');
  assert.ok(q5);
  const expectedWord = q5.textAnswers?.[0] || q5.rows.find((r) => r.isCorrectRow)?.letter || '';
  assert.ok(expectedWord.length > 0);
  const grade5Ok = checkFipiQuestionAnswer(q5, expectedWord);
  assert.equal(grade5Ok.isCorrect, true);
  assert.equal(grade5Ok.pointsEarned, 1);

  // Verify matching_grid 2-point grading (Tasks 8 and 22)
  const q8 = bank.fipiQuestions.find((q) => q.task === '8');
  assert.ok(q8);
  const fullCode8 = q8.correctIndices.join('');
  assert.equal(fullCode8.length, 5);
  const grade8Full = checkFipiQuestionAnswer(q8, fullCode8);
  assert.equal(grade8Full.isCorrect, true);
  assert.equal(grade8Full.pointsEarned, 2);
  assert.equal(grade8Full.maxPoints, 2);

  // 1 error in Task 8 awards 1 partial point
  const wrongFirst = fullCode8[0] === '1' ? '2' : '1';
  const partialCode8 = wrongFirst + fullCode8.slice(1);
  const grade8Partial = checkFipiQuestionAnswer(q8, partialCode8);
  assert.equal(grade8Partial.isCorrect, false);
  assert.equal(grade8Partial.pointsEarned, 1);
  assert.equal(grade8Partial.maxPoints, 2);
});

test('Task 14 and Task 15 linguistic classification, zero scraper placeholders, and verified FIPI indices', () => {
  const bank = getTrainerBank();

  // 1. Task 15: participles like притворённые, заплаканное, вырезанный are NOT classified as Стык основы
  const pritvor = classifyWordSubtopicAndException('15', 'притворё', 'ые', 'НН', '');
  assert.equal(pritvor.topic, 'Причастия и отглагольные прилагательные (две буквы НН)');

  const zaplak = classifyWordSubtopicAndException('15', 'заплака', 'ое', 'НН', '');
  assert.equal(zaplak.topic, 'Причастия и отглагольные прилагательные (две буквы НН)');

  const vyrez = classifyWordSubtopicAndException('15', 'выреза', 'ый', 'НН', '');
  assert.equal(vyrez.topic, 'Причастия и отглагольные прилагательные (две буквы НН)');

  // 2. Task 15: short passive participles like удостоены are classified as Краткие причастия (1 Н)
  const udost = classifyWordSubtopicAndException('15', 'удостое', 'ы', 'Н', '');
  assert.equal(udost.topic, 'Краткие страдательные причастия (одна буква Н)');

  // 3. Task 15: genuine stem on -Н (туманный, осенний, старинный)
  const tuman = classifyWordSubtopicAndException('15', 'тума', 'ый', 'НН', '');
  assert.equal(tuman.topic, 'Стык основы на -Н- и суффикса -Н- (две буквы НН)');

  // 4. Task 15: denominal adjectives with -ЕНН-/-ОНН- (утренний, соломенный)
  const utren = classifyWordSubtopicAndException('15', 'утре', 'ий', 'НН', '');
  assert.equal(utren.topic, 'Суффиксы -ЕНН-, -ОНН- в прилагательных (две буквы НН)');

  // 5. Task 15: nouns with НН (путешественники, ценность)
  const cennost = classifyWordSubtopicAndException('15', 'це', 'ость', 'НН', '');
  assert.equal(cennost.topic, 'Существительные с двумя буквами НН');

  // 6. Task 14: glued words are fixed in database
  const dump = JSON.stringify(bank);
  assert.equal(dump.includes('ДРУГДРУГУ'), false);
  assert.equal(dump.includes('КВЕЧЕРУ'), false);
  assert.equal(dump.includes('ИВСЁЖЕ'), false);

  // 7. Task 14: verified FIPI tasks have accurate indices
  const q30 = bank.fipiQuestions.find((q) => q.id === 'fipi-14-shkolkovo-14-130930');
  if (q30) {
    assert.deepEqual(q30.correctIndices, [1, 2]);
  }
  const q44 = bank.fipiQuestions.find((q) => q.id === 'fipi-14-shkolkovo-14-130944');
  if (q44) {
    assert.deepEqual(q44.correctIndices, [3, 4]);
  }
  const q830 = bank.fipiQuestions.find((q) => q.id === 'fipi-14-neofamily-14-49830');
  if (q830) {
    assert.deepEqual(q830.correctIndices, [2, 5]);
  }
  const q946 = bank.fipiQuestions.find((q) => q.id === 'fipi-14-neofamily-14-73946');
  if (q946) {
    assert.deepEqual(q946.correctIndices, [2, 5]);
  }
  const q984 = bank.fipiQuestions.find((q) => q.id === 'fipi-14-neofamily-14-36984');
  if (q984) {
    assert.deepEqual(q984.correctIndices, [2, 3, 4]);
  }

  // 8. Zero placeholder scraper artifacts across all sprint and FIPI questions
  for (const s of bank.sprintQuestions) {
    const expl = s.explanation || '';
    assert.equal(expl.includes('либо полное причастие'), false, `Placeholder found in sprint ${s.id}`);
    assert.equal(expl.includes('наречие или производный предлог'), false, `Slashed template in sprint ${s.id}`);
    assert.equal(expl.includes('устойчивое сочетание / производный предлог'), false, `Slashed template in sprint ${s.id}`);
  }
  for (const f of bank.fipiQuestions) {
    for (const r of f.rows || []) {
      const expl = r.explanation || '';
      assert.equal(expl.includes('либо полное причастие'), false, `Placeholder found in FIPI row ${f.id}`);
      assert.equal(expl.includes('наречие или производный предлог'), false, `Slashed template in FIPI row ${f.id}`);
      assert.equal(expl.includes('устойчивое сочетание / производный предлог'), false, `Slashed template in FIPI row ${f.id}`);
    }
  }
});

test('Cross-task integrity: zero HTML entities, exact isCorrectRow alignment, healed Task 8/15/17/18/21/22', () => {
  const bank = getTrainerBank();
  const dump = JSON.stringify(bank);

  // 1. Zero HTML entities
  assert.equal(dump.includes('&shy;'), false, 'Found &shy; in bank dump');
  assert.equal(dump.includes('&ldquo;'), false, 'Found &ldquo; in bank dump');
  assert.equal(dump.includes('&rdquo;'), false, 'Found &rdquo; in bank dump');
  assert.equal(dump.includes('&yacute;'), false, 'Found &yacute; in bank dump');

  // 2. Exact isCorrectRow and correctIndices alignment
  for (const f of bank.fipiQuestions) {
    for (let r = 0; r < (f.rows || []).length; r++) {
      const isExpected = f.correctIndices.includes(r + 1);
      assert.equal(
        f.rows[r].isCorrectRow,
        isExpected,
        `Task ${f.task} question ${f.id} row ${r + 1} isCorrectRow mismatch`
      );
    }
  }

  // 3. Verified fixed questions
  const q17 = bank.fipiQuestions.find((q) => q.id === 'nf-17-37438');
  if (q17) {
    assert.equal(q17.rows.length, 4);
    assert.deepEqual(q17.correctIndices, [1, 2, 3]);
    assert.equal(q17.sentence?.includes('(З)'), false);
  }

  const q18_1 = bank.fipiQuestions.find((q) => q.id === 'nf-18-37581');
  if (q18_1) {
    assert.equal(q18_1.rows.length, 4);
    assert.deepEqual(q18_1.correctIndices, [1, 2, 3, 4]);
  }

  const q18_2 = bank.fipiQuestions.find((q) => q.id === 'nf-18-37494');
  if (q18_2) {
    assert.equal(q18_2.rows.length, 4);
    assert.deepEqual(q18_2.correctIndices, [1, 2, 3, 4]);
  }

  const q8 = bank.fipiQuestions.find((q) => q.id === 'nf-8-36795');
  if (q8) {
    assert.equal(q8.rows.length, 9);
    assert.deepEqual(q8.correctIndices, [2, 6, 7, 3, 5]);
  }

  const q21_1 = bank.fipiQuestions.find((q) => q.id === 'nf-21-78423');
  if (q21_1) {
    assert.equal(q21_1.rows.length, 5);
    assert.deepEqual(q21_1.correctIndices, [1, 2, 4]);
  }

  const q21_2 = bank.fipiQuestions.find((q) => q.id === 'nf-21-37275');
  if (q21_2) {
    assert.equal(q21_2.rows.length, 7);
    assert.deepEqual(q21_2.correctIndices, [3, 5]);
  }

  const q15_inv = bank.fipiQuestions.find((q) => q.id === 'fipi-15-neofamily-15-50705');
  if (q15_inv) {
    assert.deepEqual(q15_inv.correctIndices, [4, 5]);
    assert.equal(q15_inv.rows[3].isCorrectRow, true);
    assert.equal(q15_inv.rows[4].isCorrectRow, true);
  }
});

test('Task 14 deep pedagogy: zero glued words, exact part-of-speech topics, and zero OCR Ze defects', () => {
  const bank = getTrainerBank();

  // 1. classifyWordSubtopicAndException produces exact subtopics for Task 14 separate words
  const c1 = classifyWordSubtopicAndException('14', '(В)', 'ТЕЧЕНИЕ', 'РАЗДЕЛЬНО', '');
  assert.equal(c1.topic, 'Производные предлоги и сочетания (раздельно)');

  const c2 = classifyWordSubtopicAndException('14', '(ТАК)', 'КАК', 'РАЗДЕЛЬНО', '');
  assert.equal(c2.topic, 'Составной союз «так как» (раздельно)');

  const c3 = classifyWordSubtopicAndException('14', '(КАК)', 'БУДТО', 'РАЗДЕЛЬНО', '');
  assert.equal(c3.topic, 'Сравнительный союз «как будто» (раздельно)');

  const c4 = classifyWordSubtopicAndException('14', '(ЕДВА)', 'ЛИ', 'РАЗДЕЛЬНО', '');
  assert.equal(c4.topic, 'Частица ЛИ со словами (раздельно)');

  const c5 = classifyWordSubtopicAndException('14', '(ВСЁ)', 'ЖЕ', 'РАЗДЕЛЬНО', '');
  assert.equal(c5.topic, 'Частица ЖЕ со словами (раздельно)');

  const c6 = classifyWordSubtopicAndException('14', '(ОТ)', 'ЭТОГО', 'РАЗДЕЛЬНО', '');
  assert.equal(c6.topic, 'Местоимения с предлогами (раздельно)');

  const c7 = classifyWordSubtopicAndException('14', '(С)', 'РАЗБЕГУ', 'РАЗДЕЛЬНО', '');
  assert.equal(c7.topic, 'Наречные сочетания существительных с предлогами (раздельно)');

  // 2. Zero unspaced words in РАЗДЕЛЬНО explanations across all sprint questions
  for (const s of bank.sprintQuestions) {
    if (s.task === '14' && s.answer === 'РАЗДЕЛЬНО' && s.explanation) {
      const match = s.explanation.match(/поэтому пишется РАЗДЕЛЬНО\s*[-—]\s*«([^»]+)»/);
      if (match) {
        assert.ok(
          match[1].includes(' ') || match[1].includes('-'),
          `Sprint item ${s.id} has unspaced separate word: ${match[1]}`
        );
      }
    }
  }

  // 3. Zero mislabeled conjunctions/particles/prepositions in Task 14
  for (const s of bank.sprintQuestions) {
    if (s.task === '14' && s.answer === 'РАЗДЕЛЬНО' && s.explanation) {
      if (/«([^»]+)»\s*—\s*наречное сочетание существительного с предлогом/i.test(s.explanation)) {
        const m = s.explanation.match(/«([^»]+)»/);
        const term = m ? m[1].toUpperCase() : '';
        const forbidden = [
          'ТАК КАК', 'КАК БУДТО', 'ТО ЕСТЬ', 'ВСЁ ЖЕ', 'ВСЕ ЖЕ', 'ЕСЛИ БЫ', 'ЕДВА ЛИ',
          'В ТЕЧЕНИЕ', 'В ПРОДОЛЖЕНИЕ', 'В ЗАКЛЮЧЕНИЕ', 'ВО ИЗБЕЖАНИЕ', 'В ВИДЕ', 'В СВЯЗИ',
          'НА ПРОТЯЖЕНИИ', 'ОТ ЭТОГО', 'ПРИ ЭТОМ', 'ДРУГ ДРУГУ'
        ];
        assert.equal(forbidden.includes(term), false, `Term ${term} misclassified as prepositional noun in ${s.id}`);
      }
    }
  }

  // 4. Zero OCR Ze (З) in all question sentences
  for (const f of bank.fipiQuestions) {
    if (f.sentence) {
      assert.equal(/\([Зз]\)/.test(f.sentence), false, `Cyrillic Ze found in sentence of ${f.id}`);
    }
  }
});

test('RuleInspector and sprint word formatting across all official EGE tasks (4-22)', () => {
  const bank = getTrainerBank();

  for (const s of bank.sprintQuestions) {
    const task = s.task;

    // Resolved word preview logic as implemented in RuleInspectorModal
    const preview =
      s.task === '13'
        ? `${s.prefix.replace(/[()]/g, '')}${s.answer === 'СЛИТНО' ? '' : ' '}${s.suffix}`
        : s.task === '14'
        ? formatTask14SolvedWord(s.prefix, s.suffix, s.answer)
        : ['9', '10', '11', '12', '15'].includes(s.task)
        ? `${s.prefix}${s.answer.toLowerCase()}${s.suffix}`
        : ['4', '5', '6', '7'].includes(s.task)
        ? s.answer
        : s.suffix || s.context || s.answer;

    assert.ok(preview && preview.length > 0, `Empty preview for sprint item ${s.id} in task ${task}`);

    // Task 4: preview must be the stressed word, strictly matching answer
    if (task === '4') {
      assert.equal(preview, s.answer);
      assert.notEqual(preview.toLowerCase(), `${s.prefix.toLowerCase()}${s.prefix.toLowerCase()}`, `Duplicated word detected in Task 4: ${preview}`);
    }

    // Task 5, 6, 7: must not contain prompt prefix
    if (['5', '6', '7'].includes(task)) {
      assert.equal(preview.includes('Пароним:'), false, `Preview contains prompt prefix in ${s.id}`);
      assert.equal(preview.includes('Исключите'), false, `Preview contains prompt prefix in ${s.id}`);
      assert.equal(preview.includes('Морфологическая'), false, `Preview contains prompt prefix in ${s.id}`);
    }

    // Task 16-21: must be clean sentence/fragment, not starting with lowercase glued answer
    if (['16', '17', '18', '19', '20', '21'].includes(task)) {
      assert.equal(/^[а-яё]+(?:одна запятая|запятая нужна|входит в ответ)/.test(preview), false, `Glued answer in sentence preview: ${preview}`);
    }
  }
});

test('Pure FIPI standard: default workoutMode is fipi, legacy states migrate to fipi, and fipi queue is 100% fipi', () => {
  // 1. Initial state defaults to FIPI standard
  const initial = createInitialState();
  assert.equal(initial.workoutMode, 'fipi', 'createInitialState() must default to fipi mode');

  // 2. Legacy sprint and mixed states migrate to fipi
  const legacySprintState = { ...initial, workoutMode: 'sprint' as const };
  assert.equal(sanitizeLoadedState(legacySprintState).workoutMode, 'fipi', 'sanitizeLoadedState must migrate legacy sprint mode to fipi');
  const legacyMixedState = { ...initial, workoutMode: 'mixed' as const };
  assert.equal(sanitizeLoadedState(legacyMixedState).workoutMode, 'fipi', 'sanitizeLoadedState must migrate legacy mixed mode to fipi');

  // Backup code decoding migrates to fipi
  const code = encodeBackupCode({ ...initial, workoutMode: 'sprint' as any });
  const restored = decodeBackupCode(code);
  assert.equal(restored?.workoutMode, 'fipi', 'decodeBackupCode must restore to fipi mode');

  // 3. buildWorkoutQueue in fipi mode generates 100% FIPI questions with 0 sprint questions
  const quantities: Record<string, number> = {
    '4': 2, '5': 2, '6': 2, '7': 2, '8': 2,
    '9': 3, '10': 3, '11': 3, '12': 3, '13': 3, '14': 3, '15': 3,
    '16': 2, '17': 2, '18': 2, '19': 2, '20': 2, '21': 2, '22': 2,
  };
  const fipiQueue = buildWorkoutQueue(quantities, 'fipi', { randomize: true });
  assert.ok(fipiQueue.length > 0, 'fipiQueue must not be empty');
  assert.equal(
    fipiQueue.every((q) => q.kind === 'fipi'),
    true,
    'All questions in FIPI mode must have kind === "fipi" (pure FIPI standard)'
  );

  // 4. Verify each task has its exact requested number of FIPI questions
  for (const [taskId, expectedCount] of Object.entries(quantities)) {
    const taskQuestions = fipiQueue.filter((q) => q.task === taskId);
    assert.equal(
      taskQuestions.length,
      expectedCount,
      `Task ${taskId} must have exactly ${expectedCount} questions in fipi mode`
    );
  }
});

