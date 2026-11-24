// 렌더 디스패처, 테마, 공유, PDF, 지점 저장, 초기화
function render(){
  const inputs = readInputs();
  updateLabels(inputs);
  document.getElementById('interpret-line').textContent = interpret(inputs);
  if(currentMode==='calc') renderCalc(inputs);
  else if(currentMode==='compare') renderCompare();
  else if(currentMode==='coexist') renderCoexist(inputs);
  else if(currentMode==='twin'){ if(twin) updateTwin(inputs); }
}



function resetAll(){
  const defaults = currentHabitat === 'land' ? LAND_DEFAULTS : MARINE_DEFAULTS;
  ACTIVE_KEYS.forEach(f=>{ document.getElementById(f).value = defaults[f]; });
  render();
}

// ---- 토스트 알림 ----
function toast(msg, kind){
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast' + (kind === 'error' ? ' toast-error' : '');
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(()=> t.classList.add('show'));
  setTimeout(()=>{
    t.classList.remove('show');
    setTimeout(()=> t.remove(), 300);
  }, 2800);
}

// ---- 테마 토글 ----
function effectiveTheme(){
  const explicit = document.documentElement.getAttribute('data-theme');
  if(explicit) return explicit;
  return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
}
const ICON_MOON = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M13 8.7A5.3 5.3 0 1 1 7.3 3a4.2 4.2 0 1 0 5.7 5.7z"/></svg>';
const ICON_SUN = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4"/></svg>';
function updateThemeIcon(){
  const icon = effectiveTheme() === 'dark' ? ICON_SUN : ICON_MOON;
  const a = document.getElementById('theme-toggle-header');
  const b = document.getElementById('theme-toggle-sticky');
  if(a) a.innerHTML = icon;
  if(b) b.innerHTML = icon;
}
function toggleTheme(){
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  updateThemeIcon();
}

// ---- 공유 링크 ----
function updateShareHash(){
  const state = { h: currentHabitat, m: currentMode, v: readInputs() };
  try{
    history.replaceState(null, '', '#s=' + encodeURIComponent(JSON.stringify(state)));
  }catch(e){}
}
function restoreFromHash(){
  if(!location.hash.startsWith('#s=')) return;
  try{
    const state = JSON.parse(decodeURIComponent(location.hash.slice(3)));
    if(state.h === 'land' || state.h === 'marine'){
      currentHabitat = state.h;
      ACTIVE_KEYS = state.h === 'land' ? LAND_KEYS : MARINE_KEYS;
    }
    if(state.m === 'calc' || state.m === 'compare' || state.m === 'coexist' || state.m === 'twin' || state.m === 'directory') currentMode = state.m;
    // URL은 누구나 조작할 수 있으므로 현재 서식지의 슬라이더 키와 숫자 값만 받는다
    // (범위 밖 값은 range input이 min/max로 자른다)
    if(state.v && typeof state.v === 'object'){
      ACTIVE_KEYS.forEach(k=>{
        const n = Number(state.v[k]);
        if(Number.isFinite(n)) document.getElementById(k).value = n;
      });
    }
  }catch(e){ /* 무시하고 기본값으로 진행 */ }
}
async function shareLink(){
  updateShareHash();
  const url = location.href;
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(url);
      toast('지금 조건의 링크를 복사했습니다');
      return;
    }
    throw new Error('no clipboard api');
  }catch(e){
    toast('복사에 실패했어요. 주소창의 링크를 직접 복사해주세요.', 'error');
  }
}

// ---- PDF 리포트 내보내기 ----
function reportFilename(){
  const hab = currentHabitat === 'land' ? '육상담수' : '해양';
  const date = new Date().toISOString().slice(0,10);
  return `서식지적합도리포트_${hab}_${date}.pdf`;
}

function buildReportPdfBlob(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const marginX = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 56;

  function ensureSpace(h){ if(y + h > pageH - 48){ doc.addPage(); y = 56; } }
  function heading(text, size){
    ensureSpace(size + 10);
    doc.setFont('helvetica','bold'); doc.setFontSize(size); doc.setTextColor(45,55,42);
    doc.text(text, marginX, y);
    y += size + 8;
  }
  function body(text, size){
    size = size || 10.5;
    doc.setFont('helvetica','normal'); doc.setFontSize(size); doc.setTextColor(85,90,78);
    const lines = doc.splitTextToSize(String(text), pageW - marginX*2);
    lines.forEach(line=>{ ensureSpace(size+4); doc.text(line, marginX, y); y += size+4; });
  }
  function ruleLine(){ ensureSpace(10); doc.setDrawColor(200,198,180); doc.line(marginX, y, pageW-marginX, y); y += 14; }

  const inputs = readInputs();

  heading('서식지 적합도 리포트', 18);
  body(new Date().toLocaleString('ko-KR') + '   ·   ' + (currentHabitat==='land' ? '육상·담수 생태계' : '해양 생태계'), 9.5);
  y += 4;
  body(interpret(inputs), 11);
  ruleLine();

  heading('입력한 환경 변수', 12);
  ACTIVE_KEYS.forEach(k=>{ body(`${LABELS[k]}: ${inputs[k]}`, 10); });
  y += 6;
  ruleLine();

  if(currentMode === 'calc' || currentMode === 'twin'){
    heading('종별 적합도', 12);
    const results = activeSpecies().map(sp=>({ sp, ...scoreSpecies(sp, inputs) })).sort((a,b)=>b.total-a.total);
    results.forEach((r,i)=>{
      const v = verdict(r.total);
      body(`${i+1}. ${r.sp.name} (${r.sp.latin}) — ${r.total}점, ${v.text}`, 10.5);
    });
    if(currentMode === 'twin'){ y += 4; body('(디지털 트윈 탭의 3D 시각화는 PDF에 포함되지 않습니다.)', 9); }
  } else if(currentMode === 'compare'){
    heading('지점 비교', 12);
    const sites = savedSites.filter(s=>s.habitat===currentHabitat);
    if(sites.length===0){
      body('저장된 지점이 없습니다.', 10.5);
    } else {
      activeSpecies().forEach(sp=>{
        const line = sites.map(s=>`${s.name} ${scoreSpecies(sp, s.inputs).total}점`).join('   ·   ');
        body(`${sp.name}: ${line}`, 10);
      });
    }
  } else if(currentMode === 'directory'){
    heading('전체 종 목록 (필터링된 결과)', 12);
    const q = document.getElementById('dir-search').value.trim();
    const clsF = document.getElementById('dir-class').value;
    const gradeF = document.getElementById('dir-grade').value;
    const rows = FULL_SPECIES_LIST.filter(r=>{
      if(q && !r.n.includes(q)) return false;
      if(clsF!=='all' && r.c!==clsF) return false;
      if(gradeF!=='all' && r.g!==gradeF) return false;
      return true;
    });
    rows.forEach(r=>{ body(`${r.n} — ${r.c}, ${r.g}급${MODELED_MAP[r.n] ? ' (적합도 계산 가능)' : ''}`, 9.5); });
  } else {
    heading('공존 분석', 12);
    const species = activeSpecies();
    const selA = document.getElementById('coexist-a').value;
    const selB = document.getElementById('coexist-b').value;
    const spA = species.find(s=>s.id===selA) || species[0];
    const spB = species.find(s=>s.id===selB) || species[1] || species[0];
    const rA = scoreSpecies(spA, inputs), rB = scoreSpecies(spB, inputs);
    const coexistScore = Math.round(Math.min(rA.total,rB.total)*0.6 + (rA.total+rB.total)/2*0.4);
    body(`${spA.name} ${rA.total}점   ×   ${spB.name} ${rB.total}점`, 11);
    body(`동시 서식 적합도: ${coexistScore}점 (${verdict(coexistScore).text})`, 11);
  }

  y += 10;
  ruleLine();
  body('점수는 각 종의 일반적인 서식 조건 문헌값을 단순화한 시연용 모델의 참고값이며, 실제 보전 의사결정에는 현장 검증과 전문가 자문이 필요합니다.', 8.5);

  return doc.output('blob');
}

async function exportReport(){
  if(!window.jspdf){
    try{ window.print(); }catch(e){}
    toast('PDF 도구를 불러오지 못해 인쇄 대화상자로 대신합니다.', 'error');
    return;
  }

  let blob;
  try{
    blob = buildReportPdfBlob();
  }catch(e){
    console.warn('pdf build failed', e);
    toast('리포트 생성에 실패했어요.', 'error');
    return;
  }

  let downloadsNs = null;
  try{
    if(window.claude && typeof window.claude.use === 'function'){
      downloadsNs = await window.claude.use('downloads');
    }
  }catch(e){}

  if(downloadsNs){
    try{
      const res = await downloadsNs.save({ filename: reportFilename(), data: blob });
      toast(res.status === 'saved' ? 'PDF로 저장했습니다.' : 'PDF를 전달했습니다.');
      return;
    }catch(e){
      if(e && e.code === 'declined') return;
      console.warn('download failed', e);
    }
  }

  try{
    window.print();
    toast('이 화면에서는 인쇄 대화상자로 내보냅니다.');
  }catch(e){
    toast('이 화면에서는 내보내기가 지원되지 않아요. 발행된 링크에서 열어보세요.', 'error');
  }
}

// ---- 지점 저장 모달 (native prompt() 대신 자체 UI 사용) ----
let pendingSite = null;
function saveSite(){
  pendingSite = { habitat: currentHabitat, inputs: readInputs() };
  const input = document.getElementById('site-name-input');
  input.value = '';
  document.getElementById('name-modal').style.display = 'flex';
  input.focus();
}
function cancelSiteModal(){
  document.getElementById('name-modal').style.display = 'none';
  pendingSite = null;
}
async function confirmSiteModal(){
  if(!pendingSite) return;
  const raw = document.getElementById('site-name-input').value.trim();
  const name = (raw || '이름 없는 지점').slice(0,30);
  const site = Object.assign({ name }, pendingSite);
  document.getElementById('name-modal').style.display = 'none';
  pendingSite = null;

  if(backendDb && backendUserId){
    try{
      await sitesCol().add(Object.assign({}, site, { createdAt: Date.now() }));
      toast(`"${name}" 지점을 계정에 저장했습니다`);
      return;
    }catch(e){ console.warn('site save failed, falling back to session-only', e); }
  }
  savedSites.push(Object.assign({ id:'site-'+Date.now() }, site));
  toast(`"${name}" 지점을 저장했습니다 (이 세션에만)`);
  if(currentMode==='compare') render();
}
document.getElementById('site-name-input').addEventListener('keydown', e=>{
  if(e.key === 'Enter') confirmSiteModal();
  if(e.key === 'Escape') cancelSiteModal();
});
document.getElementById('name-modal').addEventListener('click', e=>{
  if(e.target.id === 'name-modal') cancelSiteModal();
});

function removeSite(id){
  if(backendDb && backendUserId){
    sitesCol().doc(id).delete().catch(e=>console.warn('delete failed', e));
    toast('지점을 삭제했습니다');
    return;
  }
  savedSites = savedSites.filter(s=>s.id!==id);
  toast('지점을 삭제했습니다');
  render();
}

// ---- 백엔드(db 캡ability): 발행된 링크에서 열었을 때만 활성화됨 ----
let backendDb = null, backendUserId = null;
function sitesCol(){ return backendDb.collection('data/users/' + backendUserId); }
function setBackendStatus(text){
  const el = document.getElementById('backend-status');
  if(el) el.textContent = text;
}
async function initBackend(){
  try{
    const c = window.claude;
    if(!c || typeof c.use !== 'function') return;
    const [dbNs, userNs] = await Promise.all([c.use('db'), c.use('user')]);
    if(!dbNs || !userNs) return;
    const id = await userNs.id();
    if(!id) return;
    backendDb = dbNs; backendUserId = id;
    sitesCol().onSnapshot(
      snap=>{
        savedSites = snap.docs.filter(d=>d.exists).map(d=>Object.assign({id:d.id}, d.data()));
        if(currentMode==='compare') render();
      },
      err=>{ console.warn('site sync error', err); }
    );
    if(currentMode==='compare') setBackendStatus('계정에 자동 저장됩니다');
  } catch(e){ console.warn('backend unavailable', e); }
}

function switchHabitat(h){
  if(h === currentHabitat) return;
  stopSeason();
  hideTwinInfo();
  currentHabitat = h;
  ACTIVE_KEYS = h === 'land' ? LAND_KEYS : MARINE_KEYS;
  document.getElementById('tab-land').classList.toggle('active', h==='land');
  document.getElementById('tab-marine').classList.toggle('active', h==='marine');
  document.getElementById('land-fields').style.display = h==='land' ? '' : 'none';
  document.getElementById('marine-fields').style.display = h==='marine' ? '' : 'none';
  initCards(activeSpecies());
  render();
}

function switchMode(m){
  if(m === currentMode) return;
  if(m !== 'calc') stopSeason();
  if(currentMode === 'twin') stopTwin();
  hideTwinInfo();
  currentMode = m;
  ['calc','compare','coexist','twin','directory'].forEach(k=>{
    document.getElementById('mode-'+k).classList.toggle('active', k===m);
    document.getElementById('view-'+k).style.display = k===m ? '' : 'none';
  });
  document.getElementById('calc-actions').style.display = m==='calc' ? 'flex' : 'none';
  document.getElementById('results-title').textContent =
    m==='calc' ? '종별 적합도' : m==='compare' ? '지점 비교' : m==='coexist' ? '공존 분석' : m==='twin' ? '디지털 트윈' : '전체 종 목록';
  setBackendStatus(m==='compare' ? (backendDb ? '계정에 자동 저장됩니다' : '이 브라우저 세션에만 저장됩니다 (발행된 링크에서 열면 계정에 저장돼요)') : '');
  if(m === 'twin'){ startTwin(); }
  if(m !== 'directory') render();
}

function stepSeason(){
  const curve = SEASON_CURVES[currentHabitat];
  if(currentHabitat==='land'){
    document.getElementById('temp').value = curve.temp[seasonMonth];
    document.getElementById('hum').value = curve.hum[seasonMonth];
  } else {
    document.getElementById('wtemp').value = curve.wtemp[seasonMonth];
  }
  document.getElementById('season-label').textContent = (seasonMonth+1) + '월';
  render();
  seasonMonth = (seasonMonth+1) % 12;
}
const ICON_CALENDAR = '<svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3.3" width="12" height="10.7" rx="1.2"/><path d="M2 6.3h12M5.3 2v2.6M10.7 2v2.6"/></svg>';
const ICON_PAUSE = '<svg class="btn-icon" viewBox="0 0 16 16" fill="currentColor"><rect x="3.5" y="2.5" width="3" height="11" rx="0.8"/><rect x="9.5" y="2.5" width="3" height="11" rx="0.8"/></svg>';
function toggleSeason(){
  if(seasonTimer){ stopSeason(); return; }
  document.getElementById('season-btn').innerHTML = ICON_PAUSE + '재생 중지';
  seasonMonth = 0;
  stepSeason();
  seasonTimer = setInterval(stepSeason, 700);
}
function stopSeason(){
  if(seasonTimer){ clearInterval(seasonTimer); seasonTimer = null; }
  document.getElementById('season-btn').innerHTML = ICON_CALENDAR + '계절 재생';
  document.getElementById('season-label').textContent = '';
}

// ---- 스크롤 시 상단 고정 바 ----
window.addEventListener('scroll', ()=>{
  const bar = document.getElementById('sticky-bar');
  if(window.scrollY > 220) bar.classList.add('visible'); else bar.classList.remove('visible');
}, { passive:true });

[...LAND_KEYS, ...MARINE_KEYS].forEach(f=>{
  document.getElementById(f).addEventListener('input', render);
});
document.getElementById('coexist-a').addEventListener('change', render);
document.getElementById('coexist-b').addEventListener('change', render);

// 동적으로 그리는 버튼은 onclick 문자열 대신 data- 속성 + 이벤트 위임으로 처리
document.getElementById('dir-tbody').addEventListener('click', e=>{
  const btn = e.target.closest('.dir-link');
  if(btn) jumpToSpecies(btn.dataset.id);
});
document.getElementById('compare-table-wrap').addEventListener('click', e=>{
  const btn = e.target.closest('.site-x');
  if(btn) removeSite(btn.dataset.id);
});
document.getElementById('twin-filters').addEventListener('click', e=>{
  const btn = e.target.closest('.twin-chip');
  if(btn) toggleTwinClass(btn.dataset.cls);
});

// ---- 초기화 ----
updateThemeIcon();
restoreFromHash();
document.getElementById('tab-land').classList.toggle('active', currentHabitat==='land');
document.getElementById('tab-marine').classList.toggle('active', currentHabitat==='marine');
document.getElementById('land-fields').style.display = currentHabitat==='land' ? '' : 'none';
document.getElementById('marine-fields').style.display = currentHabitat==='marine' ? '' : 'none';
['calc','compare','coexist','twin','directory'].forEach(k=>{
  document.getElementById('mode-'+k).classList.toggle('active', k===currentMode);
  document.getElementById('view-'+k).style.display = k===currentMode ? '' : 'none';
});
document.getElementById('calc-actions').style.display = currentMode==='calc' ? 'flex' : 'none';
document.getElementById('results-title').textContent =
  currentMode==='calc' ? '종별 적합도' : currentMode==='compare' ? '지점 비교' : currentMode==='coexist' ? '공존 분석' : currentMode==='twin' ? '디지털 트윈' : '전체 종 목록';

initCards(activeSpecies());
initDirectory();
render();
initBackend();
