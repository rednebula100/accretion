import test from "node:test";
import assert from "node:assert/strict";
import { fresh, tick, buy, offline } from "../src/engine.js";
import { D } from "../src/content.js";
import {
  freshWorld,
  convertFlux,
  reconstructWorld,
  anchorWorld,
  anchorGain,
  decodeWorld,
} from "../src/systems/world.js";
import { encode, decode } from "../src/save.js";
import { checkGraph } from "../scripts/check-world-graph.mjs";
test("Authored Dynamics paths have no card or long-edge collisions", () =>
  assert.deepEqual(checkGraph(), []));
test("Converter dumping is bounded and does not restore lost Reconstruction Flux", () => {
  const s = fresh();
  s.world = freshWorld();
  s.world.apparatus = ["tap"];
  s.world.flow = ["deep"];
  s.dynamics.flux = D(100);
  assert.ok(convertFlux(s));
  assert.equal(convertFlux(s), false);
  assert.ok(reconstructWorld(s));
  assert.equal(s.dynamics.flux.toNumber(), 20);
  assert.equal(convertFlux(s), false);
  tick(s, 15);
  assert.ok(convertFlux(s));
});
test("Spatial offline uses identical Relay rules and survives an in-flight reload", () => {
  const a = fresh();
  a.world = freshWorld();
  a.world.manual = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  a.world.modules = ["relay"];
  a.world.anchors = 1;
  a.energy = D(1e5);
  tick(a, 0.7);
  const b = decode(encode(a));
  offline(a, 40);
  for (let i = 0; i < 400; i++) tick(b, 0.1);
  assert.equal(a.mass.toString(), b.mass.toString());
  assert.equal(a.energy.toString(), b.energy.toString());
  assert.equal(a.highest, b.highest);
  assert.ok(a.highest <= 6);
});
test("P1 module ownership survives subsequent Anchor while operation clocks reset", () => {
  const s = fresh();
  s.world = freshWorld();
  s.world.anchors = 1;
  s.world.modules = ["relay", "mass"];
  s.world.boundary = "READY";
  s.highest = 65;
  s.world.conversionCooldown = 8;
  const gain = anchorGain(s);
  assert.equal(anchorWorld(s, fresh), gain);
  assert.deepEqual(s.world.modules, ["relay", "mass"]);
  assert.equal(s.world.conversionCooldown, 0);
  assert.equal(s.world.relay.clock, 0);
});
test("Manual mastery is awarded on absorption rather than on an unfulfilled order", () => {
  const s = fresh();
  s.world = freshWorld();
  assert.ok(buy(s, 0));
  assert.deepEqual(s.world.manual, []);
  tick(s, 3);
  assert.deepEqual(s.world.manual, [0]);
});
test("Old frontier compatibility is bounded and does not create P1 currency", () => {
  const w = freshWorld();
  w.compatibilityFrontier = 175;
  const restored = decodeWorld(w);
  assert.equal(restored.compatibilityFrontier, 175);
  assert.equal(restored.residue, 0);
  assert.equal(restored.anchors, 0);
  assert.deepEqual(restored.modules, []);
});

test("A paused owned Relay and established Anchor location survive a new Seed", () => {
  const s = fresh();
  s.world = freshWorld();
  s.world.anchors = 1;
  s.world.modules = ["relay"];
  s.world.relay.enabled = false;
  s.world.locations.anchor = "ACTIVE";
  s.world.boundary = "READY";
  s.highest = 59;
  assert.ok(anchorWorld(s, fresh));
  assert.equal(s.world.relay.enabled, false);
  assert.equal(s.world.locations.anchor, "ACTIVE");
});
test("Unknown spatial regions cannot silently load a broken graph", () => {
  const w = freshWorld();
  w.region = 7;
  assert.throws(() => decodeWorld(w), /region/);
});
