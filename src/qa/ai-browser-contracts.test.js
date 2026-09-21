'use strict';
// Browser component tests for the real config + transport. All remote traffic
// is intercepted; these are not production-provider or whole-Hub layout tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { chromium } = require('playwright');
const configSource = fs.readFileSync(path.join(__dirname, '../../content/docs/javascripts/ai-config.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(__dirname, '../../content/docs/javascripts/ai-client.js'), 'utf8');
const complete = 'data: {"choices":[{"delta":{"content":"근거 확인"}}]}\n\ndata: [DONE]\n\n';

test('AI browser contracts with intercepted fetch', async t => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.HUB_CHROMIUM_EXECUTABLE ? { executablePath: process.env.HUB_CHROMIUM_EXECUTABLE } : {}) });
  t.after(() => browser.close());
  async function pageFor(st, config, reply) {
    const page = await browser.newPage();
    st.after(() => page.close());
    const requests = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    st.after(() => assert.deepEqual(errors, []));
    await page.route('**/*', async route => {
      const request = route.request();
      requests.push(request.url());
      if (request.url() !== 'https://ai.test.invalid/v1/chat/completions') return route.abort();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
        'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'content-type,authorization' } });
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: complete,
        headers: { 'Access-Control-Allow-Origin': '*' }, ...reply });
    });
    await page.setContent('<!doctype html><html lang="ko"><body><main>문서 원문</main></body></html>');
    await page.addScriptTag({ content: `window.PUBLIC_AI_CONFIG = ${JSON.stringify(config)};` });
    await page.addScriptTag({ content: configSource });
    await page.addScriptTag({ content: clientSource });
    return { page, requests };
  }
  for (const config of [{}, { apiBaseUrl: 'https://ai.test.invalid/v1' }, { enabled: false, apiBaseUrl: 'https://ai.test.invalid/v1' }]) {
    await t.test(`disabled config makes zero requests: ${JSON.stringify(config)}`, async st => {
      const { page, requests } = await pageFor(st, config);
      assert.equal(await page.evaluate(() => window.aiClient), null);
      assert.equal(await page.locator('main').innerText(), '문서 원문');
      assert.deepEqual(requests, []);
    });
  }
  const enabled = { enabled: true, apiBaseUrl: 'https://ai.test.invalid/v1' };
  await t.test('enabled transport works through native browser fetch and streams', async st => {
    const { page } = await pageFor(st, enabled);
    const state = await page.evaluate(async () => {
      const completed = [], errors = [];
      const result = await window.aiClient.sendMessage([{ role: 'user', content: '질문' }], () => {}, value => completed.push(value), value => errors.push(value));
      return { result, completed, errors, released: window.aiClient.abortController === null };
    });
    assert.equal(state.result.status, 'completed'); assert.deepEqual(state.completed, ['근거 확인']);
    assert.deepEqual(state.errors, []); assert.equal(state.released, true);
  });
  await t.test('wrong content type is rejected in the browser', async st => {
    const { page } = await pageFor(st, enabled, { contentType: 'application/json', body: '{}' });
    const result = await page.evaluate(() => window.aiClient.sendMessage([{ role: 'user', content: '질문' }]));
    assert.equal(result.code, 'INVALID_CONTENT_TYPE');
  });
  await t.test('closing a request during retrieval prevents generation', async st => {
    const { page, requests } = await pageFor(st, enabled);
    const result = await page.evaluate(async () => {
      window.aiClient.queryLocalDocs = () => new Promise(() => {});
      const pending = window.aiClient.sendMessage([{ role: 'user', content: '질문' }]);
      window.aiClient.abort(); return pending;
    });
    assert.equal(result.status, 'cancelled'); assert.deepEqual(requests, []);
  });
});
