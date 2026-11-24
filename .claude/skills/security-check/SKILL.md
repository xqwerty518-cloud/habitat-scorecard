---
name: security-check
description: 웹사이트 보안 점검. 사용자 입력·URL·공유 링크·외부 스크립트를 다루는 코드를 바꿨을 때, 배포 전 정기 점검, 보안 헤더 설정 시 사용.
---

# 보안 점검 (정적 사이트)

서버 코드가 없는 정적 사이트라 주 위험은 브라우저 쪽이다: XSS, 조작된 공유 링크, 외부 스크립트 변조, 비밀 값 노출.

## 체크리스트

1. **XSS**: `grep -n "innerHTML\|insertAdjacentHTML\|outerHTML\|document.write" js/*.js`
   - 템플릿 문자열에 들어가는 값 중 사용자 입력(지점 이름, 검색어)·URL·저장소(db, localStorage) 값은 `escapeHtml()`로 감쌌는지.
   - `onclick="fn('${값}')"`처럼 속성 안 JS에 값이 들어가면 escape만으로 부족하다. `data-` 속성 + `addEventListener`로 바꾸는 것을 제안.
   - 단순 텍스트는 `textContent`가 더 안전하다.
2. **공유 링크 (`restoreFromHash`)**: URL 해시는 누구나 조작할 수 있다. `JSON.parse`는 try/catch 안에, 모드·서식지는 허용 목록으로, 슬라이더 값은 숫자인지·범위 안인지 확인. 해시 값이 `innerHTML`이나 `eval`로 가지 않는지.
3. **외부 스크립트**: `index.html`의 cdnjs `<script>`에 `integrity`(SRI)와 `crossorigin="anonymous"`가 있는지. 없으면 추가를 제안한다 (해시는 cdnjs 페이지나 `curl ... | openssl dgst -sha512 -binary | openssl base64 -A`로 구한다. 추측한 해시를 넣으면 스크립트가 차단된다).
4. **보안 헤더**: 저장소 루트의 `vercel.json` `headers`. 권장: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`(또는 CSP `frame-ancestors`), `Permissions-Policy`. CSP는 인라인 `onclick`을 많이 써서 `script-src 'unsafe-inline'`이 필요하고, cdnjs·fonts.googleapis.com·fonts.gstatic.com을 허용해야 한다. CSP를 넣으면 **배포 미리보기(브랜치)에서 먼저** 3D·PDF·폰트가 동작하는지 확인한다.
5. **비밀 값**: 정적 사이트의 모든 파일은 공개된다. API 키·토큰·개인 정보가 저장소에 없는지 (`git grep -n -i "key\|token\|secret\|password"`). `.env`는 커밋하지 않는다.
6. **의존성**: `package.json`은 테스트용 `playwright`뿐. `npm audit`은 참고만 (배포되는 코드가 아님).
7. **외부 전송**: 사용자 데이터(지점, 입력값)를 제3자 서버로 보내는 코드가 새로 생기지 않았는지.

## 보고

발견한 것을 위험도(높음/중간/낮음)와 함께 파일:줄로 짧게. 고치는 것은 사용자에게 확인받은 뒤. 헤더·CSP 같은 배포 설정 변경은 `deploy` 스킬의 브랜치 미리보기로 먼저 확인.
