
(function () {
  'use strict';

  function initReadingProgress() {
    const bar = document.createElement('div');
    bar.id = 'reading-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', '읽기 진행률');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    document.body.prepend(bar);

    let rafId = null;
    let lastRatio = -1;

    function updateProgress() {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const max   = scrollHeight - clientHeight;
      const ratio = max > 0 ? scrollTop / max : 0;

      if (Math.abs(ratio - lastRatio) < 0.001) return;
      lastRatio = ratio;

      bar.style.transform = `scaleX(${ratio})`;
      bar.setAttribute('aria-valuenow', Math.round(ratio * 100));
    }

    window.addEventListener('scroll', () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        updateProgress();
        rafId = null;
      });
    }, { passive: true });

    updateProgress();
  }

  function initSkipToContent() {
    if (document.getElementById('skip-to-content')) return;
    const link = document.createElement('a');
    link.id = 'skip-to-content';
    link.href = '#main-content';
    link.className = 'skip-to-content';
    link.textContent = '본문으로 건너뛰기';

    const main = document.querySelector('.md-main__inner, .md-content, main');
    if (main && !main.id) {
      main.id = 'main-content';
    }

    document.body.prepend(link);
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
    const tocLinks = document.querySelectorAll('.md-nav--secondary .md-nav__link');
    if (!tocLinks.length) return;

    const headings = Array.from(
      document.querySelectorAll('.md-content h2[id], .md-content h3[id]')
    );

    if (!headings.length) return;

    const observer = new IntersectionObserver(
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
      observer.observe(h);
    });
  }

  function initKeyboardNav() {
    document.addEventListener('keydown', function (e) {
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
    initKeyboardNav();
    initSmoothTabs();

    document$.subscribe(function () {
      initExternalLinkIndicators();
      initTableOfContentsHighlight();
    });
  }

  if (typeof document$ !== 'undefined') {
    document$.subscribe(init);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
