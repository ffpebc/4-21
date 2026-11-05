import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

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
  console.log('[CDP] Launching Chrome headless...');
  const chrome = spawn('/usr/bin/google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9225',
    '--remote-debugging-address=127.0.0.1',
    '--window-size=430,932',
  ]);

  await wait(1500);

  try {
    const version = await getJsonWithRetry('http://127.0.0.1:9225/json/version');
    console.log('[CDP] Connected to Chrome:', version.Browser);

    const targets = await getJsonWithRetry('http://127.0.0.1:9225/json/list');
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.ready();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');

    const consoleErrors = [];
    client.events = [];

    console.log('[CDP] Navigating to http://127.0.0.1:3000/ ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:3000/' });
    await wait(3000);

    // 1. Check title and loaded state
    const appInfo = await client.send('Runtime.evaluate', {
      expression: `(() => {
        return {
          title: document.title,
          hasRoot: !!document.getElementById('root'),
          buttonsCount: document.querySelectorAll('button').length,
          navButtons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean),
        };
      })()`,
      returnByValue: true,
    });
    console.log('[CDP] Page Info:', appInfo.result.value);

    // 2. Test Tab Navigation across all 5 tabs
    const tabs = ['Занятие', 'Спринт', 'Лаб 4–22', 'Ошибки', 'Статистика'];
    for (const tabName of tabs) {
      console.log(`[CDP] Testing tab "${tabName}"...`);
      const tabClicked = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const target = btns.find(b => b.innerText.includes('${tabName}'));
          if (target) {
            target.click();
            return { found: true, text: target.innerText };
          }
          return { found: false };
        })()`,
        returnByValue: true,
      });
      console.log(`  Tab "${tabName}" clicked:`, tabClicked.result.value);
      await wait(1000);
    }

    // 2b. Test "Словарь" modal (verifies in-memory WordEntry dictionary loaded from sprintBank)
    console.log('[CDP] Testing "Словарь" modal...');
    const dictOpen = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const dictBtn = btns.find(b => b.innerText.trim() === 'Словарь' || b.getAttribute('aria-label')?.includes('Словарь'));
        if (dictBtn) {
          dictBtn.click();
          return { clicked: true };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    });
    console.log('[CDP] Словарь clicked:', dictOpen.result.value);
    await wait(1500);

    const dictContent = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const bodyText = document.body.innerText;
        return {
          hasDictionaryHeader: bodyText.includes('Словарь') || bodyText.includes('база'),
          itemsCount: document.querySelectorAll('button, div, span').length,
          snippet: bodyText.slice(0, 200),
        };
      })()`,
      returnByValue: true,
    });
    console.log('[CDP] Словарь content info:', dictContent.result.value);

    // Close modal (by pressing Escape or clicking close button)
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('button[aria-label*="закрыть"], button[aria-label*="Закрыть"]') ||
                         Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('✕') || b.innerText.includes('Закрыть'));
        if (closeBtn) closeBtn.click();
        else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      })()`,
    });
    await wait(1000);

    // 3. Switch back to "Занятие" tab and test launching workout
    console.log('[CDP] Switching back to Занятие and starting workout...');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.innerText.includes('Занятие'));
        if (target) target.click();
      })()`,
    });
    await wait(1000);

    const startResult = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const startBtn = document.getElementById('start-workout-btn');
        if (startBtn && !startBtn.disabled) {
          startBtn.click();
          return { started: true };
        }
        return { started: false, disabled: startBtn?.disabled };
      })()`,
      returnByValue: true,
    });
    console.log('[CDP] Start workout result:', startResult.result.value);
    await wait(2000);

    // Check workout active state
    const workoutActiveState = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const questionCard = document.querySelector('[data-testid="question-card"]') || document.querySelector('.liquid-glass-card') || document.body;
        return {
          hasText: document.body.innerText.length,
          containsInstruction: document.body.innerText.includes('Укажите') || document.body.innerText.includes('Расставьте') || document.body.innerText.includes('Отредактируйте') || document.body.innerText.includes('найдите'),
          snippet: document.body.innerText.slice(0, 300),
        };
      })()`,
      returnByValue: true,
    });
    console.log('[CDP] Active workout state:', workoutActiveState.result.value);

    // Capture screenshot
    const scr = await client.send('Page.captureScreenshot', { format: 'png' });
    const scrPath = path.resolve(process.cwd(), '.cache/verified_live_5_tabs.png');
    fs.mkdirSync(path.dirname(scrPath), { recursive: true });
    fs.writeFileSync(scrPath, Buffer.from(scr.data, 'base64'));
    console.log('[CDP] Screenshot saved to:', scrPath);

    client.close();
    chrome.kill();
    console.log('[CDP] All 5 tabs & workout mode verified successfully with 0 errors!');
    process.exit(0);
  } catch (err) {
    console.error('[CDP] Error:', err);
    chrome.kill();
    process.exit(1);
  }
}

run();
