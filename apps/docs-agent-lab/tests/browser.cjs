// Uses the repository's existing Playwright dependency. No remote service is exercised.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { once } = require('node:events');
const { chromium } = require('../../../src/node_modules/playwright');

async function main() {
  const { makeServer, root } = await import('../server.mjs');
  const { concepts } = await import('../catalog.js');
  const out = path.join(root,'artifacts');await fs.mkdir(out,{recursive:true});
  const server=makeServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}/`;
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const external=[], errors=[], failed=[], results=[];
  const requested = process.env.LAB_QA_IDS ? process.env.LAB_QA_IDS.split(',') : concepts.map(c=>c.id);
  assert.ok(requested.length && requested.every(id=>concepts.some(c=>c.id===id)), 'LAB_QA_IDS must contain valid comma-separated IDs');
  await context.route('**/*',route=>{
    if(route.request().url().startsWith(base))return route.continue();
    external.push(route.request().url());return route.abort();
  });
  const page=await context.newPage();
  page.setDefaultTimeout(6000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)failed.push(`${response.status()} ${response.url().replace(base,'')}`);});
  page.on('requestfailed',request=>failed.push(`${request.failure()?.errorText} ${request.url().replace(base,'')}`));
  async function check(name,fn) {
    const id = name.match(/^([0-9]{2}):/)?.[1];
    if (id && !requested.includes(id)) return;
    try {await fn();results.push({name,passed:true});console.log(`PASS ${name}`);}
    catch(error) {results.push({name,passed:false,error:error.message});console.error(`FAIL ${name}: ${error.message}`);}
  }
  async function open(id) {
    const c=concepts.find(c=>c.id===id);await page.goto(base+c.route);
    await page.locator('#candidate-root > *').first().waitFor();
    assert.ok(!(await page.locator('#candidate-root').innerText()).includes('예시를 불러오지 못했습니다'));
  }
  const click=selector=>page.locator(selector).click();
  try {
    await check('gallery: 20 routes, filters, empty recovery, comparison and keyboard evaluation',async()=>{
      await page.goto(base);await page.locator('.concept-card').first().waitFor();
      assert.equal(await page.locator('.concept-card').count(),20);
      await page.locator('button[data-family="학습"]').click();assert.equal(await page.locator('.concept-card').count(),5);
      await page.locator('#gallery-query').fill('no-matching-concept');assert.equal(await page.locator('.concept-card').count(),0);
      await click('[data-reset-search]');assert.equal(await page.locator('.concept-card').count(),20);
      await click('[data-compare="01"]');await click('[data-compare="06"]');await click('[data-compare="11"]');await click('[data-compare="20"]');
      assert.equal(await page.locator('.tray-item').count(),3);
      await page.locator('.compare-tray a').click();await page.locator('.comparison-scroll').waitFor();
      assert.equal(await page.locator('thead td').count(),3);
      await click('[data-review="01"]');await page.locator('#review-dialog[open]').waitFor();
      for(let i=0;i<4;i++)await page.locator(`[name="score${i}"]`).selectOption(String(i+2));
      await page.locator('[name="note"]').fill('<img src=x onerror=alert(1)> 비교 메모');
      await page.locator('[name="verdict"]').selectOption('shortlist');
      await page.getByRole('button',{name:'평가 저장',exact:true}).click();
      assert.ok((await page.locator('.comparison-scroll').innerText()).includes('<img src=x onerror=alert(1)> 비교 메모'));
      assert.equal(await page.locator('.comparison-scroll img').count(),0);
      await page.reload();await page.locator('.comparison-scroll').waitFor();
      assert.ok((await page.locator('.comparison-scroll').innerText()).includes('비교 메모'));
      await click('[data-review="01"]');await page.keyboard.press('Escape');assert.equal(await page.locator('#review-dialog[open]').count(),0);
      const pendingDownload=page.waitForEvent('download');await click('[data-export]');const downloaded=await pendingDownload;
      const filename=path.join(out,'evaluation-test.json');await downloaded.saveAs(filename);
      const exported=JSON.parse(await fs.readFile(filename,'utf8'));assert.equal(exported.concepts.length,20);assert.deepEqual(exported.selected,['01','06','11']);
      assert.equal(exported.concepts[0].review.note,'<img src=x onerror=alert(1)> 비교 메모');
      await page.screenshot({path:path.join(out,'comparison-desktop.png'),fullPage:true});
      await page.goto(base);await page.locator('.concept-card').first().waitFor();
      await page.screenshot({path:path.join(out,'gallery-desktop.png'),fullPage:true});
      await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'gallery-mobile.png'),fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.setViewportSize({width:1440,height:1000});
    });

    for(const concept of concepts) {
      await check(`${concept.id}: renders at 1440, 390 and 320px without viewport overflow`,async()=>{
        await page.setViewportSize({width:1440,height:1000});await open(concept.id);
        assert.ok((await page.locator('#candidate-root').innerText()).length>180);
        for(const width of [1440,390,320]) {
          await page.setViewportSize({width,height:width===1440?1000:844});
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${concept.id} overflows at ${width}px`);
          if(width!==320)await page.screenshot({path:path.join(out,`${concept.id}-${width===1440?'desktop':'mobile'}.png`),fullPage:true});
        }
      });
    }
    await page.setViewportSize({width:1440,height:1000});
    await check('01: search, empty result, recovery and retained query',async()=>{
      await open('01');await page.locator('#f1-query').fill('Redis');await page.locator('#f1-query').press('Enter');
      assert.ok((await page.locator('#f1-evidence').innerText()).includes('Redis'));
      assert.equal(await page.locator('.f1-result').count(),1);
      await page.reload();await page.locator('#f1-query').waitFor();assert.equal(await page.locator('#f1-query').inputValue(),'Redis');
      await page.locator('#f1-query').fill('zz-unfindable');await page.locator('#f1-query').press('Enter');assert.equal(await page.locator('.f1-result').count(),0);
      await page.locator('[data-action="reset-search"]').first().click();assert.equal(await page.locator('.f1-result').count(),12);
    });
    await check('02: passage explanation, close and reading size',async()=>{
      await open('02');await click('[data-action="explain"][data-value="0"]');assert.equal(await page.locator('#f1-margin-0 .f1-margin-note').count(),1);
      await click('[data-action="close-note"][data-value="0"]');assert.equal(await page.locator('#f1-margin-0 .f1-margin-note').count(),0);
      const before=await page.locator('output[aria-label="본문 글자 크기"]').innerText();await click('[data-action="font"][data-value="larger"]');assert.notEqual(await page.locator('output[aria-label="본문 글자 크기"]').innerText(),before);
    });
    await check('03: selectable documents swap and same-document guard',async()=>{
      await open('03');await page.locator('#f1-compare-a').selectOption('docker');await page.locator('#f1-compare-b').selectOption('redis');
      await click('[data-action="swap-docs"]');assert.equal(await page.locator('#f1-compare-a').inputValue(),'redis');assert.equal(await page.locator('#f1-compare-b').inputValue(),'docker');
      await page.locator('#f1-compare-b').selectOption('redis');assert.equal(await page.locator('[data-action="export-comparison"]').isDisabled(),true);
    });
    await check('04: graph selection updates context and is keyboard operable',async()=>{
      await open('04');const node=page.locator('[data-f1-node][data-value="mcp"]');await node.focus();await page.keyboard.press('Enter');
      assert.equal(await page.locator('[data-f1-node][data-value="mcp"]').getAttribute('aria-pressed'),'true');assert.ok((await page.locator('#f1-graph-inspector').innerText()).includes('MCP'));
    });
    await check('05: reading collection persists and can be reordered',async()=>{
      await open('05');await click('[data-action="starter-collection"]');assert.equal(await page.locator('.f1-saved-list>li').count(),3);
      const first=await page.locator('.f1-saved-title').first().innerText();await page.locator('[data-action="move-down"]').first().click();assert.notEqual(await page.locator('.f1-saved-title').first().innerText(),first);
      await page.reload();await page.locator('.f1-saved-list').waitFor();assert.equal(await page.locator('.f1-saved-list>li').count(),3);
    });

    // Feature checks for the remaining modules are kept in a separate file so
    // interactions stay easy to update without weakening the viewport matrix.
    const { checkFeatures }=require('./feature-flows.cjs');
    await checkFeatures({check,open,page,click,out,assert});

    const { checkReviewRegressions }=require('./review-regressions.cjs');
    await checkReviewRegressions({check,open,page,click,assert});

    await check('malformed persisted evaluation cannot crash comparison or create elements',async()=>{
      await page.addInitScript(()=>{
        localStorage.setItem('nodove-docs-agent-lab:v1:comparison','["01"]');
        localStorage.setItem('nodove-docs-agent-lab:v1:reviews',JSON.stringify({'01':{scores:[1,2,3,999],note:{toString:{}},verdict:{}}}));
      });
      await page.goto(base+'index.html#compare');await page.locator('.comparison-scroll').waitFor();
      assert.ok((await page.locator('.comparison-scroll').innerText()).includes('아직 평가 전'));
      await click('[data-review="01"]');assert.equal(await page.locator('[name="note"]').inputValue(),'');await page.keyboard.press('Escape');
    });

    await check('all pages request only lab assets and have no runtime/network failures',async()=>{
      assert.deepEqual(external,[]);assert.deepEqual(failed,[]);assert.deepEqual(errors,[]);
    });
  } finally {
    await browser.close();await new Promise(resolve=>server.close(resolve));
    const report={date:new Date().toISOString(),conceptIds:requested,viewports:[1440,390,320],results,external,errors,failed};
    await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
  }
  if(results.some(result=>!result.passed))process.exitCode=1;
  console.log(`Browser evidence: ${out}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
