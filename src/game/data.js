import { MATTER as RAW, ERAS } from "../content.js";

/** Matter table: real masses (kg) made monotone so a bigger id is always heavier. */
export const MATTER = (() => {
  let prev = 0;
  return RAW.map((m, i) => {
    const mass = Math.max(m.mass.toNumber(), prev * 1.7);
    prev = mass;
    const band = Math.floor(i / 10);
    const big = ["planet", "moon", "gas", "star", "giant", "cosmic", "blackhole"].includes(m.render);
    return {
      id: i,
      name: m.name,
      band,
      className: ERAS[band]?.name || "Matter",
      render: m.render,
      mass,
      hp: 4 * 1.18 ** i,
      energy: 1.17 ** i,
      size: (big ? 0.046 : 0.03) + (i % 10) * 0.0012 + Math.min(band, 16) * 0.0016,
      frags: big ? 4 : band >= 4 ? 3 : band >= 1 ? 2 : 0,
    };
  });
})();

// Opening the next matter takes `need(F)` absorptions of the current frontier species.
export const need = (f) => Math.ceil(3 + f * 0.28);
export const SEED_MASS = 1e-13;

export const GATES = [
  { at: 59, kind: "binding", name: "BINDING LIMIT" },
  { at: 79, kind: "planetary", name: "PLANETARY BOUNDARY" },
  { at: 139, kind: "stellar", name: "STELLAR BOUNDARY" },
];
export const LAST = 199;

export const TIERS = ["STABLE", "PRESSURE", "REDLINE"];

/** STRUCTURE — bought with Energy. max: Infinity = repeatable. req: {id: level}. */
export const UPGRADES = [
  // CAPTURE arm
  { id: "grip", arm: 0, icon: "magnet", name: "Tidal Grip", max: Infinity, base: 14, growth: 1.36, fx: "Force ×1.25", desc: "렌즈가 천체를 찢는 힘. 모든 피해의 기준이 된다." },
  { id: "aperture", arm: 0, icon: "aperture", name: "Lens Aperture", max: 6, base: 45, growth: 2.7, fx: "렌즈 반경 +14%", desc: "조석 렌즈가 넓어져 한 번에 더 많은 천체를 붙잡는다.", req: { grip: 2 } },
  { id: "periapsis", arm: 0, icon: "arrow-down-to-dot", name: "Deep Periapsis", max: 3, base: 700, growth: 7, fx: "낙하 속도 +35% · Mass +20%", desc: "포획된 천체가 더 깊고 빠르게 떨어진다.", req: { aperture: 1 } },
  { id: "dual", arm: 0, icon: "flip-horizontal-2", name: "Twin Lens", max: 1, base: 3200, growth: 1, fx: "거울 렌즈 생성 (위력 60%)", desc: "블랙홀 반대편에 두 번째 렌즈가 생겨 함께 움직인다.", req: { aperture: 2 }, key: true },
  { id: "tidalBreak", arm: 0, icon: "sparkles", name: "Tidal Break", max: 5, base: 2400, growth: 4, fx: "파쇄 확률 +5% (보상 ×4)", desc: "포획 순간 천체가 조석 파쇄되어 파편이 주변 천체까지 때린다.", req: { periapsis: 1 }, key: true },
  // FIELD arm
  { id: "coil", arm: 1, icon: "zap", name: "Field Coil", max: 12, base: 30, growth: 2.1, fx: "Pulse 위력 ×1.3", desc: "클릭 한 번의 충격파가 더 강해진다." },
  { id: "capacitor", arm: 1, icon: "battery-charging", name: "Pulse Capacitor", max: 5, base: 140, growth: 2.9, fx: "Pulse 재충전 −12%", desc: "더 자주 쏜다.", req: { coil: 2 } },
  { id: "aftershock", arm: 1, icon: "radio", name: "Aftershock", max: 3, base: 1100, growth: 6, fx: "2차 충격파 위력 +35%", desc: "Pulse로 포획된 천체가 그 자리에서 다시 폭발한다. 밀집 구간에서 연쇄.", req: { capacitor: 1 }, key: true },
  { id: "redline", arm: 1, icon: "gauge", name: "Redline Extension", max: 4, base: 2600, growth: 4.5, fx: "Redline 수율 +0.5× · 감쇠 −15%", desc: "높은 압력을 더 오래, 더 값지게 유지한다.", req: { capacitor: 2 } },
  { id: "vent", arm: 1, icon: "flame", name: "Overdrive Vent", max: 3, base: 9000, growth: 6, fx: "Release 수율 +2× · Afterglow +2s", desc: "FIELD RELEASE가 더 크게 터진다.", req: { redline: 1 }, key: true },
  // PROCESSING arm
  { id: "grid", arm: 2, icon: "cpu", name: "Processing Grid", max: 10, base: 22, growth: 2.3, fx: "Energy ×1.15", desc: "포획에서 더 많은 Energy를 뽑아낸다." },
  { id: "rail", arm: 2, icon: "orbit", name: "Feed Rail", max: 8, base: 70, growth: 2.3, fx: "유입 +18% · 최대 천체 +4", desc: "궤도에 더 많은 Matter가 흘러든다.", req: { grid: 2 } },
  { id: "recycler", arm: 2, icon: "recycle", name: "Debris Recycler", max: 3, base: 1500, growth: 6, fx: "파편 +1 · 파편당 Energy +10%", desc: "찢어진 파편 하나하나가 수익이 된다.", req: { rail: 1 } },
  { id: "fluxtap", arm: 2, icon: "waves", name: "Flux Tap", max: 1, base: 6000, growth: 1, fx: "PRESSURE 이상에서 Flux 생성", desc: "압력 속에서 붙잡은 Matter에서 다른 무언가가 새어 나온다.", req: { rail: 2 }, key: true },
  { id: "loop", arm: 2, icon: "repeat", name: "Recirculation Loop", max: 3, base: 26000, growth: 7, fx: "잔상 재진입 확률 +6%", desc: "포획한 천체의 잔상이 다시 궤도에 나타난다.", req: { fluxtap: 1 }, key: true },
];
export const ARMS = ["CAPTURE", "FIELD", "PROCESSING"];

/** DYNAMICS — bought with Flux, three levels each. Effects apply during Resonance (INJECT). */
export const NODES = [
  { id: "response", icon: "activity", name: "RESPONSE", k: 1, fx: (l) => `Resonance 중 Force ×${1 + l}`, desc: "주입된 펄스에 렌즈가 공명한다." },
  { id: "flow", icon: "wind", name: "FLOW", k: 1.3, fx: (l) => `INJECT 시 천체 ${6 * l}개 즉시 유입`, desc: "공명이 유입 흐름을 끌어당긴다." },
  { id: "shear", icon: "tornado", name: "SHEAR", k: 1.7, fx: (l) => `궤도 전체에 지속 피해 ${25 * l}%`, desc: "궤도 전체가 전단력에 갈린다." },
  { id: "feedback", icon: "refresh-cw", name: "FEEDBACK", k: 2.3, fx: (l) => `포획마다 Resonance +${(0.12 * l).toFixed(2)}s`, desc: "포획이 공명을 다시 먹인다." },
  { id: "compression", icon: "shrink", name: "COMPRESSION", k: 3, fx: (l) => `궤도 수축 · Pulse 반경 +${25 * l}%`, desc: "장이 조여들며 모든 것이 중심으로 모인다." },
];
export const NODE_COST = [40, 480, 5200];
export const RESONANCES = [
  { id: "turbulent", name: "TURBULENT FEED", need: ["flow", "shear"], desc: "Resonance 중 유입되는 천체는 이미 절반쯤 찢어져 있다." },
  { id: "closed", name: "CLOSED LOOP", need: ["compression", "feedback"], desc: "Resonance 중 포획이 압력을 1.5배로 올린다." },
  { id: "cascade", name: "ACCRETION CASCADE", need: ["response", "flow", "shear"], desc: "Resonance 중 포획마다 가장 가까운 천체로 조석 아크가 튄다." },
];

/** FIELD ANCHOR — bought with Residue, permanent. regime gates visibility. */
export const MODULES = [
  { id: "coupling", regime: 1, icon: "link", name: "Residual Coupling", max: 30, base: 2, growth: 1.8, fx: "Energy · Mass ×1.6", desc: "이전 우주의 잔류장이 모든 수율을 끌어올린다." },
  { id: "echo", regime: 1, icon: "fast-forward", name: "Mass Echo", max: 4, base: 3, growth: 2.2, fx: "최고 Frontier의 +20% 지점에서 시작", desc: "이미 정복한 초반을 건너뛴다." },
  { id: "relay", regime: 1, icon: "satellite", name: "Catalog Relay", max: 4, base: 4, growth: 2.5, fx: "자동 포획 드론 +1", desc: "궤도를 도는 릴레이가 스스로 Matter를 끌어내린다." },
  { id: "memory", regime: 2, icon: "brain-circuit", name: "Energetic Memory", max: 15, base: 8, growth: 2.2, fx: "Force ×1.5", desc: "렌즈가 이전 생의 세기를 기억한다." },
  { id: "imprint", regime: 2, icon: "stamp", name: "Structural Imprint", max: 1, base: 12, growth: 1, fx: "Structure 자동 재구매", desc: "직접 지어 본 Structure를 장치가 알아서 다시 짓는다." },
  { id: "spool", regime: 2, icon: "layers", name: "Queue Spool", max: 3, base: 10, growth: 2.5, fx: "유입 +30% · 최대 천체 +5", desc: "유입 대기열이 감긴다." },
  { id: "recall", regime: 3, icon: "history", name: "Dynamics Recall", max: 1, base: 30, growth: 1, fx: "Flux Tap · 공명 노드 유지", desc: "Anchor 뒤에도 Resonance Network가 남는다." },
  { id: "bulk", regime: 4, icon: "boxes", name: "Bulk Capture", max: 1, base: 60, growth: 1, fx: "Frontier−15 이하 즉시 포획", desc: "오래전에 정복한 Matter는 렌즈에 닿는 순간 끝난다." },
];
export const REGIMES = [0, 24, 58, 105];
export const regimeOf = (total) => REGIMES.filter((t) => total >= t).length;

export const cost = (u, lvl) => u.base * u.growth ** lvl;

const UNITS = [
  [1.989e30, "M☉"],
  [5.972e24, "M⊕"],
  [1e21, "Zt"],
  [1e18, "Et"],
  [1e15, "Pt"],
  [1e12, "Gt"],
  [1e9, "Mt"],
  [1e6, "kt"],
  [1e3, "t"],
  [1, "kg"],
  [1e-3, "g"],
  [1e-6, "mg"],
  [1e-9, "µg"],
  [1e-12, "ng"],
  [1e-15, "pg"],
];
const sig = (x) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2));
export function fmtMass(kg) {
  for (const [v, u] of UNITS) if (kg >= v) return kg / v >= 1e4 ? `${fmt(kg / v)} ${u}` : `${sig(kg / v)} ${u}`;
  return `${sig(kg / 1e-15)} pg`;
}
const SUFFIX = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
export function fmt(n) {
  if (!isFinite(n)) return "∞";
  if (n < 1000) return n < 10 ? (Math.round(n * 10) / 10).toString() : Math.floor(n).toString();
  const e = Math.floor(Math.log10(n) / 3);
  if (e >= SUFFIX.length) return n.toExponential(2).replace("+", "");
  return sig(n / 1000 ** e) + SUFFIX[e];
}
