'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../../content/docs/javascripts/ai-client.js'), 'utf8');
const delta = text => JSON.stringify({ choices: [{ index: 0, delta: { content: text } }] });
const sse = (text = 'OK') => `data: ${delta(text)}\n\ndata: [DONE]\n\n`;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
function response(text, { type = 'text/event-stream', width, open = false, status = 200, headers = {} } = {}) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({ start(controller) {
    const step = width || Math.max(bytes.length, 1);
    for (let i = 0; i < bytes.length; i += step) controller.enqueue(bytes.slice(i, i + step));
    if (!open) controller.close();
  } }), { status, headers: { 'Content-Type': type, ...headers } });
}
function env(fetchImpl = async () => response(sse()), overrides = {}) {
  const events = [], calls = [], timers = new Set();
  const config = { enabled: true, apiBaseUrl: 'https://audit.invalid/v1', apiToken: '', modelName: 'fixture',
    chatbot: { systemPrompt: 'fixture' }, search: { localDocsEnabled: true, maxResults: 5, contextMaxChars: 2600 },
    openNotebook: { enabled: false, apiUrl: 'https://kb.audit.invalid', maxResults: 5, contextMaxChars: 3000 }, ...overrides };
  const window = { AI_CONFIG: config, dispatchEvent: e => events.push({ type: e.type, ...e.detail }) };
  const context = { window, URL, AbortController, TextDecoder, CustomEvent: class { constructor(type, { detail }) { this.type = type; this.detail = detail; } },
    fetch: (...args) => { calls.push(args); return fetchImpl(...args); },
    setTimeout(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; },
    clearTimeout(id) { timers.delete(id); clearTimeout(id); } };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { client: window.aiClient, config, window, context, events, calls, timers,
    explicitClient: () => vm.runInContext('new AIClient()', context) };
}
function send(client, question = 'fixture', options) {
  const observed = { chunks: [], completed: [], errors: [], details: [] };
  const promise = client.sendMessage([{ role: 'user', content: question }],
    (chunk, full) => observed.chunks.push({ chunk, full }), full => observed.completed.push(full),
    (message, detail) => { observed.errors.push(message); observed.details.push(detail); }, options);
  return { observed, promise };
}
async function checked(environment, run) {
  const result = await run.promise;
  assert.equal(environment.timers.size, 0, 'all request timers released');
  assert.equal(environment.client?.abortController, null);
  assert.equal(environment.client?.currentRequest, null);
  assert.ok(run.observed.completed.length <= 1);
  assert.ok(run.observed.errors.length <= 1);
  assert.ok(!(run.observed.completed.length && run.observed.errors.length));
  return result;
}

// IDs retain the audit's twelve original contract scenarios.
test('T01 normal LF SSE completes once', async () => {
  const e = env(), r = send(e.client); const result = await checked(e, r);
  assert.equal(result.status, 'completed'); assert.deepEqual(r.observed.completed, ['OK']);
});
test('T02 Korean UTF-8 across individual bytes is lossless', async () => {
  const e = env(async () => response(sse('한글 문맥 🌐'), { width: 1 })), r = send(e.client);
  await checked(e, r); assert.deepEqual(r.observed.completed, ['한글 문맥 🌐']);
});
test('T03 data field without optional space', async () => {
  const e = env(async () => response(sse().replaceAll('data: ', 'data:'))), r = send(e.client);
  await checked(e, r); assert.deepEqual(r.observed.completed, ['OK']);
});
test('T04 multiple data lines make one JSON event', async () => {
  const e = env(async () => response('data: {"choices":\ndata: [{"delta":{"content":"OK"}}]}\n\ndata: [DONE]\n\n')), r = send(e.client);
  await checked(e, r); assert.deepEqual(r.observed.completed, ['OK']);
});
test('T05 CR-only and CRLF framing at every byte', async () => {
  for (const newline of ['\r', '\r\n']) {
    const e = env(async () => response(sse().replaceAll('\n', newline), { width: 1 })), r = send(e.client);
    await checked(e, r); assert.deepEqual(r.observed.completed, ['OK']);
  }
});
test('T06 early EOF is incomplete, preserving partial content', async () => {
  const e = env(async () => response(`data: ${delta('PARTIAL')}\n\n`)), r = send(e.client);
  const result = await checked(e, r);
  assert.equal(result.status, 'incomplete'); assert.equal(result.code, 'INCOMPLETE_STREAM');
  assert.equal(result.content, 'PARTIAL'); assert.equal(r.observed.completed.length, 0); assert.equal(r.observed.errors.length, 1);
});
test('T07 provider error event is not an empty success', async () => {
  const e = env(async () => response('event: error\ndata: {"error":{"message":"secret-provider-message"}}\n\n')), r = send(e.client);
  const result = await checked(e, r); assert.equal(result.code, 'UPSTREAM_ERROR');
  assert.doesNotMatch(JSON.stringify([e.events, result, r.observed]), /secret-provider-message/);
});
test('T08 HTTP 200 JSON cannot masquerade as SSE', async () => {
  const e = env(async () => response('{"choices":[{"message":{"content":"OK"}}]}', { type: 'application/json' })), r = send(e.client);
  assert.equal((await checked(e, r)).code, 'INVALID_CONTENT_TYPE');
});
test('T09 superseded retrieval never starts old generation with new signal', async () => {
  const aGate = deferred(), bGate = deferred(), e = env();
  e.client.queryLocalDocs = q => q === 'A' ? aGate.promise : bGate.promise;
  const a = send(e.client, 'A'), signalA = e.client.abortController.signal;
  const b = send(e.client, 'B'), signalB = e.client.abortController.signal;
  assert.equal((await a.promise).status, 'cancelled'); // Does not wait for A's adapter.
  bGate.resolve(null); await checked(e, b); aGate.resolve(null); await tick();
  assert.equal(signalA.aborted, true); assert.equal(e.calls.length, 1);
  assert.equal(JSON.parse(e.calls[0][1].body).messages.at(-1).content, 'B');
  assert.equal(e.calls[0][1].signal, signalB); assert.equal(a.observed.completed.length, 0);
});
test('T10 abort during pending retrieval resolves cancellation immediately', async () => {
  const gate = deferred(), e = env(); e.client.queryLocalDocs = () => gate.promise;
  const r = send(e.client); e.client.abort();
  assert.equal((await checked(e, r)).status, 'cancelled');
  gate.resolve(null); await tick(); assert.equal(e.calls.length, 0); assert.equal(r.observed.errors.length, 0);
});
test('T11 Notebook receives user cancellation', async () => {
  const gate = deferred(); let signal;
  const e = env(async (url, options) => { signal = options.signal; return gate.promise; });
  e.config.openNotebook.enabled = true;
  const r = send(e.client); await tick(); assert.ok(signal); e.client.abort();
  assert.equal(signal.aborted, true); assert.equal((await checked(e, r)).status, 'cancelled');
  gate.resolve(new Response('{"results":[]}')); assert.equal(e.calls.length, 1);
});
test('T12 terminal DONE cancels and releases an open reader', async () => {
  const body = response(sse(), { open: true }), e = env(async () => body), r = send(e.client);
  await checked(e, r); assert.equal(body.body.locked, false);
});

for (const [name, text, code] of [
  ['malformed JSON', 'data: {broken}\n\n', 'INVALID_EVENT'],
  ['error payload without event name', 'data: {"error":{"message":"private"}}\n\n', 'UPSTREAM_ERROR'],
  ['missing choices', 'data: {"data":"fake"}\n\n', 'INVALID_EVENT'],
  ['wrong content schema', 'data: {"choices":[{"delta":{"content":{}}}]}\n\n', 'INVALID_EVENT'],
  ['null choice', 'data: {"choices":[null]}\n\n', 'INVALID_EVENT'],
  ['empty success', 'data: [DONE]\n\n', 'EMPTY_RESPONSE'],
  ['unterminated DONE', `data: ${delta('partial')}\n\ndata: [DONE]`, 'INCOMPLETE_STREAM'],
  ['finish without DONE', `data: ${delta('partial')}\n\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n`, 'INCOMPLETE_STREAM'],
  ['tool call', 'data: {"choices":[{"delta":{"tool_calls":[]}}]}\n\n', 'UNSUPPORTED_TOOL_CALL'],
  ['overlong event', 'data: ' + 'x'.repeat(262145), 'EVENT_TOO_LARGE'],
]) test(name, async () => {
  const body = response(text), e = env(async () => body), r = send(e.client);
  assert.equal((await checked(e, r)).code, code); assert.equal(r.observed.completed.length, 0);
  assert.equal(body.body.locked, false);
});
for (const reason of ['length', 'content_filter', 'tool_calls', 'unknown']) test(`finish_reason ${reason} is not success`, async () => {
  const e = env(async () => response(`data: ${delta('partial')}\n\ndata: {"choices":[{"delta":{},"finish_reason":"${reason}"}]}\n\ndata: [DONE]\n\n`)), r = send(e.client);
  const result = await checked(e, r); assert.equal(result.status, 'incomplete'); assert.equal(result.content, 'partial');
});
test('BOM, comments, unknown fields, role and usage frames are supported', async () => {
  const text = '\uFEFF: keepalive\r\nid: 7\r\nretry: 1000\r\nevent: message\r\ndata: {"choices":[{"index":0,"delta":{"role":"assistant"}}]}\r\n\r\n' +
    `data: ${delta('OK')}\n\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: {"choices":[],"usage":{"total_tokens":3}}\n\ndata: [DONE]\n\n`;
  const e = env(async () => response(text, { width: 1 })), r = send(e.client); await checked(e, r);
  assert.deepEqual(r.observed.completed, ['OK']); assert.equal(e.calls.length, 1);
});
test('valid frames survive many network chunk boundaries', async () => {
  const text = sse('한글 abc 😀');
  for (let width = 1; width <= 32; width++) {
    const e = env(async () => response(text, { width })), r = send(e.client); await checked(e, r);
    assert.deepEqual(r.observed.completed, ['한글 abc 😀']);
  }
});
test('abort during streaming suppresses completion and releases lock', async () => {
  const body = response(`data: ${delta('partial')}\n\n`, { open: true }), e = env(async () => body), r = send(e.client);
  await tick(); e.client.abort(); const result = await checked(e, r);
  assert.equal(result.status, 'cancelled'); assert.equal(result.content, 'partial');
  assert.equal(r.observed.completed.length, 0); assert.equal(r.observed.errors.length, 0); assert.equal(body.body.locked, false);
});
test('caller AbortSignal propagates and pre-aborted calls send nothing', async () => {
  const external = new AbortController(); external.abort(); const e = env(), r = send(e.client, 'q', { signal: external.signal });
  assert.equal((await checked(e, r)).status, 'cancelled'); assert.equal(e.calls.length, 0);
});
test('request deadline also covers an adapter that never settles', async () => {
  const e = env(undefined, { transport: { requestTimeoutMs: 15 } });
  e.client.queryLocalDocs = () => new Promise(() => {});
  const r = send(e.client); assert.equal((await checked(e, r)).code, 'REQUEST_TIMEOUT'); assert.equal(e.calls.length, 0);
});
test('idle timeout preserves partial answer and releases reader', async () => {
  const body = response(`data: ${delta('partial')}\n\n`, { open: true });
  const e = env(async () => body, { transport: { idleTimeoutMs: 15 } }), r = send(e.client);
  const result = await checked(e, r); assert.equal(result.code, 'IDLE_TIMEOUT');
  assert.equal(result.content, 'partial'); assert.equal(body.body.locked, false);
});
test('HTTP errors retain only safe status and retry metadata and never retry', async () => {
  const e = env(async () => response('provider-private-key', { status: 429, headers: { 'Retry-After': '7' } })), r = send(e.client);
  const result = await checked(e, r); assert.equal(result.httpStatus, 429); assert.equal(result.retryAfter, '7');
  assert.equal(e.calls.length, 1); assert.doesNotMatch(JSON.stringify([e.events, result]), /provider-private-key/);
});
test('disabled AI has no public client and direct calls fail closed', async () => {
  const e = env(undefined, { enabled: false }); assert.equal(e.client, null);
  const client = e.explicitClient(), r = send(client);
  assert.equal((await r.promise).code, 'AI_DISABLED');
  assert.equal(await client.checkConnection(), false); assert.equal(e.calls.length, 0); assert.equal(e.timers.size, 0);
});
test('endpoint alone does not enable AI', async () => {
  const e = env(undefined, { enabled: undefined }); assert.equal(e.client, null);
  assert.equal((await send(e.explicitClient()).promise).code, 'AI_DISABLED'); assert.equal(e.calls.length, 0);
});
for (const endpoint of ['', 'http://localhost:8090', 'https://user:secret@example.test/v1', 'https://example.test/v1?key=secret',
  'https://example.test/v1?', 'https://example.test/v1#', 'https://example.test:0/v1', 'https://example.test\\evil', 'not a URL']) {
  test(`invalid endpoint rejected before retrieval: ${endpoint.replace('secret', 'redacted')}`, async () => {
    const e = env(undefined, { apiBaseUrl: endpoint }), r = send(e.client);
    assert.equal((await checked(e, r)).code, 'INVALID_CONFIG'); assert.equal(e.calls.length, 0);
  });
}
test('request headers, explicit query and message snapshots remain separate', async () => {
  const gate = deferred(), e = env(undefined, { apiToken: 'public-fixture' }); let query;
  e.client.queryLocalDocs = q => { query = q; return gate.promise; };
  const messages = [{ role: 'user', content: 'question with context' }];
  const pending = e.client.sendMessage(messages, undefined, undefined, undefined, { query: 'question only' });
  messages[0].content = 'mutated'; gate.resolve({ contextText: 'source instructions', results: [] });
  await pending; const options = e.calls[0][1], payload = JSON.parse(options.body);
  assert.equal(query, 'question only'); assert.equal(payload.messages.at(-1).content, 'question with context');
  assert.equal(payload.messages[1].role, 'user'); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
  assert.equal(options.headers.Authorization, 'Bearer public-fixture');
  assert.doesNotMatch(JSON.stringify(e.events), /public-fixture|source instructions|question with context/);
});
test('completion callback may start another request without old cleanup cancelling it', async () => {
  const e = env(); let second;
  const first = await e.client.sendMessage([{ role: 'user', content: 'A' }], undefined, () => { second = send(e.client, 'B'); });
  assert.equal(first.status, 'completed'); assert.equal((await second.promise).status, 'completed'); assert.equal(e.calls.length, 2);
});
test('callback failures do not become false successful completions', async () => {
  const e = env(); let completed = 0, errors = 0;
  const result = await e.client.sendMessage([{ role: 'user', content: 'q' }], () => { throw Error('consumer-private'); }, () => completed++, () => errors++);
  assert.equal(result.status, 'failed'); assert.equal(completed, 0); assert.equal(errors, 1); assert.equal(e.timers.size, 0);
});
test('checkConnection has a deadline and no automatic retries', async () => {
  const e = env(() => new Promise(() => {}), { transport: { connectionTimeoutMs: 15 } });
  assert.equal(await e.client.checkConnection(), false); assert.equal(e.calls.length, 1); assert.equal(e.timers.size, 0);
});
test('unknown transport exception is redacted from callbacks and events', async () => {
  const e = env(async () => { throw Error('secret-token in URL'); }), r = send(e.client);
  const result = await checked(e, r); assert.equal(result.code, 'TRANSPORT_ERROR');
  assert.doesNotMatch(JSON.stringify([result, e.events, r.observed]), /secret-token/);
});

test('external cancellation reason cannot forge successful terminal metadata', async () => {
  const signal = new AbortController(); signal.abort({ status: 'completed', code: 'OK', message: 'private-reason' });
  const e = env(), r = send(e.client, 'q', { signal: signal.signal });
  const result = await checked(e, r); assert.equal(result.status, 'cancelled'); assert.equal(result.code, 'CANCELLED');
  assert.equal(r.observed.completed.length, 0); assert.doesNotMatch(JSON.stringify(result), /private-reason/);
});
test('thrown objects cannot forge a successful terminal state', async () => {
  const e = env(async () => { throw { status: 'completed', code: 'OK', message: 'private-error' }; }), r = send(e.client);
  const result = await checked(e, r); assert.equal(result.status, 'failed'); assert.equal(result.code, 'TRANSPORT_ERROR');
  assert.equal(r.observed.completed.length, 0); assert.doesNotMatch(JSON.stringify(result), /private-error/);
});
