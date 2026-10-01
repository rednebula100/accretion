import assert from "node:assert/strict";
import fs from "node:fs";
import { fresh, tick, offlineAsync } from "../src/engine.js";
import { freshWorld } from "../src/systems/world.js";
import { encode, decode } from "../src/save.js";
import { D } from "../src/content.js";

const results = [];
for (const relay of [false, true]) {
  const base = fresh();
  base.world = freshWorld();
  base.world.anchors = 1;
  base.world.manual = Array.from({ length: 60 }, (_, i) => i);
  base.everSeen = [...base.world.manual];
  base.world.modules = relay ? ["relay"] : ["mass", "coupling"];
  base.world.apparatus = ["feed", "field", "grid", "tap"];
  base.energy = D(1e7);
  const a = decode(encode(base)),
    b = decode(encode(base));
  const start = performance.now();
  let yields = 0;
  await offlineAsync(a, 14400, () => yields++);
  const ms = performance.now() - start;
  for (let i = 0; i < 144000; i++) tick(b, 0.1);
  for (const key of ["mass", "energy"])
    assert.equal(a[key].toString(), b[key].toString());
  assert.equal(a.dynamics.flux.toString(), b.dynamics.flux.toString());
  assert.equal(a.highest, b.highest);
  assert.deepEqual(a.queue, b.queue);
  assert.equal(a.simulation.steps, b.simulation.steps);
  assert.equal(a.simulation.pendingOffline, 0);
  assert.ok(a.highest <= 56);
  assert.equal(a.world.anchors, 1);
  assert.equal(a.world.reconstructions, 0);
  results.push({
    relay,
    simulatedSeconds: 14400,
    wallMilliseconds: ms,
    yields,
    highest: a.highest,
    equalTo100msReference: true,
    unknownProgressionBlocked: true,
  });
}
fs.mkdirSync("test-results/pass1", { recursive: true });
fs.writeFileSync(
  "test-results/pass1/offline.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results));
