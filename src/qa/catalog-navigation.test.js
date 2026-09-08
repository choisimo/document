const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const SOURCE = path.join(ROOT, 'content/docs/books/cs-reference');

test('catalog keeps every bilingual source document and the learning note', () => {
  const catalog = fs.readFileSync(path.join(SOURCE, 'index.md'), 'utf8');
  const links = [...catalog.matchAll(/\]\(([^)]+\.md)\)\{ data-lang="(?:ko|en)"/g)].map(match => match[1]).sort();
  const documents = ['', 'ko/'].flatMap(prefix => fs.readdirSync(path.join(SOURCE, prefix))
    .filter(name => name.endsWith('.md') && name !== 'index.md')
    .map(name => prefix + name)).sort();
  assert.equal(links.length, 52);
  assert.equal(new Set(links).size, 52);
  assert.deepEqual(links, documents, 'the catalog must cover both versions of every topic');
  const notePath = path.join(ROOT, 'content/notes/cs-reference-learning-paths.md');
  const note = fs.readFileSync(notePath, 'utf8');
  assert.equal((note.match(/^## \d+\./gm) || []).length, 12);
  for (const [, target] of note.matchAll(/\]\(([^)]+\.md)\)/g)) {
    assert.ok(fs.existsSync(path.resolve(path.dirname(notePath), target)), `moved learning-note link: ${target}`);
  }
});
