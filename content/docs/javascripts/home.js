/** Home search delegates to the site's existing Material search. */
(function () {
  'use strict';

  if (window.__initializeHubHome) {
    window.__initializeHubHome();
    return;
  }

  const bound = new WeakSet();
  // Pinned Material 9.7.7 closes search 125 ms after navigation in bundle.ts.
  // Let that cleanup finish before this home-only action can open the panel.
  const SEARCH_SETTLE_MS = 150;
  let enableTimer;

  function initialize() {
    window.clearTimeout(enableTimer);
    const article = document.querySelector('.md-content__inner');
    const home = article?.querySelector(':scope > .hub-home');
    article?.classList.toggle('hub-home-content', Boolean(home));
    if (!home) return;

    const button = home.querySelector('[data-home-search]');
    button.disabled = true;
    enableTimer = window.setTimeout(() => {
      if (!home.isConnected || document.querySelector('.md-content__inner > .hub-home') !== home) return;
      const toggle = document.querySelector('[data-md-toggle="search"]');
      const query = document.querySelector('[data-md-component="search-query"]');
      button.disabled = !toggle || !query;
    }, SEARCH_SETTLE_MS);
    if (bound.has(button)) return;
    bound.add(button);

    button.addEventListener('click', () => {
      // Resolve live elements: Material may replace its search UI during navigation.
      const searchToggle = document.querySelector('[data-md-toggle="search"]');
      const searchQuery = document.querySelector('[data-md-component="search-query"]');
      if (!searchToggle || !searchQuery) return;
      searchToggle.checked = true;
      searchToggle.dispatchEvent(new Event('change', { bubbles: true }));
      searchQuery.focus();
      searchQuery.select();
    });
  }

  window.__initializeHubHome = initialize;
  if (typeof document$ !== 'undefined' && typeof document$.subscribe === 'function') {
    document$.subscribe(initialize);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
