# ACCRETION

[**▶ 브라우저에서 바로 플레이**](https://rednebula100.github.io/accretion/)

조석 렌즈(커서)로 블랙홀을 직접 먹이는 **아케이드 인크리멘탈**. 설치·로그인 없음. WebGL2가 되는 데스크톱 Chrome/Edge 권장.

## 조작

| 입력 | 동작 |
| --- | --- |
| 마우스 이동 | 조석 렌즈 — 렌즈 안의 천체가 찢어져 블랙홀로 떨어진다 |
| 클릭 | FIELD PULSE — 충격파 |
| Space / 우클릭 | INJECT — Resonance (Dynamics 발견 후) |
| 1–4, E | STRUCTURE / DYNAMICS / ANCHOR / CATALOG 드로어 |
| Esc | 드로어 닫기 / 설정 |

## 루프

포획 → Energy → **Structure** 업그레이드 → 더 큰 Matter(Frontier) → 압력 100% **FIELD RELEASE** → **Flux / Dynamics** 공명 → Binding Limit에서 **ANCHOR**(프레스티지, 시네마틱) → **Field Anchor** 모듈(자동화) → **Planetary / Stellar Boundary** 돌파 → 200종 전부 흡수.

설계 문서: [`docs/MASTER_SPEC.md`](docs/MASTER_SPEC.md) (v2.0, Single Source of Truth)

## 단일 HTML

`npm run build`의 결과물 `dist/index.html` **한 파일**에 스크립트·셰이더·폰트·Matter 아틀라스가 전부 인라인된다. 인터넷 없이 더블클릭으로 실행된다. 배포된 페이지를 "다른 이름으로 저장"해도 같은 파일이다.

## 개발

```sh
npm install
npm run dev      # http://127.0.0.1:4173
npm test         # 시뮬레이션 단위 테스트
npm run balance  # 헤드리스 봇으로 진행 속도 측정
npm run fonts    # UI 문구를 바꿨다면 한글 폰트 서브셋 재생성
npm run build    # dist/index.html (single file)
```

- `src/game/sim.js` — DOM 없는 순수 시뮬레이션 · `data.js` — Matter/업그레이드 테이블
- `src/game/gfx.js` — Three.js: 블랙홀 레이마칭 + 인스턴스 Matter + 파티클 + 후처리
- `src/game/overlay.js` — Canvas2D 계기(렌즈·압력 링·Boundary·숫자) · `ui.js` — DOM HUD · `audio.js` — 절차 생성 사운드
- `src/shaders/blackhole.glsl` — 블랙홀 셰이더

`main`에 push하면 GitHub Actions가 테스트·빌드 후 Pages에 배포한다. 세이브는 브라우저 `localStorage`(`accretion.save.v4`)에 저장되며 설정에서 내보내기/가져오기가 가능하다. 라이선스 고지는 `THIRD_PARTY_NOTICES.md`.
