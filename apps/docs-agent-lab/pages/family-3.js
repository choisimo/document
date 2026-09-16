import { h, icon, button, tag, download } from '../shared.js';

// These candidates only combine the curated excerpts passed by the gallery.
// Timers illustrate state transitions; they never invoke an agent or a tool.
const STORE = {
  workflow: 'f3:11:workflow-title',
  research: 'f3:12:research-topic',
  timeline: 'f3:13:timeline-filter',
  permissions: 'f3:14:permission-desk',
  prompts: 'f3:15:prompt-library',
};

const action = (label, name, { kind = '', symbol = '', key = name, disabled = false, attrs = '' } = {}) =>
  button(`${symbol ? icon(symbol) : ''}<span>${h(label)}</span>`,
    `type="button" data-f3-action="${h(name)}" data-f3-focus="${h(key)}" ${disabled ? 'disabled' : ''} ${attrs}`, kind);

const localLabel = (text = '로컬 예시') => `<span class="f3-local">${icon('bolt')}${h(text)}</span>`;
const getDoc = (docs, id) => docs.find(doc => doc.id === id);
const textValue = (value, fallback = '', limit = 500) => typeof value === 'string' ? value.slice(0, limit) : fallback;
const readStore = (ctx, key, fallback) => {
  try { return ctx.store.get(key, fallback); } catch { return fallback; }
};
const writeStore = (ctx, key, value) => {
  try { return ctx.store.set(key, value) !== false; } catch { return false; }
};

function excerpt(doc, key) {
  if (!doc) return '<p class="muted">이 예시에 연결된 공개 발췌문이 없습니다.</p>';
  return `<details class="f3-source" data-f3-detail="${h(key)}">
    <summary data-f3-focus="source-${h(key)}">${icon('file')}<span>${h(doc.title)}</span><span class="f3-source-label">발췌 보기</span></summary>
    <div class="f3-source-body"><span class="eyebrow">공개 문서의 로컬 발췌</span><p>${h(doc.summary)}</p><p>${h(doc.detail)}</p><span class="f3-source-path mono">${h(doc.source)}</span></div>
  </details>`;
}

function view(root, ctx) {
  const timers = new Set();
  const listeners = [];
  let disposed = false;
  return {
    render(markup, fallback = '') {
      if (disposed) return;
      const active = root.ownerDocument.activeElement;
      const hadFocus = root.contains(active);
      const key = hadFocus ? active.dataset.f3Focus : null;
      const selection = hadFocus && typeof active.selectionStart === 'number'
        ? [active.selectionStart, active.selectionEnd, active.selectionDirection] : null;
      const opened = new Set([...root.querySelectorAll('details[open][data-f3-detail]')].map(el => el.dataset.f3Detail));
      root.innerHTML = markup;
      root.querySelectorAll('details[data-f3-detail]').forEach(el => { el.open = opened.has(el.dataset.f3Detail); });
      if (hadFocus) {
        const controls = [...root.querySelectorAll('[data-f3-focus]')];
        const target = controls.find(el => el.dataset.f3Focus === key && !el.disabled)
          || controls.find(el => el.dataset.f3Focus === fallback && !el.disabled)
          || root.querySelector('[data-f3-anchor]');
        target?.focus({ preventScroll: true });
        if (selection && target?.dataset.f3Focus === key && typeof target.setSelectionRange === 'function') {
          try { target.setSelectionRange(...selection); } catch { /* Selects have no text selection. */ }
        }
      }
    },
    on(event, handler) {
      root.addEventListener(event, handler);
      listeners.push([event, handler]);
    },
    later(handler, delay) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!disposed) handler();
      }, delay);
      timers.add(timer);
    },
    stop() { timers.forEach(clearTimeout); timers.clear(); },
    tell(message) { if (!disposed) ctx.announce?.(message); },
    cleanup() {
      disposed = true;
      timers.forEach(clearTimeout);
      timers.clear();
      listeners.forEach(([event, handler]) => root.removeEventListener(event, handler));
    },
  };
}

function workflow(root, ctx, docs) {
  const ui = view(root, ctx);
  const sources = ['retrieval', 'graph', 'mcp'].map(id => getDoc(docs, id)).filter(Boolean);
  const steps = [
    { name: '검색', en: 'SEARCH', symbol: 'search', detail: '공개 발췌문에서 근거 후보 선택', result: '근거 묶음' },
    { name: '종합', en: 'SYNTHESIZE', symbol: 'layers', detail: '선택한 구절을 하나의 초안으로', result: '요약 초안' },
    { name: '검토', en: 'REVIEW', symbol: 'shield', detail: '출처와 설명의 범위를 재확인', result: '검토 메모' },
  ];
  const state = {
    title: textValue(readStore(ctx, STORE.workflow, ''), '', 120) || '에이전트의 중단·재개 흐름 정리',
    phase: 'idle', step: 0, complete: 0, selected: 0, log: [], error: '', sessionOnly: false,
  };
  const phaseLabel = () => ({ idle: '시작 전', running: '진행 중', paused: '일시정지', cancelled: '취소됨', done: '완료' })[state.phase];
  const record = message => state.log.push(message);
  const advance = () => {
    if (state.phase !== 'running') return;
    record(`${steps[state.step].name} 단계 완료`);
    state.complete += 1;
    if (state.complete === steps.length) {
      state.phase = 'done';
      ui.tell('로컬 예시의 검색, 종합, 검토가 모두 완료되었습니다.');
    } else {
      state.step += 1;
      state.selected = state.step;
      ui.tell(`${steps[state.step].name} 단계로 이동했습니다.`);
      ui.later(advance, 2400);
    }
    render();
  };
  const result = () => {
    const i = state.selected;
    if (state.complete <= i) {
      const current = state.step === i && ['running', 'paused'].includes(state.phase);
      return `<div class="f3-stage-placeholder"><div class="f3-orbit ${current && state.phase === 'running' ? 'f3-is-running' : ''}">${icon(steps[i].symbol)}</div>
        <h3>${current ? `${steps[i].name} ${state.phase === 'paused' ? '단계에서 멈췄습니다' : '단계를 살펴보는 중'}` : '아직 이 단계의 결과가 없습니다'}</h3>
        <p class="muted">${state.phase === 'cancelled' ? '완료한 단계는 남아 있습니다. 다시 시작하면 새 예시를 실행합니다.' : current ? '아래 실행 제어로 언제든 멈추거나 이어갈 수 있습니다.' : '예시를 시작하면 검색 → 종합 → 검토 순서로 결과가 채워집니다.'}</p>
        <span class="f3-caption">외부 요청 없이, 준비된 발췌문으로 진행합니다.</span></div>`;
    }
    if (i === 0) return `<p class="f3-result-lead">공개 발췌문 ${sources.length}개를 근거 후보로 묶었습니다.</p><div class="f3-evidence-list">${sources.map((doc, index) => `<div class="f3-numbered-excerpt"><span class="f3-number">0${index + 1}</span><div><p>${h(doc.summary)}</p>${excerpt(doc, `wf-${doc.id}`)}</div></div>`).join('')}</div>`;
    if (i === 1) return `<div class="f3-draft"><span class="eyebrow">PREPARED SAMPLE · 01</span><h3>${h(state.title.trim())}</h3><p>검색으로 근거 후보를 고른 뒤, 단계와 전이 조건을 명시해 작업의 흐름을 검토합니다. 도구가 실제 변경을 수행하기 전에는 권한과 입력을 확인하는 검토 지점을 둡니다.</p><aside>이 문단은 준비된 예시입니다. 작업 제목을 바꾸어도 새로운 AI 답변을 생성하지 않습니다.</aside></div>${sources.filter(doc => ['graph', 'mcp'].includes(doc.id)).map(doc => excerpt(doc, `wf-draft-${doc.id}`)).join('')}`;
    return `<div class="f3-review-list">${['요약에 사용한 공개 발췌문을 함께 표시', '검색 결과와 확정된 근거를 구분', '쓰기 작업 전 검토 지점을 명시'].map(label => `<div>${icon('check')}<span>${h(label)}</span><span class="f3-caption">예시 확인</span></div>`).join('')}</div><p class="f3-callout">검토 항목도 미리 준비된 로컬 예시입니다. 실제 모델의 품질 평가나 운영 환경 검증을 의미하지 않습니다.</p>`;
  };
  function render() {
    const locked = ['running', 'paused'].includes(state.phase);
    const primary = { idle: '예시 시작', running: '일시정지', paused: '이어서 실행', cancelled: '다시 시작', done: '다시 실행' }[state.phase];
    ui.render(`<section class="f3-shell f3-workflow" aria-label="작업 흐름 실습" data-f3-phase="${state.phase}" data-f3-completed="${state.complete}">
      <div class="f3-workflow-brief"><div><span class="eyebrow">WORKFLOW / 3 STEPS</span><h2 class="f3-heading" tabindex="-1" data-f3-anchor>한 단계씩, 통제 가능한 작업</h2><p class="muted">계획을 읽고 시작하세요. 멈춘 단계에서 이어갈 수 있습니다.</p></div>${localLabel()}</div>
      <div class="f3-job-line"><label for="f3-wf-title">작업 제목</label><input class="field" id="f3-wf-title" data-f3-focus="wf-title" value="${h(state.title)}" maxlength="120" ${locked ? 'disabled' : ''} aria-invalid="${!!state.error}" aria-describedby="f3-wf-error"><span class="f3-error" id="f3-wf-error">${h(state.error)}</span></div>
      <ol class="f3-pipeline">${steps.map((step, i) => {
        const status = i < state.complete ? '완료' : i === state.step && locked ? phaseLabel() : state.phase === 'cancelled' && i === state.step ? '취소' : '대기';
        return `<li class="f3-pipeline-step ${i < state.complete ? 'f3-is-done' : ''} ${i === state.step && state.phase === 'running' ? 'f3-is-current' : ''}"><button type="button" class="f3-stage-button" data-f3-action="wf-select" data-index="${i}" data-f3-focus="wf-stage-${i}" aria-pressed="${i === state.selected}"><span class="f3-stage-top"><span class="f3-stage-icon">${icon(i < state.complete ? 'check' : step.symbol)}</span><span class="f3-caption">0${i + 1} / ${step.en}</span><span class="f3-step-state">${h(status)}</span></span><strong>${step.name}</strong><span class="muted">${step.detail}</span></button></li>`;
      }).join('')}</ol>
      <div class="f3-run-controls"><div class="f3-actions">${action(primary, 'wf-control', { kind: 'primary', symbol: state.phase === 'running' ? 'clock' : 'play', key: 'wf-main', disabled: !sources.length })}${action('실행 취소', 'wf-cancel', { disabled: !locked, symbol: 'close' })}</div><div class="f3-run-progress"><span role="status">${h(phaseLabel())} · ${state.complete}/3 단계</span><progress max="3" value="${state.complete}" aria-label="완료한 단계">${state.complete}/3</progress></div></div>
      ${!sources.length ? '<p class="f3-error">공개 발췌문이 없어 시작할 수 없습니다. 자료가 포함된 예시를 다시 열어 주세요.</p>' : ''}
      ${state.sessionOnly ? '<p class="f3-callout">작업 제목은 이번 화면에만 보관됩니다. 브라우저 저장 공간을 사용할 수 없습니다.</p>' : ''}
      <div class="f3-workflow-output"><article class="panel f3-result-panel"><div class="panel-head"><div><span class="eyebrow">STEP 0${state.selected + 1} OUTPUT</span><h3>${steps[state.selected].result}</h3></div>${tag('로컬 예시')}</div><div class="f3-result-body">${result()}</div></article><aside class="f3-run-notes"><span class="eyebrow">RUN NOTES</span><h3>흐름의 흔적</h3><p class="muted">현재 실행에서 일어난 변화입니다.</p>${state.log.length ? `<ol>${state.log.slice(-6).map((message, i) => `<li><span class="mono">${String(Math.max(0, state.log.length - 6) + i + 1).padStart(2, '0')}</span><span>${h(message)}</span></li>`).join('')}</ol>` : '<div class="f3-notes-empty">시작 버튼을 누르면<br>첫 기록이 남습니다.</div>'}</aside></div>
      <p class="f3-footnote">중단·재개 상태는 현재 화면에서만 유지됩니다. 새로고침하면 시작 전 상태로 돌아갑니다.</p>
    </section>`, 'wf-main');
  }
  ui.on('input', event => {
    if (event.target.id !== 'f3-wf-title') return;
    state.title = event.target.value.slice(0, 120);
    if (state.error && state.title.trim()) {
      state.error = '';
      root.querySelector('#f3-wf-error').textContent = '';
      event.target.setAttribute('aria-invalid', 'false');
    }
  });
  ui.on('click', event => {
    const target = event.target.closest('[data-f3-action]');
    if (!target || !root.contains(target) || target.disabled) return;
    const command = target.dataset.f3Action;
    if (command === 'wf-select') state.selected = Number(target.dataset.index);
    else if (command === 'wf-cancel' && ['running', 'paused'].includes(state.phase)) {
      ui.stop(); state.phase = 'cancelled'; record('사용자가 실행 취소'); ui.tell('실행을 취소했습니다. 완료한 단계의 결과는 남아 있습니다.');
    } else if (command === 'wf-control') {
      if (state.phase === 'running') {
        ui.stop(); state.phase = 'paused'; record(`${steps[state.step].name} 단계에서 일시정지`); ui.tell('일시정지했습니다. 이어서 실행을 눌러 재개하세요.');
      } else if (state.phase === 'paused') {
        state.phase = 'running'; record(`${steps[state.step].name} 단계 재개`); ui.later(advance, 2400); ui.tell('멈춘 단계부터 다시 진행합니다.');
      } else {
        if (!state.title.trim()) {
          state.error = '작업 제목을 입력해 주세요.'; render(); root.querySelector('#f3-wf-title').focus(); return;
        }
        if (!sources.length) return;
        ui.stop(); state.phase = 'running'; state.step = 0; state.complete = 0; state.selected = 0; state.log = [];
        state.sessionOnly = !writeStore(ctx, STORE.workflow, state.title.trim());
        record('로컬 예시 시작 · 검색 단계'); ui.later(advance, 2400); ui.tell('공개 발췌문으로 로컬 예시를 시작했습니다.');
      }
    } else return;
    render();
  });
  render();
  return () => ui.cleanup();
}

const RESEARCH_TOPICS = [
  { id: 'agent', title: '중단과 재시도가 있는 에이전트', ids: ['graph', 'retrieval', 'mcp'], conclusion: '전이 조건을 명시하고, 근거를 확인하며, 실제 변경 전에 검토 지점을 둡니다.' },
  { id: 'recovery', title: '변경 전에 준비하는 복구 계획', ids: ['backup', 'network', 'ssh'], conclusion: '복원 가능한 사본과 연결 복구 경로를 준비하고, 기존 접속을 유지한 채 변경을 검증합니다.' },
  { id: 'data', title: '데이터를 읽을 때 확인할 것', ids: ['redis', 'query', 'retrieval'], conclusion: '원본과 캐시의 차이, 실제 조회 결과, 인용할 구절을 각각 확인합니다.' },
];

function research(root, ctx, docs) {
  const ui = view(root, ctx);
  const roles = [
    { id: 'finder', name: '탐색가', en: 'FINDER', symbol: 'search', purpose: '먼저, 어떤 근거가 있는가', label: '발견한 구절' },
    { id: 'builder', name: '설계자', en: 'BUILDER', symbol: 'graph', purpose: '어떤 순서로 적용할 것인가', label: '설계에 반영할 점' },
    { id: 'reviewer', name: '검토자', en: 'REVIEWER', symbol: 'shield', purpose: '빠뜨린 전제는 없는가', label: '놓치지 않을 조건' },
  ];
  let topic = RESEARCH_TOPICS.find(item => item.id === readStore(ctx, STORE.research, 'agent')) || RESEARCH_TOPICS[0];
  let states = roles.map(() => 'idle');
  let withFailure = true;
  let synthesized = false;
  let hasRun = false;
  let sessionOnly = false;
  const busy = () => states.some(state => ['queued', 'reading'].includes(state));
  const ready = () => states.every(state => state === 'done');
  const available = () => topic.ids.every(id => getDoc(docs, id));
  const completeRole = (i, fail = false) => {
    states[i] = fail ? 'error' : 'done';
    render();
    ui.tell(fail ? '검토자에게 준비된 실패 예시가 발생했습니다. 해당 역할을 다시 시도하세요.' : `${roles[i].name}의 로컬 예시가 완료되었습니다.${ready() ? ' 이제 결과를 종합할 수 있습니다.' : ''}`);
  };
  function render() {
    const count = states.filter(state => state === 'done').length;
    ui.render(`<section class="f3-shell f3-research" aria-label="역할별 리서치 실습">
      <div class="f3-research-brief"><div><span class="eyebrow">ONE QUESTION, THREE PERSPECTIVES</span><label class="f3-label" for="f3-research-topic">함께 살펴볼 주제</label><select class="field f3-topic-select" id="f3-research-topic" data-f3-focus="research-topic">${RESEARCH_TOPICS.map(item => `<option value="${item.id}" ${item.id === topic.id ? 'selected' : ''}>${item.title}</option>`).join('')}</select></div><div class="f3-research-launch">${localLabel()}${action(hasRun ? '역할 다시 실행' : '역할 실행', 'research-start', { kind: 'primary', symbol: 'play', disabled: busy() || !available() })}</div></div>
      <div class="f3-research-settings"><label class="f3-checkbox"><input type="checkbox" id="f3-research-failure" data-f3-focus="research-failure" ${withFailure ? 'checked' : ''} ${busy() ? 'disabled' : ''}><span>검토자의 실패·재시도 예시 포함</span></label><span class="f3-caption" role="status">${count}/3 역할 완료${busy() ? ' · 로컬 예시 진행 중' : ''}</span></div>
      <div class="f3-role-grid">${roles.map((role, i) => {
        const status = states[i];
        const doc = getDoc(docs, topic.ids[i]);
        const labels = { idle: '대기', queued: '차례 기다리는 중', reading: '구절 정리 중', done: '완료', error: '재시도 필요' };
        return `<article class="f3-role f3-role-${role.id}"><div class="f3-role-head"><span class="f3-role-emblem">${icon(role.symbol)}</span><span class="eyebrow">0${i + 1} / ${role.en}</span><h2 class="f3-heading">${role.name}</h2><p>${role.purpose}</p></div><div class="f3-role-status" data-state="${status}"><span class="f3-status-dot"></span>${labels[status]}</div><div class="f3-role-body">${status === 'done' && doc ? `<span class="eyebrow">${role.label}</span><blockquote>${h(doc.summary)}</blockquote><p>${h(doc.detail)}</p>${excerpt(doc, `research-${role.id}-${doc.id}`)}` : status === 'error' ? `<div class="f3-role-error">${icon('shield')}<h3>검토 조건 하나가 빠졌습니다</h3><p>실패를 보여주기 위해 준비한 예시입니다. 다시 시도하면 빠진 조건을 포함한 발췌문을 표시합니다.</p>${action('검토자 다시 시도', 'research-retry', { kind: 'soft', symbol: 'play' })}</div>` : `<div class="f3-role-wait ${['queued', 'reading'].includes(status) ? 'f3-is-loading' : ''}"><span class="f3-placeholder-line"></span><span class="f3-placeholder-line"></span><span class="f3-placeholder-line"></span><p>${status === 'idle' ? '역할을 실행하면 이 관점의 근거가 여기에 쌓입니다.' : '준비된 공개 발췌문을 순서대로 표시하고 있습니다.'}</p></div>`}</div><div class="f3-role-foot">${icon('file')}<span>${doc ? h(doc.title) : '연결된 발췌문 없음'}</span></div></article>`;
      }).join('')}</div>
      ${!available() ? '<p class="f3-error">이 주제에 필요한 공개 발췌문이 없습니다. 다른 주제를 선택해 주세요.</p>' : ''}
      ${sessionOnly ? '<p class="f3-callout">주제 선택은 이번 화면에만 유지됩니다.</p>' : ''}
      <section class="f3-synthesis" aria-labelledby="f3-synthesis-title"><div class="f3-synthesis-header"><div><span class="eyebrow">BRING IT TOGETHER</span><h2 id="f3-synthesis-title" class="f3-heading" tabindex="-1" data-f3-anchor>세 관점을 하나의 메모로</h2></div>${action(synthesized ? '종합 완료' : '결과 종합', 'research-synthesize', { kind: 'primary', symbol: 'layers', disabled: !ready() || synthesized })}</div>${synthesized ? `<div class="f3-synthesis-result"><div><span class="f3-caption">공통 결론 · 로컬 예시</span><p class="f3-synthesis-conclusion">${h(topic.conclusion)}</p></div><ol>${roles.map((role, i) => `<li><strong>${role.name}</strong><span>${h(getDoc(docs, topic.ids[i])?.summary || '')}</span></li>`).join('')}</ol></div>` : `<p class="muted">${states.includes('error') ? '완료한 두 역할의 결과는 그대로 유지됩니다. 검토자를 다시 시도한 뒤 종합하세요.' : ready() ? '세 역할이 모두 끝났습니다. 준비된 공통 결론과 근거 묶음을 확인하세요.' : '세 역할의 결과가 준비되면 공통 결론과 각 관점의 근거를 함께 정리합니다.'}</p>`}</section>
      <p class="f3-footnote">각 역할과 종합 결과는 공개 문서로 작성한 로컬 예시입니다. 실제 AI 에이전트를 호출하지 않습니다.</p>
    </section>`, ready() && !synthesized ? 'research-synthesize' : busy() ? 'research-topic' : 'research-start');
  }
  ui.on('change', event => {
    if (event.target.id === 'f3-research-topic') {
      const next = RESEARCH_TOPICS.find(item => item.id === event.target.value);
      if (!next) return;
      ui.stop(); topic = next; states = roles.map(() => 'idle'); synthesized = false; hasRun = false;
      sessionOnly = !writeStore(ctx, STORE.research, topic.id); render(); ui.tell('주제를 변경했습니다. 역할 실행으로 새 예시를 시작하세요.');
    } else if (event.target.id === 'f3-research-failure' && !busy()) withFailure = event.target.checked;
  });
  ui.on('click', event => {
    const target = event.target.closest('[data-f3-action]');
    if (!target || !root.contains(target) || target.disabled) return;
    if (target.dataset.f3Action === 'research-start' && !busy() && available()) {
      ui.stop(); synthesized = false; hasRun = true; states = roles.map(() => 'queued');
      const failThisRun = withFailure;
      roles.forEach((role, i) => {
        ui.later(() => { states[i] = 'reading'; render(); }, 400 + i * 500);
        ui.later(() => completeRole(i, i === 2 && failThisRun), 1600 + i * 650);
      });
      render(); ui.tell('세 역할의 로컬 예시를 시작했습니다.');
    } else if (target.dataset.f3Action === 'research-retry' && states[2] === 'error') {
      states[2] = 'reading'; render(); ui.later(() => completeRole(2), 1600); ui.tell('검토자만 다시 시도합니다. 다른 결과는 유지됩니다.');
    } else if (target.dataset.f3Action === 'research-synthesize' && ready()) {
      synthesized = true; render(); ui.tell('세 관점의 로컬 예시를 하나의 메모로 묶었습니다.');
    }
  });
  render();
  return () => ui.cleanup();
}

function timeline(root, ctx, docs) {
  const ui = view(root, ctx);
  const events = [
    { id: 'plan', time: '00:00.000', type: 'state', title: '실행 계획 확인', description: '검색, 종합, 검토의 세 단계를 준비한 예시 기록입니다.', payload: { mode: 'local-example', steps: ['search', 'synthesize', 'review'] } },
    { id: 'search', time: '00:00.240', type: 'tool', title: '공개 발췌문 검색', description: '도구 호출 형태를 보여주는 고정 기록입니다. 실제 검색 요청은 발생하지 않았습니다.', payload: { tool: 'sample.search', query: '에이전트 제어 흐름', source: 'curated-local-excerpts', matches: 3 } },
    { id: 'evidence', time: '00:00.610', type: 'evidence', title: '단계와 전이 조건을 근거로 선택', description: '제어 흐름을 설명하는 공개 발췌문이 연결된 예시입니다.', doc: 'graph', payload: { document: 'graph', excerpt: '분기·재시도·중단 지점', status: 'candidate' } },
    { id: 'error', time: '00:01.020', type: 'error', title: '검토 조건 누락 감지', description: '오류와 복구 과정을 살펴보기 위해 넣은 예시입니다. 쓰기 권한 검토 항목이 빠진 상황을 가정합니다.', payload: { code: 'SAMPLE_REVIEW_GAP', missing: '쓰기 전 권한 검토', recoverable: true, next: '검토 항목 추가' } },
    { id: 'retry', time: '00:01.480', type: 'tool', title: '빠진 검토 항목 보완', description: '전체 작업을 다시 시작하지 않고 해당 검토 항목만 보완하는 예시 기록입니다.', payload: { tool: 'sample.review', attempt: 2, added: '실제 변경 전 검토', executed: false } },
    { id: 'boundary', time: '00:01.930', type: 'evidence', title: '도구의 신뢰 경계 확인', description: '실행 권한, 입력 검증, 외부 전송 대상을 구분한 발췌문을 연결했습니다.', doc: 'mcp', payload: { document: 'mcp', checks: ['권한', '입력', '전송 대상'] } },
    { id: 'draft', time: '00:02.400', type: 'state', title: '요약 초안 구성', description: '준비된 문장을 조합한 예시입니다. 모델이 생성한 응답이 아닙니다.', payload: { output: 'prepared-sample-summary', citations: ['graph', 'mcp'] } },
    { id: 'review', time: '00:02.850', type: 'evidence', title: '검색 결과와 근거의 범위 구분', description: '검색 점수를 주장 전체의 증명으로 해석하지 않는 검토 항목입니다.', doc: 'retrieval', payload: { document: 'retrieval', check: '검색 후보와 확정 근거 구분', result: 'sample-checked' } },
    { id: 'complete', time: '00:03.120', type: 'state', title: '예시 기록 종료', description: '모든 기록을 표시했습니다. 기록의 시간은 고정된 예시 값이며 실제 실행 시간과 다릅니다.', payload: { state: 'complete', events: 9, remoteCalls: 0, writes: 0 } },
  ];
  const types = [
    { id: 'all', label: '전체', icon: 'layers' }, { id: 'tool', label: '도구', icon: 'terminal' },
    { id: 'evidence', label: '근거', icon: 'file' }, { id: 'error', label: '오류', icon: 'shield' }, { id: 'state', label: '상태', icon: 'clock' },
  ];
  const storedFilter = readStore(ctx, STORE.timeline, 'all');
  let filter = types.some(type => type.id === storedFilter) ? storedFilter : 'all';
  let query = '';
  let cursor = events.length - 1;
  let selected = events[0].id;
  let mode = 'full';
  let sessionOnly = false;
  const matches = event => (filter === 'all' || event.type === filter)
    && `${event.title} ${event.description} ${event.payload.code || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const visible = () => events.slice(0, cursor + 1).filter(matches);
  const reconcile = preferred => {
    const list = visible();
    selected = list.some(event => event.id === preferred) ? preferred : list.some(event => event.id === selected) ? selected : list[0]?.id || null;
  };
  const tick = () => {
    if (mode !== 'playing') return;
    cursor += 1;
    reconcile(events[cursor].id);
    if (cursor === events.length - 1) {
      mode = 'ended'; ui.tell('예시 기록 재생이 끝났습니다. 모든 이벤트를 확인할 수 있습니다.');
    } else ui.later(tick, 1000);
    render();
  };
  function render(preserveSearch = false) {
    reconcile(selected);
    const list = visible();
    const chosen = events.find(event => event.id === selected);
    const type = types.find(item => item.id === chosen?.type);
    const modes = { full: '전체 기록', playing: '재생 중', paused: '일시정지', ended: '재생 완료' };
    const markup = `<section class="f3-shell f3-timeline" aria-label="예시 실행 기록 탐색" data-f3-replay="${mode}">
      <div class="f3-trace-bar"><div class="f3-trace-id">${icon('terminal')}<div><span class="eyebrow">EXAMPLE TRACE</span><h2 class="f3-heading" tabindex="-1" data-f3-anchor>run_local_001</h2></div></div><div class="f3-trace-stats"><span><strong>9</strong> 이벤트</span><span><strong>1</strong> 복구 예시</span>${localLabel('예시 기록')}</div></div>
      <div class="f3-trace-toolbar"><div class="f3-filter-group" role="group" aria-label="이벤트 종류">${types.map(item => action(`${item.label} ${item.id === 'all' ? events.length : events.filter(event => event.type === item.id).length}`, 'trace-filter', { key: `trace-filter-${item.id}`, attrs: `data-filter="${item.id}" aria-pressed="${filter === item.id}"`, kind: 'small' })).join('')}</div><div class="f3-trace-search"><label for="f3-trace-query">기록 검색</label><input id="f3-trace-query" class="field" type="search" maxlength="100" placeholder="이벤트 또는 오류 코드" value="${h(query)}" data-f3-focus="trace-query"></div></div>
      <div class="f3-replay-bar"><div class="f3-actions">${action(mode === 'playing' ? '재생 일시정지' : mode === 'paused' ? '이어서 재생' : '처음부터 재생', 'trace-play', { kind: 'soft', symbol: mode === 'playing' ? 'clock' : 'play', key: 'trace-play' })}${action('전체 기록 보기', 'trace-all', { disabled: mode === 'full', kind: 'small' })}</div><span class="f3-caption" role="status">${modes[mode]} · ${cursor + 1}/9 이벤트 공개 · ${list.length}개 표시</span></div>
      <div class="f3-trace-layout"><div class="f3-event-column"><div class="f3-event-labels"><span>예시 시각</span><span>이벤트</span></div>${list.length ? `<ol class="f3-event-list">${list.map(event => {
        const eventType = types.find(item => item.id === event.type);
        return `<li><button type="button" class="f3-event f3-event-${event.type}" data-f3-action="trace-select" data-event="${event.id}" data-f3-focus="trace-event-${event.id}" aria-pressed="${selected === event.id}"><time class="mono">${event.time}</time><span class="f3-event-marker">${icon(eventType.icon)}</span><span class="f3-event-text"><span class="f3-caption">${eventType.label}</span><strong>${event.title}</strong></span>${icon('arrow')}</button></li>`;
      }).join('')}</ol>` : `<div class="f3-filter-empty">${icon('search')}<h3>표시할 기록이 없습니다</h3><p class="muted">${mode === 'playing' || mode === 'paused' ? '현재 재생 구간에는 조건에 맞는 이벤트가 없습니다.' : '다른 검색어나 이벤트 종류로 다시 찾아보세요.'}</p>${action('필터 초기화', 'trace-clear', { kind: 'soft' })}</div>`}</div>
        <aside class="f3-inspector" aria-label="선택한 이벤트 상세">${chosen ? `<div class="f3-inspector-head"><div class="f3-inspector-kicker"><span>${icon(type.icon)} ${type.label}</span><span class="mono">EVENT ${String(events.indexOf(chosen) + 1).padStart(2, '0')}</span></div><h3>${chosen.title}</h3><span class="mono">${chosen.time} · 고정된 예시 시각</span></div><div class="f3-inspector-body"><p>${h(chosen.description)}</p><div class="f3-payload-label"><span class="eyebrow">EVENT PAYLOAD</span>${tag('예시 데이터')}</div><pre class="f3-payload" tabindex="0" data-f3-focus="trace-payload" aria-label="예시 이벤트 데이터"><code>${h(JSON.stringify(chosen.payload, null, 2))}</code></pre>${chosen.doc ? excerpt(getDoc(docs, chosen.doc), `trace-${chosen.id}`) : '<p class="f3-caption">이 이벤트에는 연결된 문서가 없습니다.</p>'}${chosen.type === 'error' ? '<p class="f3-callout">다음 도구 이벤트에서 검토 항목을 보완합니다. 오류 필터를 해제하면 복구 흐름을 볼 수 있습니다.</p>' : ''}</div>` : '<div class="f3-inspector-empty"><span class="eyebrow">EVENT DETAIL</span><h3>기록을 선택해 주세요</h3><p class="muted">조건에 맞는 이벤트를 선택하면 입력과 판단 근거가 여기에 나타납니다.</p></div>'}</aside></div>
      ${sessionOnly ? '<p class="f3-callout">필터 선택은 이번 화면에만 유지됩니다.</p>' : ''}<p class="f3-footnote">시간과 데이터는 준비된 예시 기록입니다. 재생은 표시 순서만 바꾸며 실제 도구를 실행하지 않습니다.</p>
    </section>`;
    if (preserveSearch || root.ownerDocument.activeElement === root.querySelector('#f3-trace-query')) {
      // Update only results so composing Korean text never detaches its input.
      const fragment = root.ownerDocument.createElement('template');
      fragment.innerHTML = markup;
      const opened = new Set([...root.querySelectorAll('details[open][data-f3-detail]')].map(el => el.dataset.f3Detail));
      for (const selector of ['.f3-trace-layout', '.f3-replay-bar']) {
        root.querySelector(selector).replaceWith(fragment.content.querySelector(selector));
      }
      root.querySelector('.f3-timeline').dataset.f3Replay = mode;
      root.querySelectorAll('details[data-f3-detail]').forEach(el => { el.open = opened.has(el.dataset.f3Detail); });
    } else ui.render(markup, 'trace-play');
  }
  ui.on('input', event => {
    if (event.target.id !== 'f3-trace-query') return;
    query = event.target.value.slice(0, 100);
    render(true);
  });
  ui.on('click', event => {
    const target = event.target.closest('[data-f3-action]');
    if (!target || !root.contains(target) || target.disabled) return;
    const command = target.dataset.f3Action;
    if (command === 'trace-select') selected = target.dataset.event;
    else if (command === 'trace-filter') {
      filter = target.dataset.filter; sessionOnly = !writeStore(ctx, STORE.timeline, filter);
    } else if (command === 'trace-clear') {
      filter = 'all'; query = ''; sessionOnly = !writeStore(ctx, STORE.timeline, filter);
    } else if (command === 'trace-all') {
      ui.stop(); cursor = events.length - 1; mode = 'full';
    } else if (command === 'trace-play') {
      if (mode === 'playing') { ui.stop(); mode = 'paused'; }
      else {
        if (mode !== 'paused') { cursor = 0; reconcile(events[0].id); }
        mode = 'playing'; ui.later(tick, 1000);
      }
      ui.tell(`${mode === 'paused' ? '예시 기록 재생을 멈췄습니다.' : '예시 기록을 순서대로 재생합니다.'}`);
    } else return;
    render();
  });
  render();
  return () => ui.cleanup();
}

const PERMISSION_TOOLS = [
  { id: 'search', code: 'sample.search', name: '문서 검색', scope: '공개 발췌문 색인', access: 'read', default: 'allow' },
  { id: 'read', code: 'sample.readExcerpt', name: '발췌문 읽기', scope: '선택한 공개 문서', access: 'read', default: 'review' },
  { id: 'note', code: 'sample.saveNote', name: '요약 노트 쓰기', scope: '가상의 예시 노트', access: 'write', default: 'review' },
  { id: 'publish', code: 'sample.publish', name: '문서 발행', scope: '가상의 예시 발행함', access: 'write', default: 'deny' },
];
const PERMISSION_REQUESTS = [
  { id: 'note-01', tool: 'note', title: '요약 노트에 검토 항목 추가', doc: 'mcp', destination: '예시 노트 / agent-review.md', description: '도구 호출 전 권한과 입력을 확인하는 문장을 노트에 추가하는 상황입니다.', change: '+ 실제 변경 전에 권한, 입력, 전송 대상을 확인한다.\n+ 검토 결과와 근거 문서를 함께 남긴다.' },
  { id: 'read-02', tool: 'read', title: '제어 흐름의 공개 발췌문 읽기', doc: 'graph', destination: '로컬 공개 발췌 / graph', description: '중단과 재개를 설명하기 위해 공개 문서의 발췌문을 읽는 상황입니다.', change: '읽기 범위: 단계, 분기, 재시도, 중단 지점에 관한 발췌문' },
  { id: 'publish-03', tool: 'publish', title: '검토한 초안을 예시 발행함에 넣기', doc: 'mcp', destination: '가상의 예시 발행함 / draft-001', description: '외부 발행처럼 쓰기 범위가 넓은 요청을 검토하는 상황입니다. 정책을 바꿔도 실제 발행은 발생하지 않습니다.', change: '제안: 검토 완료한 초안 1건을 가상의 발행함에 등록\n실제 원격 실행: 없음' },
  { id: 'search-04', tool: 'search', title: '검색과 근거의 차이 찾기', doc: 'retrieval', destination: '로컬 공개 발췌 색인', description: '검색 점수와 근거의 의미를 비교할 자료를 찾는 상황입니다.', change: '예시 검색어: 검색 후보와 답변 근거의 차이\n자료 범위: 제공된 공개 발췌문' },
];

function permissionDesk(root, ctx, docs) {
  const ui = view(root, ctx);
  const stored = readStore(ctx, STORE.permissions, {});
  const policies = Object.fromEntries(PERMISSION_TOOLS.map(tool => {
    const value = stored?.policies?.[tool.id];
    const allowed = tool.access === 'write' ? ['review', 'deny'] : ['allow', 'review', 'deny'];
    return [tool.id, allowed.includes(value) ? value : tool.default];
  }));
  const validDecision = entry => {
    const request = PERMISSION_REQUESTS.find(request => request.id === entry?.request);
    const tool = PERMISSION_TOOLS.find(tool => tool.id === request?.tool);
    if (!tool) return false;
    const allowed = tool.access === 'write' ? ['review', 'deny'] : ['allow', 'review', 'deny'];
    return ['approved', 'rejected'].includes(entry.verdict) && allowed.includes(entry.policy)
      && !(entry.verdict === 'approved' && entry.policy === 'deny');
  };
  let history = Array.isArray(stored?.history) ? stored.history.filter(validDecision).slice(0, 24).map(entry => ({ ...entry, note: textValue(entry.note, '', 300), time: textValue(entry.time, '예시 기록', 40) })) : [];
  let decisions = Object.fromEntries(PERMISSION_REQUESTS.map(request => [request.id, validDecision(stored?.decisions?.[request.id]) && stored.decisions[request.id].request === request.id ? { ...stored.decisions[request.id], note: textValue(stored.decisions[request.id].note, '', 300), time: textValue(stored.decisions[request.id].time, '', 40) } : null]));
  let current = PERMISSION_REQUESTS.find(request => !decisions[request.id])?.id || PERMISSION_REQUESTS[0].id;
  const notes = {};
  let sessionOnly = false;
  const labels = { allow: '허용', review: '매번 검토', deny: '차단' };
  const persist = () => { sessionOnly = !writeStore(ctx, STORE.permissions, { policies, decisions, history }); };
  function render() {
    const request = PERMISSION_REQUESTS.find(item => item.id === current);
    const tool = PERMISSION_TOOLS.find(item => item.id === request.tool);
    const policy = policies[tool.id];
    const decision = decisions[current];
    const pending = PERMISSION_REQUESTS.filter(item => !decisions[item.id]);
    ui.render(`<section class="f3-shell f3-permissions" aria-label="도구 권한 검토 실습">
      <div class="f3-permission-banner">${icon('shield')}<div><strong>승인은 판단 기록으로만 남습니다</strong><p>읽기·쓰기 모두 로컬 시뮬레이션입니다. 쓰기 승인도 파일 변경이나 외부 발행으로 이어지지 않습니다.</p></div>${localLabel()}</div>
      <div class="f3-desk-layout"><section class="f3-policy-section" aria-labelledby="f3-policy-title"><div class="f3-section-heading"><div><span class="eyebrow">01 / SET THE BOUNDARY</span><h2 class="f3-heading" id="f3-policy-title" tabindex="-1" data-f3-anchor>도구별 권한</h2></div><span class="f3-caption">4개 예시 도구</span></div>
        <table class="f3-permission-table"><caption>도구별 데이터 범위, 접근 유형과 변경 가능한 예시 정책</caption><thead><tr><th scope="col">도구 / 범위</th><th scope="col">접근</th><th scope="col">정책</th></tr></thead><tbody>${PERMISSION_TOOLS.map(item => `<tr><th scope="row"><strong>${item.name}</strong><span class="mono">${item.code}</span><span class="f3-caption">${item.scope}</span></th><td data-label="접근"><span class="f3-access f3-access-${item.access}">${icon(item.access === 'write' ? 'edit' : 'book')}${item.access === 'write' ? '쓰기 예시' : '읽기 예시'}</span></td><td data-label="정책"><label class="f3-sr-only" for="f3-policy-${item.id}">${item.name} 정책</label><select class="field f3-policy-select" id="f3-policy-${item.id}" data-f3-tool="${item.id}" data-f3-focus="policy-${item.id}">${(item.access === 'write' ? ['review', 'deny'] : ['allow', 'review', 'deny']).map(value => `<option value="${value}" ${policies[item.id] === value ? 'selected' : ''}>${labels[value]}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table><div class="f3-policy-legend"><p><strong>허용</strong> 읽기 요청을 허용 대상으로 표시합니다.</p><p><strong>매번 검토</strong> 요청 내용과 범위를 보고 판단합니다.</p><p><strong>차단</strong> 승인할 수 없고 거절만 가능합니다.</p></div><p class="f3-callout">쓰기 도구는 ‘매번 검토’와 ‘차단’만 선택할 수 있습니다. 이 화면에서는 모든 정책이 예시로만 적용됩니다.</p></section>
      <section class="f3-proposal" aria-labelledby="f3-proposal-title"><div class="f3-proposal-top"><span class="eyebrow">02 / REVIEW THE REQUEST</span><span class="f3-pending-count">${pending.length}건 대기</span></div><label class="f3-label" for="f3-request">검토할 요청</label><select class="field" id="f3-request" data-f3-focus="permission-request">${PERMISSION_REQUESTS.map(item => `<option value="${item.id}" ${item.id === current ? 'selected' : ''}>${decisions[item.id] ? (decisions[item.id].verdict === 'approved' ? '[승인]' : '[거절]') : '[대기]'} ${item.title}</option>`).join('')}</select><h2 id="f3-proposal-title" class="f3-proposal-title">${request.title}</h2><p class="muted">${request.description}</p><dl class="f3-request-meta"><div><dt>대상</dt><dd>${request.destination}</dd></div><div><dt>현재 정책</dt><dd>${labels[policy]} · ${tool.access === 'write' ? '쓰기 시뮬레이션' : '읽기 시뮬레이션'}</dd></div></dl><pre class="f3-proposed-change"><code>${h(request.change)}</code></pre>${excerpt(getDoc(docs, request.doc), `permission-${request.id}`)}
        <label class="f3-label" for="f3-decision-note">판단 메모 <span class="f3-caption">선택</span></label><textarea class="field" id="f3-decision-note" data-f3-focus="permission-note" maxlength="300" rows="2" placeholder="승인 범위나 거절 이유를 적어 두세요." ${decision ? 'disabled' : ''}>${h(decision?.note || notes[current] || '')}</textarea>
        <div class="f3-decision-status" role="status" id="f3-permission-status">${decision ? `<strong class="${decision.verdict === 'approved' ? 'f3-success' : 'f3-error'}">${decision.verdict === 'approved' ? '승인 판단을 기록했습니다' : '거절 판단을 기록했습니다'}</strong><span>판단 당시 정책: ${labels[decision.policy]} · 실제 실행 없음</span>` : policy === 'deny' ? '<strong class="f3-error">현재 정책이 차단이므로 승인할 수 없습니다.</strong><span>승인 예시를 보려면 왼쪽 정책을 ‘매번 검토’로 바꾸세요.</span>' : '<span>요청 범위를 확인하고 승인 또는 거절을 선택하세요.</span>'}</div><div class="f3-decision-actions">${action('예시 승인', 'permission-approve', { kind: 'primary', symbol: 'check', disabled: !!decision || policy === 'deny', attrs: 'aria-describedby="f3-permission-status"' })}${action('거절', 'permission-reject', { symbol: 'close', disabled: !!decision })}${decision && pending.length ? action('다음 요청', 'permission-next', { kind: 'soft', symbol: 'arrow' }) : ''}</div></section></div>
      <section class="f3-history" aria-labelledby="f3-history-title"><div class="f3-section-heading"><div><span class="eyebrow">03 / DECISION HISTORY</span><h2 class="f3-heading" id="f3-history-title">판단 기록</h2></div>${action('새 예시 묶음', 'permission-reset', { kind: 'small', symbol: 'plus', disabled: pending.length > 0 })}</div>${history.length ? `<ol class="f3-history-list">${history.map((entry, i) => {
        const item = PERMISSION_REQUESTS.find(request => request.id === entry.request);
        return `<li><details data-f3-detail="permission-history-${i}"><summary data-f3-focus="permission-history-${i}"><span class="f3-history-verdict ${entry.verdict === 'approved' ? 'f3-success' : 'f3-error'}">${icon(entry.verdict === 'approved' ? 'check' : 'close')}${entry.verdict === 'approved' ? '승인' : '거절'}</span><strong>${item.title}</strong><time class="f3-caption">${h(entry.time)}</time><span class="f3-caption">상세</span></summary><div class="f3-history-detail"><p>판단 당시 정책: ${labels[entry.policy]} · 실제 실행 없음</p><p>${h(entry.note || '별도 메모 없이 판단했습니다.')}</p></div></details></li>`;
      }).join('')}</ol><p class="f3-caption">최근 24건까지 이 브라우저에 보관합니다.</p>` : '<div class="f3-history-empty">아직 판단한 요청이 없습니다. 첫 요청을 검토하면 여기에 기록이 남습니다.</div>'}<p class="f3-caption">${pending.length ? '현재 묶음의 요청을 모두 판단하면 새 예시 묶음을 시작할 수 있습니다.' : '현재 묶음을 모두 검토했습니다. 새 묶음에서도 기존 판단 기록은 유지됩니다.'}</p></section>${sessionOnly ? '<p class="f3-callout" role="status">저장 공간을 사용할 수 없어 정책과 판단 기록을 이번 화면에만 보관합니다.</p>' : ''}
    </section>`, decisions[current] ? (pending.length ? 'permission-next' : 'permission-reset') : 'permission-request');
  }
  ui.on('input', event => { if (event.target.id === 'f3-decision-note') notes[current] = event.target.value.slice(0, 300); });
  ui.on('change', event => {
    const tool = PERMISSION_TOOLS.find(item => item.id === event.target.dataset.f3Tool);
    if (tool) {
      const allowed = tool.access === 'write' ? ['review', 'deny'] : ['allow', 'review', 'deny'];
      if (!allowed.includes(event.target.value)) return;
      policies[tool.id] = event.target.value; persist(); render(); ui.tell(`${tool.name}의 예시 정책을 ${labels[policies[tool.id]]}으로 변경했습니다.`);
    } else if (event.target.id === 'f3-request' && PERMISSION_REQUESTS.some(item => item.id === event.target.value)) {
      current = event.target.value; render();
    }
  });
  ui.on('click', event => {
    const target = event.target.closest('[data-f3-action]');
    if (!target || !root.contains(target) || target.disabled) return;
    const command = target.dataset.f3Action;
    if (command === 'permission-next') current = PERMISSION_REQUESTS.find(item => !decisions[item.id])?.id || current;
    else if (command === 'permission-reset' && PERMISSION_REQUESTS.every(item => decisions[item.id])) {
      decisions = {}; Object.keys(notes).forEach(key => delete notes[key]); current = PERMISSION_REQUESTS[0].id; persist(); ui.tell('새 예시 요청 네 건을 준비했습니다. 이전 판단 기록은 유지됩니다.');
    } else if (['permission-approve', 'permission-reject'].includes(command) && !decisions[current]) {
      const request = PERMISSION_REQUESTS.find(item => item.id === current);
      const policy = policies[request.tool];
      if (command === 'permission-approve' && policy === 'deny') return;
      const entry = { request: current, verdict: command === 'permission-approve' ? 'approved' : 'rejected', policy, note: (notes[current] || '').trim(), time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) };
      decisions[current] = entry; history = [entry, ...history].slice(0, 24); persist();
      ui.tell(`${entry.verdict === 'approved' ? '승인' : '거절'} 판단을 ${sessionOnly ? '이번 화면에' : '이 브라우저에'} 기록했습니다. 실제 도구 실행은 없습니다.`);
    } else return;
    render();
  });
  render();
  return () => ui.cleanup();
}

const PROMPT_TEMPLATES = [
  { id: 'summary', title: '근거 요약', icon: 'file', hint: '핵심을 짧고 정확하게', instruction: '핵심 주장 세 가지를 정리하고, 각 주장 옆에 근거 문서 이름을 붙이세요.' },
  { id: 'compare', title: '기준별 비교', icon: 'layers', hint: '공통점과 차이를 나란히', instruction: '목적, 적용 조건, 한계를 기준으로 두 자료를 비교하세요. 공통점과 차이를 구분하세요.' },
  { id: 'review', title: '검토 질문', icon: 'shield', hint: '놓친 조건을 다시 확인', instruction: '이 자료를 적용하기 전에 확인할 질문 다섯 가지를 만드세요. 각 질문의 근거와 미확인 항목을 구분하세요.' },
];
const PROMPT_AUDIENCES = { beginner: '처음 배우는 동료', practitioner: '실무 경험이 있는 동료', self: '복습하는 나' };
const PROMPT_FORMATS = { bullets: '제목과 글머리 기호', table: '기준별 마크다운 표', checklist: '체크리스트와 확인 이유' };

function promptStudio(root, ctx, docs) {
  const ui = view(root, ctx);
  const initial = () => ({ template: 'summary', name: '에이전트 흐름 학습용 요약', goal: '단계별 실행과 중단·재개를 처음 배우는 동료에게 설명하기', audience: 'beginner', format: 'bullets', docA: getDoc(docs, 'graph')?.id || docs[0]?.id || '', docB: getDoc(docs, 'mcp')?.id || docs[1]?.id || '' });
  const normalize = item => ({
    template: PROMPT_TEMPLATES.some(template => template.id === item?.template) ? item.template : 'summary',
    name: textValue(item?.name, '', 80), goal: textValue(item?.goal, '', 360),
    audience: typeof item?.audience === 'string' && Object.hasOwn(PROMPT_AUDIENCES, item.audience) ? item.audience : 'beginner',
    format: typeof item?.format === 'string' && Object.hasOwn(PROMPT_FORMATS, item.format) ? item.format : 'bullets',
    docA: docs.some(doc => doc.id === item?.docA) ? item.docA : '',
    docB: docs.some(doc => doc.id === item?.docB) ? item.docB : '',
  });
  const stored = readStore(ctx, STORE.prompts, []);
  let library = Array.isArray(stored) ? stored.filter(item => item && typeof item.id === 'string' && /^prompt-[a-z0-9-]+$/.test(item.id)).slice(0, 8).map(item => ({ id: item.id, fields: normalize(item.fields), savedAt: textValue(item.savedAt, '', 40) })) : [];
  let activeId = library[0]?.id || '';
  let fields = library[0] ? { ...library[0].fields } : initial();
  let dirty = false;
  let sessionOnly = false;
  let errors = {};
  let status = library.length ? '저장한 프롬프트를 불러왔습니다.' : '변수를 채우면 오른쪽에 프롬프트가 완성됩니다.';
  let exported = false;
  const buffers = new Map();
  const selectedTemplate = () => PROMPT_TEMPLATES.find(template => template.id === fields.template);
  const chosenDocs = () => [getDoc(docs, fields.docA), ...(fields.template === 'compare' ? [getDoc(docs, fields.docB)] : [])].filter(Boolean);
  function promptText() {
    const template = selectedTemplate();
    const context = chosenDocs().map((doc, i) => `[자료 ${i + 1}] ${doc.title}\n출처 경로: ${doc.source}\n${doc.summary}\n${doc.detail}`).join('\n\n');
    return `당신은 공개 학습 자료를 정리하는 도우미입니다.\n아래에 제공된 발췌문만 근거로 사용하세요.\n\n[목표]\n${fields.goal.trim() || '(학습 목표를 입력해 주세요)'}\n\n[독자]\n${PROMPT_AUDIENCES[fields.audience]}\n\n[작업: ${template.title}]\n${template.instruction}\n\n[출력 형식]\n${PROMPT_FORMATS[fields.format]}\n\n[검토 원칙]\n- 사실, 해석, 확인이 필요한 내용을 구분하세요.\n- 발췌문에 없는 내용은 알 수 없다고 표시하세요.\n- 각 주장에 해당 자료의 제목을 함께 적으세요.\n\n[공개 문서의 로컬 발췌]\n${context || '(공개 자료를 선택해 주세요)'}`;
  }
  const validate = () => {
    const next = {};
    if (!fields.name.trim()) next.name = '저장할 프롬프트 이름을 입력해 주세요.';
    if (!fields.goal.trim()) next.goal = '학습 목표를 입력해 주세요.';
    if (!getDoc(docs, fields.docA)) next.docA = '공개 자료를 선택해 주세요.';
    if (fields.template === 'compare' && !getDoc(docs, fields.docB)) next.docB = '비교할 두 번째 자료를 선택해 주세요.';
    else if (fields.template === 'compare' && fields.docA === fields.docB) next.docB = '서로 다른 두 자료를 선택해 주세요.';
    return next;
  };
  const ensureValid = () => {
    errors = validate();
    if (!Object.keys(errors).length) return true;
    render();
    root.querySelector(`[data-f3-field="${Object.keys(errors)[0]}"]`)?.focus();
    ui.tell('입력 내용을 확인해 주세요. 작성 중인 내용은 유지됩니다.');
    return false;
  };
  const draftLabel = () => dirty ? '수정 중 · 아직 저장하지 않았습니다' : sessionOnly ? '이번 화면에 보관됨' : activeId ? '이 브라우저에 저장됨' : '새 프롬프트';
  function refreshPreview() {
    root.querySelector('[data-f3-preview]').textContent = promptText();
    root.querySelector('[data-f3-char-count]').textContent = `${promptText().length.toLocaleString('ko-KR')}자`;
    root.querySelector('[data-f3-draft-label]').textContent = draftLabel();
    root.querySelector('[data-f3-prompt-status]').textContent = status;
    const currentErrors = validate();
    Object.keys(errors).forEach(key => { if (!currentErrors[key]) delete errors[key]; });
    root.querySelectorAll('[data-f3-field]').forEach(field => field.setAttribute('aria-invalid', String(!!errors[field.dataset.f3Field])));
    root.querySelectorAll('[data-f3-field-error]').forEach(el => { el.textContent = errors[el.dataset.f3FieldError] || ''; });
  }
  function render() {
    const fieldAttrs = name => `id="f3-prompt-${name}" data-f3-field="${name}" data-f3-focus="prompt-${name}" aria-invalid="${!!errors[name]}" aria-describedby="f3-prompt-${name}-error"`;
    const errorText = name => `<span id="f3-prompt-${name}-error" class="f3-field-error" data-f3-field-error="${name}">${h(errors[name] || '')}</span>`;
    const docOptions = value => `<option value="">공개 자료 선택</option>${docs.map(doc => `<option value="${h(doc.id)}" ${doc.id === value ? 'selected' : ''}>${h(doc.title)}</option>`).join('')}`;
    ui.render(`<section class="f3-shell f3-prompt-studio" aria-label="프롬프트 템플릿 편집">
      <div class="f3-studio-top"><div><span class="eyebrow">PROMPT WORKBENCH</span><h2 class="f3-heading" tabindex="-1" data-f3-anchor>좋은 질문을, 다시 쓸 수 있게</h2></div>${localLabel()}</div>
      <div class="f3-template-strip" role="group" aria-label="프롬프트 템플릿">${PROMPT_TEMPLATES.map((template, i) => `<button type="button" class="f3-template" data-f3-action="prompt-template" data-template="${template.id}" data-f3-focus="prompt-template-${template.id}" aria-pressed="${fields.template === template.id}"><span class="f3-template-number">0${i + 1}</span>${icon(template.icon)}<span><strong>${template.title}</strong><small>${template.hint}</small></span>${fields.template === template.id ? icon('check') : ''}</button>`).join('')}</div>
      <div class="f3-studio-layout"><div class="f3-variable-column"><div class="f3-variable-head"><span class="eyebrow">INPUT VARIABLES</span><span class="f3-caption">공개 예시 자료만 사용</span></div><form class="f3-variable-form" novalidate><div class="f3-form-field"><label for="f3-prompt-name">프롬프트 이름</label><input class="field" ${fieldAttrs('name')} value="${h(fields.name)}" maxlength="80" required>${errorText('name')}</div><div class="f3-form-field"><label for="f3-prompt-goal">학습 목표 <span class="f3-caption">무엇을 알고 싶나요?</span></label><textarea class="field" ${fieldAttrs('goal')} maxlength="360" rows="4" required placeholder="예: 두 개념의 차이를 처음 배우는 동료에게 설명하기">${h(fields.goal)}</textarea>${errorText('goal')}</div><div class="f3-form-field"><label for="f3-prompt-docA">${fields.template === 'compare' ? '첫 번째 자료' : '근거 자료'}</label><select class="field" ${fieldAttrs('docA')} required>${docOptions(fields.docA)}</select>${errorText('docA')}</div>${fields.template === 'compare' ? `<div class="f3-form-field"><label for="f3-prompt-docB">두 번째 자료</label><select class="field" ${fieldAttrs('docB')} required>${docOptions(fields.docB)}</select>${errorText('docB')}</div>` : ''}<div class="f3-form-field"><label for="f3-prompt-audience">읽는 사람</label><select class="field" ${fieldAttrs('audience')}>${Object.entries(PROMPT_AUDIENCES).map(([key, label]) => `<option value="${key}" ${fields.audience === key ? 'selected' : ''}>${label}</option>`).join('')}</select>${errorText('audience')}</div><div class="f3-form-field"><label for="f3-prompt-format">출력 형식</label><select class="field" ${fieldAttrs('format')}>${Object.entries(PROMPT_FORMATS).map(([key, label]) => `<option value="${key}" ${fields.format === key ? 'selected' : ''}>${label}</option>`).join('')}</select>${errorText('format')}</div><button type="submit" class="f3-sr-only" tabindex="-1">프롬프트 저장</button></form><div class="f3-library"><label for="f3-prompt-library">보관한 프롬프트 <span class="f3-caption">${library.length}/8</span></label><select class="field" id="f3-prompt-library" data-f3-focus="prompt-library"><option value="" ${!activeId ? 'selected' : ''}>새 프롬프트 작성</option>${library.map(item => `<option value="${h(item.id)}" ${item.id === activeId ? 'selected' : ''}>${h(item.fields.name)} · ${h(item.savedAt)}</option>`).join('')}</select><p class="f3-caption">${library.length ? '불러오기를 바꿔도 저장 전 수정은 이 화면에서 유지됩니다. 최대 8개, 오래된 저장본부터 교체합니다.' : '저장한 템플릿과 변수는 이 브라우저에서 다시 불러올 수 있습니다.'}</p></div></div>
      <div class="f3-preview-column"><article class="f3-prompt-paper"><div class="f3-paper-head"><span class="f3-paper-symbol">${icon('code')}</span><div><span class="eyebrow">RENDERED PROMPT</span><h3>프롬프트 미리보기</h3></div><span class="f3-caption" data-f3-char-count>${promptText().length.toLocaleString('ko-KR')}자</span></div><pre class="f3-prompt-text" tabindex="0" data-f3-focus="prompt-preview" aria-label="조합된 프롬프트"><code data-f3-preview>${h(promptText())}</code></pre><div class="f3-paper-foot"><span class="f3-caption">템플릿 + 변수 + 공개 발췌문</span><span class="f3-caption">로컬에서 조합한 텍스트</span></div></article><div class="f3-prompt-actions"><div><span class="f3-draft-label" data-f3-draft-label>${draftLabel()}</span><p class="f3-caption">저장과 내보내기로 질문을 보관하세요.</p></div><div class="f3-actions">${action('프롬프트 저장', 'prompt-save', { kind: 'primary', symbol: 'check' })}${action('텍스트 내보내기', 'prompt-export', { symbol: 'download' })}</div></div><p class="f3-prompt-status ${sessionOnly ? 'f3-callout' : ''}" role="status" data-f3-prompt-status>${h(status)}</p><p class="f3-footnote">AI를 실행하지 않습니다. 입력은 외부로 전송되지 않으며 내보내기는 텍스트 파일을 다운로드합니다.</p></div></div>
    </section>`, 'prompt-save');
  }
  function save() {
    if (!ensureValid()) return;
    const promotingDraft = activeId === '';
    const id = activeId || `prompt-${Date.now().toString(36)}-${library.length}`;
    const record = { id, fields: { ...fields, name: fields.name.trim(), goal: fields.goal.trim() }, savedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) };
    library = [record, ...library.filter(item => item.id !== id)].slice(0, 8);
    sessionOnly = !writeStore(ctx, STORE.prompts, library);
    fields = { ...record.fields }; activeId = id; dirty = false; buffers.set(id, { fields: { ...fields }, dirty: false });
    if (promotingDraft) buffers.delete('');
    status = sessionOnly ? '저장 공간을 사용할 수 없어 이번 화면에만 보관했습니다. 텍스트 내보내기로 내용을 보관하세요.' : '템플릿과 변수를 이 브라우저에 저장했습니다.';
    render(); ui.tell(status);
  }
  ui.on('submit', event => { if (event.target.matches('.f3-variable-form')) { event.preventDefault(); save(); } });
  ui.on('input', event => {
    const key = event.target.dataset.f3Field;
    if (!['name', 'goal'].includes(key)) return;
    fields[key] = event.target.value.slice(0, key === 'name' ? 80 : 360); dirty = true; exported = false; status = '입력한 내용으로 미리보기를 갱신했습니다.'; refreshPreview();
  });
  ui.on('change', event => {
    const key = event.target.dataset.f3Field;
    if (['docA', 'docB', 'audience', 'format'].includes(key)) {
      if (key.startsWith('doc') && event.target.value && !getDoc(docs, event.target.value)) return;
      if (key === 'audience' && !Object.hasOwn(PROMPT_AUDIENCES, event.target.value)) return;
      if (key === 'format' && !Object.hasOwn(PROMPT_FORMATS, event.target.value)) return;
      fields[key] = event.target.value; dirty = true; exported = false; status = '선택한 변수로 미리보기를 갱신했습니다.'; refreshPreview();
    } else if (event.target.id === 'f3-prompt-library') {
      const id = event.target.value;
      if (id && !library.some(item => item.id === id)) return;
      buffers.set(activeId, { fields: { ...fields }, dirty });
      const buffer = buffers.get(id);
      fields = buffer ? { ...buffer.fields } : id ? { ...library.find(item => item.id === id).fields } : initial();
      dirty = buffer?.dirty || false; activeId = id; errors = {}; exported = false;
      status = id ? '프롬프트를 불러왔습니다. 저장 전 수정은 이 화면에서 유지됩니다.' : '새 프롬프트를 작성합니다.';
      render(); ui.tell(status);
    }
  });
  ui.on('click', event => {
    const target = event.target.closest('[data-f3-action]');
    if (!target || !root.contains(target) || target.disabled) return;
    const command = target.dataset.f3Action;
    if (command === 'prompt-template') {
      if (!PROMPT_TEMPLATES.some(template => template.id === target.dataset.template)) return;
      fields.template = target.dataset.template; dirty = true; errors = {}; exported = false; status = '템플릿을 바꿨습니다. 입력한 변수는 유지됩니다.'; render(); ui.tell(status);
    } else if (command === 'prompt-save') save();
    else if (command === 'prompt-export') {
      if (!ensureValid()) return;
      try {
        download(`prompt-${fields.template}.txt`, `${fields.name.trim()}\n\n${promptText()}\n`, 'text/plain;charset=utf-8');
        exported = true; status = '텍스트 파일 다운로드를 요청했습니다. 브라우저의 다운로드 목록을 확인해 주세요.';
      } catch {
        exported = false; status = '다운로드를 시작하지 못했습니다. 다시 내보내거나 미리보기의 텍스트를 선택해 복사하세요.';
      }
      render(); ui.tell(status);
      if (!exported) root.querySelector('[data-f3-focus="prompt-preview"]').focus();
    }
  });
  render();
  return () => ui.cleanup();
}

export function mount(root, ctx) {
  const docs = Array.isArray(ctx.docs) ? ctx.docs.filter(doc => doc && typeof doc.id === 'string' && typeof doc.title === 'string') : [];
  const mounts = { '11': workflow, '12': research, '13': timeline, '14': permissionDesk, '15': promptStudio };
  const candidate = mounts[String(ctx.concept.id).padStart(2, '0')];
  if (!candidate) {
    root.innerHTML = '<section class="f3-shell"><p class="empty">이 모듈은 11–15번 후보 화면을 제공합니다.</p></section>';
    return () => {};
  }
  return candidate(root, ctx, docs);
}
