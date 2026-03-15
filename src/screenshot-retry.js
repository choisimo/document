const { chromium } = require('/home/nodove/workspace/Edu-connector/code/frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8000';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

const PAGES = [
  '/nginx/configuration/',
  '/nginx/proxy-manager/',
  '/nginx/docker-k8s-deployment/',
  '/prompts/docs-editor/',
  '/prompts/database/',
  '/prompts/architecture/',
  '/extra/docker/stacks/',
  '/extra/docker/stacks/databases/',
  '/extra/docker/stacks/automation/',
  '/extra/docker/stacks/devtools/',
  '/extra/docker/stacks/security/',
  '/extra/docker/stacks/media/',
  '/extra/docker/stacks/storage/',
  '/extra/docker/stacks/misc/',
  '/extra/docker/stacks/misc/open-notebook/',
  '/extra/docker/stacks/monitoring/',
  '/extra/docker/stacks/proxy/',
];

function urlToFilename(urlPath) {
  return urlPath.replace(/\//g, '_').replace(/^_/, '').replace(/_$/, '') || 'home';
}

async function run() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const errors = [];

  for (const urlPath of PAGES) {
    const url = BASE_URL + urlPath;
    const filename = urlToFilename(urlPath) + '.png';
    const outPath = path.join(SCREENSHOTS_DIR, filename);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`✅ ${urlPath} → ${filename}`);
    } catch (err) {
      console.error(`❌ ${urlPath}: ${err.message}`);
      errors.push({ urlPath, error: err.message });
    }
  }

  await browser.close();

  if (errors.length > 0) {
    console.log('\nFailed pages:');
    errors.forEach(e => console.log(`  ${e.urlPath}: ${e.error}`));
  }

  console.log(`\nDone. ${PAGES.length - errors.length}/${PAGES.length} succeeded`);
}

run().catch(console.error);
