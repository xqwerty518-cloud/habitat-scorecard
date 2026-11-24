# 서식지 적합도 스코어카드

멸종위기 야생생물의 서식지 적합도를 계산하고 시각화하는 웹 앱입니다.
https://habitat-scorecard.vercel.app

- 적합도 계산기, 지점 비교, 공존 분석, 3D 디지털 트윈(Three.js), 멸종위기 야생생물 282종 전체 목록
- 빌드 과정 없는 정적 사이트 (HTML + CSS + 일반 JS)
- 데이터 출처: 국립생태원, 기후에너지환경부, 해양수산부, IUCN, 관련 논문

## 구조

```
index.html            마크업
css/style.css         스타일 (라이트/다크 토큰)
js/data/species.js    종 데이터, 282종 목록
js/core.js            점수 계산, 카드·비교·공존·목록
js/twin.js            3D 디지털 트윈
js/app.js             렌더링, 테마, 공유, PDF, 초기화
tests/check-syntax.mjs  JS 문법 검사
tests/smoke.mjs       헤드리스 브라우저 스모크 테스트
CLAUDE.md             Claude Code용 프로젝트 규칙
.claude/skills/       Claude Code 스킬 (목록은 CLAUDE.md)
```

## 시작하기

```bash
git clone https://github.com/xqwerty518-cloud/habitat-scorecard
cd habitat-scorecard
npm install
npx playwright install chromium   # 테스트용, 처음 한 번만
npm run dev                        # http://localhost:3000
npm test                           # 문법 검사 + 스모크 테스트
```

Claude Code로 작업하려면 이 폴더에서 `claude`를 실행하세요. `CLAUDE.md`와 스킬을 자동으로 읽습니다.
예: "황새 말고 다른 조류 하나 추가해줘" → `add-species` 스킬로 출처 조사부터 테스트까지 진행합니다.

## 배포

`main`에 push하면 Vercel이 자동으로 배포합니다.
