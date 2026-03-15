import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const base = process.env.DOC_ROOT || process.cwd();
const port = Number(process.env.DOC_PORT || 8765);
const summaryPath = path.join(base, "validation-artifacts", "playwright-validation-summary.json");
const fileListPath = path.join(base, "validation-file-list.json");

if (!fs.existsSync(fileListPath)) {
  throw new Error(`Missing file list: ${fileListPath}`);
}

const files = JSON.parse(fs.readFileSync(fileListPath, "utf8"));
fs.mkdirSync(path.join(base, "validation-artifacts"), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });

const results = [];

for (const file of files) {
  const url = `http://127.0.0.1:${port}/validate_mermaid.html?file=${encodeURIComponent(file)}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(
    (target) => window.__validation && window.__validation.file === target,
    file,
    { timeout: 30000 }
  );

  const validation = await page.evaluate(() => window.__validation);
  const hasMermaidError = (await page.locator("text=MERMAID_ERROR").count()) > 0;
  const pass =
    validation.mermaidBlocks > 0 &&
    validation.mermaidBlocks === validation.rendered &&
    validation.headings >= 3 &&
    !hasMermaidError;

  const screenshot = file.replaceAll("/", "__").replace(/\.md$/, "") + ".png";
  await page.screenshot({
    path: path.join(base, "validation-artifacts", screenshot),
    fullPage: true,
  });

  results.push({
    file,
    ...validation,
    hasMermaidError,
    pass,
    screenshot: `validation-artifacts/${screenshot}`,
  });
}

await browser.close();

const summary = {
  checkedAt: new Date().toISOString(),
  totalFiles: results.length,
  passed: results.filter((r) => r.pass).length,
  failed: results.filter((r) => !r.pass).length,
  results,
};

fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`Validated ${summary.totalFiles} files: pass ${summary.passed}, fail ${summary.failed}`);

if (summary.failed > 0) {
  process.exit(2);
}
