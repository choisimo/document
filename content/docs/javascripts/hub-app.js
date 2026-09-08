
/* Documentation Hub: reference UI connected to the published MkDocs corpus. */
(async () => {
  'use strict';
  if (window.__NDHUB_APP_STARTED) return;
  window.__NDHUB_APP_STARTED = true;
  const BOOT = window.NDHUB_BOOT || {};
  const baseURL = new URL(BOOT.baseUrl || './', location.href);
  if (!baseURL.pathname.endsWith('/')) baseURL.pathname += '/';
  const publishedURL = value => {
    const raw = String(value || '');
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
      const url = new URL(raw);
      if (url.origin !== location.origin) return url;
      if (url.pathname.startsWith(baseURL.pathname)) return url;
      return publishedURL(url.pathname + url.search + url.hash);
    }
    if (!raw.startsWith('/')) return new URL(raw, baseURL);
    if (baseURL.pathname !== '/' && raw.startsWith(baseURL.pathname)) return new URL(raw, location.origin);
    const configured = window.NDHUB_DATA?.basePath || '/';
    const relative = configured !== '/' && raw.startsWith(configured) ? raw.slice(configured.length) : raw.replace(/^\/+/, '');
    return new URL(relative, baseURL);
  };
  async function fetchJSON(url) {
    const target = new URL(url, location.href);
    if (target.origin !== location.origin) throw new Error('문서 주소가 이 사이트의 범위를 벗어납니다.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(target, { signal: controller.signal, credentials: 'same-origin' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  async function catalogData() {
    const main = document.getElementById('main');
    main.innerHTML = '<div class="page list-page" role="status" aria-busy="true"><div class="skeleton-row"><i class="skeleton"></i><i class="skeleton"></i><i class="skeleton"></i></div><p class="quiet-note">문서 목록을 불러오고 있습니다.</p></div>';
    try {
      const data = await fetchJSON(BOOT.catalogUrl?.startsWith('/') ? publishedURL(BOOT.catalogUrl) : new URL(BOOT.catalogUrl || 'hub/catalog.json', BOOT.catalogUrl ? location.href : baseURL));
      if (!Array.isArray(data.docs) || !data.docs.length || !Array.isArray(data.categories) || !Array.isArray(data.stacks)) throw new Error('문서 목록 형식이 올바르지 않습니다.');
      data.docs = data.docs.map(d => ({ ...d, path: d.source, tags: Array.isArray(d.tags) ? d.tags : [], sections: Array.isArray(d.sections) ? d.sections : [], toc: Array.isArray(d.toc) ? d.toc : [], description: d.description || '', intent: d.intent || 'reference' }));
      data.intents = Array.isArray(data.intents) && data.intents.length ? data.intents : [{id:'all',label:'전체',icon:'search'},{id:'reference',label:'참조',icon:'book'}];
      data.categories = data.categories.map(c => ({ ...c, name: c.name || c.label || c.id, label: c.label || c.name || c.id, desc: c.desc || c.description || '', icon: c.icon || 'book' }));
      data.stacks = data.stacks.map(stack => ({ ...stack, tags: Array.isArray(stack.tags) ? stack.tags : [], files: Array.isArray(stack.files) ? stack.files : [], repo: Array.isArray(stack.repo) ? stack.repo.join(' · ') : stack.repo || '', desc: stack.desc || '', color: stack.color || 'blue', glyph: stack.glyph || 'layers' }));
      window.NDHUB_DATA = data;
      return data;
    } catch (_) {
      main.innerHTML = '<div class="page list-page"><div class="empty-state error" role="alert"><h1>문서 목록을 불러오지 못했어요.</h1><p>연결 상태를 확인한 뒤 다시 시도해 주세요.</p><button class="btn primary" id="catalog-retry">다시 시도</button></div></div>';
      return await new Promise(resolve => document.getElementById('catalog-retry').addEventListener('click', () => resolve(catalogData()), { once: true }));
    }
  }
  const D = await catalogData();
  const documentsById = new Map(D.docs.map(d => [d.id, d]));
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, Number.isFinite(+n) ? +n : a));
  const uid = () => globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const byId = id => documentsById.get(id);
  const category = id => D.categories.find(c => c.id === id) || D.categories[0];
  const intent = id => D.intents.find(i => i.id === id) || D.intents[0];
  const moneyless = n => Number(n).toLocaleString('ko-KR');
  let storageOK = true, storageWarned = false;
  const SESSION_KEYS = new Set(['recents', 'sessions', 'activeSession', 'views']);
  const storageFor = key => SESSION_KEYS.has(key) ? sessionStorage : localStorage;
  const read = (key, fallback) => { try { const raw = storageFor(key).getItem('ndhub.v1.' + key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; } };
  function save(key, value) {
    try { storageFor(key).setItem('ndhub.v1.' + key, JSON.stringify(value)); return true; }
    catch { storageOK = false; if (!storageWarned) { storageWarned = true; toast('브라우저 저장이 제한되어 현재 화면에서만 변경을 유지합니다.', 'info'); } return false; }
  }
  // Private reading state is never migrated from persistent browser storage.
  for (const key of SESSION_KEYS) { try { localStorage.removeItem('ndhub.v1.' + key); } catch {} }
  try {
    localStorage.removeItem('splitview-state');
    for (const key of ['recents','sessions','activeSession','views']) localStorage.removeItem('ndhub.preview.v1.' + key);
  } catch {}
  const storedSettings = read('settings', {});
  const rawSettings = storedSettings && typeof storedSettings === 'object' ? storedSettings : {};
  const settings = { theme: rawSettings.theme === 'dark' ? 'dark' : 'light', density: rawSettings.density === 'compact' ? 'compact' : 'comfortable', readerSize: clamp(rawSettings.readerSize || 16, 14, 20), motion: rawSettings.motion === 'reduce' ? 'reduce' : 'normal', contrast: rawSettings.contrast === 'high' ? 'high' : 'normal' };
  const validIds = raw => Array.isArray(raw) ? [...new Set(raw.filter(id => typeof id === 'string' && byId(id)))] : [];
  const bookmarks = new Set(validIds(read('bookmarks', [])));
  let recents = validIds(read('recents', [])).slice(0, 10);
  const makePane = (id, anchor = '') => ({ history: [{ id, anchor, positioned:false, scroll: 0 }], cursor: 0 });
  const storedLayout = read('layout', {});
  const layoutDefaults = { layout: ['1x1','1x2','2x1','2x2'].includes(storedLayout?.layout) ? storedLayout.layout : '1x2', split: clamp(storedLayout?.split || 50,22,76), splitY: clamp(storedLayout?.splitY || 50,25,72) };
  const freshSession = (name = '워크스페이스') => ({ id: uid(), name, layout: window.innerWidth <= 760 ? '1x1' : layoutDefaults.layout, active: 0, split: layoutDefaults.split, splitY: layoutDefaults.splitY, panes: [makePane(null), makePane(null), makePane(null), makePane(null)] });
  function validateSession(x) {
    if (!x || typeof x !== 'object') return null;
    const panes = Array.from({ length: 4 }, (_, i) => {
      const p = x.panes?.[i];
      const history = Array.isArray(p?.history) ? p.history.filter(e => e && (e.id === null || byId(e.id))).slice(-30).map(e => ({ id: e.id, anchor: typeof e.anchor === 'string' ? e.anchor.slice(0,500) : '', positioned:e.positioned===true || Number(e.scroll)>0, scroll: clamp(e.scroll || 0, 0, 1e7) })) : [];
      return history.length ? { history, cursor: Math.round(clamp(p.cursor || 0, 0, history.length - 1)) } : makePane(null);
    });
    return { id: typeof x.id === 'string' ? x.id.slice(0, 80) : uid(), name: typeof x.name === 'string' ? x.name.slice(0, 50) : '워크스페이스', layout: ['1x1', '1x2', '2x1', '2x2'].includes(x.layout) ? x.layout : '1x2', active: Math.round(clamp(x.active || 0, 0, 3)), split: clamp(x.split || 50, 22, 76), splitY: clamp(x.splitY || 50, 25, 72), panes };
  }
  let sessions = read('sessions', []); sessions = Array.isArray(sessions) ? sessions.slice(0, 8).map(validateSession).filter(Boolean) : []; if (!sessions.length) sessions = [freshSession()];
  let sessionId = read('activeSession', sessions[0].id); if (!sessions.some(s => s.id === sessionId)) sessionId = sessions[0].id;
  const session = () => sessions.find(s => s.id === sessionId) || sessions[0];
  const paneCount = s => s.layout === '1x1' ? 1 : s.layout === '2x2' ? 4 : 2;
  const entry = (s, i) => s.panes[i].history[s.panes[i].cursor];
  const state = { route: 'home', params: new URLSearchParams(), q: '', intent: 'all', searchState: 'normal', libraryQ: '', libraryCategory: 'all', libraryView: 'list', stackQ: '', stackGroup: 'all', stackSort: 'name', selectedStack: D.stacks[0]?.id || '', keyQ: '', keyStatus: 'all', lastDoc: D.docs.find(d => d.source === BOOT.source)?.id || recents[0] || D.docs[0].id, focus: false };
  let codeStore = new Map(), codeSequence = 0, searchTimer, toastTimer, scrollTimer, readerObserver, commandMode = null, commandIndex = 0, commandItems = [], restoreTarget = null, modalReference = 'home', drag = null;
  const ICONS = {
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.4 4.4"/>',
    home: '<path d="m3 10 9-7 9 7v10H6V10m3 10v-7h6v7"/>',
    book: '<path d="M12 5v15m0-15C8 2.5 5 3 2.5 4v14c3-1 6-1 9.5 2 3.5-3 6.5-3 9.5-2V4C19 3 16 2.5 12 5Z"/>',
    file: '<path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h6"/>',
    server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M11 6.5h6m-6 11h6"/>',
    shield: '<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6Z"/><path d="m8 12 3 3 5-6"/>',
    code: '<path d="m7 6-6 6 6 6m10-12 6 6-6 6M14 3l-4 18"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v7c0 4 18 4 18 0V5M3 12v7c0 4 18 4 18 0v-7"/>',
    wrench: '<path d="m14 6 4 4 4-4c2 6-4 11-9 8L5 22l-3-3 8-8C7 6 12 0 18 2Z"/>',
    columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
    rows: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    panel: '<rect x="3" y="3" width="18" height="18" rx="2"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7Zm-10 10 10 5 10-5M2 17l10 5 10-5"/>',
    bookmark: '<path d="M6 3h12v19l-6-4-6 4Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    key: '<circle cx="8" cy="8" r="5"/><path d="m11.5 11.5 10 10m-3-3 3-3m-6 0 3-3"/>',
    settings: '<path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 2 4 3-1 3 1 2-4 3-2-1-3 2-2-2-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m5 9 7 7 7-7"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    left: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    upRight: '<path d="M6 18 18 6M6 6h12v12"/>',
    external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l1.5 1.5m13 13L20 20M4 20l1.5-1.5m13-13L20 4"/>',
    moon: '<path d="M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    wrap: '<path d="M3 5h17M3 10h13a4 4 0 0 1 0 8h-4m3-3-3 3 3 3M3 15h4"/>',
    focus: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
    list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
    filter: '<path d="M4 5h16M7 12h10m-7 7h4"/>',
    refresh: '<path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5m-4 6a8 8 0 0 0 14 5l3-3m0 5v-5h-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    alert: '<path d="m12 3 10 18H2Zm0 6v5m0 3h.01"/>',
    lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m5.5 5.5 3.7 3.7m5.6 5.6 3.7 3.7m0-13-3.7 3.7m-5.6 5.6-3.7 3.7"/>',
    route: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h9"/>',
    network: '<rect x="8" y="2" width="8" height="6" rx="1"/><rect x="2" y="16" width="7" height="6" rx="1"/><rect x="15" y="16" width="7" height="6" rx="1"/><path d="M12 8v5m-7 3v-3h14v3"/>',
    activity: '<path d="M2 12h5l3-9 4 18 3-9h5"/>',
    chart: '<path d="M3 3v18h18M7 16v-5m5 5V6m5 10v-8"/>',
    workflow: '<rect x="2" y="3" width="6" height="6" rx="1"/><rect x="16" y="15" width="6" height="6" rx="1"/><path d="M8 6h8a3 3 0 0 1 3 3v6M5 9v9h11"/>',
    terminal: '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m6 8 4 4-4 4m7 0h5"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L3 21"/>',
    spark: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6ZM20 2v4m-2-2h4"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M3 15v6h18v-6"/>',
    command: '<path d="M8 8h8v8H8Zm0 0H5a3 3 0 1 1 3-3Zm8 0V5a3 3 0 1 1 3 3Zm0 8h3a3 3 0 1 1-3 3Zm-8 0v3a3 3 0 1 1-3-3Z"/>',
    edit: '<path d="m15 3 6 6-12 12H3v-6Zm-3 3 6 6"/>'
  };
  const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.file}</svg>`;
  const btn = (text, action, attrs = '', cls = '') => `<button class="btn ${cls}" data-action="${action}" ${attrs}>${text}</button>`;
  const iconBtn = (name, label, action, attrs = '') => `<button class="icon-btn" title="${h(label)}" aria-label="${h(label)}" data-action="${action}" ${attrs}>${icon(name)}</button>`;
  const tag = (text, cls = '', ico = '') => `<span class="tag ${cls}">${ico ? icon(ico) : ''}${h(text)}</span>`;
  function toast(message, ico = 'check') { clearTimeout(toastTimer); $('#toast-region').innerHTML = `<div class="toast">${icon(ico)}<span>${h(message)}</span></div>`; toastTimer = setTimeout(() => { $('#toast-region').innerHTML = ''; }, 3400); }
  function applySettings() { const root = document.documentElement; root.dataset.theme = settings.theme; root.dataset.density = settings.density; root.dataset.motion = settings.motion; root.dataset.contrast = settings.contrast; root.style.setProperty('--reader-size', settings.readerSize + 'px'); }
  function persistSettings() { save('settings', settings); applySettings(); }
  function navLink(label, href, ico, active = false, count = null) { return `<a class="nav-link ${active ? 'active' : ''}" href="${href}" ${active ? 'aria-current="page"' : ''}>${icon(ico)}<span>${label}</span>${count !== null ? `<span class="nav-count">${count}</span>` : ''}</a>`; }
  function renderSidebar() {
    // The primary navigation is intentionally short. Specialist tools live in a menu.
    $('#sidebar').innerHTML = `<a class="brand" href="#/home"><span class="brand-mark">${icon('book')}</span><span>nodove<span class="blue">.</span><small>DOCUMENTATION</small></span></a><nav class="drawer-nav" aria-label="모바일 주 탐색">${navLink('문서 탐색', '#/library', 'book', ['library', 'search', 'doc'].includes(state.route))}${navLink('Docker 스택', '#/stacks', 'layers', ['stacks', 'stack'].includes(state.route))}${navLink('보관함', '#/saved', 'bookmark', state.route === 'saved')}</nav><div class="drawer-section">작업 도구</div><nav class="drawer-nav" aria-label="추가 도구">${navLink('문서 비교', '#/workspace', 'columns', state.route === 'workspace')}${navLink('API 연결', '#/keys', 'key', state.route === 'keys')}${navLink('설정', '#/settings', 'settings', state.route === 'settings')}${navLink('Documentation Hub 안내', '#/about', 'info', state.route === 'about')}</nav><button class="btn drawer-close" data-action="menu-close">${icon('close')}메뉴 닫기</button>`;
  }
  function renderTopbar() {
    const active = (routes) => routes.includes(state.route) ? ' aria-current="page"' : '';
    $('#topbar').innerHTML = `<div class="topbar-inner"><a class="brand" href="#/home" aria-label="Documentation Hub 시작"><span class="brand-mark">${icon('book')}</span><span>nodove<span class="blue">.</span><small>DOCUMENTATION</small></span></a><nav class="primary-nav" aria-label="주 탐색"><a href="#/library"${active(['library', 'search', 'doc'])}>문서</a><a href="#/stacks"${active(['stacks', 'stack'])}>Docker</a><a href="#/saved"${active(['saved'])}>보관함</a></nav><div class="top-actions"><button class="quick-search" data-action="command" aria-label="빠른 문서 검색, Control K">${icon('search')}<span>빠른 검색</span><kbd>⌘ K</kbd></button><button class="icon-btn desktop-more" data-action="tools-menu" title="작업 도구 및 설정" aria-label="작업 도구 및 설정" aria-haspopup="dialog">${icon('more')}</button><button class="icon-btn mobile-menu-btn" data-action="menu" aria-label="전체 메뉴" aria-expanded="false" aria-controls="sidebar">${icon('menu')}</button></div></div>`;
    $('#mobile-dock').innerHTML = '';
  }
  function closeNav() {
    const nav = $('#sidebar'); nav.inert = window.innerWidth <= 760; nav.removeAttribute('role'); nav.removeAttribute('aria-modal');
    document.body.classList.remove('nav-open'); $('#mobile-scrim').hidden = true; $('.shell').inert = false;
    $$('[data-action="menu"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }
  function toggleNav() {
    const opening = !document.body.classList.contains('nav-open'); closeNav();
    if (opening) { const nav = $('#sidebar'); nav.inert = false; nav.setAttribute('role', 'dialog'); nav.setAttribute('aria-modal', 'true'); document.body.classList.add('nav-open'); $('#mobile-scrim').hidden = false; $('.shell').inert = true; $$('[data-action="menu"]').forEach(b => b.setAttribute('aria-expanded', 'true')); $('#sidebar .brand').focus(); }
  }
  function saveWorkspace() { save('sessions', sessions); save('activeSession', sessionId); const s = session(); save('layout', {layout:s.layout, split:s.split, splitY:s.splitY}); }
  function capturePaneScroll() { if (state.route !== 'workspace') return; $$('.pane-scroll').forEach(el => { const i = +el.dataset.pane; const e = entry(session(), i); if (e) e.scroll = el.scrollTop; }); }
  function route() {
    renderSequence++;
    lastRoutedURL = location.href;
    captureView();
    capturePaneScroll();
    if (state.route === 'workspace') saveWorkspace();
    clearTimeout(searchTimer);
    readerObserver?.disconnect();
    closeNav();
    closeModal();
    if ($('#command-dialog').open) $('#command-dialog').close();
    const hash = routeHash();
    const queryAt = hash.indexOf('?');
    const rawPath = (queryAt < 0 ? hash : hash.slice(0, queryAt)).replace(/^#\/?/, '') || 'home';
    const parts = rawPath.split('/');
    state.params = new URLSearchParams(queryAt < 0 ? '' : hash.slice(queryAt + 1));
    state.route = parts[0];
    state.section = parts[1] || '';
    state.focus = false; document.body.classList.remove('reader-focus');
    codeStore = new Map();
    // Keep old home search links usable, but land on the dedicated results page.
    if (state.route === 'home' && (state.params.has('q') || state.params.has('intent'))) {
      state.route = 'search';
      try { history.replaceState(null, '', '#/search?' + state.params); } catch { }
    }
    currentViewKey = location.pathname + location.search + location.hash;
    if (state.route === 'search') {
      state.q = state.params.get('q') || '';
      state.intent = D.intents.some(i => i.id === state.params.get('intent')) ? state.params.get('intent') : 'all';
      state.searchState = 'normal';
    }
    if (state.route === 'library') {
      state.libraryCategory = D.categories.some(c => c.id === state.params.get('category')) ? state.params.get('category') : 'all';
      state.libraryQ = state.params.get('q') || '';
      state.libraryView = state.params.get('view') === 'grid' ? 'grid' : 'list';
      state.libraryDirectory = !state.params.has('category') && !state.params.has('all') && !state.params.has('q');
    }
    if (state.route === 'stacks') {
      lastStackURL = currentViewKey;
      state.stackQ = state.params.get('q') || '';
      state.stackGroup = [...new Set(D.stacks.map(s => s.group))].includes(state.params.get('group')) ? state.params.get('group') : 'all';
      state.stackSort = state.params.get('sort') === 'services' ? 'services' : 'name';
    }
    if (state.route === 'stack') {
      if (!D.stacks.some(s => s.id === parts[1])) { renderNotFound(); return; }
      state.selectedStack = parts[1];
    }
    if (state.route === 'keys') {
      state.keyQ = state.params.get('q') || '';
      state.keyStatus = ['active', 'expired', 'revoked'].includes(state.params.get('status')) ? state.params.get('status') : 'all';
    }
    if (state.route === 'doc') {
      const d = byId(parts[1]);
      if (!d) { renderNotFound(); return; }
      rememberDocument(d.id);
    }
    const renders = { tools: homePage, command: homePage, home: homePage, search: searchPage, library: libraryPage, doc: readerPage, stacks: stacksPage, stack: stackPage, workspace: workspacePage, keys: keysPage, saved: savedPage, settings: settingsPage, about: aboutPage };
    if (!renders[state.route]) { renderNotFound(); return; }
    document.body.dataset.route = state.route;
    renderSidebar(); renderTopbar();
    setMain(renders[state.route]());
    const titles = { tools:'작업 도구', command:'빠른 검색', home: '필요한 지식, 한 걸음 더 가까이', search: '검색 결과', library: '문서 탐색', stacks: 'Docker 스택', stack: '스택 상세', workspace: '문서 비교', keys: 'API 연결', saved: '보관함', settings: '설정', about: 'Documentation Hub 안내' };
    document.title = `${state.route === 'doc' ? byId(state.lastDoc).title : titles[state.route]} · Documentation Hub`;
    if (state.route === 'search') { updateSearch(); ensureSearchIndex(); }
    if (state.route === 'library') updateLibrary();
    if (state.route === 'stacks') updateStacks();
    if (state.route === 'stack') setupStack();
    if (state.route === 'keys') updateKeys();
    if (state.route === 'doc') setupReader();
    if (state.route === 'workspace') setupWorkspace();
    if (state.route === 'tools') openToolsMenu();
    if (state.route === 'command') openCommand();
    restoreView(currentViewKey);
    document.documentElement.dataset.hubReady = 'true';
  }
  function navigate(path) {
    const match = path.match(/^#\/doc\/([^?]+)(?:\?(.*))?$/);
    if (match) { goToDocument(match[1], new URLSearchParams(match[2] || '').get('anchor') || ''); return; }
    const url = new URL(baseURL); url.hash = path.replace(/^#/, '');
    if (url.href !== location.href) history.pushState(null, '', url);
    route();
  }
  function renderNotFound() {
    document.title = '페이지를 찾을 수 없습니다 · Documentation Hub';
    document.body.dataset.route = 'not-found'; renderSidebar(); renderTopbar();
    $('#main').innerHTML = `<div class="page list-page">${empty('이 페이지를 찾을 수 없어요.', '주소가 바뀌었거나 현재 목록에 포함되지 않은 문서입니다.', 'book', '<a class="btn primary" href="#/home">처음으로 돌아가기</a>')}</div>`;
    $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0);
  }
  const empty = (title, desc, ico = 'search', action = '', error = false) => `<div class="empty-state ${error ? 'error' : ''}"><div class="empty-icon">${icon(ico)}</div><h3>${title}</h3><p>${desc}</p>${action}</div>`;
  function header(eyebrow, title, desc, action = '') { return `<div class="page-title-row"><div><div class="eyebrow"><span class="line"></span>${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div>${action}</div>`; }
  function filteredDocs(q = '', intentId = 'all', categoryId = 'all') {
    const terms = q.normalize('NFKC').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return D.docs.filter(d => (intentId === 'all' || d.intent === intentId) && (categoryId === 'all' || d.category === categoryId)).map(d => {
      const text = [d.title, d.description, d.topic, d.source, category(d.category).name, category(d.category).label, ...d.tags, searchTextById.get(d.id) || ''].join(' ').normalize('NFKC').toLocaleLowerCase();
      const all = terms.every(t => text.includes(t)); let score = all ? 1 : -1; for (const t of terms) { if (d.title.toLocaleLowerCase().includes(t)) score += 4; if (d.tags.join(' ').toLocaleLowerCase().includes(t)) score += 2; }
      return { doc: d, score: all ? score : -1 };
    }).filter(x => x.score >= 0).sort((a, b) => b.score - a.score).map(x => x.doc);
  }
  function highlight(text, q) { const tokens = q.trim().split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length); if (!tokens.length) return h(text); const pattern = new RegExp('(' + tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi'); return String(text).split(pattern).map((p, i) => i % 2 ? `<mark style="color:var(--accent);background:transparent;font-weight:700">${h(p)}</mark>` : h(p)).join(''); }
  function homePage() {
    const recent = byId(recents[0]);
    return `<div class="page home-page"><section class="home-hero" aria-labelledby="home-title"><div class="eyebrow"><span class="edition-mark"></span>A PERSONAL KNOWLEDGE LIBRARY</div><h1 id="home-title">필요한 지식,<br><span>한 걸음 더 가까이.</span></h1><p class="hero-description">어디에 적어 두었는지보다,<br class="mobile-only"> 지금 무엇을 찾고 있는지가 중요하니까.</p><form id="home-search-form" class="search-box">${icon('search')}<label class="sr-only" for="home-search">문서 또는 해결할 문제 검색</label><input id="home-search" type="search" value="${h(state.homeDraft || '')}" placeholder="어떤 문서를 찾고 있나요?" autocomplete="off" spellcheck="false"><button class="search-submit" type="submit" aria-label="검색 결과 보기">${icon('arrow')}</button></form><div class="search-suggestions"><span>이런 주제로 시작해 보세요</span>${['Proxmox', 'Docker', '네트워크'].map(q => `<a href="#/search?q=${encodeURIComponent(q)}">${q}${icon('upRight')}</a>`).join('')}</div></section><section class="start-paths" aria-label="찾는 방법 선택"><a class="start-path" href="#/library"><span class="path-icon">${icon('book')}</span><div><span class="section-label">BROWSE THE LIBRARY</span><h2>주제별로 둘러보기</h2><p>인프라부터 개발 도구까지</p></div>${icon('arrow')}</a><a class="start-path" href="#/stacks"><span class="path-icon">${icon('layers')}</span><div><span class="section-label">EXPLORE THE STACKS</span><h2>Docker 구성 찾아보기</h2><p>서비스를 연결하는 설정과 가이드</p></div>${icon('arrow')}</a></section>${recent ? `<section class="continue-reading" aria-label="이어서 읽기"><span>${icon('clock')}이어서 읽기</span><a href="#/doc/${recent.id}">${h(recent.title)}${icon('arrow')}</a><a class="text-button" href="#/saved?tab=recent">기록 보기</a></section>` : ''}<div class="home-colophon"><span>차곡차곡 쌓인 문서, 필요한 순간의 연결.</span><span class="mono">${String(D.docs.length).padStart(2, '0')} DOCUMENTS / ${String(D.categories.length).padStart(2, '0')} TOPICS</span></div></div>`;
  }
  function resultRow(d) {
    return `<article class="result-row ${state.keyboardDoc === d.id ? 'keyboard-selected' : ''}" data-doc="${d.id}"><div class="result-main"><div class="result-meta">${h(category(d.category).name)}<span>/</span>${h(d.topic)}<span class="result-time">${d.minutes}분 읽기</span></div><h3><a class="result-title" href="#/doc/${d.id}">${highlight(d.title, state.q)}</a></h3><p class="result-desc">${highlight(d.description, state.q)}</p></div><button class="overview-button" data-action="select-doc" data-id="${d.id}" aria-label="${h(d.title)} 개요 보기" aria-haspopup="dialog">개요 ${icon('upRight')}</button></article>`;
  }
  function updateSearch() {
    const root = $('#search-results'); if (!root) return;
    state.searchState = state.searchFallback || searchStatus === 'ready' ? 'normal' : searchStatus === 'error' ? 'error' : 'loading';
    root.setAttribute('aria-busy', String(state.searchState === 'loading'));
    const docs = filteredDocs(state.q, state.intent);
    $('#results-count').textContent = state.searchState === 'normal' ? `${docs.length}개 문서` : state.searchState === 'loading' ? '본문 색인 불러오는 중' : '본문 검색 연결 오류';
    if (state.searchState === 'loading') root.innerHTML = `<div class="result-list" role="status">${Array.from({length:3},()=>'<div class="skeleton-row"><i class="skeleton"></i><i class="skeleton"></i><i class="skeleton"></i></div>').join('')}</div><p class="quiet-note">전체 문서의 본문 색인을 불러오고 있습니다. 검색어와 필터는 유지됩니다.</p>`;
    else if (state.searchState === 'error') root.innerHTML = empty('본문 검색을 불러오지 못했어요.', '검색어와 필터를 유지한 채 다시 시도할 수 있습니다.', 'alert', btn(icon('refresh')+'다시 시도','search-retry','','primary') + btn('제목·요약에서 검색','search-metadata','','soft'), true);
    else {
      const note = state.searchFallback && searchStatus !== 'ready' ? `<div class="notice">${icon('info')}현재 제목과 요약에서만 검색합니다. ${btn('본문 검색 다시 시도','search-retry','','small')}</div>` : '';
      root.innerHTML = note + (docs.length ? `<div class="result-list">${docs.map(resultRow).join('')}</div>` : empty('일치하는 문서가 없어요.', '조금 더 짧은 검색어나 다른 주제로 찾아보세요.', 'search', `${btn('검색 조건 지우기','search-reset','','soft')}<a class="text-button" href="#/library">주제로 둘러보기 ${icon('arrow')}</a>`));
    }
    $$('.search-intents .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === state.intent)));
  }
  function contextPreview(d) {
    if (!d) return '';
    return `<div class="context-preview"><div class="context-head"><span>${icon('file')} DOCUMENT OVERVIEW</span>${iconBtn('bookmark', bookmarks.has(d.id) ? '저장 해제' : '문서 저장', 'bookmark', `data-id="${d.id}" aria-pressed="${bookmarks.has(d.id)}"`)}</div><div class="context-body">${tag(d.topic, 'blue')}<p>${h(d.description)}</p><div class="context-meta"><span>${d.minutes}분 읽기</span><span>실제 문서</span></div><ol class="context-outline">${d.sections.map((s, i) => `<li><span class="no">0${i + 1}</span>${h(s)}</li>`).join('')}</ol><div class="context-actions"><a class="btn primary" href="#/doc/${d.id}">문서 읽기 ${icon('arrow')}</a>${btn(icon('columns') + '나란히 비교', 'split-doc', `data-id="${d.id}"`)}</div></div></div><p class="context-tip">${icon('info')}닫으면 검색 조건과 읽던 목록 위치가 그대로 남습니다.</p>`;
  }
  function libraryPage() {
    if (state.libraryDirectory) return `<div class="page library-directory">${header('THE LIBRARY', '무엇을 살펴볼까요?', '주제를 선택하면 그 분야의 문서만 보여 드립니다.')}<div class="directory-grid">${D.categories.map((c, i) => `<a class="directory-card" href="#/library?category=${c.id}"><div class="directory-heading"><span class="doc-glyph">${icon(c.icon)}</span><span class="mono">0${i + 1}</span></div><h2>${h(c.name)}</h2><p>${h(c.desc)}</p><div class="directory-topics">${[...new Set(D.docs.filter(d => d.category === c.id).map(d => d.topic))].slice(0, 3).map(x => `<span>${h(x)}</span>`).join('')}</div><div class="directory-bottom"><span>${D.docs.filter(d => d.category === c.id).length}개 문서</span>${icon('arrow')}</div></a>`).join('')}</div><div class="index-end"><span>특정 제목이나 키워드를 알고 있나요?</span><a href="#/search">검색으로 찾기 ${icon('arrow')}</a><a href="#/library?all=1">모든 문서 보기</a></div></div>`;
    const c = category(state.libraryCategory);
    return `<div class="page list-page"><a class="back-link" href="#/library">${icon('left')}주제 선택</a>${header('DOCUMENT COLLECTION', state.libraryCategory === 'all' ? '모든 문서' : h(c.name), state.libraryCategory === 'all' ? '게시된 모든 문서를 한곳에서 찾아봅니다.' : h(c.desc))}<div class="toolbar"><div class="input-shell">${icon('search')}<label class="sr-only" for="library-search">이 목록에서 문서 검색</label><input id="library-search" type="search" placeholder="이 목록에서 찾기" value="${h(state.libraryQ)}"></div><details class="filter-disclosure"><summary>${icon('filter')}필터 및 보기</summary><div class="filter-popover"><label for="library-category">기술 분야</label><select id="library-category"><option value="all">모든 분야</option>${D.categories.map(c => `<option value="${c.id}" ${state.libraryCategory === c.id ? 'selected' : ''}>${h(c.name)}</option>`).join('')}</select><span class="field-label">목록 표시</span><div class="segmented">${[['list', 'list', '목록'], ['grid', 'grid', '카드']].map(([id, ico, label]) => `<button data-action="library-view" data-id="${id}" aria-pressed="${state.libraryView === id}">${icon(ico)}${label}</button>`).join('')}</div></div></details></div><div class="section-heading"><span id="library-count" class="small muted"></span></div><div id="library-results"></div></div>`;
  }
  function libraryCard(d) { return `<article class="library-card"><div class="card-top"><span class="doc-glyph">${icon(category(d.category).icon)}</span>${iconBtn('bookmark', bookmarks.has(d.id) ? '저장 해제' : '문서 저장', 'bookmark', `data-id="${d.id}" aria-pressed="${bookmarks.has(d.id)}"`)}</div><span class="small blue">${h(d.topic)}</span><h3><a href="#/doc/${d.id}">${h(d.title)}</a></h3><p>${h(d.description)}</p><div class="card-bottom"><span>${h(category(d.category).name)} · ${d.minutes}분</span><a href="#/doc/${d.id}" aria-label="${h(d.title)} 읽기">${icon('arrow')}</a></div></article>`; }
  function updateLibrary() {
    if (!$('#library-results')) return;
    const docs = filteredDocs(state.libraryQ, 'all', state.libraryCategory);
    $('#library-count').textContent = `${docs.length}개 문서`;
    $('#library-results').innerHTML = !docs.length ? empty('일치하는 문서가 없어요.', '검색어를 지우거나 다른 분야에서 찾아보세요.', 'search', btn('필터 초기화', 'library-reset', '', 'soft')) : state.libraryView === 'grid' ? `<div class="library-grid">${docs.map(libraryCard).join('')}</div>` : `<div class="document-list">${docs.map(compactDocRow).join('')}</div>`;
    $$('[data-action="library-view"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === state.libraryView)));
  }
  function savedPage() {
    const recent = state.params.get('tab') === 'recent';
    const docs = recent ? recents.map(byId) : D.docs.filter(d => bookmarks.has(d.id));
    return `<div class="page list-page">${header('YOUR READING SPACE', '보관함', '다시 읽을 문서와 지나온 읽기 기록을 따로 모았습니다.')}<nav class="page-tabs" aria-label="보관함 종류"><a href="#/saved" ${!recent ? 'aria-current="page"' : ''}>저장한 문서 <span>${bookmarks.size}</span></a><a href="#/saved?tab=recent" ${recent ? 'aria-current="page"' : ''}>최근 읽은 문서 <span>${recents.length}</span></a></nav>${docs.length ? `<div class="document-list">${docs.map(compactDocRow).join('')}</div>` : empty(recent ? '아직 읽은 문서가 없어요.' : '다시 읽을 문서를 모아 두세요.', recent ? '문서를 열면 읽은 순서대로 여기에 표시됩니다.' : '읽다가 책갈피를 누르면 이곳에서 다시 만날 수 있습니다.', recent ? 'clock' : 'bookmark', '<a class="btn primary" href="#/library">문서 둘러보기 ' + icon('arrow') + '</a>')}<p class="quiet-note">이 브라우저에만 저장됩니다. 저장을 해제해도 원본 문서는 남습니다.</p></div>`;
  }
  function stacksPage() {
    return `<div class="page list-page"><div class="catalog-title-icon">${icon('layers')}</div>${header('DOCKER COLLECTION', '설정에서, 연결까지.', '필요한 스택을 고른 뒤 구성과 연결 문서를 확인하세요.')}<div class="toolbar"><div class="input-shell">${icon('search')}<label class="sr-only" for="stack-search">스택 검색</label><input id="stack-search" type="search" placeholder="스택, 이미지, 태그로 찾기" value="${h(state.stackQ)}"></div><details class="filter-disclosure"><summary>${icon('filter')}필터 및 정렬</summary><div class="filter-popover"><label for="stack-group">스택 유형</label><select id="stack-group"><option value="all">모든 유형</option>${[...new Set(D.stacks.map(s => s.group))].map(g => `<option ${g === state.stackGroup ? 'selected' : ''}>${g}</option>`).join('')}</select><label for="stack-sort">정렬</label><select id="stack-sort"><option value="name" ${state.stackSort === 'name' ? 'selected' : ''}>이름순 A–Z</option><option value="services" ${state.stackSort === 'services' ? 'selected' : ''}>서비스 수</option></select></div></details></div><div class="section-heading"><span class="small muted" id="stack-count"></span></div><div id="stack-results"></div><p class="quiet-note">공개 구성 ${D.stacks.length}개 · 실행 중인 서비스 상태를 조회하지 않습니다.</p></div>`;
  }
  function stackGlyph(s) { return `<span class="stack-logo" data-color="${s.color}">${icon(s.glyph)}</span>`; }
  function updateStacks() {
    if (!$('#stack-results')) return;
    const q = state.stackQ.trim().toLowerCase();
    const stacks = D.stacks.filter(s => (state.stackGroup === 'all' || s.group === state.stackGroup) && [s.title, s.repo, ...s.tags].join(' ').toLowerCase().includes(q)).sort(state.stackSort === 'services' ? (a, b) => b.services - a.services : (a, b) => a.title.localeCompare(b.title));
    $('#stack-count').textContent = `${stacks.length}개 스택`;
    $('#stack-results').innerHTML = stacks.length ? `<div class="stack-list">${stacks.map(s => `<a class="stack-row" href="#/stack/${s.id}" data-stack="${s.id}">${stackGlyph(s)}<div class="stack-copy"><span class="small muted">${h(s.group)}</span><h3>${h(s.title)}</h3><p>${h(s.desc)}</p></div><span class="stack-count">${readableServiceCount(s)}</span>${icon('arrow')}</a>`).join('')}</div>` : empty('스택을 찾지 못했어요.', '검색어를 지우거나 다른 유형을 선택해 보세요.', 'layers', btn('조건 초기화', 'stack-reset', '', 'soft'));
  }
  function syntaxLine(raw) {
if (/^\s*(#|--)/.test(raw)) return `<span class="syntax-comment">${h(raw)}</span>`;
    const regex = /("[^"\n]*"|'[^'\n]*'|\b\d+(?:\.\d+)*\b|\b(?:auto|iface|static|address|gateway|bridge|apiVersion|kind|metadata|name|namespace|spec|type|selector|ports|port|targetPort|services|image|global|scrape_interval|scrape_configs|job_name|static_configs|targets|SELECT|FROM|WHERE|ORDER|BY|LIMIT|EXPLAIN)\b)/g;
    let out = '', last = 0; for (const m of raw.matchAll(regex)) { out += h(raw.slice(last, m.index)); const cls = /^["']/.test(m[0]) ? 'syntax-str' : /^\d/.test(m[0]) ? 'syntax-num' : 'syntax-key'; out += `<span class="${cls}">${h(m[0])}</span>`; last = m.index + m[0].length; } return out + h(raw.slice(last));
  }
  function codeBlock(code, file, lang = 'text') {
    const id = 'code-' + (++codeSequence); codeStore.set(id, code);
    return `<div class="code-block" id="${id}"><div class="code-head"><span class="code-file">${icon('terminal')}${h(file)}</span><div class="code-actions"><button data-action="code-wrap" data-id="${id}" aria-pressed="false" title="코드 줄바꿈" aria-label="코드 줄바꿈">${icon('wrap')}</button><button data-action="code-collapse" data-id="${id}" aria-expanded="true" title="코드 접기" aria-label="코드 접기">${icon('rows')}</button><button data-action="code-copy" data-id="${id}" aria-label="코드 원문 복사">${icon('copy')}<span class="copy-label">복사</span></button></div></div><pre tabindex="0" aria-label="${h(file)} 코드"><code>${code.split('\n').map((l, i) => `<span class="code-line"><span class="line-no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>${syntaxLine(l) || ' '}</span>`).join('')}</code></pre><div class="code-foot"><span>${h(lang.toUpperCase())}</span><span>SOURCE / READ ONLY</span></div></div>`;
  }

  function readerBody(d) { return `<div class="hub-document-body" data-document-id="${d.id}" aria-busy="true"><div class="skeleton-row"><i class="skeleton"></i><i class="skeleton"></i><i class="skeleton"></i></div><p class="quiet-note">문서 본문을 불러오고 있습니다.</p></div>`; }
  function readerPage() {
    const d = byId(state.lastDoc), index = D.docs.indexOf(d);
    return `<div class="reading-meter progress-track" role="progressbar" aria-label="읽기 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="reading-progress" class="progress-fill"></div></div><div class="page reader-page"><div class="reader-toolbar"><a class="back-link" href="#/library?category=${d.category}">${icon('left')}${h(category(d.category).name)}</a><div class="actions">${btn(icon('list') + '목차', 'toc', 'aria-haspopup="dialog"', 'small')}${iconBtn('bookmark', bookmarks.has(d.id) ? '저장 해제' : '문서 저장', 'bookmark', `data-id="${d.id}" aria-pressed="${bookmarks.has(d.id)}"`)}${iconBtn('more', '읽기 도구 더보기', 'reader-tools', 'aria-haspopup="dialog"')}</div></div><article class="article"><header class="article-header"><div class="article-eyebrow">${tag(d.topic, 'blue')}${tag(intent(d.intent).label)}</div><h1>${h(d.title)}</h1><p class="lead">${h(d.description)}</p><div class="article-meta"><span>${icon('clock')}${d.minutes}분 읽기</span><span>게시된 문서</span><span class="mono">DOC ${String(index + 1).padStart(2, '0')}</span></div></header>${readerBody(d)}<div class="article-end"><p class="quiet-note">실제 문서 저장소에서 생성한 본문입니다.</p><div class="prev-next"><a href="#/doc/${D.docs[(index + D.docs.length - 1) % D.docs.length].id}"><small>← 이전 문서</small><strong>${h(D.docs[(index + D.docs.length - 1) % D.docs.length].title)}</strong></a><a href="#/doc/${D.docs[(index + 1) % D.docs.length].id}"><small>다음 문서 →</small><strong>${h(D.docs[(index + 1) % D.docs.length].title)}</strong></a></div></div></article></div>`;
  }
  function setupReader() {
    const d = byId(state.lastDoc), container = $('.article .hub-document-body');
    if (d && container) mountDocument(d, container);
  }
  function updateReading() { if (state.route !== 'doc') return; const article = $('.article'); if (!article) return; const start = article.getBoundingClientRect().top + window.scrollY; const total = Math.max(1, article.offsetHeight - window.innerHeight + 100); const pct = Math.round(clamp((window.scrollY - start + 100) / total * 100, 0, 100)); if ($('#reading-percent')) $('#reading-percent').textContent = pct + '%'; if ($('#reading-progress')) $('#reading-progress').style.width = pct + '%'; $('.progress-track')?.setAttribute('aria-valuenow', pct); }
  function paneMarkup(s, i) {
    const e = entry(s,i), d = byId(e.id);
    return `<section class="doc-pane ${s.active === i ? 'active' : ''}" data-pane="${i}" aria-label="문서 창 ${i+1}${d ? ' '+h(d.title) : ' 비어 있음'}"><header class="pane-header"><button class="pane-title" data-action="pane-active" data-index="${i}"><span class="pane-index">${String(i+1).padStart(2,'0')}</span><strong>${d ? h(d.title) : '비어 있는 문서 창'}</strong></button></header><div class="pane-tools"><button class="pane-search" data-action="pane-search" data-index="${i}">${icon('search')}문서 바꾸기</button>${iconBtn('left','이전 문서','pane-back',`data-index="${i}" ${s.panes[i].cursor===0?'disabled':''}`)}${iconBtn('arrow','다음 문서','pane-forward',`data-index="${i}" ${s.panes[i].cursor>=s.panes[i].history.length-1?'disabled':''}`)}${iconBtn('more','문서 창 도구','pane-tools',`data-index="${i}" aria-haspopup="dialog"`)}</div><div class="pane-scroll" data-pane="${i}" tabindex="0" aria-label="${d ? h(d.title) : '빈 문서 창'} 스크롤 영역">${d ? `<div class="eyebrow">${h(category(d.category).name)} / ${h(d.topic)}</div>${readerBody(d)}<a class="text-button" style="margin-top:18px" href="#/doc/${d.id}">전체 문서로 읽기 ${icon('upRight')}</a>` : `<div class="workspace-empty"><div class="empty-icon">${icon('columns')}</div><h3>비교할 문서를 여세요.</h3><p>이 창에 표시할 문서를 선택합니다.<br>다른 창의 문서와 기록은 그대로 유지됩니다.</p>${btn(icon('search')+'문서 선택','pane-search',`data-index="${i}"`,'primary')}${btn('최근 읽은 문서 불러오기','pane-current',`data-index="${i}" style="margin-top:9px"`)}</div>`}</div><footer class="pane-footer"><span class="path">${d ? h(d.source) : 'NO DOCUMENT LOADED'}</span><span>${s.active===i?'ACTIVE':'PANE '+(i+1)}</span></footer></section>`;
  }
  function workspacePage() {
    const s = session(), count = paneCount(s); if (s.active >= count) s.active = 0;
    return `<div class="workspace-page"><div class="workspace-heading"><div><a class="back-link" href="#/library">${icon('left')}문서 탐색</a><h1>문서 비교 <span>/ ${h(s.name)}</span></h1></div><div class="workspace-controls">${btn(icon('columns') + '배치', 'workspace-layout', 'aria-haspopup="dialog"')}${btn(icon('clock') + '세션', 'workspace-sessions', 'aria-haspopup="dialog"')}</div></div><div class="pane-switcher" aria-label="모바일 문서 창 선택">${Array.from({ length: count }, (_, i) => `<button data-action="pane-active" data-index="${i}" aria-pressed="${s.active === i}"><span class="mono">${i + 1}</span>${h(byId(entry(s, i).id)?.topic || '빈 창')}</button>`).join('')}</div><div class="workspace-grid" data-layout="${s.layout}" style="--split:${s.split}%;--split-y:${s.splitY}%">${Array.from({ length: count }, (_, i) => paneMarkup(s, i)).join('')}${['1x2', '2x2'].includes(s.layout) ? `<div class="splitter" tabindex="0" role="separator" aria-label="좌우 문서 창 크기 조절" aria-orientation="vertical" aria-valuemin="22" aria-valuemax="76" aria-valuenow="${Math.round(s.split)}" data-axis="x"></div>` : ''}${['2x1', '2x2'].includes(s.layout) ? `<div class="splitter horizontal" tabindex="0" role="separator" aria-label="상하 문서 창 크기 조절" aria-orientation="horizontal" aria-valuemin="25" aria-valuemax="72" aria-valuenow="${Math.round(s.splitY)}" data-axis="y"></div>` : ''}</div><div class="workspace-foot"><span>${icon('info')}각 문서의 읽기 위치는 따로 유지됩니다.</span><span>${storageOK ? '이 탭의 세션' : '현재 화면에서만 유지'} · ${count}개 창</span></div></div>`;
  }
  function setupWorkspace() {
    for (const scroll of $$('.pane-scroll')) {
      const index = +scroll.dataset.pane, d = byId(entry(session(),index).id);
      if (d) mountDocument(d, $('.hub-document-body',scroll), {paneIndex:index});
      scroll.addEventListener('scroll', () => {
        const e = entry(session(),index); if (e) e.scroll = scroll.scrollTop;
        clearTimeout(scrollTimer); scrollTimer = setTimeout(saveWorkspace,240);
      }, {passive:true});
    }
  }

  function activatePane(i) { const s = session(); s.active = clamp(i, 0, paneCount(s) - 1); $$('.doc-pane').forEach(el => el.classList.toggle('active', +el.dataset.pane === s.active)); $$('.pane-switcher button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.index === s.active))); $$('.pane-footer').forEach((el, j) => { el.lastElementChild.textContent = j === s.active ? 'ACTIVE' : 'PANE ' + (j + 1); }); saveWorkspace(); }
  function rememberDocument(id) {
    if(!byId(id))return;state.lastDoc=id;recents=[id,...recents.filter(current=>current!==id)].slice(0,10);save('recents',recents);
  }
  function loadPane(i, id, anchor = '') {
if (id !== null && !byId(id)) return; if(id)rememberDocument(id);capturePaneScroll(); const s = session(), p = s.panes[i]; if (!p) return;
    if (entry(s, i).id === id && entry(s, i).anchor === anchor) { activatePane(i); if (anchor) { const scroll = $(`.pane-scroll[data-pane="${i}"]`); revealAnchor(scroll,anchor,scroll); } return; }
    p.history = p.history.slice(0, p.cursor + 1); p.history.push({ id, anchor, positioned:false, scroll: 0 }); if (p.history.length > 30) p.history.shift(); p.cursor = p.history.length - 1; s.active = i; saveWorkspace(); setMain(workspacePage()); setupWorkspace();
  }
  function splitDoc(id) { const d = byId(id); if (!d) return;rememberDocument(id); capturePaneScroll(); const s = session(); s.layout = '1x2'; const current = entry(s, 0); if (current.id !== id) { const p = s.panes[0]; p.history = p.history.slice(0, p.cursor + 1); p.history.push({ id, anchor: '', scroll: 0 }); p.cursor = p.history.length - 1; } s.active = 0; saveWorkspace(); navigate('#/workspace'); }

  function publicConnections() {
    const config = window.PUBLIC_AI_CONFIG || {}, runtime = window.AI_CONFIG || {};
    const endpoint = value => { try { const url = new URL(value); url.username=''; url.password=''; url.search=''; url.hash=''; return url.href; } catch { return '미설정'; } };
    return [
      {id:'ai',name:'AI 문서 도우미',url:endpoint(runtime.apiBaseUrl),model:config.modelName || '서버 기본 모델',configured:Boolean(config.apiBaseUrl),enabled:typeof window.aiClient?.sendMessage==='function',token:!!config.apiToken},
      {id:'notebook',name:'Open Notebook',url:config.openNotebookEnabled ? endpoint(config.openNotebookUrl) : '미설정',model:'지식 검색',configured:config.openNotebookEnabled===true,enabled:config.openNotebookEnabled===true,token:!!config.openNotebookToken}
    ];
  }
  function keysPage() {
    return `<div class="page list-page api-page"><a class="back-link" href="#/settings/data">${icon('left')}로컬 데이터</a>${header('PUBLIC CONNECTION SETTINGS','API 연결','이 사이트에 공개된 연결 설정을 읽기 전용으로 확인합니다.')}<div class="notice">${icon('info')}이 화면은 키 발급·폐기와 서버 권한 변경을 지원하지 않습니다. 비공개 키는 브라우저에 입력하지 않습니다.</div><div class="toolbar"><div class="input-shell">${icon('search')}<label class="sr-only" for="key-search">공개 연결 이름 검색</label><input id="key-search" type="search" placeholder="연결 이름으로 찾기" value="${h(state.keyQ)}"></div></div><div class="section-heading"><span class="small muted" id="key-count"></span></div><div id="key-table"></div><p class="quiet-note">아래 상태는 설정 유무를 나타냅니다. 서비스 연결 상태를 자동 조회하지 않습니다.</p></div>`;
  }
  function updateKeys() {
    if (!$('#key-table')) return;
    const records = publicConnections().filter(record => record.name.toLowerCase().includes(state.keyQ.toLowerCase()));
    $('#key-count').textContent = records.length+'개 연결 설정';
    $('#key-table').innerHTML = records.length ? `<div class="key-list">${records.map(record=>`<article class="key-row"><span class="doc-glyph">${icon('key')}</span><div class="key-name"><button data-action="key-detail" data-id="${record.id}"><strong>${h(record.name)}</strong></button><span class="key-token">${h(record.url)}</span></div><span class="key-scope">읽기 전용 설정</span>${tag(record.enabled?'사용 가능':'사용 안 함',record.enabled?'green':'')}${iconBtn('chevron','연결 설정 상세','key-detail',`data-id="${record.id}"`)}</article>`).join('')}</div>` : empty('일치하는 연결이 없어요.','연결 이름을 다시 확인해 주세요.','key');
  }
  function publicConnectionDetail(id) {
    const record = publicConnections().find(item=>item.id===id); if (!record) return;
    openModal(h(record.name),`<dl class="details-list"><div><dt>공개 주소</dt><dd class="mono">${h(record.url)}</dd></div><div><dt>모델 / 용도</dt><dd>${h(record.model)}</dd></div><div><dt>공개 토큰 설정</dt><dd>${record.token?'설정됨 · 값은 표시하지 않음':'설정되지 않음'}</dd></div><div><dt>접근 경계</dt><dd>공개 설정만 사용합니다. 비공개 자격 증명은 서버에서 관리합니다.</dd></div></dl>`,btn('닫기','modal-close','','primary'));
  }

  function settingsPage() {
    const tab = ['reading', 'accessibility', 'data'].includes(state.section) ? state.section : 'appearance';
    let content = '';
    if (tab === 'appearance') content = `<h2>화면 테마</h2><p class="section-description">편안하게 읽을 수 있는 밝기를 선택하세요.</p><div class="theme-cards">${[['light', '라이트', '밝고 또렷한 종이 같은 화면'], ['dark', '다크', '눈부심을 낮춘 차분한 화면']].map(([id, label, desc]) => `<button class="theme-card" data-action="set-theme" data-id="${id}" aria-pressed="${settings.theme === id}"><span class="theme-sample ${id}" aria-hidden="true"><i></i><i></i><i></i></span><span class="theme-card-title">${label}${settings.theme === id ? icon('check') : ''}</span><p>${desc}</p></button>`).join('')}</div>`;
    if (tab === 'reading') content = `<h2>읽기 환경</h2><p class="section-description">글자 크기와 목록 간격을 조절하세요.</p><div class="setting-row"><div><h3><label for="reader-size">본문 글자 크기</label></h3><p>문서 읽기 화면에 적용합니다.</p></div><div class="range-control"><input id="reader-size" type="range" min="14" max="20" step="1" value="${settings.readerSize}"><output for="reader-size" id="reader-size-value">${settings.readerSize}px</output></div></div><div class="reading-sample"><span class="section-label">READING PREVIEW</span><p>작은 기록이 쌓여 다음 문제를 푸는 지식이 됩니다.</p></div><div class="setting-row"><div><h3>목록 간격</h3><p>문서 목록과 표의 여백을 바꿉니다.</p></div><div class="segmented"><button data-action="density" data-id="comfortable" aria-pressed="${settings.density === 'comfortable'}">넉넉하게</button><button data-action="density" data-id="compact" aria-pressed="${settings.density === 'compact'}">촘촘하게</button></div></div>`;
    if (tab === 'accessibility') content = `<h2>접근성</h2><p class="section-description">움직임과 명암을 읽기 편한 상태로 맞추세요.</p><div class="setting-row"><div><h3>애니메이션 줄이기</h3><p>운영체제의 모션 감소 설정도 반영합니다.</p></div><button class="switch" role="switch" aria-label="애니메이션 줄이기" aria-checked="${settings.motion === 'reduce'}" data-action="motion"></button></div><div class="setting-row"><div><h3>텍스트 대비 높이기</h3><p>보조 설명과 경계선을 선명하게 합니다.</p></div><button class="switch" role="switch" aria-label="텍스트 대비 높이기" aria-checked="${settings.contrast === 'high'}" data-action="contrast"></button></div><div class="shortcut-note"><h3>키보드로 이동하기</h3><p><kbd>⌘ / Ctrl</kbd> + <kbd>K</kbd> 빠른 검색　 <kbd>Esc</kbd> 닫기</p><p>문서 비교의 경계선을 선택한 뒤 방향키로 크기를 조절할 수 있습니다.</p></div>`;
    if (tab === 'data') content = `<h2>로컬 데이터</h2><p class="section-description">책갈피·설정·창 배치는 이 브라우저에 저장합니다. 읽기 기록·열린 문서·검색과 창 기록은 이 탭의 세션에 저장합니다.</p><a class="setting-link" href="#/keys"><span>${icon('key')}공개 API 연결 설정</span>${icon('arrow')}</a><a class="setting-link" href="#/about"><span>${icon('info')}Documentation Hub 안내</span>${icon('arrow')}</a><section class="danger-zone"><h3>읽기 데이터 초기화</h3><p>책갈피·읽기 기록·작업 세션·창 배치를 지웁니다. 디자인 설정과 원본 문서는 유지합니다.</p>${btn('읽기 데이터 초기화','reset-data','','danger')}</section>`;
    return `<div class="page settings-page">${header('MAKE IT YOURS', '설정', '읽는 방식을, 나에게 맞게.')}<div class="settings-layout"><nav class="settings-nav" aria-label="설정 항목">${[['appearance', 'sun', '화면'], ['reading', 'book', '읽기'], ['accessibility', 'focus', '접근성'], ['data', 'database', '로컬 데이터']].map(([id, ico, label]) => `<a href="#/settings/${id}" ${tab === id ? 'aria-current="page"' : ''}>${icon(ico)}${label}</a>`).join('')}</nav><section class="settings-content">${content}${tab !== 'data' ? `<div class="settings-reset">${btn('디자인 기본값 복원', 'settings-reset', '', 'small')}</div>` : ''}</section></div></div>`;
  }
  function openModal(title, body, footer = '', cls = '') {
    if ($('#assistant-form')) { assistantSequence++; window.aiClient?.abort?.(); }
    const modal = $('#modal'); if (!modal.open) restoreTarget = document.activeElement;
    modal.className = 'modal ' + cls; modal.innerHTML = `<div class="modal-header"><h2 id="modal-title">${title}</h2>${iconBtn('close', '닫기', 'modal-close')}</div><div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ''}`;
    if (!modal.open) modal.showModal(); document.body.classList.add('dialog-open');
    requestAnimationFrame(() => { const target = $('[autofocus]', modal) || $('button', modal); target?.focus({ preventScroll: true }); });
  }
  function closeModal() { if ($('#modal').open) $('#modal').close(); }

  function openTour() {
    navigate('#/about');
  }
  function openAssistant(id) {
    const d = byId(id) || byId(state.lastDoc); if (!d) return;
    const available = typeof window.aiClient?.sendMessage === 'function';
    openModal('문서 도우미',`<p class="modal-description">현재 문서: <strong>${h(d.title)}</strong></p><div id="assistant-answer" class="assistant-demo" role="status"><strong>실제 문서 목차</strong><ol>${d.toc.map(item=>`<li>${h(item.title)}</li>`).join('')}</ol></div><form id="assistant-form" data-document="${d.id}"><div class="field"><label for="assistant-query">이 문서에 관한 질문</label><textarea id="assistant-query" name="query" maxlength="4000" required placeholder="문서에서 확인할 내용을 입력하세요." ${available?'':'disabled'}></textarea></div><p class="quiet-note">${available?'전송하면 질문과 현재 문서 일부를 설정된 AI 서비스에 보냅니다. 응답의 근거를 원문에서 확인하세요.':'현재 AI 연결을 사용할 수 없습니다. 위 목차와 원문을 사용할 수 있습니다.'}</p><button class="btn primary" type="submit" ${available?'':'disabled'}>${icon('spark')}질문 보내기</button></form>`,`<a class="btn" href="#/doc/${d.id}" data-action="tour-route">전체 문서 읽기 ${icon('arrow')}</a>`);
  }
  async function sendAssistant(form) {
    const d = byId(form.dataset.document), query = $('#assistant-query',form)?.value.trim();
    if (!d || !query || form.dataset.busy || !window.aiClient?.sendMessage) return;
    const sequence=++assistantSequence, answer=$('#assistant-answer'), submit=$('button[type="submit"]',form);
    const live=()=>sequence===assistantSequence && form.isConnected && $('#modal').open;
    form.dataset.busy='true'; submit.disabled=true; answer.setAttribute('role','status'); answer.textContent='문서 내용을 확인하고 있습니다.';
    try {
      const content=await contentFor(d); if (!live()) return;
      const text=new DOMParser().parseFromString(content.html,'text/html').body.textContent.slice(0,12000);
      answer.textContent='응답을 기다리고 있습니다.';
      const prompt=`${query}\n\n[현재 문서] ${d.title}\n출처: ${canonicalURL(d).href}\n${text}\n[문서 끝]\n제공한 문서에 근거하여 답하고, 없는 내용은 확인할 수 없다고 밝혀 주세요.`;
      await window.aiClient.sendMessage([{role:'user',content:prompt}], (_chunk,full)=>{if(live()) answer.textContent=full;}, full=>{if(live()) answer.textContent=full || '응답 내용이 없습니다. 다시 질문해 주세요.';}, message=>{if(live()) {answer.textContent='응답을 받지 못했습니다: '+message; answer.setAttribute('role','alert');}});
    } catch { if(live()) {answer.textContent='문서 또는 AI 응답을 불러오지 못했습니다. 질문을 유지한 채 다시 시도할 수 있습니다.';answer.setAttribute('role','alert');} }
    finally { if(live()) {delete form.dataset.busy;submit.disabled=false;$('#assistant-query',form)?.focus({preventScroll:true});} }
  }

  function openCommand(mode = null) {
    closeNav(); closeModal(); commandMode = mode; commandIndex = 0; const dialog = $('#command-dialog'); restoreTarget = document.activeElement;
    dialog.innerHTML = `<div class="command-input-row">${icon('search')}<label class="sr-only" id="command-title" for="command-input">${mode?.type === 'pane' ? '이 창에 열 문서 찾기' : mode?.type === 'history' ? '창 기록에서 문서 선택' : '빠른 문서 검색'}</label><input id="command-input" placeholder="${mode?.type === 'history' ? '이 창의 문서 기록' : '문서 제목, 명령어 또는 기술을 검색'}" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="command-list" autocomplete="off" spellcheck="false"><button data-action="command-close" aria-label="빠른 검색 닫기"><kbd>ESC</kbd></button></div><div id="command-list" class="command-results" role="listbox" aria-label="검색 결과"></div><div class="command-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> 이동</span><span><kbd>Enter</kbd> ${mode ? '이 창에서 열기' : '문서 열기'}</span><span>게시된 문서 색인</span></div>`;
    if (!dialog.open) dialog.showModal(); document.body.classList.add('dialog-open'); updateCommand(''); $('#command-input').focus(); if (mode?.type !== 'history') ensureSearchIndex();
  }
  function updateCommand(query) {
    const current = $('#command-input'); if (!current) return;
    if (commandMode?.type !== 'history' && searchStatus !== 'ready') {
      commandItems = []; commandIndex = 0; current.removeAttribute('aria-activedescendant');
      $('#command-list').innerHTML = searchStatus === 'error'
        ? empty('본문 검색을 불러오지 못했어요.', '입력한 검색어는 유지됩니다.', 'alert', btn('다시 시도','search-retry','','primary'), true)
        : '<div class="skeleton-row" role="status"><i class="skeleton"></i><i class="skeleton"></i><p class="quiet-note">본문 검색 색인을 불러오고 있습니다.</p></div>';
      return;
    }
    if (commandMode?.type === 'history') {
      const p = session().panes[commandMode.index]; commandItems = p.history.map((e, i) => ({ type: 'history', historyIndex: i, title: byId(e.id)?.title || '문서가 닫힌 상태', description: `기록 ${i + 1} / ${p.history.length}${i === p.cursor ? ' · 현재 위치' : ''}`, icon: e.id ? 'file' : 'panel' })).filter(x => x.title.toLowerCase().includes(query.toLowerCase()));
    } else {
      const matches = filteredDocs(query); const sorted = !query && recents.length ? [...recents.map(byId), ...matches.filter(d => !recents.includes(d.id))] : matches;
      commandItems = sorted.slice(0, 12).map(d => ({ type: 'doc', id: d.id, title: d.title, description: `${category(d.category).name} / ${d.topic}`, icon: category(d.category).icon }));
      if (!query && !commandMode) commandItems.push({ type: 'nav', id: 'workspace', title: '분할 워크스페이스 열기', description: '서로 다른 문서를 나란히 읽기', icon: 'columns' }, { type: 'nav', id: 'settings', title: '디자인 설정', description: '테마와 읽기 환경 조절', icon: 'settings' });
    }
    commandIndex = Math.min(commandIndex, Math.max(commandItems.length - 1, 0));
    $('#command-list').innerHTML = commandItems.length ? commandItems.map((x, i) => `<div id="command-opt-${i}" class="command-item" role="option" aria-selected="${i === commandIndex}" data-action="command-choose" data-index="${i}">${icon(x.icon)}<span><strong>${highlight(x.title, query)}</strong><small>${h(x.description)}</small></span>${i === commandIndex ? '<kbd>↵</kbd>' : ''}</div>`).join('') : empty('일치하는 문서가 없습니다.', '검색어를 바꾸어 다시 찾아보세요.', 'search');
    if (commandItems.length) current.setAttribute('aria-activedescendant', 'command-opt-' + commandIndex); else current.removeAttribute('aria-activedescendant');
  }
  function moveCommand(delta) { if (!commandItems.length) return; commandIndex = (commandIndex + delta + commandItems.length) % commandItems.length; $$('.command-item').forEach((el, i) => { el.setAttribute('aria-selected', String(i === commandIndex)); const k = $('kbd', el); if (k) k.remove(); if (i === commandIndex) el.insertAdjacentHTML('beforeend', '<kbd>↵</kbd>'); }); $('#command-input').setAttribute('aria-activedescendant', 'command-opt-' + commandIndex); $('#command-opt-' + commandIndex)?.scrollIntoView({ block: 'nearest' }); }
  function chooseCommand(index) {
const item = commandItems[index]; if (!item) return; $('#command-dialog').close();
    if (item.type === 'history') { capturePaneScroll(); const p = session().panes[commandMode.index]; p.cursor = item.historyIndex; session().active = commandMode.index; saveWorkspace(); setMain(workspacePage()); setupWorkspace(); }
    else if (item.type === 'nav') navigate('#/' + item.id);
    else if (commandMode?.type === 'pane') { loadPane(commandMode.index, item.id); focusPane(commandMode.index); }
    else navigate('#/doc/' + item.id);
  }
  async function copyText(text, button, success = '복사했습니다.') {
    const before = document.activeElement; let copied = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); copied = true; }
      else { const area = document.createElement('textarea'); area.value = text; area.setAttribute('readonly', ''); area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'; (document.querySelector('dialog[open]') || document.body).appendChild(area); area.select(); try { copied = document.execCommand('copy'); } finally { area.remove(); if (before?.isConnected) before.focus({ preventScroll: true }); } if (!copied) throw new Error('copy rejected'); }
      if (copied) { if (!button || button.isConnected) toast(success); if (button?.isConnected && button.dataset.action === 'code-copy') { const original = button.innerHTML; button.innerHTML = icon('check') + '<span class="copy-label">복사됨</span>'; setTimeout(() => { if (button.isConnected) button.innerHTML = original; }, 1800); } }
    } catch { toast('복사 권한을 사용할 수 없습니다. 원문을 선택해 직접 복사해 주세요.', 'alert'); }
  }
  function toggleBookmark(id) {
    if (!byId(id)) return;
    const had = bookmarks.has(id); had ? bookmarks.delete(id) : bookmarks.add(id);
    save('bookmarks', [...bookmarks]); renderSidebar();
    $$('[data-action="bookmark"]').filter(b => b.dataset.id === id).forEach(b => { b.setAttribute('aria-pressed', String(!had)); b.setAttribute('aria-label', had ? '문서 저장' : '저장 해제'); b.title = had ? '문서 저장' : '저장 해제'; });
    if (state.route === 'saved') {
      const previous = $('[data-action="bookmark"][data-id="' + id + '"]');
      const others = $$('[data-action="bookmark"]'), next = others[others.indexOf(previous) + 1] || others[others.indexOf(previous) - 1];
      const nextId = next?.dataset.id;
      $('#main').innerHTML = savedPage();
      ($$('[data-action="bookmark"]').find(b => b.dataset.id === id || b.dataset.id === nextId) || $('#main')).focus({ preventScroll: true });
    }
    toast(had ? '보관함에서 뺐습니다. 원본 문서는 그대로 남습니다.' : '보관함에 저장했습니다.');
  }

  function sessionForm(rename = false) {
if (!rename && sessions.length >= 8) { toast('한 탭에서 최대 8개 세션을 만들 수 있습니다.', 'info'); return; }
    openModal(rename ? '워크스페이스 이름 변경' : '새 워크스페이스', `<form id="session-form" data-mode="${rename ? 'rename' : 'new'}"><div class="field"><label for="new-session-name">세션 이름</label><input id="new-session-name" name="name" value="${h(rename ? session().name : '워크스페이스 ' + (sessions.length + 1))}" maxlength="40" required autofocus><small>문서 원본이 아니라 열린 창과 읽기 위치를 저장합니다.</small></div><p class="field-error" id="session-error" role="alert"></p></form>`, btn('취소', 'modal-close') + `<button class="btn primary" type="submit" form="session-form">${rename ? '이름 저장' : '새 세션 만들기'}</button>`);
  }
  function sourceInfo() {
    const d=byId(state.lastDoc); if(!d)return;
    openModal('문서 경로',`<div class="eyebrow">SOURCE REFERENCE</div><h3>${h(d.title)}</h3><div class="code-value">content/docs/${h(d.source)}</div><p class="modal-description">게시된 원본 Markdown에서 생성한 문서입니다.</p><a class="text-button" href="${h(canonicalURL(d).href)}" target="_blank" rel="noopener noreferrer">원본 주소로 열기 ${icon('external')}</a>`,btn('경로 복사','copy-source')+btn('닫기','modal-close','','primary'));
  }

  // URL state and in-tab reading positions belong to the view, not the source data.
  const savedViews = read('views', []);
  const viewMemory = new Map(Array.isArray(savedViews) ? savedViews.filter(item => Array.isArray(item) && typeof item[0] === 'string' && item[0].length < 2000 && item[1] && typeof item[1] === 'object').slice(-50).map(([key,value]) => [key,{scroll:clamp(value.scroll,0,1e7),href:typeof value.href==='string'?value.href.slice(0,2000):null}]) : []);
  let currentViewKey = '';
  function captureView() {
    if (!currentViewKey) return;
    const focused = document.activeElement;
    viewMemory.set(currentViewKey, { scroll: window.scrollY, href: focused?.closest('#main') ? focused.getAttribute('href') : null });
    if(viewMemory.size>50)viewMemory.delete(viewMemory.keys().next().value);
    save('views',[...viewMemory]);
  }
  function restoreView(key) {
    const saved = viewMemory.get(key);
    requestAnimationFrame(() => {
      if (currentViewKey !== key) return;
      window.scrollTo({ top: saved?.scroll || 0, behavior: 'instant' });
      const target = saved?.href ? $$('#main a[href]').find(a => a.getAttribute('href') === saved.href) : null;
      (target || $('#main')).focus({ preventScroll: true });
      updateReading();
    });
  }
  function syncViewURL() {
    const q = new URLSearchParams();
    if (state.route === 'search') {
      if (state.q) q.set('q', state.q); if (state.intent !== 'all') q.set('intent', state.intent);

    } else if (state.route === 'library') {
      if (state.libraryCategory !== 'all') q.set('category', state.libraryCategory); else q.set('all', '1');
      if (state.libraryQ) q.set('q', state.libraryQ); if (state.libraryView === 'grid') q.set('view', 'grid');
    } else if (state.route === 'stacks') {
      if (state.stackQ) q.set('q', state.stackQ); if (state.stackGroup !== 'all') q.set('group', state.stackGroup); if (state.stackSort !== 'name') q.set('sort', state.stackSort);
    } else if (state.route === 'keys') {
      if (state.keyQ) q.set('q', state.keyQ); if (state.keyStatus !== 'all') q.set('status', state.keyStatus);
    } else return;
    const next = '#/' + state.route + (q.size ? '?' + q.toString() : '');
    try { const url=new URL(baseURL);url.hash=next.slice(1);history.replaceState(null,'',url);lastRoutedURL=location.href; } catch {}
    state.params=q;currentViewKey=location.pathname+location.search+location.hash;
  }
  function compactDocRow(d) {
    return `<article class="compact-doc"><span class="doc-glyph">${icon(category(d.category).icon)}</span><div><span class="doc-topic">${h(d.topic)} <span>· ${d.minutes}분 읽기</span></span><h3><a href="#/doc/${d.id}">${h(d.title)}</a></h3><p>${h(d.description)}</p></div>${iconBtn('bookmark', bookmarks.has(d.id) ? '저장 해제' : '문서 저장', 'bookmark', `data-id="${d.id}" aria-pressed="${bookmarks.has(d.id)}"`)}</article>`;
  }
  function searchPage() {
    return `<div class="page search-page"><a class="back-link" href="#/home">${icon('left')}처음으로</a><div class="page-title-row"><div><div class="eyebrow">SEARCH THE LIBRARY</div><h1>검색 결과</h1></div></div><form id="results-search-form" class="search-box compact">${icon('search')}<label class="sr-only" for="results-search">문서 검색어</label><input id="results-search" type="search" placeholder="문서, 기술, 해결할 문제" value="${h(state.q)}" autocomplete="off"><button class="search-submit" type="submit" aria-label="검색">${icon('arrow')}</button></form><div class="results-toolbar"><div class="search-intents" aria-label="문서 목적">${D.intents.map(i => `<button class="chip" data-action="intent" data-id="${i.id}" aria-pressed="${state.intent === i.id}">${i.label}</button>`).join('')}</div><span id="results-count" class="small muted" role="status"></span></div><div id="search-results" aria-live="polite" aria-busy="false"></div></div>`;
  }
  function stackPage() {
    const s=D.stacks.find(x=>x.id===state.selectedStack), back=lastStackURL||'#/stacks';
    return `<div class="page stack-page"><a class="back-link" href="${h(back)}">${icon('left')}스택 목록</a><header class="stack-page-heading">${stackGlyph(s)}<div class="eyebrow">${h(s.group)} / ${h(readableServiceCount(s))}</div><h1>${h(s.title)}</h1><p>${h(s.desc)}</p></header><section class="stack-specs" aria-label="스택 구성"><h2>구성 한눈에 보기</h2><dl class="details-list"><div><dt>이미지</dt><dd class="mono">${h(s.repo || '구성 파일에서 확인')}</dd></div><div><dt>구성 파일</dt><dd class="mono">${h(s.file || '원본 파일 목록')}</dd></div><div><dt>문서 경로</dt><dd class="mono">${h(s.path)}</dd></div></dl><div class="filter-chips">${s.tags.map(t=>tag(t)).join('')}</div></section><section class="stack-code"><h2>원본 구성 파일</h2><p>저장소에 게시된 파일을 확인합니다. 이 화면은 명령을 실행하지 않습니다.</p><div class="filter-chips">${s.files.map(file=>btn(h(file.name),'stack-file',`data-name="${h(file.name)}"`,'small')).join('')}</div><div id="stack-file-body"></div></section>${byId(s.doc)?`<a class="stack-doc-link" href="#/doc/${s.doc}"><span>${icon('book')}연결 문서 읽기<small>${h(byId(s.doc).title)}</small></span>${icon('arrow')}</a>`:''}<a class="text-button" href="${h(publishedURL(s.url).href)}" target="_blank" rel="noopener noreferrer">공개 파일 목록 ${icon('external')}</a></div>`;
  }
  function setupStack() {
    const stack=D.stacks.find(x=>x.id===state.selectedStack), root=$('#stack-file-body');
    const file=stack?.files.find(file=>file.name===stack.file) || stack?.files[0];
    if(file&&root)mountStackFile(stack,file,root);else if(root)root.innerHTML='<p class="quiet-note">표시할 공개 구성 파일이 없습니다.</p>';
  }

  let lastStackURL = '';
  function openToolsMenu() {
    openModal('작업 도구 및 설정', `<div class="tool-menu">${[['workspace', 'columns', '문서 비교', '서로 다른 문서를 나란히 읽기'], ['keys', 'key', 'API 연결', '실제 공개 설정 읽기 전용 확인'], ['settings', 'settings', '설정', '테마, 읽기, 접근성'], ['about', 'info', 'Documentation Hub 안내', '문서와 저장 범위 안내']].map(([route, ico, title, desc]) => `<a href="#/${route}" data-action="tour-route">${icon(ico)}<span><strong>${title}</strong><small>${desc}</small></span>${icon('chevron')}</a>`).join('')}</div>`, '', 'menu-modal');
  }
  function readerTools() {
    const d = byId(state.lastDoc);
    openModal('읽기 도구', `<div class="tool-menu">${btn(icon('columns') + '나란히 비교하기', 'split-doc', `data-id="${d.id}"`)}${btn(icon('focus') + (state.focus ? '기본 읽기로 돌아가기' : '집중 읽기'), 'focus', `aria-pressed="${state.focus}"`)}${btn(icon('spark') + '문서 도우미', 'assistant', `data-id="${d.id}"`)}${btn(icon('copy') + '문서 링크 복사', 'copy-link')}${btn(icon('file') + '문서 경로 확인', 'source-info')}<a href="#/settings/reading" data-action="tour-route">${icon('settings')}읽기 환경 조절</a></div>`, '', 'menu-modal');
  }
  function workspaceLayout() {
    const s = session();
    openModal('문서 창 배치', `<p class="modal-description">창 수를 줄여도 숨겨진 창의 문서와 읽기 기록은 유지됩니다.</p><div class="layout-options">${[['1x1', 'panel', '한 문서'], ['1x2', 'columns', '좌우로 비교'], ['2x1', 'rows', '위아래로 비교'], ['2x2', 'grid', '네 문서 비교']].map(([id, ico, label]) => `<button data-action="layout" data-id="${id}" aria-pressed="${s.layout === id}">${icon(ico)}<strong>${label}</strong><small>${id.replace('x', ' × ')}</small></button>`).join('')}</div>`);
  }
  function workspaceSessions() {
    const s = session();
    openModal('작업 세션', `<p class="modal-description">현재 문서를 유지한 채 다른 작업으로 이동합니다.</p><div class="session-list">${sessions.map(x => `<button data-action="session-switch" data-id="${h(x.id)}" aria-pressed="${x.id === s.id}">${icon('columns')}<span><strong>${h(x.name)}</strong><small>${paneCount(x)}개 문서 창</small></span>${x.id === s.id ? icon('check') : icon('arrow')}</button>`).join('')}</div>`, btn(icon('plus') + '새 세션', 'session-new') + btn('이름 변경', 'session-rename') + btn('현재 세션 제거', 'session-remove', `${sessions.length === 1 ? 'disabled' : ''}`, 'danger'));
  }
  function paneTools(index) {
    const d = byId(entry(session(), index).id);
    openModal(`문서 창 ${index + 1}`, `<div class="tool-menu">${btn(icon('clock') + '이 창의 문서 기록', 'pane-history', `data-index="${index}"`)}${btn(icon('file') + '최근 읽은 문서 불러오기', 'pane-current', `data-index="${index}"`)}${btn(icon('copy') + '이 창의 첫 코드 복사', 'pane-copy', `data-index="${index}" ${!d ? 'disabled' : ''}`)}${btn(icon('close') + '이 창에서 문서 닫기', 'pane-clear', `data-index="${index}" ${!d ? 'disabled' : ''}`)}</div>`, '', 'menu-modal');
  }
  function aboutPage() {
    return `<div class="page about-page">${header('ABOUT DOCUMENTATION HUB','화면은 나누고,<br>읽던 맥락은 이어서.','실제 문서를 찾아 읽고 비교하는 개인 지식 라이브러리')}<section class="about-section"><h2>하나의 화면에는 하나의 작업.</h2><p>처음에는 문서를 찾고, 결과에서는 고르고, 본문에서는 읽습니다. 비교와 관리는 필요한 순간에 별도의 작업 화면으로 들어갑니다.</p><div class="journey-strip"><a href="#/home">01 시작</a>${icon('arrow')}<a href="#/search?q=Docker">02 검색 결과</a>${icon('arrow')}<a href="#/doc/${D.docs[0].id}">03 본문 읽기</a>${icon('arrow')}<a href="#/workspace">04 비교 작업</a></div></section><section class="about-section"><h2>게시된 원본과 연결됩니다.</h2><p>문서 ${D.docs.length}개와 Compose 스택 ${D.stacks.length}개를 실제 저장소에서 읽어 생성했습니다. 본문 검색은 검색 화면에 들어갈 때 원본 전체 색인을 불러옵니다. 문서를 열면 그 문서의 렌더링 결과를 불러옵니다.</p></section><section class="about-section"><h2>읽기 기록의 저장 범위</h2><p>책갈피·설정·창 배치는 이 브라우저에 저장합니다. 읽기 기록·검색·열린 문서·창 기록은 이 탭의 sessionStorage에 저장하므로 새로고침 후 복원됩니다. 브라우저의 탭 복제나 opener를 통한 새 탭에서는 세션의 초기 복사본이 생길 수 있습니다.</p><a class="text-button" href="#/settings/data">읽기 데이터 관리 ${icon('arrow')}</a></section><section class="about-section"><h2>문서 도우미와 공개 연결</h2><p>문서 목차는 원문에서 표시합니다. AI 질문은 사용자가 전송할 때만 설정된 서비스에 문서 일부와 함께 전달합니다. 키 발급과 서버 권한 변경은 이 정적 사이트에서 제공하지 않습니다.</p><a class="text-button" href="#/keys">공개 API 설정 확인 ${icon('arrow')}</a></section></div>`;
  }

  function focusPane(index) { requestAnimationFrame(() => { $(`.doc-pane[data-pane="${index}"] .pane-title`)?.focus({ preventScroll: true }); }); }
  // Canonical URLs and asynchronous resources are shared by reader and comparison panes.
  const documentKey = value => {
    try { return decodeURI(new URL(value, baseURL).pathname).replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/'; }
    catch { return ''; }
  };
  const documentsByURL = new Map(D.docs.map(d => [documentKey(publishedURL(d.url)), d]));
  const initialPath = location.pathname;
  const contentCache = new Map();
  const scriptLoads = new Map();
  let mountSequence = 0, renderSequence = 0, lastRoutedURL = '', assistantSequence = 0;
  let searchStatus = 'idle', searchError = '', searchPromise, searchSequence = 0;
  let searchTextById = new Map();
  let stackSequence = 0;
  const canonicalURL = (d, anchor = '') => { const url = publishedURL(d.url); url.hash = anchor; return url; };
  const liveMain = () => document.getElementById('main');
  function setMain(html) {
    if (window.MathJax?.typesetClear) window.MathJax.typesetClear([liveMain()]);
    liveMain().innerHTML = html;
  }
  function routeHash() {
    if (location.hash.startsWith('#/')) return location.hash;
    if (documentKey(location.href) === documentKey(baseURL)) return '#/home';
    const d = documentsByURL.get(documentKey(location.href)) || (location.pathname === initialPath && BOOT.source !== 'index.md' ? D.docs.find(item => item.source === BOOT.source) : null);
    if (!d) return '#/not-found';
    const query = new URLSearchParams();
    if (location.hash) { try { query.set('anchor', decodeURIComponent(location.hash.slice(1))); } catch { query.set('anchor', location.hash.slice(1)); } }
    return '#/doc/' + d.id + (query.size ? '?' + query : '');
  }
  function goToDocument(id, anchor = '') {
    const d = byId(id); if (!d) return;
    const url = canonicalURL(d, anchor);
    if (location.href !== url.href) history.pushState(null, '', url);
    route();
  }
  function findAnchor(root, id) {
    return $$('[id], [data-original-id]', root).find(el => el.id === id || el.dataset.originalId === id);
  }
  function revealAnchor(root, id, scrollRoot = null) {
    const target = findAnchor(root, id); if (!target) return false;
    for (let p = target.parentElement; p && p !== root.parentElement; p = p.parentElement) {
      if (p.tagName === 'DETAILS') p.open = true;
      if (p.classList.contains('tabbed-block')) {
        const set = p.closest('.tabbed-set');
        const blocks = set ? $$('.tabbed-content > .tabbed-block', set) : [];
        const index = blocks.indexOf(p), input = set && $$(':scope > input', set)[index];
        if (input) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    }
    if (scrollRoot) scrollRoot.scrollTop += target.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top - 20;
    else target.scrollIntoView({ block: 'start', behavior: 'instant' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    return true;
  }
  async function contentFor(d, retry = false) {
    if (retry) contentCache.delete(d.id);
    if (contentCache.has(d.id)) return contentCache.get(d.id);
    const pending = fetchJSON(publishedURL(d.contentUrl)).then(content => {
      if (content.id !== d.id || typeof content.html !== 'string') throw new Error('문서 본문 형식이 올바르지 않습니다.');
      return content;
    }).catch(error => { if (contentCache.get(d.id) === pending) contentCache.delete(d.id); throw error; });
    contentCache.set(d.id, pending);
    if (contentCache.size > 40) contentCache.delete(contentCache.keys().next().value);
    return pending;
  }
  function prepareHTML(d, html, prefix = '') {
    const template = document.createElement('template'); template.innerHTML = html;
    template.content.querySelectorAll('script[type^="math/tex"]').forEach(script => {
      const math = document.createElement('span'), display = script.type.includes('mode=display');
      math.className = 'arithmatex'; math.textContent = (display ? '\\[' : '\\(') + script.textContent + (display ? '\\]' : '\\)');
      script.replaceWith(math);
    });
    template.content.querySelectorAll('script,base,meta[http-equiv],object,embed').forEach(el => el.remove());
    const ids = new Map();
    for (const element of template.content.querySelectorAll('*')) {
      for (const attribute of [...element.attributes]) {
        const name = attribute.name.toLowerCase(), value = attribute.value;
        if (name.startsWith('on') || name === 'srcdoc') { element.removeAttribute(attribute.name); continue; }
        if (['href', 'src', 'poster', 'action', 'formaction', 'xlink:href'].includes(name)) {
          if (/^(?:javascript|vbscript):/i.test(value.replace(/[\u0000-\u0020]/g, '')) || /^data:text\/html/i.test(value)) { element.removeAttribute(attribute.name); continue; }
          if (value && !value.startsWith('#')) {
            try { element.setAttribute(attribute.name, (value.startsWith('/') ? publishedURL(value) : new URL(value, canonicalURL(d))).href); } catch { element.removeAttribute(attribute.name); }
          }
        }
        if (name === 'srcset' && !value.startsWith('data:')) {
          element.setAttribute('srcset', value.split(',').map(part => { const [url, ...rest] = part.trim().split(/\s+/); try { return [new URL(url, canonicalURL(d)).href, ...rest].join(' '); } catch { return ''; } }).join(', '));
        }
      }
      if (element.id) {
        element.dataset.originalId = element.id;
        if (prefix) { ids.set(element.id, prefix + element.id); element.id = prefix + element.id; }
      }
      if (prefix && element.matches('input[type="radio"][name]')) element.name = prefix + element.name;
      if (element.tagName === 'A') {
        if (element.target === '_blank') element.rel = [...new Set((element.rel + ' noopener noreferrer').trim().split(/\s+/))].join(' ');
      }
    }
    if (prefix) for (const element of template.content.querySelectorAll('*')) {
      for (const name of ['for', 'aria-controls', 'aria-labelledby', 'aria-describedby', 'headers']) {
        if (element.hasAttribute(name)) element.setAttribute(name, element.getAttribute(name).split(/\s+/).map(id => ids.get(id) || id).join(' '));
      }
      if (element.hasAttribute('href') && element.getAttribute('href').startsWith('#')) {
        let id = element.getAttribute('href').slice(1); try { id = decodeURIComponent(id); } catch {}
        if (ids.has(id)) element.setAttribute('href', '#' + encodeURIComponent(ids.get(id)));
      }
    }
    return template.content;
  }
  function enhanceCode(root) {
    for (const pre of $$('pre', root)) {
      if (pre.matches('.mermaid-source') || pre.closest('.code-block, .mermaid, .linenodiv') || pre.querySelector('.language-mermaid, .mermaid')) continue;
      const code = $('code', pre), text = (code || pre).textContent;
      const language = [...(code?.classList || []), ...(pre.parentElement?.classList || [])].map(c => c.match(/^(?:language-|highlight-)(.+)$/)?.[1]).find(Boolean) || 'text';
      const template = document.createElement('template'); template.innerHTML = codeBlock(text, language, language);
      const wrapper = template.content.firstElementChild;
      pre.replaceWith(wrapper); $('pre', wrapper).replaceWith(pre);
      pre.tabIndex = 0; pre.setAttribute('aria-label', language + ' 코드');
    }
  }
  function initializeTabs(root) {
    for (const set of $$('.tabbed-set', root)) {
      const inputs = $$(':scope > input', set), blocks = $$('.tabbed-content > .tabbed-block', set);
      if (!inputs.length || !blocks.length) continue;
      const apply = () => { let index = inputs.findIndex(input => input.checked); if (index < 0) { index = 0; inputs[0].checked = true; } blocks.forEach((block, i) => { block.hidden = i !== index; }); };
      inputs.forEach(input => input.addEventListener('change', apply)); set.classList.add('hub-tabs-ready'); apply();
    }
  }
  function initializeReferenceFilter(root) {
    const byOriginalId = id => findAnchor(root, id);
    const list = byOriginalId('cs-reference-table'), controls = byOriginalId('cs-reference-controls');
    const query = byOriginalId('cs-ref-query'), language = byOriginalId('cs-ref-language'), categorySelect = byOriginalId('cs-ref-category');
    const reset = byOriginalId('cs-ref-reset'), count = byOriginalId('cs-ref-count'), noResults = byOriginalId('cs-ref-empty');
    if (![list, controls, query, language, categorySelect, reset, count, noResults].every(Boolean)) return;
    const normalize = text => text.normalize('NFKC').toLowerCase().trim();
    const rows = $$('[data-category]', list).map(node => ({node, text: normalize(node.textContent), translations: $$('[data-lang]', node)}));
    function apply() {
      const terms = normalize(query.value).split(/\s+/).filter(Boolean); let visible = 0;
      for (const row of rows) {
        row.node.hidden = !((categorySelect.value === 'all' || row.node.dataset.category === categorySelect.value) && terms.every(term => row.text.includes(term)));
        if (!row.node.hidden) visible++;
        row.translations.forEach(item => { item.hidden = item.dataset.lang !== language.value; });
      }
      count.textContent = `${visible} / ${rows.length}개 주제 · ${language.value === 'en' ? 'English' : '한국어'}`;
      noResults.hidden = visible > 0; reset.disabled = !query.value && categorySelect.value === 'all' && language.value === 'ko';
    }
    const resetFilters = () => { query.value = ''; categorySelect.value = 'all'; language.value = 'ko'; apply(); query.focus(); };
    controls.addEventListener('submit', event => event.preventDefault()); query.addEventListener('input', apply);
    language.addEventListener('change', apply); categorySelect.addEventListener('change', apply); reset.addEventListener('click', resetFilters);
    $$('[data-catalog-reset]', noResults).forEach(button => button.addEventListener('click', resetFilters));
    controls.hidden = false; list.dataset.initialized = 'true'; apply();
  }
  function loadScript(name, url) {
    if (scriptLoads.has(name)) return scriptLoads.get(name);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = url; script.async = true;
      const timeout = setTimeout(() => { script.remove(); reject(new Error(name + ' timeout')); }, 15000);
      script.onload = () => { clearTimeout(timeout); resolve(); };
      script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error(name + ' unavailable')); };
      document.head.appendChild(script);
    }).catch(error => { scriptLoads.delete(name); throw error; });
    scriptLoads.set(name, promise); return promise;
  }
  let mermaidQueue = Promise.resolve(), mathQueue = Promise.resolve();
  async function renderDiagrams(root) {
    for (const pre of $$('pre.mermaid-source', root)) {
      const source = $('code', pre)?.textContent || pre.textContent;
      pre.classList.add('mermaid'); pre.textContent = source;
    }
    for (const code of $$('pre > code.language-mermaid', root)) {
      const pre = code.parentElement; pre.classList.add('mermaid'); pre.textContent = code.textContent;
    }
    const nodes = $$('.mermaid', root).filter(node => !node.querySelector('svg'));
    if (nodes.length) {
      const sources = new Map(nodes.map(node => [node, node.textContent]));
      try {
        if (!window.mermaid?.run) await loadScript('mermaid', 'https://cdn.jsdelivr.net/npm/mermaid@10.9.8/dist/mermaid.min.js');
        window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: settings.theme === 'dark' ? 'dark' : 'default' });
        mermaidQueue = mermaidQueue.catch(() => {}).then(async () => {
          for (const node of nodes) {
            if (!node.isConnected) continue;
            try { await window.mermaid.run({ nodes: [node] }); }
            catch { node.textContent = sources.get(node); node.classList.remove('mermaid'); node.setAttribute('aria-label', '렌더링할 수 없는 다이어그램 원문'); }
          }
        });
        await mermaidQueue;
      } catch {
        for (const node of nodes) if (node.isConnected) { node.textContent = sources.get(node); node.classList.remove('mermaid'); node.setAttribute('aria-label', '다이어그램 원문'); }
      }
    }
    if ($('.arithmatex, .math, script[type^="math/tex"]', root)) {
      try {
        if (!window.MathJax?.typesetPromise) {
          if (!scriptLoads.has('mathjax')) window.MathJax = { tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] }, options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] }, startup: { typeset: false } };
          await loadScript('mathjax', 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js');
        }
        await window.MathJax.startup.promise;
        mathQueue = mathQueue.catch(() => {}).then(() => root.isConnected ? window.MathJax.typesetPromise([root]) : undefined);
        await mathQueue;
      } catch { /* Keep the original math delimiters readable when the renderer is unavailable. */ }
    }
  }
  async function mountDocument(d, container, options = {}) {
    const token = String(++mountSequence); container.dataset.mount = token;
    const live = () => container.isConnected && container.dataset.mount === token;
    container.setAttribute('aria-busy', 'true');
    try {
      const content = await contentFor(d, options.retry);
      if (!live()) return;
      const prefix = options.paneIndex == null ? '' : `pane-${token}-`;
      container.replaceChildren(prepareHTML(d, content.html, prefix));
      const firstTitle = $('h1', container);
      if (firstTitle) {
        if (options.paneIndex == null) {
          const headerTitle = $('.article-header h1');
          if (firstTitle.id && headerTitle) { headerTitle.id = firstTitle.id; headerTitle.dataset.originalId = firstTitle.dataset.originalId || firstTitle.id; }
          firstTitle.remove();
        } else { const title = document.createElement('h2'); for (const attribute of [...firstTitle.attributes]) title.setAttribute(attribute.name, attribute.value); title.innerHTML = firstTitle.innerHTML; firstTitle.replaceWith(title); }
      }
      enhanceCode(container); initializeTabs(container); initializeReferenceFilter(container);
      container.setAttribute('aria-busy', 'false');
      if (options.paneIndex == null) {
        observeReader();
        if (state.params.get('anchor')) revealAnchor($('.article'), state.params.get('anchor'));
        else restoreView(currentViewKey);
      } else {
        const scroll = container.closest('.pane-scroll');
        const e = entry(session(), options.paneIndex);
        scroll.scrollTop = e?.scroll || 0;
        if (e?.anchor && !e.positioned) revealAnchor(container, e.anchor, scroll);
        if (e) e.positioned = true;
      }
      await renderDiagrams(container);
      if (!live()) return;
      if (options.paneIndex == null && state.params.get('anchor')) revealAnchor($('.article'), state.params.get('anchor'));
    } catch (error) {
      if (!live()) return;
      container.setAttribute('aria-busy', 'false');
      container.innerHTML = empty('문서 본문을 불러오지 못했어요.', '연결 상태를 확인하고 다시 시도해 주세요. 다른 문서와 읽기 위치는 유지됩니다.', 'alert', btn(icon('refresh') + '다시 시도', 'document-retry', `data-id="${h(d.id)}"`), true);
    }
  }
  function observeReader() {
    readerObserver?.disconnect();
    const headings = $$('.hub-document-body :is(h2,h3,h4)[id]');
    if ('IntersectionObserver' in window) {
      readerObserver = new IntersectionObserver(entries => {
        const seen = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (seen[0]) state.activeHeading = seen[0].target.dataset.originalId || seen[0].target.id;
      }, { rootMargin: '-100px 0px -60% 0px', threshold: 0 });
      headings.forEach(heading => readerObserver.observe(heading));
    }
    updateReading();
  }
  async function ensureSearchIndex(retry = false) {
    if (searchStatus === 'ready' && !retry) return;
    if (searchPromise && !retry) return searchPromise;
    const sequence = ++searchSequence;
    searchStatus = 'loading'; searchError = '';
    if ($('#search-results')) updateSearch();
    if ($('#command-dialog').open) updateCommand($('#command-input').value);
    searchPromise = (async () => {
      try {
        const index = await fetchJSON(publishedURL(D.searchIndexUrl || 'search/search_index.json'));
        if (!Array.isArray(index.docs)) throw new Error('검색 색인 형식이 올바르지 않습니다.');
        const next = new Map();
        for (let i = 0; i < index.docs.length; i++) {
          const section = index.docs[i];
          const d = documentsByURL.get(documentKey(publishedURL(section.location)));
          if (d) next.set(d.id, (next.get(d.id) || '') + '\n' + (section.title || '') + '\n' + (section.text || ''));
          if (i && i % 300 === 0) await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (sequence !== searchSequence) return;
        searchTextById = new Map([...next].map(([id, text]) => [id, text.normalize('NFKC').toLocaleLowerCase()]));
        searchStatus = 'ready';
      } catch (error) { if (sequence === searchSequence) { searchStatus = 'error'; searchError = error.message || '연결 오류'; } }
      finally { if (sequence === searchSequence) { searchPromise = null; if ($('#search-results')) updateSearch(); if ($('#command-dialog').open) updateCommand($('#command-input').value); } }
    })();
    return searchPromise;
  }
  function readableServiceCount(stack) { return Number.isFinite(stack.services) ? `${stack.services} services` : '서비스 수 미확인'; }
  async function mountStackFile(stack, file, root, retry = false) {
    const token = ++stackSequence; root.dataset.request = String(token); root.setAttribute('aria-busy', 'true');
    root.innerHTML = '<div class="skeleton-row"><i class="skeleton"></i><i class="skeleton"></i></div><p class="quiet-note">원본 파일을 불러오고 있습니다.</p>';
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
    try {
      const url = publishedURL(file.url); if (url.origin !== location.origin) throw new Error('파일 주소 오류');
      const response = await fetch(url, { signal: controller.signal, credentials: 'same-origin', cache: retry ? 'reload' : 'default' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const text = await response.text();
      if (!root.isConnected || root.dataset.request !== String(token)) return;
      root.innerHTML = codeBlock(text, file.name, /\.ya?ml$/i.test(file.name) ? 'yaml' : 'text');
    } catch {
      if (root.isConnected && root.dataset.request === String(token)) root.innerHTML = empty('구성 파일을 불러오지 못했어요.', '공개 원본 파일을 다시 불러올 수 있습니다.', 'alert', btn('다시 시도', 'stack-file', `data-name="${h(file.name)}"`), true);
    } finally { clearTimeout(timer); if (root.isConnected && root.dataset.request === String(token)) root.setAttribute('aria-busy', 'false'); }
  }

  const ACTIONS = {
    'menu-close': () => { closeNav(); $('.mobile-menu-btn')?.focus(); },
    'tools-menu': openToolsMenu, 'reader-tools': readerTools,
    'workspace-layout': workspaceLayout, 'workspace-sessions': workspaceSessions,
    'pane-tools': b => paneTools(+b.dataset.index),
    'session-switch': b => { if (!sessions.some(s => s.id === b.dataset.id)) return; capturePaneScroll(); sessionId = b.dataset.id; saveWorkspace(); closeModal(); setMain(workspacePage()); setupWorkspace(); $('[data-action="workspace-sessions"]')?.focus(); },
    'settings-reset-confirm': () => { Object.assign(settings, { theme: 'light', density: 'comfortable', readerSize: 16, motion: 'normal', contrast: 'normal' }); persistSettings(); closeModal(); renderTopbar(); $('#main').innerHTML = settingsPage(); $('[data-action="settings-reset"]')?.focus(); toast('디자인 설정을 기본값으로 되돌렸습니다.'); },

    'skip-main': (b, e) => { e.preventDefault(); $('#main').focus(); $('#main').scrollIntoView({ block: 'start' }); },
    'menu': toggleNav, 'tour': openTour,
    'modal-close': closeModal, 'command-close': () => $('#command-dialog').close(), 'tour-route': closeModal,

    'set-theme': b => { settings.theme = b.dataset.id === 'dark' ? 'dark' : 'light'; persistSettings(); renderTopbar(); $('#main').innerHTML = settingsPage(); $('[data-action="set-theme"][data-id="' + settings.theme + '"]')?.focus(); },
    'density': b => { settings.density = b.dataset.id === 'compact' ? 'compact' : 'comfortable'; persistSettings(); $('#main').innerHTML = settingsPage(); $('[data-action="density"][data-id="' + settings.density + '"]')?.focus(); },
    'motion': b => { settings.motion = settings.motion === 'reduce' ? 'normal' : 'reduce'; persistSettings(); b.setAttribute('aria-checked', String(settings.motion === 'reduce')); },
    'contrast': b => { settings.contrast = settings.contrast === 'high' ? 'normal' : 'high'; persistSettings(); b.setAttribute('aria-checked', String(settings.contrast === 'high')); },
    'settings-reset': () => openModal('디자인 설정을 복원할까요?', '<p>테마, 글자 크기, 목록 간격과 접근성 선택을 기본값으로 되돌립니다. 저장한 문서와 세션은 유지됩니다.</p>', btn('취소', 'modal-close') + btn('기본값 복원', 'settings-reset-confirm', '', 'primary')),
     'command': () => openCommand(),
    'intent': b => { state.intent = D.intents.some(i => i.id === b.dataset.id) ? b.dataset.id : 'all'; state.searchState = 'normal'; state.keyboardDoc = null; syncViewURL(); updateSearch(); },
    'search-reset': () => { state.q = ''; state.intent = 'all'; state.searchState = 'normal'; state.keyboardDoc = null; $('#results-search').value = ''; syncViewURL(); updateSearch(); $('#results-search').focus(); },
    'search-retry': () => { state.searchFallback = false; ensureSearchIndex(true); },
    'search-metadata': () => { state.searchFallback = true; updateSearch(); },
    'assistant': b => openAssistant(b.dataset.id),
    'document-retry': b => {
      const container = b.closest('.hub-document-body'), d = byId(b.dataset.id), pane = b.closest('.doc-pane');
      if (container && d) { container.innerHTML = '<p class="quiet-note" role="status">본문을 다시 불러오고 있습니다.</p>'; mountDocument(d, container, { retry: true, paneIndex: pane ? +pane.dataset.pane : null }); }
    },
    'stack-file': b => {
      const stack = D.stacks.find(item => item.id === state.selectedStack), file = stack?.files.find(item => item.name === b.dataset.name), root = $('#stack-file-body');
      if (file && root) mountStackFile(stack, file, root, true);
    },
    'reset-data': () => openModal('읽기 데이터를 초기화할까요?', '<p>이 브라우저의 책갈피와 창 배치, 이 탭의 읽기 기록·검색·열린 문서·작업 세션을 지웁니다. 디자인 설정과 원본 문서는 유지합니다.</p>', btn('취소','modal-close') + btn('읽기 데이터 초기화','reset-data-confirm','','danger')),
    'reset-data-confirm': () => {
      clearTimeout(scrollTimer); clearTimeout(searchTimer); bookmarks.clear(); recents=[]; viewMemory.clear();
      state.q=''; state.homeDraft=''; state.lastDoc=D.docs[0].id; state.keyboardDoc=null;
      Object.assign(layoutDefaults,{layout:'1x2',split:50,splitY:50}); sessions=[freshSession()];sessionId=sessions[0].id;
      for(const key of ['bookmarks','layout',...SESSION_KEYS]) { try {localStorage.removeItem('ndhub.v1.'+key);}catch{} try {sessionStorage.removeItem('ndhub.v1.'+key);}catch{} }
      closeModal();renderSidebar();toast('책갈피와 이 탭의 읽기 데이터를 초기화했습니다.');
    },
    'select-doc': b => { const d = byId(b.dataset.id); if (!d) return; openModal(h(d.title), contextPreview(d), '', 'detail-sheet'); },
     'split-doc': b => splitDoc(b.dataset.id), 'bookmark': b => toggleBookmark(b.dataset.id),
    'library-view': b => { state.libraryView = b.dataset.id === 'grid' ? 'grid' : 'list'; syncViewURL(); updateLibrary(); },
    'library-reset': () => { state.libraryQ = ''; state.libraryCategory = 'all'; syncViewURL(); route(); },

    'stack-reset': () => { state.stackQ = ''; state.stackGroup = 'all'; $('#stack-search').value = ''; $('#stack-group').value = 'all'; syncViewURL(); lastStackURL = currentViewKey; updateStacks(); },

    'code-copy': b => { const code = codeStore.get(b.dataset.id); if (typeof code === 'string') copyText(code, b); },
    'code-wrap': b => { const el = document.getElementById(b.dataset.id); if (!el) return; el.classList.toggle('wrap'); b.setAttribute('aria-pressed', String(el.classList.contains('wrap'))); },
    'code-collapse': b => { const el = document.getElementById(b.dataset.id); if (!el) return; el.classList.toggle('collapsed'); b.setAttribute('aria-expanded', String(!el.classList.contains('collapsed'))); b.setAttribute('aria-label', el.classList.contains('collapsed') ? '코드 펼치기' : '코드 접기'); },
    'focus': () => { state.focus = !state.focus; $('.reader-page')?.classList.toggle('focus-mode', state.focus); document.body.classList.toggle('reader-focus', state.focus); closeModal(); },
    'toc': () => { const d=byId(state.lastDoc);openModal('이 문서의 목차',`<nav class="toc-links">${d.toc.map((item,i)=>`<button class="toc-link ${state.activeHeading===item.id?'active':''}" data-action="toc-jump" data-id="${h(item.id)}"><span class="mono muted">${String(i+1).padStart(2,'0')}</span> ${h(item.title)}</button>`).join('')}</nav>`); },
    'toc-jump': b => { const id=b.dataset.id;closeModal();const d=byId(state.lastDoc);history.replaceState(null,'',canonicalURL(d,id));state.params.set('anchor',id);revealAnchor($('.article'),id); },
    'copy-link': b => copyText(location.href, b, '현재 문서 링크를 복사했습니다.'), 'source-info': sourceInfo, 'copy-source': b => copyText('content/docs/' + byId(state.lastDoc).path, b),
    'layout': b => { if (!['1x1', '1x2', '2x1', '2x2'].includes(b.dataset.id)) return; capturePaneScroll(); session().layout = b.dataset.id; if (session().active >= paneCount(session())) session().active = 0; saveWorkspace(); closeModal(); setMain(workspacePage()); setupWorkspace(); $('[data-action="workspace-layout"]')?.focus(); },
    'pane-active': b => activatePane(+b.dataset.index), 'pane-search': b => openCommand({ type: 'pane', index: +b.dataset.index }),
    'pane-history': b => openCommand({ type: 'history', index: +b.dataset.index }),
    'pane-current': b => { const index = +b.dataset.index; if (!recents.length) { toast('이 탭에서 최근 읽은 문서가 없습니다.','info'); return; } closeModal(); loadPane(index, recents[0]); focusPane(index); }, 'pane-clear': b => { const index = +b.dataset.index; closeModal(); loadPane(index, null); focusPane(index); },
    'pane-back': b => movePaneHistory(+b.dataset.index, -1), 'pane-forward': b => movePaneHistory(+b.dataset.index, 1),
    'pane-copy': b => { const pre=$(`.doc-pane[data-pane="${+b.dataset.index}"] pre`);if(pre)copyText(pre.textContent,b,'이 창의 첫 코드를 복사했습니다.');else toast('이 문서에 복사할 코드가 없습니다.','info'); },
    'session-new': () => sessionForm(false), 'session-rename': () => sessionForm(true),
    'session-remove': () => { if (sessions.length <= 1) return; openModal('이 세션을 제거할까요?', `<p style="font-size:13px"><strong>${h(session().name)}</strong>의 문서 창과 읽기 기록만 제거합니다. 문서 원본과 다른 세션은 그대로 남습니다.</p>`, btn('유지하기', 'modal-close') + btn('세션 제거', 'session-remove-confirm', `data-id="${h(sessionId)}"`, 'danger')); },
    'session-remove-confirm': b => { if (sessions.length <= 1) return; capturePaneScroll(); sessions = sessions.filter(s => s.id !== b.dataset.id); sessionId = sessions[0].id; saveWorkspace(); closeModal(); setMain(workspacePage()); setupWorkspace(); toast('세션을 제거했습니다. 문서 원본은 유지됩니다.'); },
    'command-choose': b => chooseCommand(+b.dataset.index),
    'key-detail': b => publicConnectionDetail(b.dataset.id)

  };
  function movePaneHistory(i, delta) { capturePaneScroll(); const s = session(), p = s.panes[i]; if (!p) return; const next = p.cursor + delta; if (next < 0 || next >= p.history.length) return; p.cursor = next; s.active = i; saveWorkspace(); setMain(workspacePage()); setupWorkspace(); }
  document.addEventListener('click', event => {
    $$('.filter-disclosure[open]').forEach(el => { if (!el.contains(event.target)) el.open = false; });
    const b = event.target.closest('[data-action]');
    if (b?.disabled) return;
    const fn = b && ACTIONS[b.dataset.action]; if (fn) fn(b, event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]'); if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const href = link.getAttribute('href');
    if (href.startsWith('#/')) { event.preventDefault(); navigate(href); return; }
    const body = link.closest('.hub-document-body'); if (!body) return;
    const pane = body.closest('.doc-pane'), current = byId(body.dataset.documentId);
    if (href.startsWith('#')) {
      let id=href.slice(1);try{id=decodeURIComponent(id);}catch{}
      const target=findAnchor(body,id); if(!target)return;
      event.preventDefault(); const original=target.dataset.originalId || id;
      if(pane){entry(session(),+pane.dataset.pane).anchor=original;entry(session(),+pane.dataset.pane).positioned=true;revealAnchor(body,original,body.closest('.pane-scroll'));saveWorkspace();}
      else {history.pushState(null,'',canonicalURL(current,original));lastRoutedURL=location.href;state.params.set('anchor',original);revealAnchor($('.article'),original);}
      return;
    }
    let url;try{url=new URL(href,canonicalURL(current));}catch{return;}
    if(url.origin!==location.origin)return;
    const destination=documentsByURL.get(documentKey(url));if(!destination)return;
    event.preventDefault();let anchor=url.hash.slice(1);try{anchor=decodeURIComponent(anchor);}catch{}
    if(pane)loadPane(+pane.dataset.pane,destination.id,anchor);else goToDocument(destination.id,anchor);
  });
  document.addEventListener('pointerdown', event => {
    const pane = event.target.closest('.doc-pane'); if (pane && state.route === 'workspace') activatePane(+pane.dataset.pane);
    const splitter = event.target.closest('.splitter'); if (!splitter || event.button !== 0) return;
    const grid = $('.workspace-grid'); drag = { axis: splitter.dataset.axis, rect: grid.getBoundingClientRect(), element: splitter }; splitter.setPointerCapture(event.pointerId); event.preventDefault();
  });
  function adjustSplit(axis, value) { const s = session(); const prop = axis === 'x' ? 'split' : 'splitY'; s[prop] = clamp(value, axis === 'x' ? 22 : 25, axis === 'x' ? 76 : 72); const grid = $('.workspace-grid'); if (!grid) return; grid.style.setProperty(axis === 'x' ? '--split' : '--split-y', s[prop] + '%'); $(`.splitter[data-axis="${axis}"]`)?.setAttribute('aria-valuenow', Math.round(s[prop])); }
  document.addEventListener('pointermove', event => { if (!drag) return; const value = drag.axis === 'x' ? (event.clientX - drag.rect.left) / drag.rect.width * 100 : (event.clientY - drag.rect.top) / drag.rect.height * 100; adjustSplit(drag.axis, value); });
  document.addEventListener('pointerup', () => { if (drag) { drag = null; saveWorkspace(); } }); document.addEventListener('pointercancel', () => { if (drag) { drag = null; saveWorkspace(); } });
  document.addEventListener('input', event => {
    const t = event.target;
    if (t.id === 'home-search') { state.homeDraft = t.value; }
    else if (t.id === 'results-search') {
      state.q = t.value; state.keyboardDoc = null; delete t.dataset.keyboardPicked; clearTimeout(searchTimer);
      if (!event.isComposing) searchTimer = setTimeout(() => { syncViewURL(); updateSearch(); }, 120);
    }
    else if (t.id === 'library-search') { state.libraryQ = t.value; syncViewURL(); updateLibrary(); }
    else if (t.id === 'stack-search') { state.stackQ = t.value; syncViewURL(); lastStackURL = currentViewKey; updateStacks(); }
    else if (t.id === 'key-search') { state.keyQ = t.value; syncViewURL(); updateKeys(); }
    else if (t.id === 'command-input') { commandIndex = 0; updateCommand(t.value); }
    else if (t.id === 'reader-size') { settings.readerSize = clamp(t.value, 14, 20); persistSettings(); $('#reader-size-value').textContent = settings.readerSize + 'px'; }
  });
  document.addEventListener('compositionend', event => { if (event.target.id === 'results-search') { state.q = event.target.value; clearTimeout(searchTimer); syncViewURL(); updateSearch(); } });
  document.addEventListener('change', event => {
    const t = event.target;
    if (t.id === 'library-category') { state.libraryCategory = t.value; syncViewURL(); route(); }
    if (t.id === 'stack-group') { state.stackGroup = t.value; syncViewURL(); lastStackURL = currentViewKey; updateStacks(); }
    if (t.id === 'stack-sort') { state.stackSort = t.value; syncViewURL(); lastStackURL = currentViewKey; updateStacks(); }
    if (t.id === 'key-status') { state.keyStatus = t.value; syncViewURL(); updateKeys(); }
  });
  document.addEventListener('submit', event => {
    const form = event.target;
    if (form.id === 'home-search-form') {
      event.preventDefault(); state.homeDraft = $('#home-search').value;
      const q = new URLSearchParams(); if (state.homeDraft.trim()) q.set('q', state.homeDraft.trim());
      navigate('#/search' + (q.size ? '?' + q : '')); return;
    }
    if (form.id === 'results-search-form') {
      event.preventDefault(); clearTimeout(searchTimer); state.q = $('#results-search').value; state.searchState = 'normal'; syncViewURL(); updateSearch(); return;
    }
    if (form.id === 'assistant-form') { event.preventDefault(); sendAssistant(form); return; }
    if (form.id === 'session-form') {
      event.preventDefault(); const name = $('#new-session-name').value.trim(); if (!name) { $('#session-error').textContent = '세션 이름을 입력해 주세요.'; return; }
      const renaming = form.dataset.mode === 'rename'; if (sessions.some(s => s.name === name && (!renaming || s.id !== sessionId))) { $('#session-error').textContent = '같은 이름의 세션이 있습니다.'; return; }
      capturePaneScroll(); if (renaming) session().name = name; else { const fresh = freshSession(name); fresh.panes = [makePane(state.lastDoc), makePane(null), makePane(null), makePane(null)]; sessions.push(fresh); sessionId = fresh.id; }
      saveWorkspace(); closeModal(); setMain(workspacePage()); setupWorkspace(); $('[data-action="workspace-sessions"]')?.focus(); toast(renaming ? '세션 이름을 저장했습니다.' : '새 작업 세션을 만들었습니다.');
    }
  });
  document.addEventListener('keydown', event => {
    if (event.isComposing) return;
    const t = event.target; const editable = t.matches('input,textarea,select,[contenteditable=true]');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if ($('#command-dialog').open) $('#command-dialog').close(); else openCommand(); return; }
    if ($('#command-dialog').open) { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); moveCommand(event.key === 'ArrowDown' ? 1 : -1); } else if (event.key === 'Enter') { event.preventDefault(); chooseCommand(commandIndex); } return; }
    if (event.key === 'Escape' && document.body.classList.contains('nav-open')) { event.preventDefault(); closeNav(); $('.mobile-menu-btn')?.focus(); return; }
    if (document.body.classList.contains('nav-open') && event.key === 'Tab') {
      const items = $$('a,button:not(:disabled),input,select', $('#sidebar')).filter(x => x.getClientRects().length); const first = items[0], last = items.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } return;
    }
    if ($('#modal').open) return;
    if (event.key === 'Escape') { const open = $('.filter-disclosure[open]'); if (open) { open.open = false; $('summary', open).focus(); event.preventDefault(); return; } }
    if (event.key === '/' && !editable) { event.preventDefault(); if (state.route === 'home') $('#home-search').focus(); else if (state.route === 'search') $('#results-search').focus(); else openCommand(); }
    if (event.key === '?' && !editable) { event.preventDefault(); openTour(); }
    if (t.id === 'results-search' && ['ArrowDown', 'ArrowUp'].includes(event.key) && state.searchState === 'normal') {
      event.preventDefault(); clearTimeout(searchTimer); const docs = filteredDocs(state.q, state.intent); if (!docs.length) return; const i = docs.findIndex(d => d.id === state.keyboardDoc); const next = event.key === 'ArrowDown' ? (i + 1) % docs.length : (i - 1 + docs.length) % docs.length; state.keyboardDoc = docs[next].id; t.dataset.keyboardPicked = 'true'; updateSearch(); $('[data-doc="' + state.keyboardDoc + '"]')?.scrollIntoView({ block: 'nearest' });
    }
    if (t.id === 'results-search' && event.key === 'Enter' && t.dataset.keyboardPicked && byId(state.keyboardDoc)) { event.preventDefault(); navigate('#/doc/' + state.keyboardDoc); }
    if (t.classList.contains('splitter')) {
      const axis = t.dataset.axis; let delta = 0; if (event.key === (axis === 'x' ? 'ArrowLeft' : 'ArrowUp')) delta = -2; if (event.key === (axis === 'x' ? 'ArrowRight' : 'ArrowDown')) delta = 2; if (delta) { event.preventDefault(); adjustSplit(axis, session()[axis === 'x' ? 'split' : 'splitY'] + delta); saveWorkspace(); } if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); adjustSplit(axis, event.key === 'Home' ? 25 : 72); saveWorkspace(); }
    }
  });
  $('#mobile-scrim').addEventListener('click', () => { closeNav(); $('.mobile-menu-btn')?.focus(); });
  for (const dialog of [$('#modal'), $('#command-dialog')]) {
    dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
    dialog.addEventListener('close', () => { if (dialog.id === 'modal' && $('#assistant-form')) { assistantSequence++;window.aiClient?.abort?.(); } if (!$('dialog[open]')) document.body.classList.remove('dialog-open'); if (!$('dialog[open]') && restoreTarget?.isConnected && !restoreTarget.closest('dialog') && !restoreTarget.closest('[inert]')) restoreTarget.focus({ preventScroll: true }); });
  }
  const onLocationChange=()=>{if(location.href!==lastRoutedURL)route();};
  window.addEventListener('hashchange',onLocationChange);
  window.addEventListener('popstate',onLocationChange);
  window.addEventListener('scroll', updateReading, { passive: true });
  window.addEventListener('resize', () => { if (window.innerWidth > 760) closeNav(); else if (!document.body.classList.contains('nav-open')) $('#sidebar').inert = true; });
  window.addEventListener('pagehide', () => {captureView();capturePaneScroll();saveWorkspace();});
  applySettings(); route();
  window.NDHUB_APP = { ready: true, navigate };
})().catch(error => { console.error('Documentation Hub could not initialize:', error); window.NDHUB_BOOT_FAILURE?.(); });
