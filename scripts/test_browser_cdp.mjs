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
  console.log('[BROWSER] Launching Google Chrome headless with CDP...');
  const chrome = spawn('/usr/bin/google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9224',
    '--remote-debugging-address=127.0.0.1',
    '--window-size=430,932', // iPhone 16 Pro Max viewport
  ]);

  chrome.stderr.on('data', (d) => {
    // console.log('[Chrome STDERR]', d.toString());
  });

  await wait(1500);

  try {
    const version = await getJsonWithRetry('http://127.0.0.1:9224/json/version');
    console.log('[BROWSER] Connected to Chrome:', version.Browser);

    const targets = await getJsonWithRetry('http://127.0.0.1:9224/json/list');
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.ready();
    console.log('[CDP] WebSocket connection established.');

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Accessibility.enable');

    console.log('[CDP] Navigating to http://127.0.0.1:4173/ ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/' });

    // Wait for page to load
    await wait(2500);

    // 1. Check Console errors
    const logsRes = await client.send('Runtime.evaluate', {
      expression: `window.__consoleErrors || []`,
      returnByValue: true,
    });
    console.log('[CDP] Console evaluation result:', logsRes.result.value);

    // 2. Take initial screenshot
    const screenshot1 = await client.send('Page.captureScreenshot', { format: 'png' });
    const img1Path = path.resolve(process.cwd(), 'public/assets/aistudio/test_home_screen.png');
    fs.writeFileSync(img1Path, Buffer.from(screenshot1.data, 'base64'));
    console.log('[CDP] Saved home screen screenshot to:', img1Path);

    // 3. Inspect A11y Tree
    const axTree = await client.send('Accessibility.getFullAXTree');
    console.log(`[A11Y] Captured Accessibility Tree with ${axTree.nodes.length} nodes.`);

    // Check buttons without accessible names
    const unnamedButtons = axTree.nodes.filter(
      (n) => n.role?.value === 'button' && (!n.name?.value || n.name.value.trim() === '')
    );
    console.log(`[A11Y] Buttons without accessible name: ${unnamedButtons.length}`);
    if (unnamedButtons.length > 0) {
      console.log('[A11Y WARN] Unnamed buttons:', unnamedButtons.map((b) => b.nodeId));
    }

    // 4. Measure tap targets
    const tapTargetCheck = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], a, input'));
        const smallTargets = [];
        for (const b of buttons) {
          const rect = b.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < 32 || rect.height < 32) {
              smallTargets.push({
                tag: b.tagName,
                text: (b.innerText || b.getAttribute('aria-label') || '').slice(0, 30),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
              });
            }
          }
        }
        return { total: buttons.length, small: smallTargets };
      })()`,
      returnByValue: true,
    });
    console.log(
      `[A11Y] Tap targets checked: ${tapTargetCheck.result.value.total} total, ${tapTargetCheck.result.value.small.length} small (<32px)`
    );

    // 5. Test clicking Task 13 button to inspect questions and rule inspector modal
    console.log('[BROWSER] Testing interaction with Task 13...');
    const clickTask13 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button, div')).find(el => el.innerText && el.innerText.includes('Задание 13') || el.innerText === '13');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true,
    });
    console.log('[BROWSER] Clicked task 13:', clickTask13.result.value);
    await wait(1500);

    // Screenshot after click
    const screenshot2 = await client.send('Page.captureScreenshot', { format: 'png' });
    const img2Path = path.resolve(process.cwd(), 'public/assets/aistudio/test_task13_screen.png');
    fs.writeFileSync(img2Path, Buffer.from(screenshot2.data, 'base64'));
    console.log('[CDP] Saved task 13 screen screenshot to:', img2Path);

    client.close();
  } finally {
    chrome.kill();
    console.log('[BROWSER] Chrome process terminated.');
  }
}

run().catch((err) => {
  console.error('[BROWSER ERROR]', err);
  process.exit(1);
});
