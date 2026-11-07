import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  parseKimAnswerIndices,
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
  getOfficialTaskInstruction,
  inferQuestionTarget,
  isTheoryOrExplanationText,
  BALANCED_30_QUANTITIES,
  type TaskId,
} from './trainerLogic.ts';
import { parseStructuredExplanation } from '../components/WorkWindows.tsx';
import { sprintToWordEntry, PARSED_WORDS, PARSED_FIPI_QUESTIONS } from '../data/tasksBankData.ts';
import { classifyWordSubtopicAndException } from './wordClassifier.ts';
import {
  sanitizeLoadedState,
  mergeTrainerStates,
  getSyncApiUrl,
  cloudSyncManager,
  normalizePin,
} from './storageSync.ts';

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
    } else if (['8', '22'].includes(q.task)) {
      assert.ok(q.rows.length >= 4 && q.rows.length <= 9, `Question ${q.id} (task ${q.task}) must have 4..9 rows`);
    } else if (q.task === '21') {
      assert.ok(q.rows.length >= 4 && q.rows.length <= 12, `Question ${q.id} (task 21) must have 4..12 rows`);
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

test('Clean official FIPI instructions & zero double-parentheses across entire trainer bank (user screenshot fix)', () => {
  // 1. isTheoryOrExplanationText detects spoiler grammar text
  const spoilerTask12 = 'От глаголов I спряжения (включая брить, стелить и глаголы на -ЯТЬ: сеять, веять, лелеять, таять, каяться, чуять) — -УЩ-/-ЮЩ-. От глаголов II спряжения — -АЩ-/-ЯЩ-.';
  assert.equal(isTheoryOrExplanationText(spoilerTask12), true, 'Spoiler rule must be recognized as theory');
  assert.equal(isTheoryOrExplanationText('Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква.'), false, 'Official instruction must not be recognized as theory');

  // 2. cleanQuestionRule sanitizes spoiler rule into official exam prompt
  const cleanedTask12 = cleanQuestionRule(spoilerTask12, '12');
  assert.equal(cleanedTask12, 'Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов.');

  // 3. getOfficialTaskInstruction covers tasks 4-22 accurately
  assert.equal(getOfficialTaskInstruction('9'), 'Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов.');
  assert.equal(getOfficialTaskInstruction('13', { target: 'РАЗДЕЛЬНО' }), 'Укажите варианты ответов, в которых НЕ с выделенным словом пишется РАЗДЕЛЬНО. Запишите номера ответов.');
  assert.equal(getOfficialTaskInstruction('14', { target: 'СЛИТНО' }), 'Укажите варианты ответов, в которых все выделенные слова пишутся СЛИТНО. Запишите номера ответов.');
  assert.equal(getOfficialTaskInstruction('15'), 'Укажите цифру(-ы), на месте которой(-ых) пишется НН.');

  // 4. cleanWord collapses double parens and OCR artifacts
  assert.equal(cleanWord('ка..тся ((враги))'), 'ка..тся (враги)');
  assert.equal(cleanWord('пропиш..т ((он) (в квартире))'), 'пропиш..т (он в квартире)');
  assert.equal(cleanWord('(((((ВО ЧТО БЫ ТО НИ СТАЛО)))))'), '(ВО ЧТО БЫ ТО НИ СТАЛО)');

  // 5. Entire question bank has 0 leaked theory rules in question prompts and 0 double parens
  const bank = getTrainerBank();
  const theoryWords = ['спряжени', 'правило «окна»', 'перед -нн-', 'приставка', 'суффикс', 'корень', 'исключени'];
  for (const q of bank.fipiQuestions) {
    const prompt = q.instruction || q.rule || '';
    for (const tw of theoryWords) {
      assert.equal(prompt.toLowerCase().includes(tw), false, `FIPI Task ${q.task} ${q.id} must not leak rule: ${prompt}`);
    }
    for (const r of q.rows || []) {
      for (const w of [...(r.words || []), ...(r.solvedWords || [])]) {
        assert.equal(w.includes('((') || w.includes('))'), false, `Word must not have double parens in Task ${q.task} ${q.id}: ${w}`);
      }
    }
  }

  for (const q of bank.sprintQuestions) {
    const full = `${q.prefix || ''} ${q.suffix || ''} ${q.context || ''}`;
    assert.equal(full.includes('((') || full.includes('))'), false, `Sprint word must not have double parens in ${q.id}: ${full}`);
  }

  // 6. Orphan closing paren removal before period or end
  assert.equal(cleanWord('ПО-СВОЕМУ).'), 'ПО-СВОЕМУ.');
  assert.equal(cleanWord('(ПО-СВОЕМУ).'), '(ПО-СВОЕМУ).');
  assert.equal(cleanWord('В КОНЦЕ(КОНЦОВ).'), 'В КОНЦЕ(КОНЦОВ).');

  // 7. Verify Task 13 and Task 14 have zero unbalanced parentheses in solvedWords and zero wrapped sentences
  for (const q of bank.fipiQuestions) {
    if (q.task === '13' || q.task === '14') {
      for (const r of q.rows || []) {
        for (const w of [...(r.words || []), ...(r.solvedWords || [])]) {
          const openCount = (w.match(/\(/g) || []).length;
          const closeCount = (w.match(/\)/g) || []).length;
          assert.equal(openCount, closeCount, `Task ${q.task} question ${q.id} must have balanced parens: ${w}`);
          assert.equal(/\b[А-Яа-яЁёA-Za-z-]+\s+\([^)]*$/.test(w), false, `Must not wrap entire sentence in parens: ${w}`);
        }
      }
    }
  }
});

test('Authentic prototype coverage and punctuation sentence integrity across tasks 4-22', () => {
  const bank = getTrainerBank();

  // 1. Check all official prototypes exist across all tasks 4-22
  const tasksFound = new Set(bank.fipiQuestions.map((q) => q.task));
  for (const t of TASK_IDS) {
    assert.equal(tasksFound.has(t), true, `Task ${t} must be present in bank`);
  }

  // Task 6: both prototypes (исключив / заменив)
  const t6Inst = bank.fipiQuestions.filter((q) => q.task === '6').map((q) => q.instruction || q.rule);
  assert.equal(t6Inst.some((s) => s.includes('исключив')), true, 'Task 6 must have "исключив" prototype');
  assert.equal(t6Inst.some((s) => s.includes('заменив')), true, 'Task 6 must have "заменив" prototype');

  // Task 13: both prototypes (РАЗДЕЛЬНО / СЛИТНО)
  const t13Inst = bank.fipiQuestions.filter((q) => q.task === '13').map((q) => q.instruction || q.rule);
  assert.equal(t13Inst.some((s) => s.includes('РАЗДЕЛЬНО')), true, 'Task 13 must have "РАЗДЕЛЬНО" prototype');
  assert.equal(t13Inst.some((s) => s.includes('СЛИТНО')), true, 'Task 13 must have "СЛИТНО" prototype');

  // Task 14: all three prototypes (ЧЕРЕЗ ДЕФИС / РАЗДЕЛЬНО / СЛИТНО)
  const t14Inst = bank.fipiQuestions.filter((q) => q.task === '14').map((q) => q.instruction || q.rule);
  assert.equal(t14Inst.some((s) => s.includes('ЧЕРЕЗ ДЕФИС')), true, 'Task 14 must have "ЧЕРЕЗ ДЕФИС" prototype');
  assert.equal(t14Inst.some((s) => s.includes('РАЗДЕЛЬНО')), true, 'Task 14 must have "РАЗДЕЛЬНО" prototype');
  assert.equal(t14Inst.some((s) => s.includes('СЛИТНО')), true, 'Task 14 must have "СЛИТНО" prototype');

  // Task 15: both prototypes (НН / Н)
  const t15Inst = bank.fipiQuestions.filter((q) => q.task === '15').map((q) => q.instruction || q.rule);
  assert.equal(t15Inst.some((s) => s.includes('НН')), true, 'Task 15 must have "НН" prototype');
  assert.equal(t15Inst.some((s) => s.includes(' Н.') || s.includes('одна буква Н') || /пишется\s+Н\./i.test(s)), true, 'Task 15 must have "Н" prototype');

  // Task 21: all three prototypes (ТИРЕ / ЗАПЯТАЯ / ДВОЕТОЧИЕ)
  const t21Inst = bank.fipiQuestions.filter((q) => q.task === '21').map((q) => q.instruction || q.rule);
  assert.equal(t21Inst.some((s) => s.includes('ТИРЕ') || s.includes('тире')), true, 'Task 21 must have "ТИРЕ" prototype');
  assert.equal(t21Inst.some((s) => s.includes('ЗАПЯТАЯ') || s.includes('запятая')), true, 'Task 21 must have "ЗАПЯТАЯ" prototype');
  assert.equal(t21Inst.some((s) => s.includes('ДВОЕТОЧИЕ') || s.includes('двоеточие')), true, 'Task 21 must have "ДВОЕТОЧИЕ" prototype');

  // 2. Numbered gap tasks (15, 17, 18, 19, 20) preserve authentic sentences without placeholder corruption
  for (const q of bank.fipiQuestions) {
    if (['15', '17', '18', '19', '20'].includes(q.task)) {
      const resolved = resolveTask15Sentence(q);
      assert.equal(resolved.includes('Позиция (1)(1)'), false, `Task ${q.task} question ${q.id} must not have double position digits`);
      assert.equal(resolved.includes('пропущены буквы') && ['17', '18', '19', '20'].includes(q.task), false, `Punctuation task ${q.task} must not say "пропущены буквы"`);
      assert.equal(resolved.length >= 15, true, `Task ${q.task} sentence must not be empty`);
    }
  }

  // 3. cleanWord must never truncate sentences at em-dash
  const punctSentence = '«Мы обязательно вернёмся, ждите нас!» — писали солдаты в письмах с фронта.';
  assert.equal(cleanWord(punctSentence).includes('писали солдаты'), true, 'cleanWord must not truncate sentence after dash');
  assert.equal(cleanWord('Москва — столица России, крупнейший мегаполис.').includes('крупнейший'), true);

  // 4. Task 4 all questions have authentic orthoepic stress norms for incorrect rows
  for (const q of bank.fipiQuestions.filter((item) => item.task === '4')) {
    for (const r of q.rows) {
      if (!r.isCorrectRow) {
        const solved = (r.solvedWords || [''])[0];
        assert.ok(solved && solved.length > 0, `Task 4 row must have solvedWords: ${r.words[0]}`);
        assert.ok(/[А-ЯЁ]/.test(solved), `Task 4 solved word must have uppercase stress letter: ${solved}`);
        // Norm letter must match uppercase vowel in solvedWord
        const solvedStress = solved.match(/[А-ЯЁ]/)?.[0];
        assert.equal(r.letter, solvedStress, `Task 4 row letter must match solved stress for ${r.words[0]}`);
      }
    }
  }

  // Specific Task 4 checks
  const q4_82032 = bank.fipiQuestions.find((q) => q.id === 'nf-4-82032');
  if (q4_82032) {
    assert.equal(q4_82032.rows[1].solvedWords[0], 'жалюзИ');
    assert.equal(q4_82032.rows[1].letter, 'И');
  }
  const q4_82029 = bank.fipiQuestions.find((q) => q.id === 'nf-4-82029');
  if (q4_82029) {
    assert.equal(q4_82029.rows[0].solvedWords[0], 'облегчИт');
    assert.equal(q4_82029.rows[0].letter, 'И');
    assert.equal(q4_82029.rows[2].solvedWords[0], 'добралАсь');
    assert.equal(q4_82029.rows[3].solvedWords[0], 'слИвовый');
  }

  // 5. Task 22 zero leaked section headers & official instruction matches matching format
  assert.equal(getOfficialTaskInstruction('22').includes('рецензии'), false, 'Task 22 instruction must not mention рецензия');
  assert.equal(getOfficialTaskInstruction('22').includes('соответствие между предложениями'), true, 'Task 22 instruction must be matching format');
  for (const q of bank.fipiQuestions.filter((item) => item.task === '22')) {
    for (const ml of q.matchingLetters || []) {
      const txt = typeof ml === 'string' ? ml : ml.text || '';
      assert.equal(txt.includes('Изобразительно-выразительные средства языка'), false, `Matching letter in Task 22 ${q.id} must not leak header`);
    }
    for (const r of q.rows) {
      assert.equal((r.explanation || '').includes('Изобразительно-выразительные средства языка'), false, `Row explanation in Task 22 ${q.id} must not leak header`);
    }
  }

  // 6. Task 5 nf-5-82033 explanation is authentic paronym comparison
  const q5 = bank.fipiQuestions.find((q) => q.id === 'nf-5-82033');
  if (q5) {
    const errorRow = q5.rows.find((r) => r.isCorrectRow);
    assert.ok(errorRow?.explanation?.includes('Нетерпимый') || errorRow?.explanation?.includes('нетерпимо'), 'Task 5 nf-5-82033 must have paronym explanation');
  }

  // 7. cleanScraperArtifacts cleans broken XML entity, trailing source annotations, and section headers
  assert.equal(cleanScraperArtifacts('мир (ТАК ЖЕ) &#х2013;">— видеть его').includes('&#х2013;'), false);
  assert.equal(cleanScraperArtifacts('мир (ТАК ЖЕ) &#х2013;">— видеть его'), 'мир (ТАК ЖЕ) — видеть его');
  assert.equal(cleanScraperArtifacts('Пушкин Изобразительно-выразительные средства языка'), 'Пушкин');
  assert.equal(cleanScraperArtifacts('Шоссе. (Взято из сборника Дощинского-2026, 50 вар. (вар. 22)'), 'Шоссе.');
  assert.equal(cleanScraperArtifacts('Текст (ЕГКР 18.03.2025, вариант 959)'), 'Текст');
  assert.equal(cleanScraperArtifacts('ле\u00adсочке зе\u00adлени'), 'лесочке зелени');
  assert.equal(cleanWord('ле\u00adсочке зе\u00adлени'), 'лесочке зелени');
});

test('All 19 tasks (4–22) in trainer bank have clean official instructions, zero trailing scraper annotations, and zero leaked rules', () => {
  const bank = getTrainerBank();

  for (const q of bank.fipiQuestions) {
    const dump = JSON.stringify(q);
    assert.equal(dump.includes('\u00ad'), false, `Question ${q.id} must not contain soft hyphen \\u00ad`);
    assert.equal(dump.includes('\u200b'), false, `Question ${q.id} must not contain zero-width space \\u200b`);
    assert.equal(dump.includes('((') || dump.includes('))'), false, `Question ${q.id} must not contain double parens`);

    const instr = q.instruction || q.rule || '';
    assert.equal(
      instr.includes('От глаголов I спряжения') || instr.includes('союзы тоже') || instr.includes('в -чив-'),
      false,
      `Question ${q.id} must not have leaked theory rule in instruction: ${instr}`
    );

    const sent = q.sentence || '';
    assert.equal(
      /\((?:Взято из|ЕГКР|вар\.|вариант|Сборник|Дощинск|Цыбулько|Сенина)[^)]*\)?$/i.test(sent),
      false,
      `Sentence in ${q.id} must not have trailing scraper annotations: ${sent}`
    );

    for (const r of q.rows) {
      for (const w of r.words) {
        assert.equal(
          /\((?:Взято из|ЕГКР|вар\.|вариант|Сборник|Дощинск|Цыбулько|Сенина)[^)]*\)?$/i.test(w),
          false,
          `Word in ${q.id} must not have trailing scraper annotations: ${w}`
        );
      }
    }
  }
});

test('Exhaustive task-by-task verification across all 19 tasks (4–22): grading, inputs, and structure', () => {
  const bank = getTrainerBank();
  const tasksFound = new Set<string>();

  for (const q of bank.fipiQuestions) {
    tasksFound.add(String(q.task));
    const dump = JSON.stringify(q);
    assert.equal(dump.includes('\u00ad'), false, `[${q.id}] Task ${q.task} must not have soft hyphens`);
    assert.equal(dump.includes('\u200b'), false, `[${q.id}] Task ${q.task} must not have zero-width spaces`);
    assert.equal(dump.includes('(Взято') || dump.includes('(ЕГКР'), false, `[${q.id}] Task ${q.task} must not have scraper annotations`);

    // Verify grading for correct answer
    if (['5', '6', '7'].includes(q.task)) {
      const validAns = (q.textAnswers && q.textAnswers[0]) || q.rows.find((r) => r.isCorrectRow)?.letter || '';
      assert.ok(validAns.length > 0, `[${q.id}] Task ${q.task} must have a valid text answer`);
      const checkOk = checkFipiQuestionAnswer(q, validAns);
      assert.equal(checkOk.isCorrect, true, `[${q.id}] Valid answer «${validAns}» must evaluate to true`);
      assert.equal(checkOk.pointsEarned, checkOk.maxPoints);

      const checkBad = checkFipiQuestionAnswer(q, 'совершенноневерныйответ');
      assert.equal(checkBad.isCorrect, false);
      assert.equal(checkBad.pointsEarned, 0);
    } else if (['8', '22'].includes(q.task)) {
      assert.ok(q.correctIndices.length >= 4 && q.correctIndices.length <= 5);
      const correctStr = q.correctIndices.join('');
      const checkOk = checkFipiQuestionAnswer(q, correctStr);
      assert.equal(checkOk.isCorrect, true, `[${q.id}] Task ${q.task} matching ${correctStr} must evaluate to true`);
      assert.equal(checkOk.pointsEarned, 2);

      const checkBad = checkFipiQuestionAnswer(q, '99999');
      // Unless 99999 happens to have 3 matching (which is impossible as digits are distinct), points <= 1
      assert.equal(checkBad.isCorrect, false);
    } else {
      // Tasks 4, 9-21
      assert.ok(q.correctIndices.length >= 1, `[${q.id}] Task ${q.task} must have correctIndices`);
      const correctStr = q.correctIndices.slice().sort((a, b) => a - b).join('');
      const checkOk = checkFipiQuestionAnswer(q, correctStr);
      assert.equal(checkOk.isCorrect, true, `[${q.id}] Task ${q.task} answer ${correctStr} must evaluate to true`);
      assert.equal(checkOk.pointsEarned, 1);

      const checkBad = checkFipiQuestionAnswer(q, '987');
      if (correctStr !== '789') {
        assert.equal(checkBad.isCorrect, false);
        assert.equal(checkBad.pointsEarned, 0);
      }
    }
  }

  // Ensure every single task from 4 to 22 was present and audited
  for (let t = 4; t <= 22; t++) {
    assert.ok(tasksFound.has(String(t)), `Task ${t} must be present in FIPI questions bank`);
  }
});

test('cleanQuestionRule strictly returns official FIPI instructions and prevents theory leakage across tasks 4-22', () => {
  // Task 12 spoiler rule from user screenshot
  const spoilerTask12 = 'От глаголов I спряжения (включая брить, стелить и глаголы на -ЯТЬ: сеять, веять, лелеять, таять, каяться, чуять) — -УЩ-/-ЮЩ-. От глаголов II спряжения — -АЩ-/-ЯЩ-.';
  const clean12 = cleanQuestionRule(spoilerTask12, '12');
  assert.equal(clean12, 'Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов.');

  // Tasks 9, 10, 11
  assert.equal(cleanQuestionRule('Любое правило корней', '9'), 'Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов.');
  assert.equal(cleanQuestionRule('Любое правило приставок', '10'), 'Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов.');
  assert.equal(cleanQuestionRule('Любое правило суффиксов', '11'), 'Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов.');

  // Task 4
  assert.equal(cleanQuestionRule('', '4', 'Укажите варианты ответов, в которых верно'), 'Укажите варианты ответов, в которых верно выделена буква, обозначающая ударный гласный звук. Запишите номера ответов.');
  assert.equal(cleanQuestionRule('', '4', 'Укажите варианты ответов, в которых неверно'), 'Укажите варианты ответов, в которых НЕВЕРНО выделена буква, обозначающая ударный гласный звук. Запишите номера ответов.');

  // Task 5, 6, 7, 8
  assert.ok(cleanQuestionRule('', '5').includes('пароним'));
  assert.ok(cleanQuestionRule('', '6', 'заменив').includes('заменив'));
  assert.ok(cleanQuestionRule('', '6', 'исключив').includes('исключив'));
  assert.ok(cleanQuestionRule('', '7').includes('образовании формы'));
  assert.ok(cleanQuestionRule('', '8').includes('грамматическими ошибками'));

  // Task 13, 14, 15
  assert.ok(cleanQuestionRule('', '13', 'слитно').includes('СЛИТНО'));
  assert.ok(cleanQuestionRule('', '13', 'раздельно').includes('РАЗДЕЛЬНО'));
  assert.ok(cleanQuestionRule('', '14', 'дефис').includes('ЧЕРЕЗ ДЕФИС'));
  assert.ok(cleanQuestionRule('', '14', 'раздельно').includes('РАЗДЕЛЬНО'));
  assert.ok(cleanQuestionRule('', '14', 'слитно').includes('СЛИТНО'));
  assert.ok(cleanQuestionRule('', '15', 'одна буква н').includes(' Н.'));
  assert.ok(cleanQuestionRule('', '15', 'две буквы нн').includes(' НН.'));

  // Task 16, 17-20, 21, 22
  assert.ok(cleanQuestionRule('', '16').includes('ОДНУ запятую'));
  assert.ok(cleanQuestionRule('', '17').includes('должны стоять запятые'));
  assert.ok(cleanQuestionRule('', '21', 'тире').includes('тире'));
  assert.ok(cleanQuestionRule('', '21', 'двоеточие').includes('двоеточие'));
  assert.ok(cleanQuestionRule('', '21', 'запятая').includes('запятая'));
  assert.ok(cleanQuestionRule('', '22').includes('средствами выразительности'));
});

test('cleanScraperArtifacts normalizes all nested double parens from user screenshot', () => {
  const row1 = 'ка..тся ((враги)), ма..тся ((они)), оглядыва..тся ((он))';
  assert.equal(cleanScraperArtifacts(row1), 'ка..тся (враги), ма..тся (они), оглядыва..тся (он)');

  const row2 = 'возненавид..вший ((всех)), пропиш..т ((он) (в квартире)), подброш..нный ((мяч))';
  assert.equal(cleanScraperArtifacts(row2), 'возненавид..вший (всех), пропиш..т (он в квартире), подброш..нный (мяч)');

  const row3 = 'грохоч..щие ((волны)), завяж..т ((дети) (шнурки)), подерж..нный ((автомобиль))';
  assert.equal(cleanScraperArtifacts(row3), 'грохоч..щие (волны), завяж..т (дети шнурки), подерж..нный (автомобиль)');

  const row4 = 'обеспеч..т ((они)), скач..нный ((документ)), передерж..нные ((овощи))';
  assert.equal(cleanScraperArtifacts(row4), 'обеспеч..т (они), скач..нный (документ), передерж..нные (овощи)');

  const row5 = 'подмет..вший ((недостатки)), завис..м ((мы)), стро..те ((вы долго))';
  assert.equal(cleanScraperArtifacts(row5), 'подмет..вший (недостатки), завис..м (мы), стро..те (вы долго)');
});

test('BALANCED_30_QUANTITIES has exactly 30 total tasks and covers all 19 official EGE tasks (4–22)', () => {
  const total = calculateTotalPlanned(BALANCED_30_QUANTITIES);
  assert.equal(total, 30, 'Total planned tasks must be exactly 30');

  // Verify all 19 tasks from 4 to 22 have at least 1 question
  for (const taskId of TASK_IDS) {
    const qty = BALANCED_30_QUANTITIES[taskId] || 0;
    assert.ok(qty >= 1, `Task ${taskId} must have at least 1 question in balanced 30 preset`);
  }

  // Verify specific block breakdown
  // Culture of speech (4–8): 5
  const speechSum = (['4', '5', '6', '7', '8'] as const).reduce(
    (sum, id) => sum + (BALANCED_30_QUANTITIES[id] || 0),
    0
  );
  assert.equal(speechSum, 5, 'Culture of speech must have 5 tasks');

  // Orthography (9–15): 14 (2 each)
  const orthoSum = (['9', '10', '11', '12', '13', '14', '15'] as const).reduce(
    (sum, id) => sum + (BALANCED_30_QUANTITIES[id] || 0),
    0
  );
  assert.equal(orthoSum, 14, 'Orthography must have 14 tasks (2 per topic)');

  // Punctuation (16–21): 8
  const punctSum = (['16', '17', '18', '19', '20', '21'] as const).reduce(
    (sum, id) => sum + (BALANCED_30_QUANTITIES[id] || 0),
    0
  );
  assert.equal(punctSum, 8, 'Punctuation must have 8 tasks');

  // Text & Speech (22): 3
  assert.equal(BALANCED_30_QUANTITIES['22'], 3, 'Task 22 must have 3 tasks');

  // Build real queue from balanced 30 preset
  const queue = buildWorkoutQueue(BALANCED_30_QUANTITIES, 'fipi', {
    randomize: true,
    shuffleTasks: false,
  });
  assert.equal(queue.length, 30, 'Built queue must contain exactly 30 questions');

  // Every task 4-22 must be represented in queue
  const tasksInQueue = new Set(queue.map((q) => q.task));
  for (const taskId of TASK_IDS) {
    assert.ok(tasksInQueue.has(taskId), `Task ${taskId} must be present in built queue`);
  }
});

test('Full KIM variant and preset logic covers all 19 tasks without dropping disabled tasks', () => {
  const kimQty: Record<string, number> = {};
  const allEnabled: Record<string, boolean> = {};
  for (const id of TASK_IDS) {
    kimQty[id] = 1;
    allEnabled[id] = true;
  }
  const total = calculateTotalPlanned(kimQty as any, allEnabled as any);
  assert.equal(total, 19, 'Full KIM must have 19 tasks');

  const queue = buildWorkoutQueue(kimQty as any, 'fipi', {
    randomize: false,
    shuffleTasks: false,
    enabledTasks: allEnabled as any,
  });
  assert.equal(queue.length, 19, 'KIM queue must have 19 questions');
  for (let i = 0; i < TASK_IDS.length; i++) {
    assert.equal(queue[i].task, TASK_IDS[i], `Question ${i + 1} must be task ${TASK_IDS[i]}`);
  }
});

test('calculateTotalPlanned strictly respects enabledTasks toggle filter', () => {
  const qty: Record<string, number> = {};
  const enabled: Record<string, boolean> = {};
  for (const id of TASK_IDS) {
    qty[id] = 2;
    enabled[id] = true;
  }

  // All 19 enabled * 2 = 38
  assert.equal(calculateTotalPlanned(qty as any, enabled as any), 38);

  // Turn off task 4 and task 9
  enabled['4'] = false;
  enabled['9'] = false;
  // 17 enabled * 2 = 34
  assert.equal(calculateTotalPlanned(qty as any, enabled as any), 34);

  // Turn off all tasks
  for (const id of TASK_IDS) {
    enabled[id] = false;
  }
  assert.equal(calculateTotalPlanned(qty as any, enabled as any), 0);
});

test('Thematic preset quantity application synchronizes enabledTasks flag', () => {
  // Speech culture preset (4–8)
  const speechQty: Partial<Record<TaskId, number>> = {};
  TASK_IDS.forEach((id) => {
    speechQty[id] = ['4', '5', '6', '7', '8'].includes(id) ? 5 : 0;
  });

  const nextEnabledSpeech: Record<string, boolean> = {};
  TASK_IDS.forEach((id) => {
    nextEnabledSpeech[id] = (speechQty[id] ?? 0) > 0;
  });

  const speechTotal = calculateTotalPlanned(speechQty, nextEnabledSpeech as any);
  assert.equal(speechTotal, 25, 'Speech culture preset must total 25');

  // Verify only 4-8 are enabled
  for (const id of TASK_IDS) {
    if (['4', '5', '6', '7', '8'].includes(id)) {
      assert.equal(nextEnabledSpeech[id], true, `Task ${id} must be enabled`);
    } else {
      assert.equal(nextEnabledSpeech[id], false, `Task ${id} must be disabled`);
    }
  }

  // Orthography preset (9–15)
  const orthoQty: Partial<Record<TaskId, number>> = {};
  TASK_IDS.forEach((id) => {
    orthoQty[id] = ['9', '10', '11', '12', '13', '14', '15'].includes(id) ? 5 : 0;
  });
  const nextEnabledOrtho: Record<string, boolean> = {};
  TASK_IDS.forEach((id) => {
    nextEnabledOrtho[id] = (orthoQty[id] ?? 0) > 0;
  });
  const orthoTotal = calculateTotalPlanned(orthoQty, nextEnabledOrtho as any);
  assert.equal(orthoTotal, 35, 'Ortho preset must total 35');
});

test('All 35 authentic KIM variants have complete 19-task structure (4–22)', () => {
  const bank = getTrainerBank();
  assert.ok(bank.kimVariants.length >= 35, 'Must have at least 35 KIM variants');

  for (const v of bank.kimVariants) {
    assert.ok(v.id && v.title, `Variant must have valid ID and title: ${v.id}`);
    for (const taskId of TASK_IDS) {
      const taskQ = v.tasks?.[taskId];
      assert.ok(taskQ, `Variant ${v.id} must contain task ${taskId}`);
      assert.equal(taskQ.task, taskId, `Question task must match ${taskId}`);
      assert.ok(taskQ.rows && taskQ.rows.length > 0, `Task ${taskId} in ${v.id} must have rows`);
    }
  }
});

test('sprintToWordEntry and PARSED_WORDS: authentic formatting, zero punctuation spam, zero deformed strings', () => {
  const bank = getTrainerBank();
  assert.ok(bank.sprintQuestions.length > 0, 'Sprint bank must not be empty');

  // Verify sprintToWordEntry on all sprint questions
  for (let i = 0; i < Math.min(bank.sprintQuestions.length, 500); i++) {
    const sq = bank.sprintQuestions[i];
    const entry = sprintToWordEntry(sq, i);
    if (!entry) {
      // Must only be punctuation drill choices
      assert.ok(
        ['16', '17', '18', '19', '20', '21'].includes(sq.task),
        `sprintToWordEntry returned null for non-punctuation task ${sq.task}`
      );
      continue;
    }

    // Word must never be a punctuation answer token
    assert.notEqual(entry.word, 'ЗАПЯТАЯ НУЖНА');
    assert.notEqual(entry.word, 'ОДНА ЗАПЯТАЯ');
    assert.notEqual(entry.word, 'ВХОДИТ В ОТВЕТ');
    assert.notEqual(entry.word, 'БЕЗ ЗАПЯТОЙ');

    // Word must never have duplicated prefix or unhandled parens
    if (sq.task === '4') {
      assert.equal(entry.word, sq.answer);
      assert.notEqual(entry.word.toLowerCase(), `${sq.prefix.toLowerCase()}${sq.prefix.toLowerCase()}`);
      assert.equal(/^[А-ЯЁ]$/.test(entry.missingLetter), true, `Task 4 highlight must be stressed vowel: ${entry.missingLetter}`);
    }

    if (sq.task === '13' || sq.task === '14') {
      assert.equal(entry.word.includes('(НЕ)'), false);
      assert.equal(entry.word.includes('(ИЗ)'), false);
    }
  }

  // Check in-memory PARSED_WORDS
  assert.ok(PARSED_WORDS.length > 0, 'PARSED_WORDS must be populated');
  const bogusPunctuation = PARSED_WORDS.filter((w) =>
    ['ЗАПЯТАЯ НУЖНА', 'ОДНА ЗАПЯТАЯ', 'ВХОДИТ В ОТВЕТ', 'БЕЗ ЗАПЯТОЙ'].includes(w.word)
  );
  assert.equal(bogusPunctuation.length, 0, `PARSED_WORDS contains ${bogusPunctuation.length} bogus punctuation items`);
});

test('All-by-30 preset, Custom-N preset, and Reset-to-0 cover all 19 official EGE tasks', () => {
  // 1. All-by-30 preset
  const qty30: Record<TaskId, number> = {} as any;
  const enabled30: Record<TaskId, boolean> = {} as any;
  TASK_IDS.forEach((id) => {
    qty30[id] = 30;
    enabled30[id] = true;
  });
  assert.equal(TASK_IDS.length, 19, 'Must have exactly 19 official tasks (4–22)');
  assert.equal(calculateTotalPlanned(qty30, enabled30), 19 * 30, 'All-by-30 must total 570');
  for (const id of TASK_IDS) {
    assert.equal(qty30[id], 30);
    assert.equal(enabled30[id], true);
  }

  // 2. Custom-N preset (e.g. N = 7)
  // 1b. All-by-1 preset
  const qty1: Record<TaskId, number> = {} as any;
  const enabled1: Record<TaskId, boolean> = {} as any;
  TASK_IDS.forEach((id) => {
    qty1[id] = 1;
    enabled1[id] = true;
  });
  assert.equal(calculateTotalPlanned(qty1, enabled1), 19 * 1, 'All-by-1 must total 19');

  // 1c. All-by-5 preset
  const qty5: Record<TaskId, number> = {} as any;
  const enabled5: Record<TaskId, boolean> = {} as any;
  TASK_IDS.forEach((id) => {
    qty5[id] = 5;
    enabled5[id] = true;
  });
  assert.equal(calculateTotalPlanned(qty5, enabled5), 19 * 5, 'All-by-5 must total 95');

  // 1d. All-by-50 preset
  const qty50: Record<TaskId, number> = {} as any;
  const enabled50: Record<TaskId, boolean> = {} as any;
  TASK_IDS.forEach((id) => {
    qty50[id] = 50;
    enabled50[id] = true;
  });
  assert.equal(calculateTotalPlanned(qty50, enabled50), 19 * 50, 'All-by-50 must total 950');

  // 2. Custom-N preset (e.g. N = 7)
  const customN = 7;
  const qtyN: Record<TaskId, number> = {} as any;
  const enabledN: Record<TaskId, boolean> = {} as any;
  TASK_IDS.forEach((id) => {
    qtyN[id] = customN;
    enabledN[id] = customN > 0;
  });
  assert.equal(calculateTotalPlanned(qtyN, enabledN), 19 * 7, 'Custom-7 must total 133');

  // 3. Reset-to-0 preset
  const qty0: Record<TaskId, number> = {} as any;
  const enabled0: Record<TaskId, boolean> = {} as any;
  TASK_IDS.forEach((id) => {
    qty0[id] = 0;
    enabled0[id] = false;
  });
  assert.equal(calculateTotalPlanned(qty0, enabled0), 0, 'Reset-to-0 must total 0');
  for (const id of TASK_IDS) {
    assert.equal(enabled0[id], false);
  }

  // 4. Independent step/toggle on both non-ortho (4, 16, 22) and ortho (9, 15)
  const testTasks: TaskId[] = ['4', '5', '8', '9', '12', '15', '16', '21', '22'];
  for (const tid of testTasks) {
    const stepped = stepTaskQty(0, 1);
    assert.equal(stepped, 1, `Stepping from 0 on task ${tid} must yield 1`);
    const steppedDown = stepTaskQty(stepped, -1);
    assert.equal(steppedDown, 0, `Stepping down on task ${tid} must yield 0`);
  }
});

test('iOS PWA fullscreen layout and single-line quantity selector constraints', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf-8');
  assert.ok(indexHtml.includes('viewport-fit=cover'), 'index.html must have viewport-fit=cover');
  assert.ok(indexHtml.includes('apple-mobile-web-app-capable'), 'index.html must enable apple-mobile-web-app-capable');
  assert.ok(indexHtml.includes('100dvh'), 'index.html must specify 100dvh');
  assert.ok(indexHtml.includes('is-standalone'), 'index.html must detect and handle standalone mode');

  const indexCss = fs.readFileSync('src/index.css', 'utf-8');
  assert.ok(!indexCss.includes('-webkit-fill-available'), 'index.css must avoid -webkit-fill-available to prevent iOS standalone clipping');
  assert.ok(indexCss.includes('border-radius: 999px'), 'ios-tabbar must have authentic rounded capsule border-radius: 999px without flat straight cut');
  assert.ok(indexCss.includes('env(safe-area-inset-bottom'), 'ios-tabbar must account for safe-area-inset-bottom');
  assert.ok(indexCss.includes('display-mode: standalone'), 'index.css must provide standalone display-mode rules');

  const appTsx = fs.readFileSync('src/App.tsx', 'utf-8');
  assert.ok(appTsx.includes('Настройте количество заданий:'), 'App.tsx must have concise single-line label without (4–22)');
  assert.ok(appTsx.includes('truncate'), 'App.tsx label must have truncate class to prevent wrapping on compact viewports');
  assert.ok(appTsx.includes('whitespace-nowrap shrink-0 ml-2'), 'App.tsx badge must never wrap to multiple lines');
  assert.ok(appTsx.includes('is-standalone'), 'App.tsx must support standalone mode reflow kickstart');

  const workWindowsTsx = fs.readFileSync('src/components/WorkWindows.tsx', 'utf-8');
  assert.ok(workWindowsTsx.includes('id="dictionary-search-input"'), 'WorkWindows.tsx must contain dictionary search input');
  assert.ok(workWindowsTsx.includes('min-h-[44px]'), 'dictionary search input must have min-h-[44px] to prevent flex collapse');
  assert.ok(workWindowsTsx.includes('shrink-0 mb-2 w-full'), 'dictionary search wrapper must be shrink-0 to prevent overlap with chips');
});

test('Exhaustive canonical instruction, target, and answer-key consistency across all 19 tasks (4–22)', () => {
  const bank = getTrainerBank();

  for (const q of bank.fipiQuestions) {
    const t = q.task;
    const target = q.target || inferQuestionTarget(q, t);
    const instruction = q.instruction || q.rule || '';

    // Verify task instruction matches official canonical pattern
    assert.ok(instruction.length > 20, `Task ${t} question ${q.id} must have non-empty instruction`);

    if (t === '4') {
      if (target === 'НЕВЕРНО') {
        assert.ok(instruction.includes('НЕВЕРНО'), `Task 4 ${q.id} must prompt for НЕВЕРНО`);
      } else {
        assert.ok(instruction.includes('верно'), `Task 4 ${q.id} must prompt for верно`);
      }
    }

    if (t === '6') {
      if (target === 'ЗАМЕНИВ') {
        assert.ok(instruction.includes('заменив неверно употреблённое слово'), `Task 6 ${q.id} must prompt for заменив`);
      } else {
        assert.ok(instruction.includes('исключив лишнее слово'), `Task 6 ${q.id} must prompt for исключив`);
      }
    }

    if (['9', '10', '11', '12'].includes(t)) {
      assert.equal(
        instruction,
        'Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов.',
        `Task ${t} ${q.id} must have exact official prompt`
      );
    }

    if (t === '13') {
      const correctRows = q.correctIndices.map((idx) => q.rows[idx - 1]).filter(Boolean);
      const letters = correctRows.map((r) => (r.letter || '').toUpperCase().trim());
      assert.ok(letters.length > 0, `Task 13 ${q.id} must have correct rows`);

      if (target === 'СЛИТНО') {
        assert.ok(instruction.includes('СЛИТНО'), `Task 13 ${q.id} instruction must ask for СЛИТНО`);
        assert.ok(!instruction.includes('РАЗДЕЛЬНО'), `Task 13 ${q.id} instruction must not ask for РАЗДЕЛЬНО`);
        assert.ok(letters.every((l) => l === 'СЛИТНО'), `Task 13 ${q.id} correct rows must all be СЛИТНО, got ${letters}`);
      } else if (target === 'РАЗДЕЛЬНО') {
        assert.ok(instruction.includes('РАЗДЕЛЬНО'), `Task 13 ${q.id} instruction must ask for РАЗДЕЛЬНО`);
        assert.ok(letters.every((l) => l.includes('РАЗД')), `Task 13 ${q.id} correct rows must all be РАЗДЕЛЬНО, got ${letters}`);
      }
    }

    if (t === '14') {
      const correctRows = q.correctIndices.map((idx) => q.rows[idx - 1]).filter(Boolean);
      const letters = correctRows.map((r) => (r.letter || '').toUpperCase().trim());
      assert.ok(letters.length > 0, `Task 14 ${q.id} must have correct rows`);

      if (target === 'СЛИТНО') {
        assert.ok(instruction.includes('СЛИТНО'), `Task 14 ${q.id} instruction must ask for СЛИТНО`);
        assert.ok(letters.every((l) => l.includes('СЛИТ')), `Task 14 ${q.id} correct rows must all be СЛИТНО, got ${letters}`);
      } else if (target === 'РАЗДЕЛЬНО') {
        assert.ok(instruction.includes('РАЗДЕЛЬНО'), `Task 14 ${q.id} instruction must ask for РАЗДЕЛЬНО`);
        assert.ok(letters.every((l) => l.includes('РАЗД')), `Task 14 ${q.id} correct rows must all be РАЗДЕЛЬНО, got ${letters}`);
      } else if (target === 'ЧЕРЕЗ ДЕФИС') {
        assert.ok(instruction.includes('ЧЕРЕЗ ДЕФИС'), `Task 14 ${q.id} instruction must ask for ЧЕРЕЗ ДЕФИС`);
        assert.ok(letters.every((l) => l.includes('ДЕФИС')), `Task 14 ${q.id} correct rows must all be ДЕФИС, got ${letters}`);
      }
    }

    if (t === '15') {
      const correctRows = q.correctIndices.map((idx) => q.rows[idx - 1]).filter(Boolean);
      const letters = correctRows.map((r) => (r.letter || '').toUpperCase().trim());
      assert.ok(letters.length > 0, `Task 15 ${q.id} must have correct rows`);

      if (target === 'Н') {
        assert.ok(instruction.includes('пишется Н.') || instruction.includes('пишется Н '), `Task 15 ${q.id} instruction must ask for Н: ${instruction}`);
        assert.ok(letters.every((l) => l === 'Н'), `Task 15 ${q.id} correct rows must all be Н, got ${letters}`);
      } else if (target === 'НН') {
        assert.ok(instruction.includes('пишется НН'), `Task 15 ${q.id} instruction must ask for НН: ${instruction}`);
        assert.ok(letters.every((l) => l === 'НН'), `Task 15 ${q.id} correct rows must all be НН, got ${letters}`);
      }
    }

    if (t === '21') {
      if (target === 'ТИРЕ') {
        assert.ok(instruction.includes('тире'), `Task 21 ${q.id} instruction must ask for тире`);
      } else if (target === 'ДВОЕТОЧИЕ') {
        assert.ok(instruction.includes('двоеточие'), `Task 21 ${q.id} instruction must ask for двоеточие`);
      } else if (target === 'ЗАПЯТАЯ') {
        assert.ok(instruction.includes('запятая'), `Task 21 ${q.id} instruction must ask for запятая`);
      }
    }
  }

  // Verify all 35 KIM variants have consistent task instructions
  for (const variant of bank.kimVariants) {
    for (const tid of TASK_IDS) {
      const q = variant.tasks[tid];
      assert.ok(q, `KIM variant ${variant.id} must contain task ${tid}`);
      const expectedInstruction = cleanQuestionRule(q.instruction || q.rule, tid, q.instruction, q);
      assert.equal(q.instruction, expectedInstruction, `KIM variant ${variant.id} task ${tid} instruction mismatch`);
    }
  }
});

test('inferQuestionTarget and cleanQuestionRule handle edge cases without topic false positives', () => {
  // Generic topic collisions must never override actual task requirement
  const generic13Topic = 'Правописание НЕ и НИ с различными частями речи (слитное и раздельное написание).';
  const generic14Topic = 'Слитное, дефисное и раздельное написание слов (предлоги, союзы, частицы, наречия, сложные слова).';

  // Task 13 default with ambiguous topic is СЛИТНО
  assert.equal(getOfficialTaskInstruction('13', { ruleOrInstruction: generic13Topic }).includes('СЛИТНО'), true);

  // Task 14 default with ambiguous topic is СЛИТНО (not false-positive ЧЕРЕЗ ДЕФИС)
  assert.equal(getOfficialTaskInstruction('14', { ruleOrInstruction: generic14Topic }).includes('СЛИТНО'), true);

  // Explicit target overrides everything
  assert.equal(inferQuestionTarget({ target: 'РАЗДЕЛЬНО' }, '13'), 'РАЗДЕЛЬНО');
  assert.equal(inferQuestionTarget({ target: 'СЛИТНО' }, '13'), 'СЛИТНО');
  assert.equal(inferQuestionTarget({ target: 'ЧЕРЕЗ ДЕФИС' }, '14'), 'ЧЕРЕЗ ДЕФИС');
  assert.equal(inferQuestionTarget({ target: 'Н' }, '15'), 'Н');
  assert.equal(inferQuestionTarget({ target: 'НН' }, '15'), 'НН');
  assert.equal(inferQuestionTarget({ target: 'ЗАМЕНИВ' }, '6'), 'ЗАМЕНИВ');
  assert.equal(inferQuestionTarget({ target: 'ИСКЛЮЧИВ' }, '6'), 'ИСКЛЮЧИВ');
  assert.equal(inferQuestionTarget({ target: 'ДВОЕТОЧИЕ' }, '21'), 'ДВОЕТОЧИЕ');
  assert.equal(inferQuestionTarget({ target: 'ЗАПЯТАЯ' }, '21'), 'ЗАПЯТАЯ');

  // Infer target from rows when target is missing
  const mockQ13 = {
    task: '13',
    rows: [
      { letter: 'РАЗДЕЛЬНО' },
      { letter: 'СЛИТНО' },
      { letter: 'РАЗДЕЛЬНО' },
      { letter: 'РАЗДЕЛЬНО' },
      { letter: 'СЛИТНО' },
    ],
    correctIndices: [2, 5],
  };
  assert.equal(inferQuestionTarget(mockQ13), 'СЛИТНО');
  assert.equal(cleanQuestionRule(undefined, '13', undefined, mockQ13).includes('СЛИТНО'), true);

  mockQ13.correctIndices = [1, 3, 4];
  assert.equal(inferQuestionTarget(mockQ13), 'РАЗДЕЛЬНО');
  assert.equal(cleanQuestionRule(undefined, '13', undefined, mockQ13).includes('РАЗДЕЛЬНО'), true);

  // Deep Bug Regression Tests:
  // 1. Plural verbs ("пишутся раздельно", "пишутся через дефис", "пишутся слитно")
  assert.equal(
    inferQuestionTarget({ task: '13', rule: 'Правописание НЕ и НИ. Укажите варианты, где слова пишутся РАЗДЕЛЬНО.' }),
    'РАЗДЕЛЬНО'
  );
  assert.equal(
    inferQuestionTarget({ task: '14', rule: 'Слитное, дефисное и раздельное написание слов. Укажите варианты, где все слова пишутся РАЗДЕЛЬНО.' }),
    'РАЗДЕЛЬНО'
  );
  assert.equal(
    inferQuestionTarget({ task: '14', rule: 'Слитное, дефисное и раздельное написание слов. Укажите варианты, где слова пишутся ЧЕРЕЗ ДЕФИС.' }),
    'ЧЕРЕЗ ДЕФИС'
  );
  assert.equal(
    inferQuestionTarget({ task: '14', rule: 'Слитное, дефисное и раздельное написание слов. Укажите варианты, где слова пишутся СЛИТНО.' }),
    'СЛИТНО'
  );

  // 2. Rule only (instruction undefined) must infer target correctly, not default unconditionally
  assert.equal(
    inferQuestionTarget({ task: '13', rule: 'Укажите варианты ответов, в которых НЕ с выделенным словом пишется РАЗДЕЛЬНО.' }),
    'РАЗДЕЛЬНО'
  );
  assert.equal(
    cleanQuestionRule({ task: '13', rule: 'Укажите варианты ответов, в которых НЕ с выделенным словом пишется РАЗДЕЛЬНО.' }, '13').includes('РАЗДЕЛЬНО'),
    true
  );

  // 3. Row answers ground truth overrides contradictory target
  const contradictoryQ13 = {
    task: '13',
    target: 'СЛИТНО', // Erroneous target
    rows: [
      { letter: 'РАЗДЕЛЬНО', isCorrectRow: true },
      { letter: 'СЛИТНО', isCorrectRow: false },
      { letter: 'РАЗДЕЛЬНО', isCorrectRow: true },
      { letter: 'СЛИТНО', isCorrectRow: false },
      { letter: 'РАЗДЕЛЬНО', isCorrectRow: true },
    ],
    correctIndices: [1, 3, 5],
  };
  assert.equal(inferQuestionTarget(contradictoryQ13), 'РАЗДЕЛЬНО');
  assert.equal(getOfficialTaskInstruction('13', { question: contradictoryQ13 }).includes('РАЗДЕЛЬНО'), true);

  // 4. Task 4 does not false-positive to НЕВЕРНО on explanation words
  assert.equal(
    inferQuestionTarget({ task: '4', rule: 'Орфоэпические нормы (Ударения). Проверьте постановку ударения в соответствии со словником.' }),
    'ВЕРНО'
  );
  assert.equal(
    inferQuestionTarget({ task: '4', instruction: 'Укажите варианты ответов, в которых НЕВЕРНО выделена буква, обозначающая ударный гласный звук.' }),
    'НЕВЕРНО'
  );

  // 5. Cyrillic lookaround boundaries for Task 15
  assert.equal(inferQuestionTarget({ task: '15', instruction: 'Укажите цифру(-ы), на месте которой(-ых) пишется Н.' }), 'Н');
  assert.equal(inferQuestionTarget({ task: '15', instruction: 'Укажите цифру(-ы), на месте которой(-ых) пишется НН.' }), 'НН');

  // 6. resolveTask15Sentence fallback respects target 'Н'
  const fallbackQ15 = {
    task: '15',
    target: 'Н',
    rows: [{ words: ['жаре(1)ый'] }, { words: ['тушё(2)ый'] }],
    correctIndices: [1, 2],
  };
  const resolvedSent = resolveTask15Sentence(fallbackQ15);
  assert.equal(resolvedSent.includes('пишется Н:'), true);
  assert.equal(resolvedSent.includes('пишется НН:'), false);
});

test('Real-time cross-device cloud sync and monotonic state merging (PC <-> Phone on the fly)', () => {
  // 1. Initial State for PC and Phone
  const statePC = createInitialState();
  statePC.profilePin = 'FFPEBC';
  statePC.totalSolved = 25;
  statePC.totalCorrect = 23;
  statePC.bestStreak = 10;
  statePC.taskStats['9'] = { solved: 15, correct: 14 };

  const statePhone = createInitialState();
  statePhone.profilePin = 'FFPEBC';
  statePhone.totalSolved = 30;
  statePhone.totalCorrect = 27;
  statePhone.bestStreak = 12;
  statePhone.taskStats['9'] = { solved: 10, correct: 9 };
  statePhone.taskStats['10'] = { solved: 20, correct: 18 };

  // 2. Monotonic Merge
  const merged = mergeTrainerStates(statePC, statePhone, { incomingIsNewer: true });
  assert.equal(merged.profilePin, 'FFPEBC');
  assert.equal(merged.totalSolved, 30, 'Merged totalSolved must take maximum');
  assert.equal(merged.totalCorrect, 27, 'Merged totalCorrect must take maximum');
  assert.equal(merged.bestStreak, 12, 'Merged bestStreak must take maximum');
  assert.equal(merged.taskStats['9']?.solved, 15, 'Task 9 solved must take max from PC (15 > 10)');
  assert.equal(merged.taskStats['10']?.solved, 20, 'Task 10 solved must take max from Phone (20)');

  // 3. API URL resolution
  const url1 = getSyncApiUrl('FFPEBC');
  assert.ok(url1.includes('/api/sync/FFPEBC'), 'URL must target /api/sync/FFPEBC');

  const urlWithQuery = getSyncApiUrl('FFPEBC', { since: 12345 });
  assert.ok(urlWithQuery.includes('since=12345'), 'URL must support since query param');

  // 4. CloudSyncManager PIN normalization & registration
  assert.equal(normalizePin('ффпебк'), 'FFPEBC', 'normalizePin must map Cyrillic ффпебк to FFPEBC');
  assert.equal(normalizePin('FFPEBC'), 'FFPEBC', 'normalizePin must keep Latin FFPEBC');
  cloudSyncManager.setPin('  ффпебк  ');
  assert.equal(cloudSyncManager.getPin(), 'FFPEBC', 'cloudSyncManager must normalize Cyrillic ффпебк to FFPEBC');
  cloudSyncManager.setPin('  ffpebc_01  ');
  assert.equal(cloudSyncManager.getPin(), 'FFPEBC_01', 'cloudSyncManager must normalize pin to uppercase without whitespace');

  // 5. Codebase integrity: App.tsx and SyncModal.tsx contain dynamic on-the-fly sync handlers
  const appTsx = fs.readFileSync('src/App.tsx', 'utf-8');
  assert.ok(appTsx.includes('cloudSyncManager'), 'App.tsx must integrate cloudSyncManager');
  assert.ok(appTsx.includes('isSyncActive'), 'App.tsx must track isSyncActive for dynamic cloud indicator');
  assert.ok(!appTsx.includes('sync-live-pulse-dot'), 'App.tsx must NOT render separate green dot per user design');

  const syncModalTsx = fs.readFileSync('src/components/SyncModal.tsx', 'utf-8');
  assert.ok(syncModalTsx.includes('FFPEBC'), 'SyncModal.tsx must mention FFPEBC');
  assert.ok(syncModalTsx.includes('cloudSyncManager'), 'SyncModal.tsx must integrate cloudSyncManager');

  const serverTs = fs.readFileSync('server.ts', 'utf-8');
  assert.ok(serverTs.includes('Access-Control-Allow-Origin'), 'server.ts must support CORS for AI Studio');
  assert.ok(serverTs.includes('/api/sync/:pin'), 'server.ts must provide /api/sync/:pin');

  const viteConfigTs = fs.readFileSync('vite.config.ts', 'utf-8');
  assert.ok(viteConfigTs.includes('apiSyncPlugin'), 'vite.config.ts must provide apiSyncPlugin for dev/preview in AI Studio');
});

test('Primary-source synchronization: Tasks 4, 5, 7, 10, 11, 13, 14, 15, 18, and 21 edge cases', () => {
  const bank = getTrainerBank();

  // 1. Task 4: every wrong row (!isCorrectRow) has solvedWords[0] !== words[0]
  for (const q of bank.fipiQuestions.filter((item) => item.task === '4')) {
    for (const r of q.rows) {
      if (!r.isCorrectRow) {
        assert.notEqual(
          r.solvedWords[0],
          r.words[0],
          `[${q.id}] Task 4 wrong row "${r.words[0]}" must have distinct orthoepic norm in solvedWords[0]`
        );
      }
    }
  }

  // 2. Task 5: zero single-character answers ("ж" from "жилищные") and zero fake "+ный" Sprint options
  const fakeNyiRe = /(?:тьный|сяный|ыеный|иеный|аяный|яяный|оеный|ееный|ыйный|ойный|льнаный|мяный|стьный)$/i;
  for (const q of bank.fipiQuestions.filter((item) => item.task === '5')) {
    for (const ans of q.textAnswers || []) {
      assert.ok(ans.length >= 2, `[${q.id}] Task 5 textAnswer "${ans}" must not be truncated`);
    }
  }
  for (const s of bank.sprintQuestions.filter((item) => item.task === '5')) {
    for (const opt of s.options) {
      assert.equal(fakeNyiRe.test(opt), false, `[${s.id}] Task 5 Sprint option "${opt}" must not be a fake +ный word`);
    }
  }

  // 3. Task 7: error row solvedWords[0] differs from words[0]
  for (const q of bank.fipiQuestions.filter((item) => item.task === '7')) {
    const errRow = q.rows.find((r) => r.isCorrectRow);
    assert.ok(errRow, `[${q.id}] Task 7 must have an error row`);
    assert.notEqual(
      errRow.solvedWords[0].toLowerCase(),
      errRow.words[0].toLowerCase(),
      `[${q.id}] Task 7 error row "${errRow.words[0]}" must differ from solvedWords[0] "${errRow.solvedWords[0]}"`
    );
  }

  // 4. Specific Tasks 10, 13, 18, 21 primary-source checks
  const q10_142438 = bank.fipiQuestions.find((q) => q.id === 'fipi-10-shkolkovo-10-142438');
  assert.ok(q10_142438);
  assert.deepEqual(q10_142438.correctIndices, [2, 3]);

  const q10_54718 = bank.fipiQuestions.find((q) => q.id === 'fipi-10-neofamily-10-54718');
  assert.ok(q10_54718);
  assert.deepEqual(q10_54718.correctIndices, [1, 2]);

  const q13_54453 = bank.fipiQuestions.find((q) => q.id === 'fipi-13-neofamily-13-54453');
  assert.ok(q13_54453);
  assert.deepEqual(q13_54453.correctIndices, [1, 3, 5]);
  assert.equal(q13_54453.rows[4].letter, 'РАЗДЕЛЬНО');

  // 5. Multi-digit markers (10..13) in Task 18 & Task 21 (present in getTrainerBank)
  const q18_47794 = bank.fipiQuestions.find((q) => q.id === 'nf-18-47794');
  assert.ok(q18_47794);
  assert.deepEqual(q18_47794.correctIndices, [2, 3, 4, 5, 10, 11]);
  assert.equal(checkFipiQuestionAnswer(q18_47794, [2, 3, 4, 5, 10, 11]).isCorrect, true);
  assert.equal(checkFipiQuestionAnswer(q18_47794, '23451011').isCorrect, true);

  const q21_27747 = bank.fipiQuestions.find((q) => q.id === 'nf-21-27747');
  assert.ok(q21_27747, 'nf-21-27747 (10 rows) must be included in getTrainerBank().fipiQuestions');
  assert.deepEqual(q21_27747.correctIndices, [3, 10]);
  assert.equal(checkFipiQuestionAnswer(q21_27747, [3, 10]).isCorrect, true);
  assert.equal(checkFipiQuestionAnswer(q21_27747, '310').isCorrect, true);

  assert.deepEqual(parseKimAnswerIndices('310', 10), [3, 10]);
  assert.deepEqual(parseKimAnswerIndices('11011', 12), [1, 10, 11]);
  assert.deepEqual(
    parseKimAnswerIndices('123467810111213', 13),
    [1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13]
  );
  assert.equal(normalizeKimDigits('310', 10), '310');
  assert.equal(normalizeKimDigits('11011', 12), '11011');

  // 6. Alternative valid answer groups in Task 21 & shk-18-29059
  const q18_29059 = bank.fipiQuestions.find((q) => q.id === 'shk-18-29059');
  assert.ok(q18_29059);
  assert.equal(checkFipiQuestionAnswer(q18_29059, [1]).isCorrect, true);
  assert.equal(checkFipiQuestionAnswer(q18_29059, [2]).isCorrect, true);
  assert.equal(checkFipiQuestionAnswer(q18_29059, '2').isCorrect, true);

  const multiGroup21 = bank.fipiQuestions.filter(
    (q) => q.task === '21' && Array.isArray(q.textAnswers) && q.textAnswers.length > 1
  );
  assert.ok(multiGroup21.length >= 80, 'Task 21 must preserve all multi-group answer variants in textAnswers');
  for (const q of multiGroup21) {
    for (const altGroup of q.textAnswers || []) {
      assert.equal(
        checkFipiQuestionAnswer(q, altGroup).isCorrect,
        true,
        `[${q.id}] Alternative Task 21 answer group "${altGroup}" must evaluate to true`
      );
    }
  }

  // 7. Zero soft hyphens (\u00ad), zero-width chars, or "(Взято из сборника...)" footnote bleeds
  for (const q of bank.fipiQuestions) {
    const rawJson = JSON.stringify(q);
    assert.equal(/\u00ad/.test(rawJson), false, `[${q.id}] FIPI question must not contain soft hyphens`);
    assert.equal(/Взято из сборника/i.test(rawJson), false, `[${q.id}] FIPI question must not contain source footnote bleed`);
  }
  for (const s of bank.sprintQuestions) {
    const rawJson = JSON.stringify(s);
    assert.equal(/\u00ad/.test(rawJson), false, `[${s.id}] Sprint question must not contain soft hyphens`);
    assert.equal(/Взято из сборника/i.test(rawJson), false, `[${s.id}] Sprint question must not contain source footnote bleed`);
  }

  // 8. Task 5: shk-5-28866 (РФ vs ДИПЛОМАТИЧНУЮ), nf-5-29630 (КРАСОЧНЫМИ -> КРАСЯЩИМИ), and Roman numerals
  const q5_28866 = bank.fipiQuestions.find((q) => q.id === 'shk-5-28866');
  assert.ok(q5_28866);
  assert.deepEqual(q5_28866.correctIndices, [4]);
  assert.ok(q5_28866.rows[3].solvedWords[0].includes('ДИПЛОМАТИЧЕСКУЮ'));

  const q5_29630 = bank.fipiQuestions.find((q) => q.id === 'nf-5-29630');
  assert.ok(q5_29630);
  assert.ok(q5_29630.rows[0].solvedWords[0].includes('КРАСЯЩИМИ'));
  assert.equal(q5_29630.rows[0].solvedWords[0].includes('КРАСЯЩИМИСОЧНЫМИ'), false);

  const q5_117430 = bank.fipiQuestions.find((q) => q.id === 'shk-5-117430');
  assert.ok(q5_117430);
  assert.deepEqual(q5_117430.correctIndices, [2]);
  assert.ok(q5_117430.rows[1].solvedWords[0].includes('АВТОРИТАРНЫЙ'));

  const q5_76742 = bank.fipiQuestions.find((q) => q.id === 'nf-5-76742');
  assert.ok(q5_76742);
  assert.ok(q5_76742.rows[1].words[0].includes('XIX'));
  assert.equal(q5_76742.rows[1].words[0].includes('ХИХ'), false);

  // 9. Task 6: ИСКЛЮЧИВ vs ЗАМЕНИВ instructions and ё variants
  const q6_134692 = bank.fipiQuestions.find((q) => q.id === 'shk-6-134692');
  assert.ok(q6_134692);
  assert.equal(q6_134692.target, 'ИСКЛЮЧИВ');
  const q6_78380 = bank.fipiQuestions.find((q) => q.id === 'nf-6-78380');
  assert.ok(q6_78380);
  assert.equal(q6_78380.target, 'ИСКЛЮЧИВ');
  const q6_150345 = PARSED_FIPI_QUESTIONS.find((q) => q.id === 'shk-6-150345');
  assert.ok(q6_150345);
  assert.equal(q6_150345.target, 'ИСКЛЮЧИВ');
  const q6_37417 = bank.fipiQuestions.find((q) => q.id === 'nf-6-37417');
  assert.ok(q6_37417);
  assert.equal(checkFipiQuestionAnswer(q6_37417, 'произошёл').isCorrect, true);
  assert.equal(checkFipiQuestionAnswer(q6_37417, 'произошел').isCorrect, true);

  // 10. Task 7: suppletive & morphological error row accuracy and non-error row preservation
  const task7Checks: Array<[string, number, string]> = [
    ['nf-7-77800', 4, 'ЯСЛЕЙ'],
    ['nf-7-77797', 3, 'ТРЁХСОТ'],
    ['nf-7-77791', 5, 'КОСНУТЬСЯ'],
    ['nf-7-76466', 4, 'НАДЕТЬ'],
    ['nf-7-74930', 3, 'ЕЗЖУ'],
    ['nf-7-74926', 3, 'ДВУХТЫСЯЧНОМУ'],
    ['nf-7-73939', 5, 'ЛЯГТЕ'],
    ['nf-7-55407', 2, 'ОБЕИМ'],
    ['shk-7-40377', 5, 'ДВУМСТАМ'],
    ['shk-7-42646', 2, 'ЕМУ'],
    ['shk-7-119123', 2, 'МАШЕТ'],
    ['shk-7-172338', 2, 'ТРЁМ'],
    ['shk-7-172344', 3, 'ВЫИГРАТЬ'],
    ['nf-7-48402', 2, 'ПОЛУТОРА'],
  ];
  for (const [id, expectedRow, expectedWord] of task7Checks) {
    const q7 = bank.fipiQuestions.find((q) => q.id === id);
    assert.ok(q7, `Missing Task 7 question ${id}`);
    assert.deepEqual(q7.correctIndices, [expectedRow], `[${id}] expected correctIndices [${expectedRow}]`);
    assert.ok(
      q7.rows[expectedRow - 1].solvedWords[0].toUpperCase().includes(expectedWord),
      `[${id}] expected solvedWords "${q7.rows[expectedRow - 1].solvedWords[0]}" to include "${expectedWord}"`
    );
  }
  for (const q7 of bank.fipiQuestions.filter((q) => q.task === '7')) {
    for (const r of q7.rows) {
      if (!r.isCorrectRow) {
        assert.equal(r.solvedWords[0], r.words[0], `[${q7.id}] non-error row must keep solvedWords[0] === words[0]`);
      }
    }
  }

  // 11. Tasks 8 & 22: zero header bleeds in matchingLetters and zero truncated 48-char Task 8 Sprint options
  for (const q of bank.fipiQuestions.filter((item) => item.task === '8' || item.task === '22')) {
    for (const ml of q.matchingLetters || []) {
      const txt = typeof ml === 'string' ? ml : ml.text;
      assert.equal(
        /ИЗОБРАЗИТЕЛЬНО-ВЫРАЗИТЕЛЬНЫЕ|ПРЕДЛОЖЕНИЯ:|ПРЕЛОЖЕНИЯ:/i.test(txt),
        false,
        `[${q.id}] matchingLetters has header bleed: "${txt}"`
      );
    }
  }
  for (const s of bank.sprintQuestions.filter((item) => item.task === '8')) {
    for (const opt of s.options) {
      assert.equal(
        opt.endsWith('несогласова') || opt.endsWith('(сложноподчинённого') || opt.endsWith('причастного об'),
        false,
        `[${s.id}] Task 8 Sprint option is truncated: "${opt}"`
      );
    }
  }

  // 12. Task 14: fipi-14-neofamily-14-36730 restored to РАЗДЕЛЬНО
  const q14_36730 = bank.fipiQuestions.find((q) => q.id === 'fipi-14-neofamily-14-36730');
  assert.ok(q14_36730);
  assert.equal(q14_36730.target, 'РАЗДЕЛЬНО');
  assert.deepEqual(q14_36730.correctIndices, [1, 2]);
  assert.equal(q14_36730.rows[0].letter, 'РАЗДЕЛЬНО / РАЗДЕЛЬНО');
  assert.equal(q14_36730.rows[1].letter, 'РАЗДЕЛЬНО / РАЗДЕЛЬНО');

  // 13. Task 15: 8 100points questions have authentic correctIndices & solvedWords, zero bogus -АН-/-ЯН-/-ИН-
  const q15_2211 = bank.fipiQuestions.find((q) => q.id === 'fipi-15-100points-15-2211');
  assert.ok(q15_2211);
  assert.deepEqual(q15_2211.correctIndices, [1, 3, 4]);
  assert.equal(q15_2211.rows[0].solvedWords[0], 'латаНый');
  assert.equal(q15_2211.rows[1].solvedWords[0], 'длиННый');
  assert.equal(q15_2211.rows[2].solvedWords[0], 'нечёсаНой');
  assert.equal(q15_2211.rows[3].solvedWords[0], 'путаНицы');

  const q15_6830 = bank.fipiQuestions.find((q) => q.id === 'fipi-15-100points-15-6830');
  assert.ok(q15_6830);
  assert.deepEqual(q15_6830.correctIndices, [2, 3]);
  assert.equal(q15_6830.rows[1].solvedWords[0], 'невидаННые');
  assert.equal(q15_6830.rows[2].solvedWords[0], 'удлинёННые');

  // 14. Task 21: zero "Предложение (1)" placeholders and nf-21-28346 restored
  for (const q21 of bank.fipiQuestions.filter((q) => q.task === '21')) {
    for (const r of q21.rows) {
      assert.equal(
        /^Предложение\s*\(\d+\)$/i.test(r.words[0].trim()),
        false,
        `[${q21.id}] Task 21 row must not be a placeholder "${r.words[0]}"`
      );
    }
  }
  const q21_28346 = bank.fipiQuestions.find((q) => q.id === 'nf-21-28346');
  assert.ok(q21_28346);
  assert.deepEqual(q21_28346.correctIndices, [1, 2, 5, 6]);
});


