import { h, icon, button, tag, download, docs as publicDocs } from '../shared.js';

// All learning material and execution rules are local, curated examples.
// Persistence is deliberately routed through the lab's namespaced store.
const keys = {
  '06': 'f2:06:learning-path:v1',
  '07': 'f2:07:concept-tutor:v1',
  '08': 'f2:08:recall-studio:v1',
  '09': 'f2:09:code-walkthrough:v1',
  '10': 'f2:10:study-notebook:v1',
};

const action = (label, name, kind = '', attrs = '') => button(
  label,
  `type="button" data-f2-action="${h(name)}" data-f2-focus="${h(name)}" ${attrs}`,
  kind,
);

function paint(root, html, focusKey) {
  const active = root.ownerDocument.activeElement;
  const hadFocus = root.contains(active);
  const key = focusKey || (hadFocus ? active?.dataset.f2Focus : null);
  const selection = hadFocus && typeof active.selectionStart === 'number'
    ? [active.selectionStart, active.selectionEnd, active.selectionDirection] : null;
  root.innerHTML = html;
  if (!key && !hadFocus) return;
  const target = [...root.querySelectorAll('[data-f2-focus]')]
    .find(el => el.dataset.f2Focus === key && !el.disabled)
    || root.querySelector('[data-f2-heading]');
  target?.focus({ preventScroll: true });
  if (selection && !focusKey && typeof target?.setSelectionRange === 'function') {
    try { target.setSelectionRange(...selection); } catch { /* Not a text input. */ }
  }
}

function events(root, handlers) {
  const controller = new AbortController();
  for (const [type, handler] of Object.entries(handlers)) {
    root.addEventListener(type, event => {
      const target = type === 'click' ? event.target.closest('[data-f2-action]') : event.target;
      if (target && root.contains(target) && !target.disabled) handler(event, target);
    }, { signal: controller.signal });
  }
  return () => controller.abort();
}

function persistence(ctx, id) {
  let failed = false;
  return {
    read(fallback) {
      try { return ctx.store.get(keys[id], fallback) ?? fallback; } catch { return fallback; }
    },
    write(value) {
      try { failed = ctx.store.set(keys[id], value) === false; } catch { failed = true; }
      return !failed;
    },
    get failed() { return failed; },
    banner() {
      return failed ? `<div class="f2-storage-warning" role="alert"><div><strong>브라우저에 저장하지 못했어요.</strong><p>현재 화면의 내용은 유지됩니다. 저장을 다시 시도해 주세요.${id === '10' ? ' 노트를 내보내 보관할 수도 있어요.' : ''}</p></div>${action('저장 다시 시도', 'retry-save', 'small')}</div>` : '';
    },
  };
}

function notify(ctx, message) {
  if (typeof ctx.announce === 'function') ctx.announce(message);
}

function getDocs(ctx) {
  const available = Array.isArray(ctx.docs) ? ctx.docs : [];
  // Limit the surface to the explicit public sample catalog, including fallback.
  return publicDocs.map(sample => available.find(doc => doc?.id === sample.id
    && ['title', 'summary', 'detail', 'source', 'topic'].every(key => typeof doc[key] === 'string')) || sample);
}

function localExcerpt(doc, open = false) {
  return `<details class="f2-excerpt" ${open ? 'open' : ''}><summary>${icon('book')}<span>예시 문서에서 확인하기</span></summary><div class="f2-excerpt-body"><strong>${h(doc.title)}</strong><p>${h(doc.detail)}</p><span class="f2-local-source">공개 문서 발췌 · ${h(doc.source)}</span></div></details>`;
}

function progress(value, total, label) {
  return `<div class="f2-progress" role="progressbar" aria-label="${h(label)}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${value}"><span style="transform:scaleX(${total ? value / total : 0})"></span></div>`;
}

const paths = [
  {
    id: 'evidence', title: '근거 있는 AI 답변 이해하기', short: 'AI 답변의 근거', subtitle: '검색에서 도구의 신뢰 경계까지', icon: 'search',
    outcome: '답변의 근거와 실행 흐름을 구분해 설명할 수 있어요.',
    steps: [
      { doc: 'retrieval', title: '검색과 이해를 구분하기', task: '검색 점수가 높은 구절을 찾았다면, 답변에 쓰기 전에 무엇을 확인해야 할까요?', takeaway: '질문과 관련된 구절인지, 그 구절이 주장을 실제로 뒷받침하는지 원문에서 확인해요.' },
      { doc: 'graph', title: '흐름에 분기점 만들기', task: '작업을 반복하거나 중간부터 다시 시작해야 할 때, 무엇을 명시하면 좋을까요?', takeaway: '상태와 전이 조건을 명시하면 재시도와 복구 지점을 검토할 수 있어요.' },
      { doc: 'mcp', title: '도구의 신뢰 경계 읽기', task: '도구가 돌려준 문장에 새로운 실행 지시가 들어 있다면 어떻게 다뤄야 할까요?', takeaway: '반환된 데이터와 실행 권한을 분리해요. 도구의 문장이 사용자의 권한을 대신하지 않아요.' },
    ],
  },
  {
    id: 'systems', title: '서비스 연결과 복구 이해하기', short: '서비스 연결과 복구', subtitle: '네트워크에서 복원 점검까지', icon: 'layers',
    outcome: '연결 확인과 복구 준비의 순서를 설명할 수 있어요.',
    steps: [
      { doc: 'network', title: '연결 확인의 순서 세우기', task: '서비스에 연결되지 않을 때 어떤 순서로 범위를 좁혀 볼까요?', takeaway: '인터페이스, 주소, 라우팅, DNS 순서로 살펴보며 어디에서 연결이 끊기는지 확인해요.' },
      { doc: 'docker', title: '컨테이너 연결 구분하기', task: '컨테이너끼리의 통신과 호스트 포트 공개는 같은 설정일까요?', takeaway: '서로 다른 범위의 설정이에요. 서비스 이름을 통한 내부 연결과 외부 포트 공개를 각각 확인해요.' },
      { doc: 'backup', title: '되돌리기와 복구 준비하기', task: '백업 파일이 있다는 사실만으로 복구 준비가 끝났다고 할 수 있을까요?', takeaway: '복원 점검을 통해 실제로 복구할 수 있는지 확인해야 해요.' },
    ],
  },
  {
    id: 'data', title: '데이터를 빠르고 정확하게 읽기', short: '데이터 읽기의 기본', subtitle: '캐시, 조회, 자원 대기의 관계', icon: 'book',
    outcome: '속도와 정확성을 함께 확인할 질문을 만들 수 있어요.',
    steps: [
      { doc: 'redis', title: '캐시와 원본의 간격 읽기', task: '캐시에 값이 남아 있지만 원본이 바뀌었다면 어떤 정책을 살펴봐야 할까요?', takeaway: '만료 시간과 무효화 정책을 확인해 오래된 값이 제공될 수 있는 시간을 이해해요.' },
      { doc: 'query', title: '표현과 실행을 구분하기', task: '타입 안전한 쿼리라면 빠르게 실행된다고 볼 수 있을까요?', takeaway: '실행된 SQL, 조회 조건, 결과 개수와 인덱스를 별도로 확인해야 해요.' },
      { doc: 'deadlock', title: '서로 기다리는 자원 살피기', task: '작업들이 서로의 자원을 기다리는 상황을 어떻게 시각화할 수 있을까요?', takeaway: '자원 할당 관계를 그려 순환 대기를 확인해요. 예방과 회피, 탐지 후 복구는 서로 다른 접근이에요.' },
    ],
  },
];

function mountPath(root, ctx) {
  const docs = getDocs(ctx);
  const storage = persistence(ctx, '06');
  const saved = storage.read({});
  const state = {
    goal: paths.some(path => path.id === saved.goal) ? saved.goal : paths[0].id,
    completed: Object.fromEntries(paths.map(path => [path.id, path.steps.map((_, index) => saved.completed?.[path.id]?.[index] === true)])),
    selected: {},
  };
  for (const path of paths) {
    const index = saved.selected?.[path.id];
    state.selected[path.id] = Number.isInteger(index) && index >= 0 && index < path.steps.length
      ? index : Math.max(0, state.completed[path.id].findIndex(done => !done));
  }
  let message = '작은 한 단계부터 시작해 보세요.';
  let showTakeaway = false;
  const save = () => storage.write(state);

  function render(focus) {
    const path = paths.find(item => item.id === state.goal);
    const selected = state.selected[path.id];
    const step = path.steps[selected];
    const doc = docs.find(item => item.id === step.doc);
    const completed = state.completed[path.id];
    const count = completed.filter(Boolean).length;
    paint(root, `<section class="f2-work-area f2-path" aria-label="학습 경로 작업 영역">
      ${storage.banner()}
      <div class="f2-path-layout">
        <aside class="f2-path-map">
          <div class="f2-path-label">${icon('graph')}<span>MY LEARNING PATH</span></div>
          <label class="f2-label" for="f2-goal">오늘 도착하고 싶은 곳</label>
          <select class="field f2-goal-select" id="f2-goal" data-f2-focus="goal" data-f2-field="goal">${paths.map(item => `<option value="${item.id}" ${item.id === path.id ? 'selected' : ''}>${h(item.title)}</option>`).join('')}</select>
          <p class="f2-path-subtitle">${h(path.subtitle)}</p>
          <div class="f2-path-progress"><div class="row"><strong>${count === 3 ? '목표에 도착했어요' : '나의 학습 진도'}</strong><span class="mono">${count} / 3</span></div>${progress(count, 3, '완료한 학습 단계')}</div>
          <ol class="f2-step-list">${path.steps.map((item, index) => `<li class="f2-step ${index === selected ? 'f2-step-current' : ''} ${completed[index] ? 'f2-step-done' : ''}"><button type="button" data-f2-action="select-step" data-f2-step="${index}" data-f2-focus="step-${index}" ${index === selected ? 'aria-current="step"' : ''}><span class="f2-step-dot">${completed[index] ? icon('check') : `0${index + 1}`}</span><span><strong>${h(item.title)}</strong><small>${completed[index] ? '학습 완료' : index === selected ? '지금 학습 중' : '이어서 학습'} · ${h(docs.find(doc => doc.id === item.doc).minutes)}분</small></span></button></li>`).join('')}</ol>
          <div class="f2-path-destination">${icon('star')}<p>${h(path.outcome)}</p></div>
          ${action('이 목표의 진도 초기화', 'reset-path', 'small', count === 0 ? 'disabled' : '')}
        </aside>
        <article class="panel f2-lesson">
          <div class="panel-head"><span class="eyebrow">STEP 0${selected + 1} <span class="f2-soft-text">/ 03</span></span>${tag('로컬 예시')}</div>
          <h2 class="f2-lesson-title" tabindex="-1" data-f2-heading data-f2-focus="lesson-heading">${h(step.title)}</h2>
          <p class="f2-lesson-intro">${h(doc.summary)}</p>
          <div class="f2-reading-sheet"><div class="f2-reading-meta">${icon('file')}<span>오늘의 읽기</span><span>${h(doc.minutes)}분</span></div><h3>${h(doc.title)}</h3><p>${h(doc.detail)}</p><span class="f2-local-source">공개 문서 발췌 · ${h(doc.source)}</span></div>
          <div class="f2-reflection"><span class="eyebrow">잠깐, 내 말로 설명해 보기</span><h3>${h(step.task)}</h3>${action(`${showTakeaway ? '핵심 문장 접기' : '핵심 문장 확인'} ${icon('arrow')}`, 'takeaway', 'soft', `aria-expanded="${showTakeaway}" aria-controls="f2-takeaway"`)}<p class="f2-takeaway" id="f2-takeaway" ${showTakeaway ? '' : 'hidden'}>${h(step.takeaway)}</p></div>
          <div class="f2-lesson-footer"><div><span class="f2-save-caption">${icon(storage.failed ? 'clock' : 'check')}${storage.failed ? '현재 화면에 유지 중' : '진도는 이 브라우저에 보관돼요'}</span><p class="f2-status" role="status">${h(message)}</p></div>${action(completed[selected] ? `${icon('check')} 완료한 단계 · 되돌리기` : `이 단계 완료 ${icon('arrow')}`, 'complete-step', completed[selected] ? 'soft' : 'primary')}</div>
          ${count === 3 ? `<div class="f2-path-finished">${icon('star')}<div><strong>세 단계를 모두 마쳤어요.</strong><p>목표를 바꾸어 새로운 경로를 시작하거나, 완료한 단계를 다시 읽어 보세요.</p></div></div>` : ''}
        </article>
      </div>
    </section>`, focus);
  }

  const cleanup = events(root, {
    click(_, target) {
      const name = target.dataset.f2Action;
      const done = state.completed[state.goal];
      let focus;
      if (name === 'select-step') {
        state.selected[state.goal] = Number(target.dataset.f2Step);
        showTakeaway = false;
        message = `${state.selected[state.goal] + 1}단계를 펼쳤어요.`;
      } else if (name === 'takeaway') {
        showTakeaway = !showTakeaway;
        render();
        return;
      } else if (name === 'complete-step') {
        const index = state.selected[state.goal];
        done[index] = !done[index];
        const next = done.findIndex(value => !value);
        message = done[index] ? `${index + 1}단계를 완료했어요.${next >= 0 ? ' 다음 단계를 이어가세요.' : ' 목표에 도착했어요!'}` : `${index + 1}단계를 다시 학습할 수 있어요.`;
        if (done[index] && next >= 0) {
          state.selected[state.goal] = next;
          showTakeaway = false;
          focus = 'lesson-heading';
        }
      } else if (name === 'reset-path') {
        state.completed[state.goal] = [false, false, false];
        state.selected[state.goal] = 0;
        showTakeaway = false;
        message = '이 목표의 진도를 초기화했어요. 첫 단계부터 다시 시작하세요.';
        focus = 'lesson-heading';
      } else if (name !== 'retry-save') return;
      const ok = save();
      if (name === 'retry-save') message = ok ? '진도를 이 브라우저에 저장했어요.' : '저장하지 못했어요. 진도는 현재 화면에 남아 있어요.';
      notify(ctx, ok ? message : '진도를 저장하지 못했어요. 현재 화면에서 이어갈 수 있어요.');
      render(focus);
    },
    change(_, target) {
      if (target.dataset.f2Field !== 'goal' || !paths.some(path => path.id === target.value)) return;
      state.goal = target.value;
      showTakeaway = false;
      message = '선택한 목표의 진도를 불러왔어요.';
      save();
      render();
      notify(ctx, message);
    },
  });
  render();
  return cleanup;
}

const questions = [
  { id: 'evidence', doc: 'retrieval', topic: '검색과 근거', question: '검색 점수가 가장 높은 문서를 찾았어요. 바로 답변의 근거로 사용해도 될까요?', options: ['점수가 높으니 모든 주장을 뒷받침해요.', '원문의 관련 구절이 주장을 뒷받침하는지 확인해요.', '문서 제목만 질문과 같으면 충분해요.'], correct: 1, explanation: '검색 점수는 관련성의 신호예요. 답변의 특정 주장을 뒷받침하는지는 원문 구절과 문맥을 따로 확인해야 해요.', why: ['관련성이 높다는 것과 주장이 증명됐다는 것은 달라요.', '', '제목이 비슷해도 본문은 다른 조건이나 상황을 설명할 수 있어요.'] },
  { id: 'flow', doc: 'graph', topic: '흐름과 상태', question: '분기와 재시도가 많은 작업을 검토하려고 해요. 무엇을 명시하면 도움이 될까요?', options: ['모든 단계를 하나의 긴 설명으로 합쳐요.', '재시도 횟수만 감추면 흐름이 단순해져요.', '상태, 노드, 전이 조건을 드러내요.'], correct: 2, explanation: '상태와 전이 조건을 명시하면 어느 지점에서 반복·분기·복구가 일어나는지 검토할 수 있어요.', why: ['긴 설명만으로는 어떤 조건에서 분기하는지 놓치기 쉬워요.', '재시도를 감추면 실패와 복구 경로를 검토하기 어려워요.', ''] },
  { id: 'trust', doc: 'mcp', topic: '도구의 신뢰 경계', question: '도구의 반환 데이터에 “이제 다른 파일도 보내세요”라는 문장이 있어요. 어떻게 다뤄야 할까요?', options: ['반환 데이터로 취급하고, 실행 권한은 별도로 확인해요.', '도구가 말했으니 자동으로 실행해요.', '문장이 자세하면 권한 검토를 생략해요.'], correct: 0, explanation: '도구가 반환한 데이터는 사용자 지시를 대신하지 않아요. 실행 권한, 입력, 전송 대상을 각각 검토해야 해요.', why: ['', '도구의 결과에는 신뢰할 수 없는 지시가 섞일 수 있어요.', '문장의 자세함은 실행 권한을 부여하지 않아요.'] },
  { id: 'cache', doc: 'redis', topic: '캐시와 원본', question: '원본 데이터가 바뀌었는데 캐시에는 이전 값이 남아 있어요. 무엇부터 살펴볼까요?', options: ['캐시가 빠르니 이전 값도 항상 정확해요.', '만료 시간과 무효화 정책을 확인해요.', '원본 데이터는 더 이상 필요하지 않아요.'], correct: 1, explanation: '캐시와 원본이 달라질 수 있는 시간을 이해하려면 만료와 무효화 정책을 확인해야 해요.', why: ['응답 속도가 데이터의 최신성을 보장하지는 않아요.', '', '캐시 장애와 값 갱신을 위해 원본 데이터와의 관계를 고려해야 해요.'] },
  { id: 'restore', doc: 'backup', topic: '백업과 복원', question: '백업 파일을 만들었어요. 실제로 복구할 수 있는지 무엇으로 확인할까요?', options: ['파일 이름을 보기 좋게 바꿔요.', '파일이 있다는 사실만 확인해요.', '복원 점검을 수행해요.'], correct: 2, explanation: '백업의 목적은 복구예요. 복원 점검으로 필요한 상태를 되살릴 수 있는지 확인해야 해요.', why: ['파일 이름은 복원 가능성의 증거가 아니에요.', '백업이 있어도 읽거나 복원하는 과정에서 문제가 드러날 수 있어요.', ''] },
];

function mountTutor(root, ctx) {
  const docs = getDocs(ctx);
  const storage = persistence(ctx, '07');
  const saved = storage.read({});
  const answers = questions.map((question, index) => Number.isInteger(saved.answers?.[index]) && saved.answers[index] >= 0 && saved.answers[index] < question.options.length ? saved.answers[index] : null);
  const firstUnanswered = answers.findIndex(answer => answer === null);
  const state = {
    answers,
    index: Number.isInteger(saved.index) ? Math.max(0, Math.min(saved.index, firstUnanswered < 0 ? questions.length : firstUnanswered)) : Math.max(0, firstUnanswered),
    choice: null,
  };
  if (Number.isInteger(saved.choice) && saved.choice >= 0 && saved.choice < (questions[state.index]?.options.length || 0)) state.choice = saved.choice;
  const save = () => storage.write(state);

  function render(focus) {
    const complete = state.index === questions.length;
    const gradedCount = state.answers.filter(answer => answer !== null).length;
    const correctCount = state.answers.filter((answer, index) => answer === questions[index].correct).length;
    const question = questions[state.index];
    const graded = !complete && state.answers[state.index] !== null;
    const selected = graded ? state.answers[state.index] : state.choice;
    const correct = graded && selected === question.correct;
    paint(root, `<section class="f2-work-area f2-tutor" aria-label="개념 확인 퀴즈">
      ${storage.banner()}
      <div class="f2-tutor-strip"><div>${icon('message')}<span>한 번 생각하고, 한 번 더 이해하기</span></div>${tag('로컬 예시 · 5문항')}</div>
      <div class="f2-tutor-body">
        <div class="f2-tutor-progress"><ol aria-label="퀴즈 진행 상태">${questions.map((item, index) => `<li class="${state.answers[index] !== null ? 'f2-question-done' : index === state.index ? 'f2-question-current' : ''}" ${index === state.index ? 'aria-current="step"' : ''} aria-label="${index + 1}번 ${h(item.topic)}: ${state.answers[index] !== null ? '답변 완료' : index === state.index ? '진행 중' : '미완료'}">${state.answers[index] !== null ? icon('check') : `0${index + 1}`}</li>`).join('')}</ol><span>${gradedCount} / 5 확인</span></div>
        ${complete ? `<div class="f2-quiz-result"><span class="eyebrow">오늘의 개념 확인</span><h2 tabindex="-1" data-f2-heading data-f2-focus="question-heading">생각을 끝까지 이어왔네요.</h2><p>틀린 문항은 근거를 다시 읽을 좋은 출발점이에요.</p><div class="f2-quiz-score"><strong>${correctCount}</strong><span>/ 5개 정답</span></div><ul class="f2-result-list">${questions.map((item, index) => `<li>${icon(state.answers[index] === item.correct ? 'check' : 'book')}<div><strong>${h(item.topic)}</strong><p>${state.answers[index] === item.correct ? '정확히 이해했어요' : `다시 보기 · ${h(item.options[item.correct])}`}</p></div></li>`).join('')}</ul>${action(`처음부터 다시 풀기 ${icon('arrow')}`, 'reset-quiz', 'primary')}</div>` : `
          <div class="f2-question-meta"><span class="eyebrow">QUESTION 0${state.index + 1}</span><span>${h(question.topic)}</span></div>
          <h2 class="f2-question" id="f2-question" tabindex="-1" data-f2-heading data-f2-focus="question-heading">${h(question.question)}</h2>
          <p class="f2-question-hint">가장 적절한 답을 하나 골라 주세요.</p>
          <fieldset class="f2-answers" aria-labelledby="f2-question"><legend class="f2-sr-only">정답 선택</legend>${question.options.map((option, index) => `<label class="f2-answer ${selected === index ? 'f2-answer-selected' : ''} ${graded && index === question.correct ? 'f2-answer-correct' : ''} ${graded && selected === index && !correct ? 'f2-answer-wrong' : ''}"><input type="radio" name="f2-quiz-answer" value="${index}" data-f2-field="answer" data-f2-focus="answer-${index}" ${selected === index ? 'checked' : ''} ${graded ? 'disabled' : ''}><span class="f2-answer-letter">${String.fromCharCode(65 + index)}</span><span>${h(option)}</span>${graded && index === question.correct ? '<strong class="f2-answer-mark">정답</strong>' : graded && selected === index ? '<strong class="f2-answer-mark">선택 · 오답</strong>' : ''}</label>`).join('')}</fieldset>
          ${graded ? `<section class="f2-feedback ${correct ? 'f2-feedback-correct' : 'f2-feedback-revisit'}" tabindex="-1" data-f2-focus="quiz-feedback" aria-label="채점 결과와 해설"><div class="f2-feedback-heading">${icon(correct ? 'check' : 'book')}<strong>${correct ? '맞았어요. 핵심을 잘 짚었네요.' : '조금 다르게 생각해 볼까요?'}</strong></div>${!correct ? `<p>${h(question.why[selected])}</p>` : ''}<p>${h(question.explanation)}</p>${localExcerpt(docs.find(doc => doc.id === question.doc))}</section>` : ''}
          <div class="f2-quiz-actions"><span class="f2-question-hint">${graded ? '해설을 읽고 다음 생각으로 넘어가세요.' : selected === null ? '답을 선택하면 확인할 수 있어요.' : '선택한 답을 확인해 보세요.'}</span>${graded ? action(`${state.index === questions.length - 1 ? '학습 결과 보기' : '다음 질문'} ${icon('arrow')}`, 'next-question', 'primary') : action('정답 확인', 'grade-answer', 'primary', selected === null ? 'disabled' : '')}</div>
          <div class="f2-quiz-bottom"><span>공개 문서에서 만든 고정 문항과 해설이에요.</span>${action('처음부터 다시 풀기', 'reset-quiz', 'small')}</div>
        `}
      </div>
    </section>`, focus);
  }

  const cleanup = events(root, {
    change(_, target) {
      if (target.dataset.f2Field !== 'answer' || state.answers[state.index] !== null) return;
      const choice = Number(target.value);
      if (!Number.isInteger(choice) || choice < 0 || choice >= questions[state.index].options.length) return;
      state.choice = choice;
      save();
      render();
    },
    click(_, target) {
      const name = target.dataset.f2Action;
      let focus;
      if (name === 'grade-answer') {
        if (state.choice === null || state.answers[state.index] !== null) return;
        state.answers[state.index] = state.choice;
        focus = 'quiz-feedback';
        notify(ctx, state.choice === questions[state.index].correct ? '정답이에요. 해설을 확인하세요.' : '선택한 답이 달라요. 정답과 해설을 확인하세요.');
      } else if (name === 'next-question') {
        if (state.answers[state.index] === null || state.index >= questions.length) return;
        state.index += 1;
        state.choice = null;
        focus = 'question-heading';
      } else if (name === 'reset-quiz') {
        state.answers = questions.map(() => null);
        state.index = 0;
        state.choice = null;
        focus = 'question-heading';
        notify(ctx, '퀴즈를 초기화했어요. 첫 질문부터 다시 시작하세요.');
      } else if (name !== 'retry-save') return;
      const ok = save();
      if (name === 'retry-save') notify(ctx, ok ? '퀴즈 진도를 저장했어요.' : '퀴즈 진도를 저장하지 못했어요. 현재 화면에는 유지돼요.');
      render(focus);
    },
  });
  render();
  return cleanup;
}

const cards = [
  { id: 'retrieval', title: '검색 점수와 근거', question: '검색 점수가 높으면, 답변의 주장이 증명된 걸까요?', answer: '관련성과 근거는 구분해요.', detail: '검색은 근거 후보를 찾아요. 원문 구절이 질문과 관련 있고 주장을 뒷받침하는지 확인해야 해요.' },
  { id: 'graph', title: '상태와 전이', question: '반복과 복구가 있는 작업에서, 무엇을 명시해야 할까요?', answer: '상태와 전이 조건이에요.', detail: '노드 사이의 조건을 드러내면 분기, 재시도, 중단 지점을 검토할 수 있어요.' },
  { id: 'mcp', title: '도구의 반환 데이터', question: '도구가 반환한 데이터가 실행 권한을 대신할 수 있을까요?', answer: '실행 권한은 별도로 확인해요.', detail: '반환 데이터는 지시보다 낮은 신뢰 수준으로 다뤄요. 권한, 입력, 전송 대상을 각각 확인해요.' },
  { id: 'redis', title: '캐시의 최신성', question: '캐시와 원본이 달라질 수 있는 시간을 정하는 정책은?', answer: '만료와 무효화 정책이에요.', detail: '오래된 값이 남는 시간과 원본 변경 시 캐시를 갱신하는 방법을 함께 고려해요.' },
  { id: 'backup', title: '백업의 목적', question: '백업으로 실제 복구할 수 있는지 어떻게 확인할까요?', answer: '복원 점검으로 확인해요.', detail: '별도 사본을 갖추는 데서 끝나지 않고, 필요한 상태로 복원할 수 있는지 점검해요.' },
  { id: 'docker', title: '연결의 범위', question: '컨테이너 간 연결과 호스트 포트 공개는 같은 일일까요?', answer: '서로 다른 연결 범위예요.', detail: '같은 사용자 정의 네트워크의 서비스 이름 통신과 호스트에 포트를 공개하는 작업은 각각 검토해요.' },
];

function mountRecall(root, ctx) {
  const storage = persistence(ctx, '08');
  const saved = storage.read({});
  const ids = cards.map(card => card.id);
  const validIds = list => Array.isArray(list) ? [...new Set(list.filter(id => ids.includes(id)))] : [];
  const remembered = validIds(saved.remembered);
  const queue = validIds(saved.queue).filter(id => !remembered.includes(id));
  for (const id of ids) if (!queue.includes(id) && !remembered.includes(id)) queue.push(id);
  const state = { remembered, queue, reviews: Number.isSafeInteger(saved.reviews) && saved.reviews >= 0 ? saved.reviews : 0, revisits: Object.fromEntries(ids.map(id => [id, Number.isSafeInteger(saved.revisits?.[id]) && saved.revisits[id] >= 0 ? saved.revisits[id] : 0])) };
  let flipped = false;
  let message = '답을 떠올린 다음, 카드를 눌러 확인하세요.';
  const save = () => storage.write(state);

  function render(focus) {
    const card = cards.find(item => item.id === state.queue[0]);
    paint(root, `<section class="f2-work-area f2-recall" aria-label="플래시카드 복습">
      ${storage.banner()}
      <div class="f2-recall-top"><div><span class="eyebrow">작은 복습, 오래가는 이해</span><h2 tabindex="-1" data-f2-heading data-f2-focus="recall-heading">기억을 꺼내 보는 시간</h2></div>${tag('로컬 예시 · 개념 카드 6장')}</div>
      <div class="f2-recall-layout">
        <div class="f2-card-stage">
          ${card ? `<div class="f2-card-counter"><span>${icon('layers')}${h(card.title)}</span><span class="mono">남은 카드 ${state.queue.length}장</span></div>
            <div class="f2-card-stack"><button type="button" class="f2-flashcard ${flipped ? 'f2-flashcard-back' : ''}" data-f2-action="flip-card" data-f2-focus="flip-card" aria-label="${flipped ? '질문으로 뒤집기' : '카드 뒤집어 정답 확인'}" aria-pressed="${flipped}"><span class="f2-card-face"><span class="f2-card-eyebrow">${flipped ? 'ANSWER · 기억과 맞춰 보기' : 'RECALL · 먼저 떠올려 보기'}</span><span class="f2-card-prompt">${h(flipped ? card.answer : card.question)}</span>${flipped ? `<span class="f2-card-explanation">${h(card.detail)}</span>` : '<span class="f2-card-think">서두르지 않아도 괜찮아요.<br>내 말로 한 문장을 떠올려 보세요.</span>'}<span class="f2-card-turn">${icon(flipped ? 'book' : 'layers')}${flipped ? '질문 다시 보기' : '카드를 눌러 정답 확인'}</span></span></button></div>
            <div class="f2-recall-controls">${action(`${icon('clock')} 다시 볼래요`, 'revisit-card', 'soft', flipped ? '' : 'disabled')}${action(`${icon('check')} 기억했어요`, 'remember-card', 'primary', flipped ? '' : 'disabled')}</div>
            <p class="f2-recall-help">${flipped ? '‘다시 볼래요’는 카드를 큐 뒤로, ‘기억했어요’는 복습 완료로 옮겨요.' : '정답을 확인하면 기억 정도를 고를 수 있어요.'}</p>` : `<div class="f2-recall-finished"><span class="f2-recall-seal">${icon('check')}</span><span class="eyebrow">오늘의 덱 완료</span><h3 tabindex="-1" data-f2-focus="recall-finished">여섯 개의 개념을<br>한 번 더 기억했어요.</h3><p>${state.reviews}번의 확인으로 모든 카드를 마쳤어요.<br>다시 복습하면 새로운 큐가 시작됩니다.</p>${action('한 번 더 복습하기', 'reset-deck', 'primary')}</div>`}
          <p class="f2-status f2-recall-status" role="status">${h(message)}</p>
        </div>
        <aside class="f2-recall-queue" aria-label="복습 큐와 진도"><div class="f2-recall-metric"><span>기억한 카드</span><strong>${state.remembered.length}<small> / 6</small></strong>${progress(state.remembered.length, 6, '기억한 카드')}<p>${state.reviews}번 확인 · ${Object.values(state.revisits).reduce((sum, value) => sum + value, 0)}번 다시 보기</p></div><div class="f2-queue-heading"><h3>복습 큐</h3><span>${state.queue.length}장</span></div>${state.queue.length ? `<ol class="f2-queue-list">${state.queue.map((id, index) => `<li ${index === 0 ? 'class="f2-queue-current" aria-current="step"' : ''}><span class="f2-queue-number">${index === 0 ? icon('arrow') : `0${index + 1}`}</span><div><strong>${h(cards.find(card => card.id === id).title)}</strong><small>${index === 0 ? '지금 떠올릴 개념' : state.revisits[id] ? `${state.revisits[id]}번 다시 보기로 이동` : '곧 만날 개념'}</small></div></li>`).join('')}</ol>` : '<p class="f2-queue-empty">남은 카드가 없어요.<br>모든 개념을 확인했습니다.</p>'}<div class="f2-recall-queue-footer">${action('전체 덱 다시 시작', 'reset-deck', 'small')}<span>큐와 진도는 이 브라우저에 보관돼요.</span></div></aside>
      </div>
    </section>`, focus);
  }

  const cleanup = events(root, {
    click(_, target) {
      const name = target.dataset.f2Action;
      let focus;
      if (name === 'flip-card' && state.queue.length) {
        flipped = !flipped;
        message = flipped ? '답을 확인했어요. 기억 정도를 선택해 주세요.' : '질문을 다시 펼쳤어요.';
        render();
        return;
      }
      if ((name === 'remember-card' || name === 'revisit-card') && flipped && state.queue.length) {
        const id = state.queue.shift();
        const title = cards.find(card => card.id === id).title;
        state.reviews += 1;
        if (name === 'remember-card') {
          state.remembered.push(id);
          message = `‘${title}’을 기억한 카드에 추가했어요.`;
        } else {
          state.queue.push(id);
          state.revisits[id] += 1;
          message = state.queue.length === 1 ? `마지막 카드예요. ‘${title}’을 한 번 더 떠올려 보세요.` : `‘${title}’을 복습 큐 맨 뒤로 옮겼어요.`;
        }
        flipped = false;
        focus = state.queue.length ? 'flip-card' : 'recall-finished';
      } else if (name === 'reset-deck') {
        state.queue = [...ids];
        state.remembered = [];
        state.reviews = 0;
        state.revisits = Object.fromEntries(ids.map(id => [id, 0]));
        flipped = false;
        message = '여섯 장의 카드로 새 복습을 시작했어요.';
        focus = 'flip-card';
      } else if (name !== 'retry-save') return;
      const ok = save();
      if (name === 'retry-save') message = ok ? '복습 큐를 저장했어요.' : '저장하지 못했어요. 현재 큐는 이 화면에 유지됩니다.';
      render(focus);
      notify(ctx, ok ? message : '복습 큐를 저장하지 못했어요. 이 화면에서는 계속 복습할 수 있어요.');
    },
  });
  render();
  return cleanup;
}

const examples = {
  filter: { title: '8분 안에 읽을 문서 고르기', filename: 'short-reads.js', purpose: '읽기 시간 8, 12, 6분 중 8분 이하만 골라요.', lines: ['const minutes = [8, 12, 6];', 'const shortReads = [];', 'for (const value of minutes) {', '  if (value <= 8) {', '    shortReads.push(value);', '  }', '}', 'console.log(shortReads);'] },
  sum: { title: '문서의 총 읽기 시간 구하기', filename: 'reading-time.js', purpose: '읽기 시간 8, 12, 6분을 차례대로 더해요.', lines: ['const minutes = [8, 12, 6];', 'let total = 0;', 'for (const value of minutes) {', '  total = total + value;', '}', 'console.log(total);'] },
};

// A closed interpreter for these two examples: no user code, eval, shell, or I/O.
function makeTrace(example) {
  const frames = [{ line: null, variables: {}, changed: [], explanation: '한 단계씩 실행해 변수의 변화를 확인해 보세요.', output: null }];
  function record(line, variables, explanation, output = null) {
    const snapshot = JSON.parse(JSON.stringify(variables));
    const previous = frames[frames.length - 1].variables;
    frames.push({ line, variables: snapshot, changed: Object.keys(snapshot).filter(key => JSON.stringify(snapshot[key]) !== JSON.stringify(previous[key])), explanation, output });
  }
  const minutes = [8, 12, 6];
  record(1, { minutes }, '세 문서의 읽기 시간을 minutes에 담았어요.');
  if (example === 'sum') {
    let total = 0;
    record(2, { minutes, total }, '합계를 담을 total을 0으로 시작해요.');
    for (const value of minutes) {
      record(3, { minutes, total, value }, `이번 반복의 value는 ${value}예요.`);
      const before = total;
      total += value;
      record(4, { minutes, total, value }, `${before} + ${value} = ${total}. total을 갱신했어요.`);
    }
    record(6, { minutes, total }, '반복을 마쳤어요. 블록 안의 value는 범위를 벗어나고, 합계를 출력해요.', String(total));
  } else {
    const shortReads = [];
    record(2, { minutes, shortReads }, '조건에 맞는 시간을 담을 빈 배열을 만들어요.');
    for (const value of minutes) {
      record(3, { minutes, shortReads, value }, `이번 반복의 value는 ${value}예요.`);
      record(4, { minutes, shortReads, value }, `${value} <= 8은 ${value <= 8 ? '참이에요. 배열에 추가할 차례예요.' : '거짓이에요. 추가하지 않고 다음 반복으로 넘어가요.'}`);
      if (value <= 8) {
        shortReads.push(value);
        record(5, { minutes, shortReads, value }, `${value}을 shortReads에 추가했어요.`);
      }
    }
    record(8, { minutes, shortReads }, '반복을 마쳤어요. value는 범위를 벗어나고, 조건에 맞는 배열을 출력해요.', '[8, 6]');
  }
  return frames;
}

function mountCode(root, ctx) {
  const storage = persistence(ctx, '09');
  const saved = storage.read({});
  const state = { example: typeof saved.example === 'string' && Object.hasOwn(examples, saved.example) ? saved.example : 'filter', position: 0 };
  let trace = makeTrace(state.example);
  state.position = Number.isInteger(saved.position) ? Math.max(0, Math.min(saved.position, trace.length - 1)) : 0;
  let running = false;
  let timer;
  let disposed = false;
  const save = () => storage.write(state);
  const stop = () => { running = false; clearTimeout(timer); };

  function render(focus) {
    const example = examples[state.example];
    const frame = trace[state.position];
    const ended = state.position === trace.length - 1;
    paint(root, `<section class="f2-work-area f2-code" aria-label="안전한 예시 코드 실행 추적">
      ${storage.banner()}
      <div class="f2-code-toolbar"><div class="f2-example-picker"><label class="f2-label" for="f2-code-example">따라가 볼 예제</label><select class="field" id="f2-code-example" data-f2-field="example" data-f2-focus="example">${Object.entries(examples).map(([id, item]) => `<option value="${id}" ${id === state.example ? 'selected' : ''}>${h(item.title)}</option>`).join('')}</select></div><div class="f2-code-controls">${action(icon('play') + (running ? ' 일시정지' : ended ? ' 다시 실행' : ' 전체 실행'), 'run-code', 'primary', `aria-pressed="${running}"`)}${action('한 단계', 'step-code', '', running || ended ? 'disabled' : '')}${action('초기화', 'reset-code', 'soft')}</div></div>
      <div class="f2-code-caption"><span>${tag('로컬 예시')} ${h(example.purpose)}</span><span>고정된 계산 규칙으로 실행 흐름을 재생해요.</span></div>
      <div class="f2-code-layout">
        <div class="f2-code-editor"><div class="f2-editor-tab">${icon('code')}<span>${h(example.filename)}</span><span>JavaScript</span></div><div class="f2-code-lines" role="region" aria-label="예제 코드" tabindex="0" data-f2-focus="code-lines">${example.lines.map((line, index) => `<div class="f2-code-line ${frame.line === index + 1 ? 'f2-code-line-active' : ''}" ${frame.line === index + 1 ? 'aria-current="step"' : ''}><span class="f2-code-pointer" aria-hidden="true">${frame.line === index + 1 ? '›' : ''}</span><span class="f2-code-number" aria-hidden="true">${index + 1}</span><code>${h(line)}</code>${frame.line === index + 1 ? '<span class="f2-sr-only">현재 실행한 줄</span>' : ''}</div>`).join('')}</div><div class="f2-code-editor-bottom"><span>${icon('shield')}읽기 전용 예제</span><span>${frame.line ? `${frame.line}번째 줄 실행함` : '실행 대기'}</span></div></div>
        <aside class="panel f2-variable-panel"><div class="panel-head"><h2 tabindex="-1" data-f2-heading data-f2-focus="code-heading">지금의 변수</h2><span class="f2-run-state ${running ? 'f2-running' : ''}">${running ? '재생 중' : ended ? '완료' : state.position ? '일시정지' : '준비'}</span></div><p class="f2-variable-hint">실행한 줄이 만든 상태를 살펴보세요.</p>${Object.keys(frame.variables).length ? `<table class="f2-variable-table"><caption class="f2-sr-only">현재 변수와 값</caption><thead><tr><th scope="col">변수</th><th scope="col">값</th></tr></thead><tbody>${Object.entries(frame.variables).map(([name, value]) => `<tr class="${frame.changed.includes(name) ? 'f2-variable-changed' : ''}"><th scope="row"><code>${h(name)}</code>${frame.changed.includes(name) ? '<span>변경</span>' : ''}</th><td><code>${h(Array.isArray(value) ? `[${value.join(', ')}]` : value)}</code></td></tr>`).join('')}</tbody></table>` : '<div class="f2-variables-empty">{ }<p>아직 만든 변수가 없어요.<br>‘한 단계’를 눌러 시작해 보세요.</p></div>'}<div class="f2-trace-explanation"><span class="eyebrow">${frame.line ? `LINE ${String(frame.line).padStart(2, '0')}` : 'READY'}</span><p role="status">${h(frame.explanation)}</p></div></aside>
      </div>
      <div class="f2-trace-progress"><span class="mono">${String(state.position).padStart(2, '0')} / ${trace.length - 1} 단계</span>${progress(state.position, trace.length - 1, '코드 실행 진도')}<span>${ended ? '실행 완료' : running ? '자동으로 진행 중' : '내 속도로 따라가기'}</span></div>
      <div class="f2-code-bottom"><section class="f2-execution-log"><div class="f2-log-title"><h3>${icon('clock')}실행 기록</h3><span>최근 3단계</span></div>${state.position ? `<ol>${trace.slice(Math.max(1, state.position - 2), state.position + 1).map(frame => `<li><span class="mono">L${String(frame.line).padStart(2, '0')}</span><span>${h(frame.explanation)}</span></li>`).join('')}</ol>` : '<p class="f2-log-empty">실행하면 각 단계의 변화가 여기에 쌓여요.</p>'}</section><section class="f2-console"><h3>${icon('terminal')}출력</h3><pre aria-live="polite">${frame.output !== null ? `<span class="f2-console-prompt">› </span>${h(frame.output)}` : '<span class="f2-console-waiting">마지막 줄까지 실행하면 결과가 나타나요.</span>'}</pre><span>예시 기록 · 브라우저 안에서만 계산</span></section></div>
    </section>`, focus);
  }

  function tick() {
    if (!running || disposed) return;
    state.position = Math.min(state.position + 1, trace.length - 1);
    save();
    if (state.position === trace.length - 1) {
      stop();
      notify(ctx, '예제 실행을 마쳤어요. 최종 변수와 출력값을 확인하세요.');
    }
    render();
    if (running) timer = setTimeout(tick, 750);
  }

  const cleanup = events(root, {
    click(_, target) {
      const name = target.dataset.f2Action;
      if (name === 'run-code') {
        if (running) {
          stop();
          notify(ctx, '실행을 일시정지했어요. 한 단계씩 이어갈 수 있어요.');
          render();
        } else {
          if (state.position === trace.length - 1) state.position = 0;
          running = true;
          tick();
        }
        return;
      }
      if (name === 'step-code' && !running) {
        state.position = Math.min(state.position + 1, trace.length - 1);
        notify(ctx, trace[state.position].explanation);
      } else if (name === 'reset-code') {
        stop();
        state.position = 0;
        notify(ctx, '코드와 변수를 초기 상태로 되돌렸어요.');
      } else if (name !== 'retry-save') return;
      const ok = save();
      if (name === 'retry-save') notify(ctx, ok ? '실행 위치를 저장했어요.' : '실행 위치를 저장하지 못했어요. 현재 화면에는 유지돼요.');
      render();
    },
    change(_, target) {
      if (target.dataset.f2Field !== 'example' || !Object.hasOwn(examples, target.value)) return;
      stop();
      state.example = target.value;
      state.position = 0;
      trace = makeTrace(state.example);
      save();
      render();
      notify(ctx, '예제를 바꾸었어요. 첫 줄부터 따라가 보세요.');
    },
  });
  render();
  return () => { disposed = true; stop(); cleanup(); };
}

function mountNotebook(root, ctx) {
  const docs = getDocs(ctx);
  const storage = persistence(ctx, '10');
  const saved = storage.read({});
  const isNote = note => note && typeof note.id === 'string' && /^[a-zA-Z0-9-]+$/.test(note.id)
    && typeof note.title === 'string' && typeof note.body === 'string';
  const seen = new Set();
  const notes = (Array.isArray(saved.notes) ? saved.notes : []).filter(note => {
    if (!isNote(note) || seen.has(note.id)) return false;
    seen.add(note.id);
    return true;
  }).map(note => ({
    id: note.id, title: note.title, body: note.body,
    docId: docs.some(doc => doc.id === note.docId) ? note.docId : docs[0].id,
    savedAt: typeof note.savedAt === 'string' && Number.isFinite(Date.parse(note.savedAt)) ? note.savedAt : null,
    revision: Number.isSafeInteger(note.revision) && note.revision >= 0 ? note.revision : 0,
    savedRevision: Number.isSafeInteger(note.savedRevision) && note.savedRevision >= 0 ? note.savedRevision : -1,
  }));
  const newNote = docId => ({ id: `note-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`, docId, title: '', body: '', savedAt: null, revision: 0, savedRevision: -1 });
  if (!notes.length) notes.push(newNote(docs[0].id));
  const state = { notes, activeId: notes.some(note => note.id === saved.activeId) ? saved.activeId : notes[0].id };
  const current = () => state.notes.find(note => note.id === state.activeId);
  const dirty = note => !note.savedAt || note.savedRevision !== note.revision;
  const visibleNotes = () => state.notes.filter(note => note.savedAt || note.title.length || note.body.length);
  const save = () => storage.write(state);
  let error = '';
  let message = '읽다가 떠오른 생각을 내 말로 남겨 보세요.';

  function noteList() {
    const list = visibleNotes();
    if (!list.length) return `<div class="f2-notes-empty">${icon('edit')}<strong>아직 기록이 없어요.</strong><p>첫 문장을 적어 보세요.<br>작성 중인 초안도 여기에 남아요.</p></div>`;
    return `<ul class="f2-note-list">${[...list].reverse().map(note => `<li><button type="button" class="f2-note-item ${note.id === state.activeId ? 'f2-note-active' : ''}" data-f2-action="open-note" data-f2-note="${h(note.id)}" data-f2-focus="note-${h(note.id)}" ${note.id === state.activeId ? 'aria-current="true"' : ''}><span class="f2-note-item-top"><span>${dirty(note) ? '초안' : '저장됨'}</span>${note.id === state.activeId ? icon('edit') : ''}</span><strong>${h(note.title.trim() ? note.title : '제목 없는 노트')}</strong><span class="f2-note-preview">${h(note.body.slice(0, 74) || '내용을 이어서 작성하세요.')}</span><small>${h(docs.find(doc => doc.id === note.docId).topic)}</small></button></li>`).join('')}</ul>`;
  }

  function saveLabel() {
    const note = current();
    if (storage.failed) return '현재 화면에 유지 중 · 내보내기로 보관하세요';
    if (!note.title && !note.body && !note.savedAt) return '입력하면 초안을 이 브라우저에 보관해요';
    if (dirty(note)) return '초안 자동 보관 · 노트 저장으로 기록을 마무리하세요';
    return `${new Date(note.savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장됨 · 이 브라우저에 보관`;
  }

  function render(focus) {
    const note = current();
    const doc = docs.find(doc => doc.id === note.docId);
    paint(root, `<section class="f2-work-area f2-notebook" aria-label="문서와 연결된 학습 노트">
      <div data-f2-storage>${storage.banner()}</div>
      <div class="f2-notebook-toolbar"><div>${tag('로컬 예시')}<span>읽은 문장을, 나의 문장으로.</span></div><div class="row">${action(`${icon('download')} 전체 백업`, 'export-notes', 'small', visibleNotes().length ? '' : 'disabled')}${action(`${icon('plus')} 새 노트`, 'new-note', 'soft')}</div></div>
      <div class="f2-notebook-desk">
        <article class="f2-notebook-reader"><div class="f2-notebook-pane-head"><span class="eyebrow">01 / 읽기 자료</span>${icon('book')}</div><label class="f2-label" for="f2-note-document">이 노트에 연결할 문서</label><select class="field" id="f2-note-document" data-f2-field="document" data-f2-focus="document">${docs.map(item => `<option value="${h(item.id)}" ${item.id === note.docId ? 'selected' : ''}>${h(item.title)}</option>`).join('')}</select><div class="f2-notebook-paper"><span class="f2-paper-topic">${h(doc.topic)} <span>· ${h(doc.minutes)}분</span></span><h2 tabindex="-1" data-f2-heading data-f2-focus="notebook-heading">${h(doc.title)}</h2><p class="f2-paper-lead">${h(doc.summary)}</p><div class="f2-paper-rule"></div><p>${h(doc.detail)}</p><span class="f2-local-source">공개 문서 발췌<br>${h(doc.source)}</span></div>${action(`${icon('plus')} 핵심 문장 인용하기`, 'quote-note', 'soft')}<p class="f2-paper-hint">핵심 문장을 노트 끝에 추가해요.</p></article>
        <section class="f2-note-editor" aria-label="노트 편집기"><div class="f2-notebook-pane-head"><span class="eyebrow">02 / 나의 문장</span><span data-f2-draft-label>${dirty(note) ? '작성 중' : '저장됨'}</span></div><label class="f2-label" for="f2-note-title">노트 제목 <span class="f2-optional">선택</span></label><input class="f2-note-title" id="f2-note-title" data-f2-field="title" data-f2-focus="note-title" type="text" value="${h(note.title)}" placeholder="제목 없는 노트" autocomplete="off"><label class="f2-label" for="f2-note-body">노트 내용</label><p class="f2-editor-guide" id="f2-note-guide">무엇을 이해했나요? 남은 질문도 함께 적어 보세요.</p><textarea class="f2-note-body" id="f2-note-body" data-f2-field="body" data-f2-focus="note-body" placeholder="오늘 이해한 것은…\n\n아직 궁금한 것은…" aria-describedby="f2-note-guide f2-note-error" ${error ? 'aria-invalid="true"' : ''}>${h(note.body)}</textarea><div class="f2-editor-meta"><span>${icon('file')}일반 텍스트</span><span data-f2-character-count>${note.body.length.toLocaleString('ko-KR')}자</span></div><p class="f2-form-error" id="f2-note-error" role="alert" ${error ? '' : 'hidden'}>${h(error)}</p><div class="f2-note-save-row">${action(`${icon('check')} 노트 저장`, 'save-note', 'primary')}${action(`${icon('download')} Markdown 내보내기`, 'export-note', '', note.title.length || note.body.length ? '' : 'disabled')}</div><p class="f2-note-save-status" data-f2-save-label>${h(saveLabel())}</p><p class="f2-status" role="status" data-f2-note-message>${h(message)}</p></section>
        <aside class="f2-notebook-index" aria-label="내 노트 목록"><div class="f2-notebook-pane-head"><span class="eyebrow">03 / 내 기록</span><span data-f2-note-count>${visibleNotes().length}개</span></div><div data-f2-note-list>${noteList()}</div><p class="f2-index-hint">노트를 바꿔도 작성 중인 텍스트는 그대로 남아요.</p></aside>
      </div>
    </section>`, focus);
    // HTML parsing removes a textarea's first newline; assign the exact draft.
    root.querySelector('#f2-note-body').value = note.body;
  }

  // Editing updates small siblings only, preserving the native input and caret.
  function refreshEditorState() {
    const note = current();
    root.querySelector('[data-f2-note-list]').innerHTML = noteList();
    root.querySelector('[data-f2-note-count]').textContent = `${visibleNotes().length}개`;
    root.querySelector('[data-f2-draft-label]').textContent = dirty(note) ? '작성 중' : '저장됨';
    root.querySelector('[data-f2-save-label]').textContent = saveLabel();
    root.querySelector('[data-f2-character-count]').textContent = `${note.body.length.toLocaleString('ko-KR')}자`;
    root.querySelector('[data-f2-note-message]').textContent = message;
    root.querySelector('[data-f2-action="export-note"]').disabled = !note.title.length && !note.body.length;
    root.querySelector('[data-f2-action="export-notes"]').disabled = !visibleNotes().length;
    const errorElement = root.querySelector('#f2-note-error');
    errorElement.textContent = error;
    errorElement.hidden = !error;
    root.querySelector('#f2-note-body').setAttribute('aria-invalid', String(Boolean(error)));
    const storageElement = root.querySelector('[data-f2-storage]');
    if (Boolean(storageElement.firstElementChild) !== storage.failed) storageElement.innerHTML = storage.banner();
  }

  function exportCurrent() {
    const note = current();
    const doc = docs.find(doc => doc.id === note.docId);
    try {
      download(`study-${note.id}.md`, `# ${note.title || '제목 없는 노트'}\n\n${note.body}\n\n---\n연결 문서: ${doc.title}\n공개 예시 출처: ${doc.source}\n`, 'text/markdown;charset=utf-8');
      message = '현재 텍스트로 Markdown 다운로드를 요청했어요.';
    } catch {
      message = '다운로드를 시작하지 못했어요. 다시 시도하거나 노트 내용을 복사해 보관하세요.';
    }
    notify(ctx, message);
    refreshEditorState();
  }

  const cleanup = events(root, {
    input(_, target) {
      const field = target.dataset.f2Field;
      if (field !== 'title' && field !== 'body') return;
      current()[field] = target.value;
      current().revision += 1;
      if (current().body.trim()) error = '';
      message = '';
      save();
      refreshEditorState();
    },
    change(_, target) {
      if (target.dataset.f2Field !== 'document' || !docs.some(doc => doc.id === target.value)) return;
      current().docId = target.value;
      current().revision += 1;
      save();
      message = '노트에 연결된 예시 문서를 바꾸었어요. 작성한 텍스트는 유지됩니다.';
      render();
      notify(ctx, message);
    },
    click(_, target) {
      const name = target.dataset.f2Action;
      let focus;
      if (name === 'new-note') {
        if (current().title.length || current().body.length || current().savedAt) {
          const note = newNote(current().docId);
          state.notes.push(note);
          state.activeId = note.id;
        }
        error = '';
        message = '새 노트를 시작했어요. 이전 기록은 목록에서 다시 열 수 있어요.';
        focus = 'note-title';
      } else if (name === 'open-note') {
        if (!state.notes.some(note => note.id === target.dataset.f2Note)) return;
        state.activeId = target.dataset.f2Note;
        error = '';
        message = '작성하던 텍스트를 그대로 불러왔어요.';
      } else if (name === 'quote-note') {
        const note = current();
        const doc = docs.find(doc => doc.id === note.docId);
        note.body += `${note.body ? '\n\n' : ''}> ${doc.summary}`;
        note.revision += 1;
        error = '';
        message = '핵심 문장을 노트 끝에 인용했어요. 생각을 이어 적어 보세요.';
        save();
        const textarea = root.querySelector('#f2-note-body');
        textarea.value = note.body;
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(note.body.length, note.body.length);
        refreshEditorState();
        notify(ctx, message);
        return;
      } else if (name === 'save-note') {
        if (!current().body.trim()) {
          error = '노트 내용을 한 줄 이상 적어 주세요. 입력한 제목은 그대로 남아 있어요.';
          refreshEditorState();
          root.querySelector('#f2-note-body').focus({ preventScroll: true });
          notify(ctx, error);
          return;
        }
        const note = current();
        const previous = { savedAt: note.savedAt, savedRevision: note.savedRevision };
        note.savedAt = new Date().toISOString();
        note.savedRevision = note.revision;
        if (save()) {
          message = '노트를 이 브라우저에 저장했어요.';
        } else {
          Object.assign(note, previous);
          message = '저장하지 못했어요. 텍스트는 그대로 유지됩니다. 다시 저장하거나 내보내 주세요.';
        }
        error = '';
        refreshEditorState();
        notify(ctx, message);
        return;
      } else if (name === 'export-note') {
        exportCurrent();
        return;
      } else if (name === 'export-notes') {
        try {
          download('study-notebook-backup.json', JSON.stringify({ version: 1, kind: 'local-study-notebook', notes: visibleNotes() }, null, 2));
          message = '초안을 포함한 전체 노트의 JSON 백업 다운로드를 요청했어요.';
        } catch {
          message = '백업 다운로드를 시작하지 못했어요. 다시 시도하거나 노트를 열어 내용을 복사해 주세요.';
        }
        notify(ctx, message);
        refreshEditorState();
        return;
      } else if (name !== 'retry-save') return;
      const ok = save();
      if (name === 'retry-save') message = ok ? '노트와 초안을 이 브라우저에 보관했어요.' : '아직 저장할 수 없어요. 내보내기로 텍스트를 보관하세요.';
      render(focus);
      notify(ctx, ok ? message : '저장 공간을 사용할 수 없어요. 텍스트는 화면에 남아 있습니다.');
    },
  });
  render();
  return cleanup;
}

export function mount(root, ctx) {
  const mounts = { '06': mountPath, '07': mountTutor, '08': mountRecall, '09': mountCode, '10': mountNotebook };
  const id = String(ctx.concept.id).padStart(2, '0');
  const render = mounts[id];
  if (!render) {
    paint(root, '<div class="f2-work-area"><div class="empty">이 학습 화면을 찾을 수 없어요. 학습 후보 06–10에서 다시 열어 주세요.</div></div>');
    return () => {};
  }
  return render(root, ctx);
}
