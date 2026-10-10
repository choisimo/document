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

// Continuation regressions: each fails on the supplied PR1 implementation.
test('request configuration is an immutable snapshot across asynchronous retrieval', async () => {
  const gate = deferred();
  const e = env(undefined, { apiToken: 'token-for-original-endpoint', modelName: 'original-model' });
  e.client.queryLocalDocs = () => gate.promise;
  const r = send(e.client);
  e.config.apiBaseUrl = 'https://other.invalid/v1';
  e.config.apiToken = 'token-for-different-endpoint';
  e.config.modelName = 'new-model';
  e.config.chatbot.systemPrompt = 'changed-in-flight';
  gate.resolve(null);
  await checked(e, r);
  const [url, request] = e.calls[0];
  assert.equal(url, 'https://audit.invalid/v1/chat/completions');
  assert.equal(request.headers.Authorization, 'Bearer token-for-original-endpoint');
  const payload = JSON.parse(request.body);
  assert.equal(payload.model, 'original-model');
  assert.doesNotMatch(payload.messages[0].content, /changed-in-flight/);
});
test('optional local retrieval timeout does not consume the entire generation deadline', async () => {
  const e = env(undefined, { transport: { retrievalTimeoutMs: 10, requestTimeoutMs: 100 } });
  let signal;
  e.window.DocSearchEngine = { buildChatContext(_, options) { signal = options.signal; return new Promise(() => {}); } };
  const r = send(e.client);
  const result = await checked(e, r);
  assert.equal(result.status, 'completed');
  assert.equal(e.calls.length, 1);
  assert.equal(signal.aborted, true);
});
test('cancelled generation releases a response whose headers arrive late', async () => {
  const gate = deferred(), e = env(() => gate.promise);
  const r = send(e.client);
  await tick();
  e.client.abort();
  assert.equal((await checked(e, r)).status, 'cancelled');
  let cancelled = 0;
  gate.resolve(new Response(new ReadableStream({ cancel() { cancelled++; } }), { headers: { 'Content-Type': 'text/event-stream' } }));
  await tick();
  assert.equal(cancelled, 1);
});
test('cancelled Notebook retrieval releases a late response body', async () => {
  const gate = deferred(), e = env(() => gate.promise);
  e.config.openNotebook.enabled = true;
  const r = send(e.client); await tick(); e.client.abort();
  assert.equal((await checked(e, r)).status, 'cancelled');
  let cancelled = 0;
  gate.resolve(new Response(new ReadableStream({ cancel() { cancelled++; } }), { headers: { 'Content-Type': 'application/json' } }));
  await tick(); assert.equal(cancelled, 1);
});
test('connection check releases late headers after its deadline', async () => {
  const gate = deferred(), e = env(() => gate.promise, { transport: { connectionTimeoutMs: 10 } });
  assert.equal(await e.client.checkConnection(), false);
  let cancelled = 0;
  gate.resolve(new Response(new ReadableStream({ cancel() { cancelled++; } })));
  await tick(); assert.equal(cancelled, 1); assert.equal(e.timers.size, 0);
});
test('cancel listener starting a new request cannot erase its abort controller', async () => {
  const e = env();
  const aGate = deferred(), bGate = deferred();
  e.client.queryLocalDocs = q => q === 'A' ? aGate.promise : bGate.promise;
  const a = send(e.client, 'A');
  let b;
  e.client.abortController.signal.addEventListener('abort', () => { b = send(e.client, 'B'); }, { once: true });
  e.client.abort();
  assert.equal((await a.promise).status, 'cancelled');
  const survived = e.client.abortController !== null;
  bGate.resolve(null); await b.promise; aGate.resolve(null); await tick();
  assert.equal(survived, true);
});
test('one terminal event stops parsing buffered trailing noise', async () => {
  const e = env(async () => response(sse('finished') + 'ignored-after-terminal'.repeat(15000)));
  const r = send(e.client); const result = await checked(e, r);
  assert.equal(result.status, 'completed'); assert.deepEqual(r.observed.completed, ['finished']);
});
test('text output ceiling never includes the rejected over-limit delta', async () => {
  const validChunk = 'x'.repeat(120000);
  const text = Array.from({ length: 19 }, () => `data: ${delta(validChunk)}\n\n`).join('');
  const e = env(async () => response(text)), r = send(e.client);
  const result = await checked(e, r);
  assert.equal(result.code, 'RESPONSE_TOO_LARGE');
  assert.ok(result.content.length <= 2097152);
  assert.ok(r.observed.chunks.every(c => c.full.length <= 2097152));
});
test('Notebook refuses a non-JSON content type without contaminating the prompt', async () => {
  const e = env(async url => url.endsWith('/api/search')
    ? response('{"results":[{"content":"untrusted-wrong-mime"}]}', { type: 'text/html' })
    : response(sse()));
  e.config.openNotebook.enabled = true;
  const r = send(e.client); await checked(e, r);
  const payload = JSON.parse(e.calls.find(([url]) => url.endsWith('/chat/completions'))[1].body);
  assert.doesNotMatch(JSON.stringify(payload), /untrusted-wrong-mime/);
});
test('Notebook rejects oversized response bodies before JSON context reaches generation', async () => {
  let cancelled = 0;
  const tooLarge = JSON.stringify({ results: [{ content: 'notebook-oversize-marker' + 'x'.repeat(1048576) }] });
  const e = env(async url => url.endsWith('/api/search') ? new Response(new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode(tooLarge)); }, cancel() { cancelled++; }
  }), { headers: { 'Content-Type': 'application/json' } }) : response(sse()), { transport: { retrievalTimeoutMs: 100 } });
  e.config.openNotebook.enabled = true;
  const r = send(e.client); const result = await checked(e, r);
  assert.equal(result.status, 'completed');
  assert.equal(cancelled, 1);
  // Detect the resource leak, not merely optional-context fallback on timeout.
});
test('Notebook result-count and context limits are clamped to positive safe bounds', async () => {
  const e = env(async url => url.endsWith('/api/search')
    ? response('{"results":[{"content":"SAFE"}]}', { type: 'application/json' }) : response(sse()));
  Object.assign(e.config.openNotebook, { enabled: true, maxResults: -50, contextMaxChars: -1 });
  const r = send(e.client); await checked(e, r);
  assert.equal(JSON.parse(e.calls[0][1].body).limit, 5);
});
test('an oversized caller message fails before retrieval or generation', async () => {
  const e = env(); let retrieved = 0;
  e.client.queryLocalDocs = async () => { retrieved++; return null; };
  const r = send(e.client, 'x'.repeat(262145));
  const result = await checked(e, r);
  assert.equal(result.code, 'REQUEST_TOO_LARGE'); assert.equal(e.calls.length, 0); assert.equal(retrieved, 0);
});
test('local adapter cannot bypass the configured context character budget', async () => {
  const e = env();
  e.client.queryLocalDocs = async () => ({ contextText: 'z'.repeat(50000), results: [] });
  const r = send(e.client); await checked(e, r);
  const contextMessage = JSON.parse(e.calls[0][1].body).messages[1];
  assert.ok(contextMessage.content.length <= 2700);
});

test('Retry-After rejects arbitrary provider text instead of echoing it to callers', async () => {
  const e = env(async () => response('ignored', { status: 429, headers: { 'Retry-After': 'provider-private-credential' } }));
  const r = send(e.client), result = await checked(e, r);
  assert.equal(result.httpStatus, 429);
  assert.equal(result.retryAfter, undefined);
  assert.doesNotMatch(JSON.stringify([result, e.events, r.observed]), /provider-private-credential/);
});
test('untrusted thrown object cannot inject HTTP metadata into a redacted result', async () => {
  const e = env(async () => { throw { httpStatus: 'private-http-data', retryAfter: 'private-retry-data' }; });
  const r = send(e.client), result = await checked(e, r);
  assert.equal(result.code, 'TRANSPORT_ERROR');
  assert.equal(result.httpStatus, undefined); assert.equal(result.retryAfter, undefined);
  assert.doesNotMatch(JSON.stringify([result, r.observed]), /private-http-data|private-retry-data/);
});
test('abort removes listener even when its underlying adapter never settles', async () => {
  const e = env();
  const controller = new AbortController();
  let attached = 0;
  const signal = {
    get aborted() { return controller.signal.aborted; }, get reason() { return controller.signal.reason; },
    addEventListener(...args) { attached++; controller.signal.addEventListener(...args); },
    removeEventListener(...args) { attached--; controller.signal.removeEventListener(...args); }
  };
  const pending = e.client.wait(new Promise(() => {}), signal).catch(() => 'cancelled');
  controller.abort(); assert.equal(await pending, 'cancelled'); assert.equal(attached, 0);
});

for (const type of ['application/json; charset=utf-8', 'application/vnd.notebook+json']) {
  test(`bounded Notebook JSON accepts valid ${type} across UTF-8 chunks`, async () => {
    const body = response(JSON.stringify({ results: [{ title: '문서', content: '검증 근거 🌐', source: '/public/doc/' }] }), { type, width: 1 });
    const e = env(async url => url.endsWith('/api/search') ? body : response(sse()));
    Object.assign(e.config.openNotebook, { enabled: true, apiToken: 'public-kb-only' });
    const r = send(e.client), result = await checked(e, r);
    assert.equal(result.status, 'completed'); assert.equal(body.body.locked, false);
    assert.equal(e.calls[0][1].headers.Authorization, 'Bearer public-kb-only');
    assert.equal(e.calls[1][1].headers.Authorization, undefined);
    const payload = JSON.parse(e.calls[1][1].body);
    assert.match(payload.messages[1].content, /검증 근거 🌐/); assert.equal(payload.messages[1].role, 'user');
  });
}
test('Notebook byte budget is checked before JSON parse even with a false Content-Length', async () => {
  const large = response(JSON.stringify({ results: [{ content: 'z'.repeat(1048576) }] }), { type: 'application/json', headers: { 'Content-Length': '1' } });
  const e = env(async url => url.endsWith('/api/search') ? large : response(sse()));
  e.config.openNotebook.enabled = true;
  const r = send(e.client), result = await checked(e, r);
  assert.equal(result.status, 'completed'); assert.equal(large.body.locked, false);
  assert.equal(JSON.parse(e.calls[1][1].body).messages.length, 2);
});
test('Notebook byte limit applies to UTF-8 bytes, not JavaScript string length', async () => {
  const large = response(JSON.stringify({ results: [{ content: '한'.repeat(400000) }] }), { type: 'application/json' });
  const e = env(async url => url.endsWith('/api/search') ? large : response(sse()));
  e.config.openNotebook.enabled = true;
  const r = send(e.client); await checked(e, r);
  assert.equal(JSON.parse(e.calls[1][1].body).messages.length, 2); assert.equal(large.body.locked, false);
});
test('optional Notebook timeout releases a pending body without cancelling generation', async () => {
  let cancelled = 0;
  const body = new Response(new ReadableStream({ cancel() { cancelled++; } }), { headers: { 'Content-Type': 'application/json' } });
  const e = env(async url => url.endsWith('/api/search') ? body : response(sse()), { transport: { retrievalTimeoutMs: 10 } });
  e.config.openNotebook.enabled = true;
  const r = send(e.client); assert.equal((await checked(e, r)).status, 'completed');
  assert.equal(cancelled, 1); assert.equal(body.body.locked, false);
});
test('context truncation preserves surrogate pairs', async () => {
  const e = env();
  e.config.search.contextMaxChars = 3;
  e.client.queryLocalDocs = async () => ({ contextText: 'ab😀tail', results: [] });
  const r = send(e.client); await checked(e, r);
  const text = JSON.parse(e.calls[0][1].body).messages[1].content;
  assert.match(text, /ab/); assert.doesNotMatch(text, /[\uD800-\uDFFF]/);
});
test('an oversized system prompt is rejected with no generation fetch', async () => {
  const e = env(); e.config.chatbot.systemPrompt = 'x'.repeat(262145);
  const r = send(e.client); assert.equal((await checked(e, r)).code, 'REQUEST_TOO_LARGE'); assert.equal(e.calls.length, 0);
});
test('too many messages are rejected before retrieval', async () => {
  const e = env(); let searched = false;
  e.client.queryLocalDocs = async () => { searched = true; };
  const result = await e.client.sendMessage(Array.from({ length: 129 }, () => ({ role: 'user', content: 'x' })));
  assert.equal(result.code, 'REQUEST_TOO_LARGE'); assert.equal(searched, false); assert.equal(e.calls.length, 0);
});
test('an oversized explicit search query is rejected before retrieval', async () => {
  const e = env(), r = send(e.client, 'q', { query: 'x'.repeat(32769) });
  assert.equal((await checked(e, r)).code, 'QUERY_TOO_LARGE'); assert.equal(e.calls.length, 0);
});
test('rapid replacement generates only for the last request and releases all listeners', async () => {
  const e = env(), gates = [];
  e.client.queryLocalDocs = () => { const gate = deferred(); gates.push(gate); return gate.promise; };
  const runs = Array.from({ length: 24 }, (_, i) => send(e.client, `q-${i}`));
  gates.at(-1).resolve(null);
  const results = await Promise.all(runs.map(r => r.promise));
  gates.forEach(gate => gate.resolve(null)); await tick();
  assert.equal(results.filter(r => r.status === 'cancelled').length, 23);
  assert.equal(results.at(-1).status, 'completed'); assert.equal(e.calls.length, 1);
  assert.equal(JSON.parse(e.calls[0][1].body).messages.at(-1).content, 'q-23');
  assert.equal(e.timers.size, 0); assert.equal(e.client.currentRequest, null);
});
test('reentrant supersession prioritizes the newest request rather than its caller', async () => {
  const e = env(), gates = new Map();
  e.client.queryLocalDocs = q => { const gate = deferred(); gates.set(q, gate); return gate.promise; };
  const a = send(e.client, 'A'); let newest;
  e.client.abortController.signal.addEventListener('abort', () => { newest = send(e.client, 'NEWEST'); }, { once: true });
  const intermediate = send(e.client, 'INTERMEDIATE');
  gates.get('NEWEST').resolve(null);
  const results = await Promise.all([a.promise, intermediate.promise, newest.promise]);
  gates.get('A').resolve(null); await tick();
  assert.deepEqual(results.map(r => r.status), ['cancelled', 'cancelled', 'completed']);
  assert.equal(gates.has('INTERMEDIATE'), false); assert.equal(e.calls.length, 1);
  assert.equal(JSON.parse(e.calls[0][1].body).messages.at(-1).content, 'NEWEST');
  assert.equal(e.timers.size, 0);
});
test('late rejected fetch is observed after cancellation', async () => {
  let reject;
  const e = env(() => new Promise((_, fail) => { reject = fail; }));
  const r = send(e.client); await tick(); e.client.abort();
  assert.equal((await checked(e, r)).status, 'cancelled');
  reject(new Error('provider-late-private')); await tick();
  assert.doesNotMatch(JSON.stringify([e.events, r.observed]), /provider-late-private/);
});
test('valid Retry-After HTTP-date is retained for a user-initiated retry', async () => {
  const value = 'Wed, 23 Sep 2026 00:00:00 GMT';
  const e = env(async () => response('ignored', { status: 503, headers: { 'Retry-After': value } })), r = send(e.client);
  assert.equal((await checked(e, r)).retryAfter, value); assert.equal(e.calls.length, 1);
});
