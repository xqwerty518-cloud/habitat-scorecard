---
name: check-site
description: 코드나 스타일을 바꾼 뒤 커밋 전에 사용. 문법 검사, 헤드리스 브라우저 스모크 테스트, 스크린샷 눈 확인까지.
---

# 변경 검증

## 1. 자동 검사

```bash
npm test
```

처음이면 먼저 `npm install && npx playwright install chromium`.

`npm test`는 두 단계:
- `npm run check`: 모든 `js/*.js`에 `node --check`
- `tests/smoke.mjs`: 페이지를 열어 육상/해양 × 5개 모드를 모두 돌리고 확인
  - JS 오류 0개
  - 카드 수 = `LAND_SPECIES.length` / `MARINE_SPECIES.length`
  - 전체 종 목록 행 수 = `FULL_SPECIES_LIST.length`
  - 390px 폭에서 가로 스크롤 없음

네트워크가 막힌 환경에서는 three.min.js와 jspdf.umd.min.js를 한 폴더에 받아 두고 `OFFLINE_LIBS=그폴더 node tests/smoke.mjs`로 실행.

실패하면 고치고 다시 돌린다. 테스트를 느슨하게 바꿔서 통과시키지 않는다.

## 2. 눈으로 확인

`tests/screenshots/`에 저장된 이미지 중 **바뀐 부분이 보이는 것**을 직접 열어 본다:

- `land-calc.png`, `marine-calc.png`: 카드, 점수, 슬라이더
- `land-twin.png`, `marine-twin.png`: 3D 장면. 생물이 보이는지, 수면에 가려지지 않는지
- `dark-calc.png`: 다크 모드 대비와 색
- `mobile-calc.png`: 모바일 레이아웃

볼 것: 버튼끼리 붙어 있지 않은지, 필터 칩과 캔버스 사이 여백, 글자 잘림, 다크 모드에서 안 보이는 글자.

헤드리스 브라우저는 소프트웨어 WebGL이라 3D 색이 실제보다 흐리게 나온다. 색감 판단은 `npm run dev`로 실제 브라우저에서.

## 3. 보고

사용자에게는 결과만 짧게: 무엇을 바꿨고, 테스트가 통과했는지, 눈으로 확인한 화면에 문제가 없었는지.
