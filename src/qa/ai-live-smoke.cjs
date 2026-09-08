// Private probe values stay in an ephemeral browser; never write them to artifacts.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const probe = process.argv.includes('--private-probe');
  let privateConfig;
  if (probe) {
    const base = process.env.AI_API_BASE_URL;
    assert.ok(base, 'AI_API_BASE_URL is required');
    const url = new URL(base);
    assert.ok(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash,
      'AI base must be HTTPS without credentials, query or fragment');
    assert.ok(process.env.AI_API_TOKEN, 'AI_API_TOKEN is required');
    privateConfig = { apiBaseUrl: base.replace(/\/+$/, ''), apiToken: process.env.AI_API_TOKEN,
      modelName: process.env.AI_MODEL_NAME || null };
    const diagnosis = { apiHost: url.hostname, apiPath: url.pathname };
    try {
      const preflight = await fetch(privateConfig.apiBaseUrl + '/chat/completions', {
        method: 'OPTIONS', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Origin: 'https://docs.nodove.com', 'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type' },
      });
      diagnosis.preflightStatus = preflight.status;
      diagnosis.allowsDocumentationOrigin = ['*', 'https://docs.nodove.com'].includes(preflight.headers.get('access-control-allow-origin'));
      const models = await fetch(privateConfig.apiBaseUrl + '/models', {
        redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Authorization: 'Bearer ' + privateConfig.apiToken },
      });
      diagnosis.modelsStatus = models.status;
      if (models.ok) {
        const data = await models.json();
        diagnosis.modelAvailable = data.data?.some(model => model.id === privateConfig.modelName) || false;
      }
    } catch (error) { diagnosis.networkError = error.cause?.code || error.name; }
    console.log(JSON.stringify(diagnosis));
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    if (!probe && process.env.GITHUB_SHA) {
      let deployedCommit;
      for (let attempt = 0; attempt < 12; attempt++) {
        const response = await context.request.get('https://docs.nodove.com/build-info.json?verify=' + Date.now());
        if (response.ok()) deployedCommit = (await response.json()).commit;
        if (deployedCommit === process.env.GITHUB_SHA) break;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      assert.equal(deployedCommit, process.env.GITHUB_SHA, 'Verify the released commit, not a cached deployment');
    }
    const page = await context.newPage();
    const transport = [];
    page.on('response', response => {
      if (new URL(response.url()).pathname.endsWith('/chat/completions')) transport.push({ status: response.status() });
    });
    page.on('requestfailed', request => {
      if (new URL(request.url()).pathname.endsWith('/chat/completions')) transport.push({ failed: true });
    });
    await page.goto('https://docs.nodove.com/security/ssh/configuration/');
    await page.locator('.hub-document-body').waitFor();
    if (probe) await page.evaluate(config => Object.assign(window.aiClient.config, config), privateConfig);
    await page.locator('[data-action="reader-tools"]').click();
    await page.locator('[data-action="assistant"]').click();
    await page.locator('#assistant-query').fill('이 문서에서 설명하는 SSH 설정의 목적을 한국어 한 문장으로 요약해 주세요.');
    await page.locator('#assistant-form button[type="submit"]').click();
    await page.waitForFunction(() => {
      const form = document.querySelector('#assistant-form');
      return form && !form.dataset.busy && document.querySelector('#assistant-answer')?.textContent.trim();
    }, null, { timeout: 90000 });
    const failed = await page.locator('#assistant-answer').getAttribute('role') === 'alert';
    const answer = await page.locator('#assistant-answer').innerText();
    console.log(JSON.stringify({ mode: probe ? 'private-service-probe' : 'deployed-ui', transport,
      uiError: failed, answerCharacters: answer.length, koreanAnswer: /[가-힣]/.test(answer) }));
    assert.ok(!failed && answer.trim().length > 10 && /[가-힣]/.test(answer), 'AI must show a nonempty Korean answer');
    assert.ok(transport.some(item => item.status === 200), 'AI completion must return HTTP 200');
  } finally { await browser.close(); }
})().catch(error => {
  // Avoid echoing exception messages containing a configured URL, token or model.
  console.error('AI live verification failed (' + error.name + '); inspect the sanitized status above.');
  process.exitCode = 1;
});
