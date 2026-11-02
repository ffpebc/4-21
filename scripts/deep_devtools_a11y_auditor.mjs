import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJsonWithRetry(url, retries = 15, delay = 500) {
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

async function runDeepAudit() {
  console.log('[A11Y-DEVTOOLS AUDIT] Launching Google Chrome headless on port 9240...');
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9240',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--window-size=430,932',
  ]);

  try {
    const targets = await getJsonWithRetry('http://127.0.0.1:9240/json');
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    const consoleErrors = [];
    const nativeIssues = [];

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');
    await client.send('Audits.enable').catch(() => {});

    client.ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
          consoleErrors.push(data.params.args.map((a) => a.value || a.description).join(' '));
        }
        if (data.method === 'Audits.issueAdded') {
          nativeIssues.push(data.params.issue);
        }
      } catch {}
    });

    console.log('[A11Y-DEVTOOLS] Navigating to http://127.0.0.1:3000/ ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:3000/' });
    await wait(3500);

    // 1. Global Page Checks
    const globalChecks = await client.send('Runtime.evaluate', {
      expression: `(() => ({
        lang: document.documentElement.lang || 'MISSING',
        title: document.title || 'MISSING',
        viewport: document.querySelector('meta[name="viewport"]')?.content || 'MISSING',
        userScalableNo: (document.querySelector('meta[name="viewport"]')?.content || '').includes('user-scalable=no')
      }))()`,
      returnByValue: true,
    });
    console.log('[CHECK 1 - Global Page]:', JSON.stringify(globalChecks.result.value, null, 2));

    // 2. Orphaned Form Inputs
    const orphanedInputs = await client.send('Runtime.evaluate', {
      expression: `(() => {
        return Array.from(document.querySelectorAll('input, select, textarea'))
          .filter(i => {
            const hasId = i.id && document.querySelector(\`label[for="\${i.id}"]\`);
            const hasAria = i.getAttribute('aria-label') || i.getAttribute('aria-labelledby');
            return !hasId && !hasAria && !i.closest('label');
          })
          .map(i => ({
            tag: i.tagName,
            id: i.id,
            name: i.name,
            placeholder: i.placeholder,
            className: i.className.slice(0, 50)
          }));
      })()`,
      returnByValue: true,
    });
    console.log('[CHECK 2 - Orphaned Inputs]:', JSON.stringify(orphanedInputs.result.value, null, 2));

    // 3. Unnamed Interactive Elements (Buttons & Links without text or aria-label)
    const unnamedInteractive = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const interactive = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"]'));
        const unnamed = [];
        for (const el of interactive) {
          const visibleText = (el.innerText || '').trim();
          const ariaLabel = (el.getAttribute('aria-label') || '').trim();
          const ariaLabelledby = (el.getAttribute('aria-labelledby') || '').trim();
          const title = (el.getAttribute('title') || '').trim();
          const isHidden = el.offsetParent === null && !el.getClientRects().length;
          if (isHidden) continue;
          if (!visibleText && !ariaLabel && !ariaLabelledby && !title) {
            unnamed.push({
              tag: el.tagName,
              id: el.id,
              classes: el.className.slice(0, 60),
              html: el.outerHTML.slice(0, 100)
            });
          }
        }
        return unnamed;
      })()`,
      returnByValue: true,
    });
    console.log('[CHECK 3 - Unnamed Interactive Elements]:', JSON.stringify(unnamedInteractive.result.value, null, 2));

    // 4. Tap Target Sizes (< 40x40 px)
    const tapTargetIssues = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const interactive = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"]'));
        const tooSmall = [];
        for (const el of interactive) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          // Ignore decorative inline links, focus on standalone buttons/tabs
          if (rect.width < 36 || rect.height < 36) {
            tooSmall.push({
              tag: el.tagName,
              id: el.id,
              text: (el.innerText || el.getAttribute('aria-label') || '').slice(0, 25),
              w: Math.round(rect.width),
              h: Math.round(rect.height)
            });
          }
        }
        return tooSmall;
      })()`,
      returnByValue: true,
    });
    console.log('[CHECK 4 - Tap Targets < 36px]:', JSON.stringify(tapTargetIssues.result.value.slice(0, 10), null, 2));

    // 5. Headings Structure
    const headings = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const hs = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return hs.map(h => ({
          tag: h.tagName,
          text: h.innerText.slice(0, 40)
        }));
      })()`,
      returnByValue: true,
    });
    console.log('[CHECK 5 - Headings Structure]:', JSON.stringify(headings.result.value, null, 2));

    // 6. Test RuleInspectorModal accessibility and focus
    console.log('[A11Y-DEVTOOLS] Switching to Sprint tab and inspecting RuleInspectorModal...');
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('tab-btn-sprint')?.click()`,
    });
    await wait(1500);

    // Open Rule Inspector
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.getElementById('sprint-rule-btn') || document.getElementById('open-rule-inspector-btn');
        if (btn) btn.click();
      })()`,
    });
    await wait(1200);

    const modalA11y = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.getElementById('rule-inspector-modal');
        if (!modal) return { open: false };
        const role = modal.getAttribute('role');
        const ariaModal = modal.getAttribute('aria-modal');
        const ariaLabel = modal.getAttribute('aria-label');
        const closeBtn = document.getElementById('close-rule-inspector');
        const closeBtnText = closeBtn ? closeBtn.innerText.trim() : '';
        const closeBtnAria = closeBtn ? closeBtn.getAttribute('aria-label') : '';
        return {
          open: true,
          role,
          ariaModal,
          ariaLabel,
          hasCloseButton: !!closeBtn,
          closeBtnText,
          closeBtnAria
        };
      })()`,
      returnByValue: true,
    });
    console.log('[CHECK 6 - RuleInspectorModal A11y]:', JSON.stringify(modalA11y.result.value, null, 2));

    // Close modal
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('close-rule-inspector')?.click()`,
    });
    await wait(800);

    // 7. Test KIM mode accessibility
    console.log('[A11Y-DEVTOOLS] Switching to KIM tab...');
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('tab-btn-kim')?.click()`,
    });
    await wait(1500);

    const kimA11y = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const buttons = Array.from(document.querySelectorAll('button'));
        const unnamedButtons = buttons.filter(b => !b.innerText.trim() && !b.getAttribute('aria-label'));
        return {
          inputsCount: inputs.length,
          buttonsCount: buttons.length,
          unnamedButtonsCount: unnamedButtons.length
        };
      })()`,
      returnByValue: true,
    });
    console.log('[CHECK 7 - KIM Mode A11y]:', JSON.stringify(kimA11y.result.value, null, 2));

    // Check Console & Native issues
    console.log('[A11Y-DEVTOOLS SUMMARY]:');
    console.log(`- Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) console.log(consoleErrors);
    console.log(`- Native Audits Issues: ${nativeIssues.length}`);

    // Take screenshot
    const scr = await client.send('Page.captureScreenshot', { format: 'png' });
    const imgPath = path.resolve(process.cwd(), 'public/assets/aistudio/test_a11y_deep_audit.png');
    fs.writeFileSync(imgPath, Buffer.from(scr.data, 'base64'));
    console.log('[A11Y-DEVTOOLS] Saved screenshot to:', imgPath);

    client.close();
  } finally {
    chrome.kill();
    console.log('[A11Y-DEVTOOLS] Audit finished and browser closed.');
  }
}

runDeepAudit().catch((err) => {
  console.error('[A11Y-DEVTOOLS ERROR]', err);
  process.exit(1);
});
