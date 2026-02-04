/**
 * Split View Manager for Documentation Hub
 * Tmux-style multi-session split view functionality
 * Phase 2: Drag resize, history, current page load, improved rendering
 */

(function () {
    'use strict';

    // =====================================================
    // Configuration
    // =====================================================
    const CONFIG = {
        layouts: {
            '1x1': { rows: 1, cols: 1 },
            '1x2': { rows: 1, cols: 2 },
            '2x1': { rows: 2, cols: 1 },
            '2x2': { rows: 2, cols: 2 }
        },
        defaultLayout: '2x2',
        minPaneSize: 150,
        storageKey: 'splitview-state',
        searchDebounceMs: 300
    };

    // =====================================================
    // Session Class
    // =====================================================
    class Session {
        constructor(id, paneId) {
            this.id = id;
            this.paneId = paneId;
            this.name = `Session ${id.split('-')[1]}`;
            this.currentUrl = null;
            this.currentTitle = '';
            this.searchQuery = '';
            this.searchResults = [];
            this.scrollPosition = 0;
            this.history = [];
            this.historyIndex = -1;
        }

        addToHistory(url, title = '') {
            if (this.history[this.historyIndex]?.url !== url) {
                this.history = this.history.slice(0, this.historyIndex + 1);
                this.history.push({ url, title, timestamp: Date.now() });
                this.historyIndex = this.history.length - 1;
            }
        }

        canGoBack() {
            return this.historyIndex > 0;
        }

        canGoForward() {
            return this.historyIndex < this.history.length - 1;
        }

        goBack() {
            if (this.canGoBack()) {
                this.historyIndex--;
                return this.history[this.historyIndex];
            }
            return null;
        }

        goForward() {
            if (this.canGoForward()) {
                this.historyIndex++;
                return this.history[this.historyIndex];
            }
            return null;
        }

        getCurrentHistoryItem() {
            return this.history[this.historyIndex] || null;
        }
    }

    // =====================================================
    // SplitViewManager Class
    // =====================================================
    class SplitViewManager {
        constructor() {
            this.container = null;
            this.toolbar = null;
            this.isOpen = false;
            this.currentLayout = CONFIG.defaultLayout;
            this.sessions = new Map();
            this.activeSessionId = null;
            this.searchIndex = null;
            this.originalPageUrl = null;
            this.originalPageTitle = null;

            // Drag resize state
            this.isDragging = false;
            this.dragDirection = null;
            this.dragStartPos = 0;
            this.paneSizes = { rows: [], cols: [] };

            this.init();
        }

        // ----- Initialization -----
        init() {
            this.captureCurrentPage();
            this.createToggleButton();
            this.createContainer();
            this.loadSearchIndex();
            this.bindKeyboardShortcuts();
            this.restoreState();
        }

        captureCurrentPage() {
            // Capture current page URL and title for "load current page" feature
            this.originalPageUrl = window.location.pathname;
            this.originalPageTitle = document.title.replace(' - Documentation Hub', '').trim();
        }

        createToggleButton() {
            const btn = document.createElement('button');
            btn.className = 'split-view-toggle';
            btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M3 3h8v8H3V3m2 2v4h4V5H5m8-2h8v8h-8V3m2 2v4h4V5h-4M3 13h8v8H3v-8m2 2v4h4v-4H5m8-2h8v8h-8v-8m2 2v4h4v-4h-4z"/>
        </svg>
      `;
            btn.title = '화면 분할 (Ctrl+\\)';
            btn.addEventListener('click', () => this.toggle());

            document.body.appendChild(btn);
            this.toggleBtn = btn;
        }

        createContainer() {
            this.container = document.createElement('div');
            this.container.className = 'split-view-container';
            this.container.innerHTML = `
        <div class="split-view-toolbar">
          <div class="split-view-toolbar-left">
            <span class="split-view-title">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M3 3h8v8H3V3m2 2v4h4V5H5m8-2h8v8h-8V3m2 2v4h4V5h-4M3 13h8v8H3v-8m2 2v4h4v-4H5m8-2h8v8h-8v-8m2 2v4h4v-4h-4z"/>
              </svg>
              Split View
            </span>
          </div>
          <div class="split-view-toolbar-center">
            <button class="split-view-toolbar-btn" data-action="load-current" title="현재 페이지 로드">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M19 12h-2v3h-3v2h5v-5M7 9h3V7H5v5h2V9m14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/>
              </svg>
              <span class="split-view-current-page">${this.escapeHtml(this.originalPageTitle || 'Current Page')}</span>
            </button>
            <select class="split-view-layout-select">
              <option value="1x1">1×1</option>
              <option value="1x2">1×2 (가로)</option>
              <option value="2x1">2×1 (세로)</option>
              <option value="2x2" selected>2×2 (그리드)</option>
            </select>
          </div>
          <div class="split-view-toolbar-right">
            <button class="split-view-close" title="닫기 (ESC)">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="split-view-grid-wrapper">
          <div class="split-view-grid"></div>
        </div>
      `;

            document.body.appendChild(this.container);

            // Event bindings
            this.container.querySelector('.split-view-layout-select')
                .addEventListener('change', (e) => this.setLayout(e.target.value));

            this.container.querySelector('.split-view-close')
                .addEventListener('click', () => this.close());

            this.container.querySelector('[data-action="load-current"]')
                .addEventListener('click', () => this.loadCurrentPageToActiveSession());

            this.grid = this.container.querySelector('.split-view-grid');
            this.gridWrapper = this.container.querySelector('.split-view-grid-wrapper');
        }

        // ----- Load Current Page Feature -----
        loadCurrentPageToActiveSession() {
            if (!this.activeSessionId) {
                const firstSession = this.sessions.keys().next().value;
                if (firstSession) this.selectSession(firstSession);
            }

            if (this.activeSessionId && this.originalPageUrl) {
                this.loadContent(this.originalPageUrl, this.activeSessionId);
            }
        }

        // ----- Layout Management -----
        setLayout(layoutType) {
            if (!CONFIG.layouts[layoutType]) return;

            this.currentLayout = layoutType;
            const { rows, cols } = CONFIG.layouts[layoutType];

            // Clear existing grid
            this.grid.innerHTML = '';
            this.sessions.clear();

            // Reset sizes for new layout
            this.paneSizes = {
                rows: Array(rows).fill(100 / rows),
                cols: Array(cols).fill(100 / cols)
            };

            // Update grid CSS
            this.updateGridTemplate();

            // Create panes
            const totalPanes = rows * cols;
            for (let i = 0; i < totalPanes; i++) {
                this.createPane(i + 1);
            }

            // Add resize handles
            this.createResizeHandles(rows, cols);

            // Select first session
            const firstSession = this.sessions.keys().next().value;
            if (firstSession) this.selectSession(firstSession);

            this.saveState();
        }

        updateGridTemplate() {
            const { rows, cols } = CONFIG.layouts[this.currentLayout];
            this.grid.style.gridTemplateRows = this.paneSizes.rows.map(s => `${s}%`).join(' ');
            this.grid.style.gridTemplateColumns = this.paneSizes.cols.map(s => `${s}%`).join(' ');
        }

        createResizeHandles(rows, cols) {
            // Remove existing handles
            this.grid.querySelectorAll('.split-view-resize-handle').forEach(h => h.remove());

            // Create horizontal handles (between rows)
            for (let r = 0; r < rows - 1; r++) {
                const handle = document.createElement('div');
                handle.className = 'split-view-resize-handle split-view-resize-horizontal';
                handle.dataset.index = r;
                handle.style.gridRow = `${r + 1} / ${r + 2}`;
                handle.style.gridColumn = `1 / ${cols + 1}`;
                this.grid.appendChild(handle);
                this.bindResizeHandle(handle, 'row', r);
            }

            // Create vertical handles (between columns)
            for (let c = 0; c < cols - 1; c++) {
                const handle = document.createElement('div');
                handle.className = 'split-view-resize-handle split-view-resize-vertical';
                handle.dataset.index = c;
                handle.style.gridRow = `1 / ${rows + 1}`;
                handle.style.gridColumn = `${c + 1} / ${c + 2}`;
                this.grid.appendChild(handle);
                this.bindResizeHandle(handle, 'col', c);
            }
        }

        bindResizeHandle(handle, direction, index) {
            const onMouseDown = (e) => {
                e.preventDefault();
                this.isDragging = true;
                this.dragDirection = direction;
                this.dragIndex = index;
                this.dragStartPos = direction === 'row' ? e.clientY : e.clientX;

                const gridRect = direction === 'row'
                    ? this.grid.offsetHeight
                    : this.grid.offsetWidth;
                this.dragGridSize = gridRect;

                document.body.style.cursor = direction === 'row' ? 'row-resize' : 'col-resize';
                document.body.classList.add('split-view-resizing');

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };

            const onMouseMove = (e) => {
                if (!this.isDragging) return;

                const currentPos = this.dragDirection === 'row' ? e.clientY : e.clientX;
                const delta = currentPos - this.dragStartPos;
                const deltaPercent = (delta / this.dragGridSize) * 100;

                const sizes = this.dragDirection === 'row' ? this.paneSizes.rows : this.paneSizes.cols;
                const idx = this.dragIndex;

                // Calculate new sizes
                const minSize = (CONFIG.minPaneSize / this.dragGridSize) * 100;
                const newSize1 = sizes[idx] + deltaPercent;
                const newSize2 = sizes[idx + 1] - deltaPercent;

                if (newSize1 >= minSize && newSize2 >= minSize) {
                    sizes[idx] = newSize1;
                    sizes[idx + 1] = newSize2;
                    this.dragStartPos = currentPos;
                    this.updateGridTemplate();
                }
            };

            const onMouseUp = () => {
                this.isDragging = false;
                document.body.style.cursor = '';
                document.body.classList.remove('split-view-resizing');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.saveState();
            };

            handle.addEventListener('mousedown', onMouseDown);
        }

        createPane(index) {
            const paneId = `pane-${index}`;
            const sessionId = `session-${index}`;
            const { rows, cols } = CONFIG.layouts[this.currentLayout];

            const row = Math.floor((index - 1) / cols) + 1;
            const col = ((index - 1) % cols) + 1;

            const pane = document.createElement('div');
            pane.className = 'split-view-pane';
            pane.dataset.paneId = paneId;
            pane.dataset.sessionId = sessionId;
            pane.style.gridRow = row;
            pane.style.gridColumn = col;

            pane.innerHTML = `
        <div class="split-view-pane-header">
          <span class="split-view-session-name">Session ${index}</span>
          <div class="split-view-pane-controls">
            <button class="split-view-pane-btn" data-action="back" title="뒤로 (Alt+←)" disabled>
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
            <button class="split-view-pane-btn" data-action="forward" title="앞으로 (Alt+→)" disabled>
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
              </svg>
            </button>
            <button class="split-view-pane-btn" data-action="home" title="홈">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            </button>
            <button class="split-view-pane-btn" data-action="load-current" title="현재 페이지 로드">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M19 12h-2v3h-3v2h5v-5M7 9h3V7H5v5h2V9m14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="split-view-search-bar">
          <input type="text" class="split-view-search-input" placeholder="검색... (Ctrl+/)">
          <svg class="split-view-search-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5 6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5z"/>
          </svg>
        </div>
        <div class="split-view-content">
          <div class="split-view-welcome">
            <div class="split-view-welcome-icon">
              <svg viewBox="0 0 24 24" width="48" height="48">
                <path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/>
              </svg>
            </div>
            <h3>Session ${index}</h3>
            <p>검색하거나 문서를 선택하세요</p>
            <button class="split-view-load-current-btn" data-action="load-current-inline">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M19 12h-2v3h-3v2h5v-5M7 9h3V7H5v5h2V9m14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/>
              </svg>
              현재 보고 있는 페이지 로드
            </button>
          </div>
        </div>
        <div class="split-view-status">
          <span class="split-view-status-text">Ready</span>
          <span class="split-view-history-indicator"></span>
        </div>
      `;

            // Create session
            const session = new Session(sessionId, paneId);
            this.sessions.set(sessionId, session);

            // Bind events
            pane.addEventListener('click', (e) => {
                if (!e.target.closest('.split-view-pane-btn') &&
                    !e.target.closest('.split-view-load-current-btn')) {
                    this.selectSession(sessionId);
                }
            });

            const searchInput = pane.querySelector('.split-view-search-input');
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.search(e.target.value, sessionId);
                }, CONFIG.searchDebounceMs);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    clearTimeout(searchTimeout);
                    this.search(e.target.value, sessionId);
                }
            });

            // Pane control buttons
            pane.querySelectorAll('.split-view-pane-btn, .split-view-load-current-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    this.handlePaneAction(action, sessionId);
                });
            });

            this.grid.appendChild(pane);

            // Select first pane by default
            if (this.sessions.size === 1) {
                this.selectSession(sessionId);
            }
        }

        handlePaneAction(action, sessionId) {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            switch (action) {
                case 'back':
                    const backItem = session.goBack();
                    if (backItem) this.loadContent(backItem.url, sessionId, false);
                    this.updateHistoryButtons(sessionId);
                    break;
                case 'forward':
                    const forwardItem = session.goForward();
                    if (forwardItem) this.loadContent(forwardItem.url, sessionId, false);
                    this.updateHistoryButtons(sessionId);
                    break;
                case 'home':
                    this.loadContent('/', sessionId);
                    break;
                case 'load-current':
                case 'load-current-inline':
                    if (this.originalPageUrl) {
                        this.loadContent(this.originalPageUrl, sessionId);
                    }
                    break;
            }
        }

        updateHistoryButtons(sessionId) {
            const session = this.sessions.get(sessionId);
            const pane = this.grid.querySelector(`[data-session-id="${sessionId}"]`);
            if (!session || !pane) return;

            const backBtn = pane.querySelector('[data-action="back"]');
            const forwardBtn = pane.querySelector('[data-action="forward"]');
            const historyIndicator = pane.querySelector('.split-view-history-indicator');

            if (backBtn) backBtn.disabled = !session.canGoBack();
            if (forwardBtn) forwardBtn.disabled = !session.canGoForward();

            if (historyIndicator) {
                const historyLen = session.history.length;
                const currentIdx = session.historyIndex + 1;
                historyIndicator.textContent = historyLen > 0 ? `${currentIdx}/${historyLen}` : '';
            }
        }

        selectSession(sessionId) {
            this.grid.querySelectorAll('.split-view-pane').forEach(pane => {
                pane.classList.toggle('active', pane.dataset.sessionId === sessionId);
            });

            this.activeSessionId = sessionId;

            const activePane = this.grid.querySelector(`[data-session-id="${sessionId}"]`);
            if (activePane) {
                const input = activePane.querySelector('.split-view-search-input');
                if (input) input.focus();
            }

            this.updateHistoryButtons(sessionId);
        }

        // ----- Search Functionality -----
        async loadSearchIndex() {
            try {
                const response = await fetch('/search/search_index.json');
                this.searchIndex = await response.json();
            } catch (error) {
                console.warn('Split View: Could not load search index', error);
            }
        }

        search(query, sessionId) {
            const session = this.sessions.get(sessionId);
            const pane = this.grid.querySelector(`[data-session-id="${sessionId}"]`);
            if (!session || !pane) return;

            session.searchQuery = query;
            const content = pane.querySelector('.split-view-content');
            const status = pane.querySelector('.split-view-status-text');

            if (!query.trim()) {
                this.showWelcome(pane, sessionId);
                status.textContent = 'Ready';
                return;
            }

            if (!this.searchIndex) {
                content.innerHTML = '<div class="split-view-error">검색 인덱스를 불러올 수 없습니다</div>';
                return;
            }

            // Search in the index
            const queryLower = query.toLowerCase();
            const results = this.searchIndex.docs.filter(doc => {
                const titleMatch = doc.title && doc.title.toLowerCase().includes(queryLower);
                const textMatch = doc.text && doc.text.toLowerCase().includes(queryLower);
                return titleMatch || textMatch;
            }).slice(0, 30);

            session.searchResults = results;
            status.textContent = `${results.length}개 결과`;

            if (results.length === 0) {
                content.innerHTML = `
          <div class="split-view-no-results">
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <p>"${this.escapeHtml(query)}"에 대한 결과가 없습니다</p>
          </div>
        `;
                return;
            }

            // Render results with improved formatting
            content.innerHTML = `
        <div class="split-view-results">
          ${results.map(doc => {
                const path = doc.location || '';
                const category = this.extractCategory(path);
                return `
              <div class="split-view-result-item" data-url="${this.escapeHtml(path)}">
                <div class="split-view-result-header">
                  ${category ? `<span class="split-view-result-category">${this.escapeHtml(category)}</span>` : ''}
                </div>
                <div class="split-view-result-title">${this.highlightText(doc.title || 'Untitled', query)}</div>
                <div class="split-view-result-excerpt">${this.renderExcerpt(doc.text, query)}</div>
              </div>
            `;
            }).join('')}
        </div>
      `;

            // Bind click events to results
            content.querySelectorAll('.split-view-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const url = item.dataset.url;
                    this.loadContent(url, sessionId);
                });
            });
        }

        extractCategory(path) {
            const parts = path.split('/').filter(p => p && p !== 'index.html');
            if (parts.length > 0) {
                return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            }
            return '';
        }

        renderExcerpt(text, query) {
            if (!text) return '';
            const maxLen = 200;
            const lower = text.toLowerCase();
            const queryLower = (query || '').toLowerCase();
            let start = lower.indexOf(queryLower);

            if (start === -1) start = 0;
            start = Math.max(0, start - 50);

            let excerpt = text.substring(start, start + maxLen);
            if (start > 0) excerpt = '...' + excerpt;
            if (start + maxLen < text.length) excerpt += '...';

            // Convert basic markdown to HTML
            excerpt = this.renderBasicMarkdown(excerpt);
            return this.highlightText(excerpt, query);
        }

        renderBasicMarkdown(text) {
            if (!text) return '';
            return text
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>');
        }

        showWelcome(pane, sessionId) {
            const index = sessionId.split('-')[1];
            pane.querySelector('.split-view-content').innerHTML = `
        <div class="split-view-welcome">
          <div class="split-view-welcome-icon">
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/>
            </svg>
          </div>
          <h3>Session ${index}</h3>
          <p>검색하거나 문서를 선택하세요</p>
          <button class="split-view-load-current-btn" data-action="load-current-inline">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19 12h-2v3h-3v2h5v-5M7 9h3V7H5v5h2V9m14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/>
            </svg>
            현재 보고 있는 페이지 로드
          </button>
        </div>
      `;

            // Re-bind the button
            pane.querySelector('.split-view-load-current-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handlePaneAction('load-current', sessionId);
            });
        }

        // ----- Content Loading with Improved Rendering -----
        async loadContent(url, sessionId, addToHistory = true) {
            const session = this.sessions.get(sessionId);
            const pane = this.grid.querySelector(`[data-session-id="${sessionId}"]`);
            if (!session || !pane) return;

            const content = pane.querySelector('.split-view-content');
            const status = pane.querySelector('.split-view-status-text');
            const sessionName = pane.querySelector('.split-view-session-name');

            status.textContent = '로딩 중...';
            content.innerHTML = '<div class="split-view-loading"><div class="split-view-spinner"></div></div>';

            try {
                // Normalize URL
                let fullUrl = url;
                if (!url.startsWith('http') && !url.startsWith('/')) {
                    fullUrl = '/' + url;
                }
                if (!fullUrl.endsWith('.html') && !fullUrl.endsWith('/') && !fullUrl.includes('.')) {
                    fullUrl = fullUrl + '/';
                }

                const response = await fetch(fullUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Extract title
                const title = doc.querySelector('h1')?.textContent ||
                    doc.querySelector('title')?.textContent?.replace(' - Documentation Hub', '') ||
                    'Document';

                // Extract main content
                const mainContent = doc.querySelector('.md-content__inner') ||
                    doc.querySelector('article') ||
                    doc.querySelector('main') ||
                    doc.body;

                if (mainContent) {
                    // Clone and clean the content
                    const contentClone = mainContent.cloneNode(true);

                    // Remove unwanted elements
                    contentClone.querySelectorAll('script, .md-source, .md-footer').forEach(el => el.remove());

                    content.innerHTML = `<div class="split-view-document">${contentClone.innerHTML}</div>`;

                    // Process mermaid diagrams
                    this.processMermaidDiagrams(content);

                    // Process code blocks
                    this.processCodeBlocks(content);

                    // Update links to load in same pane
                    content.querySelectorAll('a[href]').forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                            link.addEventListener('click', (e) => {
                                e.preventDefault();
                                // Resolve relative URLs
                                const resolvedUrl = new URL(href, fullUrl).pathname;
                                this.loadContent(resolvedUrl, sessionId);
                            });
                        }
                    });

                    session.currentUrl = url;
                    session.currentTitle = title;

                    if (addToHistory) {
                        session.addToHistory(url, title);
                    }

                    // Update UI
                    sessionName.textContent = title.length > 30 ? title.substring(0, 30) + '...' : title;
                    status.textContent = url;
                    this.updateHistoryButtons(sessionId);
                } else {
                    throw new Error('Content not found');
                }
            } catch (error) {
                console.error('Split View: Error loading content', error);
                content.innerHTML = `
          <div class="split-view-error">
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p>콘텐츠를 불러올 수 없습니다</p>
            <small>${this.escapeHtml(error.message)}</small>
          </div>
        `;
                status.textContent = 'Error';
            }
        }

        async processMermaidDiagrams(container) {
            // Find all mermaid elements including various formats
            const mermaidElements = container.querySelectorAll(
                '.mermaid, pre code.language-mermaid, pre.language-mermaid code, .highlight-mermaid pre code'
            );

            if (mermaidElements.length === 0) return;

            // Check if mermaid is available
            if (!window.mermaid) {
                console.warn('Split View: Mermaid library not loaded');
                return;
            }

            // Process each mermaid element
            mermaidElements.forEach((el, index) => {
                const code = el.textContent.trim();
                if (!code) return;

                // Create a unique container for the diagram
                const wrapper = document.createElement('div');
                wrapper.className = 'split-view-mermaid-container';

                const mermaidDiv = document.createElement('div');
                mermaidDiv.className = 'mermaid';
                mermaidDiv.id = `split-view-mermaid-${Date.now()}-${index}`;
                mermaidDiv.textContent = code;

                wrapper.appendChild(mermaidDiv);

                // Replace the original element
                const parent = el.closest('pre') || el.parentElement;
                if (parent) {
                    parent.replaceWith(wrapper);
                }
            });

            // Re-render mermaid diagrams using the new API
            try {
                // Use mermaid.run() for newer versions, fallback to init for older
                if (typeof window.mermaid.run === 'function') {
                    await window.mermaid.run({
                        querySelector: '.split-view-mermaid-container .mermaid',
                        suppressErrors: true
                    });
                } else if (typeof window.mermaid.init === 'function') {
                    window.mermaid.init(undefined, container.querySelectorAll('.split-view-mermaid-container .mermaid'));
                } else if (typeof window.mermaid.contentLoaded === 'function') {
                    window.mermaid.contentLoaded();
                }
            } catch (e) {
                console.warn('Split View: Mermaid rendering error:', e);
                // Show error state for failed diagrams
                container.querySelectorAll('.split-view-mermaid-container .mermaid:not([data-processed])').forEach(el => {
                    el.classList.add('split-view-mermaid-error');
                    el.innerHTML = `<div class="mermaid-error-message">⚠️ 다이어그램 렌더링 실패</div><pre>${el.textContent}</pre>`;
                });
            }
        }

        processCodeBlocks(container) {
            // Add copy buttons to code blocks
            container.querySelectorAll('pre > code').forEach(code => {
                const pre = code.parentElement;
                if (!pre.querySelector('.split-view-copy-btn')) {
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'split-view-copy-btn';
                    copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          `;
                    copyBtn.title = 'Copy';
                    copyBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(code.textContent);
                        copyBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            `;
                        setTimeout(() => {
                            copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
              `;
                        }, 2000);
                    });
                    pre.style.position = 'relative';
                    pre.appendChild(copyBtn);
                }
            });
        }

        // ----- Toggle & State -----
        toggle() {
            this.isOpen ? this.close() : this.open();
        }

        open() {
            if (this.isOpen) return;

            // Re-capture current page when opening
            this.captureCurrentPage();

            this.isOpen = true;
            document.body.classList.add('split-view-active');
            this.container.classList.add('open');
            this.toggleBtn.classList.add('active');

            // Update current page display
            const currentPageSpan = this.container.querySelector('.split-view-current-page');
            if (currentPageSpan) {
                currentPageSpan.textContent = this.originalPageTitle || 'Current Page';
            }

            // Initialize layout if empty
            if (this.sessions.size === 0) {
                this.setLayout(this.currentLayout);
            }

            // Focus first session
            const firstSession = this.sessions.keys().next().value;
            if (firstSession) this.selectSession(firstSession);
        }

        close() {
            if (!this.isOpen) return;

            this.isOpen = false;
            document.body.classList.remove('split-view-active');
            this.container.classList.remove('open');
            this.toggleBtn.classList.remove('active');

            this.saveState();
        }

        // ----- Keyboard Shortcuts -----
        bindKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Ctrl+\ - Toggle split view
                if (e.ctrlKey && e.key === '\\') {
                    e.preventDefault();
                    this.toggle();
                    return;
                }

                if (!this.isOpen) return;

                // ESC - Close
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.close();
                    return;
                }

                // Ctrl+/ - Focus search
                if (e.ctrlKey && e.key === '/') {
                    e.preventDefault();
                    const activePane = this.grid.querySelector('.split-view-pane.active');
                    if (activePane) {
                        activePane.querySelector('.split-view-search-input').focus();
                    }
                    return;
                }

                // Alt+Arrow - History navigation
                if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                    e.preventDefault();
                    const action = e.key === 'ArrowLeft' ? 'back' : 'forward';
                    if (this.activeSessionId) {
                        this.handlePaneAction(action, this.activeSessionId);
                    }
                    return;
                }

                // Ctrl+Arrow - Navigate between panes
                if (e.ctrlKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                    this.navigatePane(e.key.replace('Arrow', '').toLowerCase());
                    return;
                }

                // Ctrl+Shift+1-4 - Select session directly
                if (e.ctrlKey && e.shiftKey && ['1', '2', '3', '4'].includes(e.key)) {
                    e.preventDefault();
                    const sessionId = `session-${e.key}`;
                    if (this.sessions.has(sessionId)) {
                        this.selectSession(sessionId);
                    }
                    return;
                }

                // Ctrl+Shift+C - Load current page
                if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                    e.preventDefault();
                    this.loadCurrentPageToActiveSession();
                    return;
                }
            });
        }

        navigatePane(direction) {
            const panes = Array.from(this.grid.querySelectorAll('.split-view-pane'));
            const activeIndex = panes.findIndex(p => p.dataset.sessionId === this.activeSessionId);
            if (activeIndex === -1) return;

            const { cols } = CONFIG.layouts[this.currentLayout];
            let newIndex = activeIndex;

            switch (direction) {
                case 'up':
                    newIndex = activeIndex - cols;
                    break;
                case 'down':
                    newIndex = activeIndex + cols;
                    break;
                case 'left':
                    newIndex = activeIndex - 1;
                    break;
                case 'right':
                    newIndex = activeIndex + 1;
                    break;
            }

            if (newIndex >= 0 && newIndex < panes.length) {
                this.selectSession(panes[newIndex].dataset.sessionId);
            }
        }

        // ----- State Persistence -----
        saveState() {
            const state = {
                layout: this.currentLayout,
                activeSession: this.activeSessionId,
                paneSizes: this.paneSizes,
                sessions: Array.from(this.sessions.entries()).map(([id, s]) => ({
                    id,
                    url: s.currentUrl,
                    title: s.currentTitle,
                    query: s.searchQuery,
                    history: s.history,
                    historyIndex: s.historyIndex
                }))
            };

            try {
                localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
            } catch (e) {
                console.warn('Split View: Could not save state', e);
            }
        }

        restoreState() {
            try {
                const state = JSON.parse(localStorage.getItem(CONFIG.storageKey));
                if (state) {
                    this.currentLayout = state.layout || CONFIG.defaultLayout;
                    if (state.paneSizes) {
                        this.paneSizes = state.paneSizes;
                    }
                    const select = this.container.querySelector('.split-view-layout-select');
                    if (select) select.value = this.currentLayout;
                }
            } catch (e) {
                console.warn('Split View: Could not restore state', e);
            }
        }

        // ----- Utilities -----
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        highlightText(text, query) {
            if (!text || !query) return text;
            const queryEscaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${queryEscaped})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        }
    }

    // =====================================================
    // Initialize on DOM Ready
    // =====================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new SplitViewManager());
    } else {
        new SplitViewManager();
    }
})();
