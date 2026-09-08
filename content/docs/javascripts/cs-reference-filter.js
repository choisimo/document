(function () {
  "use strict";

  const normalize = (text) => text.normalize("NFKC").toLowerCase().trim();

  function initCsReferenceFilter() {
    const list = document.getElementById("cs-reference-table");
    if (!list || list.dataset.initialized === "true") return;

    const controls = document.getElementById("cs-reference-controls");
    const query = document.getElementById("cs-ref-query");
    const language = document.getElementById("cs-ref-language");
    const category = document.getElementById("cs-ref-category");
    const reset = document.getElementById("cs-ref-reset");
    const count = document.getElementById("cs-ref-count");
    const empty = document.getElementById("cs-ref-empty");
    if (!controls || !query || !language || !category || !reset || !count || !empty) return;

    // Cache both languages once. Searching never depends on the display language.
    const rows = Array.from(list.querySelectorAll("[data-category]"), (node) => ({
      node,
      text: normalize(node.textContent),
      translations: Array.from(node.querySelectorAll("[data-lang]")),
    }));
    if (!rows.length) return;

    function applyFilters() {
      const terms = normalize(query.value).split(/\s+/).filter(Boolean);
      let visible = 0;
      for (const row of rows) {
        const matchesCategory = category.value === "all" || row.node.dataset.category === category.value;
        const matchesQuery = terms.every((term) => row.text.includes(term));
        row.node.hidden = !(matchesCategory && matchesQuery);
        if (!row.node.hidden) visible += 1;
        for (const translation of row.translations) {
          translation.hidden = translation.dataset.lang !== language.value;
        }
      }
      const message = `${visible} / ${rows.length}개 주제 · ${language.value === "en" ? "English" : "한국어"}`;
      if (count.textContent !== message) count.textContent = message;
      empty.hidden = visible > 0;
      reset.disabled = !query.value && category.value === "all" && language.value === "ko";
    }

    function resetFilters() {
      query.value = "";
      category.value = "all";
      language.value = "ko";
      applyFilters();
      query.focus();
    }

    controls.addEventListener("submit", (event) => event.preventDefault());
    query.addEventListener("input", applyFilters);
    language.addEventListener("change", applyFilters);
    category.addEventListener("change", applyFilters);
    reset.addEventListener("click", resetFilters);
    empty.querySelectorAll("[data-catalog-reset]").forEach((button) => {
      button.addEventListener("click", resetFilters);
    });

    applyFilters();
    list.dataset.initialized = "true";
    controls.hidden = false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCsReferenceFilter, { once: true });
  } else {
    initCsReferenceFilter();
  }
  if (typeof document$ !== "undefined") document$.subscribe(initCsReferenceFilter);
})();
