import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access, mkdtemp, symlink, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { concepts } from '../catalog.js';
import { docs, h, createStore, normalizeReviews } from '../shared.js';
import { root, makeServer, isPublicPath } from '../server.mjs';

test('all 20 individual routes and source references exist; layout fingerprints are materially distinct', async () => {
  assert.equal(concepts.length,20);
  assert.equal(new Set(concepts.map(c=>c.id)).size,20);
  assert.equal(new Set(concepts.map(c=>c.route)).size,20);
  for (const c of concepts) {
    const html=await readFile(path.join(root,c.route),'utf8');
    assert.ok(html.includes(`data-concept="${c.id}"`));
    assert.ok(html.includes('noindex,nofollow'));
    await access(path.join(root,'pages',c.module));
    await access(path.join(root,'pages',c.module.replace(/\.js$/,'.css')));
    assert.equal(c.axes.length,6);
  }
  for (const a of concepts) for (const b of concepts) if(a.id<b.id) {
    assert.ok(a.axes.filter((value,i)=>value!==b.axes[i]).length>=2,`${a.id} and ${b.id} must differ on two axes`);
  }
  for(const doc of docs) await access(path.resolve(root,'../../content/docs',doc.source));
  assert.equal((await readdir(path.join(root,'concepts'))).filter(f=>f.endsWith('.html')).length,20);
});

test('HTML escaping and failed storage preserve user input without reporting successful persistence', () => {
  assert.equal(h('<script>"&\''),'&lt;script&gt;&quot;&amp;&#39;');
  let message='';
  const store=createStore({ getItem(){throw Error('blocked');},setItem(){throw Error('quota');} }, text=>message=text);
  assert.equal(store.set('note',{text:'keep this draft'}),false);
  assert.equal(store.get('note',null).text,'keep this draft');
  assert.ok(message.includes('내보내기'));
  assert.equal(store.get('other','fallback'),'fallback');
  const stale=createStore({getItem(){return '"old draft"';},setItem(){throw Error('quota');},removeItem(){throw Error('blocked');}});
  stale.set('draft','new draft');assert.equal(stale.get('draft','empty'),'new draft');
  stale.remove('draft');assert.equal(stale.get('draft','empty'),'empty');
});

test('persisted review data is normalized before rendering even with malformed JSON object values', () => {
  const input={'01':{scores:[1,2,3,99],note:{toString:{}},verdict:['shortlist']},'02':{scores:[2,3,4,5],note:'kept',verdict:'shortlist'},'03':null,'99':{note:'unknown'}};
  const reviews=normalizeReviews(input,['01','02','03']);
  assert.deepEqual(reviews['01'].scores,[]);assert.equal(reviews['01'].note,'');assert.equal(reviews['01'].verdict,'hold');
  assert.deepEqual(reviews['02'].scores,[2,3,4,5]);assert.equal(reviews['02'].note,'kept');assert.equal(reviews['99'],undefined);assert.equal(reviews['03'],undefined);
  assert.deepEqual(normalizeReviews([],['01']),{});
});

test('lab HTTP server serves only public assets, denies writes/traversal/private paths and cross-root symlinks', async t => {
  const server=makeServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const file of ['','/index.html',...concepts.map(c=>'/'+c.route)]) {
    const response=await fetch(base+file);assert.equal(response.status,200,file);
    assert.match(response.headers.get('content-security-policy'),/connect-src 'self'/);
  }
  for(const file of ['/README.md','/.env','/package.json','/tests/contracts.test.mjs','/%2e%2e%2fREADME.md','/content/docs/index.md','/server.mjs']) {
    assert.equal((await fetch(base+file)).status,404,file);
  }
  assert.equal((await fetch(base+'/index.html',{method:'POST',body:'no changes'})).status,405);
  assert.equal((await fetch(base+'/index.html',{method:'HEAD'})).status,200);
  assert.equal(isPublicPath('concepts/../../README.md'),false);
  assert.equal(isPublicPath('concepts/99-private.html'),false);
  const temp=await mkdtemp(path.join(os.tmpdir(),'docs-lab-boundary-'));
  const isolated=path.join(temp,'lab');
  const { mkdir }=await import('node:fs/promises');await mkdir(isolated);
  await writeFile(path.join(temp,'private.txt'),'not public');await symlink(path.join(temp,'private.txt'),path.join(isolated,'index.html'));
  const linked=makeServer(isolated);linked.listen(0,'127.0.0.1');await once(linked,'listening');
  t.after(async()=>{await new Promise(resolve=>linked.close(resolve));await rm(temp,{recursive:true,force:true});});
  assert.equal((await fetch(`http://127.0.0.1:${linked.address().port}/`)).status,404);
});

test('production builder and workflow have no dependency on lab resources', async () => {
  const repo=path.resolve(root,'../..');
  for(const file of ['apps/docs-site/mkdocs.yml','.github/workflows/deploy-pages.yml','src/package.json']) {
    const contents=await readFile(path.join(repo,file),'utf8');
    assert.ok(!contents.includes('docs-agent-lab'),`${file} must not import or deploy lab`);
  }
});
