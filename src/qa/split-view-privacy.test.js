const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test } = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const KEYS = { legacy: 'splitview-state', layout: 'splitview-layout', session: 'splitview-session' };
const pane = (page, id = 1) => page.locator(`[data-session-id="session-${id}"]`);

test('Split View privacy and restoration in Chromium', { timeout: 90000 }, async (t) => {
  const requests = [];
  const pending = new Map();
  const html = (body, scripts = '') => `<!doctype html><html><head><meta charset="utf-8"><title>Fixture - Documentation Hub</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/split-view.css"></head><body><article>${body}</article>${scripts}</body></html>`;
  const searchResult = (query) => JSON.stringify({ results: [{ title: 'Private fixture A', location: query === 'slow-document' ? '/slow-document/' : '/one/', excerpt: 'A local test document' }] });
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    requests.push(url.pathname + url.search);
    if (url.pathname === '/split-view.js' || url.pathname === '/split-view.css') {
      const isJs = url.pathname.endsWith('.js');
      response.setHeader('Content-Type', isJs ? 'application/javascript' : 'text/css');
      response.end(fs.readFileSync(path.join(ROOT, `content/docs/${isJs ? 'javascripts' : 'stylesheets'}/split-view.${isJs ? 'js' : 'css'}`)));
    } else if (url.pathname === '/search/search_index.json') {
      response.setHeader('Content-Type', 'application/json');
      response.end('{"docs":[]}');
    } else if (url.pathname === '/fixture-search') {
      response.setHeader('Content-Type', 'application/json');
      const query = url.searchParams.get('q');
      if (query === 'slow-search') pending.set(query, () => response.end(searchResult(query)));
      else response.end(searchResult(query));
    } else if (url.pathname === '/slow-document/') {
      pending.set('slow-document', () => response.end(html('<h1>Late private document</h1>')));
    } else if (url.pathname === '/one/') {
      response.end(html('<h1>Private fixture A</h1><a href="../two/">Next document</a><a href="https://example.invalid/" target="_blank">External</a>'));
    } else if (url.pathname === '/two/') {
      response.end(html('<h1>Private fixture B</h1>'));
    } else {
      response.end(html('<h1>Fixture home</h1><a href="/" target="_blank" rel="noopener">New tab</a>', `<script>
        window.DocSearchEngine = { search: async (query) => (await fetch('/fixture-search?q=' + encodeURIComponent(query))).json() };
        </script><script src="/split-view.js"></script>`));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    for (const finish of pending.values()) finish();
    await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });

  async function setup(testContext, options = {}, init) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
    testContext.after(() => context.close());
    if (init) await context.addInitScript(init);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    testContext.after(() => assert.deepEqual(errors, [], 'no uncaught browser errors'));
    await page.goto(base);
    await page.waitForFunction(() => Boolean(window._splitViewInstance));
    return { context, page };
  }
  async function open(page) {
    await page.locator('.split-view-toggle').click();
    await page.locator('.split-view-container.open').waitFor();
  }
  async function search(page, query, id = 1) {
    const input = pane(page, id).locator('input');
    await input.fill(query);
    await input.press('Enter');
    await pane(page, id).locator('.split-view-result-item').waitFor();
  }
  async function loadResult(page, id = 1) {
    await pane(page, id).locator('.split-view-result-item').click();
    await pane(page, id).locator('.split-view-document h1').waitFor();
  }
  async function state(page) {
    return page.evaluate(keys => ({
      legacy: localStorage.getItem(keys.legacy),
      layout: JSON.parse(localStorage.getItem(keys.layout)),
      session: JSON.parse(sessionStorage.getItem(keys.session))
    }), KEYS);
  }

  await t.test('legacy migration retains only validated layout and does not fetch old document URLs', async (st) => {
    const { page } = await setup(st);
    await page.evaluate(keys => localStorage.setItem(keys.legacy, JSON.stringify({
      layout: '1x2', paneSizes: { rows: [100], cols: [35, 65] },
      activeSession: 'session-1', sessions: [{ id: 'session-1', url: '/legacy-private/', title: 'legacy-title-canary', query: 'legacy-query-canary', history: [{ url: '/legacy-history/' }] }]
    })), KEYS);
    await page.reload();
    await open(page);
    const saved = await state(page);
    assert.equal(saved.legacy, null);
    assert.deepEqual(saved.layout, { version: 1, layout: '1x2', paneSizes: { rows: [100], cols: [35, 65] } });
    assert.equal(saved.session.sessions[0].url, null);
    assert.deepEqual(await page.evaluate(() => window._splitViewInstance.paneSizes.cols), [35, 65]);
    assert.equal(requests.some(request => request.startsWith('/legacy-')), false);
    assert.equal((await page.evaluate(() => JSON.stringify(localStorage))).includes('legacy-'), false);
  });

  await t.test('reload retains pane sizes, query, selected pane, documents and back/forward history without permanent document state', async (st) => {
    const { page } = await setup(st);
    await open(page);
    await page.locator('.split-view-layout-select').selectOption('1x2');
    await search(page, 'query-canary');
    await loadResult(page);
    assert.equal(await pane(page).locator('a[target="_blank"]').getAttribute('rel'), 'noopener noreferrer');
    await pane(page).getByText('Next document', { exact: true }).click();
    await page.waitForFunction(() => window._splitViewInstance.sessions.get('session-1').currentUrl === '/two/');
    await pane(page).locator('[data-action="back"]').click();
    await page.waitForFunction(() => window._splitViewInstance.sessions.get('session-1').currentUrl === '/one/');
    await pane(page).locator('[data-action="forward"]').click();
    await page.waitForFunction(() => window._splitViewInstance.sessions.get('session-1').currentUrl === '/two/');
    await search(page, 'restore-query-canary', 2);
    const handle = await page.locator('.split-view-resize-vertical').boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + 60);
    await page.mouse.down();
    await page.mouse.move(handle.x + 120, handle.y + 60, { steps: 5 });
    await page.mouse.up();
    const sizes = await page.evaluate(() => window._splitViewInstance.paneSizes.cols);
    assert.ok(sizes[0] > 55, 'drag changes the pane proportions');
    await page.reload(); // pagehide must flush even when the overlay was never closed.
    await open(page);
    await pane(page).locator('.split-view-document h1').waitFor();
    await pane(page, 2).locator('.split-view-result-item').waitFor();
    assert.equal(await pane(page).locator('.split-view-document h1').textContent(), 'Private fixture B');
    assert.equal(await pane(page, 2).locator('input').inputValue(), 'restore-query-canary');
    assert.equal(await pane(page, 2).getAttribute('class'), 'split-view-pane active');
    assert.equal(await pane(page).locator('[data-action="back"]').isEnabled(), true);
    assert.equal(await pane(page).locator('[data-action="forward"]').isEnabled(), false);
    assert.deepEqual(await page.evaluate(() => window._splitViewInstance.paneSizes.cols), sizes);
    const saved = await state(page);
    assert.deepEqual(Object.keys(saved.layout).sort(), ['layout', 'paneSizes', 'version']);
    assert.equal(JSON.stringify(saved.layout).includes('canary'), false);
    assert.equal(JSON.stringify(saved.layout).includes('Private fixture'), false);
    assert.equal(JSON.stringify(saved.layout).includes('/one/'), false);
    assert.equal(saved.session.sessions[0].history.length, 2);
    assert.equal(page.url(), base + '/', 'internal links do not navigate the outer page');
    await page.keyboard.press('Control+ArrowLeft');
    await page.keyboard.press('Alt+ArrowLeft');
    await page.waitForFunction(() => window._splitViewInstance.sessions.get('session-1').currentUrl === '/one/');
    await page.keyboard.press('Alt+ArrowRight');
    await page.waitForFunction(() => window._splitViewInstance.sessions.get('session-1').currentUrl === '/two/');
    await page.keyboard.press('Control+/');
    assert.equal(await pane(page).locator('input').evaluate(input => document.activeElement === input), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.split-view-container.open').count(), 0);
    await page.keyboard.press('Control+Backslash');
    assert.equal(await page.locator('.split-view-container.open').count(), 1);
  });

  await t.test('fresh tabs share only layout; opener copies remain independent tab sessions', async (st) => {
    const { page, context } = await setup(st);
    await open(page);
    await search(page, 'tab-query-canary');
    await loadResult(page);
    await page.locator('.split-view-close').click();
    const fresh = await context.newPage();
    await fresh.goto(base);
    assert.equal((await state(fresh)).session, null);
    const popupPromise = page.waitForEvent('popup');
    await page.evaluate(() => window.open('/', '_blank'));
    const popup = await popupPromise;
    await popup.waitForFunction(() => Boolean(window._splitViewInstance));
    assert.equal((await state(popup)).session.sessions[0].query, 'tab-query-canary', 'browser copies opener sessionStorage initially');
    await open(page);
    await page.getByRole('button', { name: '이 탭의 문서·검색 기록과 저장된 배치 초기화', exact: true }).click();
    assert.equal((await state(page)).session, null);
    assert.equal((await state(popup)).session.sessions[0].query, 'tab-query-canary', 'later changes are not shared');
  });

  await t.test('malformed JSON, invalid sizes, unknown versions and untrusted restored URLs fall back safely', async (st) => {
    const { page } = await setup(st);
    await page.evaluate(keys => {
      localStorage.setItem(keys.legacy, '{broken');
      localStorage.setItem(keys.layout, JSON.stringify({ version: 1, layout: 'constructor', paneSizes: { rows: [0], cols: ['bad'] }, query: 'must-remove' }));
      sessionStorage.setItem(keys.session, JSON.stringify({ version: 1, layout: '2x2', paneSizes: { rows: [-1, 101], cols: [null, {}] }, sessions: [
        { id: { toString: {} } }, { id: 'session-1', url: 'https://example.invalid/private', history: 'bad', query: {} },
        { id: 'session-2', url: 'javascript:alert(1)', history: [{ url: 'data:text/html,bad' }], historyIndex: 'bad' }
      ] }));
    }, KEYS);
    await page.reload();
    await open(page);
    const saved = await state(page);
    assert.equal(saved.legacy, null);
    assert.deepEqual(saved.layout.paneSizes, { rows: [50, 50], cols: [50, 50] });
    assert.ok(saved.session.sessions.every(session => session.url === null && session.history.length === 0));
    assert.equal(JSON.stringify(saved.layout).includes('must-remove'), false);
    await page.reload(); // No panes have been opened, so pagehide will not replace injected corruption.
    await page.evaluate(keys => sessionStorage.setItem(keys.session, '{broken'), KEYS);
    await page.reload();
    assert.equal((await state(page)).session, null);
    await page.evaluate(keys => sessionStorage.setItem(keys.session, '{"version":999,"sessions":[]}'), KEYS);
    await page.reload();
    assert.equal((await state(page)).session, null);
    await open(page);
    assert.equal(await page.locator('.split-view-pane').count(), 4);
  });

  await t.test('storage refusal and quota failures retain a usable in-memory workspace', async (st) => {
    for (const mode of ['denied', 'quota']) {
      await st.test(mode, async (child) => {
        const { page } = await setup(child, {}, mode === 'denied' ? () => {
          for (const area of ['localStorage', 'sessionStorage']) Object.defineProperty(window, area, { get() { throw new DOMException('Blocked', 'SecurityError'); } });
        } : () => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
        await open(page);
        await search(page, 'storage-failure-query');
        await loadResult(page);
        await page.locator('.split-view-close').click();
        await open(page);
        assert.equal(await pane(page).locator('.split-view-document h1').textContent(), 'Private fixture A');
        await page.locator('[data-action="reset"]').click();
        assert.equal(await page.locator('.split-view-document').count(), 0);
      });
    }
  });

  await t.test('reset cancels debounced input and stale search/document completion without resurrecting data', async (st) => {
    const { page } = await setup(st, {}, () => {
      const originalFetch = window.fetch;
      window.fetch = (url, options) => originalFetch(url, String(url).includes('/slow-document/') ? undefined : options);
    });
    await open(page);
    await search(page, 'slow-document');
    const requested = page.waitForRequest(request => request.url().endsWith('/slow-document/'));
    await pane(page).locator('.split-view-result-item').click();
    await requested;
    await page.locator('[data-action="reset"]').click();
    pending.get('slow-document')();
    pending.delete('slow-document');
    await page.waitForFunction(() => window._splitViewInstance._fetchAbortControllers.size === 0);
    const searchRequest = page.waitForRequest(request => request.url().includes('q=slow-search'));
    await pane(page).locator('input').fill('slow-search');
    await pane(page).locator('input').press('Enter');
    await searchRequest;
    await page.locator('[data-action="reset"]').click();
    pending.get('slow-search')();
    pending.delete('slow-search');
    await pane(page).locator('input').fill('cancelled-debounce-canary');
    await page.locator('[data-action="reset"]').click();
    await page.waitForTimeout(400); // Wait past the declared 300 ms debounce to prove it was cancelled.
    assert.equal(requests.some(request => request.includes('cancelled-debounce-canary')), false);
    assert.equal(await page.locator('.split-view-document, .split-view-result-item').count(), 0);
    assert.deepEqual(await state(page), { legacy: null, layout: null, session: null });
    await page.locator('.split-view-close').click();
    await page.reload();
    assert.deepEqual(await state(page), { legacy: null, layout: null, session: null });
    await open(page);
    assert.equal(await page.locator('.split-view-document, .split-view-result-item').count(), 0);
  });

  await t.test('mobile restore gives 1x1 priority and keeps the reset control visible and keyboard operable', async (st) => {
    const { page } = await setup(st, { viewport: { width: 360, height: 740 } });
    await page.evaluate(keys => localStorage.setItem(keys.layout, JSON.stringify({ version: 1, layout: '2x2', paneSizes: { rows: [20, 80], cols: [30, 70] } })), KEYS);
    await page.reload();
    await open(page);
    assert.equal(await page.locator('.split-view-pane').count(), 1);
    assert.equal(await page.locator('.split-view-layout-select').inputValue(), '1x1');
    const reset = page.getByRole('button', { name: '이 탭의 문서·검색 기록과 저장된 배치 초기화', exact: true });
    await reset.click({ trial: true });
    const rect = await reset.boundingBox();
    assert.ok(rect.x >= 0 && rect.x + rect.width <= 360 && rect.width >= 44 && rect.height >= 44, JSON.stringify(rect));
    await reset.focus();
    await page.keyboard.press('Enter');
    assert.deepEqual(await state(page), { legacy: null, layout: null, session: null });
    assert.equal(await pane(page).locator('input').evaluate(input => document.activeElement === input), true);
  });
});
