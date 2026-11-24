---
name: check-site
description: 코드나 스타일을 바꾼 뒤 커밋 전에 사용. 문법 검사, 헤드리스 브라우저 스모크 테스트, 스크린샷 눈 확인까지.
---

# 변경 검증

## 1. 자동 검사

```bash
npm test
```

- Node.js 18 이상 필요. `node`가 없으면 사용자에게 설치를 안내하고, 테스트를 못 돌렸다고 보고한다 (통과했다고 말하지 않는다).
- 처음이면 먼저 `npm install` 후 `npx playwright install chromium`.

`npm test`는 두 단계:
- `npm run check` (`tests/check-syntax.mjs`): `js/` 아래 모든 `.js`에 `node --check`
- `tests/smoke.mjs`: 페이지를 열어 육상/해양 × 5개 모드를 모두 돌리고 확인
  - JS 오류 0개
  - 카드 수 = `LAND_SPECIES.length` / `MARINE_SPECIES.length`
  - 계산 가능한 종의 이름이 `FULL_SPECIES_LIST`에 있음, id 중복 없음
  - `index.html`의 하드코딩된 종 수 표기(17종, 육상·담수 13종 등)가 데이터와 같음
  - 전체 종 목록 행 수 = `FULL_SPECIES_LIST.length`
  - 390px 폭에서 가로 스크롤 없음

네트워크가 막힌 환경에서는 three.min.js와 jspdf.umd.min.js를 한 폴더에 받아 두고 `OFFLINE_LIBS=그폴더 node tests/smoke.mjs`로 실행 (PowerShell: `$env:OFFLINE_LIBS='그폴더'; node tests/smoke.mjs`).

실패하면 고치고 다시 돌린다. **테스트를 느슨하게 바꿔서 통과시키지 않는다.**

## 2. 눈으로 확인

`tests/screenshots/`에서 **바뀐 부분이 보이는 것만** Read 도구로 열어 본다 (전부 열면 토큰 낭비):

| 파일 | 볼 것 |
|---|---|
| `land-calc.png`, `marine-calc.png` | 카드, 점수, 슬라이더 |
| `land-compare.png`, `land-coexist.png` (해양도 같음) | 비교 표, 공존 결과 |
| `land-twin.png`, `marine-twin.png` | 3D 장면. 생물이 보이는지, 수면에 가려지지 않는지 |
| `land-directory.png` | 전체 종 목록 표 |
| `dark-calc.png` | 다크 모드 대비와 색 |
| `mobile-calc.png` | 390px 모바일 레이아웃 (전체 페이지) |

볼 것: 버튼끼리 붙어 있지 않은지, 필터 칩과 캔버스 사이 여백, 글자 잘림, 다크 모드에서 안 보이는 글자.

스크린샷에 없는 상태(모달, 토스트, 다크 모드의 다른 모드 등)를 바꿨다면 `npm run dev` 후 내장 브라우저로 직접 열어 확인한다.

헤드리스 브라우저는 소프트웨어 WebGL이라 3D 색이 실제보다 흐리게 나온다. 색감 판단은 실제 브라우저에서.

## 3. 보고

결과만 짧게: 무엇을 바꿨고, 테스트가 통과했는지, 눈으로 확인한 화면에 문제가 없었는지. 못 한 단계가 있으면 그것도.
