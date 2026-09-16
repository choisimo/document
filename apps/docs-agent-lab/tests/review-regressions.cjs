// Reproductions from the independent review, using the same isolated browser.
exports.checkReviewRegressions = async function ({ check, open, page, click, assert }) {
  const prefix = 'nodove-docs-agent-lab:v1:';
  const put = (key, value) => page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: prefix + key, value });

  await check('09: malformed stored example falls back consistently without coercion', async () => {
    for (const example of [['sum'], { toString: 'bad' }]) {
      await put('f2:09:code-walkthrough:v1', { example, position: 0 });
      await open('09');
      assert.equal(await page.locator('#f2-code-example').inputValue(), 'filter');
      for (let i = 0; i < 18 && !await page.locator('[data-f2-action="step-code"]').isDisabled(); i++) {
        await click('[data-f2-action="step-code"]');
      }
      assert.ok((await page.locator('.f2-console pre').innerText()).includes('[8, 6]'));
    }
  });

  await check('15: invalid stored audience and format safely use defaults', async () => {
    for (const invalid of [['self'], { toString: 'bad' }]) {
      await put('f3:15:prompt-library', [{
        id: 'prompt-review-invalid', savedAt: '',
        fields: { template: 'summary', name: '공개 자료 검토', goal: '근거를 설명하기',
          audience: invalid, format: invalid, docA: 'graph', docB: 'mcp' },
      }]);
      await open('15');
      assert.equal(await page.locator('#f3-prompt-audience').inputValue(), 'beginner');
      assert.equal(await page.locator('#f3-prompt-format').inputValue(), 'bullets');
      assert.ok((await page.locator('[data-f3-preview]').innerText()).includes('처음 배우는 동료'));
    }
  });

  await check('15: saving an existing prompt preserves a separate unsaved draft', async () => {
    await put('f3:15:prompt-library', []);
    await open('15');
    await page.locator('#f3-prompt-name').fill('보관한 공개 자료 질문');
    await click('[data-f3-action="prompt-save"]');
    const savedId = await page.locator('#f3-prompt-library').inputValue();
    await page.locator('#f3-prompt-library').selectOption('');
    await page.locator('#f3-prompt-name').fill('따로 작성하던 새 초안');
    await page.locator('#f3-prompt-goal').fill('아직 보관하지 않은 질문도 유지하기');
    await page.locator('#f3-prompt-library').selectOption(savedId);
    await click('[data-f3-action="prompt-save"]');
    await page.locator('#f3-prompt-library').selectOption('');
    assert.equal(await page.locator('#f3-prompt-name').inputValue(), '따로 작성하던 새 초안');
    assert.equal(await page.locator('#f3-prompt-goal').inputValue(), '아직 보관하지 않은 질문도 유지하기');
    await click('[data-f3-action="prompt-save"]');
    assert.notEqual(await page.locator('#f3-prompt-library').inputValue(), savedId);
    await page.locator('#f3-prompt-library').selectOption('');
    assert.notEqual(await page.locator('#f3-prompt-name').inputValue(), '따로 작성하던 새 초안');
  });

  await check('14: invalid saved write approval cannot lock a pending request', async () => {
    const invalid = { request: 'note-01', verdict: 'approved', policy: 'allow', note: '잘못된 예시 기록', time: '' };
    await put('f3:14:permission-desk', { policies: { note: 'review' }, decisions: { 'note-01': invalid }, history: [invalid] });
    await open('14');
    await page.locator('#f3-request').selectOption('note-01');
    assert.equal(await page.locator('[data-f3-action="permission-approve"]').isDisabled(), false);
    assert.equal(await page.locator('.f3-history-list summary').count(), 0);
    assert.ok(!(await page.locator('#f3-permission-status').innerText()).includes('승인 판단을 기록했습니다'));
  });

  await check('20: unfinished tasks stay with their workspace across switches and reload', async () => {
    await open('20');
    const choices = await page.locator('#f4-space-picker option').evaluateAll(options => options.map(option => option.value));
    assert.ok(choices.length >= 2);
    const field = () => page.locator('#f4-add-todo [name="title"]');
    await page.locator('#f4-space-picker').selectOption(choices[0]);
    await field().fill('첫 공간에서 작성 중인 할 일');
    await page.locator('#f4-space-picker').selectOption(choices[1]);
    await field().fill('둘째 공간의 별도 초안');
    await page.locator('#f4-space-picker').selectOption(choices[0]);
    assert.equal(await field().inputValue(), '첫 공간에서 작성 중인 할 일');
    await page.reload();
    await field().waitFor();
    assert.equal(await field().inputValue(), '첫 공간에서 작성 중인 할 일');
    await page.locator('#f4-add-todo [type="submit"]').click();
    assert.equal(await field().inputValue(), '');
    await page.locator('#f4-space-picker').selectOption(choices[1]);
    assert.equal(await field().inputValue(), '둘째 공간의 별도 초안');
  });
};
