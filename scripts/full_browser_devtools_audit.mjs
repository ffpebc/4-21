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

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function runAudit() {
  console.log('[BROWSER DEVTOOLS] Starting Chrome headless session on port 9235...');
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9235',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--window-size=430,932',
  ]);

  try {
    const targets = await getJsonWithRetry('http://127.0.0.1:9235/json');
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    const consoleMessages = [];
    const pageErrors = [];

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');
    await client.send('Network.enable');

    client.ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.method === 'Runtime.consoleAPICalled') {
          consoleMessages.push(data.params);
          if (data.params.type === 'error') {
            console.error('[DEVTOOLS CONSOLE ERROR]', ...data.params.args.map((a) => a.value || a.description));
          }
        }
        if (data.method === 'Runtime.exceptionThrown') {
          pageErrors.push(data.params.exceptionDetails);
          console.error('[DEVTOOLS EXCEPTION]', data.params.exceptionDetails.text);
        }
      } catch {}
    });

    console.log('[CDP] Navigating to http://127.0.0.1:3000/ ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:3000/' });
    await wait(3000);

    // 1. Accessibility & Tap Targets Audit
    const a11yMetrics = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, input, [role="button"]'));
        const smallTargets = [];
        for (const b of buttons) {
          const rect = b.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < 32 || rect.height < 32) {
              smallTargets.push({
                text: (b.innerText || b.getAttribute('aria-label') || '').slice(0, 30),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
              });
            }
          }
        }
        const hasAriaLabels = buttons.filter(b => b.hasAttribute('aria-label')).length;
        return {
          totalInteractive: buttons.length,
          smallTargetsCount: smallTargets.length,
          buttonsWithAria: hasAriaLabels
        };
      })()`,
      returnByValue: true,
    });
    console.log('[DEVTOOLS A11Y]', JSON.stringify(a11yMetrics.result.value, null, 2));

    // Switch to Sprint tab
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const sprintTab = document.getElementById('tab-btn-sprint');
        if (sprintTab) sprintTab.click();
      })()`,
    });
    await wait(1200);

    // 2. Audit tasks across categories in Sprint: Task 4 (Speech), Task 13 (НЕ/НИ), Task 14 (Orthography/Splits), Task 15 (Orthography/NN), Task 16 (Punctuation)
    const tasksToTest = ['4', '13', '14', '15', '16'];
    const auditResults = {};

    for (const tid of tasksToTest) {
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
      const modalInfo = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const sheet = document.getElementById('rule-inspector-modal');
          if (!sheet) return null;
          const ruleHeadingEl = Array.from(sheet.querySelectorAll('span')).find(s => s.innerText && s.innerText.includes('ФИПИ:'));
          const ruleHeading = ruleHeadingEl ? ruleHeadingEl.innerText.trim() : '';
          const topic = sheet.querySelector('.text-\\\\[11\\\\.5px\\\\]')?.innerText || '';
          const word = sheet.querySelector('.text-\\\\[20px\\\\]')?.innerText || '';
          const steps = Array.from(sheet.querySelectorAll('.flex-1')).map(s => s.innerText.trim()).filter(Boolean);
          const allText = sheet.innerText;

          const placeholders = [
            'либо полное причастие',
            'наречие или производный предлог',
            'устойчивое сочетание / производный предлог',
            'undefined',
            'null',
            '[object Object]',
            'ДРУГДРУГУ',
            'КВЕЧЕРУ'
          ];
          const foundPlaceholders = placeholders.filter(p => allText.includes(p));

          return {
            ruleHeading,
            topic,
            word,
            stepsCount: steps.length,
            foundPlaceholders,
            textLength: allText.length,
            snippet: allText.slice(0, 200).replace(/\\n/g, ' ')
          };
        })()`,
        returnByValue: true,
      });

      auditResults[tid] = modalInfo.result.value;

      // Close modal
      await client.send('Runtime.evaluate', {
        expression: `(() => {
          const closeBtn = document.getElementById('close-rule-inspector');
          if (closeBtn) closeBtn.click();
        })()`,
      });
      await wait(600);
    }

    console.log('[DEVTOOLS AUDIT RESULTS]:', JSON.stringify(auditResults, null, 2));

    // Capture overall screenshot
    const scr = await client.send('Page.captureScreenshot', { format: 'png' });
    const imgPath = path.resolve(process.cwd(), 'public/assets/aistudio/test_devtools_full_audit.png');
    fs.writeFileSync(imgPath, Buffer.from(scr.data, 'base64'));
    console.log('[CDP] Saved full audit screenshot to:', imgPath);

    // Check errors
    console.log(`[DEVTOOLS SUMMARY] Exceptions: ${pageErrors.length}, Console errors: ${consoleMessages.filter(m => m.type === 'error').length}`);

    client.close();
  } finally {
    chrome.kill();
    console.log('[BROWSER] Chrome session terminated.');
  }
}

runAudit().catch((err) => {
  console.error('[BROWSER ERROR]', err);
  process.exit(1);
});
