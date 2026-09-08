const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verifyCompletionEvidence } = require('./ai-live-evidence.cjs');

const answer = 'SSH 설정은 원격 접속의 인증과 접근 범위를 관리합니다.';
const frame = JSON.stringify({ choices: [{ delta: { content: answer } }] });
const stream = `data: ${frame}\n\ndata: [DONE]\n\n`;

test('live AI evidence accepts matching Korean SSE content with a terminal event', () => {
  assert.equal(verifyCompletionEvidence(stream, answer).terminalCount, 1);
  assert.equal(verifyCompletionEvidence(stream.replaceAll('\n', '\r\n'), answer).terminalCount, 1);
});

test('HTTP 200, UI fallback text, errors and truncated streams cannot prove AI success', () => {
  for (const [body, displayed] of [
    ['data: [DONE]\n\n', '응답 내용이 없습니다. 다시 질문해 주세요.'],
    ['data: {"error":{"message":"upstream failed"}}\n\ndata: [DONE]\n\n', answer],
    [`data: ${frame}\n\n`, answer],
    [stream + 'data: [DONE]\n\n', answer],
    ['data: invalid\n\ndata: [DONE]\n\n', answer],
    [stream, '실제 문서 목차만 표시된 상태입니다.'],
  ]) assert.throws(() => verifyCompletionEvidence(body, displayed), assert.AssertionError);
});
