(function () {
  'use strict';

  const DEFAULT_INDEX_URL = '/search/search_index.json';
  const DEFAULT_RRF_K = 60;
  const DEFAULT_MIN_SCORE = 0.01;
  const DEFAULT_LIMIT = 10;

  const STOPWORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'do', 'for', 'from', 'how', 'i', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'what', 'when', 'where', 'why', 'with',
    '가', '과', '는', '도', '를', '에', '와', '은', '의', '이', '좀', '잘', '하다', '하는', '해', '해줘', '해주세요', '관련', '설명', '알려줘', '알려주세요'
  ]);

  const PHRASE_EXPANSIONS = {
    'bit masking': ['bitmask', 'bit mask', 'bitwise', 'flag'],
    bitmask: ['bit masking', 'bitwise', 'flag'],
    docker: ['container', 'compose', 'image'],
    proxmox: ['ve', 'cluster', 'vm'],
    ssh: ['secure shell', 'key', 'authorized_keys'],
    vpn: ['wireguard', 'tailscale'],
    jpa: ['hibernate', 'entity', 'querydsl'],
    redis: ['cache', 'in-memory'],
    kubernetes: ['k8s', 'cluster', 'deployment'],
    troubleshooting: ['error', 'fix', 'issue', 'problem'],
    installation: ['install', 'setup', 'configure']
  };

  const TOKEN_EXPANSIONS = {
    k8s: ['kubernetes'],
    kubernetes: ['k8s'],
    vm: ['virtual', 'machine'],
    vpn: ['wireguard', 'tailscale'],
    acl: ['permission', 'access'],
    auth: ['authentication', 'authorization'],
    bit: ['binary', 'flag'],
    masking: ['mask', 'masking', 'bitmask'],
    install: ['installation', 'setup'],
    setup: ['install', 'configuration'],
    error: ['troubleshooting', 'issue', 'fix'],
    issue: ['error', 'problem', 'troubleshooting'],
    compare: ['difference', 'vs'],
    guide: ['tutorial', 'howto']
  };

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function safeText(value) {
    return typeof value === 'string' ? value : '';
  }

  function normalizeText(value) {
    return safeText(value)
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[_/\\]+/g, ' ')
      .replace(/[^\p{L}\p{N}\s.#:+-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function tokenize(value) {
    return unique(
      normalizeText(value)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token && !STOPWORDS.has(token) && token.length > 1)
    );
  }

  function countOccurrences(haystack, needle) {
    if (!haystack || !needle) return 0;
    const matches = haystack.match(new RegExp(escapeRegExp(needle), 'g'));
    return matches ? matches.length : 0;
  }

  function detectIntent(query, tokens) {
    const text = normalizeText(query);
    const joined = ` ${text} `;

    if (/(compare|difference|vs|차이|비교)/.test(joined)) return 'comparison';
    if (/(error|issue|problem|fix|fail|debug|trouble|오류|문제|실패|해결)/.test(joined)) return 'troubleshooting';
    if (/(how to|how do|steps|guide|tutorial|설치|설정|구성|방법)/.test(joined)) return 'howto';
    if (/(what is|reference|syntax|option|flag|정의|참조|개념)/.test(joined)) return 'reference';
    if (tokens.length <= 2) return 'lookup';
    return 'explore';
  }

  function buildQueryProfile(query) {
    const normalized = normalizeText(query);
    const rawTokens = tokenize(query);
    const expandedTokens = new Set(rawTokens);
    const phrases = new Set();

    if (normalized.includes(' ')) {
      phrases.add(normalized);
    }

    Object.entries(PHRASE_EXPANSIONS).forEach(([phrase, related]) => {
      if (normalized.includes(phrase)) {
        phrases.add(phrase);
        related.forEach((item) => expandedTokens.add(item));
      }
    });

    rawTokens.forEach((token) => {
      const related = TOKEN_EXPANSIONS[token];
      if (related) {
        related.forEach((item) => expandedTokens.add(item));
      }
    });

    return {
      raw: query,
      normalized,
      tokens: rawTokens,
      expandedTokens: unique(Array.from(expandedTokens).flatMap((token) => tokenize(token) || [token])),
      phrases: unique(Array.from(phrases)),
      intent: detectIntent(query, rawTokens)
    };
  }

  function createDocRecord(doc, index) {
    const title = safeText(doc && doc.title);
    const text = safeText(doc && doc.text);
    const location = safeText(doc && doc.location);
    const tags = Array.isArray(doc && doc.tags) ? doc.tags.map((tag) => safeText(tag)) : [];
    const titleNormalized = normalizeText(title);
    const textNormalized = normalizeText(text);
    const pathNormalized = normalizeText(location.replace(/\//g, ' '));
    const tagsNormalized = normalizeText(tags.join(' '));
    const combinedText = [titleNormalized, tagsNormalized, pathNormalized, textNormalized].filter(Boolean).join(' ');

    return {
      index,
      doc,
      title,
      text,
      location,
      tags,
      titleNormalized,
      textNormalized,
      pathNormalized,
      tagsNormalized,
      combinedText
    };
  }

  function extractCategory(location) {
    const segments = safeText(location).split('/').filter(Boolean);
    return segments.length > 0 ? segments[0] : '';
  }

  function buildReasons(queryProfile, record, metrics) {
    const reasons = [];

    if (metrics.exactTitlePhrase) reasons.push('title phrase');
    if (metrics.exactBodyPhrase) reasons.push('body phrase');
    if (metrics.titleHits > 0) reasons.push('title match');
    if (metrics.tagHits > 0) reasons.push('tag match');
    if (metrics.pathHits > 0) reasons.push('path match');
    if (metrics.expandedHits > metrics.tokenHits) reasons.push('expanded terms');
    if (queryProfile.intent === 'troubleshooting' && /error|issue|fix|troubleshoot|오류|문제|해결/.test(record.combinedText)) {
      reasons.push('troubleshooting intent');
    }
    if (queryProfile.intent === 'howto' && /install|setup|configure|guide|방법|설정|구성/.test(record.combinedText)) {
      reasons.push('how-to intent');
    }
    if (queryProfile.intent === 'reference' && /reference|syntax|option|flag|개념|정의/.test(record.combinedText)) {
      reasons.push('reference intent');
    }

    return unique(reasons).slice(0, 4);
  }

  function scoreRecord(queryProfile, record) {
    const metrics = {
      exactTitlePhrase: 0,
      exactBodyPhrase: 0,
      titleHits: 0,
      bodyHits: 0,
      pathHits: 0,
      tagHits: 0,
      tokenHits: 0,
      expandedHits: 0
    };

    queryProfile.phrases.forEach((phrase) => {
      if (record.titleNormalized.includes(phrase)) metrics.exactTitlePhrase += 1;
      if (record.textNormalized.includes(phrase)) metrics.exactBodyPhrase += 1;
    });

    queryProfile.tokens.forEach((token) => {
      const titleHits = countOccurrences(record.titleNormalized, token);
      const bodyHits = countOccurrences(record.textNormalized, token);
      const pathHits = countOccurrences(record.pathNormalized, token);
      const tagHits = countOccurrences(record.tagsNormalized, token);

      metrics.titleHits += titleHits;
      metrics.bodyHits += bodyHits;
      metrics.pathHits += pathHits;
      metrics.tagHits += tagHits;
      if (titleHits + bodyHits + pathHits + tagHits > 0) {
        metrics.tokenHits += 1;
      }
    });

    queryProfile.expandedTokens.forEach((token) => {
      const hits = countOccurrences(record.combinedText, token);
      if (hits > 0) {
        metrics.expandedHits += 1;
      }
    });

    const phraseScore = metrics.exactTitlePhrase * 8 + metrics.exactBodyPhrase * 5;
    const titleScore = metrics.titleHits * 5;
    const tagScore = metrics.tagHits * 4;
    const pathScore = metrics.pathHits * 3;
    const tokenCoverageScore = metrics.tokenHits * 3 + metrics.expandedHits * 1.5;
    const bodyScore = Math.min(metrics.bodyHits, 12) * 1.25;
    const intentScore = queryProfile.intent === 'lookup' && record.titleNormalized.startsWith(queryProfile.normalized) ? 3 : 0;
    const score = phraseScore + titleScore + tagScore + pathScore + tokenCoverageScore + bodyScore + intentScore;

    return {
      score,
      metrics,
      reasons: buildReasons(queryProfile, record, metrics)
    };
  }

  function rankRecords(records, scoreSelector) {
    return records
      .map((item) => ({ item, score: scoreSelector(item) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);
  }

  function fuseRankings(rankings, options) {
    const k = Number(options && options.rrfK) > 0 ? Number(options.rrfK) : DEFAULT_RRF_K;
    const minScore = Number(options && options.minCombinedScore) >= 0
      ? Number(options.minCombinedScore)
      : DEFAULT_MIN_SCORE;
    const scoreMap = new Map();

    rankings.forEach((ranking) => {
      const weight = ranking.weight || 1;
      ranking.items.forEach((item, rankIndex) => {
        const key = item.record.index;
        if (!scoreMap.has(key)) {
          scoreMap.set(key, { item, score: 0 });
        }
        scoreMap.get(key).score += weight * (1 / (k + rankIndex + 1));
      });
    });

    return Array.from(scoreMap.values())
      .filter((entry) => entry.score >= minScore)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.item.baseScore - a.item.baseScore;
      })
      .map((entry) => ({
        ...entry.item,
        combinedScore: entry.score
      }));
  }

  function buildExcerpt(record, queryProfile, maxChars) {
    const source = safeText(record.text || record.title);
    if (!source) return '';

    const needles = [...queryProfile.tokens, ...queryProfile.expandedTokens, ...queryProfile.phrases].filter(Boolean);
    const lowerSource = source.toLowerCase();
    let start = 0;

    for (const needle of needles) {
      const index = lowerSource.indexOf(needle.toLowerCase());
      if (index !== -1) {
        start = Math.max(0, index - 80);
        break;
      }
    }

    const limit = Number(maxChars) > 0 ? Number(maxChars) : 220;
    let excerpt = source.slice(start, start + limit).trim();
    if (start > 0) excerpt = '...' + excerpt;
    if (start + limit < source.length) excerpt += '...';
    return excerpt;
  }

  function formatChatContext(results, queryProfile, maxChars) {
    if (!Array.isArray(results) || results.length === 0) {
      return '';
    }

    const sections = [];
    let totalLength = 0;
    const hardLimit = Number(maxChars) > 0 ? Number(maxChars) : 3200;

    results.forEach((result, index) => {
      const block = [
        `${index + 1}. 제목: ${result.title || 'Untitled'}`,
        `경로: ${result.location || '/'}`,
        result.category ? `카테고리: ${result.category}` : null,
        result.reasons && result.reasons.length > 0 ? `근거: ${result.reasons.join(', ')}` : null,
        `발췌: ${result.excerpt || ''}`
      ].filter(Boolean).join('\n');

      if (totalLength + block.length > hardLimit) {
        return;
      }

      sections.push(block);
      totalLength += block.length;
    });

    if (sections.length === 0) {
      return '';
    }

    return [
      `[로컬 문서 검색 결과 | intent=${queryProfile.intent}]`,
      sections.join('\n\n'),
      '[로컬 문서 검색 결과 끝]'
    ].join('\n');
  }

  const DocSearchEngine = {
    _indexData: null,
    _records: null,
    _loadingPromise: null,

    setIndex(indexData) {
      const docs = Array.isArray(indexData && indexData.docs) ? indexData.docs : [];
      this._indexData = indexData || { docs: [] };
      this._records = docs.map((doc, index) => createDocRecord(doc, index));
      return this._indexData;
    },

    async loadIndex(indexUrl) {
      if (this._records) {
        return this._indexData;
      }

      if (!this._loadingPromise) {
        this._loadingPromise = fetch(indexUrl || DEFAULT_INDEX_URL)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
          })
          .then((indexData) => {
            this.setIndex(indexData);
            return this._indexData;
          })
          .finally(() => {
            this._loadingPromise = null;
          });
      }

      return this._loadingPromise;
    },

    async ensureIndex(options) {
      const indexData = options && options.indexData;
      if (indexData) {
        this.setIndex(indexData);
        return this._indexData;
      }

      if (this._records) {
        return this._indexData;
      }

      return this.loadIndex(options && options.indexUrl);
    },

    async search(query, options) {
      const trimmed = safeText(query).trim();
      const limit = Number(options && options.limit) > 0 ? Number(options.limit) : DEFAULT_LIMIT;
      if (!trimmed) {
        return { query: trimmed, intent: 'explore', results: [] };
      }

      await this.ensureIndex(options);
      const queryProfile = buildQueryProfile(trimmed);
      const records = Array.isArray(this._records) ? this._records : [];

      const scored = records
        .map((record) => {
          const scoredRecord = scoreRecord(queryProfile, record);
          return {
            record,
            baseScore: scoredRecord.score,
            metrics: scoredRecord.metrics,
            reasons: scoredRecord.reasons
          };
        })
        .filter((item) => item.baseScore > 0);

      const exactPhrase = rankRecords(scored, (item) => item.metrics.exactTitlePhrase * 10 + item.metrics.exactBodyPhrase * 6);
      const titleDominant = rankRecords(scored, (item) => item.metrics.titleHits * 6 + item.metrics.tagHits * 4 + item.metrics.pathHits * 3);
      const bodyCoverage = rankRecords(scored, (item) => item.metrics.tokenHits * 4 + item.metrics.bodyHits * 1.5 + item.metrics.expandedHits);
      const blended = rankRecords(scored, (item) => item.baseScore);

      const fused = fuseRankings([
        { weight: 1.5, items: exactPhrase.slice(0, 50) },
        { weight: 1.2, items: titleDominant.slice(0, 50) },
        { weight: 1.0, items: bodyCoverage.slice(0, 50) },
        { weight: 1.0, items: blended.slice(0, 50) }
      ], options || {});

      const results = fused.slice(0, limit).map((item) => ({
        title: item.record.title || 'Untitled',
        text: item.record.text,
        location: item.record.location,
        tags: item.record.tags,
        category: extractCategory(item.record.location),
        excerpt: buildExcerpt(item.record, queryProfile, options && options.excerptMaxChars),
        intent: queryProfile.intent,
        reasons: item.reasons,
        score: item.baseScore,
        combinedScore: item.combinedScore
      }));

      return {
        query: trimmed,
        intent: queryProfile.intent,
        results
      };
    },

    async buildChatContext(query, options) {
      const response = await this.search(query, options);
      return {
        query: response.query,
        intent: response.intent,
        results: response.results,
        contextText: formatChatContext(response.results, buildQueryProfile(query), options && options.contextMaxChars)
      };
    }
  };

  window.DocSearchEngine = DocSearchEngine;
})();
