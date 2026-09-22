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
    const requests = [], errors = [], sent = [];
    page.on('pageerror', error => errors.push(error.message));
    st.after(() => assert.deepEqual(errors, []));
    await page.route('**/*', async route => {
      const request = route.request();
      requests.push(request.url());
      if (request.url() !== 'https://ai.test.invalid/v1/chat/completions') return route.abort();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
        'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'content-type,authorization' } });
      if (request.method() === 'POST') sent.push({
        url: request.url(), authorization: request.headers().authorization, body: request.postDataJSON()
      });
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: complete,
        headers: { 'Access-Control-Allow-Origin': '*' }, ...reply });
    });
    await page.setContent('<!doctype html><html lang="ko"><body><main>문서 원문</main></body></html>');
    await page.addScriptTag({ content: `window.PUBLIC_AI_CONFIG = ${JSON.stringify(config)};` });
    await page.addScriptTag({ content: configSource });
    await page.addScriptTag({ content: clientSource });
    return { page, requests, sent };
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
  await t.test('settings rotation cannot mix a destination with another token in native fetch', async st => {
    const { page, sent } = await pageFor(st, { ...enabled, apiToken: 'public-original', modelName: 'model-original' });
    const result = await page.evaluate(async () => {
      let release;
      window.aiClient.queryLocalDocs = () => new Promise(resolve => { release = resolve; });
      const pending = window.aiClient.sendMessage([{ role: 'user', content: '문서 질문' }]);
      window.AI_CONFIG.apiBaseUrl = 'https://different.invalid/v1';
      window.AI_CONFIG.apiToken = 'public-different';
      window.AI_CONFIG.modelName = 'model-different';
      window.AI_CONFIG.chatbot.systemPrompt = 'changed after start';
      release(null);
      return pending;
    });
    assert.equal(result.status, 'completed'); assert.equal(sent.length, 1);
    assert.equal(sent[0].authorization, 'Bearer public-original');
    assert.equal(sent[0].body.model, 'model-original');
    assert.doesNotMatch(sent[0].body.messages[0].content, /changed after start/);
  });
  await t.test('a timed-out local search still permits the bounded generation request', async st => {
    const { page, sent } = await pageFor(st, enabled);
    const state = await page.evaluate(async () => {
      let signal;
      window.AI_CONFIG.transport.retrievalTimeoutMs = 20;
      window.AI_CONFIG.transport.requestTimeoutMs = 2000;
      window.DocSearchEngine = { buildChatContext(_, options) {
        signal = options.signal; return new Promise(() => {});
      } };
      const result = await window.aiClient.sendMessage([{ role: 'user', content: '질문' }]);
      return { result, searchAborted: signal.aborted };
    });
    assert.equal(state.result.status, 'completed'); assert.equal(state.searchAborted, true);
    assert.equal(sent.length, 1);
  });
  await t.test('a browser abort listener may start a replacement without losing its controller', async st => {
    const { page, sent } = await pageFor(st, enabled);
    const state = await page.evaluate(async () => {
      let finishA, finishB, b;
      window.aiClient.queryLocalDocs = q => new Promise(resolve => { if (q === 'A') finishA = resolve; else finishB = resolve; });
      const a = window.aiClient.sendMessage([{ role: 'user', content: 'A' }]);
      window.aiClient.abortController.signal.addEventListener('abort', () => {
        b = window.aiClient.sendMessage([{ role: 'user', content: 'B' }]);
      }, { once: true });
      window.aiClient.abort();
      const ownsB = window.aiClient.abortController !== null;
      finishB(null);
      const results = await Promise.all([a, b]); finishA(null);
      return { results, ownsB, released: window.aiClient.abortController === null };
    });
    assert.equal(state.ownsB, true); assert.equal(state.released, true);
    assert.equal(state.results[0].status, 'cancelled'); assert.equal(state.results[1].status, 'completed');
    assert.equal(sent.length, 1); assert.equal(sent[0].body.messages.at(-1).content, 'B');
  });
  await t.test('oversized input never reaches a browser network request', async st => {
    const { page, requests } = await pageFor(st, enabled);
    const result = await page.evaluate(() => window.aiClient.sendMessage([{ role: 'user', content: 'x'.repeat(262145) }]));
    assert.equal(result.code, 'REQUEST_TOO_LARGE'); assert.deepEqual(requests, []);
  });
  await t.test('a completed stream ignores buffered noise without changing terminal status', async st => {
    const { page } = await pageFor(st, enabled, { body: complete + 'after-terminal'.repeat(25000) });
    const result = await page.evaluate(() => window.aiClient.sendMessage([{ role: 'user', content: '질문' }]));
    assert.equal(result.status, 'completed'); assert.equal(result.content, '근거 확인');
  });
  await t.test('request status does not disclose the question or public fixture token', async st => {
    const { page } = await pageFor(st, { ...enabled, apiToken: 'public-fixture-canary' });
    const events = await page.evaluate(async () => {
      const events = [];
      for (const name of ['ai-request-status', 'ai-chatbot-retrieval-status']) {
        window.addEventListener(name, event => events.push(event.detail));
      }
      await window.aiClient.sendMessage([{ role: 'user', content: 'question-privacy-canary' }]);
      return events;
    });
    assert.ok(events.some(event => event.status === 'completed'));
    assert.doesNotMatch(JSON.stringify(events), /question-privacy-canary|public-fixture-canary/);
  });
  await t.test('incomplete browser stream preserves a partial answer without success callback', async st => {
    const { page } = await pageFor(st, enabled, { body: 'data: {"choices":[{"delta":{"content":"부분 답변"}}]}\n\n' });
    const state = await page.evaluate(async () => {
      let successes = 0, failures = 0;
      const result = await window.aiClient.sendMessage([{ role: 'user', content: '질문' }], undefined,
        () => successes++, () => failures++);
      return { result, successes, failures };
    });
    assert.equal(state.result.status, 'incomplete'); assert.equal(state.result.content, '부분 답변');
    assert.equal(state.successes, 0); assert.equal(state.failures, 1);
  });

});
