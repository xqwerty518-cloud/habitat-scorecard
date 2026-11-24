# 서식지 적합도 스코어카드

멸종위기 야생생물의 서식지 적합도를 계산·시각화하는 정적 웹 앱. 빌드 과정 없음.
배포: GitHub `main`에 push하면 Vercel이 자동으로 프로덕션 배포 (https://habitat-scorecard.vercel.app).

사용자는 한국어로 소통한다. 답변·커밋 설명은 한국어로, 코드 식별자는 영어로.

## 답변 스타일 (토큰 절약)

- 짧게. 인사·맞장구·작업 예고("이제 ~하겠습니다")·끝맺음 요약 반복을 하지 않는다.
- 결과 위주: 바꾼 것, 테스트 결과, 남은 문제. 사용자가 묻지 않은 배경 설명은 생략.
- 코드는 바뀐 부분만 보여준다. 파일 전체를 다시 출력하지 않는다.
- 파일은 필요한 부분만 읽는다 (`grep`으로 위치를 찾고 해당 줄만). `species.js` 282종 목록처럼 큰 데이터는 통째로 읽지 않는다.
- 스크린샷은 바뀐 화면만 연다.

## 구조

- `index.html` — 마크업만. 스크립트는 아래 순서로 로드되며 **순서가 중요하다** (전역 변수/함수를 공유하는 일반 `<script>`, 모듈 아님).
  1. `js/data/species.js` — 환경 변수 키/라벨/기본값, `LAND_SPECIES`, `MARINE_SPECIES`, `FULL_SPECIES_LIST`(282종), `SEASON_CURVES`
  2. `js/core.js` — 상태 변수, 점수 계산(`factorScore`, `scoreSpecies`), 카드·비교·공존·전체 목록 렌더링
  3. `js/twin.js` — Three.js 디지털 트윈 (`buildCreature`, `initTwin`, `updateTwin`)
  4. `js/app.js` — `render()` 디스패처, 테마, 공유 링크, PDF, 지점 저장, **맨 아래 초기화 코드**
- `css/style.css` — 모든 스타일. 색은 `:root` CSS 변수 토큰으로만.
- 외부 라이브러리: three.js r128, jsPDF 2.5.1 (cdnjs). 버전 올리지 말 것 (r128 API 기준으로 작성됨).

새 파일을 추가하면 `index.html`의 스크립트 순서에 넣고, 초기화 시점에 실행되는 코드는 `app.js` 맨 아래에만 둔다.

## 반드시 지킬 것

- **데이터를 지어내지 않는다.** 종의 서식 수치(`factors`)는 출처(국립생태원, 환경부, 논문, IUCN 등)를 찾아 근거가 있을 때만 추가한다. 근거를 못 찾으면 추가하지 말고 사용자에게 말한다. 종 추가는 `add-species` 스킬을 따른다.
- **이모지를 UI 아이콘으로 쓰지 않는다.** 아이콘은 `currentColor`를 쓰는 인라인 SVG (`btn-icon` 클래스). 이전에 "AI가 만든 티 난다"는 피드백으로 전부 제거했다.
- **라이트/다크 모드 둘 다** 확인한다. 색 하드코딩 금지, `--bg`, `--paper`, `--ink`, `--sage`, `--amber`, `--rust`, `--ocean`, `--line` 등 토큰 사용.
- **모바일(390px)에서 가로 스크롤이 생기면 안 된다.** 스모크 테스트가 검사한다.
- Three.js 반투명 재질에는 `depthWrite:false`. 빠뜨리면 해양 모드에서 수면이 생물을 가리는 버그가 재발한다.
- 3D 생물의 꼬리·목처럼 방향 있는 부품은 `putDir()`(방향 벡터)로 배치. 오일러 각을 손으로 맞추다가 꼬리가 거꾸로 붙는 버그가 있었다.
- 버튼끼리, 버튼과 캔버스 사이 여백을 사용자가 민감하게 본다. 간격은 flex `gap`/padding으로, `position:fixed`로 겹치게 띄우지 않는다.

## 스킬 (`.claude/skills/`)

| 작업 | 스킬 |
|---|---|
| 종 추가 / 기존 종 데이터 수정 | `add-species` / `update-species` |
| 화면·스타일 수정 | `ui-change` |
| 3D 생물 모양 | `edit-creature` |
| 새 기능 | `add-feature` |
| 검증 (커밋 전 항상) | `check-site` |
| 보안 점검 / 접근성·성능·SEO 점검 | `security-check` / `web-quality` |
| 배포·되돌리기 | `deploy` |

## 작업 흐름

1. 수정
2. `npm test` — 문법 검사 + 헤드리스 브라우저 스모크 테스트 (`check-site` 스킬 참고)
3. 바뀐 화면은 `tests/screenshots/`의 스크린샷을 직접 열어서 눈으로 확인
4. 커밋 → `main` push → 배포 확인 (`deploy` 스킬 참고)

로컬 미리보기: `npm run dev` → http://localhost:3000
