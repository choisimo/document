const { chromium } = require('/home/nodove/workspace/Edu-connector/code/frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8000';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

const PAGES = [
  '/',
  '/databases/installation/',
  '/databases/postgresql-guide/',
  '/tools/split-view/',
  '/linux/commands/',
  '/linux/filesystem/',
  '/os/cpu-scheduling/',
  '/os/synchronization/',
  '/os/deadlocks/',
  '/os/memory/',
  '/os/process/',
  '/os/virtualization/',
  '/os/distributed-deadlocks/',
  '/algorithms/pointers/',
  '/algorithms/function-pointers/',
  '/algorithms/oop-patterns/',
  '/algorithms/algorithm-architect/README/',
  '/algorithms/algorithm-architect/01-graph/01-bfs/',
  '/algorithms/algorithm-architect/01-graph/02-dfs/',
  '/algorithms/algorithm-architect/01-graph/03-dijkstra/',
  '/algorithms/algorithm-architect/01-graph/04-bellman-ford/',
  '/algorithms/algorithm-architect/01-graph/05-floyd-warshall/',
  '/algorithms/algorithm-architect/02-sorting-searching/01-binary-search/',
  '/algorithms/algorithm-architect/02-sorting-searching/02-quick-sort/',
  '/algorithms/algorithm-architect/02-sorting-searching/03-merge-sort/',
  '/algorithms/algorithm-architect/03-dynamic-programming/01-dp-1d/',
  '/algorithms/algorithm-architect/03-dynamic-programming/02-dp-2d/',
  '/algorithms/algorithm-architect/03-dynamic-programming/03-knapsack/',
  '/algorithms/algorithm-architect/04-greedy/01-greedy/',
  '/algorithms/algorithm-architect/05-tree/01-tree-traversal/',
  '/algorithms/algorithm-architect/05-tree/02-lca/',
  '/algorithms/algorithm-architect/06-union-find/01-union-find/',
  '/algorithms/algorithm-architect/07-two-pointers/01-two-pointers/',
  '/algorithms/algorithm-architect/08-sliding-window/01-sliding-window/',
  '/algorithms/algorithm-architect/09-backtracking/01-backtracking/',
  '/algorithms/algorithm-architect/10-topological-sort/01-topological-sort/',
  '/algorithms/algorithm-architect/11-bit-masking/01-bit-masking/',
  '/algorithms/algorithm-architect/convert_md_to_pdf.sh/',
  '/java/core-concepts/',
  '/java/memory-gc/',
  '/projects/cbt-system/',
  '/projects/emotion-diary/',
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

  console.log(`\nDone. Screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log(`Total: ${PAGES.length - errors.length}/${PAGES.length} succeeded`);
}

run().catch(console.error);
