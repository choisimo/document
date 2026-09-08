const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const CATEGORIES = [
  'algorithms/algorithm-architect', 'algorithms', 'books', 'compiler', 'databases', 'development',
  'extra/docker', 'extra/docker/stacks', 'extra/docker/stacks/automation', 'extra/docker/stacks/databases',
  'extra/docker/stacks/devtools', 'extra/docker/stacks/media', 'extra/docker/stacks/misc',
  'extra/docker/stacks/monitoring', 'extra/docker/stacks/proxy', 'extra/docker/stacks/security', 'extra/docker/stacks/storage',
  'extra', 'infrastructure', 'java', 'linux', 'nginx', 'os', 'projects', 'prompts', 'security', 'tools'
];

test('category source links resolve through docs or the actual asset producer mapping', () => {
  const sync = fs.readFileSync(path.join(ROOT, 'src/automation/site/sync-extra-assets.sh'), 'utf8');
  const mappings = [...sync.matchAll(/^sync_dir "([^"]+)" "([^"]+)"/gm)]
    .map(match => ({ source: path.join(ROOT, match[1]), prefix: '/extra/' + match[2] + '/' }))
    .sort((left, right) => right.prefix.length - left.prefix.length);
  for (const category of CATEGORIES) {
    const sourceFile = path.join(ROOT, 'content/docs', category, 'index.md');
    const source = fs.readFileSync(sourceFile, 'utf8');
    const navigation = source.match(/<nav class="hub-directory"[\s\S]*?<\/nav>/)?.[0];
    assert.ok(navigation, category);
    assert.ok(source.indexOf(navigation) < source.indexOf('<details class="hub-directory-notes"'), category);
    assert.match(source, /^# [^\n]+ \{#[^}]+\}$/m, 'the original title fragment is explicit');
    assert.match(source, /<details class="hub-directory-notes" markdown="1" open>/);
    const destinations = [...navigation.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
    assert.ok(destinations.length > 0, category);
    for (const destination of destinations) {
      const route = destination.split('#')[0];
      if (route.startsWith('/extra/')) {
        const mapping = mappings.find(item => route.startsWith(item.prefix));
        if (mapping) {
          const sourceTarget = path.join(mapping.source, decodeURIComponent(route.slice(mapping.prefix.length)));
          assert.ok(fs.existsSync(sourceTarget), destination);
        } else {
          assert.equal(route, '/extra/algorithm-code/');
          assert.ok(mappings.some(item => item.prefix.startsWith(route) && fs.existsSync(item.source)), 'generated parent has real children');
        }
      } else {
        assert.ok(fs.statSync(path.resolve(path.dirname(sourceFile), decodeURIComponent(route))).isFile(), destination);
      }
    }
  }
});
