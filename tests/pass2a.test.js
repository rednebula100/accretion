import test from "node:test";
import assert from "node:assert/strict";
import { fresh, tick, buy, buyMasteredGroup, unlocked } from "../src/engine.js";
import { D } from "../src/content.js";
import {
  freshWorld,
  purchaseApparatus,
  reconstructWorld,
  spendCoherence,
  anchorWorld,
  decodeWorld,
} from "../src/systems/world.js";
import {
  regime,
  addStability,
  absorbProgress,
  automaticMatter,
  breachPlanetary,
  constructSeed,
  converge,
  convergenceGain,
  returnCoherence,
} from "../src/systems/spatial-progression.js";
import {
  solveArray,
  validLayout,
  applyArray,
  buyArrayTech,
} from "../src/systems/array.js";
import { encode, decode } from "../src/save.js";
import { ErasureSequence } from "../src/ui/erasure-well.js";
import { LAYOUTS, simulatePass2a } from "../scripts/simulate-pass2a.mjs";
const seed = () => Object.assign(fresh(), { world: freshWorld() });
test("Stability gates are independent of Anchor count and duplicate absorption cannot farm", () => {
  const s = seed();
  s.world.anchors = 1;
  for (let i = 0; i < 1000; i++) absorbProgress(s, 60);
  assert.equal(s.world.stability, 1.6);
  for (const [st, r] of [
    [0, 1],
    [24, 2],
    [58, 3],
    [105, 4],
  ]) {
    s.world.stability = st;
    assert.equal(regime(s), r);
  }
});
test("P1 persists through Anchor but not Convergence; blueprint, tech, Alignment and CL survive", () => {
  const s = seed(),
    w = s.world;
  w.stability = 106;
  w.modules = ["mass", "relay"];
  w.boundary = "READY";
  w.knownApparatus = ["feed"];
  w.manual = [0, 59];
  s.highest = 59;
  anchorWorld(s, fresh);
  assert.deepEqual(s.world.modules, ["mass", "relay"]);
  assert.equal(s.world.stability, 106);
  s.world.p2.seedBuilt = true;
  assert.equal(converge(s, fresh, freshWorld), 8);
  assert.deepEqual(s.world.modules, []);
  assert.equal(s.world.stability, 0);
  assert.equal(s.world.residue, 0);
  assert.ok(applyArray(s, LAYOUTS.competent));
  assert.ok(buyArrayTech(s, "capacity"));
  s.world.p2.potential = 150;
  s.world.p2.live = 1;
  const before = structuredClone(s.world.p2),
    gain = convergenceGain(s);
  assert.equal(converge(s, fresh, freshWorld), gain);
  assert.equal(s.world.p2.cl, 2);
  assert.equal(s.world.p2.alignment, before.alignment + gain);
  assert.deepEqual(s.world.p2.layout, before.layout);
  assert.deepEqual(s.world.p2.tech, ["capacity"]);
  assert.equal(s.world.p2.live, 0);
  assert.equal(s.world.p2.potential, 0);
  assert.equal(s.world.p2.seedBuilt, true);
});
test("First Coherence award buys only two roles and refund always rescues Region B", () => {
  const s = seed();
  s.world.coherence = 4;
  assert.ok(spendCoherence(s, "residual"));
  assert.ok(spendCoherence(s, "known"));
  assert.equal(spendCoherence(s, "region"), false);
  assert.ok(returnCoherence(s, "known"));
  assert.ok(spendCoherence(s, "region"));
  assert.equal(returnCoherence(s, "region"), false);
});
test("Imprint only restores paid manual schematics and Recall cannot discover a region", () => {
  const s = seed();
  s.highest = 79;
  s.energy = D(1e12);
  s.world.modules = ["imprint", "recall"];
  s.world.knownApparatus = ["feed"];
  s.dynamics.flux = D(1000);
  tick(s, 1);
  assert.deepEqual(s.world.apparatus, ["feed"]);
  assert.equal(s.world.reconstructions, 0);
  assert.equal(purchaseApparatus(s, "planetary", { automatic: true }), false);
  s.world.apparatus.push("tap");
  s.world.knownRegions = [0];
  tick(s, 0.5);
  assert.equal(s.world.region, 1);
  assert.equal(s.world.coherence, 6);
  assert.deepEqual(s.world.flow, []);
});
test("Scheduler, spool and Bulk cannot conquer new or important Matter", () => {
  const s = seed();
  s.world.modules = ["relay", "scheduler", "spool", "bulk"];
  s.world.manual = Array.from({ length: 80 }, (_, i) => i);
  s.energy = D(1e20);
  s.world.anchors = 1;
  assert.ok(automaticMatter(s, 79));
  assert.equal(automaticMatter(s, 80), false);
  assert.equal(buy(s, 80, 1, { automatic: true }), 0);
  assert.equal(buyMasteredGroup(s), 5);
  assert.equal(s.queue.length, 5);
  tick(s, 0.2);
  assert.equal(s.highest, 4);
  assert.equal(s.world.manual.length, 80);
  s.queue = [];
  s.highest = 59;
  assert.equal(buyMasteredGroup(s), 0);
  s.world.manual = [0];
  s.highest = 0;
  assert.equal(buy(s, 1, 1, { spooled: true }), 0);
});
test("Player regulator respects disabled, overflow, energy reserve target and cap", () => {
  const s = seed();
  s.world.modules = ["regulator"];
  s.world.apparatus = ["tap"];
  s.dynamics.flux = D(1000);
  s.energy = D(0);
  let r = s.world.automation.regulator;
  r.overflow = 900;
  r.cap = 100;
  r.reserve = 80;
  r.ratio = 1;
  tick(s, 0.5);
  assert.equal(s.world.conversionCooldown, 0);
  r.enabled = true;
  tick(s, 0.5);
  assert.ok(s.world.conversionCooldown > 0);
  s.world.conversionCooldown = 0;
  s.energy = D(1000);
  tick(s, 0.5);
  assert.equal(s.world.conversionCooldown, 0);
  s.energy = D(0);
  r.overflow = 2000;
  tick(s, 0.5);
  assert.equal(s.world.conversionCooldown, 0);
});
test("Planetary lifecycle, first-discovery guard and semantic capability gate", () => {
  const s = seed();
  s.world.anchors = 1;
  for (const [i, stage] of [
    [64, "ECHO"],
    [69, "DETECTED"],
    [74, "ACTIVE"],
  ]) {
    s.highest = i;
    tick(s, 0.1);
    assert.equal(s.world.planetary, stage);
  }
  s.highest = 79;
  s.world.stability = 58;
  s.world.apparatus = ["planetary"];
  s.world.flow = ["shear"];
  tick(s, 0.1);
  assert.equal(s.world.planetary, "READY");
  assert.equal(unlocked(s), 79);
  assert.equal(breachPlanetary(s, { automatic: true }), false);
  assert.ok(breachPlanetary(s));
  assert.equal(unlocked(s), 80);
  tick(s, 0.1);
  assert.equal(s.world.planetary, "KNOWN");
});
test("One-time Seed consumes three subsystem contributions and never repeats at CL1", () => {
  const s = seed(),
    w = s.world;
  w.modules = ["fabricator"];
  w.capabilities = ["CAP_PLANETARY_BINDING"];
  w.residue = 30;
  w.apparatus = ["link"];
  s.dynamics.flux = D(420);
  s.highest = 95;
  for (const id of ["field", "flow", "link"]) assert.ok(constructSeed(s, id));
  assert.equal(w.residue, 0);
  assert.equal(s.dynamics.flux.toNumber(), 0);
  assert.equal(w.p2.seedBuilt, true);
  assert.equal(constructSeed(s, "field"), false);
  converge(s, fresh, freshWorld);
  assert.equal(constructSeed(s, "flow"), false);
});
test("Nodal solver conserves flow, topology locks matter and empty sources have zero output", () => {
  const m = solveArray(LAYOUTS.competent);
  for (let i = 0; i < 9; i++)
    if (LAYOUTS.competent[i] !== "inlet")
      assert.ok(Math.abs(m.balance[i]) < 1e-8);
  assert.equal(solveArray(Array(9).fill(null)).throughput, 0);
  const bad = [...LAYOUTS.competent];
  bad[8] = "sink";
  assert.equal(validLayout(bad), false);
  bad[6] = null;
  assert.equal(validLayout(bad, ["radial"]), true);
});
test("Planning Apply is atomic and invalid edits leave live layout untouched", () => {
  const s = seed();
  s.world.p2.cl = 1;
  s.world.p2.seedBuilt = true;
  const before = [...s.world.p2.layout];
  const draft = [...LAYOUTS.competent];
  solveArray(draft);
  assert.deepEqual(s.world.p2.layout, before);
  draft[0] = "sink";
  assert.equal(applyArray(s, draft), false);
  assert.deepEqual(s.world.p2.layout, before);
  assert.ok(applyArray(s, LAYOUTS.competent));
});
test("CL1 novice stress is viable; placement changes Potential and Flux tradeoff", () => {
  const n = solveArray(LAYOUTS.novice),
    c = solveArray(LAYOUTS.competent),
    o = solveArray(LAYOUTS.optimized);
  assert.ok(n.peak >= 0.9 && n.peak <= 1.2);
  assert.ok(c.quality > n.quality);
  assert.ok(o.quality > c.quality);
  assert.ok(n.flux > c.flux);
  for (const [m, min, max] of [
    [n, 330, 420],
    [c, 240, 300],
    [o, 192, 252],
  ]) {
    const t = 100 / (m.quality ** 2 * 0.35);
    assert.ok(t >= min && t <= max, `${t} not ${min}..${max}`);
  }
});
test("P2 dormant skeleton repowers from real base economy; empty layout makes no Potential", () => {
  const s = seed();
  s.world.p2.cl = 1;
  s.world.p2.seedBuilt = true;
  tick(s, 20);
  assert.equal(s.world.p2.live, 0);
  buy(s, 0);
  tick(s, 20);
  assert.ok(s.world.p2.live > 0);
  assert.equal(s.world.p2.potential, 0);
  applyArray(s, LAYOUTS.competent);
  tick(s, 20);
  assert.ok(s.world.p2.potential > 0);
});
test("Spatial migration adds no free progression; malformed Array/automation is rejected", () => {
  const s = seed(),
    raw = JSON.parse(encode(s));
  delete raw.world.stability;
  const migrated = decode(JSON.stringify(raw));
  assert.equal(migrated.world.p2.cl, 0);
  assert.equal(migrated.world.stability, 0);
  const current = JSON.parse(encode(s));
  current.world.p2.layout[0] = "future-dynamo";
  assert.throws(() => decode(JSON.stringify(current)));
  current.world.p2.layout[0] = null;
  current.world.automation.regulator.ratio = -1;
  assert.throws(() => decode(JSON.stringify(current)));
});
test("Array and automation exact parity survives partitioned steps and save roundtrip", () => {
  const a = seed();
  a.world.p2.cl = 1;
  a.world.p2.seedBuilt = true;
  applyArray(a, LAYOUTS.competent);
  a.highest = 60;
  const b = decode(encode(a));
  tick(a, 120);
  for (let i = 0; i < 1200; i++) tick(b, 0.1);
  assert.equal(a.world.p2.potential, b.world.p2.potential);
  assert.equal(a.energy.toString(), b.energy.toString());
  assert.equal(a.dynamics.flux.toString(), b.dynamics.flux.toString());
  assert.deepEqual(decode(encode(a)).world.p2, a.world.p2);
});
test("Erasure needs seal, sustained hold, final action; backups precede removal", () => {
  const q = new ErasureSequence(),
    map = new Map([
      ["accretion.save.v3", "original"],
      ["accretion.save.v2", "legacy"],
    ]),
    store = {
      setItem: (k, v) => map.set(k, v),
      removeItem: (k) => map.delete(k),
    };
  const s = seed();
  assert.equal(q.erase(s, store), false);
  q.breakSeal();
  q.hold(0);
  assert.equal(q.release(1000), false);
  assert.equal(q.erase(s, store), false);
  q.hold(2000);
  assert.ok(q.release(4600));
  assert.ok(q.erase(s, store));
  assert.equal(map.has("accretion.save.v3"), false);
  assert.equal(map.has("accretion.save.v2"), false);
  assert.ok(decode(map.get("accretion.emergency.pre-erasure")));
  assert.equal(q.stage, "SEALED");
});
test("Erasure aborts without deleting when emergency backup fails", () => {
  const q = new ErasureSequence();
  q.breakSeal();
  q.hold(0);
  q.release(3000);
  let removed = false;
  assert.throws(() =>
    q.erase(seed(), {
      setItem() {
        throw Error("quota");
      },
      removeItem() {
        removed = true;
      },
    }),
  );
  assert.equal(removed, false);
});
for (const policy of ["power", "automation", "deep", "plausible"])
  test(`Full production-rule route: ${policy} reaches second Convergence`, () => {
    const r = simulatePass2a(policy);
    assert.equal(r.complete, true);
    const first = r.milestones.find((e) => e.type === "anchor"),
      c = r.milestones.filter((e) => e.type === "convergence");
    assert.ok(first.time >= 600 && first.time <= 720);
    assert.equal(c.length, 2);
    assert.ok(c[0].time >= 1500 && c[0].time <= 2100);
    assert.ok(r.runs.slice(2, -1).some((n) => n.matter < r.runs[0].matter / 2));
  });

test("Stress over 140% collapses efficiency; all five Alignment purchases are paid and persist", () => {
  const m = solveArray([
    "inlet",
    "stabilizer",
    "stabilizer",
    "shear",
    "shear",
    null,
    "sink",
    "sink",
    null,
  ]);
  assert.ok(m.peak > 1.4);
  assert.ok(m.efficiency < 0.2);
  const s = seed();
  s.world.p2.cl = 1;
  s.world.p2.seedBuilt = true;
  s.world.p2.alignment = 25;
  for (const id of ["capacity", "radial", "shear", "afterimage", "compression"])
    assert.ok(buyArrayTech(s, id));
  assert.equal(s.world.p2.alignment, 0);
  assert.equal(buyArrayTech(s, "capacity"), false);
  s.world.p2.potential = 100;
  converge(s, fresh, freshWorld);
  assert.equal(s.world.p2.tech.length, 5);
  assert.equal(s.world.residue, 12);
  assert.equal(s.world.p2.live, 0);
});
