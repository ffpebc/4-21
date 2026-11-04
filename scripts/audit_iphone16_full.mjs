import { spawn } from 'node:child_process';
import http from 'node:http';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJsonWithRetry(url, retries = 20, delay = 350) {
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
    this.consoleLogs = [];
    this.errors = [];
    this.ws.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      if (parsed.id && this.callbacks.has(parsed.id)) {
        const { resolve, reject } = this.callbacks.get(parsed.id);
        this.callbacks.delete(parsed.id);
        if (parsed.error) reject(parsed.error);
        else resolve(parsed.result);
      } else {
        if (parsed.method === 'Runtime.consoleAPICalled') {
          this.consoleLogs.push(parsed.params);
          if (parsed.params.type === 'error') {
            this.errors.push(parsed.params);
          }
        } else if (parsed.method === 'Runtime.exceptionThrown') {
          this.errors.push(parsed.params);
        }
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
    const callId = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(callId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: callId, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  close() {
    this.ws.close();
  }
}

const serializeRectHelper = `
  function serializeRect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }
`;

async function run() {
  console.log('===============================================================');
  console.log('  IPHONE 16 DEEP SYSTEM AUDIT (393 x 852, iOS 18 Safari)');
  console.log('===============================================================');

  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9230',
    '--remote-debugging-address=127.0.0.1',
    '--window-size=393,852',
  ]);

  await wait(1200);

  try {
    const version = await getJsonWithRetry('http://127.0.0.1:9230/json/version');
    console.log('[BROWSER] Chrome started:', version.Browser);

    const targets = await getJsonWithRetry('http://127.0.0.1:9230/json/list');
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    // Emulate iPhone 16 device metrics (393 x 852, 3x Retina)
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      mobile: true,
      hasTouch: true,
    });

    // Emulate iPhone 16 User Agent
    await client.send('Emulation.setUserAgentOverride', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });

    console.log('[NAV] Navigating to http://127.0.0.1:3000/ ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:3000/' });
    await wait(2200);

    const issues = [];

    // --- PHASE 1: BUILDER VIEW AUDIT ON IPHONE 16 ---
    console.log('\n--- PHASE 1: BUILDER VIEW AUDIT ---');
    const phase1 = await client.eval(`(() => {
      ${serializeRectHelper}
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const hasOverflow = docW > winW;
      const tabbar = document.querySelector('.ios-tabbar');
      const tabbarRect = serializeRect(tabbar);
      const startBtn = document.getElementById('start-workout-btn');
      const segmented = document.getElementById('workout-mode-segmented');
      const segmentedText = segmented ? segmented.innerText : '';
      const kimBtn = document.getElementById('quick-start-kim-btn');
      const presetsBtn = document.getElementById('open-presets-modal-btn');
      const scrollContainer = document.getElementById('app-scroll-container');

      // Scroll container all the way down
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
      const startBtnScrolledRect = serializeRect(startBtn);

      return {
        docW,
        winW,
        winH,
        hasOverflow,
        tabbarRect,
        startBtnScrolledRect,
        segmentedText,
        hasKimBtn: Boolean(kimBtn),
        hasPresetsBtn: Boolean(presetsBtn),
        startBtnAboveTabbar: startBtnScrolledRect && tabbarRect ? startBtnScrolledRect.bottom <= tabbarRect.top + 8 : false,
      };
    })()`);

    console.log(`  Document Width: ${phase1.docW}px (Viewport: ${phase1.winW}px) -> Overflow: ${phase1.hasOverflow ? 'YES (BUG)' : 'NO (OK)'}`);
    console.log(`  Workout Mode Segmented: "${phase1.segmentedText.replace(/\n/g, ' | ')}"`);
    console.log(`  Start button scrolled bottom: ${phase1.startBtnScrolledRect?.bottom}px vs TabBar top: ${phase1.tabbarRect?.top}px`);
    console.log(`  Start CTA comfortably visible above tabbar: ${phase1.startBtnAboveTabbar}`);

    if (phase1.hasOverflow) issues.push(`Horizontal overflow on Builder view (${phase1.docW} > ${phase1.winW})`);
    if (!phase1.startBtnAboveTabbar) issues.push(`Start button overlaps or is below TabBar when scrolled`);

    // Reset scroll to top
    await client.eval(`(() => {
      const scrollContainer = document.getElementById('app-scroll-container');
      if (scrollContainer) scrollContainer.scrollTop = 0;
    })()`);
    await wait(300);

    // --- PHASE 2: MODAL WINDOWS (PRESETS, APPEARANCE, SYNC) ---
    console.log('\n--- PHASE 2: MODAL WINDOWS AUDIT ---');
    // 2A: Presets Modal
    await client.eval(`(() => { document.getElementById('open-presets-modal-btn')?.click(); })()`);
    await wait(600);
    const presetsCheck = await client.eval(`(() => {
      ${serializeRectHelper}
      const modal = document.getElementById('presets-modal');
      const isOpen = modal ? modal.classList.contains('open') : false;
      const title = modal ? modal.querySelector('h3')?.innerText : '';
      const closeBtn = document.getElementById('close-presets-modal') || modal?.querySelector('button[aria-label*="акрыть"]') || modal?.querySelector('button');
      const closeBtnRect = serializeRect(closeBtn);
      return { isOpen, title, closeBtnVisible: closeBtnRect ? closeBtnRect.bottom <= window.innerHeight : false };
    })()`);
    console.log(`  Presets Modal: Open=${presetsCheck.isOpen}, Title="${presetsCheck.title}", CloseBtnVisible=${presetsCheck.closeBtnVisible}`);
    if (!presetsCheck.isOpen) issues.push('Presets modal failed to open');
    await client.eval(`(() => { (document.getElementById('close-presets-modal') || document.querySelector('#presets-modal button[aria-label*="акрыть"]') || document.querySelector('#presets-modal .ios-sheet-backdrop'))?.click(); })()`);
    await wait(500);

    // 2B: Appearance Modal
    await client.eval(`(() => { document.getElementById('nav-appearance-btn')?.click(); })()`);
    await wait(600);
    const appearanceCheck = await client.eval(`(() => {
      ${serializeRectHelper}
      const modal = document.getElementById('appearance-modal');
      const isOpen = modal ? modal.classList.contains('open') : false;
      const title = modal ? modal.querySelector('h3')?.innerText : '';
      const closeBtn = document.getElementById('close-appearance-modal') || modal?.querySelector('button[aria-label*="акрыть"]');
      const closeBtnRect = serializeRect(closeBtn);
      return { isOpen, title, closeBtnVisible: closeBtnRect ? closeBtnRect.bottom <= window.innerHeight : false };
    })()`);
    console.log(`  Appearance Modal: Open=${appearanceCheck.isOpen}, Title="${appearanceCheck.title}", CloseBtnVisible=${appearanceCheck.closeBtnVisible}`);
    if (!appearanceCheck.isOpen) issues.push('Appearance modal failed to open');
    await client.eval(`(() => { (document.getElementById('close-appearance-modal') || document.querySelector('#appearance-modal button[aria-label*="акрыть"]'))?.click(); })()`);
    await wait(500);

    // 2C: Sync Modal
    await client.eval(`(() => { document.getElementById('nav-sync-btn')?.click(); })()`);
    await wait(600);
    const syncCheck = await client.eval(`(() => {
      ${serializeRectHelper}
      const modal = document.getElementById('sync-modal');
      const isOpen = modal ? modal.classList.contains('open') : false;
      const title = modal ? modal.querySelector('h3')?.innerText : '';
      const closeBtn = document.getElementById('close-sync-modal') || modal?.querySelector('button[aria-label*="акрыть"]');
      const closeBtnRect = serializeRect(closeBtn);
      return { isOpen, title, closeBtnVisible: closeBtnRect ? closeBtnRect.bottom <= window.innerHeight : false };
    })()`);
    console.log(`  Sync Modal: Open=${syncCheck.isOpen}, Title="${syncCheck.title}", CloseBtnVisible=${syncCheck.closeBtnVisible}`);
    if (!syncCheck.isOpen) issues.push('Sync modal failed to open');
    await client.eval(`(() => { (document.getElementById('close-sync-modal') || document.querySelector('#sync-modal button[aria-label*="акрыть"]'))?.click(); })()`);
    await wait(500);

    // --- PHASE 3: ACTIVE FIPI WORKOUT & QUESTION FLOW ---
    console.log('\n--- PHASE 3: ACTIVE FIPI WORKOUT & QUESTION FLOW ---');
    await client.eval(`(() => {
      document.getElementById('start-workout-btn')?.click();
    })()`);
    await wait(800);

    const workoutActiveCheck = await client.eval(`(() => {
      ${serializeRectHelper}
      const activeView = document.getElementById('workout-active-view');
      const submitBtn = document.getElementById('submit-fipi-btn');
      const taskMeta = document.querySelector('.ios-inset-group .font-extrabold')?.innerText || '';
      const tabbar = document.querySelector('.ios-tabbar');
      const activeRect = serializeRect(activeView);
      const submitRect = serializeRect(submitBtn);
      const tabbarRect = serializeRect(tabbar);

      return {
        hasActiveView: Boolean(activeView),
        taskMeta,
        activeRect,
        submitRect,
        tabbarRect,
        submitAboveTabbar: submitRect && tabbarRect ? submitRect.bottom <= tabbarRect.top + 8 : false,
      };
    })()`);

    console.log(`  Active Question: ${workoutActiveCheck.taskMeta}`);
    console.log(`  Submit CTA bottom: ${workoutActiveCheck.submitRect?.bottom}px vs TabBar top: ${workoutActiveCheck.tabbarRect?.top}px`);
    console.log(`  Submit button positioned comfortably: ${workoutActiveCheck.submitAboveTabbar}`);

    if (!workoutActiveCheck.hasActiveView) issues.push('Active workout view failed to load');
    if (!workoutActiveCheck.submitAboveTabbar) issues.push('Submit CTA overlaps or is obscured by tabbar in active workout');

    // 3B: Open and inspect Rule Inspector Modal
    console.log('  Testing Rule Inspector modal inside active workout...');
    await client.eval(`(() => { document.getElementById('open-rule-inspector-btn')?.click(); })()`);
    await wait(600);

    const ruleInspectCheck = await client.eval(`(() => {
      ${serializeRectHelper}
      const modal = document.getElementById('rule-inspector-modal');
      const isOpen = modal ? modal.classList.contains('open') : false;
      const title = modal ? modal.querySelector('h3')?.innerText : '';
      const topic = modal ? modal.querySelector('h3 + span')?.innerText : '';
      const closeBtn = document.getElementById('close-rule-inspector');
      const closeBtnRect = serializeRect(closeBtn);
      return {
        isOpen,
        title,
        topic,
        closeBtnVisible: closeBtnRect ? closeBtnRect.bottom <= window.innerHeight && closeBtnRect.top >= 0 : false,
      };
    })()`);

    console.log(`  Rule Inspector: Open=${ruleInspectCheck.isOpen}, Title="${ruleInspectCheck.title}", Topic="${ruleInspectCheck.topic}", CloseBtnVisible=${ruleInspectCheck.closeBtnVisible}`);
    if (!ruleInspectCheck.isOpen) issues.push('Rule inspector modal failed to open from active workout');
    if (!ruleInspectCheck.closeBtnVisible) issues.push('Rule inspector close button is not visible on iPhone 16 screen');

    await client.eval(`(() => { document.getElementById('close-rule-inspector')?.click(); })()`);
    await wait(650);

    // 3C: Answering the Question (Row clicks / pill / input -> Submit -> Next)
    console.log('  Solving Question based on active task kind...');
    const solveKind = await client.eval(`(() => {
      // 1. If row buttons:
      const rowBtns = document.querySelectorAll('button[id^="fipi-row-"]');
      if (rowBtns.length > 0) {
        rowBtns[0].click();
        if (rowBtns.length > 1) rowBtns[1].click();
        return 'row_choice';
      }
      // 2. If quick choice pill:
      const pillBtn = document.querySelector('button[key*="pill-"]');
      if (pillBtn) {
        pillBtn.click();
        return 'pill_choice';
      }
      // 3. If word input:
      const input = document.querySelector('input[type="text"]');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, 'ОТВЕТ');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return 'word_input';
      }
      return 'none';
    })()`);
    console.log(`  Applied answer using strategy: ${solveKind}`);
    await wait(500);

    const canSubmitState = await client.eval(`(() => {
      const btn = document.getElementById('submit-fipi-btn');
      return { disabled: btn ? btn.disabled : true, text: btn ? btn.textContent.trim() : '' };
    })()`);
    console.log(`  Submit Button State: disabled=${canSubmitState.disabled}, text="${canSubmitState.text}"`);

    // Click submit
    await client.eval(`(() => {
      const btn = document.getElementById('submit-fipi-btn');
      if (btn) btn.click();
    })()`);
    await wait(600);

    const checkFeedback = await client.eval(`(() => {
      const banner = document.querySelector('#session-question-card .rounded-2xl') || document.querySelector('#session-question-card [style*="var(--ios-green)"], #session-question-card [style*="var(--ios-red)"]');
      const nextBtn = document.getElementById('next-fipi-btn');
      return {
        hasFeedbackBanner: Boolean(banner),
        bannerText: banner ? banner.innerText : '',
        hasNextBtn: Boolean(nextBtn),
      };
    })()`);
    console.log(`  Feedback Banner: "${checkFeedback.bannerText.replace(/\n/g, ' ')}", HasNextBtn=${checkFeedback.hasNextBtn}`);
    if (!checkFeedback.hasNextBtn) issues.push('Next question button ("Следующее задание →") did not appear after answer submission');

    // Click next-fipi-btn to commit the answer
    await client.eval(`(() => {
      document.getElementById('next-fipi-btn')?.click();
    })()`);
    await wait(600);

    // 3D: Finish workout and inspect Summary View
    console.log('  Finishing workout to inspect Post-Session Summary...');
    await client.eval(`(() => { document.getElementById('abort-workout-btn')?.click(); })()`);
    await wait(800);

    const summaryCheck = await client.eval(`(() => {
      ${serializeRectHelper}
      const summaryView = document.getElementById('workout-summary-view');
      const headline = document.getElementById('summary-headline')?.innerText || '';
      const percent = document.getElementById('summary-percent-badge')?.innerText || '';
      const builderBtn = document.getElementById('back-to-builder-btn');
      const tabbar = document.querySelector('.ios-tabbar');
      const builderRect = serializeRect(builderBtn);
      const tabbarRect = serializeRect(tabbar);

      return {
        hasSummary: Boolean(summaryView),
        headline,
        percent,
        builderRect,
        tabbarRect,
        actionsAboveTabbar: builderRect && tabbarRect ? builderRect.bottom <= tabbarRect.top + 8 : false,
      };
    })()`);

    console.log(`  Summary View: Found=${summaryCheck.hasSummary}, Headline="${summaryCheck.headline}", Percent="${summaryCheck.percent}"`);
    console.log(`  Summary CTAs bottom: ${summaryCheck.builderRect?.bottom}px vs TabBar top: ${summaryCheck.tabbarRect?.top}px (Above TabBar: ${summaryCheck.actionsAboveTabbar})`);

    if (!summaryCheck.hasSummary) issues.push('Post-session summary view failed to appear after workout completion');
    if (!summaryCheck.actionsAboveTabbar) issues.push('Summary action buttons overlap or are obscured by floating tabbar');

    // Return to builder
    await client.eval(`(() => { document.getElementById('back-to-builder-btn')?.click(); })()`);
    await wait(600);

    // --- PHASE 4: AUDIT SPRINT TAB ON IPHONE 16 ---
    console.log('\n--- PHASE 4: SPRINT TAB AUDIT ---');
    await client.eval(`(() => { document.getElementById('tab-btn-sprint')?.click(); })()`);
    await wait(600);

    const sprintCheck = await client.eval(`(() => {
      ${serializeRectHelper}
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const choiceBtns = document.querySelectorAll('button[id^="sprint-option-"]');
      const correctVal = document.getElementById('live-correct-val')?.innerText || '';
      const wrongVal = document.getElementById('live-wrong-val')?.innerText || '';
      const card = document.getElementById('quick-sprint-host');
      const cardRect = serializeRect(card);
      const tabbar = document.querySelector('.ios-tabbar');
      const tabbarRect = serializeRect(tabbar);

      return {
        docW,
        winW,
        hasOverflow: docW > winW,
        choiceCount: choiceBtns.length,
        correctVal,
        wrongVal,
        cardRect,
        tabbarRect,
        cardAboveTabbar: cardRect && tabbarRect ? cardRect.bottom <= tabbarRect.top + 12 : false,
      };
    })()`);

    console.log(`  Sprint Screen: DocW=${sprintCheck.docW}px, Choices=${sprintCheck.choiceCount}, CardBottom=${sprintCheck.cardRect?.bottom}px vs TabBarTop=${sprintCheck.tabbarRect?.top}px`);
    console.log(`  Sprint card comfortably above tabbar: ${sprintCheck.cardAboveTabbar}`);
    if (sprintCheck.hasOverflow) issues.push(`Horizontal overflow on Sprint tab (${sprintCheck.docW} > ${sprintCheck.winW})`);
    if (!sprintCheck.cardAboveTabbar) issues.push('Sprint question card overlaps or touches tabbar on iPhone 16');

    // Test answering in Sprint
    await client.eval(`(() => {
      const btn = document.querySelector('button[id^="sprint-option-"]');
      if (btn) btn.click();
    })()`);
    await wait(600);

    // --- PHASE 5: AUDIT LAB 4-22 TAB & COMPLEX QUESTION LAYOUTS ---
    console.log('\n--- PHASE 5: LAB 4–22 TAB & COMPLEX QUESTION LAYOUTS ---');
    await client.eval(`(() => { document.getElementById('tab-btn-lab')?.click(); })()`);
    await wait(600);

    // Switch to КИМ 4–22 sub-mode
    await client.eval(`(() => {
      const kimSegBtn = Array.from(document.querySelectorAll('#lab-mode-segmented button, [role="tab"]')).find(b => b.textContent.includes('КИМ'));
      if (kimSegBtn) kimSegBtn.click();
    })()`);
    await wait(600);

    const labCheck = await client.eval(`(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const taskTabs = document.querySelectorAll('button.kim-task-tab');
      return { docW, winW, hasOverflow: docW > winW, taskCount: taskTabs.length };
    })()`);
    console.log(`  Lab KIM 4–22 Loaded: TaskTabsCount=${labCheck.taskCount}, Overflow: ${labCheck.hasOverflow ? 'YES (BUG)' : 'NO (OK)'}`);
    if (labCheck.hasOverflow) issues.push(`Horizontal overflow on Lab tab (${labCheck.docW} > ${labCheck.winW})`);

    // Test Task 8 (Matching Grid - 5 letters A-D against 9 sentences) on iPhone 16 width
    console.log('  Testing Task 8 (Matching Grid) on iPhone 16 width (393px)...');
    await client.eval(`(() => {
      const tab8 = Array.from(document.querySelectorAll('button.kim-task-tab')).find(b => b.textContent.includes('№ 8') && !b.textContent.includes('№ 18'));
      if (tab8) tab8.click();
    })()`);
    await wait(600);

    const task8Check = await client.eval(`(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const hasOverflow = docW > winW;
      const matchSlots = document.querySelectorAll('.grid button, [id^="match-col-"]');
      return { docW, winW, hasOverflow, matchSlotsCount: matchSlots.length };
    })()`);
    console.log(`  Task 8 Matching Grid: DocWidth=${task8Check.docW}px -> Overflow: ${task8Check.hasOverflow ? 'YES (BUG)' : 'NO (OK)'}`);
    if (task8Check.hasOverflow) issues.push(`Horizontal overflow on Task 8 matching grid (${task8Check.docW} > ${task8Check.winW})`);

    // Test Task 15 (Numbered Gaps in sentence) on iPhone 16 width
    console.log('  Testing Task 15 (Numbered Gaps) on iPhone 16 width (393px)...');
    await client.eval(`(() => {
      const tab15 = Array.from(document.querySelectorAll('button.kim-task-tab')).find(b => b.textContent.includes('№ 15'));
      if (tab15) tab15.click();
    })()`);
    await wait(600);

    const task15Check = await client.eval(`(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const hasOverflow = docW > winW;
      return { docW, winW, hasOverflow };
    })()`);
    console.log(`  Task 15 Numbered Gaps: DocWidth=${task15Check.docW}px -> Overflow: ${task15Check.hasOverflow ? 'YES (BUG)' : 'NO (OK)'}`);
    if (task15Check.hasOverflow) issues.push(`Horizontal overflow on Task 15 numbered gaps (${task15Check.docW} > ${task15Check.winW})`);

    // Test Task 22 (Macrotext fragment matching) on iPhone 16 width
    console.log('  Testing Task 22 (Macrotext Fragment Matching) on iPhone 16 width (393px)...');
    await client.eval(`(() => {
      const tab22 = Array.from(document.querySelectorAll('button.kim-task-tab')).find(b => b.textContent.includes('№ 22'));
      if (tab22) tab22.click();
    })()`);
    await wait(600);

    const task22Check = await client.eval(`(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const hasOverflow = docW > winW;
      return { docW, winW, hasOverflow };
    })()`);
    console.log(`  Task 22 Macrotext: DocWidth=${task22Check.docW}px -> Overflow: ${task22Check.hasOverflow ? 'YES (BUG)' : 'NO (OK)'}`);
    if (task22Check.hasOverflow) issues.push(`Horizontal overflow on Task 22 (${task22Check.docW} > ${task22Check.winW})`);

    // --- PHASE 6: AUDIT ERRORS BANK TAB ON IPHONE 16 ---
    console.log('\n--- PHASE 6: ERRORS BANK TAB ---');
    await client.eval(`(() => { document.getElementById('tab-btn-errors')?.click(); })()`);
    await wait(600);

    const errorsCheck = await client.eval(`(() => {
      ${serializeRectHelper}
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const trapBtn = document.getElementById('train-fipi-traps-btn');
      const tabbar = document.querySelector('.ios-tabbar');
      const trapRect = serializeRect(trapBtn);
      const tabbarRect = serializeRect(tabbar);
      return {
        docW,
        winW,
        hasOverflow: docW > winW,
        trapBtnFound: Boolean(trapBtn),
        trapRect,
        tabbarRect,
        aboveTabbar: trapRect && tabbarRect ? trapRect.bottom <= tabbarRect.top + 8 : false,
      };
    })()`);
    console.log(`  Errors Tab: DocW=${errorsCheck.docW}px, TrapBtnFound=${errorsCheck.trapBtnFound}, TrapBtnAboveTabbar=${errorsCheck.aboveTabbar}`);
    if (errorsCheck.hasOverflow) issues.push(`Horizontal overflow on Errors tab (${errorsCheck.docW} > ${errorsCheck.winW})`);
    if (!errorsCheck.aboveTabbar && errorsCheck.trapBtnFound) {
      issues.push(`"Тренировать ловушки ФИПИ" button overlaps tabbar on Errors screen`);
    }

    // --- PHASE 7: AUDIT STATS TAB ON IPHONE 16 ---
    console.log('\n--- PHASE 7: STATS TAB & CLOUD BACKUP ---');
    await client.eval(`(() => { document.getElementById('tab-btn-stats')?.click(); })()`);
    await wait(600);

    const statsCheck = await client.eval(`(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const subSegments = document.querySelectorAll('.ios-segmented button, [role="tab"]');
      return { docW, winW, hasOverflow: docW > winW, segmentsCount: subSegments.length };
    })()`);
    console.log(`  Stats Tab: DocW=${statsCheck.docW}px -> Overflow: ${statsCheck.hasOverflow ? 'YES (BUG)' : 'NO (OK)'}`);
    if (statsCheck.hasOverflow) issues.push(`Horizontal overflow on Stats tab (${statsCheck.docW} > ${statsCheck.winW})`);

    // Switch back to Workout tab
    await client.eval(`(() => { document.getElementById('tab-btn-workout')?.click(); })()`);
    await wait(500);

    // --- PHASE 8: CONSOLE ERRORS & UNHANDLED EXCEPTIONS ---
    console.log('\n--- PHASE 8: CONSOLE LOGS & RUNTIME EXCEPTIONS ---');
    console.log(`  Total Console Errors: ${client.errors.length}`);
    for (const err of client.errors) {
      console.error('  [Error]', JSON.stringify(err));
      issues.push(`Console error: ${JSON.stringify(err)}`);
    }

    console.log('\n===============================================================');
    console.log(`  IPHONE 16 AUDIT COMPLETE: ${issues.length === 0 ? 'ALL CHECKS PASSED PERFECTLY' : `${issues.length} ISSUES FOUND`}`);
    console.log('===============================================================');
    if (issues.length > 0) {
      console.log('Issues found:');
      issues.forEach((iss, i) => console.log(`  ${i + 1}. ${iss}`));
    }

    client.close();
    chrome.kill();
    process.exit(issues.length === 0 ? 0 : 1);
  } catch (err) {
    console.error('Fatal audit error:', err);
    chrome.kill();
    process.exit(1);
  }
}

run();
