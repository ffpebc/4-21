import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCheatsheetGroundedPrompt,
  CHEATSHEET_BY_TASK,
  getCheatsheetKnowledgeForTask,
} from '../data/cheatsheetKnowledge';
import {
  buildLocalCheatsheetFallback,
  buildSprintExplainPayload,
  buildFipiExplainPayload,
  buildErrorExplainPayload,
  getCachedGeminiExplanation,
} from './geminiExplain';
import { cleanExplanation, TASK_IDS } from './trainerLogic';
import {
  explainWithGemini,
  getGeminiStatus,
  resolveConfiguredModel,
} from '../../server/geminiExplainHandler';
import starterBank from '../data/starterBank.json';

test('Cheatsheet knowledge covers all 19 tasks 4-22 completely', () => {
  for (const task of TASK_IDS) {
    const entry = getCheatsheetKnowledgeForTask(task);
    assert.equal(entry.task, task);
    assert.ok(entry.title.length > 5, `Title missing for task ${task}`);
    assert.ok(entry.content.length > 100, `Content too short for task ${task}`);
    assert.equal(CHEATSHEET_BY_TASK[task], entry);
  }
});

test('buildCheatsheetGroundedPrompt restricts Gemini strictly to task cheatsheet', () => {
  const prompt = buildCheatsheetGroundedPrompt({
    task: '10',
    questionKind: 'sprint',
    topic: 'Приставки на -З/-С',
    promptText: 'ра[..]сказать (выберите З или С)',
    correctAnswer: 'С',
    userAnswer: 'З',
  });

  assert.match(prompt.systemInstruction, /ЧИСТО НА ОСНОВЕ ТЕКСТА ШПАРГАЛКИ/i);
  assert.match(prompt.systemInstruction, /Запрещено привлекать внешние правила/i);
  assert.match(prompt.userPrompt, /Фока, хочешь поесть щец/);
  assert.match(prompt.userPrompt, /Правильный ответ: С/);
  assert.match(prompt.userPrompt, /Ответ ученика: З/);
  assert.equal(prompt.sectionTitle, CHEATSHEET_BY_TASK['10'].title);
});

test('cleanExplanation preserves EGE omission <…> while stripping HTML tags', () => {
  const cleaned = cleanExplanation('<p>Текст примера <…> и <strong>выделение</strong></p>');
  assert.ok(cleaned.includes('<…>'), `Expected <…> to be preserved, got: ${cleaned}`);
  assert.ok(!cleaned.includes('<p>'));
  assert.ok(!cleaned.includes('<strong>'));
});

test('Payload builders and local cheatsheet fallback work across Sprint, FIPI, and Error entries', () => {
  const sprintPayload = buildSprintExplainPayload(
    {
      id: 'sp-test-9',
      kind: 'sprint',
      task: '9',
      topic: 'Чередующиеся корни',
      rule: 'Чередование лаг/лож',
      prefix: 'пол',
      suffix: 'гать',
      answer: 'А',
      options: ['А', 'О'],
      context: '(предполагать)',
      explanation: 'Корень -ЛАГ-/-ЛОЖ-: перед Г пишется А.',
    },
    'О',
  );
  assert.match(sprintPayload.promptText, /пол\[\.\.\]гать/);

  const fipiPayload = buildFipiExplainPayload(
    {
      id: 'fipi-test-16',
      kind: 'fipi',
      task: '16',
      topic: 'ССП и ОЧП',
      rule: 'Знаки в ССП',
      rows: [
        {
          words: ['Гроза прошла, и выглянуло солнце.'],
          solvedWords: ['Гроза прошла, и выглянуло солнце.'],
          letter: '1',
          isCorrectRow: true,
          explanation: 'ССП, перед союзом И нужна одна запятая.',
        },
      ],
      correctIndices: [1],
    },
    '1',
  );
  assert.equal(fipiPayload.correctAnswer, '1');

  const errorPayload = buildErrorExplainPayload({
    task: '11',
    questionId: 'err-1',
    wordDisplay: 'затм..вать',
    correctWord: 'затмЕвать',
    correctChoice: 'Е',
    userChoice: 'И',
    explanation: 'Исключение с ударным -ВА-.',
  });
  const fallback = buildLocalCheatsheetFallback(errorPayload, { needsApiKey: true });
  assert.equal(fallback.grounded, true);
  assert.equal(fallback.fromFallback, true);
  assert.equal(fallback.needsApiKey, true);
  assert.match(fallback.explanation, /затмева́ть/i);
  assert.match(fallback.explanation, /Почему ошибка: выбран ответ «И», а верно — «Е»/);
  assert.equal(getCachedGeminiExplanation(errorPayload), null);
});

test('Server Gemini handler validates inputs, defaults to fast lite model, and handles missing API key', async () => {
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevGoogle = process.env.GOOGLE_API_KEY;
  const prevModel = process.env.GEMINI_MODEL;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_MODEL;

  try {
    assert.equal(resolveConfiguredModel(), 'gemini-3.5-flash-lite');
    const statusNone = getGeminiStatus();
    assert.equal(statusNone.configured, false);
    assert.equal(statusNone.source, 'none');

    const badReq = await explainWithGemini({ task: '99' as any, promptText: '', correctAnswer: '' });
    assert.equal(badReq.status, 400);

    const noKey = await explainWithGemini({
      task: '14',
      promptText: 'В(ТЕЧЕНИЕ) дня',
      correctAnswer: 'РАЗДЕЛЬНО',
    });
    assert.equal(noKey.status, 401);
    assert.equal(noKey.data.needsApiKey, true);
    assert.equal(noKey.data.sourceSection, CHEATSHEET_BY_TASK['14'].title);
  } finally {
    if (prevGemini !== undefined) process.env.GEMINI_API_KEY = prevGemini;
    if (prevGoogle !== undefined) process.env.GOOGLE_API_KEY = prevGoogle;
    if (prevModel !== undefined) process.env.GEMINI_MODEL = prevModel;
  }
});

test('All tasks 4-22 datasets pass structural and cleanliness invariants', () => {
  const root = process.cwd();
  const fipi = JSON.parse(fs.readFileSync(path.join(root, 'public/data/fipiTasksBank9_15.json'), 'utf8'));
  const sprint = JSON.parse(fs.readFileSync(path.join(root, 'public/data/sprintBank9_15.json'), 'utf8'));
  const words = JSON.parse(fs.readFileSync(path.join(root, 'public/data/allWordsBank9_15.json'), 'utf8'));

  // Every task 4..22 must be populated in both FIPI and Sprint
  for (const task of TASK_IDS) {
    const fCount = fipi.filter((q: any) => String(q.task) === task).length;
    const sCount = sprint.filter((q: any) => String(q.task) === task).length;
    assert.ok(fCount >= 250, `Expected >=250 FIPI items for task ${task}, got ${fCount}`);
    assert.ok(sCount >= 200, `Expected >=200 Sprint items for task ${task}, got ${sCount}`);
  }

  // No broken scraper entities, homoglyphs, or unresolved markers in any bank
  const badEntityRe = /&[a-zA-Zа-яА-ЯёЁ#0-9]+[;.]|<\.„>|тЕрavший/;
  for (const dataset of [fipi, sprint, words, starterBank.fipi, starterBank.sprint]) {
    for (const item of dataset) {
      assert.ok(
        !badEntityRe.test(JSON.stringify(item)),
        `Found broken entity/artifact in item ${item.id || item.word}`,
      );
    }
  }

  for (const q of fipi) {
    const combined = [
      q.sentence,
      q.instruction,
      ...(q.rows || []).flatMap((r: any) => [...(r.words || []), ...(r.solvedWords || []), r.explanation]),
    ]
      .filter(Boolean)
      .join(' ');

    for (const tok of combined.match(/[a-zA-Zа-яА-ЯёЁË]+/g) || []) {
      assert.ok(
        !(/[a-zA-ZË]/.test(tok) && /[а-яА-ЯёЁ]/.test(tok)),
        `Mixed Latin+Cyrillic homoglyph token "${tok}" in ${q.id}`,
      );
    }

    if (String(q.task) === '13') {
      for (const r of q.rows || []) {
        for (const sw of r.solvedWords || []) {
          assert.ok(!/\((НЕ|НИ|КОГО)\)/.test(sw), `Unresolved paren in Task 13 ${q.id}: ${sw}`);
        }
      }
    }

    if (String(q.task) === '21') {
      for (const r of q.rows || []) {
        assert.ok(
          !/конструкция или конструкция|^Предложение:\s*-$/.test((r.explanation || '').trim()),
          `Broken Task 21 explanation in ${q.id}: ${r.explanation}`,
        );
      }
    }
  }

  for (const s of sprint) {
    assert.ok(Array.isArray(s.options) && s.options.includes(s.answer), `Bad Sprint options in ${s.id}`);
    assert.ok(typeof s.explanation === 'string' && s.explanation.trim().length > 0, `Empty Sprint explanation in ${s.id}`);
  }
});
