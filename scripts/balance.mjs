// Headless balance bot: plays the pure sim with a simple cursor policy and reports pacing.
import { Sim, newSave } from "../src/game/sim.js";
import { UPGRADES, NODES, MODULES } from "../src/game/data.js";
let seed = 7;
const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const skill = Number(process.argv[2] || 1); // cursor speed factor
const sim = new Sim(newSave(), rng);
let cx = 0.4, cy = 0, t = 0;
const marks = {};
const log = (k) => { if (!marks[k]) { marks[k] = t; console.log(`${(t / 60).toFixed(1)}m  ${k}  F=${sim.s.run.frontier} grip=${sim.lv("grip")} res=${sim.s.residue}`); } };
const dt = 1 / 30;
while (t < 60 * 90 && !sim.s.ended) {
  t += dt;
  let best = null, bd = 1e9;
  for (const b of sim.bodies) if (b.state === 0) { const d = Math.hypot(b.x - cx, b.y - cy) + (b.hp / sim.force()) * 0.08; if (d < bd) (bd = d), (best = b); }
  let tx = cx, ty = cy;
  if (sim.boundary) { const B = sim.boundary, i = B.segs.findIndex((g) => g.hp > 0), a = B.rot + i * 2.0944 + 0.9; tx = Math.cos(a) * B.r; ty = Math.sin(a) * B.r * 0.52; }
  else if (best) (tx = best.x), (ty = best.y);
  const sp = 1.6 * skill * dt, d = Math.hypot(tx - cx, ty - cy);
  if (d > sp) (cx += ((tx - cx) / d) * sp), (cy += ((ty - cy) / d) * sp); else (cx = tx), (cy = ty);
  sim.step(dt, { x: cx, y: cy, active: true, pulse: sim.pulseCd <= 0, inject: true });
  for (const e of sim.events) {
    if (e.t === "release") log("first release");
    if (e.t === "frontier" && e.id % 10 === 0) log("frontier " + e.id);
    if (e.t === "unfold") log("dynamics");
    if (e.t === "boundary") log("boundary " + e.kind);
    if (e.t === "breach") log("breach " + e.kind);
    if (e.t === "buy" && !marks.b1) log("first buy"), (marks.b1 = 1);
    if (e.t === "limit") log("binding limit");
  }
  sim.events.length = 0;
  if (Math.random() < 0.2) {
    for (const u of [...UPGRADES].sort((a, b) => sim.price(a) - sim.price(b))) if (sim.buy(u.id)) break;
    for (const n of NODES) sim.buyNode(n.id);
  }
  const gate = sim.s.run.frontier >= sim.cap && sim.cap === 59;
  const want = gate || (sim.s.anchors > 0 && !sim.boundary && sim.s.run.time > 240 && sim.s.run.frontier < sim.cap && sim.residueGain() > sim.s.totalResidue * 0.6);
  if (want && sim.canAnchor()) {
    const g = sim.anchor();
    console.log(`${(t / 60).toFixed(1)}m  ANCHOR #${sim.s.anchors} +${g}`);
    for (let k = 0; k < 20; k++) for (const m of MODULES) sim.buyMod(m.id);
    console.log("   mods", JSON.stringify(sim.s.mods), "start F", sim.s.run.frontier);
    for (const k of Object.keys(marks)) if (k.startsWith("frontier")) delete marks[k];
  }
}
console.log("end", (t / 60).toFixed(1), "m F=", sim.s.run.frontier, "ended", sim.s.ended, sim.s.stats);
