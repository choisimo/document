// Build MkDocs and sync extra assets first. This suite exercises the real corpus.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const SITE = path.resolve(process.env.HUB_SITE_DIR || path.join(ROOT, 'dist/site'));

test('reference application reads the actual published corpus and preserves browser workflows', { timeout: 240000 }, async t => {
  const catalog = JSON.parse(fs.readFileSync(path.join(SITE, 'hub/catalog.json'), 'utf8'));
  const sourceDocs = fs.readdirSync(path.join(ROOT, 'content/docs'), { recursive: true })
    .filter(file => file.endsWith('.md'));
  assert.equal(catalog.docs.length, sourceDocs.length);
  assert.equal(new Set(catalog.docs.map(doc => doc.source)).size, sourceDocs.length);
  for (const doc of catalog.docs) {
    assert.ok(sourceDocs.includes(doc.source), doc.source);
    assert.ok(fs.existsSync(path.join(SITE, doc.contentUrl)), doc.contentUrl);
    const content = JSON.parse(fs.readFileSync(path.join(SITE, doc.contentUrl), 'utf8'));
    assert.equal(content.id, doc.id);
    assert.ok(content.html.length > 0, doc.source);
  }
  assert.ok(catalog.stacks.length > 8, 'real Compose collection replaces the eight fixture stacks');
  const document = catalog.docs.find(doc => doc.source === 'compiler/parsing/ll-parser.md');
  assert.ok(document);
  const artifacts = process.env.HUB_QA_OUTPUT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'document-hub-qa-'));
  fs.mkdirSync(artifacts, { recursive: true });
  t.diagnostic(`Browser evidence: ${artifacts}`);
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.png': 'image/png' };
  const server = http.createServer((request, response) => {
    try {
      let route = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (route.startsWith('/mounted/')) route = route.slice('/mounted'.length);
      const filename = path.resolve(SITE, '.' + route + (route.endsWith('/') ? 'index.html' : ''));
      if (!filename.startsWith(SITE + path.sep) || !fs.statSync(filename).isFile()) throw new Error('Not found');
      response.setHeader('Content-Type', mime[path.extname(filename)] || 'application/octet-stream');
      response.end(fs.readFileSync(filename));
    } catch { response.writeHead(404).end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });

  async function setup(st, options = {}) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
    st.after(() => context.close());
    // This is local navigation QA. Remote CDN/AI services are outside this test.
    await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    st.after(() => assert.deepEqual(errors, [], 'no uncaught application errors'));
    return { context, page };
  }

  await t.test('home matches reference geometry, responsive layout and keyboard command search', async st => {
    const { page } = await setup(st);
    await page.goto(base);
    await page.locator('#home-title').waitFor();
    assert.match(await page.locator('#home-title').innerText(), /필요한 지식,[\s\S]*한 걸음 더 가까이/);
    assert.equal(await page.locator('.start-path').count(), 2);
    assert.equal(await page.locator('.md-header, .md-sidebar, .md-tabs').count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'legacy fallback content must not leak below the reference home');
    assert.match(await page.locator('.home-colophon').innerText(), new RegExp(`${catalog.docs.length} DOCUMENTS`));
    const searchBounds = await page.locator('#home-search-form').boundingBox();
    assert.ok(Math.abs(searchBounds.x - 232) < 2, 'reference home left gutter at 1440px');
    assert.ok(Math.abs(searchBounds.width - 780) < 2, 'reference home search width');
    assert.ok(Math.abs(searchBounds.height - 70) < 2, 'reference home search height');
    for (const width of [1440, 760, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForFunction(expected => Math.round(document.querySelector('#topbar').getBoundingClientRect().height) === expected, width <= 760 ? 66 : 78);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `no overflow at ${width}px`);
      const height = await page.locator('#topbar').evaluate(el => el.getBoundingClientRect().height);
      assert.equal(Math.round(height), width <= 760 ? 66 : 78);
      await page.screenshot({ path: path.join(artifacts, `home-${width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.keyboard.press('ControlOrMeta+k');
    await page.locator('#command-dialog[open]').waitFor();
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'INPUT');
    await page.keyboard.type('Docker');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#command-dialog[open]').count(), 0);
    await page.locator('#home-search').fill('Docker');
    await page.locator('#home-search').press('Enter');
    await page.locator('.result-row').first().waitFor();
    assert.match(page.url(), /#\/search\?q=Docker/);
    await page.locator('#results-search').fill('no-document-zzzz-123456789');
    await page.locator('#results-search').press('Enter');
    await page.waitForFunction(() => document.querySelector('#search-results')?.textContent.includes('없'));
    assert.equal(await page.locator('.result-row').count(), 0);
  });

  await t.test('catalog, actual reader content, source links, bookmarks and workspace share a document', async st => {
    const { page } = await setup(st);
    await page.goto(base + '#/library');
    await page.locator('.directory-card').first().waitFor();
    assert.equal(await page.locator('.directory-card').count(), catalog.categories.length);
    await page.goto(base + '#/library?all=1');
    await page.waitForFunction(count => document.querySelectorAll('.compact-doc').length === count, catalog.docs.length);
    await page.evaluate(() => { window.__hubNavigationCanary = 'same-document'; });
    await page.locator('#library-search').fill(document.title);
    await page.locator(`a[href="#/doc/${document.id}"]`).first().waitFor();
    await page.locator(`a[href="#/doc/${document.id}"]`).first().click();
    await page.locator('.article pre').first().waitFor();
    assert.equal(await page.evaluate(() => window.__hubNavigationCanary), 'same-document');
    assert.match(await page.locator('.article').innerText(), /LL/);
    assert.doesNotMatch(await page.locator('.article').innerText(), /디자인 검토용 예시|프리뷰 예시 문서/);
    await page.locator('.reader-toolbar [data-action="bookmark"]').click();
    await page.goto(base + '#/saved');
    await page.locator(`a[href="#/doc/${document.id}"]`).waitFor();
    await page.locator(`a[href="#/doc/${document.id}"]`).click();
    await page.locator('.article pre').first().waitFor();
    await page.locator('[data-action="reader-tools"]').click();
    await page.locator('[data-action="split-doc"]').click();
    await page.locator('.doc-pane .pane-scroll pre').first().waitFor();
    assert.match(await page.locator('.workspace-page').innerText(), /LL/);
    const stored = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])));
    for (const [key, value] of Object.entries(stored)) {
      if (key.includes('bookmark')) continue;
      assert.ok(!value.includes(document.id) && !value.includes(document.source), `${key} must not persist reading history`);
    }
    await page.screenshot({ path: path.join(artifacts, 'workspace-desktop.png'), fullPage: true });
    await page.reload();
    await page.locator('.doc-pane .pane-scroll pre').first().waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(artifacts, 'workspace-mobile.png'), fullPage: true });
  });

  await t.test('direct document URLs, legacy fragments and a URL prefix remain readable', async st => {
    const { page } = await setup(st);
    const anchor = document.toc.find(item => item.id)?.id;
    for (const prefix of ['', 'mounted/']) {
      await page.goto(base + prefix + document.url + (anchor ? '#' + encodeURIComponent(anchor) : ''));
      await page.locator('.article pre').first().waitFor();
      assert.match(await page.locator('.article').innerText(), /LL/);
      if (anchor) assert.ok(await page.locator('.article').evaluate((el, id) => !!el.querySelector(`[id="${CSS.escape(id)}"]`), anchor));
      await page.screenshot({ path: path.join(artifacts, prefix ? 'reader-prefix.png' : 'reader-desktop.png'), fullPage: true });
    }
  });

  await t.test('bookmarks beyond the preview corpus size survive reload', async st => {
    const { page } = await setup(st);
    await page.goto(base + '#/library?all=1');
    const buttons = page.locator('.compact-doc [data-action="bookmark"]');
    await buttons.first().waitFor();
    for (let index = 0; index < 35; index++) await buttons.nth(index).click();
    await page.goto(base + '#/saved');
    await page.waitForFunction(() => document.querySelectorAll('.compact-doc').length === 35);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.compact-doc').length === 35);
    await page.locator('.compact-doc [data-action="bookmark"]').first().click();
    assert.equal(await page.locator('.compact-doc').count(), 34);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.compact-doc').length === 34);
  });

  await t.test('document requests recover from failure and late responses cannot replace another document', async st => {
    const { context, page } = await setup(st);
    const pattern = '**/hub/content/' + document.id + '.json';
    const fail = route => route.abort('failed');
    await context.route(pattern, fail);
    await page.goto(base + document.url);
    await page.locator('[data-action="document-retry"]').waitFor();
    await context.unroute(pattern, fail);
    await page.locator('[data-action="document-retry"]').click();
    await page.locator('.article pre').first().waitFor();

    // Use a fresh page so a real pending request is not satisfied by the cache.
    await page.close();
    const pendingPage = await context.newPage();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    st.after(() => release());
    await context.route(pattern, async route => { await gate; await route.continue(); });
    const received = pendingPage.waitForResponse(response => response.url().includes('/hub/content/' + document.id + '.json'));
    await pendingPage.goto(base + document.url);
    await pendingPage.locator('.article-header h1').waitFor();
    const next = catalog.docs.find(doc => doc.source === 'security/ssh/configuration.md');
    await pendingPage.evaluate(id => { location.hash = '#/doc/' + id; }, next.id);
    await pendingPage.locator(`.hub-document-body[data-document-id="${next.id}"]`).first().waitFor();
    release();
    await (await received).finished();
    await pendingPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await pendingPage.locator('.hub-document-body').getAttribute('data-document-id'), next.id);
    assert.equal(await pendingPage.locator('.article-header h1').innerText(), next.title);
  });

  await t.test('body-only search terms are found after an index failure and retry without losing the query', async st => {
    const { context, page } = await setup(st);
    const metadata = [document.title, document.description, document.topic, ...document.tags].join(' ').toLowerCase();
    const body = JSON.parse(fs.readFileSync(path.join(SITE, document.contentUrl), 'utf8'));
    const term = body.html.replace(/<[^>]*>/g, ' ').match(/[A-Za-z]{7,}/g).find(word => !metadata.includes(word.toLowerCase()));
    assert.ok(term, 'the real article contains a searchable body-only term');
    assert.ok(![document.title, document.description, document.topic, ...document.tags].join(' ').includes(term));
    const fail = route => route.abort('failed');
    await context.route('**/search/search_index.json', fail);
    await page.goto(base + '#/search?q=' + term);
    await page.locator('[data-action="search-retry"]').waitFor();
    assert.equal(await page.locator('#results-search').inputValue(), term);
    await context.unroute('**/search/search_index.json', fail);
    await page.locator('[data-action="search-retry"]').click();
    await page.locator(`.result-row[data-doc="${document.id}"]`).waitFor();
    assert.equal(await page.locator('#results-search').inputValue(), term);
  });

  await t.test('an aborted AI request preserves the question and restores keyboard focus', async st => {
    const { page } = await setup(st);
    // setup aborts requests outside the local site; no question reaches a service.
    await page.goto(base + document.url);
    await page.locator('.article pre').first().waitFor();
    await page.locator('[data-action="reader-tools"]').click();
    await page.locator('[data-action="assistant"]').click();
    const question = '문서의 입력 조건을 확인해 주세요.';
    await page.locator('#assistant-query').fill(question);
    await page.locator('#assistant-form button[type="submit"]').click();
    await page.locator('#assistant-answer[role="alert"]').waitFor();
    await page.waitForFunction(() => document.activeElement?.id === 'assistant-query');
    assert.equal(await page.locator('#assistant-query').inputValue(), question);
    assert.equal(await page.locator('#assistant-form button[type="submit"]').isEnabled(), true);
  });

  await t.test('Docker collection, settings and empty saved state use real data', async st => {
    const { page } = await setup(st);
    await page.goto(base + '#/stacks');
    await page.locator('#stack-count').waitFor();
    await page.waitForFunction(count => document.querySelector('#stack-count')?.textContent.includes(String(count)), catalog.stacks.length);
    await page.locator('a[href^="#/stack/"]').first().click();
    await page.locator('.stack-page').waitFor();
    assert.doesNotMatch(await page.locator('.stack-page').innerText(), /프리뷰 예시/);
    await page.goto(base + '#/saved');
    await page.waitForFunction(() => document.querySelector('#main')?.textContent.includes('다시 읽을 문서를'));
    for (const route of ['settings', 'settings/reading', 'settings/accessibility', 'settings/data', 'keys', 'about']) {
      await page.goto(base + '#/' + route);
      await page.locator('#main h1').waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route);
      assert.doesNotMatch(await page.locator('#main').innerText(), /데모 키 만들기|예시 데이터입니다/);
      await page.screenshot({ path: path.join(artifacts, route.replaceAll('/', '-') + '.png'), fullPage: true });
    }
  });

  await t.test('canonical article has actual readable content without JavaScript', async st => {
    const { page } = await setup(st, { javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await page.goto(base + document.url);
    assert.match(await page.locator('body').innerText(), /LL/);
    assert.ok(await page.locator('pre').count() > 0);
  });

  await t.test('catalog failures retry successfully and an unavailable app retains static reading', async st => {
    const { context, page } = await setup(st);
    const failCatalog = route => route.abort('failed');
    await context.route('**/hub/catalog.json', failCatalog);
    await page.goto(base);
    await page.locator('#catalog-retry').waitFor();
    assert.match(await page.locator('#main').innerText(), /불러오지 못/);
    await context.unroute('**/hub/catalog.json', failCatalog);
    await page.locator('#catalog-retry').click();
    await page.locator('#home-title').waitFor();
    await context.route('**/javascripts/hub-app.js', route => route.abort('failed'));
    await page.goto(base + document.url);
    await page.getByRole('button', { name: '기본 문서 보기', exact: true }).click();
    assert.match(await page.locator('#hub-source-fallback').innerText(), /LL/);
    assert.equal(await page.locator('#hub-source-fallback').isVisible(), true);
  });
});
