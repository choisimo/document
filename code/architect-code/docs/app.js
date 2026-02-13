const partFilter = document.getElementById("partFilter");
const langFilter = document.getElementById("langFilter");
const searchInput = document.getElementById("searchInput");
const partsRoot = document.getElementById("parts");
const statsRoot = document.getElementById("stats");
const tpl = document.getElementById("problemTemplate");

const MEMORY_SCHEDULE = [1, 3, 7];

function getReviewTag(problemId) {
  const key = `review:${problemId}`;
  const lastRaw = localStorage.getItem(key);
  if (!lastRaw) {
    return { label: "Not Started", tone: "new", next: "Start today" };
  }
  const last = new Date(lastRaw);
  const days = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
  let next = MEMORY_SCHEDULE.find((d) => d > days);
  if (!next) {
    return { label: "Review Due", tone: "due", next: "Review now" };
  }
  return { label: "In Loop", tone: "loop", next: `D+${next}` };
}

function retrievalPrompt(problem) {
  return [
    `Q1. ${problem.algorithm}를 떠올리지 않고 30초 내로 접근 전략을 말할 수 있나요?`,
    `Q2. ${problem.name}를 실제 시스템에서 어디에 적용할지 1개 사례를 답해보세요.`,
    `Q3. ${problem.architectView}를 시간/공간 복잡도와 연결해 설명해보세요.`
  ].join(" ");
}

function toGitHubLink(path) {
  if (!path) return null;
  return `../${path}`;
}

function problemMatches(problem, filters) {
  const q = filters.query;
  const matchesQuery = !q
    || `${problem.id} ${problem.name} ${problem.algorithm} ${problem.architectView}`.toLowerCase().includes(q);

  if (!matchesQuery) return false;
  if (filters.part !== "all" && String(problem.part) !== filters.part) return false;
  if (filters.lang === "python" && !problem.pythonAvailable) return false;
  if (filters.lang === "java" && !problem.javaAvailable) return false;
  return true;
}

function statCard(label, value) {
  const el = document.createElement("article");
  const strong = document.createElement("strong");
  strong.textContent = value;
  const p = document.createElement("p");
  p.textContent = label;
  p.style.margin = "0.15rem 0 0";
  p.style.color = "var(--muted)";
  p.style.fontSize = "0.86rem";
  el.append(strong, p);
  return el;
}

function renderStats(data) {
  statsRoot.innerHTML = "";
  const s = data.stats;
  const values = [
    ["Total Problems", String(s.problemCount)],
    ["Parts", String(s.partCount)],
    ["Python Coverage", `${s.pythonCount}/${s.problemCount}`],
    ["Java Coverage", `${s.javaCount}/${s.problemCount}`],
  ];
  values.forEach(([label, value]) => statsRoot.appendChild(statCard(label, value)));
}

function renderPartOptions(parts) {
  parts.forEach((part) => {
    const opt = document.createElement("option");
    opt.value = String(part.part);
    opt.textContent = `Part ${part.part} - ${part.title}`;
    partFilter.appendChild(opt);
  });
}

function render(data) {
  const filters = {
    part: partFilter.value,
    lang: langFilter.value,
    query: searchInput.value.trim().toLowerCase(),
  };

  partsRoot.innerHTML = "";
  data.parts.forEach((part) => {
    const enriched = part.problems.map((p) => ({ ...p, part: part.part }));
    const filtered = enriched.filter((p) => problemMatches(p, filters));
    if (!filtered.length) return;

    const details = document.createElement("details");
    details.className = "part";
    details.open = true;

    const summary = document.createElement("summary");
    const left = document.createElement("div");
    const right = document.createElement("div");
    left.className = "part-title";
    right.className = "part-meta";
    left.textContent = `Part ${part.part}. ${part.title}`;
    right.textContent = `${filtered.length} / ${part.problems.length} problems`;
    summary.append(left, right);

    const grid = document.createElement("div");
    grid.className = "problem-grid";

    filtered.forEach((problem) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".pid").textContent = problem.id;
      node.querySelector("h4").textContent = problem.name;
      node.querySelector(".algo").textContent = `Pattern: ${problem.algorithm}`;

      const rt = getReviewTag(problem.id);
      node.querySelector(".arch").textContent = `${problem.architectView} | ${rt.label} (${rt.next})`;
      node.querySelector(".prompt").textContent = retrievalPrompt(problem);

      const links = node.querySelector(".links");
      const py = toGitHubLink(problem.pythonPath);
      const ja = toGitHubLink(problem.javaPath);

      if (py) {
        const a = document.createElement("a");
        a.href = py;
        a.textContent = "Python";
        a.className = "active";
        a.target = "_blank";
        a.rel = "noopener";
        links.appendChild(a);
      }

      if (ja) {
        const a = document.createElement("a");
        a.href = ja;
        a.textContent = "Java";
        a.className = "active";
        a.target = "_blank";
        a.rel = "noopener";
        links.appendChild(a);
      }

      const mark = document.createElement("a");
      mark.href = "#";
      mark.textContent = "Mark Reviewed";
      mark.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.setItem(`review:${problem.id}`, new Date().toISOString());
        render(data);
      });
      links.appendChild(mark);

      grid.appendChild(node);
    });

    details.append(summary, grid);
    partsRoot.appendChild(details);
  });
}

async function init() {
  const res = await fetch("data/problems.json");
  const data = await res.json();
  renderStats(data);
  renderPartOptions(data.parts);
  render(data);

  [partFilter, langFilter, searchInput].forEach((el) => {
    el.addEventListener("input", () => render(data));
    el.addEventListener("change", () => render(data));
  });
}

init().catch((error) => {
  partsRoot.innerHTML = `<p>Failed to load data: ${error.message}</p>`;
});
