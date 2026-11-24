// 스모크 테스트: 페이지를 헤드리스 브라우저로 열어 모든 모드/서식지를 한 번씩 돌려보고
// 자바스크립트 오류가 없는지, 카드/목록 개수가 맞는지 확인합니다.
// 실행: npm test   (처음 한 번은 npx playwright install chromium 필요)
// 스크린샷은 tests/screenshots/ 에 저장됩니다 (git에는 올라가지 않음).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'tests', 'screenshots');
// 네트워크가 막힌 환경용: 로컬에 받아둔 three.min.js / jspdf.umd.min.js 경로
const OFFLINE = process.env.OFFLINE_LIBS;

fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.route('**/*', route => {
  const url = route.request().url();
  if (url.startsWith('http://local/')) {
    const rel = decodeURIComponent(url.slice('http://local/'.length).split('#')[0].split('?')[0]) || 'index.html';
    const file = path.join(ROOT, rel);
    return fs.existsSync(file) ? route.fulfill({ path: file }) : route.fulfill({ status: 404 });
  }
  if (OFFLINE && url.includes('three.min.js')) return route.fulfill({ path: path.join(OFFLINE, 'three.min.js'), contentType: 'text/javascript' });
  if (OFFLINE && url.includes('jspdf')) return route.fulfill({ path: path.join(OFFLINE, 'jspdf.umd.min.js'), contentType: 'text/javascript' });
  if (OFFLINE) return route.abort();
  return route.continue();
});

const fail = [];
const check = (cond, msg) => { if (!cond) fail.push(msg); };

await page.goto('http://local/index.html');
await page.waitForTimeout(800);

const landExpected = await page.evaluate(() => LAND_SPECIES.length);
const marineExpected = await page.evaluate(() => MARINE_SPECIES.length);
const fullCount = await page.evaluate(() => FULL_SPECIES_LIST.length);

check(await page.$$eval('#cards > *', e => e.length) === landExpected, `육상 카드 수가 ${landExpected}개가 아님`);

// 계산 가능한 종의 이름이 전체 목록과 정확히 일치해야 "적합도 보기" 링크가 생김
const unmatched = await page.evaluate(() => {
  const names = new Set(FULL_SPECIES_LIST.map(r => r.n));
  // 해양수산부 보호대상해양생물은 환경부 멸종위기 목록에 없는 게 정상
  return [...LAND_SPECIES, ...MARINE_SPECIES]
    .filter(sp => !names.has(sp.name) && !sp.status.includes('해양수산부'))
    .map(sp => sp.name);
});
check(unmatched.length === 0, `전체 종 목록에 없는 이름: ${unmatched.join(', ')}`);
const ids = await page.evaluate(() => [...LAND_SPECIES, ...MARINE_SPECIES].map(sp => sp.id));
check(new Set(ids).size === ids.length, '종 id가 중복됨');

// index.html에 하드코딩된 종 수 표기가 실제 데이터와 맞는지 (종 추가 후 빠뜨리기 쉬움)
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const total = landExpected + marineExpected;
for (const phrase of [`${total}종 · 2개 생태계`, `육상·담수 ${landExpected}종, 해양 ${marineExpected}종`, `이 중 ${total}종만`]) {
  check(html.includes(phrase), `index.html의 종 수 표기가 데이터와 다름 (기대: "${phrase}")`);
}

for (const habitat of ['land', 'marine']) {
  await page.click('#tab-' + habitat);
  await page.waitForTimeout(300);
  for (const mode of ['calc', 'compare', 'coexist', 'twin', 'directory']) {
    await page.click('#mode-' + mode);
    await page.waitForTimeout(mode === 'twin' ? 700 : 250);
    await page.screenshot({ path: path.join(SHOTS, `${habitat}-${mode}.png`) });
  }
}
check(await page.$$eval('#cards > *', e => e.length) === marineExpected, `해양 카드 수가 ${marineExpected}개가 아님`);
check(await page.$$eval('#view-directory tr', e => e.length) === fullCount + 1, `전체 종 목록 행 수가 ${fullCount}종이 아님`);

// 다크 모드
await page.emulateMedia({ colorScheme: 'dark' });
await page.click('#tab-land');
await page.click('#mode-calc');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(SHOTS, 'dark-calc.png') });

// 모바일 폭
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(SHOTS, 'mobile-calc.png'), fullPage: true });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check(!overflow, '모바일 폭에서 가로 스크롤이 생김');

await browser.close();

errors.forEach(e => fail.push('JS 오류: ' + e));
if (fail.length) {
  console.error('실패:\n- ' + fail.join('\n- '));
  process.exit(1);
}
console.log(`통과: 육상 ${landExpected}종, 해양 ${marineExpected}종, 전체 목록 ${fullCount}종, 모든 모드 오류 없음`);
console.log(`스크린샷: ${SHOTS}`);
