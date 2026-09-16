export const h = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const paths = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>', search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',
  book: '<path d="M12 5v15M12 5C8 2 4 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-4-1-7-1-10 1Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  check: '<path d="m5 12 4 4L19 6"/>', layers: '<path d="m12 2 10 5-10 5L2 7Zm-10 10 10 5 10-5M2 17l10 5 10-5"/>',
  graph: '<circle cx="12" cy="5" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="m10 8-4 7m8-7 4 7M8 18h8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>', play: '<path d="m8 4 12 8-12 8Z"/>',
  file: '<path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h6"/>', bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>',
  shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
  code: '<path d="m7 6-6 6 6 6m10-12 6 6-6 6M14 3l-4 18"/>', download: '<path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/>',
  plus: '<path d="M12 4v16M4 12h16"/>', star: '<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>',
  edit: '<path d="m15 3 6 6L9 21H3v-6Zm-3 3 6 6"/>', message: '<path d="M21 3H3v14h5l4 5 4-5h5Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>', terminal: '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m6 8 4 4-4 4m7 0h5"/>',
};
export const icon = (name = 'file') => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
export const button = (label, attrs = '', kind = '') => `<button class="btn ${kind}" ${attrs}>${label}</button>`;
export const tag = (label, kind = '') => `<span class="tag ${kind}">${h(label)}</span>`;

export function createStore(storage = globalThis.localStorage, report = () => {}) {
  const prefix = 'nodove-docs-agent-lab:v1:';
  const memory = new Map();
  const deleted = new Set();
  return {
    get(key, fallback) {
      if (deleted.has(key)) return fallback;
      if (memory.has(key)) return memory.get(key);
      try { const raw = storage.getItem(prefix + key); return raw === null ? (memory.get(key) ?? fallback) : JSON.parse(raw); }
      catch { return memory.get(key) ?? fallback; }
    },
    set(key, value) {
      deleted.delete(key);
      memory.set(key, value);
      try { storage.setItem(prefix + key, JSON.stringify(value)); return true; }
      catch { report('브라우저 저장 공간을 사용할 수 없어 이번 화면에서만 유지됩니다. 내보내기로 보관하세요.'); return false; }
    },
    remove(key) { memory.delete(key); deleted.add(key); try { storage.removeItem(prefix + key); } catch { report('저장소를 사용할 수 없습니다. 현재 화면에서만 제거했습니다.'); } },
  };
}
export function normalizeReviews(value, ids) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(ids.flatMap(id => {
    const row = value[id];
    if (!row || typeof row !== 'object' || Array.isArray(row)) return [];
    const validScores = Array.isArray(row.scores) && row.scores.length === 4
      && row.scores.every(score => Number.isInteger(score) && score >= 1 && score <= 5);
    return [[id, {
      scores: validScores ? [...row.scores] : [],
      verdict: ['hold', 'shortlist', 'pass'].includes(row.verdict) ? row.verdict : 'hold',
      note: typeof row.note === 'string' ? row.note.slice(0,2000) : '',
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt.slice(0,40) : '',
    }]];
  }));
}
export function download(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function announce(message) {
  const el = document.getElementById('lab-status');
  if (el) { el.textContent = message; el.classList.add('visible'); clearTimeout(announce.timer); announce.timer = setTimeout(() => el.classList.remove('visible'), 5000); }
}

// Manually curated public learning excerpts. No recursive import of a private corpus.
export const docs = [
  { id: 'retrieval', title: 'BM25와 Attention, 검색과 집중의 차이', topic: 'AI Engineering', source: 'ai/bm25-vs-attention.md', minutes: 8, summary: 'BM25는 검색 후보를 점수화하고, Attention은 주어진 문맥 안의 정보 결합에 관여합니다.', detail: '검색 결과는 답변의 근거 후보입니다. 검색 점수가 높다는 사실만으로 주장 전체가 증명되지는 않습니다. 질문과 관련된 구절을 찾아 원문과 함께 확인하세요.' },
  { id: 'graph', title: 'LangChain과 LangGraph의 제어 흐름', topic: 'AI Engineering', source: 'ai/langchain-vs-langgraph.md', minutes: 12, summary: '단계 연결과 상태 그래프를 비교해 분기·재시도·중단 지점을 설계합니다.', detail: '단순한 순차 작업은 체인으로 표현할 수 있습니다. 반복, 분기, 상태 복구가 중요해지면 그래프의 노드와 전이 조건을 명시해 흐름을 검토하세요.' },
  { id: 'mcp', title: 'MCP 도구와 신뢰 경계', topic: 'AI Engineering', source: 'tools/ai/mcp.md', minutes: 10, summary: '도구 발견·호출 계약과 읽기·쓰기 권한을 구분합니다.', detail: '도구가 반환한 데이터는 지시보다 낮은 신뢰 수준으로 다룹니다. 실행 권한, 입력 검증, 외부 전송 대상을 각각 확인하고 실제 변경 전에 검토 단계를 둡니다.' },
  { id: 'docker', title: 'Docker 네트워크 연결 이해하기', topic: 'Development', source: 'development/docker/networking.md', minutes: 9, summary: '컨테이너 연결, 서비스 이름 해석, 포트 공개 범위를 차례로 확인합니다.', detail: '같은 사용자 정의 네트워크에서 컨테이너는 서비스 이름을 사용해 통신할 수 있습니다. 컨테이너 간 연결과 호스트에 포트를 공개하는 작업은 별도로 검토합니다.' },
  { id: 'backup', title: '스냅샷·백업·템플릿 선택 기준', topic: 'Infrastructure', source: 'infrastructure/proxmox/snapshot-backup-template.md', minutes: 7, summary: '빠른 되돌리기와 별도 보관, 반복 생성의 목적을 구분합니다.', detail: '스냅샷은 변경 전 상태를 되돌리는 데 활용하고, 백업은 복원 가능한 별도 사본을 준비합니다. 템플릿은 새로운 인스턴스를 반복 생성할 때 사용합니다. 실제 복구 가능성은 복원 점검으로 확인합니다.' },
  { id: 'quorum', title: 'Proxmox QDevice 투표 점검', topic: 'Infrastructure', source: 'infrastructure/proxmox/cluster.md', minutes: 11, summary: '쿼럼 상태와 외부 투표 장치 연결을 관찰합니다.', detail: '쿼럼 문제는 네트워크 연결, 투표 구성, 서비스 상태를 함께 확인합니다. 운영 클러스터의 설정을 변경하기 전에 현재 상태를 기록하고 복구 경로를 준비합니다.' },
  { id: 'redis', title: 'Redis와 캐시의 역할', topic: 'Database', source: 'databases/redis/overview.md', minutes: 6, summary: '빠른 조회와 만료 정책, 원본 데이터의 관계를 살펴봅니다.', detail: '캐시의 값과 원본 데이터가 달라질 수 있는 시간을 이해해야 합니다. 만료 시간과 무효화 정책을 결정하고 캐시 장애 때 원본으로의 요청 증가를 고려합니다.' },
  { id: 'ssh', title: 'SSH 접속 설정과 권한', topic: 'Security', source: 'security/ssh/configuration.md', minutes: 8, summary: '접속 정책과 인증 방법을 구분해 검토합니다.', detail: '접속 설정을 변경할 때는 기존 세션을 유지하며 새 세션으로 검증합니다. 예시의 호스트와 계정은 실제 환경에 그대로 적용하지 않고 필요한 범위로 제한합니다.' },
  { id: 'deadlock', title: '교착 상태를 이해하는 네 가지 조건', topic: 'Computer Science', source: 'os/deadlocks.md', minutes: 8, summary: '상호 배제·점유 대기·비선점·순환 대기를 구분합니다.', detail: '자원 할당 관계를 그리면 순환 대기를 확인하는 데 도움이 됩니다. 예방, 회피, 탐지 후 복구는 비용과 전제 조건이 서로 다른 접근입니다.' },
  { id: 'k8s', title: '로컬 Kubernetes 클러스터', topic: 'Infrastructure', source: 'k8s/kubernetes/01-cluster-setup.md', minutes: 14, summary: '로컬 실습 환경의 구성 요소와 확인 순서를 정리합니다.', detail: '로컬 환경의 노드와 워크로드 상태를 관찰하면서 클러스터 구조를 익힙니다. 실습에서의 성공을 운영 환경의 가용성 보장으로 해석하지 않습니다.' },
  { id: 'query', title: 'QueryDSL과 JPA 연동', topic: 'Database', source: 'databases/jpa/querydsl.md', minutes: 10, summary: '타입으로 표현하는 쿼리와 엔티티 모델의 관계를 살펴봅니다.', detail: '타입 안전한 표현도 실행된 쿼리의 성능을 보장하지 않습니다. 실제 조회 조건, 생성 SQL, 결과 개수를 확인하고 필요한 인덱스를 판단합니다.' },
  { id: 'network', title: '리눅스 네트워크 설정 기준', topic: 'Infrastructure', source: 'infrastructure/networking/network-settings.md', minutes: 7, summary: '인터페이스·주소·경로·이름 해석을 단계별로 확인합니다.', detail: '연결 상태는 인터페이스, 주소, 라우팅, DNS 순서로 좁혀 볼 수 있습니다. 원격 연결 중 설정을 변경한다면 접속 복구 수단을 먼저 준비합니다.' },
];
export const sourceLink = doc => `<a class="source-link" href="https://docs.nodove.com/${h(doc.source.replace(/\.md$/, '/'))}" target="_blank" rel="noopener noreferrer">${icon('file')}${h(doc.title)} ↗</a>`;
