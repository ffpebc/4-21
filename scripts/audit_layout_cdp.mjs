import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJsonWithRetry(url, retries = 15, delay = 400) {
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
    this.ws.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      if (parsed.id && this.callbacks.has(parsed.id)) {
        const { resolve, reject } = this.callbacks.get(parsed.id);
        this.callbacks.delete(parsed.id);
        if (parsed.error) reject(parsed.error);
        else resolve(parsed.result);
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

async function audit() {
  console.log('[AUDIT] Starting vite preview on port 4173...');
  const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173'], {
    stdio: 'pipe',
  });

  preview.stdout.on('data', (d) => console.log('[Vite Preview]', d.toString().trim()));
  preview.stderr.on('data', (d) => console.error('[Vite Preview Error]', d.toString().trim()));

  // Wait until port 4173 responds
  for (let i = 0; i < 20; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:4173/', (res) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error('Status ' + res.statusCode));
        });
        req.on('error', reject);
      });
      console.log('[AUDIT] Vite preview is ready.');
      break;
    } catch {
      await wait(300);
    }
  }

  console.log('[AUDIT] Launching Chrome CDP (headless)...');
  const chrome = spawn('/usr/bin/google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9225',
    '--remote-debugging-address=127.0.0.1',
    '--window-size=393,852',
  ]);

  await wait(1500);

  try {
    const version = await getJsonWithRetry('http://127.0.0.1:9225/json/version');
    console.log('[AUDIT] Connected to Chrome:', version.Browser);

    const targets = await getJsonWithRetry('http://127.0.0.1:9225/json/list');
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.ready();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      mobile: true,
    });

    // Test 1: Task 12 Active Workout
    console.log('[AUDIT] Navigating to http://127.0.0.1:4173/?task=12 ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/?task=12' });
    await wait(2000);

    const auditData = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const root = document.getElementById('root');
        const scroll = document.getElementById('app-scroll-container');
        const tabbar = document.querySelector('.ios-tabbar');
        const card = document.getElementById('session-question-card');
        const allText = document.body.innerText;

        const toObj = (r) => r ? ({ top: r.top, bottom: r.bottom, height: r.height, width: r.width }) : null;

        return {
          windowInnerHeight: window.innerHeight,
          rootRect: toObj(root ? root.getBoundingClientRect() : null),
          scrollRect: toObj(scroll ? scroll.getBoundingClientRect() : null),
          tabbarRect: toObj(tabbar ? tabbar.getBoundingClientRect() : null),
          cardRect: toObj(card ? card.getBoundingClientRect() : null),
          hasDoubleParens: allText.includes('((') || allText.includes('))'),
          hasSpoilerRule: allText.includes('От глаголов I спряжения') || allText.includes('союзы тоже'),
          allTextSnippet: allText.slice(0, 300),
        };
      })()`,
      returnByValue: true,
    });

    console.log('[AUDIT DATA]', JSON.stringify(auditData.result.value, null, 2));

    const shot1 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync('.cache', { recursive: true });
    fs.writeFileSync('.cache/cdp_task12_verified.png', Buffer.from(shot1.data, 'base64'));
    console.log('[AUDIT] Saved .cache/cdp_task12_verified.png');

    // Test 2: UxPlay window dimensions (479 x 1024)
    console.log('[AUDIT] Testing UxPlay aspect ratio (479 x 1024)...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 479,
      height: 1024,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await wait(1000);

    const uxData = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const toObj = (r) => r ? ({ top: r.top, bottom: r.bottom, height: r.height, width: r.width }) : null;
        const tabbar = document.querySelector('.ios-tabbar');
        const root = document.getElementById('root');
        return {
          windowInnerHeight: window.innerHeight,
          tabbarRect: toObj(tabbar ? tabbar.getBoundingClientRect() : null),
          rootRect: toObj(root ? root.getBoundingClientRect() : null),
        };
      })()`,
      returnByValue: true,
    });
    console.log('[UXPLAY AUDIT DATA]', JSON.stringify(uxData.result.value, null, 2));

    const shot2 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('.cache/cdp_uxplay_1024_verified.png', Buffer.from(shot2.data, 'base64'));
    console.log('[AUDIT] Saved .cache/cdp_uxplay_1024_verified.png');

    client.close();
  } finally {
    chrome.kill();
    preview.kill();
  }
}

audit().catch((e) => {
  console.error(e);
  process.exit(1);
});
