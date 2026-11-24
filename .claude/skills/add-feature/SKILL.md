---
name: add-feature
description: 새 기능(모드, 버튼, 환경 변수, 내보내기 항목, 패널 등)을 추가할 때 사용. 파일 배치, 스크립트 순서, 초기화 위치, 상태·공유 링크 연결, 테스트 보강.
---

# 기능 추가

## 1. 어디에 둘지

| 내용 | 파일 |
|---|---|
| 종·환경 변수 데이터 | `js/data/species.js` |
| 점수 계산, 카드·비교·공존·목록 렌더링 | `js/core.js` |
| 3D | `js/twin.js` |
| 모드 전환, 테마, 공유, PDF, 지점 저장, 이벤트 연결 | `js/app.js` |
| 마크업 | `index.html` |
| 스타일 | `css/style.css` |

- 모두 일반 `<script>`로 전역을 공유한다 (ES 모듈 아님). 앞 파일이 뒤 파일 함수를 **로드 시점에** 부르면 안 된다.
- 새 JS 파일은 `index.html` 하단 스크립트 목록의 알맞은 위치에 넣는다.
- 페이지 로드 때 실행되는 코드(이벤트 연결, 초기 렌더)는 `js/app.js` **맨 아래 초기화 블록**에만.
- 외부 라이브러리는 꼭 필요할 때만, cdnjs에서 버전 고정. 기존 three.js r128·jsPDF 2.5.1은 올리지 않는다.

## 2. 연결해야 하는 곳

**새 모드(탭)를 추가하면** 모드 목록이 여러 곳에 하드코딩돼 있으니 모두 고친다:
- `index.html`: `#mode-xxx` 버튼, `#view-xxx` 영역
- `js/app.js`: `render()` 분기, `switchMode()`의 목록과 `results-title`, `restoreFromHash()`의 허용 목록, 맨 아래 초기화 블록의 목록과 제목
- `tests/smoke.mjs`: 모드 순회 배열

**새 환경 변수(슬라이더)를 추가하면**: `species.js`의 키·라벨·기본값, `index.html` 필드(`aria-label` 포함), `updateLabels`, 기존 종 `factors`(근거가 없으면 해당 종에 넣지 않음 — 데이터를 지어내지 않는다), PDF 보고서, 공유 링크 복원.

**상태를 추가하면**: 공유 링크(`updateShareHash`/`restoreFromHash`)에 담을지 결정. 복원할 때는 허용 값만 받는다 (URL은 누구나 조작 가능).

## 3. 규칙

- UI는 `ui-change` 스킬 규칙(토큰, SVG 아이콘, gap 간격, 다크, 390px)을 따른다.
- 사용자 입력·URL 값을 `innerHTML`에 넣으면 `escapeHtml()`.
- 계절 재생·3D 루프처럼 타이머가 있는 기능은 모드 전환 시 멈추게 한다 (`stopSeason()`, `stopTwin()` 참고).

## 4. 검증

- 스모크 테스트가 새 기능을 최소한 한 번 실행하도록 `tests/smoke.mjs`에 한두 줄 추가 (클릭 후 오류 없음, 요소 존재 등). 필요하면 스크린샷도.
- `check-site` 스킬.
- 큰 기능이면 `deploy` 스킬의 "큰 변경은 브랜치로"를 따른다.
