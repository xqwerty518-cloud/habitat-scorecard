---
name: ui-change
description: 화면 모양·레이아웃·색·버튼·아이콘·문구를 바꿀 때 사용. 디자인 토큰, SVG 아이콘, 간격, 라이트/다크, 390px 모바일 규칙.
---

# 화면 수정

## 규칙

- **색**: `css/style.css`의 `:root` 토큰(`--bg`, `--paper`, `--ink`, `--sage`, `--amber`, `--rust`, `--ocean`, `--line` 등)만 쓴다. 새 색이 꼭 필요하면 토큰을 추가하고 다크 값도 함께 정의한다. 다크 값은 두 곳에 있다: `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) }`와 `:root[data-theme="dark"]`. 둘 다 고친다.
- **아이콘**: 이모지 금지. 16×16 `viewBox`의 인라인 SVG, `stroke="currentColor"`(또는 `fill`), 클래스 `btn-icon`. 기존 버튼(`index.html`의 공유·내보내기)과 선 굵기(1.3~1.6)를 맞춘다. 아이콘만 있는 버튼은 `title`과 `aria-label`을 단다.
- **간격**: flex `gap`과 padding으로. `position:fixed`/`absolute`로 띄워 겹치게 하지 않는다. 버튼끼리, 버튼과 캔버스 사이 여백을 사용자가 민감하게 본다. 기존 비슷한 요소의 gap 값을 그대로 따른다.
- **모바일**: 390px에서 가로 스크롤 금지. 표·칩 줄·긴 버튼 줄은 `flex-wrap` 또는 `overflow-x:auto`를 그 요소 안에만 준다. 고정 `width`(px) 대신 `max-width`/`min-width:0`.
- **문구**: 한국어, 존댓말 "~해요/~합니다" 톤은 주변 문구에 맞춘다. 종 수처럼 데이터에서 나오는 숫자를 새로 하드코딩하지 않는다 (JS에서 계산해 넣는다).
- **innerHTML에 데이터를 넣을 때** 사용자 입력이나 외부 데이터는 `escapeHtml()`(`js/core.js`)로 감싼다.

## 순서

1. 바꿀 요소를 `index.html`/`css/style.css`에서 찾고, 같은 종류의 기존 요소를 먼저 읽는다.
2. 수정.
3. `check-site` 스킬. 특히 `dark-calc.png`, `mobile-calc.png`와 바뀐 모드 스크린샷을 연다. 다크 모드에서 다른 모드를 바꿨다면 내장 브라우저로 직접 확인.
