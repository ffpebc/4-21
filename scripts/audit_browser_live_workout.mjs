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
  console.log('[BROWSER] Launching Google Chrome headless with CDP on port 9224...');
  const chrome = spawn('/usr/bin/google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9224',
    '--remote-debugging-address=127.0.0.1',
    '--window-size=430,932',
  ]);

  await wait(1500);

  try {
    const version = await getJsonWithRetry('http://127.0.0.1:9224/json/version');
    console.log('[BROWSER] Connected to Chrome:', version.Browser);

    const targets = await getJsonWithRetry('http://127.0.0.1:9224/json/list');
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.ready();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Accessibility.enable');

    console.log('[CDP] Navigating to http://127.0.0.1:3000/ ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:3000/' });
    await wait(2500);

    // Click "Начать занятие" button
    console.log('[BROWSER] Clicking #start-workout-btn to launch workout...');
    const startClicked = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.getElementById('start-workout-btn');
        if (btn && !btn.disabled) {
          btn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true,
    });
    console.log('[BROWSER] Start workout clicked:', startClicked.result.value);
    await wait(2000);

    // Capture workout active screen
    const scrWorkout = await client.send('Page.captureScreenshot', { format: 'png' });
    const imgWorkoutPath = path.resolve(process.cwd(), 'public/assets/aistudio/test_workout_active.png');
    fs.writeFileSync(imgWorkoutPath, Buffer.from(scrWorkout.data, 'base64'));
    console.log('[CDP] Saved workout active view to:', imgWorkoutPath);

    // Open Rule Inspector Modal
    console.log('[BROWSER] Clicking #open-rule-inspector-btn to inspect rule modal...');
    const ruleBtnClicked = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.getElementById('open-rule-inspector-btn');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true,
    });
    console.log('[BROWSER] Rule inspector button clicked:', ruleBtnClicked.result.value);
    await wait(1500);

    // Extract Rule Inspector content
    const ruleModalContent = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const sheet = document.getElementById('rule-inspector-modal');
        if (!sheet) return null;
        const topic = sheet.querySelector('.ios-row-icon + div span')?.innerText || '';
        const badges = Array.from(sheet.querySelectorAll('span')).map(s => s.innerText.trim()).filter(Boolean);
        const steps = Array.from(sheet.querySelectorAll('.flex-1')).map(s => s.innerText.trim()).filter(Boolean);
        const allText = sheet.innerText;
        return {
          topic,
          badges: badges.slice(0, 10),
          steps: steps.slice(0, 6),
          hasContradiction: (allText.includes('СЛИТНО') && allText.includes('раздельно') && !allText.includes('не выполняется ни одно из условий') && !allText.includes('отсутствии')),
          textSnippet: allText.slice(0, 500)
        };
      })()`,
      returnByValue: true,
    });
    console.log('[BROWSER] Rule Inspector Sheet Content:', JSON.stringify(ruleModalContent.result.value, null, 2));

    // Capture Rule Inspector screenshot
    const scrModal = await client.send('Page.captureScreenshot', { format: 'png' });
    const imgModalPath = path.resolve(process.cwd(), 'public/assets/aistudio/test_rule_inspector_modal.png');
    fs.writeFileSync(imgModalPath, Buffer.from(scrModal.data, 'base64'));
    console.log('[CDP] Saved Rule Inspector Modal screenshot to:', imgModalPath);

    client.close();
  } finally {
    chrome.kill();
    console.log('[BROWSER] Chrome terminated.');
  }
}

run().catch((err) => {
  console.error('[BROWSER ERROR]', err);
  process.exit(1);
});
