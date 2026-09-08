const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const HOME = path.join(ROOT, 'content/docs/index.md');
const NOTES = path.join(ROOT, 'content/notes/documentation-hub-maintenance.md');

test('home destinations and preserved maintenance notes resolve to real source files', () => {
  for (const file of [HOME, NOTES]) {
    const source = fs.readFileSync(file, 'utf8');
    const links = [...source.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)].map(match => match[1]);
    assert.ok(links.length > 0);
    for (const link of links) assert.ok(fs.statSync(path.resolve(path.dirname(file), link)).isFile(), `${file}: ${link}`);
  }
  const home = fs.readFileSync(HOME, 'utf8');
  assert.equal((home.match(/<section class="hub-home__topic"/g) || []).length, 6);
  assert.equal((home.match(/^## \d+\./gm) || []).length, 0);
  assert.equal((fs.readFileSync(NOTES, 'utf8').match(/^## \d+\./gm) || []).length, 12);
});
