import test from "node:test";
import assert from "node:assert/strict";
import { fresh, tick, buy, unlocked } from "../src/engine.js";
import { D } from "../src/content.js";
import {
  freshWorld,
  purchaseFlow,
  reconstructWorld,
  spendCoherence,
  anchorGain,
  anchorWorld,
  purchaseModule,
  enterLocation,
} from "../src/systems/world.js";
import { encode, decode } from "../src/save.js";
import { CameraDirector } from "../src/ui/camera.js";
import { interpolatedAge } from "../src/ui/presentation.js";
import { simulate } from "../scripts/simulate-pass1.mjs";
const seed = () => Object.assign(fresh(), { world: freshWorld() });
test("Spatial economy stays on the same lattice online, partitioned and save roundtrip", () => {
  const a = seed(),
    b = seed();
  buy(a, 0);
  buy(b, 0);
  tick(a, 12);
  for (let i = 0; i < 1440; i++) tick(b, 1 / 120);
  assert.equal(a.energy.toString(), b.energy.toString());
  assert.equal(a.mass.toString(), b.mass.toString());
  assert.equal(decode(encode(a)).world.manual[0], 0);
});
test("Dynamics detection and activation are explicit; Reconstruction clears only local flow", () => {
  const s = seed();
  s.world.apparatus = ["grid", "tap"];
  tick(s, 0.1);
  assert.equal(s.world.locations.dynamics, "DETECTED");
  assert.equal(purchaseFlow(s, "inflow"), false);
  enterLocation(s, "dynamics");
  s.dynamics.flux = D(1000);
  for (const id of ["inflow", "density", "reservoir", "deep"])
    assert.ok(purchaseFlow(s, id));
  const e = s.energy.toString(),
    m = s.mass.toString();
  assert.equal(reconstructWorld(s, { automatic: true }), false);
  assert.ok(reconstructWorld(s));
  assert.equal(s.world.coherence, 6);
  assert.deepEqual(s.world.flow, []);
  assert.equal(s.energy.toString(), e);
  assert.equal(s.mass.toString(), m);
  assert.ok(spendCoherence(s, "region"));
  assert.equal(s.world.coherence, 4);
  assert.equal(spendCoherence(s, "region"), false);
  assert.ok(spendCoherence(s, "residual"));
});
test("Binding lifecycle and Anchor are guarded, preview exact and knowledge retained", () => {
  const s = seed();
  s.highest = 40;
  tick(s, 0.1);
  assert.equal(s.world.boundary, "ECHO");
  s.highest = 45;
  tick(s, 0.1);
  assert.equal(s.world.boundary, "DETECTED");
  s.highest = 50;
  tick(s, 0.1);
  assert.equal(s.world.boundary, "ACTIVE");
  s.highest = 59;
  s.world.apparatus = ["binding"];
  s.world.reconstructions = 1;
  s.everSeen = [0, 59];
  s.world.manual = [0, 59];
  s.world.coherence = 2;
  s.world.flow = ["counter"];
  s.world.choices = ["region"];
  tick(s, 0.1);
  assert.equal(s.world.boundary, "READY");
  const gain = anchorGain(s);
  assert.equal(anchorWorld(s, fresh, { automatic: true }), false);
  assert.equal(anchorWorld(s, fresh), gain);
  assert.equal(s.world.residue, gain);
  assert.equal(s.highest, -1);
  assert.deepEqual(s.queue, []);
  assert.deepEqual(s.world.apparatus, []);
  assert.deepEqual(s.world.flow, []);
  assert.equal(s.world.coherence, 0);
  assert.deepEqual(s.everSeen, [0, 59]);
  assert.deepEqual(s.world.manual, [0, 59]);
  assert.equal(s.world.locations.anchor, "DETECTED");
});
test("Purchased relay never buys unknown identities or first major frontier", () => {
  const s = seed();
  s.world.anchors = 1;
  s.world.residue = 8;
  s.world.manual = [0, 1, 2, 3, 4, 5];
  assert.ok(purchaseModule(s, "relay"));
  s.energy = D(1e8);
  tick(s, 40);
  assert.ok(s.highest <= 2);
  assert.equal(buy(s, 3, 1, { automatic: true }), 0);
  assert.equal(buy(s, 6, 1, { automatic: true }), 0);
  assert.ok(unlocked(s) <= 3);
});
test("Spatial save decoder rejects malformed ownership and balances", () => {
  const s = seed(),
    raw = JSON.parse(encode(s));
  raw.world.residue = -1;
  assert.throws(() => decode(JSON.stringify(raw)));
  raw.world.residue = 0;
  raw.world.modules = ["future-cheat"];
  assert.throws(() => decode(JSON.stringify(raw)));
});
test("Camera travel time is refresh independent, interrupt keeps position and Esc backs a depth", () => {
  for (const hz of [60, 120, 144]) {
    const c = new CameraDirector();
    c.go("dynamics");
    for (let i = 0; i < hz; i++) c.update(1 / hz);
    assert.equal(c.y, 660);
    c.go("matter");
    c.update(0.2);
    const y = c.y;
    assert.ok(c.interrupt());
    c.update(2);
    assert.equal(c.y, y);
    c.depth = 2;
    c.back();
    assert.equal(c.depth, 1);
    c.back();
    assert.equal(c.depth, 0);
  }
});
test("Matter previous/current interpolation is smooth and never advances canonical age", () => {
  const q = { previousAge: 1, age: 1.1 };
  assert.equal(interpolatedAge(q, 0.5), 1.05);
  assert.equal(interpolatedAge(q, 1), 1.1);
  assert.equal(q.age, 1.1);
});
test("Real-engine first Anchor meets timing, both P1 choices accelerate recovery", () => {
  for (const policy of ["power", "relay"]) {
    const r = simulate(policy),
      a = r.milestones.filter((x) => x.type === "anchor");
    assert.equal(a.length, 2);
    assert.ok(a[0].t >= 540 && a[0].t <= 780);
    assert.ok(a[1].t - a[0].t < a[0].t * 0.5);
    assert.ok(r.maxWait < 45);
  }
});
