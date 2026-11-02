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
  console.log('[BROWSER] Launching Google Chrome headless for Task 13 inspection on port 9224...');
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
    const targets = await getJsonWithRetry('http://127.0.0.1:9224/json/list');
    const pageTarget = targets.find((t) => t.type === 'page');
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.ready();

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log('[CDP] Navigating to http://127.0.0.1:4173/ ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
    await wait(2500);

    // Filter to ONLY Task 13 in the UI
    const configureOnly13 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        // Toggle off all blocks except Orthography
        const switches = Array.from(document.querySelectorAll('button[role="switch"]'));
        // Turn off all other tasks, only keep 13 enabled
        // In local state, we can dispatch custom quantities or click preset
        const meta = window.__egeState;
        return true;
      })()`,
      returnByValue: true,
    });

    // Directly trigger a workout for Task 13 in the browser session!
    const triggerTask13Workout = await client.send('Runtime.evaluate', {
      expression: `(() => {
        // Find sprint tab or presets
        const sprintTab = document.getElementById('tab-btn-sprint');
        if (sprintTab) {
          sprintTab.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true,
    });
    console.log('[BROWSER] Switched to Sprint tab:', triggerTask13Workout.result.value);
    await wait(1500);

    // In Sprint, select Task 13 filter
    const selectFilter13 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn13 = btns.find(b => b.innerText && (b.innerText.trim() === '№ 13' || b.innerText.includes('13')));
        if (btn13) {
          btn13.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true,
    });
    console.log('[BROWSER] Selected Task 13 in Sprint filter:', selectFilter13.result.value);
    await wait(1500);

    // Capture Sprint Task 13 view
    const scrSprint = await client.send('Page.captureScreenshot', { format: 'png' });
    const imgSprintPath = path.resolve(process.cwd(), 'public/assets/aistudio/test_sprint_task13.png');
    fs.writeFileSync(imgSprintPath, Buffer.from(scrSprint.data, 'base64'));
    console.log('[CDP] Saved Sprint Task 13 view to:', imgSprintPath);

    // Open Rule Inspector for this question
    const openInspectorInSprint = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.getElementById('open-rule-inspector-btn') || Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Правило'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true,
    });
    console.log('[BROWSER] Opened rule inspector in Sprint:', openInspectorInSprint.result.value);
    await wait(1500);

    const sheetDetails = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const sheet = document.getElementById('rule-inspector-modal');
        if (!sheet) return null;
        return {
          header: sheet.querySelector('h3')?.innerText || '',
          topicBadge: sheet.querySelector('.ios-row-icon + div span')?.innerText || '',
          word: sheet.querySelector('.text-\\\\[20px\\\\]')?.innerText || '',
          allText: sheet.innerText
        };
      })()`,
      returnByValue: true,
    });
    console.log('[BROWSER] Sheet details for Task 13:', sheetDetails.result.value);

    // Capture screenshot of Rule Inspector for Task 13
    const scrSheet13 = await client.send('Page.captureScreenshot', { format: 'png' });
    const imgSheet13Path = path.resolve(process.cwd(), 'public/assets/aistudio/test_task13_rule_modal.png');
    fs.writeFileSync(imgSheet13Path, Buffer.from(scrSheet13.data, 'base64'));
    console.log('[CDP] Saved Task 13 rule modal to:', imgSheet13Path);

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
