---
name: web-quality
description: 웹사이트 품질 점검. 접근성(키보드·스크린리더·대비), 성능(로딩·3D), 검색·공유 미리보기(SEO, OG 태그, 파비콘)를 확인하거나 개선할 때 사용.
---

# 웹 품질 점검

`npm run dev` 후 내장 브라우저(http://localhost:3000)로 확인한다. 고칠 때는 `ui-change` 규칙을 따른다.

## 1. 접근성

- 아이콘만 있는 버튼(테마 전환, 지점 삭제 ×)에 `aria-label`이 있는지. `title`만으로는 부족.
- 슬라이더는 `<label for>`와 `aria-label`이 있는지 (현재 패턴 유지).
- 키보드만으로 탭·모드 전환·저장 모달(Enter/Esc)·공유가 되는지. 포커스 표시(`:focus-visible`)가 보이는지.
- 색 대비: 본문 4.5:1, 큰 글자·아이콘 3:1. **라이트와 다크 둘 다.** 점수 색(`--sage`/`--amber`/`--rust`)만으로 의미를 전달하지 않는지 (숫자·문구 병기).
- `<html lang="ko">`, 제목 계층(h1 → h2) 순서.
- 3D 캔버스는 시각 전용이므로 같은 정보가 카드·목록에도 있는지.

## 2. 성능

- 첫 화면은 계산기다. three.js(약 600KB)는 디지털 트윈에서만 필요하므로 지연 로드를 제안할 수 있다. 단, 바꾸면 `initTwin()`의 `typeof THREE` 확인과 스모크 테스트가 그대로 동작하는지 확인.
- 3D 루프(`animateTwinFrame`)가 다른 모드에서 멈추는지(`stopTwin`), 탭이 숨겨졌을 때 돌지 않는지.
- 슬라이더 `input` 이벤트마다 `render()` 전체가 도는데, 느려지면 `requestAnimationFrame`으로 묶는다.
- 폰트: Google Fonts `display=swap` 유지, 굵기는 실제 쓰는 것만.
- 측정: 내장 브라우저에서 `performance.getEntriesByType('navigation')`, `performance.getEntriesByType('resource')`로 로딩 시간과 큰 파일을 본다.

## 3. 검색·공유 미리보기

`<head>`에 다음이 있는지:
- `<meta name="description">` (한 문장, 한국어)
- Open Graph: `og:title`, `og:description`, `og:url`(https://habitat-scorecard.vercel.app), `og:image`(1200×630 이미지, 저장소에 추가), `og:locale`=`ko_KR`
- `twitter:card`=`summary_large_image`
- 파비콘 (SVG 1개면 충분, 이모지 금지)
- `<meta name="theme-color">` 라이트/다크 두 개 (`media` 속성)

공유 링크(`#s=...`)는 해시라서 미리보기 내용은 항상 같다. 정상.

## 4. 보고

항목별로 통과/문제를 짧게, 문제는 파일:줄과 고치는 방법 한 줄. 고치는 작업은 사용자 확인 후, 끝나면 `check-site`.
