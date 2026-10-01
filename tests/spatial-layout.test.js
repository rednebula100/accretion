import test from "node:test";
import assert from "node:assert/strict";
import { fresh } from "../src/engine.js";
import { freshWorld } from "../src/systems/world.js";
import { encode, decode } from "../src/save.js";
import {
  compositionState,
  deriveLayout,
  overlaps,
  centerDistance,
  box,
} from "../src/ui/spatial-layout.js";
const state = () => Object.assign(fresh(), { world: freshWorld() });
function sample(stage) {
  const s = state(),
    w = s.world;
  if (stage !== "FRESH") {
    w.anchors = 1;
    w.locations.anchor = "ACTIVE";
    w.locations.dynamics = "ACTIVE";
    w.locations.converter = "ACTIVE";
  }
  if (stage === "PLANETARY") w.planetary = "ACTIVE";
  if (stage === "ARRAY_ECHO") w.modules.push("surveyor");
  if (stage === "ARRAY_ACTIVE") {
    w.p2.cl = 1;
    w.p2.seedBuilt = true;
  }
  return s;
}
for (const stage of [
  "FRESH",
  "ANCHORED",
  "PLANETARY",
  "ARRAY_ECHO",
  "ARRAY_ACTIVE",
]) {
  test(`${stage}: deterministic, sector-safe, collision-free composition at every focus`, () => {
    const s = sample(stage);
    for (const focus of ["universe", ...compositionState(s).visible]) {
      const c = compositionState(s, focus, focus === "universe" ? 0 : 1),
        layout = deriveLayout(c);
      assert.equal(layout.stage, stage);
      assert.deepEqual(layout, deriveLayout(structuredClone(c)));
      const p = layout.points,
        utilities = Object.values(p).filter((p) => p.sector !== "CENTER");
      assert.ok(p.matter.x < 0 && p.structure.x < 0 && p.structure.y < 0);
      if (p.anchor) assert.ok(p.anchor.x > 0);
      if (p.dynamics) assert.ok(p.dynamics.y > 0);
      if (p.converter) assert.ok(p.converter.x > 0 && p.converter.y > 0);
      for (let i = 0; i < utilities.length; i++) {
        assert.ok(centerDistance(utilities[i]) >= layout.center - 1e-8);
        for (let j = 0; j < i; j++)
          assert.equal(
            overlaps(utilities[i], utilities[j], 75),
            false,
            `${focus}: ${utilities[i].id}/${utilities[j].id}`,
          );
        const b = box(utilities[i]);
        assert.ok(
          layout.bounds.left <= b.left - layout.padding &&
            layout.bounds.right >= b.right + layout.padding,
        );
      }
      if (p.array) assert.deepEqual(p.array.origin, { x: 0, y: 0 });
    }
  });
}
test("ordinary purchase/currency changes do not reflow; meaningful transitions do", () => {
  const s = sample("PLANETARY"),
    a = compositionState(s);
  s.energy = s.energy.mul(100);
  s.world.apparatus.push("feed");
  s.world.modules.push("mass");
  assert.deepEqual(compositionState(s), a);
  s.world.capabilities.push("CAP_PLANETARY_BINDING");
  s.world.planetary = "COMPLETE";
  assert.equal(compositionState(s).stage, "ANCHORED");
  s.world.modules.push("surveyor");
  assert.equal(compositionState(s).stage, "ARRAY_ECHO");
});
test("mastery compresses D0, retains full D1 and new Dynamics region", () => {
  const s = sample("ANCHORED");
  const before = deriveLayout(compositionState(s));
  s.world.modules.push("bulk", "imprint", "recall");
  s.world.knownRegions.push(0);
  const after = deriveLayout(compositionState(s));
  assert.ok(
    after.points.matter.footprint[0] < before.points.matter.footprint[0],
  );
  assert.equal(after.points.dynamics.presentationState, "mastered");
  assert.equal(
    deriveLayout(compositionState(s, "structure", 1)).points.structure
      .presentationState,
    "full",
  );
  s.world.region = 1;
  assert.equal(compositionState(s).mastery.dynamics, "manual");
});
test("layout derivation leaves save unchanged and reload reconstructs the same targets", () => {
  const s = sample("ARRAY_ACTIVE"),
    before = encode(s),
    unchanged = JSON.stringify(s),
    layout = deriveLayout(compositionState(s));
  assert.equal(JSON.stringify(s), unchanged);
  const restored = decode(before);
  assert.deepEqual(deriveLayout(compositionState(restored)), layout);
  assert.ok(
    !before.includes("presentationPosition") &&
      !before.includes("collisionAvoidanceOffset"),
  );
});
