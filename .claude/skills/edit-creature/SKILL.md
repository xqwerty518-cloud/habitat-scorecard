---
name: edit-creature
description: 디지털 트윈(Three.js)의 3D 생물 모양을 새로 만들거나 고칠 때 사용. 꼬리 방향, 수면에 가려짐, 색·비율 문제 포함.
---

# 3D 생물 모양

모든 생물은 `js/twin.js`의 `buildCreature(id)` switch 안 `case '종id':`에 있다. three.js **r128** API 기준 (버전 올리지 말 것).

## 도구 (buildCreature 안)

- `twinMesh(geo, color, sx,sy,sz)`: 재질 포함 메쉬. 스케일로 타원체 만들기.
- `put(mesh, x,y,z, rx,ry,rz)`: 위치(+회전) 지정 후 추가. 회전 없는 몸통·머리·다리용.
- `putDir(mesh, x,y,z, dx,dy,dz)`: 원뿔·원기둥의 로컬 +Y축을 방향 벡터로 정렬. **꼬리·목·부리·뿔·지느러미는 반드시 이것.** 오일러 각으로 맞추다 꼬리가 거꾸로 붙은 적이 있다. 원뿔은 +Y 쪽이 뾰족하므로 방향 벡터는 "뾰족한 끝이 향할 곳".

## 좌표 규칙

- +X가 머리 방향, Y가 위, 바닥은 y=0. 크기는 대략 길이 0.5~0.8 (기존 종과 비슷하게).
- 해양 종도 같은 좌표계. 수면 아래 위치는 `updateTwin()`이 처리하므로 모양만 만든다.

## 재질

- `twinMat()`에는 `transparent:true, depthWrite:false`가 들어 있다. 직접 `new THREE.MeshStandardMaterial`을 만들지 말고 `twinMesh()`를 쓴다. 새 반투명 재질을 꼭 만들어야 하면 `depthWrite:false` 필수 (빠지면 해양 모드에서 수면이 생물을 가린다).
- 평면(무늬 등)은 `mesh.material.side = THREE.DoubleSide` (`bear` 참고).
- 색은 실제 종의 체색에 가깝게, 16진수 숫자(`0x7A5A3A`). 3D 장면 색은 CSS 토큰 대상이 아니다.

## 순서

1. 체형이 비슷한 기존 case를 복사: 포유류 `fox`/`marten`/`otter`, 유제류 `goral`, 새 `stork`/`crane`/`owl`, 거북 `pondturtle`/`turtle`, 해양 포유류 `seal`/`dolphin`/`porpoise`.
2. 비율·색·부품 수정. 지오메트리 분할 수는 기존 수준(6~10)으로 낮게 유지.
3. `check-site`. `land-twin.png`/`marine-twin.png`에서 모양과 방향 확인. 작아서 안 보이면 `npm run dev` 후 내장 브라우저에서 디지털 트윈 모드로 가서 확대해 보고, 클릭하면 종 이름이 뜨는지 확인.
