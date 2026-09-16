import { h, icon, button, tag, sourceLink, download } from '../shared.js';

// These pages use only ctx.docs and browser-local user input. No content is fetched.
const FIXTURE_DATE = '2026-09-12';
const DAY = 86400000;
const PRIORITIES = { high: '높음', medium: '보통', low: '낮음' };
const STAGES = ['계획', '작성 중', '검토 중', '완료'];
const CATEGORIES = ['개념 참고', '공식 문서', '실습 자료', '기타'];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const textValue = (value, limit = 160) => typeof value === 'string' ? value.slice(0, limit) : '';
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const makeId = () => globalThis.crypto?.randomUUID?.() || `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const action = (label, attrs = '', kind = '') => button(label, `type="button" ${attrs}`, kind);
const options = (values, selected) => Object.entries(values).map(([value, label]) => `<option value="${h(value)}" ${value === selected ? 'selected' : ''}>${h(label)}</option>`).join('');
const docURL = doc => `https://docs.nodove.com/${doc.source.replace(/\.md$/, '/')}`;
const countText = count => `${count}개`;

function read(ctx, key, fallback) {
  try { return ctx.store.get(key, fallback); } catch { return fallback; }
}

function say(ctx, message) {
  if (typeof ctx.announce === 'function') ctx.announce(message);
}

function shell(root, className, content) {
  root.innerHTML = `<div class="f4-work ${className}">${content}<p class="f4-save-state" data-f4-storage role="status">${icon('shield')}<span>이 브라우저에만 저장되는 로컬 예시입니다.</span></p></div>`;
}

function save(root, ctx, key, value, message = '') {
  let saved = false;
  try { saved = ctx.store.set(key, value) !== false; } catch { /* Keep edits in memory. */ }
  const status = root.querySelector('[data-f4-storage]');
  if (status) {
    const next = saved ? '변경 사항을 이 브라우저에 저장했습니다.' : '로컬 저장이 불가능합니다. 입력은 현재 화면에 유지됩니다. 내보내기로 보관하세요.';
    if (status.textContent !== next) status.textContent = next;
    status.classList.toggle('f4-storage-error', !saved);
  }
  if (!saved) say(ctx, '로컬 저장에 실패했습니다. 현재 입력을 내보내기로 보관하세요.');
  else if (message) say(ctx, message);
  return saved;
}

function exportData(ctx, filename, data) {
  download(filename, JSON.stringify({ schemaVersion: 1, localIllustration: true, ...data }, null, 2));
  say(ctx, '로컬 기록을 JSON 파일로 내보냈습니다.');
}

// Redraw only result regions. Stable keys retain keyboard focus and caret position.
function replaceRegion(region, markup, fallback) {
  const active = document.activeElement;
  const ownedFocus = region.contains(active);
  const key = ownedFocus ? active.dataset.f4Focus : null;
  const selection = ownedFocus && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
  region.innerHTML = markup;
  if (!ownedFocus) return;
  const match = key && [...region.querySelectorAll('[data-f4-focus]')].find(el => el.dataset.f4Focus === key && !el.disabled);
  const next = match || (fallback ? region.querySelector(fallback) : null) || region;
  if (next === region) region.setAttribute('tabindex', '-1');
  next.focus({ preventScroll: true });
  if (match && selection && typeof match.setSelectionRange === 'function') match.setSelectionRange(...selection);
}

function formError(form, message, field) {
  const status = form.querySelector('[data-f4-error]');
  if (status) status.textContent = message;
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  if (field) {
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }
}

function uniqueRows(value, validate, limit) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.slice(0, limit).filter(row => {
    if (!isRecord(row) || !validId(row.id) || seen.has(row.id) || !validate(row)) return false;
    seen.add(row.id);
    return true;
  });
}

function freshness(root, ctx) {
  const key = 'f4-freshness-v1';
  const offsets = [104, 46, null, 17, 135, 68, 8, 92, 26, 61, 39, 11];
  const rows = ctx.docs.map((doc, index) => ({ doc, age: offsets[index % offsets.length] }));
  const stored = read(ctx, key, {});
  let reviewed = new Set(isRecord(stored) && Array.isArray(stored.reviewed) ? stored.reviewed.slice(0, 100).filter(id => rows.some(row => row.doc.id === id)) : []);
  let filter = 'all';
  let query = '';
  let selected = new Set();
  const statuses = { overdue: ['우선 검토', 'red'], unseen: ['기록 없음', 'amber'], soon: ['검토 예정', 'amber'], recent: ['최근 검토', ''], reviewed: ['검토 완료', 'green'] };
  const stateOf = row => reviewed.has(row.doc.id) ? 'reviewed' : row.age === null ? 'unseen' : row.age >= 90 ? 'overdue' : row.age >= 30 ? 'soon' : 'recent';
  const dateOf = row => reviewed.has(row.doc.id) ? FIXTURE_DATE : row.age === null ? null : new Date(Date.parse(`${FIXTURE_DATE}T00:00:00Z`) - row.age * DAY).toISOString().slice(0, 10);
  const visibleRows = () => rows.filter(row => (filter === 'all' || stateOf(row) === filter) && `${row.doc.title} ${row.doc.topic}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => Object.keys(statuses).indexOf(stateOf(a)) - Object.keys(statuses).indexOf(stateOf(b)) || (b.age || 0) - (a.age || 0));

  shell(root, 'f4-freshness', `<section class="panel f4-ledger" aria-labelledby="f4-ledger-title">
    <div class="panel-head"><div><div class="f4-overline">REVIEW REGISTER / 016</div><h2 id="f4-ledger-title">예시 검토 기록</h2><p class="f4-caption">기준일 <time datetime="${FIXTURE_DATE}">${FIXTURE_DATE}</time> · 실제 문서의 수정일과 무관한 검토 연습입니다.</p></div>${tag('고정 기준일', 'amber')}</div>
    <div class="f4-ledger-metrics" data-f4-metrics></div>
    <div class="f4-triage-toolbar"><div class="f4-filter-row" role="group" aria-label="검토 상태 필터" data-f4-filters></div><label class="field f4-search">문서 찾기<input id="f4-fresh-query" type="search" maxlength="160" placeholder="문서 제목 또는 분야"></label></div>
    <div class="f4-ledger-actions"><p data-f4-result-count role="status"></p><div class="row">${action('선택 항목 검토 완료', 'data-f4-bulk disabled', 'soft small')}${action('완료 표시 초기화', 'data-f4-reset', 'small')}${action(`${icon('download')} 기록 내보내기`, 'data-f4-export', 'small')}</div></div>
    <div class="f4-table-region" data-f4-table></div>
    <p class="f4-rule">90일 이상: 우선 검토 · 30–89일: 검토 예정 · 30일 미만: 최근 검토. 완료 표시는 기준일에 검토한 것으로 기록합니다.</p>
  </section>`);

  function render() {
    const counts = Object.fromEntries(Object.keys(statuses).map(status => [status, rows.filter(row => stateOf(row) === status).length]));
    root.querySelector('[data-f4-metrics]').innerHTML = [[counts.overdue + counts.unseen, '먼저 살펴볼 문서', 'f4-attention'], [counts.soon, '다음 검토 후보', ''], [counts.reviewed, '이번에 완료한 문서', 'f4-done']].map(([count, label, kind]) => `<div class="f4-ledger-metric ${kind}"><span class="metric">${count}<small> / ${rows.length}</small></span><span>${label}</span></div>`).join('');
    replaceRegion(root.querySelector('[data-f4-filters]'), [['all', '전체', rows.length], ...Object.entries(statuses).map(([id, [label]]) => [id, label, counts[id]])].map(([id, label, count]) => action(`${label}<span class="f4-count">${count}</span>`, `data-f4-filter="${id}" data-f4-focus="filter-${id}" aria-pressed="${filter === id}"`, 'small')).join(''));
    const visible = visibleRows();
    root.querySelector('[data-f4-result-count]').textContent = `${rows.length}개 중 ${visible.length}개 표시 · ${selected.size}개 선택`;
    const bulk = root.querySelector('[data-f4-bulk]');
    bulk.disabled = !selected.size;
    bulk.textContent = selected.size ? `선택 ${selected.size}개 검토 완료` : '선택 항목 검토 완료';
    root.querySelector('[data-f4-reset]').disabled = !reviewed.size;
    replaceRegion(root.querySelector('[data-f4-table]'), visible.length ? `<table class="f4-review-table"><caption class="sr-only">기준일 ${FIXTURE_DATE}의 예시 문서 검토 우선순위</caption><thead><tr><th scope="col"><label class="f4-check f4-select-all"><input type="checkbox" data-f4-all data-f4-focus="select-all" ${visible.every(row => selected.has(row.doc.id)) ? 'checked' : ''}><span class="sr-only">표시된 문서 모두 선택</span></label></th><th scope="col">문서 / 분야</th><th scope="col">검토 상태</th><th scope="col">마지막 검토</th><th scope="col">기록</th></tr></thead><tbody>${visible.map(row => {
      const status = stateOf(row);
      const date = dateOf(row);
      const done = reviewed.has(row.doc.id);
      return `<tr><td data-label="선택"><label class="f4-check"><input type="checkbox" data-f4-select="${h(row.doc.id)}" data-f4-focus="select-${h(row.doc.id)}" ${selected.has(row.doc.id) ? 'checked' : ''}><span class="sr-only">${h(row.doc.title)} 선택</span></label></td><td class="f4-document-cell" data-label="문서">${sourceLink(row.doc)}<span class="f4-cell-sub">${h(row.doc.topic)}</span></td><td data-label="검토 상태">${tag(...statuses[status])}</td><td data-label="마지막 검토"><div>${date ? `<time datetime="${date}">${date}</time><span class="f4-cell-sub">${done ? '기준일에 완료 표시' : `${row.age}일 경과`}</span>` : '검토 기록 없음'}</div></td><td data-label="기록">${action(done ? `${icon('check')} 완료 취소` : '검토 완료', `data-f4-review="${h(row.doc.id)}" data-f4-focus="review-${h(row.doc.id)}" aria-label="${h(row.doc.title)} ${done ? '완료 취소' : '검토 완료'}"`, done ? 'small' : 'soft small')}</td></tr>`;
    }).join('')}</tbody></table>` : `<div class="empty"><h3>조건에 맞는 문서가 없습니다</h3><p>다른 검토 상태를 고르거나 검색어를 지워보세요.</p>${action('필터 초기화', 'data-f4-clear')}</div>`, '[data-f4-review]');
    const all = root.querySelector('[data-f4-all]');
    if (all) all.indeterminate = visible.some(row => selected.has(row.doc.id)) && !visible.every(row => selected.has(row.doc.id));
  }

  root.querySelector('#f4-fresh-query').oninput = event => { query = event.target.value; selected.clear(); render(); };
  root.onclick = event => {
    const target = event.target.closest('button');
    if (!target || !root.contains(target)) return;
    if (target.hasAttribute('data-f4-filter')) { filter = target.dataset.f4Filter; selected.clear(); render(); }
    if (target.hasAttribute('data-f4-review')) {
      const id = target.dataset.f4Review;
      if (reviewed.has(id)) reviewed.delete(id); else reviewed.add(id);
      selected.delete(id);
      render(); save(root, ctx, key, { reviewed: [...reviewed] }, '예시 검토 기록을 변경했습니다.');
    }
    if (target.hasAttribute('data-f4-bulk')) {
      selected.forEach(id => reviewed.add(id)); selected.clear(); render();
      root.querySelector('#f4-fresh-query').focus();
      save(root, ctx, key, { reviewed: [...reviewed] }, '선택한 문서를 검토 완료로 표시했습니다.');
    }
    if (target.hasAttribute('data-f4-reset')) {
      reviewed = new Set(); selected.clear(); render(); root.querySelector('#f4-fresh-query').focus();
      save(root, ctx, key, { reviewed: [] }, '완료 표시를 지우고 예시 검토 기록으로 돌아왔습니다.');
    }
    if (target.hasAttribute('data-f4-clear')) { filter = 'all'; query = ''; selected.clear(); root.querySelector('#f4-fresh-query').value = ''; render(); root.querySelector('#f4-fresh-query').focus(); }
    if (target.hasAttribute('data-f4-export')) exportData(ctx, 'freshness-review.json', { fixtureDate: FIXTURE_DATE, notice: '예시 검토 기록이며 실제 수정일이 아닙니다.', reviews: rows.map(row => ({ id: row.doc.id, title: row.doc.title, source: docURL(row.doc), lastReviewed: dateOf(row), status: stateOf(row) })) });
  };
  root.onchange = event => {
    if (event.target.hasAttribute('data-f4-select')) {
      const id = event.target.dataset.f4Select;
      if (event.target.checked) selected.add(id); else selected.delete(id);
      render();
    }
    if (event.target.hasAttribute('data-f4-all')) { selected = new Set(event.target.checked ? visibleRows().map(row => row.doc.id) : []); render(); }
  };
  render();
}

function gapPlanner(root, ctx) {
  const key = 'f4-gap-planner-v1';
  const docIds = new Set(ctx.docs.map(doc => doc.id));
  const examples = [
    { id: 'gap-evidence', title: '검색 점수와 근거 확인의 차이 보완', priority: 'high', stage: 0, docId: 'retrieval' },
    { id: 'gap-network', title: '컨테이너 연결과 포트 공개를 나란히 설명', priority: 'medium', stage: 0, docId: 'docker' },
    { id: 'gap-restore', title: '백업 문서에 복원 점검 순서 정리', priority: 'high', stage: 1, docId: 'backup' },
    { id: 'gap-cache', title: '캐시 만료와 무효화 정책 구분 검토', priority: 'medium', stage: 2, docId: 'redis' },
  ];
  let tasks = uniqueRows(read(ctx, key, examples), row => textValue(row.title).trim(), 80).map(row => ({ id: row.id, title: textValue(row.title).trim(), priority: typeof row.priority === 'string' && Object.hasOwn(PRIORITIES, row.priority) ? row.priority : 'medium', stage: Number.isInteger(row.stage) && row.stage >= 0 && row.stage < STAGES.length ? row.stage : 0, docId: docIds.has(row.docId) ? row.docId : '' }));
  let editing = null;
  const docOptions = selected => `<option value="">연결하지 않음</option>${ctx.docs.map(doc => `<option value="${h(doc.id)}" ${doc.id === selected ? 'selected' : ''}>${h(doc.title)}</option>`).join('')}`;
  shell(root, 'f4-planner', `<section class="panel f4-task-composer" aria-labelledby="f4-task-title"><div class="panel-head"><div><div class="f4-overline">DOCUMENT BACKLOG / 017</div><h2 id="f4-task-title">어떤 설명이 더 필요한가요?</h2><p class="f4-caption">시작 작업 4개는 예시입니다. 직접 추가하고 단계별로 정리해 보세요.</p></div>${action(`${icon('download')} 보드 내보내기`, 'data-f4-export', 'small')}</div>
    <form id="f4-add-task" class="f4-add-task" novalidate><label class="field">작업 제목<input name="title" required maxlength="160" placeholder="예: 문서에 복원 점검 순서 추가" aria-describedby="f4-task-error"></label><label class="field">우선순위<select name="priority">${options(PRIORITIES, 'medium')}</select></label><label class="field">관련 자료<select name="docId">${docOptions('')}</select></label>${button(`${icon('plus')} 작업 추가`, 'type="submit"', 'primary')}<p id="f4-task-error" class="f4-form-error" data-f4-error role="alert"></p></form></section>
    <div class="f4-board-caption"><p>작업의 이전·다음 버튼으로 단계를 옮깁니다.</p><span data-f4-board-total role="status"></span></div><div class="f4-board" data-f4-board aria-label="문서 계획 칸반"></div>`);

  function taskCard(task) {
    const doc = ctx.docs.find(item => item.id === task.docId);
    if (editing?.id === task.id) return `<article class="f4-task f4-task-editing"><form data-f4-edit-form="${h(task.id)}" class="stack" novalidate><label class="field">작업 제목<input name="title" value="${h(editing.title)}" maxlength="160" required data-f4-focus="edit-title-${h(task.id)}" aria-describedby="f4-edit-error"></label><label class="field">우선순위<select name="priority" data-f4-focus="edit-priority-${h(task.id)}">${options(PRIORITIES, editing.priority)}</select></label><p id="f4-edit-error" class="f4-form-error" data-f4-error role="alert"></p><div class="row">${button('변경 저장', 'type="submit"', 'primary small')}${action('취소', `data-f4-cancel="${h(task.id)}"`, 'small')}</div></form></article>`;
    return `<article class="f4-task"><div class="f4-task-top">${tag(PRIORITIES[task.priority], task.priority === 'high' ? 'amber' : '')}<span class="f4-task-mark">${icon('file')}</span></div><h4>${h(task.title)}</h4>${doc ? `<div class="f4-task-source">${sourceLink(doc)}</div>` : '<p class="f4-caption">연결한 자료 없음</p>'}<div class="f4-task-tools">${action('수정', `data-f4-edit="${h(task.id)}" data-f4-focus="edit-${h(task.id)}" aria-label="${h(task.title)} 수정"`, 'small')}${action('삭제', `data-f4-delete="${h(task.id)}" data-f4-focus="delete-${h(task.id)}" aria-label="${h(task.title)} 삭제"`, 'small danger')}</div><div class="f4-task-moves">${action('← 이전', `data-f4-move="${h(task.id)}" data-step="-1" data-f4-focus="back-${h(task.id)}" aria-label="${h(task.title)} 이전 단계로 이동" ${task.stage === 0 ? 'disabled' : ''}`, 'small')}${action('다음 →', `data-f4-move="${h(task.id)}" data-step="1" data-f4-focus="forward-${h(task.id)}" aria-label="${h(task.title)} 다음 단계로 이동" ${task.stage === STAGES.length - 1 ? 'disabled' : ''}`, 'small')}</div></article>`;
  }

  function render() {
    root.querySelector('[data-f4-board-total]').textContent = `전체 ${tasks.length}개 · 완료 ${tasks.filter(task => task.stage === 3).length}개`;
    replaceRegion(root.querySelector('[data-f4-board]'), STAGES.map((stage, index) => {
      const lane = tasks.filter(task => task.stage === index);
      return `<section class="f4-lane" data-stage="${index}" aria-labelledby="f4-stage-${index}"><header class="f4-lane-head"><span class="f4-stage-number">0${index + 1}</span><h3 id="f4-stage-${index}">${stage}</h3><span class="f4-count">${lane.length}</span></header><div class="f4-lane-body">${lane.length ? lane.map(taskCard).join('') : `<div class="f4-lane-empty">${index === 0 ? '위에서 첫 작업을 추가하세요.' : `${stage} 단계의 작업이 없습니다.`}</div>`}</div></section>`;
    }).join(''), '[data-f4-edit]');
  }

  root.querySelector('#f4-add-task').onsubmit = event => {
    event.preventDefault();
    const form = event.currentTarget;
    const title = form.elements.title.value.trim();
    if (!title) return formError(form, '작업 제목을 입력해 주세요.', form.elements.title);
    if (tasks.length >= 80) return formError(form, '작업은 80개까지 보관할 수 있습니다. 필요 없는 작업을 삭제한 뒤 추가하세요.');
    tasks.push({ id: makeId(), title: title.slice(0, 160), priority: form.elements.priority.value, stage: 0, docId: form.elements.docId.value });
    formError(form, ''); form.elements.title.value = ''; render(); form.elements.title.focus();
    save(root, ctx, key, tasks, '계획 열에 작업을 추가했습니다.');
  };
  root.onsubmit = event => {
    if (!event.target.matches('[data-f4-edit-form]')) return;
    event.preventDefault();
    const form = event.target;
    const title = form.elements.title.value.trim();
    if (!title) return formError(form, '빈 제목은 저장할 수 없습니다.', form.elements.title);
    const task = tasks.find(item => item.id === form.dataset.f4EditForm);
    if (!task) return;
    task.title = title.slice(0, 160); task.priority = form.elements.priority.value;
    const id = task.id; editing = null; render();
    [...root.querySelectorAll('[data-f4-edit]')].find(el => el.dataset.f4Edit === id)?.focus();
    save(root, ctx, key, tasks, '작업을 수정했습니다.');
  };
  root.oninput = event => {
    if (editing && event.target.closest('[data-f4-edit-form]')) editing[event.target.name] = event.target.value;
  };
  root.onclick = event => {
    const target = event.target.closest('button');
    if (!target || !root.contains(target)) return;
    if (target.hasAttribute('data-f4-export')) exportData(ctx, 'gap-planner.json', { notice: '로컬 문서 계획 예시', stages: STAGES, tasks });
    if (target.hasAttribute('data-f4-edit')) {
      if (editing && editing.id !== target.dataset.f4Edit) { say(ctx, '열려 있는 작업의 변경을 저장하거나 취소해 주세요.'); root.querySelector('[data-f4-edit-form] input')?.focus(); return; }
      editing = { ...tasks.find(task => task.id === target.dataset.f4Edit) }; render(); root.querySelector('[data-f4-edit-form] input')?.focus();
    }
    if (target.hasAttribute('data-f4-cancel')) { const id = editing.id; editing = null; render(); [...root.querySelectorAll('[data-f4-edit]')].find(el => el.dataset.f4Edit === id)?.focus(); }
    if (target.hasAttribute('data-f4-move')) {
      const task = tasks.find(item => item.id === target.dataset.f4Move);
      if (!task) return;
      task.stage = Math.max(0, Math.min(STAGES.length - 1, task.stage + Number(target.dataset.step)));
      const id = task.id; render();
      const moves = [...root.querySelectorAll('[data-f4-move]')].filter(el => el.dataset.f4Move === id && !el.disabled);
      const next = moves.find(el => el.dataset.step === target.dataset.step) || moves[0];
      if (next) { next.focus(); next.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
      save(root, ctx, key, tasks, `${task.title}: ${STAGES[task.stage]} 단계로 이동했습니다.`);
    }
    if (target.hasAttribute('data-f4-delete')) { tasks = tasks.filter(task => task.id !== target.dataset.f4Delete); render(); save(root, ctx, key, tasks, '작업을 삭제했습니다.'); }
  };
  render();
}

function revisionReview(root, ctx) {
  const key = 'f4-revision-review-v1';
  const specs = [
    ['retrieval', '검색 점수와 근거를 구분하기', '검색 결과를 주장 자체의 증명으로 받아들이지 않도록, 원문 확인 기준을 문장에 더합니다.'],
    ['docker', '연결 범위를 분명하게 쓰기', '컨테이너끼리의 연결과 호스트 포트 공개를 구분해 읽을 수 있도록 설명의 범위를 조정합니다.'],
    ['backup', '복원 확인 단계까지 남기기', '보관 방식의 설명에서 끝나지 않고, 복원 점검이라는 다음 행동을 드러냅니다.'],
  ];
  const proposals = specs.flatMap(([id, title, reason]) => {
    const doc = ctx.docs.find(item => item.id === id);
    return doc ? [{ id, title, reason, doc, before: doc.summary, after: doc.detail }] : [];
  });
  const stored = read(ctx, key, {});
  const reviews = Object.fromEntries(proposals.map(proposal => {
    const entry = isRecord(stored) && isRecord(stored[proposal.id]) ? stored[proposal.id] : {};
    return [proposal.id, { status: ['accepted', 'held'].includes(entry.status) ? entry.status : 'pending', note: textValue(entry.note, 2000) }];
  }));
  let selected = proposals[0]?.id;
  const states = { pending: ['검토 전', ''], accepted: ['수락', 'green'], held: ['보류', 'amber'] };
  shell(root, 'f4-revision', `<section class="f4-review-banner"><div>${tag('예시 변경 제안', 'blue')}<p>큐레이션 자료의 요약과 상세 발췌를 비교합니다. 수락은 리뷰 기록에만 남습니다.</p></div>${action(`${icon('download')} 리뷰 내보내기`, 'data-f4-export', 'small')}</section><div class="f4-review-layout"><aside class="panel f4-proposal-rail" aria-label="변경 제안 목록"><div class="f4-overline">CHANGES / 018</div><h2>살펴볼 제안</h2><p class="f4-caption" data-f4-review-count role="status"></p><div data-f4-proposals class="f4-proposal-list"></div><p class="f4-rail-note">제안을 골라 문장의 차이와 변경 이유를 확인하세요.</p></aside><section class="panel f4-diff-panel" data-f4-detail aria-label="선택한 변경 제안"></section></div>`);

  function renderList() {
    root.querySelector('[data-f4-review-count]').textContent = `${proposals.length}개 중 ${Object.values(reviews).filter(review => review.status !== 'pending').length}개 판단 완료`;
    replaceRegion(root.querySelector('[data-f4-proposals]'), proposals.map((proposal, index) => action(`<span class="f4-proposal-index">0${index + 1}</span><span><strong>${h(proposal.title)}</strong><small>${h(proposal.doc.topic)}</small>${tag(...states[reviews[proposal.id].status])}</span>`, `data-f4-proposal="${h(proposal.id)}" data-f4-focus="proposal-${h(proposal.id)}" aria-pressed="${selected === proposal.id}"`, 'f4-proposal')).join(''));
  }

  function renderDetail() {
    const proposal = proposals.find(item => item.id === selected);
    if (!proposal) { root.querySelector('[data-f4-detail]').innerHTML = '<div class="empty">비교할 큐레이션 자료가 없습니다.</div>'; return; }
    const review = reviews[selected];
    const lines = (value, kind) => value.split(/(?<=[.!?])\s+/).map((line, index) => `<div class="f4-diff-line"><span class="f4-line-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span class="f4-diff-sign" aria-hidden="true">${kind === 'before' ? '−' : '+'}</span><${kind === 'before' ? 'del' : 'ins'}>${h(line)}</${kind === 'before' ? 'del' : 'ins'}></div>`).join('');
    replaceRegion(root.querySelector('[data-f4-detail]'), `<div class="panel-head"><div><h2>${h(proposal.title)}</h2>${sourceLink(proposal.doc)}</div><span data-f4-review-status>${tag(...states[review.status])}</span></div><div class="f4-diff-grid"><section class="f4-diff-side f4-before" aria-label="변경 전 예시"><header><span>− 변경 전</span><small>요약 발췌</small></header>${lines(proposal.before, 'before')}</section><section class="f4-diff-side f4-after" aria-label="변경 후 예시"><header><span>+ 변경 후</span><small>상세 발췌로 보완</small></header>${lines(proposal.after, 'after')}</section></div><div class="f4-review-reason"><span>${icon('message')}</span><div><h3>이 제안에서 확인할 점</h3><p>${h(proposal.reason)}</p></div></div><label class="field f4-review-note">나의 검토 메모<textarea data-f4-review-note data-f4-focus="review-note" rows="3" maxlength="2000" placeholder="수락 이유나 추가로 확인할 내용을 적어주세요.">${h(review.note)}</textarea><small>입력한 메모는 이 브라우저에 자동 저장됩니다.</small></label><div class="f4-decision-bar"><p>원본 문서는 수정되지 않습니다.</p><div class="row">${action('판단 초기화', `data-f4-decision="pending" data-f4-focus="decision-pending" ${review.status === 'pending' ? 'disabled' : ''}`, 'small')}${action('보류', `data-f4-decision="held" data-f4-focus="decision-held" aria-pressed="${review.status === 'held'}"`, 'small')}${action(`${icon('check')} 제안 수락`, `data-f4-decision="accepted" data-f4-focus="decision-accepted" aria-pressed="${review.status === 'accepted'}"`, 'primary')}</div></div>`, '[data-f4-decision="held"]');
  }

  root.onclick = event => {
    const target = event.target.closest('button');
    if (!target || !root.contains(target)) return;
    if (target.hasAttribute('data-f4-proposal')) { selected = target.dataset.f4Proposal; renderList(); renderDetail(); }
    if (target.hasAttribute('data-f4-decision') && reviews[selected]) {
      reviews[selected].status = target.dataset.f4Decision; renderList(); renderDetail();
      save(root, ctx, key, reviews, `제안을 ${states[reviews[selected].status][0]} 상태로 기록했습니다. 원본 문서는 수정하지 않습니다.`);
    }
    if (target.hasAttribute('data-f4-export')) exportData(ctx, 'revision-review.json', { notice: '검토 기록만 내보냅니다. 원본 문서에 적용된 변경이 아닙니다.', proposals: proposals.map(proposal => ({ id: proposal.id, title: proposal.title, source: docURL(proposal.doc), before: proposal.before, after: proposal.after, reason: proposal.reason, ...reviews[proposal.id] })) });
  };
  root.oninput = event => {
    if (event.target.hasAttribute('data-f4-review-note')) { reviews[selected].note = event.target.value.slice(0, 2000); save(root, ctx, key, reviews); }
  };
  renderList(); renderDetail();
}

// A conservative, syntax-only public-link policy. IP literals are intentionally
// excluded altogether; no DNS, metadata, preview, favicon, or fetch is requested.
function publicLink(value) {
  if (typeof value !== 'string' || value.length > 2048) return { error: '주소는 2,048자 이내로 입력해 주세요.' };
  const raw = value.trim();
  if (!/^https:\/\//i.test(raw) || /[\s\\\u0000-\u001f\u007f]/.test(raw)) return { error: '공개 HTTPS 주소를 입력해 주세요. 공백이나 역슬래시는 사용할 수 없습니다.' };
  let url;
  try { url = new URL(raw); } catch { return { error: '올바른 공개 HTTPS 주소인지 확인해 주세요.' }; }
  if (url.protocol !== 'https:' || url.username || url.password || /^https:\/\/[^/?#]*@/i.test(raw) || (url.port && url.port !== '443')) return { error: '계정 정보가 없는 기본 HTTPS 포트의 공개 주소만 저장할 수 있습니다.' };
  if (raw.includes('?') || raw.includes('#')) return { error: '쿼리 문자열(?)과 프래그먼트(#)는 저장하지 않습니다. 인증 정보가 없는 문서의 기본 주소를 입력해 주세요.' };
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  const labels = host.split('.');
  const privateSuffix = /(?:^|\.)(?:localhost|local|internal|intranet|private|lan|home|corp|test|invalid|example|onion|arpa)$/i;
  const localAlias = /(?:^|\.)(?:localtest\.me|lvh\.me|nip\.io|sslip\.io|localhost\.direct|vcap\.me)$/i;
  if (host.includes(':') || /^[\d.]+$/.test(host) || labels.length < 2 || privateSuffix.test(host) || localAlias.test(host) || labels.some(label => /^(?:localhost|local|internal|intranet|private|lan|corp|home)$/.test(label) || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || !/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/.test(labels.at(-1))) return { error: 'localhost, 내부 도메인, IP 주소는 저장할 수 없습니다. 공개 문서의 도메인 주소를 사용해 주세요.' };
  let decoded;
  try { decoded = decodeURIComponent(url.pathname); } catch { return { error: '주소의 문자 인코딩을 확인해 주세요.' }; }
  if (/(?:^|\/)(?:private|internal|intranet|credentials?|secrets?|tokens?|login|signin|oauth|sso)(?:\/|$)/i.test(decoded)) return { error: '인증 정보나 내부 경로가 포함된 주소는 저장할 수 없습니다. 공개 문서의 공유 주소를 사용해 주세요.' };
  url.hostname = host;
  return { url: url.href };
}

function sourceCollection(root, ctx) {
  const key = 'f4-source-collection-v1';
  const examples = ctx.docs.slice(0, 3).map((doc, index) => ({ id: `reference-${index}`, title: doc.title, url: docURL(doc), category: '개념 참고', example: true }));
  let entries = uniqueRows(read(ctx, key, examples), row => textValue(row.title).trim() && !publicLink(row.url).error, 100).map(row => ({ id: row.id, title: textValue(row.title).trim(), url: publicLink(row.url).url, category: CATEGORIES.includes(row.category) ? row.category : '기타', example: row.example === true }));
  entries = entries.filter((entry, index) => entries.findIndex(other => other.url === entry.url) === index);
  let query = '';
  let category = '전체';
  shell(root, 'f4-library', `<aside class="panel f4-collect-panel" aria-labelledby="f4-collect-title"><div class="f4-overline">REFERENCE LIBRARY / 019</div><h2 id="f4-collect-title">좋은 출처를<br>다시 찾을 수 있게.</h2><p class="f4-collect-intro">공개 링크에 이름과 분류를 붙여 나만의 참고 목록을 만드세요.</p><form id="f4-collect-form" class="stack" novalidate><label class="field">자료 제목<input name="title" required maxlength="160" placeholder="다시 찾기 쉬운 이름" aria-describedby="f4-link-error"></label><label class="field">공개 HTTPS 주소<input name="url" type="url" required maxlength="2048" placeholder="https://docs.nodove.com/…" spellcheck="false" autocomplete="off" aria-describedby="f4-url-help f4-link-error"></label><p id="f4-url-help" class="f4-caption">공개 도메인의 기본 주소를 입력하세요. 계정 정보, 내부 주소, IP, 쿼리(?)·프래그먼트(#)는 저장하지 않습니다.</p><label class="field">분류<select name="category">${options(Object.fromEntries(CATEGORIES.map(value => [value, value])), '개념 참고')}</select></label><p id="f4-link-error" class="f4-form-error" data-f4-error role="alert"></p>${button(`${icon('plus')} 자료함에 담기`, 'type="submit"', 'primary')}</form><div class="f4-link-boundary">${icon('book')}<p><strong>내용 미수집 · 링크만 저장</strong><br>주소를 방문하거나 내용을 가져오지 않습니다. 주소 형식만 검사하며 실제 공개 여부는 확인하지 않습니다.</p></div></aside>
    <section class="panel f4-library-index" aria-labelledby="f4-library-title"><div class="panel-head"><div><h2 id="f4-library-title">나의 참고 목록</h2><p class="f4-caption">기본 자료는 공통 큐레이션의 예시 출처입니다.</p></div>${action(`${icon('download')} 전체 참고문헌 내보내기`, 'data-f4-export', 'small')}</div><label class="field f4-library-search">자료 검색<input type="search" id="f4-source-search" maxlength="160" placeholder="제목, 주소, 분류로 찾기"></label><div class="f4-filter-row" data-f4-categories role="group" aria-label="자료 분류"></div><p class="f4-index-count" data-f4-source-count role="status"></p><div class="f4-reference-list" data-f4-references></div></section>`);

  function render() {
    const visible = entries.filter(entry => (category === '전체' || entry.category === category) && `${entry.title} ${entry.url} ${entry.category}`.toLowerCase().includes(query.toLowerCase().trim()));
    replaceRegion(root.querySelector('[data-f4-categories]'), ['전체', ...CATEGORIES].map(value => action(`${h(value)}<span class="f4-count">${value === '전체' ? entries.length : entries.filter(entry => entry.category === value).length}</span>`, `data-f4-category="${h(value)}" data-f4-focus="category-${h(value)}" aria-pressed="${category === value}"`, 'small')).join(''));
    root.querySelector('[data-f4-source-count]').textContent = `전체 ${entries.length}개 중 ${visible.length}개 표시`;
    root.querySelector('[data-f4-export]').disabled = !entries.length;
    replaceRegion(root.querySelector('[data-f4-references]'), visible.length ? visible.map((entry, index) => `<article class="f4-reference"><span class="f4-reference-number">${String(index + 1).padStart(2, '0')}</span><div class="f4-reference-body"><div class="f4-reference-meta">${tag(entry.category)}${entry.example ? '<span>예시 출처</span>' : '<span>직접 등록</span>'}</div><h3><a class="f4-reference-link" href="${h(entry.url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${h(entry.title)} <span aria-hidden="true">↗</span><span class="sr-only"> (새 탭)</span></a></h3><p class="f4-url">${h(entry.url)}</p><p class="f4-unfetched">내용 미수집 · 링크만 저장</p></div>${action(icon('close'), `data-f4-delete-reference="${h(entry.id)}" data-f4-focus="reference-delete-${h(entry.id)}" aria-label="${h(entry.title)} 삭제"`, 'small f4-reference-delete')}</article>`).join('') : `<div class="empty"><h3>${entries.length ? '찾는 자료가 없습니다' : '첫 자료를 담아보세요'}</h3><p>${entries.length ? '검색어나 분류를 바꾸면 다른 자료를 볼 수 있습니다.' : '공개 링크를 등록하면 이곳에서 다시 찾을 수 있습니다.'}</p>${entries.length ? action('검색 조건 초기화', 'data-f4-clear-search') : action('자료 제목 입력하기', 'data-f4-start-link')}</div>`, '[data-f4-delete-reference]');
  }

  const form = root.querySelector('#f4-collect-form');
  form.onsubmit = event => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) return formError(form, '자료 제목을 입력해 주세요.', form.elements.title);
    const validated = publicLink(form.elements.url.value);
    if (validated.error) return formError(form, validated.error, form.elements.url);
    if (entries.some(entry => entry.url === validated.url)) return formError(form, '이미 담은 주소입니다. 목록에서 기존 자료를 확인해 주세요.', form.elements.url);
    if (entries.length >= 100) return formError(form, '자료는 100개까지 보관할 수 있습니다. 필요 없는 링크를 삭제한 뒤 추가하세요.');
    entries.unshift({ id: makeId(), title: title.slice(0, 160), url: validated.url, category: form.elements.category.value, example: false });
    formError(form, ''); form.elements.title.value = ''; form.elements.url.value = '';
    query = ''; category = '전체'; root.querySelector('#f4-source-search').value = ''; render(); form.elements.title.focus();
    save(root, ctx, key, entries, '링크를 저장했습니다. 자료 내용은 가져오지 않았습니다.');
  };
  root.querySelector('#f4-source-search').oninput = event => { query = event.target.value; render(); };
  root.onclick = event => {
    const target = event.target.closest('button');
    if (!target || !root.contains(target)) return;
    if (target.hasAttribute('data-f4-category')) { category = target.dataset.f4Category; render(); }
    if (target.hasAttribute('data-f4-delete-reference')) { entries = entries.filter(entry => entry.id !== target.dataset.f4DeleteReference); render(); save(root, ctx, key, entries, '자료함에서 링크를 삭제했습니다.'); }
    if (target.hasAttribute('data-f4-clear-search')) { query = ''; category = '전체'; root.querySelector('#f4-source-search').value = ''; render(); root.querySelector('#f4-source-search').focus(); }
    if (target.hasAttribute('data-f4-start-link')) form.elements.title.focus();
    if (target.hasAttribute('data-f4-export')) exportData(ctx, 'source-references.json', { notice: '주소와 분류만 저장한 목록입니다. 자료의 내용과 공개 여부는 확인하지 않았습니다.', references: entries.map(entry => ({ ...entry, fetched: false })) });
  };
  render();
}

function localWorkspace(root, ctx) {
  const key = 'f4-local-workspace-v1';
  const docIds = new Set(ctx.docs.map(doc => doc.id));
  const examples = {
    activeId: 'research',
    spaces: [
      { id: 'research', name: '검색 근거 점검', resources: ['retrieval', 'mcp'], tasks: [{ id: 'read-summary', title: '검색과 집중의 차이 읽기', done: true }, { id: 'check-source', title: '주장에 맞는 근거 확인 기준 정리', done: false }], notes: '예시 작업 메모\n\n검색 결과를 읽을 때, 주장과 직접 연결되는 근거인지 먼저 확인한다. 다음에는 도구가 반환한 자료의 신뢰 경계를 정리해 보자.' },
      { id: 'infra-reading', name: '인프라 읽기', resources: ['backup', 'docker'], tasks: [{ id: 'restore-notes', title: '복원 점검에서 확인할 내용 적기', done: false }], notes: '예시 작업 메모\n\n백업과 스냅샷의 용도를 구분하며 읽기.' },
    ],
  };
  const stored = read(ctx, key, examples);
  let spaces = uniqueRows(isRecord(stored) ? stored.spaces : [], row => textValue(row.name, 60).trim(), 12).map(row => ({ id: row.id, name: textValue(row.name, 60).trim(), resources: Array.isArray(row.resources) ? [...new Set(row.resources.slice(0, 100).filter(id => docIds.has(id)))] : [], tasks: uniqueRows(row.tasks, task => textValue(task.title).trim(), 60).map(task => ({ id: task.id, title: textValue(task.title).trim(), done: task.done === true })), notes: textValue(row.notes, 12000), todoDraft: textValue(row.todoDraft, 160) }));
  if (!spaces.length) spaces = [{ id: makeId(), name: '나의 작업 공간', resources: [], tasks: [], notes: '', todoDraft: '' }];
  let activeId = spaces.some(space => space.id === stored?.activeId) ? stored.activeId : spaces[0].id;
  const active = () => spaces.find(space => space.id === activeId);
  const persist = message => save(root, ctx, key, { activeId, spaces }, message);
  shell(root, 'f4-workspace', `<div class="f4-workspace-top"><div><div class="f4-overline">LOCAL DESK / 020</div><h2>작업의 맥락을 한곳에</h2><p class="f4-caption">예시 공간에서 시작해 보세요. 자료, 할 일, 메모는 공간별로 따로 저장됩니다.</p></div>${action(`${icon('download')} 현재 공간 내보내기`, 'data-f4-export', 'small')}</div><div class="f4-workspace-layout"><aside class="panel f4-session-rail" aria-label="작업 공간 관리"><label class="field" for="f4-space-picker">작업 공간<select id="f4-space-picker"></select></label><div class="f4-session-summary" data-f4-space-summary></div><form id="f4-new-space" class="stack" novalidate><label class="field">새 공간 이름<input name="name" required maxlength="60" placeholder="예: 주간 문서 점검" aria-describedby="f4-space-error"></label><p id="f4-space-error" class="f4-form-error" data-f4-error role="alert"></p>${button(`${icon('plus')} 새 공간 만들기`, 'type="submit"', 'soft')}</form><p class="f4-rail-note">이 기기의 브라우저에서 이어갈 수 있습니다. 다른 기기로 옮길 때는 현재 공간을 내보내세요.</p></aside><div class="f4-workbench" data-f4-workbench></div><aside class="panel f4-resource-panel" data-f4-resource-panel aria-label="작업 자료"></aside></div>`);

  function renderPicker() {
    root.querySelector('#f4-space-picker').innerHTML = spaces.map(space => `<option value="${h(space.id)}" ${space.id === activeId ? 'selected' : ''}>${h(space.name)}</option>`).join('');
  }

  function renderSummary() {
    const space = active();
    const done = space.tasks.filter(task => task.done).length;
    root.querySelector('[data-f4-space-summary]').innerHTML = `<span class="f4-overline">THIS WORKSPACE</span><strong>${h(space.name)}</strong><div><span>연결한 자료</span><b>${countText(space.resources.length)}</b></div><div><span>완료한 할 일</span><b>${done} / ${space.tasks.length}</b></div><progress value="${done}" max="${space.tasks.length || 1}" aria-label="할 일 ${space.tasks.length}개 중 ${done}개 완료"></progress>`;
  }

  function renderTasks() {
    const space = active();
    root.querySelector('[data-f4-todo-count]').textContent = `${space.tasks.filter(task => task.done).length} / ${space.tasks.length} 완료`;
    replaceRegion(root.querySelector('[data-f4-todos]'), space.tasks.length ? space.tasks.map(task => `<div class="f4-todo ${task.done ? 'f4-todo-done' : ''}"><label class="f4-check"><input type="checkbox" data-f4-todo="${h(task.id)}" data-f4-focus="todo-${h(task.id)}" ${task.done ? 'checked' : ''}><span>${h(task.title)}</span></label>${action(icon('close'), `data-f4-delete-todo="${h(task.id)}" data-f4-focus="delete-todo-${h(task.id)}" aria-label="${h(task.title)} 삭제"`, 'small')}</div>`).join('') : '<p class="f4-todo-empty">다음에 할 작은 작업 하나를 적어보세요.</p>', '[data-f4-todo]');
    renderSummary();
  }

  function renderSelectedResources() {
    const space = active();
    root.querySelector('[data-f4-resource-count]').textContent = `${space.resources.length}개 선택`;
    root.querySelector('[data-f4-selected-resources]').innerHTML = space.resources.length ? ctx.docs.filter(doc => space.resources.includes(doc.id)).map(doc => `<div class="f4-picked-resource">${sourceLink(doc)}<p>${h(doc.topic)} · ${doc.minutes}분 읽기</p></div>`).join('') : '<p class="f4-todo-empty">아래 자료 선택에서 이번 작업에 필요한 문서를 담으세요.</p>';
    renderSummary();
  }

  function renderSpace() {
    const space = active();
    renderPicker(); renderSummary();
    root.querySelector('[data-f4-workbench]').innerHTML = `<section class="panel f4-notepad" aria-labelledby="f4-notepad-title"><div class="panel-head"><div><span class="f4-overline">WORKING NOTES</span><h3 id="f4-notepad-title">${h(space.name)}</h3></div>${tag('로컬 메모')}</div><label class="field" for="f4-space-notes">작업 메모</label><textarea id="f4-space-notes" rows="10" maxlength="12000" placeholder="다음에 이어갈 생각, 읽은 내용, 남은 질문을 적어주세요." aria-describedby="f4-notes-help">${h(space.notes)}</textarea><div class="f4-note-footer"><span id="f4-notes-help">입력할 때마다 이 브라우저에 저장</span><span data-f4-note-length>${space.notes.length.toLocaleString()} / 12,000자</span></div></section><section class="panel f4-checklist" aria-labelledby="f4-checklist-title"><div class="panel-head"><h3 id="f4-checklist-title">다음에 할 일</h3><span class="f4-caption" data-f4-todo-count role="status"></span></div><div data-f4-todos></div><form id="f4-add-todo" class="f4-todo-form" novalidate><label class="field"><span class="sr-only">새 할 일</span><input name="title" value="${h(space.todoDraft)}" required maxlength="160" placeholder="작은 작업 하나 추가" aria-describedby="f4-todo-error"></label>${button(`${icon('plus')} 추가`, 'type="submit"', 'soft')}<p id="f4-todo-error" class="f4-form-error" data-f4-error role="alert"></p></form></section>`;
    root.querySelector('[data-f4-resource-panel]').innerHTML = `<div class="panel-head"><h3>이번 작업의 자료</h3><span class="f4-caption" data-f4-resource-count></span></div><div data-f4-selected-resources></div><details class="f4-resource-picker"><summary>${icon('plus')} 자료 선택 · ${ctx.docs.length}개</summary><p>공통 큐레이션에 있는 공개 학습 자료입니다.</p><div class="f4-resource-choices">${ctx.docs.map(doc => `<label class="f4-check f4-resource-choice"><input type="checkbox" data-f4-resource="${h(doc.id)}" ${space.resources.includes(doc.id) ? 'checked' : ''}><span>${h(doc.title)}<small>${h(doc.topic)}</small></span></label>`).join('')}</div></details>`;
    renderTasks(); renderSelectedResources();
    root.querySelector('#f4-space-notes').oninput = event => {
      active().notes = event.target.value.slice(0, 12000);
      root.querySelector('[data-f4-note-length]').textContent = `${active().notes.length.toLocaleString()} / 12,000자`;
      persist();
    };
    root.querySelector('#f4-add-todo [name=title]').oninput = event => {
      active().todoDraft = textValue(event.target.value, 160);
      persist();
    };
    root.querySelector('#f4-add-todo').onsubmit = event => {
      event.preventDefault();
      const form = event.currentTarget;
      const title = form.elements.title.value.trim();
      if (!title) return formError(form, '할 일을 입력해 주세요.', form.elements.title);
      if (active().tasks.length >= 60) return formError(form, '할 일은 60개까지 보관할 수 있습니다. 정리한 뒤 추가해 주세요.');
      active().tasks.push({ id: makeId(), title: title.slice(0, 160), done: false });
      active().todoDraft = '';
      formError(form, ''); form.elements.title.value = ''; renderTasks(); form.elements.title.focus(); persist('현재 공간에 할 일을 추가했습니다.');
    };
  }

  root.querySelector('#f4-space-picker').onchange = event => {
    activeId = event.target.value;
    renderSpace(); persist(`${active().name} 공간으로 전환했습니다.`);
  };
  root.querySelector('#f4-new-space').onsubmit = event => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    if (!name) return formError(form, '새 공간 이름을 입력해 주세요.', form.elements.name);
    if (spaces.length >= 12) return formError(form, '작업 공간은 12개까지 보관할 수 있습니다. 기존 공간을 선택해 이어가세요.');
    if (spaces.some(space => space.name === name)) return formError(form, '이미 있는 이름입니다. 구분할 수 있는 다른 이름을 적어주세요.', form.elements.name);
    activeId = makeId(); spaces.push({ id: activeId, name: name.slice(0, 60), resources: [], tasks: [], notes: '', todoDraft: '' });
    formError(form, ''); form.elements.name.value = ''; renderSpace(); root.querySelector('#f4-space-notes').focus(); persist('빈 작업 공간을 만들었습니다.');
  };
  root.onchange = event => {
    if (event.target.hasAttribute('data-f4-todo')) {
      const task = active().tasks.find(item => item.id === event.target.dataset.f4Todo);
      if (!task) return;
      task.done = event.target.checked; renderTasks(); persist(task.done ? '할 일을 완료했습니다.' : '할 일을 미완료로 되돌렸습니다.');
    }
    if (event.target.hasAttribute('data-f4-resource')) {
      const id = event.target.dataset.f4Resource;
      if (!docIds.has(id)) return;
      active().resources = event.target.checked ? [...new Set([...active().resources, id])] : active().resources.filter(value => value !== id);
      renderSelectedResources(); persist('현재 공간의 자료 선택을 저장했습니다.');
    }
  };
  root.onclick = event => {
    const target = event.target.closest('button');
    if (!target || !root.contains(target)) return;
    if (target.hasAttribute('data-f4-delete-todo')) { active().tasks = active().tasks.filter(task => task.id !== target.dataset.f4DeleteTodo); renderTasks(); persist('현재 공간에서 할 일을 삭제했습니다.'); }
    if (target.hasAttribute('data-f4-export')) exportData(ctx, 'local-workspace.json', { notice: '현재 작업 공간의 로컬 기록입니다.', workspace: { ...active(), resources: ctx.docs.filter(doc => active().resources.includes(doc.id)).map(doc => ({ id: doc.id, title: doc.title, url: docURL(doc) })) } });
  };
  renderSpace();
}

export function mount(root, ctx) {
  // The parent owns the page shell, navigation, evaluation and shared styles.
  root.onclick = null;
  root.oninput = null;
  root.onchange = null;
  root.onsubmit = null;
  switch (String(ctx.concept.id)) {
    case '16': return freshness(root, ctx);
    case '17': return gapPlanner(root, ctx);
    case '18': return revisionReview(root, ctx);
    case '19': return sourceCollection(root, ctx);
    case '20': return localWorkspace(root, ctx);
    default: throw new Error('Unsupported family-4 concept');
  }
}
