import test from "node:test";
import assert from "node:assert/strict";
import { fresh } from "../src/engine.js";
import { D } from "../src/content.js";
import {
  freshWorld,
  reconstructionGain,
  reconstructWorld,
  spendCoherence,
} from "../src/systems/world.js";
import { returnCoherence } from "../src/systems/spatial-progression.js";
import {
  revealedFlow,
  revealedApparatus,
  visibilityState,
  ResourcePresentation,
  bindingPresentation,
} from "../src/ui/interaction-state.js";
import {
  compositionState,
  deriveLayout,
  overlaps,
} from "../src/ui/spatial-layout.js";
const seed = () => Object.assign(fresh(), { world: freshWorld() });
test("expanded footprints survive camera focus changes and reserve space", () => {
  const s = seed();
  const a = deriveLayout(
    compositionState(s, "matter", 1, false, ["matter", "structure"]),
  );
  const b = deriveLayout(
    compositionState(s, "structure", 1, false, ["matter", "structure"]),
  );
  for (const id of ["matter", "structure"]) {
    assert.ok(a.points[id].full && b.points[id].full);
    assert.equal(a.points[id].x, b.points[id].x);
  }
  assert.equal(overlaps(a.points.matter, a.points.structure, 140), false);
});
test("Structure concept gates and Dynamics adjacency exclude distant identities", () => {
  const s = seed();
  s.highest = 24;
  assert.equal(
    revealedApparatus(s).some((n) => n.id === "tap"),
    false,
  );
  s.highest = 29;
  assert.ok(revealedApparatus(s).some((n) => n.id === "tap"));
  assert.deepEqual(
    revealedFlow(s).map((n) => n.id),
    ["inflow"],
  );
  s.world.flow = ["inflow"];
  assert.deepEqual(
    revealedFlow(s).map((n) => n.id),
    ["inflow", "density", "reservoir"],
  );
  s.world.flow.push("density");
  assert.equal(
    revealedFlow(s).some((n) => n.id === "deep"),
    false,
  );
  s.world.flow.push("reservoir");
  assert.ok(revealedFlow(s).some((n) => n.id === "deep"));
});
test("partial footprints remain visible with separate exit/reentry thresholds", () => {
  const v = { left: 0, right: 100, top: 0, bottom: 100 };
  const r = (x) => ({ left: x, right: x + 100, top: 0, bottom: 100 });
  assert.equal(visibilityState(r(50), v), "PARTIAL");
  assert.equal(visibilityState(r(95), v), "OFFSCREEN");
  assert.equal(visibilityState(r(90), v, "OFFSCREEN"), "OFFSCREEN");
  assert.equal(visibilityState(r(85), v, "OFFSCREEN"), "PARTIAL");
});
test("Flux presentation is bounded, finite and immediate on spending", () => {
  const p = new ResourcePresentation(D(0));
  assert.equal(p.update(D(1), 0.05).toNumber(), 0.5);
  assert.equal(p.update(D(1), 0.05).toNumber(), 1);
  assert.equal(p.update(D(0.2), 0.01).toNumber(), 0.2);
  assert.equal(p.update(D(0.2), 500).toNumber(), 0.2);
});
test("Coherence preview matches receipt; early, complete and charged yields are distinct", () => {
  for (const [deep, flux, expected] of [
    [false, 0, 3],
    [true, 0, 4],
    [true, 80, 5],
    [true, 240, 6],
    [true, 1e9, 6],
  ]) {
    const s = seed();
    s.world.flow = [
      "inflow",
      "density",
      "reservoir",
      ...(deep ? ["deep"] : []),
    ];
    s.dynamics.flux = D(flux);
    assert.equal(reconstructionGain(s), expected);
    assert.ok(reconstructWorld(s));
    assert.equal(s.world.coherence, expected);
    assert.equal(reconstructWorld(s), false);
    assert.equal(reconstructionGain(s), 0);
  }
});
test("early compression poor first spending is recoverable without farming", () => {
  const s = seed();
  s.world.flow = ["inflow", "density", "reservoir"];
  reconstructWorld(s);
  spendCoherence(s, "known");
  assert.equal(spendCoherence(s, "region"), false);
  assert.ok(returnCoherence(s, "known"));
  assert.ok(spendCoherence(s, "region"));
  assert.equal(reconstructWorld(s), false);
});
test("Binding presentation starts at zero without changing readiness", () => {
  const s = seed();
  s.world.boundary = "ECHO";
  s.highest = 39;
  assert.deepEqual(bindingPresentation(s, [0.7, 1, 0.2]), [0, 0, 0]);
  s.highest = 44;
  const mid = bindingPresentation(s, [0.7, 1, 0.2]);
  assert.ok(mid[1] > 0 && mid[1] < 1);
  s.highest = 59;
  s.world.boundary = "READY";
  assert.deepEqual(bindingPresentation(s, [1, 1, 1]), [1, 1, 1]);
});
