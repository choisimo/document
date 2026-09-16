import { h, icon, button, tag, download } from '../shared.js';

// This family only reads the curated documents supplied by the lab. The reading
// notes and graph edges below are editorial examples, not generated AI output.
const guide = {
  retrieval: { short: '검색과 근거', purpose: '후보를 찾는 일과 문맥을 이해하는 일을 구분하기', decision: '검색 순위 다음에, 주장을 뒷받침하는 구절이 있는지 확인합니다.', check: '질문과 구절의 관련성 · 원문 문맥 · 주장의 범위', note: '검색 순위는 읽을 순서를 정하는 단서입니다. 높은 점수 자체를 정답의 증명으로 사용하지 않는 것이 이 발췌의 핵심입니다.' },
  graph: { short: '제어 흐름', purpose: '순차 작업과 분기·복구가 있는 작업을 구분하기', decision: '분기, 반복, 중단 이후의 복구가 필요한지 먼저 정합니다.', check: '전이 조건 · 반복 종료 · 중단 후 복구', note: '단계 이름만 나열하기보다 다음 단계로 넘어가는 조건을 함께 읽어 보세요. 이 문서의 비교 기준은 흐름에 필요한 제어입니다.' },
  mcp: { short: '도구와 권한', purpose: '도구 호출 계약과 실행 권한을 함께 살펴보기', decision: '도구가 반환한 내용과 실행을 허용하는 지시를 구분합니다.', check: '입력 검증 · 읽기와 쓰기 · 전송 대상', note: '도구의 응답은 검토할 데이터입니다. 무엇을 할 수 있는지와 무엇을 하도록 허용했는지를 분리해 읽는 예시입니다.' },
  docker: { short: '컨테이너 연결', purpose: '내부 통신과 호스트 포트 공개를 구분하기', decision: '서비스 간 연결 문제인지 외부 접근 문제인지 먼저 좁힙니다.', check: '네트워크 소속 · 서비스 이름 · 공개 포트', note: '컨테이너끼리 연결하는 것과 외부에 포트를 공개하는 것은 별개의 확인 항목입니다. 발췌에서 두 경계를 찾아보세요.' },
  backup: { short: '복원과 보관', purpose: '되돌리기·별도 사본·반복 생성의 목적 구분하기', decision: '빠른 되돌리기, 별도 보관, 새 인스턴스 생성 중 목적을 고릅니다.', check: '보관 위치 · 복원 절차 · 복원 점검', note: '세 방법의 이름보다 해결하려는 목적을 기준으로 읽습니다. 발췌의 마지막 문장은 복원 점검이라는 확인 과정을 강조합니다.' },
  quorum: { short: '투표와 쿼럼', purpose: '투표 구성과 연결 상태를 함께 관찰하기', decision: '현재 상태를 기록한 다음 연결, 투표, 서비스 순으로 확인합니다.', check: '네트워크 연결 · 투표 구성 · 복구 경로', note: '한 가지 수치만으로 상태를 단정하지 않는 읽기 예시입니다. 구성과 연결, 서비스 상태를 함께 확인하는 순서에 주목하세요.' },
  redis: { short: '캐시와 원본', purpose: '빠른 조회와 데이터 신선도의 관계 이해하기', decision: '원본과 캐시가 달라도 되는 시간과 장애 시 동작을 정합니다.', check: '만료 시간 · 무효화 정책 · 원본 요청 증가', note: '조회 속도뿐 아니라 값이 언제 달라질 수 있는지도 읽어야 합니다. 캐시가 없을 때의 경로까지 발췌의 범위에 포함됩니다.' },
  ssh: { short: '접속과 인증', purpose: '접속 정책을 확인하며 검증 경로 유지하기', decision: '기존 연결을 유지한 상태에서 새 세션으로 변경을 확인합니다.', check: '인증 방법 · 권한 범위 · 새 세션 검증', note: '예시를 그대로 적용하는 대신 자신의 접속 조건과 필요한 권한을 확인하라는 문맥입니다. 이 화면에서는 실제 설정을 변경하지 않습니다.' },
  deadlock: { short: '자원과 대기', purpose: '네 가지 조건과 대응 방식 구분하기', decision: '자원 할당 관계를 보고 예방·회피·복구의 전제를 비교합니다.', check: '상호 배제 · 점유 대기 · 비선점 · 순환 대기', note: '조건의 목록과 대응 방법은 서로 다른 층위입니다. 어떤 조건이 성립하는지 살펴본 다음 대응의 비용과 전제를 읽어 보세요.' },
  k8s: { short: '클러스터 관찰', purpose: '로컬 노드와 워크로드의 확인 순서 익히기', decision: '로컬에서 관찰한 결과와 운영 환경에 필요한 조건을 구분합니다.', check: '노드 상태 · 워크로드 · 환경의 차이', note: '실습의 관찰 결과가 적용되는 범위를 구분하는 예시입니다. 로컬 실습의 성공으로 운영 환경의 가용성을 단정하지 않습니다.' },
  query: { short: '쿼리와 모델', purpose: '타입 표현과 실제 조회 결과를 함께 보기', decision: '표현의 타입 안전성과 실행된 쿼리의 성능을 별도로 확인합니다.', check: '조회 조건 · 생성 SQL · 결과 개수', note: '코드가 표현하는 조건과 데이터베이스가 실행한 쿼리를 연결해 읽습니다. 타입 안전성을 성능의 보장으로 바꾸어 해석하지 않습니다.' },
  network: { short: '연결 진단', purpose: '연결 문제의 범위를 단계적으로 좁히기', decision: '인터페이스부터 주소, 경로, 이름 해석 순서로 관찰합니다.', check: '인터페이스 · 주소 · 라우팅 · DNS', note: '한꺼번에 여러 설정을 바꾸기보다 확인 순서를 정하는 읽기 예시입니다. 원격 접속 중이라면 복구 수단도 검토 항목에 포함됩니다.' },
};

const topicNotes = {
  'AI Engineering': ['질문에서 근거로, 도구에서 흐름으로.', 'AI'],
  Development: ['코드 밖의 연결까지 이해하는 개발.', 'DEV'],
  Infrastructure: ['만들고, 관찰하고, 다시 복원하기.', 'OPS'],
  Database: ['데이터를 읽는 속도와 정확도의 균형.', 'DB'],
  Security: ['연결을 열기 전에 경계를 읽다.', 'SEC'],
  'Computer Science': ['복잡한 현상을 설명하는 작은 원리.', 'CS'],
};

const getGuide = doc => guide[doc.id] || { short: doc.title, purpose: doc.summary, decision: doc.detail, check: '목적 · 전제 조건 · 적용 범위', note: '요약과 본문을 함께 읽으며 문장의 적용 범위를 확인하는 로컬 예시입니다.' };
const localLabel = '<span class="f1-local"><span aria-hidden="true"></span>로컬 예시</span>';
const control = (label, action, value = '', extra = '', kind = '') => button(label, `type="button" data-action="${h(action)}" data-value="${h(value)}" data-focus="${h(`${action}:${value}`)}" ${extra}`, `f1-control ${kind}`);
const optionList = (docs, selected) => docs.map(doc => `<option value="${h(doc.id)}"${doc.id === selected ? ' selected' : ''}>${h(doc.title)}</option>`).join('');
const source = (doc, key) => `<details class="f1-source" data-focus="source:${h(key)}"><summary data-focus="source-summary:${h(key)}">${icon('file')}공개 문서의 로컬 발췌<span aria-hidden="true">＋</span></summary><div><p class="mono f1-source-path">${h(doc.source)}</p><p>${h(doc.summary)}</p><p>${h(doc.detail)}</p><span class="muted">샘플에 포함된 발췌입니다. 외부 문서를 불러오지 않습니다.</span></div></details>`;

function createView(root, ctx) {
  const listeners = [];
  const win = root.ownerDocument.defaultView;
  const findFocus = key => [...root.querySelectorAll('[data-focus]')].find(el => el.dataset.focus === key);
  return {
    win,
    on(type, handler, target = root) { target.addEventListener(type, handler); listeners.push(() => target.removeEventListener(type, handler)); },
    render(markup, fallback) {
      const active = root.ownerDocument.activeElement;
      const key = root.contains(active) ? active?.dataset.focus : null;
      const selection = active?.tagName === 'INPUT' && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
      const expanded = [...root.querySelectorAll('details[open][data-focus]')].map(el => el.dataset.focus);
      root.innerHTML = markup;
      expanded.forEach(value => { const el = findFocus(value); if (el) el.open = true; });
      const next = (key && findFocus(key)) || (fallback && findFocus(fallback));
      if (next) {
        next.focus({ preventScroll: true });
        if (selection && next.tagName === 'INPUT') next.setSelectionRange(...selection);
      }
    },
    focus(key, scroll = false) { const el = findFocus(key); if (el) { el.focus({ preventScroll: !scroll }); } },
    say(message) { const el = root.querySelector('[data-f1-status]'); if (el) el.textContent = message; ctx.announce?.(message); },
    cleanup() { listeners.forEach(remove => remove()); },
  };
}

const status = '<p class="f1-status" data-f1-status role="status" aria-live="polite" aria-atomic="true"></p>';
const actionTarget = event => event.target.closest?.('[data-action]');

function searchTerms(value) { return [...new Set(value.toLocaleLowerCase().split(/[\s,?!！？]+/u).filter(Boolean))].slice(0, 12); }
function marked(value, terms) {
  if (!terms.length) return h(value);
  const pattern = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|');
  return String(value).split(new RegExp(`(${pattern})`, 'giu')).map(part => terms.includes(part.toLocaleLowerCase()) ? `<mark>${h(part)}</mark>` : h(part)).join('');
}

function mountSearch(root, ctx, docs) {
  const view = createView(root, ctx);
  const topics = [...new Set(docs.map(doc => doc.topic))];
  let query = '', draft = '', topic = '', selected = '';
  const readURL = () => {
    const params = new URL(view.win.location.href).searchParams;
    query = (params.get('q') || '').slice(0, 240);
    draft = query;
    topic = topics.includes(params.get('topic')) ? params.get('topic') : '';
  };
  const writeURL = () => {
    const url = new URL(view.win.location.href);
    query ? url.searchParams.set('q', query) : url.searchParams.delete('q');
    topic ? url.searchParams.set('topic', topic) : url.searchParams.delete('topic');
    try { if (url.href !== view.win.location.href) view.win.history.pushState(null, '', url); }
    catch { view.say('현재 주소에서는 검색 조건을 URL에 기록할 수 없습니다. 화면의 검색은 계속 사용할 수 있어요.'); }
  };
  const results = () => {
    const terms = searchTerms(query);
    return docs.filter(doc => !topic || doc.topic === topic).map(doc => {
      let matches = 0;
      const score = [[doc.title, 3], [doc.summary, 2], [doc.detail, 1], [doc.topic, 1]].reduce((total, [text, weight]) => total + terms.reduce((sum, term) => {
        const count = String(text).toLocaleLowerCase().split(term).length - 1;
        matches += count;
        return sum + count * weight;
      }, 0), 0);
      return { doc, score, matches };
    }).filter(item => !terms.length || item.score > 0).sort((a, b) => b.score - a.score);
  };
  function render() {
    const items = results();
    if (!items.some(item => item.doc.id === selected)) selected = items[0]?.doc.id || '';
    const current = items.find(item => item.doc.id === selected);
    const terms = searchTerms(query);
    view.render(`<section class="f1-workbench f1-search" aria-label="근거 검색 작업 영역">
      <div class="f1-search-top">
        <div class="f1-overline"><span class="eyebrow">THE EVIDENCE DESK</span>${localLabel}</div>
        <h2>좋은 답의 시작은,<br>확인할 수 있는 근거.</h2>
        <form class="f1-search-form" data-f1-search role="search">
          <label class="f1-visually-hidden" for="f1-query">문서 검색어</label>${icon('search')}
          <input id="f1-query" data-focus="query" name="q" type="search" maxlength="240" autocomplete="off" placeholder="무엇을 이해하고 싶으세요?" value="${h(draft)}">
          ${button('근거 찾기 '+icon('arrow'), 'type="submit" data-focus="submit-search"', 'primary f1-control')}
        </form>
        <div class="f1-suggestions"><span>이런 키워드로 시작해 보세요</span>${['검색', '네트워크', '백업'].map(word => control(h(word), 'suggest', word, '', 'f1-text-button')).join('')}</div>
      </div>
      <div class="f1-search-toolbar"><div class="f1-field-inline"><label for="f1-topic">주제</label><select id="f1-topic" class="field" data-focus="topic" data-f1-topic><option value="">전체 주제</option>${topics.map(value => `<option${topic === value ? ' selected' : ''}>${h(value)}</option>`).join('')}</select></div><span class="muted">${docs.length}개의 공개 발췌에서 검색</span>${control('검색 초기화', 'reset-search', '', '', 'small')}</div>
      <div class="f1-search-layout">
        <section class="f1-results" aria-label="검색 결과"><div class="f1-result-heading"><h3>${query ? `“${h(query)}” 검색 결과` : '살펴볼 문서'} <span>${items.length}</span></h3><span class="muted">${query ? '단어 일치순' : '편집 순서'}</span></div>
          ${items.length ? `<ol class="f1-result-list">${items.map(({ doc, score, matches }, index) => `<li><button type="button" class="f1-result${selected === doc.id ? ' f1-selected' : ''}" data-action="result" data-value="${h(doc.id)}" data-focus="result:${h(doc.id)}" aria-pressed="${selected === doc.id}" aria-controls="f1-evidence"><span class="f1-rank mono">${String(index + 1).padStart(2, '0')}</span><span class="f1-result-copy"><span class="f1-result-meta">${h(doc.topic)}<span>${query ? `${matches}곳 일치 · ${score}점` : `${doc.minutes}분 읽기`}</span></span><strong>${marked(doc.title, terms)}</strong><span class="f1-snippet">${marked(doc.summary, terms)}</span><span class="f1-result-source mono">${h(doc.source)}</span></span><span class="f1-result-arrow">${icon(selected === doc.id ? 'check' : 'arrow')}</span></button></li>`).join('')}</ol>` : `<div class="empty f1-search-empty">${icon('search')}<h3>일치하는 구절이 없어요</h3><p>검색어를 짧게 바꾸거나 주제를 넓혀 보세요.<br>현재 조건: ${h(query || '전체 문서')} · ${h(topic || '전체 주제')}</p>${control('전체 문서 다시 보기', 'reset-search', 'empty', '', 'primary')}</div>`}
          <p class="f1-method">로컬 단어 검색 · 제목 ×3, 요약 ×2, 본문·주제 ×1<br>점수는 단어 일치 정도이며 사실의 정확도를 뜻하지 않습니다.</p>
        </section>
        <aside id="f1-evidence" class="panel f1-inspector" aria-label="선택한 문서의 근거"><div class="panel-head"><span class="eyebrow">EVIDENCE / 근거 살펴보기</span>${icon('book')}</div>
          ${current ? `<div class="f1-evidence-body">${tag(current.doc.topic)}<h3 tabindex="-1" data-focus="evidence-title">${h(current.doc.title)}</h3><span class="f1-quote-glyph" aria-hidden="true">“</span><blockquote>${marked(current.doc.detail, terms)}</blockquote><div class="f1-reading-note"><span class="eyebrow">읽기 포인트 · 로컬 예시</span><p>${h(getGuide(current.doc).note)}</p></div>${source(current.doc, `search-${current.doc.id}`)}${control(icon('download')+'근거 기록 내려받기', 'export-evidence', current.doc.id, '', 'soft')}${control('↑ 검색 결과로 돌아가기', 'back-results', '', '', 'f1-mobile-control')}</div>` : '<div class="empty"><p>검색 결과를 선택하면<br>근거 구절이 여기에 표시됩니다.</p></div>'}
        </aside>
      </div>${status}</section>`);
  }
  view.on('submit', event => {
    if (!event.target.matches('[data-f1-search]')) return;
    event.preventDefault(); query = root.querySelector('#f1-query').value.trim(); draft = query; selected = ''; render(); writeURL(); view.say(`검색 결과 ${results().length}개. 문서를 선택해 근거를 확인하세요.`);
  });
  view.on('input', event => { if (event.target.matches('#f1-query')) draft = event.target.value; });
  view.on('change', event => {
    if (!event.target.matches('[data-f1-topic]')) return;
    topic = event.target.value; selected = ''; render(); writeURL(); view.say(`${topic || '전체 주제'}에서 ${results().length}개 문서를 찾았어요.`);
  });
  view.on('click', event => {
    const el = actionTarget(event); if (!el || !root.contains(el)) return;
    const { action, value } = el.dataset;
    if (action === 'result') { selected = value; render(); if (view.win.matchMedia('(max-width: 900px)').matches) view.focus('evidence-title', true); view.say(`${docs.find(doc => doc.id === value)?.title}의 근거를 표시했어요.`); }
    if (action === 'back-results') view.focus(`result:${selected}`, true);
    if (action === 'suggest') { query = value; draft = query; selected = ''; render(); writeURL(); view.say(`“${query}” 검색 결과 ${results().length}개.`); }
    if (action === 'reset-search') { query = ''; draft = ''; topic = ''; selected = ''; render(); writeURL(); view.focus('query'); view.say('검색 조건을 초기화했어요. 전체 문서를 표시합니다.'); }
    if (action === 'export-evidence') {
      const doc = docs.find(item => item.id === value); if (!doc) return;
      download('evidence-note.txt', `로컬 예시 · 공개 문서 발췌\n검색어: ${query || '(전체)'}\n\n${doc.title}\n${doc.source}\n\n${doc.detail}\n\n읽기 포인트 (로컬 예시)\n${getGuide(doc).note}`, 'text/plain;charset=utf-8'); view.say('선택한 근거를 텍스트 파일로 내려받았어요.');
    }
  });
  view.on('popstate', () => { readURL(); selected = ''; render(); view.say('주소의 검색 조건을 복원했어요.'); }, view.win);
  readURL(); render(); return () => view.cleanup();
}

function readingSections(doc) {
  const info = getGuide(doc);
  return [
    { title: '먼저, 한 문장으로', text: doc.summary, context: `이 글에서 먼저 살펴볼 것은 ‘${info.purpose}’입니다. 제목에서 떠올린 예상과 요약이 가리키는 범위를 비교해 보세요. 비슷한 용어가 함께 등장하더라도 같은 역할을 하는 것은 아닙니다. 한 문장을 읽고, 무엇을 구분하려는 설명인지 잠시 생각해 봅니다.`, explanation: info.note, origin: '공개 발췌 · 요약' },
    { title: '문맥 안에서 읽기', text: doc.detail, context: '핵심 문장 앞뒤에는 판단의 조건이 놓여 있습니다. 특정 상황에서 성립하는 설명인지, 다음 확인 단계까지 포함하는지 살펴보세요. 문장을 선택하면 옆의 여백에서 준비된 읽기 해설을 확인할 수 있습니다. 원래 문단은 그대로 두고, 설명과 근거를 번갈아 읽어 보세요.', explanation: '이 구절은 문서에 포함된 본문 발췌입니다. 요약만 읽었을 때 놓칠 수 있는 조건과 확인 순서를 함께 보여 줍니다. 구절의 일부를 선택해도 해설은 이 문단 전체의 문맥을 기준으로 합니다.', origin: '공개 발췌 · 본문' },
    { title: '판단의 기준을 세우기', text: info.decision, context: `이제 읽은 내용을 확인 항목으로 바꾸어 봅니다. 이 예시에서는 ${info.check} 항목을 나란히 놓습니다. 각 항목에 답할 수 있는 문장이 발췌에 있는지 찾아보세요. 자료에 없는 내용은 빈칸으로 남겨 두면 다음에 무엇을 더 읽어야 하는지 분명해집니다.`, explanation: '공개 발췌를 읽기 위한 편집 메모입니다. 원문의 직접 인용이나 자동 생성된 답변이 아닙니다. 확인 항목을 실제 적용하기 전에는 각 문서와 환경의 조건을 추가로 검토해야 합니다.', origin: '읽기 가이드 · 로컬 예시' },
    { title: '읽은 뒤 남겨 둘 질문', text: '이 설명은 어떤 조건에서 유효할까? 판단을 바꾸려면 어떤 근거가 더 필요할까?', context: '좋은 읽기 기록은 결론과 남은 질문을 함께 담습니다. 요약을 자신의 말로 한 문장 적어 보고, 그 문장을 뒷받침하는 발췌를 다시 찾아보세요. 여기서 확인한 내용과 아직 확인하지 않은 내용을 나누면 다음 읽기가 자연스럽게 이어집니다. 아래에서 이번 화면에 포함된 공개 발췌를 다시 펼쳐 볼 수 있습니다.', explanation: '이 질문은 읽기를 마무리하기 위해 준비한 로컬 예시입니다. 답을 자동으로 만들어 주지는 않습니다. 앞의 발췌에서 직접 확인한 내용과 추가 자료가 필요한 내용을 구분해 보세요.', origin: '읽기 가이드 · 로컬 예시' },
  ];
}

function mountReader(root, ctx, docs) {
  const view = createView(root, ctx);
  let doc = docs.find(item => item.id === 'retrieval') || docs[0];
  const fontKey = 'f1:02:reader-font';
  const savedFont = ctx.store.get(fontKey, 18);
  let fontSize = [16, 18, 20, 22].includes(savedFont) ? savedFont : 18;
  let selected = 1, selectedText = '', storageMessage = '';
  function render(fallback) {
    const sections = readingSections(doc);
    view.render(`<section class="f1-workbench f1-reader" aria-label="문서 읽기 작업 영역" style="--f1-reader-size:${fontSize}px">
      <div class="f1-reader-toolbar"><div class="f1-reader-picker"><label class="eyebrow" for="f1-reader-doc">READING ROOM / 읽을 문서</label><select class="field" id="f1-reader-doc" data-focus="reader-doc" data-f1-reader-doc>${optionList(docs, doc.id)}</select></div><div class="f1-font-controls" role="group" aria-label="본문 글자 크기">${control('가−', 'font', 'smaller', `aria-label="본문 글자 작게"${fontSize === 16 ? ' disabled' : ''}`)}<output aria-label="본문 글자 크기">${fontSize}px</output>${control('가＋', 'font', 'larger', `aria-label="본문 글자 크게"${fontSize === 22 ? ' disabled' : ''}`)}</div></div>
      <div class="f1-reader-intro"><div class="f1-overline">${tag(doc.topic)}${localLabel}<span class="muted">발췌 + 읽기 가이드</span></div><h2>${h(doc.title)}</h2><p>중요한 문장에 머물러 보세요.<br>본문의 구절을 선택하면, 설명은 바로 옆에.</p><div class="f1-reader-byline"><span>${icon('book')}공개 학습 문서</span><span>원문 기준 ${doc.minutes}분</span><span>준비된 해설 4개</span></div></div>
      <nav class="f1-reader-toc" aria-label="본문 목차">${sections.map((section, index) => control(`<span class="mono">0${index + 1}</span>${h(section.title)}`, 'jump', String(index))).join('')}</nav>
      <div class="f1-reader-instruction">${icon('edit')}밑줄 구절을 드래그하거나 ‘구절 설명’ 버튼을 누르세요. 키보드로도 선택할 수 있어요.</div>
      <article class="f1-reading-article" aria-label="공개 발췌와 읽기 가이드">${sections.map((section, index) => `<section class="f1-reading-section${selected === index ? ' f1-active-passage' : ''}"><div class="f1-prose"><div class="f1-section-index mono">0${index + 1} / 04</div><h3 tabindex="-1" data-focus="section:${index}">${h(section.title)}</h3><span class="f1-passage-origin">${h(section.origin)}</span><p class="f1-passage" data-f1-passage="${index}">${h(section.text)}</p>${control(`${icon('message')}구절 설명 <span aria-hidden="true">${selected === index ? '−' : '+'}</span>`, 'explain', String(index), `aria-expanded="${selected === index}" aria-controls="f1-margin-${index}"`, 'f1-annotation-toggle')}<p>${h(section.context)}</p></div><aside class="f1-margin" id="f1-margin-${index}" aria-label="${h(section.title)} 해설">${selected === index ? `<div class="f1-margin-note"><div class="f1-overline"><span class="eyebrow">NOTE 0${index + 1}</span>${control(icon('close'), 'close-note', String(index), 'aria-label="구절 해설 닫기"', 'f1-icon-control')}</div><span class="f1-local-note">준비된 해설 · 로컬 예시</span>${selectedText ? `<blockquote>“${h(selectedText)}”</blockquote>` : ''}<p>${h(section.explanation)}</p><span class="f1-margin-ref">↳ ${h(section.origin)}</span></div>` : `<div class="f1-margin-hint"><span class="mono">0${index + 1}</span>문장 옆에 생각을 놓는 자리</div>`}</aside></section>`).join('')}</article>
      <footer class="f1-reader-footer"><div><span class="eyebrow">END OF READING</span><h3>근거를 확인하며 읽었나요?</h3><p class="muted">공개 발췌와 편집 가이드를 구분해 기록해 두세요.</p></div>${source(doc, `reader-${doc.id}`)}</footer><p class="f1-storage-note">${h(storageMessage)}</p>${status}</section>`, fallback);
  }
  function chooseSelection() {
    const selection = view.win.getSelection();
    if (!selection || selection.isCollapsed) return;
    const anchor = selection.anchorNode?.nodeType === 1 ? selection.anchorNode : selection.anchorNode?.parentElement;
    const focus = selection.focusNode?.nodeType === 1 ? selection.focusNode : selection.focusNode?.parentElement;
    const passage = anchor?.closest?.('[data-f1-passage]');
    if (!passage || !root.contains(passage) || !passage.contains(focus)) return;
    const text = selection.toString().trim().slice(0, 700);
    if (!text) return;
    selected = Number(passage.dataset.f1Passage); selectedText = text; render(); view.say(`${selected + 1}번 구절에 준비된 해설을 표시했어요.`);
  }
  view.on('pointerup', chooseSelection);
  view.on('keyup', event => { if (event.key === 'Shift') chooseSelection(); });
  view.on('change', event => { if (event.target.matches('[data-f1-reader-doc]')) { doc = docs.find(item => item.id === event.target.value) || doc; selected = 1; selectedText = ''; render(); view.say(`${doc.title} 읽기를 열었어요.`); } });
  view.on('click', event => {
    const el = actionTarget(event); if (!el || !root.contains(el)) return;
    const { action, value } = el.dataset;
    if (action === 'explain') { selected = selected === Number(value) ? -1 : Number(value); selectedText = ''; render(); view.say(selected === -1 ? '구절 해설을 접었어요.' : `${selected + 1}번 구절의 로컬 예시 해설을 표시했어요.`); }
    if (action === 'close-note') { selected = -1; selectedText = ''; render(`explain:${value}`); }
    if (action === 'jump') view.focus(`section:${value}`, true);
    if (action === 'font') {
      fontSize = Math.max(16, Math.min(22, fontSize + (value === 'larger' ? 2 : -2)));
      const persisted = ctx.store.set(fontKey, fontSize);
      storageMessage = persisted === false ? '글자 크기는 이번 화면에서만 유지됩니다. 저장 공간을 사용할 수 없어도 계속 읽을 수 있어요.' : '글자 크기를 이 브라우저에 기억했어요.';
      render(); if (fontSize === 16 || fontSize === 22) view.focus(`font:${fontSize === 16 ? 'larger' : 'smaller'}`); view.say(`본문 글자 크기 ${fontSize}px. ${storageMessage}`);
    }
  });
  render(); return () => view.cleanup();
}

const comparisonCriteria = [
  { id: 'essence', label: '핵심 개념', rows: [{ label: '무엇을 다루나요?', get: doc => doc.summary }, { label: '읽기의 목적', get: doc => getGuide(doc).purpose }] },
  { id: 'decision', label: '판단 기준', rows: [{ label: '선택의 기준', get: doc => getGuide(doc).decision }, { label: '먼저 확인할 항목', get: doc => getGuide(doc).check }] },
  { id: 'evidence', label: '근거 구절', rows: [{ label: '본문 발췌', get: doc => doc.detail }, { label: '출처 경로', get: doc => doc.source }] },
];

function mountCompare(root, ctx, docs) {
  const view = createView(root, ctx);
  let left = docs[0].id, right = docs[1]?.id || docs[0].id, criterion = 'essence';
  const selectedDocs = () => [docs.find(doc => doc.id === left), docs.find(doc => doc.id === right)];
  function render() {
    const [a, b] = selectedDocs();
    const chosen = comparisonCriteria.find(item => item.id === criterion);
    const same = left === right;
    view.render(`<section class="f1-workbench f1-compare" aria-label="두 문서 비교 작업 영역"><div class="f1-compare-overline"><span class="eyebrow">SIDE BY SIDE / 비교 노트</span>${localLabel}</div><div class="f1-compare-intro"><h2>차이를 읽으면,<br>선택의 기준이 보입니다.</h2><p>같은 질문을 두 문서에 건네 보세요.<br>공개 발췌와 준비된 읽기 메모를 나란히 놓았습니다.</p></div>
      <div class="f1-compare-selectors"><div class="f1-document-select f1-side-a"><label for="f1-compare-a"><span class="f1-letter">A</span>첫 번째 문서</label><select id="f1-compare-a" class="field" data-focus="compare-a" data-f1-side="left">${optionList(docs, left)}</select><div class="f1-document-meta">${tag(a.topic)}<span>${a.minutes}분 읽기</span></div></div>${control(icon('layers')+'<span>서로 바꾸기</span>', 'swap-docs', '', 'aria-label="두 문서 위치 서로 바꾸기"', 'f1-swap')}<div class="f1-document-select f1-side-b"><label for="f1-compare-b"><span class="f1-letter">B</span>두 번째 문서</label><select id="f1-compare-b" class="field" data-focus="compare-b" data-f1-side="right">${optionList(docs, right)}</select><div class="f1-document-meta">${tag(b.topic)}<span>${b.minutes}분 읽기</span></div></div></div>
      <div class="f1-compare-controls"><div class="f1-segmented" role="group" aria-label="비교 기준">${comparisonCriteria.map(item => control(h(item.label), 'criterion', item.id, `aria-pressed="${criterion === item.id}"`)).join('')}</div>${control(icon('download')+'비교 기록', 'export-comparison', '', same ? 'disabled' : '', 'small')}</div>
      ${same ? `<div class="f1-compare-error" role="alert">${icon('layers')}<h3>같은 문서를 선택했어요</h3><p>다른 문서를 고르면 두 관점을 나란히 비교할 수 있습니다.</p>${control(docs.length > 1 ? '다른 문서와 비교하기' : '비교할 두 번째 문서가 필요해요', 'recover-comparison', '', docs.length < 2 ? 'disabled' : '', 'primary')}</div>` : `<div class="f1-comparison" aria-label="${h(chosen.label)} 비교"><div class="f1-comparison-head"><span><b>A</b>${h(a.title)}</span><span><b>B</b>${h(b.title)}</span></div>${chosen.rows.map(row => `<section class="f1-comparison-row"><h3>${h(row.label)}<span>${criterion === 'decision' || row.label === '읽기의 목적' ? '편집 메모 · 로컬 예시' : '공개 문서 발췌'}</span></h3><div class="f1-comparison-pair">${[a, b].map((doc, index) => `<div class="f1-comparison-cell"><span class="f1-cell-label">문서 ${index ? 'B' : 'A'}</span><p${row.label === '출처 경로' ? ' class="mono"' : ''}>${h(row.get(doc))}</p></div>`).join('')}</div></section>`).join('')}</div><div class="f1-common-ground"><div><span class="eyebrow">READ THEM TOGETHER</span><h3>${a.topic === b.topic ? '같은 분야, 다른 초점' : '두 분야를 연결하는 읽기'}</h3></div><p>${a.topic === b.topic ? `두 문서는 ${h(a.topic)} 분야의 자료입니다. A는 ‘${h(getGuide(a).purpose)}’, B는 ‘${h(getGuide(b).purpose)}’에 초점을 둡니다.` : `${h(a.topic)}의 관점과 ${h(b.topic)}의 관점을 비교하고 있어요. 서로 대체할 자료인지 단정하기보다 각 문서가 답하는 질문을 확인해 보세요.`}</p></div><div class="f1-compare-sources">${source(a, `compare-a-${a.id}`)}${source(b, `compare-b-${b.id}`)}</div>`}${status}</section>`);
  }
  view.on('change', event => {
    if (!event.target.matches('[data-f1-side]')) return;
    if (!docs.some(doc => doc.id === event.target.value)) return;
    if (event.target.dataset.f1Side === 'left') left = event.target.value; else right = event.target.value;
    render(); view.say(left === right ? '같은 문서입니다. 두 번째 문서를 바꿔 주세요.' : '선택한 두 문서로 비교를 갱신했어요.');
  });
  view.on('click', event => {
    const el = actionTarget(event); if (!el || !root.contains(el)) return;
    const { action, value } = el.dataset;
    if (action === 'criterion') { criterion = value; render(); view.say(`${comparisonCriteria.find(item => item.id === value).label} 기준으로 비교합니다.`); }
    if (action === 'swap-docs') { [left, right] = [right, left]; render(); view.say('문서 A와 B의 위치를 바꿨어요.'); }
    if (action === 'recover-comparison') { right = docs.find(doc => doc.id !== left)?.id || right; render(); view.focus('compare-b'); view.say('다른 공개 문서를 선택했어요. 비교를 계속할 수 있습니다.'); }
    if (action === 'export-comparison' && left !== right) {
      const [a, b] = selectedDocs(); const chosen = comparisonCriteria.find(item => item.id === criterion);
      download('document-comparison.md', `# ${chosen.label} 비교\n\n로컬 예시 · 공개 발췌와 편집 메모\n\nA: ${a.title}\nB: ${b.title}\n\n${chosen.rows.map(row => `## ${row.label}\n\nA: ${row.get(a)}\n\nB: ${row.get(b)}`).join('\n\n')}\n\n출처 A: ${a.source}\n출처 B: ${b.source}\n`, 'text/markdown;charset=utf-8'); view.say('현재 기준의 비교 기록을 내려받았어요.');
    }
  });
  render(); return () => view.cleanup();
}

const graphPositions = [
  { id: 'retrieval', x: 21, y: 16, group: 'ai' }, { id: 'mcp', x: 78, y: 17, group: 'ai' },
  { id: 'graph', x: 49, y: 39, group: 'ai' }, { id: 'docker', x: 19, y: 59, group: 'ops' },
  { id: 'redis', x: 81, y: 58, group: 'data' }, { id: 'k8s', x: 45, y: 82, group: 'ops' },
  { id: 'backup', x: 81, y: 86, group: 'ops' },
];
const graphEdges = [
  ['retrieval', 'graph', '검색 다음의 흐름', '검색 후보를 확인한 뒤, 결과를 다루는 작업의 순서와 분기를 읽어 보세요.'],
  ['graph', 'mcp', '도구 호출의 경계', '작업 흐름 속에서 도구를 호출하는 지점과 허용할 권한을 함께 살펴봅니다.'],
  ['graph', 'docker', '흐름에서 실행 환경으로', '작업의 흐름을 읽은 다음, 실행 환경의 서비스 연결로 관점을 넓히는 읽기 경로입니다.'],
  ['retrieval', 'redis', '후보와 캐시의 구분', '검색 후보를 찾는 역할과 값을 빠르게 조회하는 역할을 구분해 읽습니다.'],
  ['docker', 'k8s', '연결에서 클러스터로', '컨테이너의 연결을 이해한 다음 노드와 워크로드를 관찰하는 읽기 순서입니다.'],
  ['k8s', 'backup', '관찰 다음의 복원', '환경을 관찰하는 관점에 복원과 보관의 관점을 더해 보는 경로입니다.'],
  ['redis', 'backup', '원본과 보관', '캐시와 원본의 관계를 읽은 뒤, 복원 가능한 사본의 목적을 구분해 봅니다.'],
];

function mountGraph(root, ctx, docs) {
  const view = createView(root, ctx);
  const nodes = graphPositions.filter(node => docs.some(doc => doc.id === node.id));
  // Keep the canvas useful even if the caller provides a smaller public sample.
  if (!nodes.length) nodes.push(...docs.slice(0, 7).map((doc, index) => ({ ...graphPositions[index], id: doc.id })));
  const edges = graphEdges.filter(edge => nodes.some(node => node.id === edge[0]) && nodes.some(node => node.id === edge[1]));
  const initial = nodes.find(node => node.id === 'graph')?.id || nodes[0].id;
  let selected = initial, onlyNeighbors = false, trail = [initial];
  const neighbors = () => edges.filter(edge => edge[0] === selected || edge[1] === selected);
  const visibleNodes = () => onlyNeighbors ? nodes.filter(node => node.id === selected || neighbors().some(edge => edge.includes(node.id))) : nodes;
  const pick = id => { if (!nodes.some(node => node.id === id)) return; selected = id; if (trail.at(-1) !== id) trail = [...trail, id].slice(-4); render(); view.say(`${getGuide(docs.find(doc => doc.id === id)).short} 선택. 읽기 연결 ${neighbors().length}개.`); };
  function render() {
    const current = docs.find(doc => doc.id === selected);
    const linked = neighbors();
    const visible = new Set(visibleNodes().map(node => node.id));
    view.render(`<section class="f1-workbench f1-graph" aria-label="지식 그래프 탐색 작업 영역"><div class="f1-graph-top"><div><span class="eyebrow">CONNECTED READING</span><h2>하나를 이해하면,<br>다음 연결이 보입니다.</h2></div><div class="f1-graph-meta">${localLabel}<span>${nodes.length}개 문서 · ${edges.length}개 읽기 연결</span></div></div>
      <div class="f1-graph-layout"><section class="f1-graph-board" aria-label="문서 관계 캔버스"><div class="f1-canvas-toolbar"><div class="f1-graph-legend"><span><i class="f1-legend-ai"></i>AI</span><span><i class="f1-legend-ops"></i>실행·복원</span><span><i class="f1-legend-data"></i>데이터</span></div>${control('연결만 보기', 'graph-scope', '', `aria-pressed="${onlyNeighbors}"`, 'small')}</div>
        <div class="f1-graph-canvas" role="group" aria-label="문서 노드. 방향키로 이동하고 Enter로 선택할 수 있습니다."><svg class="f1-graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${edges.map(([from, to]) => {
          const a = nodes.find(node => node.id === from), b = nodes.find(node => node.id === to), active = from === selected || to === selected;
          return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="f1-edge${active ? ' f1-edge-active' : ''}"${!visible.has(from) || !visible.has(to) ? ' visibility="hidden"' : ''}/>`;
        }).join('')}</svg><span class="f1-canvas-coordinate mono" aria-hidden="true">MAP / 01</span>${nodes.map(node => {
          const doc = docs.find(item => item.id === node.id);
          return `<button type="button" class="f1-node f1-node-${node.group}${selected === node.id ? ' f1-node-selected' : ''}${!linked.some(edge => edge.includes(node.id)) && selected !== node.id ? ' f1-node-distant' : ''}" style="--f1-x:${node.x}%;--f1-y:${node.y}%" data-action="node" data-value="${h(node.id)}" data-focus="node:${h(node.id)}" data-f1-node aria-pressed="${selected === node.id}" aria-controls="f1-graph-inspector"${visible.has(node.id) ? '' : ' hidden'}><span class="f1-node-symbol">${icon(node.group === 'ai' ? 'graph' : node.group === 'data' ? 'layers' : 'grid')}</span><strong>${h(getGuide(doc).short)}</strong><span class="f1-node-subtitle">${selected === node.id ? '선택됨' : `${edges.filter(edge => edge[0] === node.id || edge[1] === node.id).length}개 연결`}</span></button>`;
        }).join('')}</div><div class="f1-canvas-footer"><span>선은 편집자가 제안한 읽기 순서입니다.</span>${control(icon('graph')+'처음으로', 'reset-graph', '', '', 'small')}</div></section>
        <aside class="panel f1-graph-inspector" id="f1-graph-inspector" aria-label="선택한 개념과 관계"><div class="f1-graph-inspector-top"><span class="eyebrow">SELECTED CONCEPT</span>${tag(current.topic)}<h3>${h(getGuide(current).short)}</h3><p class="f1-graph-source-title">${h(current.title)}</p><p>${h(current.summary)}</p></div><div class="f1-relationships"><h4>다음에 연결해 읽기 <span>${linked.length}</span></h4>${linked.length ? linked.map(edge => {
          const other = docs.find(doc => doc.id === (edge[0] === selected ? edge[1] : edge[0]));
          return `<button type="button" class="f1-relationship" data-action="node" data-value="${h(other.id)}" data-focus="relationship:${h(other.id)}"><span class="f1-relation-type">${h(edge[2])}</span><strong>${h(getGuide(other).short)}${icon('arrow')}</strong><span>${h(edge[3])}</span></button>`;
        }).join('') : '<p class="muted">이 샘플에는 연결이 아직 없어요. 아래 문서 목록에서 다른 개념을 선택해 보세요.</p>'}</div>${source(current, `graph-${current.id}`)}</aside></div>
      <div class="f1-graph-navigation"><div><span class="eyebrow">지나온 문서</span><div class="f1-trail">${trail.map((id, index) => control(`${index ? '<span aria-hidden="true">↗</span>' : ''}${h(getGuide(docs.find(doc => doc.id === id)).short)}`, 'trail', `${index}`, `aria-label="${h(getGuide(docs.find(doc => doc.id === id)).short)} 다시 선택"`, 'f1-text-button')).join('')}</div></div><p class="muted">노드에서 방향키로 이동 · Enter로 선택</p></div><nav class="f1-node-list" aria-label="키보드용 전체 문서 목록">${nodes.map(node => control(h(getGuide(docs.find(doc => doc.id === node.id)).short), 'list-node', node.id, `aria-pressed="${selected === node.id}"`, 'small')).join('')}</nav>${status}</section>`);
  }
  view.on('keydown', event => {
    const node = event.target.closest?.('[data-f1-node]'); if (!node || !root.contains(node)) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const available = visibleNodes(); let index = available.findIndex(item => item.id === node.dataset.value);
    if (event.key === 'Home') index = 0; else if (event.key === 'End') index = available.length - 1; else index = (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + available.length) % available.length;
    view.focus(`node:${available[index].id}`);
  });
  view.on('click', event => {
    const el = actionTarget(event); if (!el || !root.contains(el)) return;
    const { action, value } = el.dataset;
    if (action === 'node' || action === 'list-node') { const focus = el.dataset.focus; pick(value); if (focus.startsWith('relationship:')) view.focus(`node:${value}`); }
    if (action === 'trail') { const id = trail[Number(value)]; if (id) { pick(id); view.focus(`node:${id}`); } }
    if (action === 'graph-scope') { onlyNeighbors = !onlyNeighbors; render(); view.say(onlyNeighbors ? `선택한 문서와 연결된 문서 ${visibleNodes().length}개를 표시합니다.` : '전체 문서의 연결을 표시합니다.'); }
    if (action === 'reset-graph') { selected = initial; trail = [initial]; onlyNeighbors = false; render(); view.say('처음 개념으로 돌아왔어요.'); }
  });
  render(); return () => view.cleanup();
}

function mountAtlas(root, ctx, docs) {
  const view = createView(root, ctx);
  const topics = [...new Set(docs.map(doc => doc.topic))];
  const key = 'f1:05:reading-collection';
  const stored = ctx.store.get(key, []);
  let collection = Array.isArray(stored) ? [...new Set(stored)].filter(id => docs.some(doc => doc.id === id)) : [];
  let topic = '', preview = '', previewOrigin = '', storageMessage = '', memoryOnly = false;
  const inTopic = () => docs.filter(doc => !topic || doc.topic === topic);
  const persist = () => { memoryOnly = ctx.store.set(key, collection) === false; storageMessage = memoryOnly ? '저장 공간을 사용할 수 없어 이번 화면에서만 유지됩니다. 읽기 목록을 내려받아 보관하세요.' : '이 브라우저에 읽기 순서를 저장했어요.'; };
  function render(fallback) {
    const currentDocs = inTopic();
    const featured = currentDocs[0];
    const reading = docs.find(doc => doc.id === preview);
    const savedDocs = collection.map(id => docs.find(doc => doc.id === id));
    view.render(`<section class="f1-workbench f1-atlas" aria-label="주제별 지식 아틀라스 작업 영역"><div class="f1-atlas-masthead"><span class="eyebrow">THE KNOWLEDGE ATLAS</span><span class="mono">VOL. 01 / PUBLIC NOTES</span>${localLabel}</div><div class="f1-atlas-heading"><h2>관심에서 시작해,<br><em>이해의 지도를 넓히다.</em></h2><div class="f1-atlas-index"><strong>${String(docs.length).padStart(2, '0')}</strong><span>공개 문서<br>${topics.length}개의 읽기 방향</span></div></div>
      <nav class="f1-topic-tabs" aria-label="아틀라스 분야">${['', ...topics].map(value => control(h(value || '전체 둘러보기'), 'atlas-topic', value, `aria-pressed="${topic === value}"`)).join('')}</nav>
      <section class="f1-atlas-feature" aria-label="분야의 추천 읽기"><div class="f1-feature-story"><span class="eyebrow">EDITOR’S PICK / ${h(featured.topic)}</span><h3>${h(featured.title)}</h3><p>${h(featured.summary)}</p><div class="f1-feature-actions">${control('발췌 읽기 '+icon('arrow'), 'preview', featured.id, `aria-expanded="${preview === featured.id}" aria-controls="f1-atlas-preview"`, 'f1-paper-button')}${control(icon(collection.includes(featured.id) ? 'check' : 'plus')+(collection.includes(featured.id) ? '담은 문서' : '목록에 담기'), 'feature-save', featured.id, `aria-pressed="${collection.includes(featured.id)}"`, 'f1-feature-save')}</div></div><div class="f1-feature-index" aria-hidden="true"><div class="f1-orbit f1-orbit-one"></div><div class="f1-orbit f1-orbit-two"></div><span class="f1-feature-monogram">${h((topicNotes[featured.topic] || ['', 'READ'])[1])}<span>FIELD NOTES</span></span><span class="f1-feature-folio mono">01—${String(currentDocs.length).padStart(2, '0')}</span></div></section>
      <div id="f1-atlas-preview">${reading ? `<section class="f1-atlas-preview" aria-label="선택 문서 발췌"><div class="f1-overline"><span class="eyebrow">PUBLIC EXCERPT / 로컬 발췌</span>${control(icon('close')+'닫기', 'close-preview', '', '', 'small')}</div><h3 tabindex="-1" data-focus="atlas-preview-title">${h(reading.title)}</h3><p>${h(reading.summary)}</p><blockquote>${h(reading.detail)}</blockquote><p class="mono f1-source-path">${h(reading.source)}</p></section>` : ''}</div>
      <div class="f1-atlas-content"><div class="f1-atlas-editorial"><div class="f1-editorial-heading"><h3>${topic ? h(topic) : '어디부터 읽어 볼까요?'}</h3><span>${currentDocs.length}편 · ${currentDocs.reduce((sum, doc) => sum + doc.minutes, 0)}분</span>${control(icon('plus')+'이 분야 모두 담기', 'save-topic', '', '', 'small')}</div>${topics.filter(value => !topic || value === topic).map((value, index) => `<section class="f1-topic-band"><div class="f1-band-heading"><span class="f1-band-number mono">${String(index + 1).padStart(2, '0')}</span><div><h4>${h(value)}</h4><p>${h((topicNotes[value] || ['다음 질문으로 이어지는 읽기.'])[0])}</p></div></div><ol class="f1-editorial-list">${docs.filter(doc => doc.topic === value).map(doc => `<li><button type="button" class="f1-story-link" data-action="preview" data-value="${h(doc.id)}" data-focus="story:${h(doc.id)}" aria-expanded="${preview === doc.id}" aria-controls="f1-atlas-preview"><span><strong>${h(doc.title)}</strong><span>${doc.minutes}분 읽기 <span aria-hidden="true">↗</span></span></span></button>${control(icon(collection.includes(doc.id) ? 'check' : 'plus'), 'save', doc.id, `aria-label="${h(doc.title)} ${collection.includes(doc.id) ? '읽기 목록에서 빼기' : '읽기 목록에 담기'}" aria-pressed="${collection.includes(doc.id)}"`, 'f1-save-story')}</li>`).join('')}</ol></section>`).join('')}</div>
      <aside class="f1-collection" aria-label="나의 읽기 목록"><div class="f1-collection-top"><span class="eyebrow">YOUR READING SHELF</span>${icon('book')}</div><h3 tabindex="-1" data-focus="collection-heading">이어 읽을 문서 <span>${collection.length}</span></h3><p class="f1-collection-note">${memoryOnly ? '이번 화면에 보관 중' : '이 브라우저에만 보관'} · 읽기 순서를 바꿀 수 있어요.</p>${savedDocs.length ? `<ol class="f1-saved-list">${savedDocs.map((doc, index) => `<li><span class="f1-saved-number mono">${String(index + 1).padStart(2, '0')}</span><div><button type="button" class="f1-saved-title" data-action="preview" data-value="${h(doc.id)}" data-focus="saved-title:${h(doc.id)}" aria-expanded="${preview === doc.id}" aria-controls="f1-atlas-preview">${h(doc.title)}</button><span class="muted">${doc.minutes}분 · ${h(doc.topic)}</span><div class="f1-saved-actions">${control('↑', 'move-up', doc.id, `aria-label="${h(doc.title)} 읽기 순서 앞으로"${index === 0 ? ' disabled' : ''}`, 'f1-icon-control')}${control('↓', 'move-down', doc.id, `aria-label="${h(doc.title)} 읽기 순서 뒤로"${index === savedDocs.length - 1 ? ' disabled' : ''}`, 'f1-icon-control')}${control(icon('close'), 'remove-saved', doc.id, `aria-label="${h(doc.title)} 읽기 목록에서 제거"`, 'f1-icon-control')}</div></div></li>`).join('')}</ol><div class="f1-collection-footer"><span>총 ${savedDocs.reduce((sum, doc) => sum + doc.minutes, 0)}분의 읽기</span>${control(icon('download')+'읽기 목록 내려받기', 'export-collection', '', '', 'soft')}</div>` : `<div class="f1-empty-shelf"><span class="f1-empty-books" aria-hidden="true">${icon('book')}</span><h4>다음에 읽을 한 편</h4><p>문서 옆의 +를 누르면<br>나만의 읽기 순서가 시작됩니다.</p>${control('추천 3편으로 시작하기', 'starter-collection', '', '', 'soft')}</div>`}<p class="f1-storage-note">${h(storageMessage)}</p>${memoryOnly ? control('저장 다시 시도', 'retry-save', '', '', 'small') : ''}</aside></div>${status}</section>`, fallback);
  }
  function saveToggle(id) {
    if (!docs.some(doc => doc.id === id)) return;
    const had = collection.includes(id);
    collection = had ? collection.filter(value => value !== id) : [...collection, id];
    persist(); render('collection-heading'); view.say(`${had ? '읽기 목록에서 뺐어요.' : '읽기 목록에 담았어요.'} 현재 ${collection.length}편. ${storageMessage}`);
  }
  view.on('click', event => {
    const el = actionTarget(event); if (!el || !root.contains(el)) return;
    const { action, value } = el.dataset;
    if (action === 'atlas-topic') { topic = value; preview = ''; render(); view.say(`${topic || '전체 분야'}의 문서 ${inTopic().length}편을 표시합니다.`); }
    if (action === 'preview') { preview = value; previewOrigin = el.dataset.focus; render(); view.focus('atlas-preview-title', true); view.say('공개 문서의 로컬 발췌를 열었어요.'); }
    if (action === 'close-preview') { preview = ''; render(previewOrigin); view.focus(previewOrigin, true); }
    if (['save', 'feature-save', 'remove-saved'].includes(action)) saveToggle(value);
    if (action === 'save-topic' || action === 'starter-collection') {
      const added = action === 'starter-collection' ? docs.slice(0, 3) : inTopic();
      const before = collection.length; collection = [...new Set([...collection, ...added.map(doc => doc.id)])]; persist(); render(); view.say(`${collection.length - before}편을 추가했어요. 현재 읽기 목록 ${collection.length}편. ${storageMessage}`);
      if (action === 'starter-collection') view.focus('collection-heading');
    }
    if (action === 'move-up' || action === 'move-down') {
      const index = collection.indexOf(value), target = index + (action === 'move-up' ? -1 : 1);
      if (index < 0 || target < 0 || target >= collection.length) return;
      [collection[index], collection[target]] = [collection[target], collection[index]]; persist(); render();
      if (target === 0 || target === collection.length - 1) view.focus(`saved-title:${value}`);
      view.say(`${target + 1}번째 읽기로 옮겼어요. ${storageMessage}`);
    }
    if (action === 'retry-save') { persist(); render('collection-heading'); view.say(storageMessage); }
    if (action === 'export-collection' && collection.length) {
      const text = collection.map((id, index) => { const doc = docs.find(item => item.id === id); return `## ${index + 1}. ${doc.title}\n\n${doc.topic} · ${doc.minutes}분\n출처 경로: ${doc.source}\n\n${doc.summary}\n\n${doc.detail}`; }).join('\n\n');
      download('my-reading-atlas.md', `# 나의 읽기 아틀라스\n\n로컬 예시 · 공개 학습 문서 발췌\n\n${text}\n`, 'text/markdown;charset=utf-8'); view.say('현재 순서대로 읽기 목록을 내려받았어요.');
    }
  });
  render(); return () => view.cleanup();
}

export function mount(root, ctx) {
  const seen = new Set();
  const docs = (Array.isArray(ctx.docs) ? ctx.docs : []).filter(doc => {
    if (!doc || !['id', 'title', 'topic', 'summary', 'detail', 'source'].every(key => typeof doc[key] === 'string') || seen.has(doc.id)) return false;
    seen.add(doc.id); return true;
  }).map(doc => ({ ...doc, minutes: Number.isFinite(doc.minutes) && doc.minutes > 0 ? Math.round(doc.minutes) : 1 }));
  if (!docs.length) {
    root.innerHTML = '<section class="f1-workbench panel f1-no-docs" role="status"><h2>표시할 공개 발췌가 없어요</h2><p>샘플 문서가 준비되면 탐색을 시작할 수 있습니다. 갤러리에서 다른 로컬 예시를 살펴보세요.</p></section>';
    return () => {};
  }
  const routes = { '01': mountSearch, '02': mountReader, '03': mountCompare, '04': mountGraph, '05': mountAtlas };
  const render = routes[String(ctx.concept.id).padStart(2, '0')];
  if (!render) { root.innerHTML = '<section class="f1-workbench panel f1-no-docs" role="status"><h2>이 탐색 화면을 찾을 수 없어요</h2><p>01–05 탐색 예시 중 하나를 선택해 주세요.</p></section>'; return () => {}; }
  return render(root, ctx, docs);
}
