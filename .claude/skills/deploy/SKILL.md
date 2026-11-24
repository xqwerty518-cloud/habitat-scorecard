---
name: deploy
description: 변경 사항을 실제 사이트(habitat-scorecard.vercel.app)에 반영하거나, 배포 상태 확인·되돌리기를 할 때 사용.
---

# 배포

GitHub `xqwerty518-cloud/habitat-scorecard`의 `main` 브랜치가 Vercel 프로젝트 `habitat-scorecard`(팀 `atle1`)에 연결되어 있다. **`main`에 push = 프로덕션 배포.** 별도 배포 명령은 없다.

## 순서

1. `check-site` 스킬로 검증이 끝났는지 확인. 안 했으면 먼저 한다.
2. 커밋. 메시지는 무엇을 왜 바꿨는지 한 줄 (영어 또는 한국어).
3. `git push origin main`
4. 배포 확인 (1분 이내 완료됨):
   - Vercel MCP가 연결돼 있으면 `list_deployments`(projectId `prj_avGWA39OdUZmq9rCBhm11AqZ52Bi`, teamId `team_gsl00aa38mUTwQrdeMTmIp8U`)로 최신 배포가 `READY`인지 본다.
   - 없으면 https://vercel.com/atle1/habitat-scorecard/deployments 를 사용자에게 안내.
   - `ERROR`면 빌드 로그를 확인한다. 정적 사이트라 대개 파일 경로 오타.
5. https://habitat-scorecard.vercel.app 에서 바뀐 부분이 보이는지 확인.

## 큰 변경은 브랜치로

화면 구조를 크게 바꾸거나 실험적인 기능이면 `main` 대신 새 브랜치에 push한다. Vercel이 미리보기 주소를 따로 만들어 주므로 사용자가 먼저 보고 결정할 수 있다. 사용자가 좋다고 하면 `main`에 합친다.

## 되돌리기

배포 후 문제가 생기면:
- 빠르게: Vercel 대시보드에서 이전 배포를 "Promote to Production" (또는 MCP `request_rollback`)
- 근본적으로: `git revert <커밋>` 후 push

`git push --force`는 쓰지 않는다.
