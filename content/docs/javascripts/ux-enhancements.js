
(function () {
  'use strict';

  // Material can execute extra scripts again during instant navigation.
  if (window.__initializeHubUx) {
    window.__initializeHubUx();
    return;
  }

  let progressBar = null;
  let progressFrame = null;
  let lastProgressRatio = -1;
  let tocObserver = null;

  function updateReadingProgress() {
    if (!progressBar?.isConnected) return;
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const max = scrollHeight - clientHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0;
    if (Math.abs(ratio - lastProgressRatio) < 0.001) return;
    lastProgressRatio = ratio;
    progressBar.style.transform = `scaleX(${ratio})`;
    progressBar.setAttribute('aria-valuenow', Math.round(ratio * 100));
  }

  function scheduleReadingProgress() {
    if (progressFrame !== null) return;
    progressFrame = requestAnimationFrame(() => {
      progressFrame = null;
      updateReadingProgress();
    });
  }

  function initReadingProgress() {
    progressBar = document.getElementById('reading-progress');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.id = 'reading-progress';
      progressBar.setAttribute('role', 'progressbar');
      progressBar.setAttribute('aria-label', '읽기 진행률');
      progressBar.setAttribute('aria-valuemin', '0');
      progressBar.setAttribute('aria-valuemax', '100');
      document.body.prepend(progressBar);
    }
    lastProgressRatio = -1;
    scheduleReadingProgress();
  }

  function initSkipToContent() {
    const main = document.querySelector('.md-main__inner, .md-content, main');
    if (!main) return;
    if (!main.id) main.id = 'main-content';
    let link = document.getElementById('skip-to-content');
    if (!link) {
      link = document.createElement('a');
      link.id = 'skip-to-content';
      link.className = 'skip-to-content';
      link.textContent = '본문으로 건너뛰기';
      document.body.prepend(link);
    }
    link.href = '#' + main.id;
  }

  function initExternalLinkIndicators() {
    document.querySelectorAll('.md-typeset a[href]').forEach(function (a) {
      const href = a.getAttribute('href') || '';
      const isExternal =
        href.startsWith('http') &&
        !href.includes(window.location.hostname) &&
        !href.includes('docs.nodove.com');

      if (isExternal) {
        if (!a.getAttribute('target')) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        }
        if (!a.querySelector('.external-icon') && !a.closest('.md-button')) {
          const icon = document.createElement('span');
          icon.className = 'external-icon';
          icon.setAttribute('aria-label', '(외부 링크)');
          icon.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="0.75em" height="0.75em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
          icon.style.cssText =
            'display:inline-block;margin-left:0.2em;vertical-align:middle;opacity:0.6;';
          a.appendChild(icon);
        }
      }
    });
  }

  function initTableOfContentsHighlight() {
    tocObserver?.disconnect();
    tocObserver = null;
    const tocLinks = document.querySelectorAll('.md-nav--secondary .md-nav__link');
    if (!tocLinks.length || !('IntersectionObserver' in window)) return;

    const headings = Array.from(
      document.querySelectorAll('.md-content h2[id], .md-content h3[id]')
    );

    if (!headings.length) return;

    tocObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            tocLinks.forEach(function (link) {
              const href = link.getAttribute('href');
              if (href === '#' + id) {
                link.classList.add('md-nav__link--active-scroll');
              } else {
                link.classList.remove('md-nav__link--active-scroll');
              }
            });
          }
        });
      },
      {
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0,
      }
    );

    headings.forEach(function (h) {
      tocObserver.observe(h);
    });
  }

  function drawerElements() {
    return {
      toggle: document.querySelector('[data-md-toggle="drawer"]'),
      opener: document.querySelector('.md-header label[for="__drawer"]'),
      sidebar: document.querySelector('.md-sidebar--primary'),
    };
  }

  function currentDrawerPanel(sidebar) {
    let panel = sidebar?.querySelector('.md-nav--primary');
    while (panel) {
      const toggles = panel.querySelectorAll(':scope > .md-nav__list > .md-nav__item > .md-nav__toggle:checked');
      const next = [...toggles].reverse()
        .map(toggle => toggle.parentElement.querySelector(':scope > .md-nav'))
        .find(nav => nav && getComputedStyle(nav).display !== 'none');
      if (!next) break;
      panel = next;
    }
    return panel;
  }

  function panelControls(panel) {
    return [...(panel?.querySelectorAll('a[href], label[tabindex="0"]') || [])]
      .filter(control => control.closest('.md-nav') === panel && control.getClientRects().length && getComputedStyle(control).visibility === 'visible');
  }

  function syncNavigationLabels(sidebar) {
    sidebar.querySelectorAll('label[for]').forEach(label => {
      const toggle = document.getElementById(label.htmlFor);
      if (!toggle?.classList.contains('md-nav__toggle')) return;
      const panel = toggle.parentElement.querySelector(':scope > .md-nav');
      if (!panel) return;
      if (!panel.id) panel.id = toggle.id + '-panel';
      label.setAttribute('role', 'button');
      label.setAttribute('tabindex', '0');
      label.setAttribute('aria-controls', panel.id);
      label.setAttribute('aria-expanded', String(toggle.checked));
      if (label.classList.contains('md-nav__title') && !label.hasAttribute('aria-label')) {
        label.setAttribute('aria-label', label.textContent.trim() + ' 상위 메뉴로');
      }
    });
  }

  function syncDrawer() {
    const { toggle, opener, sidebar } = drawerElements();
    if (!toggle || !opener || !sidebar) return;
    syncNavigationLabels(sidebar);
    if (!sidebar.id) sidebar.id = 'shell-navigation';
    opener.setAttribute('role', 'button');
    opener.setAttribute('tabindex', '0');
    if (!opener.hasAttribute('aria-label')) opener.setAttribute('aria-label', '탐색 메뉴');
    opener.setAttribute('aria-controls', sidebar.id);
    const wasOpen = opener.getAttribute('aria-expanded') === 'true';
    opener.setAttribute('aria-expanded', String(toggle.checked));
    if (!toggle.checked && (wasOpen || sidebar.contains(document.activeElement))) {
      opener.focus({ preventScroll: true });
    }
  }

  function initKeyboardNav() {
    document.addEventListener('keydown', function (e) {
      const { toggle, opener, sidebar } = drawerElements();
      const otherOverlayOpen = document.querySelector('[data-md-toggle="search"]')?.checked
        || document.body.classList.contains('split-view-active')
        || document.querySelector('.ai-chatbot-fab')?.getAttribute('aria-expanded') === 'true';
      const drawerHasFocus = sidebar?.contains(document.activeElement) || document.activeElement === opener;
      if (e.target === opener && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        // Keep Material's native label/checkbox activation and change listeners.
        opener.click();
        if (toggle?.checked) {
          // Material initially shows the current page's nested navigation panel.
          const currentLink = sidebar?.querySelector('a.md-nav__link--active');
          const controls = panelControls(currentDrawerPanel(sidebar));
          const target = controls.includes(currentLink) ? currentLink : controls.find(control => control.tagName === 'A') || controls[0];
          target?.focus();
        }
        return;
      }
      const label = e.target instanceof Element ? e.target.closest('.md-sidebar--primary label[for]') : null;
      if (label && !otherOverlayOpen && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        // Material also activates labels on Enter at window; claim this key once.
        e.stopPropagation();
        if (e.repeat) return;
        const nestedToggle = document.getElementById(label.htmlFor);
        label.click();
        if (toggle?.checked && window.matchMedia('(max-width: 76.1875em)').matches) {
          const nextControls = panelControls(currentDrawerPanel(sidebar));
          const parentControl = nextControls.find(control => control.htmlFor === nestedToggle?.id);
          (nestedToggle?.checked ? nextControls[0] : parentControl || nextControls[0])?.focus();
        }
        return;
      }
      if (toggle?.checked && drawerHasFocus && !otherOverlayOpen && window.matchMedia('(max-width: 76.1875em)').matches) {
        const controls = panelControls(currentDrawerPanel(sidebar));
        if (e.key === 'Tab' && controls.length) {
          e.preventDefault();
          e.stopPropagation();
          const current = controls.indexOf(document.activeElement);
          const next = current < 0 ? (e.shiftKey ? controls.length - 1 : 0)
            : (current + (e.shiftKey ? -1 : 1) + controls.length) % controls.length;
          controls[next].focus();
          return;
        }
      }
      if (e.key === 'Escape' && toggle?.checked && drawerHasFocus && !otherOverlayOpen) {
        e.preventDefault();
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        opener?.focus({ preventScroll: true });
        return;
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const activeEl = document.activeElement;
        const isInput =
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.isContentEditable);
        if (!isInput) {
          const searchInput = document.querySelector('.md-search__input');
          if (searchInput) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
          }
        }
      }
    });
    document.addEventListener('change', function (e) {
      if (e.target instanceof Element && e.target.matches('[data-md-toggle="drawer"], .md-nav__toggle')) syncDrawer();
    });
  }

  function initSmoothTabs() {
    const tabLinks = document.querySelectorAll('.md-tabs__link');
    tabLinks.forEach(function (link) {
      if (!link.getAttribute('tabindex')) {
        link.setAttribute('tabindex', '0');
      }
      if (!link.getAttribute('aria-label')) {
        const text = link.textContent.trim();
        if (text) link.setAttribute('aria-label', text + ' 섹션');
      }
    });
  }

  function init() {
    initReadingProgress();
    initSkipToContent();
    initSmoothTabs();
    syncDrawer();
    initExternalLinkIndicators();
    initTableOfContentsHighlight();
  }

  window.__initializeHubUx = init;
  window.addEventListener('scroll', scheduleReadingProgress, { passive: true });
  window.addEventListener('resize', scheduleReadingProgress, { passive: true });
  initKeyboardNav();

  if (typeof document$ !== 'undefined' && typeof document$.subscribe === 'function') {
    document$.subscribe(init);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
