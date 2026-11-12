import test from "node:test";
import assert from "node:assert/strict";
import { Sim, newSave } from "../src/game/sim.js";
import { MATTER, UPGRADES, need } from "../src/game/data.js";

const rng = (seed = 1) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const idle = { x: 9, y: 9, active: false, pulse: false, inject: false };

test("matter table is monotone and complete", () => {
  assert.equal(MATTER.length, 200);
  for (let i = 1; i < 200; i++) assert.ok(MATTER[i].mass > MATTER[i - 1].mass && MATTER[i].hp > MATTER[i - 1].hp);
});
test("no child upgrade is cheaper than the node that unlocks it", () => {
  for (const u of UPGRADES) for (const id of Object.keys(u.req || {})) assert.ok(u.base > UPGRADES.find((x) => x.id === id).base, u.id);
});
test("lens capture pays energy, mass arrives on absorption, frontier needs frontier-species absorptions", () => {
  const sim = new Sim(newSave(), rng());
  const b = sim.spawn(0, { r: 0.5, a: 0 });
  b.age = 5;
  sim.step(0.016, idle);
  for (let i = 0; i < 200 && b.state === 0; i++) sim.step(0.016, { ...idle, x: b.x, y: b.y, active: true });
  assert.equal(b.state, 1);
  assert.ok(sim.s.run.energy > 0);
  const m0 = sim.s.run.mass;
  for (let i = 0; i < 400 && sim.bodies.includes(b); i++) sim.step(0.016, idle);
  assert.ok(sim.s.run.mass > m0);
  assert.equal(sim.s.run.prog, 1);
  sim.s.run.prog = need(0);
  sim.step(0.016, idle);
  assert.equal(sim.s.run.frontier, 1);
});
test("binding limit holds at 59 until the first anchor; anchor resets the run and keeps residue", () => {
  const sim = new Sim(newSave(), rng(3));
  sim.s.run.frontier = 59;
  sim.s.run.prog = 999;
  sim.s.run.energy = 1e6;
  sim.buy("grip");
  sim.step(0.016, idle);
  assert.equal(sim.s.run.frontier, 59);
  assert.ok(sim.events.some((e) => e.t === "limit"));
  const gain = sim.anchor();
  assert.equal(gain, 10);
  assert.equal(sim.s.residue, 10);
  assert.equal(sim.s.run.frontier, 0);
  assert.equal(sim.lv("grip"), 0);
  assert.equal(sim.cap, 79);
  assert.ok(sim.buyMod("relay"));
  assert.equal(sim.st.relays, 1);
});
test("field release fires at 100 pressure and boundary breaks open the next band", () => {
  const sim = new Sim(newSave(), rng(5));
  sim.s.anchors = 1;
  sim.s.run.frontier = 79;
  sim.s.run.prog = 999;
  sim.step(0.016, idle);
  assert.ok(sim.boundary);
  for (const g of [...sim.boundary.segs]) sim.hitSeg(g, g.max * 2);
  assert.equal(sim.boundary, null);
  assert.ok(sim.s.breached.planetary);
  sim.pressure = 99.9;
  const b = sim.spawn(0);
  sim.capture(b, "lens");
  assert.ok(sim.events.some((e) => e.t === "release"));
  assert.equal(sim.pressure, 0);
});
