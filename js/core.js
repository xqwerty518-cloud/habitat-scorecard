// 상태, 점수 계산, 카드/비교/공존/전체 목록 렌더링
let currentHabitat = 'land';
let ACTIVE_KEYS = LAND_KEYS;
let currentMode = 'calc';
let savedSites = [];
let seasonTimer = null, seasonMonth = 0;

// ---- 전체 종 목록(282종) 검색/필터 ----
const MODELED_MAP = {};
[...LAND_SPECIES, ...MARINE_SPECIES].forEach(sp=>{ MODELED_MAP[sp.name] = sp; });

function initDirectory(){
  const classes = [...new Set(FULL_SPECIES_LIST.map(r=>r.c))];
  const sel = document.getElementById('dir-class');
  sel.innerHTML = '<option value="all">전체 분류군</option>' + classes.map(c=>`<option value="${c}">${c}</option>`).join('');
  ['dir-search','dir-class','dir-grade'].forEach(id=>{
    document.getElementById(id).addEventListener('input', renderDirectory);
    document.getElementById(id).addEventListener('change', renderDirectory);
  });
  renderDirectory();
}

function renderDirectory(){
  const q = document.getElementById('dir-search').value.trim();
  const cls = document.getElementById('dir-class').value;
  const grade = document.getElementById('dir-grade').value;
  const rows = FULL_SPECIES_LIST.filter(r=>{
    if(q && !r.n.includes(q)) return false;
    if(cls!=='all' && r.c!==cls) return false;
    if(grade!=='all' && r.g!==grade) return false;
    return true;
  });
  document.getElementById('dir-summary').textContent = `${rows.length}종 표시 중 (전체 ${FULL_SPECIES_LIST.length}종 · 이 중 17종은 적합도 계산 가능)`;
  document.getElementById('dir-tbody').innerHTML = rows.length ? rows.map(r=>{
    const modeled = MODELED_MAP[r.n];
    const link = modeled
      ? `<button class="dir-link" onclick="jumpToSpecies('${modeled.id}')">적합도 보기 →</button>`
      : `<span class="dir-none">–</span>`;
    return `<tr><td class="sp-cell">${escapeHtml(r.n)}</td><td>${r.c}</td><td><span class="grade-badge grade-${r.g}">${r.g}급</span></td><td>${link}</td></tr>`;
  }).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);">검색 결과가 없습니다.</td></tr>`;
}

function jumpToSpecies(id){
  const sp = [...LAND_SPECIES, ...MARINE_SPECIES].find(s=>s.id===id);
  if(!sp) return;
  if(sp.habitat !== currentHabitat) switchHabitat(sp.habitat);
  switchMode('calc');
  toast(`${sp.name} 카드로 이동했습니다`);
  setTimeout(()=>{
    const ref = cardRefs[id];
    if(ref) ref.el.scrollIntoView({ behavior:'smooth', block:'center' });
  }, 200);
}

// ---- 디지털 트윈 분류군 필터 ----
let twinClassFilter = new Set();
function toggleTwinClass(c){
  if(twinClassFilter.has(c)) twinClassFilter.delete(c); else twinClassFilter.add(c);
  document.querySelectorAll('.twin-chip').forEach(btn=>{
    btn.classList.toggle('active', twinClassFilter.has(btn.dataset.cls));
  });
  if(currentMode==='twin') render();
}

function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function escapeHtml(str){ return String(str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function factorScore(value, def){
  if(def.type === 'range'){
    if(value >= def.lo && value <= def.hi) return 1;
    const d = value < def.lo ? def.lo - value : value - def.hi;
    return clamp01(1 - d / def.softness);
  } else {
    const d = Math.abs(value - def.target);
    return clamp01(1 - d / def.tol);
  }
}

function scoreSpecies(sp, inputs){
  let sum = 0, wsum = 0;
  const perFactor = {};
  Object.keys(sp.factors).forEach(f=>{
    const def = sp.factors[f];
    const w = def.weight || 1;
    const s = factorScore(inputs[f], def);
    perFactor[f] = s;
    sum += s * w;
    wsum += w;
  });
  return { total: Math.round((sum/wsum)*100), perFactor };
}

function verdict(score){
  if(score >= 80) return {text:'매우 적합', color:'var(--sage-deep)'};
  if(score >= 60) return {text:'적합', color:'var(--sage)'};
  if(score >= 40) return {text:'보통', color:'var(--amber)'};
  return {text:'부적합', color:'var(--rust)'};
}
function barColor(score){
  if(score>=80) return 'var(--sage-deep)';
  if(score>=60) return 'var(--sage)';
  if(score>=40) return 'var(--amber)';
  return 'var(--rust)';
}
function barColorHex(score){
  if(score>=80) return 0x3E5A3E;
  if(score>=60) return 0x5F7A5A;
  if(score>=40) return 0xB4753A;
  return 0x9C4B3D;
}

function recommend(sp, inputs, perFactor, total){
  const keys = Object.keys(sp.factors);
  let worst = keys[0];
  keys.forEach(k=>{ if(perFactor[k] < perFactor[worst]) worst = k; });
  if(perFactor[worst] > 0.92) return null;
  const def = sp.factors[worst];
  const idealValue = def.type === 'range' ? (def.lo+def.hi)/2 : def.target;
  const cur = inputs[worst];
  if(Math.abs(idealValue-cur) < 0.5) return null;
  const dir = idealValue > cur ? '높이면' : '낮추면';
  const inputs2 = Object.assign({}, inputs, {[worst]: idealValue});
  const newTotal = scoreSpecies(sp, inputs2).total;
  if(newTotal - total < 2) return null;
  return `${LABELS[worst]}을(를) ${dir} 적합도가 ${total}→${newTotal}로 오를 수 있어요`;
}

function sensitivity(sp, inputs){
  return Object.keys(sp.factors).map(k=>{
    const step = SENS_STEP[k] || 1;
    const up = scoreSpecies(sp, Object.assign({}, inputs, {[k]: inputs[k]+step})).total;
    const down = scoreSpecies(sp, Object.assign({}, inputs, {[k]: inputs[k]-step})).total;
    return { key:k, sens: Math.abs(up-down)/2 };
  }).sort((a,b)=>b.sens-a.sens);
}

function readInputs(){
  const inputs = {};
  ACTIVE_KEYS.forEach(f=>{ inputs[f] = Number(document.getElementById(f).value); });
  return inputs;
}

function updateLabels(inputs){
  if(currentHabitat === 'land'){
    document.getElementById('v-temp').textContent = inputs.temp + '°C';
    document.getElementById('v-hum').textContent = inputs.hum + '%';
    document.getElementById('v-water').textContent = inputs.water;
    document.getElementById('v-veg').textContent = inputs.veg;
    document.getElementById('v-food').textContent = inputs.food;
    document.getElementById('v-dist').textContent = inputs.dist;
    document.getElementById('v-elev').textContent = inputs.elev;
  } else {
    document.getElementById('v-wtemp').textContent = inputs.wtemp + '°C';
    document.getElementById('v-sal').textContent = inputs.sal + '‰';
    document.getElementById('v-depth').textContent = inputs.depth;
    document.getElementById('v-oxy').textContent = inputs.oxy + 'mg/L';
    document.getElementById('v-turb').textContent = inputs.turb;
    document.getElementById('v-mfood').textContent = inputs.mfood;
    document.getElementById('v-mdist').textContent = inputs.mdist;
  }
}

function interpret(inputs){
  if(currentHabitat === 'land'){
    const t = inputs.temp<0?'한랭':inputs.temp<15?'냉량':inputs.temp<25?'온화':'고온';
    const h = inputs.hum<40?'건조':inputs.hum<70?'적습':'다습';
    const v = inputs.veg<3?'개활지':inputs.veg<7?'혼효림':'울창한 숲';
    const e = inputs.elev<3?'저지대':inputs.elev<7?'구릉지':'고산지대';
    const d = inputs.dist<3?'인적 드문':inputs.dist<7?'인간 활동이 있는':'인간 활동이 활발한';
    return `${t}하고 ${h}한, ${d} ${e}의 ${v} 환경입니다.`;
  } else {
    const t = inputs.wtemp<8?'한랭한':inputs.wtemp<18?'냉온대':inputs.wtemp<24?'온대':'아열대성';
    const s = inputs.sal<15?'저염':inputs.sal<30?'기수':'외해성 고염';
    const dp = inputs.depth<3?'조간대':inputs.depth<7?'연안':'외해';
    const tb = inputs.turb<3?'맑은':inputs.turb<7?'약간 탁한':'탁한';
    const d = inputs.mdist<3?'선박 통행이 적은':inputs.mdist<7?'어업 활동이 있는':'선박·어업이 활발한';
    return `${t} ${s} 수역의 ${d} ${dp} ${tb} 환경입니다.`;
  }
}

const cardsEl = document.getElementById('cards');
const cardRefs = {};
let lastScores = {};

function buildCard(sp){
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = sp.id;

  const keys = Object.keys(sp.factors);
  const breakdown = keys.map(f =>
    `<div class="factor"><div class="factor-track"><div class="factor-fill" data-f="${f}" style="height:0%"></div></div><div class="factor-label">${LABELS[f]}</div></div>`
  ).join('');

  card.innerHTML = `
    <div class="card-top">
      <div class="tag">
        <div class="tag-badge">${sp.name.slice(0,1)}</div>
        <div><div class="tag-name">${sp.name}</div><div class="tag-latin">${sp.latin}</div><div class="tag-status">${sp.status||''}</div></div>
      </div>
      <div class="rank">No.· ${sp.code}</div>
    </div>
    <div class="score-row">
      <span class="score-num">0</span><span class="score-max">/ 100</span><span class="verdict">–</span>
    </div>
    <div class="score-bar"><div class="score-bar-fill" style="width:0%"></div></div>
    <div class="breakdown">${breakdown}</div>
    <div class="recommend"></div>
    <details class="sensitivity"><summary>민감도 분석 보기</summary><div class="sens-list"></div></details>
  `;
  cardsEl.appendChild(card);

  const factorFills = {};
  keys.forEach(f=>{ factorFills[f] = card.querySelector(`.factor-fill[data-f="${f}"]`); });

  cardRefs[sp.id] = {
    el: card,
    scoreNum: card.querySelector('.score-num'),
    scoreBarFill: card.querySelector('.score-bar-fill'),
    verdict: card.querySelector('.verdict'),
    rank: card.querySelector('.rank'),
    recommend: card.querySelector('.recommend'),
    sensList: card.querySelector('.sens-list'),
    factorFills,
  };
  lastScores[sp.id] = 0;
}

function initCards(list){
  cardsEl.innerHTML = '';
  Object.keys(cardRefs).forEach(k=>delete cardRefs[k]);
  lastScores = {};
  list.forEach(buildCard);
}

function animateNumber(el, from, to, duration){
  if(from === to){ el.textContent = to; return; }
  const startTime = performance.now();
  function step(now){
    const p = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if(p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function activeSpecies(){ return currentHabitat === 'land' ? LAND_SPECIES : MARINE_SPECIES; }

function renderCalc(inputs){
  const results = activeSpecies().map(sp => ({ sp, ...scoreSpecies(sp, inputs) })).sort((a,b)=> b.total - a.total);
  const top = results[0];
  document.getElementById('summary-line').textContent = `최고 적합종: ${top.sp.name} (${top.total}점)`;

  const firstRects = {};
  Object.values(cardRefs).forEach(ref=>{ firstRects[ref.el.dataset.id] = ref.el.getBoundingClientRect(); });

  results.forEach((r, i)=>{
    const ref = cardRefs[r.sp.id];
    const v = verdict(r.total);
    const color = barColor(r.total);

    ref.el.style.order = i;
    ref.el.style.borderColor = i===0 ? 'var(--sage)' : 'var(--line)';
    ref.el.style.boxShadow = i===0 ? '0 2px 14px var(--shadow)' : 'none';
    ref.rank.textContent = `No.${i+1} · ${r.sp.code}`;

    animateNumber(ref.scoreNum, lastScores[r.sp.id], r.total, 500);
    lastScores[r.sp.id] = r.total;

    ref.scoreBarFill.style.width = r.total + '%';
    ref.scoreBarFill.style.background = color;
    ref.verdict.textContent = v.text;
    ref.verdict.style.color = v.color;

    Object.keys(r.perFactor).forEach(f=>{
      const pct = Math.round(r.perFactor[f]*100);
      ref.factorFills[f].style.height = pct + '%';
      ref.factorFills[f].style.background = barColor(pct);
    });

    const rec = recommend(r.sp, inputs, r.perFactor, r.total);
    ref.recommend.textContent = rec || '현재 조건에서 추가로 얻을 수 있는 개선 여지가 크지 않아요.';

    const sens = sensitivity(r.sp, inputs);
    ref.sensList.innerHTML = sens.map(s=>
      `<div class="sens-row"><span>${LABELS[s.key]}</span><div class="sens-bar"><div style="width:${Math.min(100, s.sens*8)}%"></div></div></div>`
    ).join('');
  });

  requestAnimationFrame(()=>{
    Object.values(cardRefs).forEach(ref=>{
      const id = ref.el.dataset.id;
      const last = firstRects[id];
      if(!last) return;
      const now = ref.el.getBoundingClientRect();
      const dx = last.left - now.left, dy = last.top - now.top;
      if(dx || dy){
        ref.el.style.transition = 'none';
        ref.el.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(()=>{
          ref.el.style.transition = 'transform .4s ease, border-color .2s ease, box-shadow .2s ease';
          ref.el.style.transform = '';
        });
      }
    });
  });
}

function renderCompare(){
  const sites = savedSites.filter(s=>s.habitat===currentHabitat);
  const species = activeSpecies();
  const wrap = document.getElementById('compare-table-wrap');
  document.getElementById('summary-line').textContent = sites.length ? `${sites.length}개 지점 비교 중` : '';

  if(sites.length===0){
    wrap.innerHTML = `<p class="empty-note">저장된 지점이 없습니다. 왼쪽 패널에서 조건을 조정한 뒤 “이 조건을 지점으로 저장”을 눌러보세요. 여러 지점을 저장하면 종별 점수를 나란히 비교할 수 있습니다.</p>`;
    return;
  }
  let html = '<div class="compare-scroll"><table class="compare-table"><thead><tr><th>종</th>';
  sites.forEach(s=>{
    html += `<th>${escapeHtml(s.name)}<button class="site-x" onclick="removeSite('${s.id}')" title="삭제">×</button></th>`;
  });
  html += '</tr></thead><tbody>';
  species.forEach(sp=>{
    html += `<tr><td class="sp-cell">${sp.name}</td>`;
    sites.forEach(s=>{
      const sc = scoreSpecies(sp, s.inputs).total;
      const v = verdict(sc);
      html += `<td style="color:${v.color}">${sc}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

function renderCoexist(inputs){
  const species = activeSpecies();
  const selA = document.getElementById('coexist-a');
  const selB = document.getElementById('coexist-b');
  if(selA.dataset.habitat !== currentHabitat){
    const opts = species.map(sp=>`<option value="${sp.id}">${sp.name}</option>`).join('');
    selA.innerHTML = opts; selB.innerHTML = opts;
    selA.value = species[0].id;
    selB.value = species[1] ? species[1].id : species[0].id;
    selA.dataset.habitat = currentHabitat; selB.dataset.habitat = currentHabitat;
  }
  const spA = species.find(s=>s.id===selA.value) || species[0];
  const spB = species.find(s=>s.id===selB.value) || species[1] || species[0];

  const rA = scoreSpecies(spA, inputs);
  const rB = scoreSpecies(spB, inputs);
  const coexistScore = Math.round(Math.min(rA.total, rB.total)*0.6 + (rA.total+rB.total)/2*0.4);
  const v = verdict(coexistScore);

  const keys = Object.keys(spA.factors);
  const conflicts = keys.map(k=>({key:k, diff: Math.abs(rA.perFactor[k]-rB.perFactor[k])}))
    .sort((a,b)=>b.diff-a.diff).slice(0,3);

  document.getElementById('summary-line').textContent = `${spA.name} × ${spB.name} 동시 서식 가능성`;

  document.getElementById('coexist-result').innerHTML = `
    <div class="coexist-card">
      <div class="coexist-pair">
        <div class="coexist-sp"><span class="tag-name">${spA.name}</span><div class="score-num" style="color:${barColor(rA.total)}">${rA.total}</div></div>
        <div class="coexist-x">×</div>
        <div class="coexist-sp"><span class="tag-name">${spB.name}</span><div class="score-num" style="color:${barColor(rB.total)}">${rB.total}</div></div>
      </div>
      <div class="coexist-combined">
        <div class="combined-label">동시 서식 적합도</div>
        <div class="combined-num" style="color:${v.color}">${coexistScore}</div>
        <div class="combined-verdict">${v.text}</div>
      </div>
      <div class="conflict-title">조건 격차가 가장 큰 요소</div>
      ${conflicts.map(c=>`<div class="conflict-row"><span>${LABELS[c.key]}</span><span>${spA.name} ${Math.round(rA.perFactor[c.key]*100)}점 · ${spB.name} ${Math.round(rB.perFactor[c.key]*100)}점</span></div>`).join('')}
    </div>`;
}
