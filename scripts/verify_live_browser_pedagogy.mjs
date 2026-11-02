import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJsonWithRetry(url, retries = 10, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        });
        req.on('error', reject);
      });
    } catch (e) {
      if (i === retries - 1) throw e;
      await wait(delay);
    }
  }
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.ws.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      if (parsed.id && this.callbacks.has(parsed.id)) {
        const { resolve, reject } = this.callbacks.get(parsed.id);
        this.callbacks.delete(parsed.id);
        if (parsed.error) reject(parsed.error);
        else resolve(parsed.result);
      } else {
        this.events.push(parsed);
      }
    };
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
    });
  }

  async send(method, params = {}) {
    const callId = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(callId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: callId, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('[BROWSER] Launching Google Chrome headless with CDP on port 9230...');
  const chrome = spawn('/usr/bin/google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9230',
    '--remote-debugging-address=127.0.0.1',
    '--window-size=430,932',
  ]);

  await wait(1500);

  try {
    const targets = await getJsonWithRetry('http://127.0.0.1:9230/json/list');
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.ready();

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log('[CDP] Navigating to http://127.0.0.1:3000/ ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:3000/' });
    await wait(3000);

    // Switch to Sprint tab
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const sprintTab = document.getElementById('tab-btn-sprint');
        if (sprintTab) sprintTab.click();
      })()`,
    });
    await wait(1200);

    const auditResults = {};

    // Test Tasks in Sprint: Task 4 (Speech), Task 14 (Orthography/Splits), Task 15 (Orthography/NN), Task 16 (Punctuation)
    for (const tid of ['4', '14', '15', '16']) {
      console.log(`[CDP] Testing Task ${tid} in Sprint...`);
      // Select Task filter
      await client.send('Runtime.evaluate', {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.innerText && (b.innerText.trim() === '№ ${tid}' || b.innerText.trim() === '${tid}'));
          if (btn) btn.click();
        })()`,
      });
      await wait(800);

      // Open Rule Inspector
      await client.send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.getElementById('sprint-rule-btn') || document.getElementById('open-rule-inspector-btn');
          if (btn) btn.click();
        })()`,
      });
      await wait(1000);

      // Read Rule Inspector contents
      const modalData = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const sheet = document.getElementById('rule-inspector-modal');
          if (!sheet) return null;
          const title = sheet.querySelector('h3')?.innerText || '';
          const topic = sheet.querySelector('.text-\\\\[11\\\\.5px\\\\]')?.innerText || '';
          const word = sheet.querySelector('.text-\\\\[20px\\\\]')?.innerText || '';
          const steps = Array.from(sheet.querySelectorAll('.flex-1')).map(s => s.innerText.trim()).filter(Boolean);
          const fullText = sheet.innerText;

          // Check if any slashed or placeholder artifacts are present
          const hasPlaceholder = fullText.includes('либо полное причастие') || fullText.includes('наречие или производный предлог');
          const ruleHeading = Array.from(sheet.querySelectorAll('span')).find(s => s.innerText && s.innerText.includes('ФИПИ:'))?.innerText || '';

          return { title, topic, word, ruleHeading, stepsCount: steps.length, hasPlaceholder, snippet: fullText.slice(0, 300) };
        })()`,
        returnByValue: true,
      });

      auditResults[tid] = modalData.result.value;

      // Close Rule Inspector
      await client.send('Runtime.evaluate', {
        expression: `(() => {
          const closeBtn = document.getElementById('close-rule-inspector');
          if (closeBtn) closeBtn.click();
        })()`,
      });
      await wait(600);
    }

    console.log('[BROWSER VERIFICATION RESULTS]:');
    console.log(JSON.stringify(auditResults, null, 2));

    // Verify assertions
    const t4 = auditResults['4'];
    console.log('Task 4 Rule Heading:', t4?.ruleHeading, 'Word:', t4?.word);
    if (!t4?.ruleHeading || !t4.ruleHeading.toUpperCase().includes('НОРМА РЕЧИ ФИПИ:')) {
      throw new Error(`Task 4 rule heading should be НОРМА РЕЧИ ФИПИ: but was "${t4?.ruleHeading}"`);
    }
    if (t4.word.toLowerCase() === 'ждалаждала' || t4.word.toLowerCase() === 'озлобитьозлобить') {
      throw new Error(`Task 4 word is corrupted with duplicated prefix: ${t4.word}`);
    }

    const t14 = auditResults['14'];
    console.log('Task 14 Word:', t14?.word, 'Topic:', t14?.topic, 'HasPlaceholder:', t14?.hasPlaceholder);
    if (t14?.hasPlaceholder) {
      throw new Error('Task 14 contains placeholder scraper text!');
    }

    const t15 = auditResults['15'];
    console.log('Task 15 Word:', t15?.word, 'Topic:', t15?.topic, 'HasPlaceholder:', t15?.hasPlaceholder);
    if (t15?.hasPlaceholder) {
      throw new Error('Task 15 contains placeholder scraper text!');
    }

    const t16 = auditResults['16'];
    console.log('Task 16 Rule Heading:', t16?.ruleHeading);
    if (!t16?.ruleHeading || !t16.ruleHeading.toUpperCase().includes('ПРАВИЛО ПУНКТУАЦИИ ФИПИ:')) {
      throw new Error(`Task 16 rule heading should be ПРАВИЛО ПУНКТУАЦИИ ФИПИ: but was "${t16?.ruleHeading}"`);
    }

    console.log('[CDP SUCCESS] Live browser verification passed perfectly!');

    client.close();
  } finally {
    chrome.kill();
  }
}

run().catch((e) => {
  console.error('[CDP FAILURE]', e);
  process.exit(1);
});
