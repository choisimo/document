const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '../..');
const html = (body) => `<!doctype html><html><head><title>Local QA fixture</title><link rel="icon" href="data:,"></head><body>${body}</body></html>`;

test('screenshot CLI against a real local HTTP server and Chromium', { timeout: 120000 }, async (t) => {
  const artifactBase = path.resolve(process.env.QA_TEST_OUTPUT_DIR || os.tmpdir());
  fs.mkdirSync(artifactBase, { recursive: true });
  const artifactDir = fs.mkdtempSync(path.join(artifactBase, 'document-screenshot-test-'));
  const siteDir = path.join(artifactDir, 'site');
  const files = ['index.html', 'docs/one/index.html', 'docs/two/index.html', 'docs_one/index.html', 'plain.html', '한 글/index.html', '404.html'];
  for (const file of files) {
    const filename = path.join(siteDir, file);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, html(`<h1>${file}</h1>`));
  }
  let fixed = false;
  let docsFixed = false;
  const requests = [];
  const commands = [];
  const server = http.createServer((request, response) => {
    const requestPath = new URL(request.url, 'http://localhost').pathname;
    requests.push(requestPath);
    const route = requestPath.replace(/^\/mounted(?=\/)/, '');
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (route.startsWith('/diag/')) {
      const body = route === '/diag/clean/' || docsFixed
        ? '<article class="md-content__inner"><h1>Fixture document</h1><div class="mermaid" data-processed="true"><svg width="100" height="40"><text y="20">Diagram</text></svg></div></article>'
        : '<h1>404 - Not Found</h1><div style="width:1800px">Wide content</div><pre class="mermaid-source">graph TD; A--&gt;B;</pre><div class="mermaid-error" data-processed="false">Syntax error</div><svg width="1401" height="3001"></svg>';
      response.end(html(body));
    } else if (route === '/flaky/') {
      response.writeHead(fixed ? 200 : 404).end(html('Flaky page'));
    } else if (route === '/error/') {
      response.end(html(fixed ? 'Fixed' : '<script>throw new Error("fixture pageerror")</script>'));
    } else if (route === '/broken-asset/') {
      response.end(html('<img src="/missing-asset.png" alt="Missing">'));
    } else if (route === '/request-failure/') {
      response.end(html('<script>fetch("/disconnect").catch(() => {})</script>'));
    } else if (route === '/disconnect') {
      response.destroy();
    } else if (route === '/pending/') {
      response.end(html('<script>fetch("/never").catch(() => {})</script>Pending fetch'));
    } else if (route === '/never') {
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.write('Still loading');
    } else if (route === '/console/') {
      response.end(html('<script>console.error("fixture diagnostic")</script>Console diagnostic'));
    } else if (route === '/slow/') {
      setTimeout(() => response.end(html('Delayed')), 3000).unref();
    } else {
      const relative = decodeURIComponent(route).replace(/^\//, '') + (route.endsWith('/') ? 'index.html' : '');
      const filename = path.resolve(siteDir, relative);
      if (filename.startsWith(siteDir + path.sep) && fs.existsSync(filename) && fs.statSync(filename).isFile()) {
        response.end(fs.readFileSync(filename));
      } else response.writeHead(404).end(html('Missing'));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    fs.writeFileSync(path.join(artifactDir, 'commands.json'), JSON.stringify(commands, null, 2) + '\n');
    console.log(`Local screenshot test artifacts: ${artifactDir}`);
  });

  async function invoke(name, { mode = 'pages', args = [], exitCode = 0, outputDir, env = {}, inheritBase = false,
    hasReport = true, legacy = false, cwd = REPO_ROOT, positionalOutput = true } = {}) {
    outputDir ||= path.join(artifactDir, name);
    const executable = legacy ? 'python3' : process.execPath;
    const command = legacy
      ? ['-S', path.join(REPO_ROOT, 'src/automation/screenshot_all_pages.py'), ...(positionalOutput ? [path.relative(cwd, outputDir)] : []), ...args]
      : [path.join(REPO_ROOT, `src/screenshot-${mode}.js`), '--output-dir', outputDir, ...args];
    const environment = { ...process.env };
    for (const key of ['BASE_URL', 'QA_OUTPUT_DIR', 'SITE_DIR', 'CHROMIUM_PATH', 'QA_TIMEOUT_MS', 'QA_SETTLE_MS']) delete environment[key];
    Object.assign(environment, { SITE_DIR: siteDir, QA_TIMEOUT_MS: '10000', QA_SETTLE_MS: '50' }, inheritBase ? {} : { BASE_URL: baseUrl }, env);
    if (legacy && !positionalOutput) environment.QA_OUTPUT_DIR = outputDir;
    const result = await new Promise((resolve, reject) => {
      const child = spawn(executable, command, { cwd, env: environment });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`Command timed out: ${name}`)); }, 20000);
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', (error) => { clearTimeout(timer); reject(error); });
      child.on('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal, stdout, stderr }); });
    });
    commands.push({ name, command: [executable, ...command], cwd, overrides: { BASE_URL: inheritBase ? '(from report)' : baseUrl, ...env }, expectedExitCode: exitCode, ...result });
    assert.equal(result.code, exitCode, `${name}\n${result.stdout}\n${result.stderr}`);
    if (!hasReport) return result;
    const report = JSON.parse(fs.readFileSync(path.join(outputDir, 'report.json'), 'utf8'));
    assert.equal(report.exitCode, exitCode);
    assert.equal(report.tool, 'document-screenshots');
    assert.ok(report.startedAt && report.finishedAt && report.environment.node);
    assert.ok(Object.hasOwn(report.revision, 'head'));
    assert.equal(fs.readFileSync(report.reportFile, 'utf8'), fs.readFileSync(path.join(outputDir, 'report.json'), 'utf8'));
    for (const page of report.pages) {
      if (page.screenshot) {
        const bytes = fs.readFileSync(path.join(outputDir, page.screenshot));
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      }
    }
    return report;
  }

  await t.test('discovers actual HTML including encoded filenames and excludes the 404 template', async () => {
    const report = await invoke('discovery');
    assert.deepEqual(report.selection.selectedPaths, ['/', '/%ED%95%9C%20%EA%B8%80/', '/docs/one/', '/docs/two/', '/docs_one/', '/plain.html']);
    assert.equal(report.summary.passed, 6);
    assert.equal(report.environment.playwright, '1.63.0');
    assert.ok(report.environment.chromiumVersion);
  });
  await t.test('prefix and limit narrow the actual discovered pages', async () => {
    const report = await invoke('narrow', { args: ['--prefix', '/docs/', '--limit', '1'] });
    assert.deepEqual(report.selection.selectedPaths, ['/docs/one/']);
  });
  await t.test('explicit paths respect a base URL mount and cannot collide as filenames', async () => {
    const report = await invoke('mounted', { args: ['--base-url', baseUrl + 'mounted/', '--path', '/docs/one/', '/docs_one/'] });
    assert.equal(report.summary.passed, 2);
    assert.ok(report.pages.every((page) => page.url.startsWith(baseUrl + 'mounted/')));
    assert.notEqual(report.pages[0].screenshot, report.pages[1].screenshot);
  });
  const retryOutput = path.join(artifactDir, 'retry-lifecycle');
  await t.test('HTTP 404 and browser page errors fail despite saved screenshots', async () => {
    const report = await invoke('mixed', { args: ['/', '/flaky/', '/error/'], exitCode: 1, outputDir: retryOutput });
    assert.deepEqual(report.failedPaths, ['/flaky/', '/error/']);
    assert.equal(report.pages[1].httpStatus, 404);
    assert.ok(report.pages[1].errors.some((error) => error.kind === 'http' && error.status === 404));
    assert.ok(report.pages[2].errors.some((error) => error.kind === 'pageerror' && error.message === 'fixture pageerror'));
    assert.ok(report.pages.every((page) => page.screenshot));
  });
  await t.test('retry keeps pending failures, inherits the target, and clears only successful retries', async () => {
    fixed = true;
    const partial = await invoke('partial-retry', { mode: 'retry', args: ['--limit', '1'], exitCode: 1, outputDir: retryOutput, inheritBase: true });
    assert.deepEqual(partial.selection.selectedPaths, ['/flaky/']);
    assert.deepEqual(partial.failedPaths, ['/error/']);
    assert.deepEqual(partial.pendingPaths, ['/error/']);
    assert.equal(partial.config.baseUrl, baseUrl);
    const invalid = await invoke('invalid-retry', { mode: 'retry', args: ['--timeout-ms', '0'], exitCode: 1, outputDir: retryOutput, inheritBase: true });
    assert.deepEqual(invalid.failedPaths, ['/error/']);
    const complete = await invoke('complete-retry', { mode: 'retry', args: ['--timeout-ms', '10000'], outputDir: retryOutput, inheritBase: true });
    assert.deepEqual(complete.selection.selectedPaths, ['/error/']);
    assert.deepEqual(complete.failedPaths, []);
    const requestCount = requests.length;
    const empty = await invoke('empty-retry', { mode: 'retry', outputDir: retryOutput, inheritBase: true, env: { CHROMIUM_PATH: '/missing/unused-browser' } });
    assert.equal(empty.summary.selected, 0);
    assert.equal(requests.length, requestCount);
  });
  await t.test('launch failures retain unattempted paths and executable override can recover them', async () => {
    const outputDir = path.join(artifactDir, 'launch');
    const failed = await invoke('launch-failure', { args: ['/', '--chromium-path', path.join(artifactDir, 'missing-browser')], exitCode: 1, outputDir });
    assert.deepEqual(failed.failedPaths, ['/']);
    assert.equal(failed.summary.notRun, 1);
    assert.ok(failed.fatalErrors.length > 0);
    const recovered = await invoke('launch-retry', { mode: 'retry', outputDir, inheritBase: true, env: { CHROMIUM_PATH: chromium.executablePath() } });
    assert.equal(recovered.summary.passed, 1);
    assert.equal(recovered.environment.chromiumPath, chromium.executablePath());
  });
  await t.test('HTTP subresource failures and failed requests are page failures', async () => {
    const report = await invoke('resources', { args: ['/broken-asset/', '/request-failure/'], exitCode: 1 });
    assert.ok(report.pages[0].errors.some((error) => error.kind === 'http' && error.status === 404));
    assert.ok(report.pages[1].errors.some((error) => error.kind === 'requestfailed'));
  });
  await t.test('navigation timeouts produce failed page results and a nonzero exit', async () => {
    const report = await invoke('timeout', { args: ['/slow/', '--timeout-ms', '1000'], exitCode: 1 });
    assert.equal(report.fatalErrors.length, 0);
    assert.ok(report.pages[0].errors.some((error) => error.kind === 'execution' && /Timeout/.test(error.message)));
  });
  await t.test('capture cleanup does not misclassify pending requests or console diagnostics', async () => {
    const report = await invoke('capture-window', { args: ['/pending/', '/console/'] });
    assert.equal(report.summary.passed, 2);
    assert.deepEqual(report.pages[1].consoleErrors, ['fixture diagnostic']);
  });
  await t.test('a missing build writes an actionable failure report', async () => {
    const report = await invoke('missing-build', { args: ['--site-dir', path.join(artifactDir, 'absent')], exitCode: 1 });
    assert.equal(report.summary.selected, 0);
    assert.match(report.fatalErrors[0].message, /Build the site or use --path/);
  });
  await t.test('unwritable output fails the process when a report cannot be saved', async () => {
    const outputDir = path.join(artifactDir, 'not-a-directory');
    fs.writeFileSync(outputDir, 'fixture');
    const result = await invoke('output-error', { args: ['/'], outputDir, exitCode: 1, hasReport: false });
    assert.match(result.stderr, /Unable to finish screenshot report/);
  });
  const docsOutput = path.join(artifactDir, 'docs-diagnostics');
  const diagnosticCodes = ['no-content-inner', '404-page', 'horizontal-overflow', 'mermaid-errors', 'mermaid-unrendered', 'svg-overflow'];
  await t.test('optional docs diagnostics retain content, soft 404, layout and Mermaid checks', async () => {
    const normal = await invoke('docs-disabled', { args: ['/diag/broken/'] });
    assert.equal(normal.config.docsDiagnostics, false);
    assert.equal(normal.pages[0].docsDiagnostics, null);
    const failed = await invoke('docs-enabled', { args: ['--docs-diagnostics', '/diag/broken/'], outputDir: docsOutput, exitCode: 1 });
    assert.equal(failed.pages[0].httpStatus, 200);
    assert.deepEqual(failed.pages[0].errors.filter((error) => error.kind === 'docs-diagnostic').map((error) => error.code), diagnosticCodes);
    assert.deepEqual(failed.failedPaths, ['/diag/broken/']);
    assert.ok(failed.pages[0].docsDiagnostics.scrollWidth > failed.environment.viewport.width + 20);
    const clean = await invoke('docs-clean', { args: ['--docs-diagnostics', '/diag/clean/'] });
    assert.equal(clean.pages[0].docsDiagnostics.contentInnerCount, 1);
    assert.equal(clean.pages[0].docsDiagnostics.mermaidBlockCount, 1);
    assert.equal(clean.pages[0].docsDiagnostics.unrenderedMermaidCount, 0);
  });
  await t.test('retries inherit docs diagnostics and require the observed issues to be fixed', async () => {
    const failed = await invoke('docs-retry-fails', { mode: 'retry', outputDir: docsOutput, inheritBase: true, exitCode: 1 });
    assert.equal(failed.config.docsDiagnostics, true);
    assert.deepEqual(failed.pages[0].docsDiagnostics.issues.map((issue) => issue.code), diagnosticCodes);
    docsFixed = true;
    const passed = await invoke('docs-retry-passes', { mode: 'retry', outputDir: docsOutput, inheritBase: true });
    assert.equal(passed.config.docsDiagnostics, true);
    assert.deepEqual(passed.failedPaths, []);
    docsFixed = false;
  });
  await t.test('Python compatibility entry accepts an output directory and propagates real QA failures', async () => {
    const passed = await invoke('wrapper output with spaces', { legacy: true, cwd: artifactDir, args: ['--path', '/diag/clean/'] });
    assert.equal(passed.config.docsDiagnostics, true);
    assert.equal(passed.summary.passed, 1);
    const failed = await invoke('wrapper-fails', { legacy: true, args: ['--path', '/diag/broken/'], exitCode: 1 });
    assert.deepEqual(failed.pages[0].docsDiagnostics.issues.map((issue) => issue.code), diagnosticCodes);
    const disabled = await invoke('wrapper-explicit-disable', { legacy: true, positionalOutput: false, args: ['--no-docs-diagnostics', '--path', '/diag/broken/'] });
    assert.equal(disabled.config.docsDiagnostics, false);
    const httpFailure = await invoke('wrapper-http-fails', { legacy: true, args: ['--no-docs-diagnostics', '--path', '/missing/'], exitCode: 1 });
    assert.equal(httpFailure.pages[0].httpStatus, 404);
  });
});
