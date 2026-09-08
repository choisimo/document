const assert = require('node:assert/strict');

function verifyCompletionEvidence(body, answer) {
  let content = '';
  let terminalCount = 0;
  for (const event of body.replace(/\r\n/g, '\n').split(/\n\n/)) {
    const data = event.split('\n').filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).replace(/^ /, '')).join('\n');
    if (!data) continue;
    assert.equal(terminalCount, 0, 'No data may follow the terminal completion');
    if (data.trim() === '[DONE]') { terminalCount++; continue; }
    let frame;
    try { frame = JSON.parse(data); } catch { assert.fail('Malformed completion stream'); }
    assert.ok(!frame.error, 'Completion stream must not contain an API error');
    const delta = frame.choices?.[0]?.delta?.content;
    if (typeof delta === 'string') content += delta;
  }
  assert.equal(terminalCount, 1, 'Completion stream must terminate exactly once');
  assert.ok(content.trim().length > 10 && /[가-힣]/.test(content), 'The service must produce Korean answer content');
  assert.equal(answer.trim(), content.trim(), 'The displayed answer must equal the service response');
  return { answerCharacters: content.length, koreanAnswer: true, terminalCount };
}

module.exports = { verifyCompletionEvidence };
