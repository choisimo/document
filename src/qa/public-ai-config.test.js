const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const renderer = path.join(root, 'src/automation/site/render-public-ai-config.py');
const clientConfig = fs.readFileSync(path.join(root, 'content/docs/javascripts/ai-config.js'), 'utf8');

function render(t, values = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'document-public-config-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'public.js');
  fs.writeFileSync(output, 'previous output');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !key.startsWith('PUBLIC_') && !key.startsWith('AI_') && !key.startsWith('OPEN_NOTEBOOK_')));
  const result = spawnSync('python3', [renderer, output], { env: { ...env, ...values }, encoding: 'utf8' });
  return { result, source: fs.readFileSync(output, 'utf8') };
}

function evaluate(source) {
  const context = { window: {} };
  vm.runInNewContext(`${source}\n${clientConfig}`, context);
  return context.window;
}

test('private legacy tokens never enter generated browser config', (t) => {
  const { result, source } = render(t, {
    AI_API_TOKEN: 'private-ai-sentinel', OPEN_NOTEBOOK_TOKEN: 'private-kb-sentinel',
    AI_API_BASE_URL: 'https://private.example/v1',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(source + result.stdout + result.stderr, /private-.*sentinel|private\.example/);
  const { AI_CONFIG: config } = evaluate(source);
  assert.equal(config.apiToken, '');
  assert.equal(config.openNotebook.apiToken, '');
  assert.equal(config.openNotebook.enabled, false);
  assert.equal(config.apiBaseUrl, 'https://ai.dothechi.com/v1');
});

test('explicit public settings survive serialization without running injected code', (t) => {
  const model = `model'\\\n\u2028</script>; window.injected = true; // 한글`;
  const { result, source } = render(t, {
    PUBLIC_AI_API_BASE_URL: 'https://public.example/v1/',
    PUBLIC_AI_API_TOKEN: 'public-browser-token',
    PUBLIC_AI_MODEL_NAME: model,
    PUBLIC_OPEN_NOTEBOOK_ENABLED: 'true',
    PUBLIC_OPEN_NOTEBOOK_URL: 'https://public-kb.example/',
    PUBLIC_OPEN_NOTEBOOK_TOKEN: 'public-corpus-token',
  });
  assert.equal(result.status, 0, result.stderr);
  const state = evaluate(source);
  assert.equal(state.injected, undefined);
  assert.equal(state.AI_CONFIG.modelName, model);
  assert.equal(state.AI_CONFIG.apiBaseUrl, 'https://public.example/v1');
  assert.equal(state.AI_CONFIG.apiToken, 'public-browser-token');
  assert.equal(state.AI_CONFIG.openNotebook.enabled, true);
  assert.equal(state.AI_CONFIG.openNotebook.apiUrl, 'https://public-kb.example');
  assert.equal(state.AI_CONFIG.openNotebook.apiToken, 'public-corpus-token');
  assert.doesNotMatch(result.stdout + result.stderr, /public-browser-token|public-corpus-token/);
});

test('invalid public configuration fails without replacing an existing output', (t) => {
  for (const values of [
    { PUBLIC_AI_API_BASE_URL: 'http://public.example/v1' },
    { PUBLIC_AI_API_BASE_URL: 'https://user:private-password@example.test/v1' },
    { PUBLIC_AI_API_BASE_URL: 'https://example.test/v1?key=private-key' },
    { PUBLIC_AI_API_BASE_URL: 'https://example.test/v1#fragment' },
    { PUBLIC_AI_API_BASE_URL: 'https://private-credential-sentinel＠example.test/v1' },
    { PUBLIC_AI_API_BASE_URL: 'https://example.test:not-a-port/v1' },
    { PUBLIC_AI_API_BASE_URL: 'https://example.test:99999/v1' },
    { PUBLIC_AI_API_BASE_URL: 'https://example.test:0/v1' },
    { PUBLIC_AI_API_TOKEN: 'header\r\ninjection' },
    { PUBLIC_OPEN_NOTEBOOK_ENABLED: 'maybe' },
    { PUBLIC_OPEN_NOTEBOOK_ENABLED: 'true' },
  ]) {
    const { result, source } = render(t, values);
    assert.equal(result.status, 1);
    assert.equal(source, 'previous output');
    assert.doesNotMatch(result.stdout + result.stderr, /private-password|private-key|private-credential-sentinel/);
  }
});
