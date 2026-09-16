exports.checkFeatures=async function ({check,open,page,click,assert,out}) {
  await check('06: completing a learning step advances and restores progress',async()=>{
    await open('06');await click('[data-f2-action="complete-step"]');assert.equal(await page.locator('.f2-step-done').count(),1);
    await page.reload();await page.locator('.f2-step-done').waitFor();assert.equal(await page.locator('.f2-step-done').count(),1);
    await click('[data-f2-action="reset-path"]');assert.equal(await page.locator('.f2-step-done').count(),0);
  });
  await check('07: answer selection, grading explanation and next question',async()=>{
    await open('07');assert.equal(await page.locator('[data-f2-action="grade-answer"]').isDisabled(),true);
    const question=await page.locator('#f2-question').innerText();await page.locator('[name="f2-quiz-answer"]').first().check();await click('[data-f2-action="grade-answer"]');
    assert.equal(await page.locator('.f2-feedback').count(),1);await click('[data-f2-action="next-question"]');assert.notEqual(await page.locator('#f2-question').innerText(),question);
    await page.reload();await page.locator('#f2-question').waitFor();assert.notEqual(await page.locator('#f2-question').innerText(),question);
  });
  await check('08: recall requires reveal; revisiting rotates queue and remembering removes card',async()=>{
    await open('08');assert.equal(await page.locator('[data-f2-action="remember-card"]').isDisabled(),true);
    const first=await page.locator('.f2-card-prompt').innerText();await click('[data-f2-action="flip-card"]');assert.equal(await page.locator('.f2-flashcard').getAttribute('aria-pressed'),'true');
    await click('[data-f2-action="revisit-card"]');assert.notEqual(await page.locator('.f2-card-prompt').innerText(),first);assert.equal(await page.locator('.f2-queue-list>li').count(),6);
    await click('[data-f2-action="flip-card"]');await click('[data-f2-action="remember-card"]');assert.equal(await page.locator('.f2-queue-list>li').count(),5);
    await page.reload();await page.locator('.f2-queue-list').waitFor();assert.equal(await page.locator('.f2-queue-list>li').count(),5);
  });
  await check('09: stepping updates variables and finishes the correct closed example',async()=>{
    await open('09');await page.locator('#f2-code-example').selectOption('sum');await click('[data-f2-action="step-code"]');assert.ok((await page.locator('.f2-variable-table').innerText()).includes('minutes'));
    for(let i=0;i<18&&!await page.locator('[data-f2-action="step-code"]').isDisabled();i++)await click('[data-f2-action="step-code"]');
    assert.ok((await page.locator('.f2-variable-table').innerText()).includes('26'));assert.equal((await page.locator('.f2-run-state').innerText()).trim(),'완료');
    await click('[data-f2-action="reset-code"]');assert.equal(await page.locator('.f2-variable-table').count(),0);
  });
  await check('10: notebook preserves drafts across note switches and reload and exports current text',async()=>{
    await open('10');await page.locator('#f2-note-title').fill('공개 자료에서 배운 점');await page.locator('#f2-note-body').fill('근거와 해석을 구분합니다.');await click('[data-f2-action="save-note"]');
    const first=await page.locator('[data-f2-action="open-note"]').first().getAttribute('data-f2-note');
    await click('[data-f2-action="new-note"]');await page.locator('#f2-note-body').fill('아직 저장 버튼을 누르지 않은 초안');
    const second=await page.locator('.f2-note-active').getAttribute('data-f2-note');
    await page.locator(`[data-f2-action="open-note"][data-f2-note="${first}"]`).click();assert.equal(await page.locator('#f2-note-body').inputValue(),'근거와 해석을 구분합니다.');
    await page.locator(`[data-f2-action="open-note"][data-f2-note="${second}"]`).click();assert.equal(await page.locator('#f2-note-body').inputValue(),'아직 저장 버튼을 누르지 않은 초안');
    await page.locator(`[data-f2-action="open-note"][data-f2-note="${first}"]`).click();
    await page.reload();await page.locator('#f2-note-body').waitFor();assert.equal(await page.locator('#f2-note-body').inputValue(),'근거와 해석을 구분합니다.');
    const download=page.waitForEvent('download');await click('[data-f2-action="export-note"]');const file=await download;assert.ok(file.suggestedFilename().endsWith('.md'));
    const filename=require('node:path').join(out,'notebook-export.md');await file.saveAs(filename);assert.ok((await require('node:fs/promises').readFile(filename,'utf8')).includes('근거와 해석을 구분합니다.'));
  });
  await check('15: prompt variables update preview, required validation and saved template reload',async()=>{
    await open('15');await page.locator('#f3-prompt-name').fill('공개 자료 설명 템플릿');await page.locator('#f3-prompt-goal').fill('자료의 신뢰 경계를 설명해 주세요');
    assert.ok((await page.locator('[data-f3-preview]').innerText()).includes('자료의 신뢰 경계를 설명해 주세요'));
    await click('[data-f3-action="prompt-save"]');
    const id=await page.locator('#f3-prompt-library').inputValue();assert.ok(id);
    await page.reload();await page.locator('#f3-prompt-library').waitFor();await page.locator('#f3-prompt-library').selectOption(id);
    assert.equal(await page.locator('#f3-prompt-name').inputValue(),'공개 자료 설명 템플릿');
    await page.locator('#f3-prompt-goal').fill('');await click('[data-f3-action="prompt-save"]');
    assert.ok((await page.locator('#f3-prompt-goal-error').innerText()).length>0);
    assert.equal(await page.locator('#f3-prompt-name').inputValue(),'공개 자료 설명 템플릿');
  });
  await check('16: filter, bulk review and persisted completion',async()=>{
    await open('16');await page.locator('[data-f4-select]').first().check();await click('[data-f4-bulk]');
    await click('[data-f4-filter="reviewed"]');assert.equal(await page.locator('tbody tr').count(),1);
    await page.reload();await page.locator('[data-f4-filter="reviewed"]').waitFor();await click('[data-f4-filter="reviewed"]');assert.equal(await page.locator('tbody tr').count(),1);
    await click('[data-f4-reset]');assert.equal(await page.locator('tbody tr').count(),0);
  });
  await check('17: create task, move stage and durable board',async()=>{
    await open('17');await page.locator('#f4-add-task [name="title"]').fill('공개 문서 보완 검증');await page.locator('#f4-add-task [type="submit"]').click();
    const task=page.locator('.f4-task').filter({hasText:'공개 문서 보완 검증'});
    assert.equal(await task.count(),1);await task.locator('[data-step="1"]').click();
    assert.ok((await page.locator('.f4-lane[data-stage="1"]').innerText()).includes('공개 문서 보완 검증'));
    await page.reload();await page.locator('.f4-board').waitFor();assert.ok((await page.locator('.f4-lane[data-stage="1"]').innerText()).includes('공개 문서 보완 검증'));
  });
  await check('18: review note and accepted proposal persist without modifying source',async()=>{
    await open('18');await page.locator('[data-f4-review-note]').fill('근거가 더 명확해졌습니다.');await click('[data-f4-decision="accepted"]');
    assert.equal(await page.locator('[data-f4-decision="accepted"]').getAttribute('aria-pressed'),'true');
    await page.reload();await page.locator('[data-f4-review-note]').waitFor();assert.equal(await page.locator('[data-f4-review-note]').inputValue(),'근거가 더 명확해졌습니다.');
    assert.equal(await page.locator('[data-f4-decision="accepted"]').getAttribute('aria-pressed'),'true');
    await click('[data-f4-decision="held"]');assert.equal(await page.locator('[data-f4-decision="held"]').getAttribute('aria-pressed'),'true');
  });
  await check('19: private/credential URLs rejected; public links stored without fetching',async()=>{
    await open('19');const form=page.locator('#f4-collect-form');await form.locator('[name="title"]').fill('공개 참고 문서');
    const count=await page.locator('.f4-reference').count();
    for(const url of ['https://127.0.0.1/private','https://10.0.0.1/','https://user:example@example.com/','https://example.com/?token=illustration']) {
      await form.locator('[name="url"]').fill(url);await form.locator('[type="submit"]').click();assert.equal(await page.locator('.f4-reference').count(),count);assert.ok((await page.locator('#f4-link-error').innerText()).length>0);
    }
    await form.locator('[name="url"]').fill('https://example.com/public-guide');await form.locator('[type="submit"]').click();assert.equal(await page.locator('.f4-reference').count(),count+1);
    await page.locator('#f4-source-search').fill('공개 참고 문서');assert.equal(await page.locator('.f4-reference').count(),1);
    await page.reload();await page.locator('.f4-reference').first().waitFor();assert.ok((await page.locator('[data-f4-references]').innerText()).includes('공개 참고 문서'));
  });
  await check('20: independent workspaces retain notes, tasks and resource choices',async()=>{
    await open('20');const initial=await page.locator('#f4-space-picker').inputValue();const originalNote=await page.locator('#f4-space-notes').inputValue();
    await page.locator('#f4-new-space [name="name"]').fill('검증 작업 공간');await page.locator('#f4-new-space [type="submit"]').click();
    const created=await page.locator('#f4-space-picker').inputValue();assert.notEqual(initial,created);
    await page.locator('#f4-space-notes').fill('다음에 이어갈 공개 메모');await page.locator('#f4-add-todo [name="title"]').fill('근거 확인하기');await page.locator('#f4-add-todo [type="submit"]').click();
    await page.locator('[data-f4-todo]').check();await page.locator('.f4-resource-picker summary').click();await page.locator('[data-f4-resource="mcp"]').check();
    await page.locator('#f4-space-picker').selectOption(initial);assert.equal(await page.locator('#f4-space-notes').inputValue(),originalNote);
    await page.locator('#f4-space-picker').selectOption(created);await page.reload();await page.locator('#f4-space-notes').waitFor();
    assert.equal(await page.locator('#f4-space-notes').inputValue(),'다음에 이어갈 공개 메모');assert.equal(await page.locator('[data-f4-todo]').isChecked(),true);
    assert.ok((await page.locator('[data-f4-selected-resources]').innerText()).includes('MCP'));
  });
  await check('11: workflow pause/resume, completion and cancellation',async()=>{
    await open('11');await click('[data-f3-action="wf-control"]');
    await click('[data-f3-action="wf-control"]');assert.ok((await page.locator('.f3-run-progress').innerText()).includes('일시정지'));
    await click('[data-f3-action="wf-control"]');
    await page.waitForFunction(()=>document.querySelector('.f3-run-progress')?.textContent.includes('완료 · 3/3'),{},{timeout:12000});
    assert.ok((await page.locator('.f3-result-body').innerText()).includes('검토'));
    await click('[data-f3-action="wf-control"]');await click('[data-f3-action="wf-cancel"]');
    assert.ok((await page.locator('.f3-run-progress').innerText()).includes('취소됨'));
  });
  await check('12: partial failure preserves two roles, retry only failed role and synthesize',async()=>{
    await open('12');await click('[data-f3-action="research-start"]');
    await page.locator('[data-f3-action="research-retry"]').waitFor();
    assert.equal(await page.locator('.f3-role-status[data-state="done"]').count(),2);
    assert.equal(await page.locator('[data-f3-action="research-synthesize"]').isDisabled(),true);
    await click('[data-f3-action="research-retry"]');
    await page.waitForFunction(()=>!document.querySelector('[data-f3-action="research-synthesize"]').disabled);
    assert.equal(await page.locator('.f3-role-status[data-state="done"]').count(),3);
    await click('[data-f3-action="research-synthesize"]');assert.equal(await page.locator('.f3-synthesis-result').count(),1);
  });
  await check('13: trace filtering, details, empty recovery and replay pause',async()=>{
    await open('13');await click('[data-f3-action="trace-filter"][data-filter="error"]');assert.equal(await page.locator('.f3-event').count(),1);
    await page.locator('.f3-event').click();assert.ok((await page.locator('.f3-inspector').innerText()).includes('오류'));
    await page.locator('#f3-trace-query').fill('nothing-matches');assert.equal(await page.locator('.f3-event').count(),0);
    await click('[data-f3-action="trace-clear"]');assert.equal(await page.locator('.f3-event').count(),9);
    await click('[data-f3-action="trace-play"]');await click('[data-f3-action="trace-play"]');
    assert.ok((await page.locator('.f3-replay-bar').innerText()).includes('일시정지'));
    await click('[data-f3-action="trace-all"]');assert.equal(await page.locator('.f3-event').count(),9);
  });
  await check('14: blocked policy prevents approval and decisions persist',async()=>{
    await open('14');const initial=await page.locator('#f3-request').inputValue();
    await page.locator('#f3-policy-note').selectOption('deny');
    assert.equal(await page.locator('[data-f3-action="permission-approve"]').isDisabled(),true);
    await page.locator('#f3-policy-note').selectOption('review');
    await page.locator('#f3-decision-note').fill('이 예시 요청만 검토');
    await click('[data-f3-action="permission-approve"]');
    assert.ok((await page.locator('#f3-permission-status').innerText()).includes('승인 판단'));
    await page.reload();await page.locator('#f3-request').waitFor();await page.locator('#f3-request').selectOption(initial);
    await page.locator('.f3-history-list summary').first().click();
    assert.ok((await page.locator('.f3-history-list').innerText()).includes('이 예시 요청만 검토'));
    assert.equal(await page.locator('[data-f3-action="permission-approve"]').isDisabled(),true);
  });
};
