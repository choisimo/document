const { execFileSync } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const TOOL = 'document-screenshots';
const VIEWPORT = { width: 1440, height: 900 };
const OPTIONS = {
  '--base-url': 'baseUrl',
  '--output-dir': 'outputDir',
  '--site-dir': 'siteDir',
  '--chromium-path': 'chromiumPath',
  '--timeout-ms': 'timeoutMs',
  '--settle-ms': 'settleMs',
  '--report': 'sourceReport',
  '--prefix': 'prefix',
  '--limit': 'limit',
};

function initialConfig() {
  return {
    baseUrl: process.env.BASE_URL || 'http://localhost:8000/',
    outputDir: path.resolve(process.env.QA_OUTPUT_DIR || path.join(REPO_ROOT, 'dist/qa-shots')),
    siteDir: path.resolve(process.env.SITE_DIR || path.join(REPO_ROOT, 'dist/site')),
    chromiumPath: process.env.CHROMIUM_PATH || null,
    timeoutMs: process.env.QA_TIMEOUT_MS || 30000,
    settleMs: process.env.QA_SETTLE_MS || 500,
    docsDiagnostics: false,
    sourceReport: null,
    prefix: null,
    limit: null,
    paths: [],
  };
}

function parseArguments(config, args, mode) {
  const explicit = new Set(Object.entries({
    baseUrl: 'BASE_URL', outputDir: 'QA_OUTPUT_DIR', siteDir: 'SITE_DIR',
    chromiumPath: 'CHROMIUM_PATH', timeoutMs: 'QA_TIMEOUT_MS', settleMs: 'QA_SETTLE_MS',
  }).filter(([, name]) => process.env[name]).map(([name]) => name));
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') return { help: true, explicit };
    if (arg === '--docs-diagnostics' || arg === '--no-docs-diagnostics') {
      config.docsDiagnostics = arg === '--docs-diagnostics';
      explicit.add('docsDiagnostics');
      continue;
    }
    if (arg.startsWith('/')) {
      config.paths.push(arg);
      continue;
    }
    const key = OPTIONS[arg];
    if (!key && arg !== '--path') throw new Error(`Unknown argument: ${arg}. Use --help.`);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--path') config.paths.push(value);
    else {
      config[key] = value;
      explicit.add(key);
    }
  }
  if (mode !== 'retry' && config.sourceReport) throw new Error('--report is only for screenshot-retry.js');
  return { help: false, explicit };
}

function routePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) {
    throw new Error(`Expected a site path beginning with a single slash: ${JSON.stringify(value)}`);
  }
  const url = new URL(value, 'http://qa.invalid');
  if (url.origin !== 'http://qa.invalid') throw new Error(`Expected a local site path: ${JSON.stringify(value)}`);
  return `${url.pathname}${url.search}${url.hash}`;
}

function unique(values) {
  return [...new Set(values)];
}

function discoverPaths(siteDir) {
  if (!fs.existsSync(siteDir)) throw new Error(`Site directory does not exist: ${siteDir}. Build the site or use --path.`);
  const paths = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && entry.name.endsWith('.html')) {
        const relative = path.relative(siteDir, file).split(path.sep).join('/');
        if (relative === '404.html') continue;
        const route = relative === 'index.html' ? '' : relative.replace(/(^|\/)index\.html$/, '$1');
        paths.push('/' + route.split('/').map(encodeURIComponent).join('/'));
      }
    }
  }
  walk(siteDir);
  if (paths.length === 0) throw new Error(`No HTML pages found in ${siteDir}`);
  return unique(paths).sort();
}

function revisionInfo() {
  try {
    const options = { cwd: REPO_ROOT, encoding: 'utf8', timeout: 5000, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } };
    return {
      head: execFileSync('git', ['rev-parse', 'HEAD'], options).trim(),
      trackedChanges: execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], options).trim().length > 0,
    };
  } catch (error) {
    return { head: null, trackedChanges: null, error: error.message };
  }
}

function positiveInteger(value, name, minimum = 1) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > 2147483647) {
    throw new Error(`${name} must be an integer between ${minimum} and 2147483647`);
  }
  return number;
}

function validateConfig(config) {
  const base = new URL(config.baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('BASE_URL must be an HTTP(S) URL without credentials, query, or fragment');
  }
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  config.baseUrl = base.href;
  config.outputDir = path.resolve(config.outputDir);
  config.siteDir = path.resolve(config.siteDir);
  if (config.chromiumPath) config.chromiumPath = path.resolve(config.chromiumPath);
  config.timeoutMs = positiveInteger(config.timeoutMs, 'timeout-ms');
  config.settleMs = positiveInteger(config.settleMs, 'settle-ms', 0);
  if (typeof config.docsDiagnostics !== 'boolean') throw new Error('docsDiagnostics must be a boolean');
  if (config.limit !== null) config.limit = positiveInteger(config.limit, 'limit');
  config.paths = unique(config.paths.map(routePath));
  if (config.prefix !== null) config.prefix = routePath(config.prefix);
}

function readPrevious(config, explicit) {
  const filename = path.resolve(config.sourceReport || path.join(config.outputDir, 'report.json'));
  const previous = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (previous.tool !== TOOL || previous.schemaVersion !== 1 || !Array.isArray(previous.failedPaths) || !previous.config) {
    throw new Error(`Not a supported screenshot report: ${filename}`);
  }
  const failedPaths = unique(previous.failedPaths.map(routePath));
  if (failedPaths.length === 0 && previous.fatalErrors?.length) {
    throw new Error('Previous run failed before finding retryable paths. Fix its fatal error and run screenshot-pages.js again.');
  }
  for (const key of ['baseUrl', 'siteDir', 'chromiumPath', 'timeoutMs', 'settleMs', 'docsDiagnostics']) {
    if (!explicit.has(key) && previous.config[key] !== undefined) config[key] = previous.config[key];
  }
  if (!explicit.has('outputDir')) config.outputDir = path.dirname(filename);
  config.sourceReport = filename;
  return { failedPaths, runId: previous.runId, report: previous.reportFile || filename };
}

function screenshotName(route) {
  const label = route.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'home';
  const hash = createHash('sha256').update(route).digest('hex').slice(0, 12);
  return `${label}-${hash}.png`;
}

function addError(result, error) {
  if (!result.errors.some((existing) => JSON.stringify(existing) === JSON.stringify(error))) result.errors.push(error);
}

async function inspectDocs(page) {
  return page.evaluate(() => {
    const contentInnerCount = document.querySelectorAll('.md-content__inner').length;
    const title = document.title;
    const heading = document.querySelector('.md-content__inner h1, main h1, h1')?.textContent?.trim() || '';
    const viewportWidth = window.innerWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const mermaidBlocks = [...new Set([...document.querySelectorAll('.mermaid, pre.mermaid-source, pre > code.mermaid-source')]
      .map((element) => element.closest('pre') || element))];
    const mermaidErrorCount = document.querySelectorAll('.mermaid-error, [data-processed="false"], svg .error-icon, svg .error-text').length;
    const unrenderedMermaidCount = mermaidBlocks.filter((element) => !element.querySelector('svg') && element.textContent.trim()).length;
    const oversizedSvg = [...document.querySelectorAll('svg')].map((svg) => {
      const rect = svg.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }).filter((rect) => rect.width > 1400 || rect.height > 3000);
    const issues = [];
    if (contentInnerCount === 0) issues.push({ code: 'no-content-inner', message: 'MkDocs content area .md-content__inner is missing' });
    if (/404|not found/i.test(title) || /^(404\b|not found\b)/i.test(heading)) {
      issues.push({ code: '404-page', message: 'Title or main heading resembles a not-found page' });
    }
    if (scrollWidth > viewportWidth + 20) {
      issues.push({ code: 'horizontal-overflow', message: `Document width ${scrollWidth}px exceeds viewport ${viewportWidth}px by more than 20px` });
    }
    if (mermaidErrorCount > 0) issues.push({ code: 'mermaid-errors', message: `${mermaidErrorCount} Mermaid error or unprocessed marker(s)` });
    if (unrenderedMermaidCount > 0) issues.push({ code: 'mermaid-unrendered', message: `${unrenderedMermaidCount} Mermaid source block(s) have no SVG` });
    if (oversizedSvg.length > 0) issues.push({ code: 'svg-overflow', message: `${oversizedSvg.length} SVG(s) exceed 1400px width or 3000px height` });
    return { contentInnerCount, title, heading, viewportWidth, scrollWidth, mermaidBlockCount: mermaidBlocks.length,
      mermaidErrorCount, unrenderedMermaidCount, oversizedSvg, issues };
  });
}

async function capturePage(browser, config, result, runDirectory) {
  const started = Date.now();
  result.startedAt = new Date(started).toISOString();
  let context;
  let collecting = true;
  try {
    context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    page.on('pageerror', (error) => {
      if (collecting) addError(result, { kind: 'pageerror', message: error.message });
    });
    page.on('crash', () => {
      if (collecting) addError(result, { kind: 'crash', message: 'Browser page crashed' });
    });
    page.on('console', (message) => {
      if (collecting && message.type() === 'error') result.consoleErrors.push(message.text());
    });
    page.on('response', (response) => {
      if (collecting && response.status() >= 400) addError(result, { kind: 'http', status: response.status(), url: response.url() });
    });
    page.on('requestfailed', (request) => {
      if (collecting) addError(result, {
        kind: 'requestfailed', url: request.url(), message: request.failure()?.errorText || 'Request failed',
      });
    });
    const response = await page.goto(result.url, { waitUntil: 'load', timeout: config.timeoutMs });
    result.httpStatus = response?.status() ?? null;
    if (!response || !response.ok()) addError(result, { kind: 'http', status: result.httpStatus, url: response?.url() || result.url });
    if (config.settleMs > 0) await page.waitForTimeout(config.settleMs);
    const filename = path.join(runDirectory, screenshotName(result.path));
    await page.screenshot({ path: filename, fullPage: true, animations: 'disabled', timeout: config.timeoutMs });
    result.screenshot = path.relative(config.outputDir, filename).split(path.sep).join('/');
    result.finalUrl = page.url();
    result.title = await page.title();
    if (config.docsDiagnostics) {
      result.docsDiagnostics = await inspectDocs(page);
      for (const issue of result.docsDiagnostics.issues) addError(result, { kind: 'docs-diagnostic', ...issue });
    }
  } catch (error) {
    addError(result, { kind: 'execution', message: error.message });
  } finally {
    // Closing a context aborts outstanding requests; those are outside the capture window.
    collecting = false;
    if (context) {
      try { await context.close(); }
      catch (error) { addError(result, { kind: 'cleanup', message: error.message }); }
    }
    result.finishedAt = new Date().toISOString();
    result.durationMs = Date.now() - started;
    result.status = result.errors.length === 0 ? 'passed' : 'failed';
  }
}

function writeReport(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  report.reportFile = path.join(outputDir, `report-${report.runId}.json`);
  const serialized = JSON.stringify(report, null, 2) + '\n';
  for (const filename of [report.reportFile, path.join(outputDir, 'report.json')]) {
    const temporary = `${filename}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, serialized);
    fs.renameSync(temporary, filename);
  }
}

function showHelp(mode) {
  console.log(`Usage: node src/screenshot-${mode === 'retry' ? 'retry' : 'pages'}.js [options] [/path/ ...]
  --path /route/          Explicit page; repeat to select multiple pages
  --prefix /section/     Keep matching discovered paths (or previous failures)
  --limit N              Capture at most N selected pages
  --base-url URL         BASE_URL (default http://localhost:8000/)
  --site-dir DIRECTORY   SITE_DIR (default repository dist/site)
  --output-dir DIRECTORY QA_OUTPUT_DIR (default repository dist/qa-shots)
  --chromium-path FILE   CHROMIUM_PATH (default Playwright-managed Chromium)
  --timeout-ms N         QA_TIMEOUT_MS (default 30000)
  --settle-ms N          QA_SETTLE_MS (default 500, after load)
  --docs-diagnostics     Check MkDocs content, soft 404, overflow and Mermaid
  --no-docs-diagnostics  Disable these checks explicitly (including on retry)
  --report FILE          Retry input (default output directory/report.json)
  --help                Show this help
Paths are relative to the BASE_URL mount point. Relative filesystem paths use the current directory.
Retry inherits the previous base URL and browser settings unless explicitly overridden.`);
}

async function run(mode, args) {
  const started = Date.now();
  const config = initialConfig();
  const report = {
    tool: TOOL, schemaVersion: 1,
    runId: `${new Date(started).toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`,
    mode, startedAt: new Date(started).toISOString(), revision: revisionInfo(),
    environment: { node: process.version, platform: process.platform, arch: process.arch, osRelease: os.release(), viewport: VIEWPORT, headless: true },
    config, selection: null, previousRun: null, pages: [], pendingPaths: [], failedPaths: [], fatalErrors: [],
  };
  let browser;
  try {
    const parsed = parseArguments(config, args, mode);
    if (parsed.help) { showHelp(mode); return 0; }
    const previous = mode === 'retry' ? readPrevious(config, parsed.explicit) : null;
    if (previous) {
      report.previousRun = { runId: previous.runId, report: previous.report };
      report.pendingPaths = [...previous.failedPaths];
    }
    validateConfig(config);
    const candidates = previous ? previous.failedPaths : (config.paths.length ? config.paths : discoverPaths(config.siteDir));
    if (previous) {
      for (const requested of config.paths) {
        if (!candidates.includes(requested)) throw new Error(`Path was not a previous failure: ${requested}`);
      }
    }
    let selected = previous && config.paths.length ? config.paths : candidates;
    if (config.prefix !== null) selected = selected.filter((route) => route.startsWith(config.prefix));
    if (config.limit !== null) selected = selected.slice(0, config.limit);
    if (selected.length === 0 && (!previous || candidates.length > 0)) throw new Error('No pages match the requested selection');
    report.selection = { source: previous ? 'previous-failures' : (config.paths.length ? 'explicit' : 'built-html'), candidateCount: candidates.length, selectedPaths: selected };
    report.pendingPaths = previous ? candidates.filter((route) => !selected.includes(route)) : [];
    report.pages = selected.map((route) => ({
      path: route, url: new URL(route.slice(1), config.baseUrl).href, status: 'not-run',
      httpStatus: null, screenshot: null, docsDiagnostics: null, errors: [], consoleErrors: [],
    }));
    if (selected.length > 0) {
      const { chromium } = require('playwright');
      report.environment.playwright = require('playwright/package.json').version;
      report.environment.chromiumPath = config.chromiumPath || 'playwright-managed';
      const runDirectory = path.join(config.outputDir, report.runId);
      fs.mkdirSync(runDirectory, { recursive: true });
      browser = await chromium.launch({
        headless: true, timeout: config.timeoutMs,
        ...(config.chromiumPath ? { executablePath: config.chromiumPath } : {}),
      });
      report.environment.chromiumVersion = browser.version();
      for (const result of report.pages) {
        await capturePage(browser, config, result, runDirectory);
        console.log(`${result.status.toUpperCase()} ${result.path}${result.errors.length ? ` (${result.errors.length} error(s))` : ''}`);
      }
    }
  } catch (error) {
    report.fatalErrors.push({ message: error.message });
    console.error(`Screenshot run failed: ${error.message}`);
  } finally {
    if (browser) {
      try { await browser.close(); }
      catch (error) { report.fatalErrors.push({ message: `Browser cleanup failed: ${error.message}` }); }
    }
  }
  report.failedPaths = unique([...report.pendingPaths, ...report.pages.filter((page) => page.status !== 'passed').map((page) => page.path)]);
  report.finishedAt = new Date().toISOString();
  report.durationMs = Date.now() - started;
  report.summary = {
    selected: report.pages.length,
    passed: report.pages.filter((page) => page.status === 'passed').length,
    failed: report.pages.filter((page) => page.status === 'failed').length,
    notRun: report.pages.filter((page) => page.status === 'not-run').length,
    pending: report.pendingPaths.length,
  };
  report.exitCode = report.failedPaths.length > 0 || report.fatalErrors.length > 0 ? 1 : 0;
  writeReport(report, path.resolve(config.outputDir));
  console.log(`Report: ${report.reportFile}`);
  console.log(`Passed ${report.summary.passed}/${report.summary.selected}; remaining failures: ${report.failedPaths.length}; exit ${report.exitCode}`);
  return report.exitCode;
}

function runCli(mode) {
  run(mode, process.argv.slice(2)).then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(`Unable to finish screenshot report: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { runCli };
