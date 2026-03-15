(function () {
  "use strict";

  function initCsReferenceFilter() {
    const table = document.getElementById("cs-reference-table");
    if (!table || table.dataset.initialized === "true") return;

    const languageSelect = document.getElementById("cs-ref-language");
    const categorySelect = document.getElementById("cs-ref-category");
    if (!languageSelect || !categorySelect) return;

    const rows = Array.from(table.querySelectorAll("tbody tr[data-category]"));

    const applyFilters = () => {
      const language = languageSelect.value;
      const category = categorySelect.value;

      table.querySelectorAll("[data-lang]").forEach((node) => {
        node.hidden = node.dataset.lang !== language;
      });

      rows.forEach((row) => {
        const matchesCategory =
          category === "all" || row.dataset.category === category;
        row.hidden = !matchesCategory;
      });
    };

    languageSelect.addEventListener("change", applyFilters);
    categorySelect.addEventListener("change", applyFilters);

    table.dataset.initialized = "true";
    applyFilters();
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(initCsReferenceFilter);
  } else {
    document.addEventListener("DOMContentLoaded", initCsReferenceFilter);
  }
})();
