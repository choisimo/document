import { concepts } from './catalog.js';
import { h, icon, button, tag, docs, createStore, normalizeReviews, announce, download } from './shared.js';

const concept = concepts.find(c => c.id === document.body.dataset.concept);
const base = concept ? '../' : './';
let storage;
try { storage = globalThis.localStorage; } catch { storage = { getItem() { throw Error('Unavailable'); }, setItem() { throw Error('Unavailable'); } }; }
const store = createStore(storage, announce);
const validIds = ids => Array.isArray(ids) ? [...new Set(ids.filter(id => concepts.some(c => c.id === id)))].slice(0,3) : [];
let selected = validIds(store.get('comparison', []));
let reviews = normalizeReviews(store.get('reviews', {}), concepts.map(c=>c.id));
const app = document.getElementById('app');
const scores = ['디자인','사용성','정보 구조','도입 가치'];
let family = '전체', query = '', reviewTarget = null;

function header() {
  return `<header class="lab-topbar"><a class="brand" href="${base}index.html" aria-label="nodove lab 갤러리"><span class="brand-mark">n</span>nodove.<small>EXPERIENCE LAB</small></a><nav class="lab-nav" aria-label="실험실 탐색"><a href="${base}index.html">전체 예시</a><span class="local-indicator">LOCAL PREVIEW</span>${button(`${icon('download')}평가 내보내기`,'data-export')}</nav></header>`;
}
function footer() { return '<footer class="lab-footer"><span><b>nodove.</b> &nbsp; 지식을 읽는 경험을 실험합니다.</span><span>20 CONCEPTS · SEPTEMBER 2026 · LOCAL EVALUATION</span></footer>'; }
function mini(c) {
  const layout = { '01':1,'02':6,'03':2,'04':3,'05':4,'06':6,'07':5,'08':5,'09':2,'10':4,'11':4,'12':4,'13':6,'14':7,'15':2,'16':7,'17':4,'18':2,'19':6,'20':4 }[c.id];
  return `<div class="mini-window" aria-hidden="true"><div class="mini-toolbar"><i></i><i></i><i></i><span>NODOVE / ${h(c.en.toUpperCase())}</span></div><div class="mini-body" data-layout="${layout}">${Array.from({length:layout===4||layout===7||layout===3?3:2},()=>'<div class="mini-block"><b></b><i></i><i></i><i></i><i></i></div>').join('')}</div></div>`;
}
function average(review) { const values = scores.map((_,i)=>Number(review?.scores?.[i])).filter(n=>Number.isInteger(n)&&n>=1&&n<=5); return values.length===4?(values.reduce((a,b)=>a+b,0)/4).toFixed(1):null; }
function card(c) {
  const avg = average(reviews[c.id]);
  return `<article class="concept-card" data-family="${h(c.family)}"><a href="${base+c.route}" class="card-art-link" tabindex="-1" aria-hidden="true">${mini(c)}</a><div class="card-info"><div class="card-kicker"><span class="card-number">${c.id}</span> / ${h(c.en)}<span class="spacer"></span>${avg?tag(`★ ${avg}`,'blue'):''}</div><h2><a href="${base+c.route}">${h(c.title)}</a></h2><p>${h(c.description)}</p><div class="card-foot">${button(`${icon(selected.includes(c.id)?'check':'plus')} 비교에 담기`,`data-compare="${c.id}" aria-pressed="${selected.includes(c.id)}"`)}<a class="open-link" href="${base+c.route}">예시 열기 ${icon('arrow')}</a></div></div></article>`;
}
function tray() {
  return selected.length?`<aside class="compare-tray" aria-label="비교할 예시"><div class="tray-title"><b>나란히 살펴보기</b><p>최대 3개까지 비교할 수 있어요</p></div><div class="tray-items">${selected.map(id=>`<button class="tray-item" data-remove="${id}" aria-label="${id}번 비교에서 제거">${id} ×</button>`).join('')}</div><a class="btn" href="${base}index.html#compare">${selected.length}개 비교 ${icon('arrow')}</a></aside>`:'';
}
function renderGallery() {
  document.title='20가지 문서의 다음 모습 · nodove lab';
  app.innerHTML=header()+`<main id="main" class="gallery" tabindex="-1"><section class="gallery-hero"><div><div class="eyebrow">DOCUMENTATION, REIMAGINED — VOL. 01</div><h1>문서의 다음 모습을,<br><span>함께 살펴보세요.</span></h1><p>찾고, 이해하고, 함께 만들어가는 지식 공간.<br>blog의 에이전트 기능에서 출발한 20가지 아이디어를 직접 경험하고 비교해 보세요.</p><div class="hero-foot"><span>${icon('grid')} 20개의 독립 예시</span><span>${icon('bolt')} 직접 조작하는 기능</span><span>${icon('shield')} 기기에만 저장되는 평가</span></div></div><div class="edition" aria-hidden="true">${[['01—05','탐색의 새로운 경로','search'],['06—10','이해에서 내 지식으로','book'],['11—15','함께 일하는 에이전트','bolt'],['16—20','계속 자라는 문서','edit']].map(([n,t,i])=>`<div class="edition-sheet"><i>${icon(i)}</i><b>${n}</b><span>${t}</span></div>`).join('')}</div></section><div class="gallery-tools"><div class="family-tabs" role="group" aria-label="예시 분야">${['전체','탐색','학습','에이전트','관리'].map(f=>button(`${f} <span class="count">${f==='전체'?'20':'05'}</span>`,`data-family="${f}" aria-pressed="${f===family}"`)).join('')}</div><label class="sr-only" for="gallery-query">예시 검색</label><input class="gallery-filter" type="search" id="gallery-query" placeholder="예시 이름, 기능 검색" value="${h(query)}"></div><div id="gallery-results" class="gallery-grid"></div></main>`+footer()+`<div id="tray-host">${tray()}</div>`+reviewDialog();
  renderCards(); bindCommon();
  document.querySelectorAll('[data-family]').forEach(el=>{ if(el.tagName!=='BUTTON')return;el.onclick=()=>{family=el.dataset.family;document.querySelectorAll('button[data-family]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.family===family)));renderCards();};});
  document.getElementById('gallery-query').oninput=e=>{query=e.target.value;renderCards();};
}
function renderCards() {
  const results=concepts.filter(c=>(family==='전체'||c.family===family)&&`${c.title} ${c.en} ${c.description}`.toLowerCase().includes(query.toLowerCase().trim()));
  document.getElementById('gallery-results').innerHTML=results.length?results.map(card).join(''):`<div class="empty"><h2>일치하는 예시가 없습니다</h2><p>검색, 학습, 노트처럼 짧은 키워드로 다시 찾아보세요.</p>${button('검색 초기화','data-reset-search')}</div>`;
  document.querySelector('[data-reset-search]')?.addEventListener('click',()=>{query='';family='전체';renderGallery();document.getElementById('gallery-query').focus();});
  bindComparison();
}
function bindComparison() {
  document.querySelectorAll('[data-compare]').forEach(el=>el.onclick=()=>{
    const id=el.dataset.compare;
    if(selected.includes(id)) selected=selected.filter(x=>x!==id);
    else if(selected.length<3) selected.push(id);
    else {announce('비교는 3개까지 가능합니다. 담은 예시를 하나 제거한 뒤 추가하세요.');return;}
    store.set('comparison',selected);el.setAttribute('aria-pressed',String(selected.includes(id)));
    el.innerHTML=`${icon(selected.includes(id)?'check':'plus')} 비교에 담기`;
    const host=document.getElementById('tray-host');if(host)host.innerHTML=tray();bindRemove();announce(`${selected.length}개 예시를 비교에 담았습니다.`);
  });bindRemove();
}
function bindRemove() { document.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{selected=selected.filter(x=>x!==el.dataset.remove);store.set('comparison',selected);if(location.hash==='#compare')renderCompare();else {document.getElementById('tray-host').innerHTML=tray();renderCards();}document.querySelector('[data-compare], .back-link')?.focus();}); }
function reviewDialog() {
  return `<dialog class="review-dialog" id="review-dialog" aria-labelledby="review-title"><form class="review-content" id="review-form"><div class="review-head"><div><div class="eyebrow">YOUR PERSPECTIVE</div><h2 id="review-title">예시 평가하기</h2><p id="review-subtitle"></p></div>${button(icon('close'),'type="button" data-close-review aria-label="평가 닫기"')}</div><div class="review-grid">${scores.map((label,i)=>`<label class="field">${label}<select name="score${i}" required><option value="">점수 선택</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n}점 · ${['개선 필요','아쉬움','보통','좋음','매우 좋음'][n-1]}</option>`).join('')}</select></label>`).join('')}</div><label class="field">도입 의견<select name="verdict"><option value="hold">더 검토하기</option><option value="shortlist">우선 후보로 남기기</option><option value="pass">이번에는 제외하기</option></select></label><label class="field" style="margin-top:16px">메모<textarea name="note" rows="4" maxlength="2000" placeholder="좋았던 점과 바꾸고 싶은 점을 남겨주세요. 민감 정보는 적지 마세요."></textarea></label><p class="review-note">이 브라우저에만 저장됩니다. 다른 기기로 옮기려면 평가를 내보내세요.</p><div class="review-actions">${button('닫기','type="button" data-close-review')}${button('평가 저장','type="submit"','primary')}</div></form></dialog>`;
}
function openReview(id) {
  reviewTarget=id; const c=concepts.find(x=>x.id===id); const form=document.getElementById('review-form'); const r=reviews[id]||{};
  document.getElementById('review-subtitle').textContent=`${c.id} / ${c.title}`;
  scores.forEach((_,i)=>form.elements[`score${i}`].value=String(r.scores?.[i]||''));
  form.elements.verdict.value=['hold','shortlist','pass'].includes(r.verdict)?r.verdict:'hold';form.elements.note.value=typeof r.note==='string'?r.note:'';
  document.getElementById('review-dialog').showModal();
}
function bindCommon() {
  document.querySelectorAll('[data-export]').forEach(el=>el.onclick=()=>{download('nodove-lab-evaluation.json',JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),selected,concepts:concepts.map(c=>({id:c.id,title:c.title,route:c.route,review:reviews[c.id]||null}))},null,2));announce('평가 파일을 내보냈습니다.');});
  document.querySelectorAll('[data-review]').forEach(el=>el.onclick=()=>openReview(el.dataset.review));
  document.querySelectorAll('[data-close-review]').forEach(el=>el.onclick=()=>document.getElementById('review-dialog').close());
  document.getElementById('review-form').onsubmit=e=>{e.preventDefault();const form=e.target;reviews[reviewTarget]={scores:scores.map((_,i)=>Number(form.elements[`score${i}`].value)),verdict:form.elements.verdict.value,note:form.elements.note.value,updatedAt:new Date().toISOString()};const saved=store.set('reviews',reviews);document.getElementById('review-dialog').close();if(location.hash==='#compare')renderCompare();if(saved)announce('평가를 이 브라우저에 저장했습니다.');};
}
function renderCompare() {
  const chosen=concepts.filter(c=>selected.includes(c.id));
  const axes=['정보 구조','탐색 방식','핵심 조작','공간 배치','구성 요소','정보 밀도'];
  app.innerHTML=header()+`<main id="main" class="compare-page" tabindex="-1"><a class="back-link" href="./index.html">${icon('arrow')} 전체 예시로</a><div class="eyebrow">SIDE BY SIDE</div><h1>어떤 경험이 더 잘 맞을까요?</h1><p>레이아웃, 조작 방식, 도입 가치를 같은 기준으로 비교하세요.</p>${chosen.length?`<div class="comparison-scroll" tabindex="0" role="region" aria-label="선택한 예시 비교 표"><table><thead><tr><th scope="col">비교 항목</th>${chosen.map(c=>`<td><span class="eyebrow">${c.id} / ${h(c.en)}</span><h2>${h(c.title)}</h2><a class="btn soft" href="./${c.route}">예시 열기 ${icon('arrow')}</a></td>`).join('')}</tr></thead><tbody>${axes.map((a,i)=>`<tr><th scope="row">${a}</th>${chosen.map(c=>`<td>${h(c.axes[i])}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">사용 흐름</th>${chosen.map(c=>`<td>${h(c.flow)}</td>`).join('')}</tr>${scores.map((s,i)=>`<tr><th scope="row">${s}</th>${chosen.map(c=>`<td>${Number(reviews[c.id]?.scores?.[i])>=1?h(reviews[c.id].scores[i])+' / 5':'아직 평가 전'}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">메모</th>${chosen.map(c=>`<td>${h(reviews[c.id]?.note||'—')}</td>`).join('')}</tr><tr><th scope="row">평가</th>${chosen.map(c=>`<td><div class="stack">${button(`${icon('star')} 평가하기`,`data-review="${c.id}"`)}${button('비교에서 제거',`data-remove="${c.id}"`)}</div></td>`).join('')}</tr></tbody></table></div>`:`<div class="empty compare-empty"><h2>비교할 예시를 담아주세요</h2><p>갤러리에서 최대 3개를 고를 수 있습니다.</p><a class="btn primary" href="./index.html">예시 둘러보기</a></div>`}</main>`+footer()+reviewDialog();
  bindCommon();bindRemove();
}
async function renderCandidate() {
  app.innerHTML=header()+`<main id="main" class="candidate-main" tabindex="-1"><div class="candidate-meta"><a class="back-link" href="../index.html">${icon('arrow')} 예시 갤러리</a><nav class="candidate-pager" aria-label="예시 이동"><label class="sr-only" for="concept-picker">다른 예시 선택</label><select id="concept-picker">${concepts.map(c=>`<option value="${c.route}" ${c.id===concept.id?'selected':''}>${c.id}. ${h(c.title)}</option>`).join('')}</select></nav></div><header class="candidate-heading"><div><div class="candidate-label"><span class="eyebrow">${concept.id} / ${h(concept.en)}</span>${tag(concept.family)}</div><h1>${h(concept.kicker)}</h1><p>${h(concept.description)}</p></div>${button(`${icon('star')} 이 예시 평가하기`,`data-review="${concept.id}"`,'soft')}</header><div id="candidate-root"></div><div class="candidate-boundary">${icon('shield')} 로컬 기능 예시 · 공개 학습 자료를 바탕으로 구성했습니다. AI 응답·실행 기록은 예시이며 외부 서비스에 연결하지 않습니다.</div><section class="candidate-review-strip"><div><h3>이 방식, 문서 사이트에 있으면 어떨까요?</h3><p>디자인과 조작 경험을 평가하고 다음 후보와 비교해 보세요.</p></div><div class="row">${button('평가 남기기',`data-review="${concept.id}"`,'primary')}<a class="btn" href="../${concepts[Number(concept.id)%20].route}">다음 예시 ${icon('arrow')}</a></div></section></main>`+footer()+reviewDialog();
  bindCommon();document.getElementById('concept-picker').onchange=e=>{location.href='../'+e.target.value;};
  const root=document.getElementById('candidate-root');
  try {const module=await import(`./pages/${concept.module}`);module.mount(root,{concept,docs,store,announce});}
  catch(error){console.error(error);root.innerHTML=`<div class="empty"><h2>예시를 불러오지 못했습니다</h2><p>로컬 서버가 실행 중인지 확인하고 새로고침하세요.</p>${button('다시 불러오기','data-retry')}</div>`;root.querySelector('[data-retry]').onclick=()=>location.reload();}
}
if(concept)renderCandidate();else{const route=()=>location.hash==='#compare'?renderCompare():renderGallery();addEventListener('hashchange',route);route();}
