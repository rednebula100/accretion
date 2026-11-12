# ACCRETION — MASTER SPEC v2.0

Single Source of Truth · Updated 2026-11-12
v1.0(2026-11-12 이전)은 [ARCHIVE]. 충돌 시 이 문서가 우선한다.

STATUS: [CANON] 확정 원칙 · [IMPLEMENTED] 현재 빌드에 있음 · [PROVISIONAL] 수치 튜닝 대상 · [PLANNED] 다음 방향 · [ARCHIVE] 폐기/보류

---

## 0. v1.0 진단 — 왜 재미가 없었는가

v1.0 빌드의 플레이 = "카드의 버튼을 누른다 → 기다린다". 스펙은 30개 섹션으로 시스템을 쌓았지만 **초 단위 행동(moment-to-moment)** 이 정의되어 있지 않았다.

| 증상 (PLAYTEST) | 원인 | v2.0 처방 |
| --- | --- | --- |
| 타격감 없음 | 입력→결과 사이에 물리적 사건이 없음. 구매 후 대기 | 커서가 곧 중력 도구. 모든 포획이 0.1초 안에 6채널 피드백 |
| "구매 몇 번 + 기다림" | 1차 루프가 메뉴 조작 | 1차 루프 = 아레나 액션, 2차 루프 = 업그레이드 |
| AI 양산형 웹 UI | 우주에 떠 있는 SaaS 카드, 얇은 회색 글씨, glass | 게임 HUD 문법: 타이틀 화면, 핫바, 게이지, 컷 코너 패널, 디스플레이 서체 |
| 콘텐츠 밀도 부족 | 시스템은 많은데 각자 얇음 | 시스템 수를 줄이고 한 화면에 겹침 (압력·체인·공명·릴레이) |
| 스펙 과잉 | Array/Evap/Research 등 미구현 계획이 현재 슬라이스를 얇게 만듦 | 전부 [ARCHIVE]. 지금 켰을 때 재미있는가만 본다 |

보존: 블랙홀 레이마칭 렌더러, Matter 200종 정체성/아틀라스, 3-segment broken ring 모티프, "행동이 BH에 실제로 반영된다" 원칙.

---

## 1. 정체성 [CANON]

**ACCRETION은 블랙홀을 직접 먹이는 아케이드 인크리멘탈이다.**
한 화면, 한 아레나. 블랙홀이 중심이고 플레이어의 커서가 조석 렌즈다.

기둥:
1. **손이 먼저, 숫자는 나중** — 모든 진행은 직접 포획에서 시작한다. 자동화는 직접 정복한 뒤의 보상이다.
2. **한 번의 포획 = 한 번의 타격** — 플래시, 파편, 히트스톱, 소리, 숫자, 디스크 반응이 100ms 안에 겹친다.
3. **블랙홀이 게임판** — 압력·체인·공명·Anchor 전부 BH/디스크/링에 보인다. HUD 숫자만 바뀌는 시스템 금지.
4. **절제된 평소, 강한 순간** — 평소는 어둡고 조용하다. FIELD RELEASE / BREACH / ANCHOR에서만 화면 전체가 반응한다.
5. **Unfolding** — Flux·Dynamics·Field Anchor·Boundary는 처음에 존재조차 보이지 않는다.

FINAL RULE (v1.0 §31 유지): 새 콘텐츠의 답이 "숫자가 더 빨리 오른다"뿐이면 추가하지 않는다.

---

## 2. 코어 루프 [IMPLEMENTED]

```
유입(Feed) → 궤도 → [렌즈로 조석 변형] → 포획(CAPTURE) → 낙하·파쇄 → 흡수(ABSORB)
                         ↑ 클릭: FIELD PULSE            ↓ Energy(즉시)   ↓ Mass(사건의 지평선 통과 시)
```

### 2.1 천체
- Matter는 BH 주위 궤도에 계속 유입된다. 각 천체는 Integrity(HP)를 가진다.
- 방치해도 조석 항력으로 천천히 붕괴한다(소프트락 방지 + 최소 idle 수입).
- hp(i)=4·1.18^i, energy(i)=1.17^i, mass(i)=실제 질량(kg, 단조 보정). [PROVISIONAL]
- 무한 스케일러는 Tidal Grip 하나뿐이다(Energy/Pulse 배수는 상한). 여러 무한 배수가 곱해지면 경제가 폭주한다(봇 검증).

### 2.2 조석 렌즈 (커서)
- 커서 반경 안의 천체에 초당 조석력(Force) 피해. 가열·진동·HP 호 표시.
- HP 0 → CAPTURE: 궤도 이탈, 나선 낙하, 대형 천체는 조석 반경에서 파편으로 찢어진다.

### 2.3 FIELD PULSE (클릭/탭)
- 커서 위치에서 충격파. 넓은 반경, Force×2.5, 재충전 1.4s. 히트스톱·셰이크·충격 링.

### 2.4 Chain
- 연속 포획 수. 2.5s 안에 다음 포획이 없으면 끊긴다. Energy +2%/chain (최대 ×2). 포획음 피치가 올라간다.

### 2.5 Field Pressure — v1.0 Gravity Throttle의 구현형
- 포획이 압력을 올리고, 쉬면 떨어진다. BH 주위 3-segment 링이 게이지다.
- STABLE(0–35) ×1 → PRESSURE(35–70) ×1.5 → REDLINE(70–100) ×2.5.
- 100 도달 = **FIELD RELEASE**: 화면의 모든 천체 일괄 포획(×4), 제트, 충격파, 카메라 반동, 이후 Afterglow(유입 ×3).
- 실패 상태가 아니라 보상 사이클이다. 플레이 리듬 ≈ 20–30초마다 한 번.

### 2.6 Frontier
- 금색 조준선이 붙은 **Frontier 종**을 need(F)=ceil(3+0.28F)회 흡수하면 다음 Matter가 유입 풀에 열린다. 필드에는 항상 Frontier 천체가 하나 이상 있다.
- Mass는 BH의 성장(크기·디스크·기록)으로 남는다.
- 첫 흡수 = DISCOVERY 토스트, 새 분류(10종 단위) 첫 흡수 = 배너.
- 미발견 Matter는 실루엣/이름을 미리 보여주지 않는다.

---

## 3. 진행 구조

| 구간 | Matter ID | 게이트 | 상태 |
| --- | --- | --- | --- |
| Grains → Fragments | 0–59 | — | [IMPLEMENTED] |
| **Binding Limit** | 59 | 첫 ANCHOR 필요 | [IMPLEMENTED] |
| Minor bodies | 60–79 | — | [IMPLEMENTED] |
| **Planetary Boundary** | 79→80 | 보스형 BREACH (링 3분절 파괴) | [IMPLEMENTED] |
| Worlds → Substellar | 80–139 | — | [IMPLEMENTED] |
| **Stellar Boundary** | 139→140 | BREACH | [IMPLEMENTED] |
| Stellar → Cosmic | 140–199 | — | [IMPLEMENTED] |
| 엔딩 | 199 | 데모 엔딩 카드, 이후 자유 플레이 | [IMPLEMENTED] |

Gate 원칙(v1.0 §1.3 유지): 숫자 요구 배열 금지. 게이트는 월드 오브젝트이고 직접 부순다. 첫 BREACH/ANCHOR는 자동화가 대신할 수 없다.

---

## 4. STRUCTURE — Energy 업그레이드 [IMPLEMENTED]

세 개의 arm. 반복 노드(∞)와 행동을 바꾸는 노드를 섞는다. 부모보다 싼 자식 금지(가격 역전 수정).

- **CAPTURE**: Tidal Grip(∞, Force ×1.25) · Lens Aperture(반경) · Twin Lens(반대편 거울 렌즈) · Deep Periapsis(낙하 가속, Mass↑) · Tidal Break(확률 파쇄: 보상 ×4 + 주변 피해)
- **FIELD**: Field Coil(∞, Pulse 위력) · Pulse Capacitor(재충전) · Aftershock(Pulse 포획이 2차 충격파) · Redline Extension(압력 유지, Redline 수율) · Overdrive Vent(Release 강화)
- **PROCESSING**: Processing Grid(∞, Energy) · Feed Rail(유입/최대 수) · Debris Recycler(파편 수익) · Flux Tap(Flux 생성 → Dynamics 발견) · Recirculation Loop(잔상 재진입)

공개 규칙: 각 arm에서 다음 노드 **하나만** 이름 없는 `???` 타일(해금 조건 표시)로 보인다. 그 뒤는 보이지 않는다(잠금 타일 나열 금지).

---

## 5. DYNAMICS — Resonance Network [IMPLEMENTED]

Flux Tap 구매 후 PRESSURE 이상에서 포획하면 Flux가 생긴다. 그때 처음 Dynamics가 드러난다.

- 노드 5계열 × 3레벨: RESPONSE / FLOW / SHEAR / FEEDBACK / COMPRESSION
- **INJECT** (Space/우클릭, 재사용 25s): 8초간 Resonance. 보유 노드가 각자 효과를 낸다.
  - RESPONSE Force↑ · FLOW 즉시 유입 폭발 · SHEAR 전 궤도 지속 피해 · FEEDBACK 포획마다 지속 연장 · COMPRESSION 궤도 수축 + Pulse 강화
- **Hidden Resonance** (조합 보유 후 첫 INJECT에서 발견, 미리 표시 금지)
  - FLOW+SHEAR → TURBULENT FEED · COMPRESSION+FEEDBACK → CLOSED LOOP · RESPONSE+FLOW+SHEAR → ACCRETION CASCADE(연쇄 아크)

---

## 6. ANCHOR — P1 [IMPLEMENTED]

- Frontier 40부터 가능. Binding Limit(59)에서는 필수. Residue = floor(3·1.07^(F−40)). Rush는 적고 Deep은 많다.
- 리셋: Mass, Energy, Flux, Structure, Dynamics, Frontier. 유지: Residue, 모듈, 발견 기록, Boundary 돌파, 공명 지식.
- **시그니처 시네마틱**(첫 회 ~4.5s, 이후 압축): LOCK → COMPRESSION → COLLAPSE → ANCHOR WAVE → REBIRTH.
- 첫 Anchor의 진짜 보상 = Field Anchor 패널의 등장.

Field Anchor 모듈 (Residue, 영구) — 자동화는 여기서만 나온다:

| Regime (누적 Residue) | 모듈 |
| --- | --- |
| I (0) | Residual Coupling(수율), Mass Echo(시작 Frontier), Catalog Relay(자동 포획 드론) |
| II (24) | Energetic Memory(Force), Structural Imprint(Structure 자동 재구매), Queue Spool(유입) |
| III (58) | Dynamics Recall(Flux Tap/노드 유지) |
| IV (105) | Bulk Capture(오래 정복한 저급 Matter 즉시 포획) |

상위 Regime 모듈은 도달 전 표시하지 않는다.

---

## 7. UI / 아트 디렉션 [CANON]

목표: Steam/itch 인크리멘탈·액션 게임의 HUD. 웹사이트처럼 보이면 실패.

- 구조: 타이틀 화면 → 게임. 상단 자원 바 / 하단 핫바(Pulse·Inject·Pressure·Chain) / 우측 도킹 드로어(STRUCTURE·DYNAMICS·ANCHOR·CATALOG) / 좌하단 DIRECTIVE(목표).
- 드로어가 열리면 아레나(BH)가 남은 공간의 중심으로 미끄러진다. 페이지 전환·문서 스크롤 없음.
- 패널: 불투명 다크 슬레이트, 1px 하이라이트 보더, 컷 코너. glass/blur·둥근 카드·얇은 회색 폼 금지.
- 서체: Chakra Petch(디스플레이·숫자) + Pretendard(본문, 한글 서브셋 내장).
- 색: 강착 앰버(주), 필드 시안(Flux/Dynamics), Redline 레드, Residue 바이올렛. 색은 시스템 의미로만 쓴다.
- 언어: 한국어 설명 + 영어 시스템 고유명.
- 전역 규칙(유지): 변수를 노출하면 바꾼 결과가 즉시 보여야 한다.

## 8. 연출 / 게임필 [CANON]

- 포획: 플래시 + 파편 + 숫자 + 피치 상승음 + 디스크 activity + 체인 카운터.
- Pulse: 히트스톱 40ms + 셰이크 + 굴절 충격 링.
- Release / Breach / Anchor: 슬로모션, 색수차, 제트, 카메라 반동, 저음.
- 반복 행동의 연출은 짧고 조용하게. 셰이크는 큰 사건에만 크게.
- Reduced Motion: 셰이크/색수차/플래시 축소, 의미 정보는 유지.
- 오디오: 전부 절차 생성(녹음 에셋 없음). ZzFX SFX + 압력 단계에 반응하는 WebAudio 앰비언트.

## 9. 기술 [IMPLEMENTED]

- Three.js(BH 레이마칭 + 인스턴스 Matter + 파티클 + Bloom/후처리) · Canvas2D 오버레이(렌즈·링·숫자) · DOM HUD · GSAP(타임라인) · ZzFX(SFX) · Lucide(아이콘).
- `src/game/sim.js`는 DOM 없는 순수 시뮬레이션. `npm run balance` 봇으로 진행 속도 검증.
- **제출물은 단일 HTML** (`dist/index.html`, 모든 스크립트·셰이더·폰트·아틀라스 인라인, 오프라인 실행).
- 저장: localStorage `accretion.save.v4`, 5초 자동 저장, 내보내기/가져오기. v3 저장은 건드리지 않는다.
- 품질: AUTO 해상도 스케일. 성능 때문에 BH 품질을 강제로 낮추지 않는다.

## 10. 밸런스 목표 [PROVISIONAL]

- 첫 업그레이드 < 20s · 첫 FIELD RELEASE < 90s · 첫 Anchor 8–12분(봇 skill 0.7 기준 4.5분) · 2회차는 더 빠르게.
- 4분 이상 새 메커닉/사건 없는 정체 금지. 순수 대기 구간 금지.

## 11. [ARCHIVE] / [PLANNED]

- ARCHIVE: 연속 월드 pan/zoom 내비게이션, 카드형 facility, Converter SET UI, 100ms lattice 경제, v3 세이브 호환.
- PLANNED(이 슬라이스가 재미있다고 확인된 뒤에만): Accretion Array(P2, 방사형 흐름 퍼즐), Evaporation/Memory/Research, 오프라인 진행, 항성 조석 파괴 전용 시네마틱.

## 12. 금지 패턴 [CANON]

generic glass dashboard · 탭/페이지 스왑 내비게이션 · 문서 스크롤 게임플레이 · 잠금 타일 스포일러 · 모든 버튼 bounce · 설명 없는 숫자 폼 · 첫 주요 사건 자동 스킵 · 파티클/컨페티 상시 남발 · BH가 장식 배경으로만 존재 · 직접 할 게임플레이가 없는데 먼저 등장하는 자동화.
