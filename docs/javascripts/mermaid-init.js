(function () {
  'use strict';

  function normalizeMermaidBlocks(root) {
    const scope = root || document;
    const codeBlocks = Array.from(
      scope.querySelectorAll('pre.mermaid-source, pre.mermaid-source > code, pre > code.mermaid-source')
    );

    codeBlocks.forEach((code) => {
      const source = (code.textContent || '').trim();
      if (!source) {
        return;
      }

      const pre = code.closest('pre') || code;
      if (!pre) {
        return;
      }

      const container = document.createElement('div');
      container.className = 'mermaid';
      container.textContent = source;
      pre.replaceWith(container);
    });
  }

  function collectMermaidTargets(root) {
    const scope = root || document;
    return Array.from(scope.querySelectorAll('.mermaid')).filter((node) => {
      const hasSvg = Boolean(node.querySelector('svg'));
      const hasSource = Boolean((node.textContent || '').trim());
      return !hasSvg && hasSource;
    });
  }

  async function renderMermaid(root) {
    if (!window.mermaid) {
      return;
    }

    normalizeMermaidBlocks(root);
    const targets = collectMermaidTargets(root);
    if (targets.length === 0) {
      return;
    }

    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose'
    });

    await window.mermaid.run({
      nodes: targets,
      suppressErrors: true
    });
  }

  async function onReady() {
    try {
      await renderMermaid(document);
    } catch (error) {
      console.warn('Mermaid render failed:', error);
    }
  }

  if (typeof document$ !== 'undefined' && document$.subscribe) {
    document$.subscribe(onReady);
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady);
    } else {
      onReady();
    }
  }
})();
