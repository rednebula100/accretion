import assert from "node:assert/strict";
import fs from "node:fs";
import { tick, offlineAsync } from "../src/engine.js";
import { encode, decode } from "../src/save.js";
const fixtures = JSON.parse(
    fs.readFileSync("test-results/pass2a/fixtures.json", "utf8"),
  ),
  results = [];
for (const id of ["regime-4", "array-active", "potential", "second-result"]) {
  const a = decode(fixtures[id]),
    b = decode(encode(a)),
    cl = a.world.p2.cl,
    anchors = a.world.anchors,
    manual = [...a.world.manual];
  let yields = 0;
  const start = performance.now();
  await offlineAsync(a, 14400, () => yields++);
  const elapsed = performance.now() - start;
  for (let i = 0; i < 144000; i++) tick(b, 0.1);
  for (const k of ["energy", "mass"])
    assert.equal(a[k].toString(), b[k].toString());
  assert.equal(a.dynamics.flux.toString(), b.dynamics.flux.toString());
  assert.deepEqual(a.world.p2, b.world.p2);
  assert.deepEqual(a.queue, b.queue);
  assert.equal(a.simulation.pendingOffline, 0);
  assert.equal(a.world.p2.cl, cl);
  assert.equal(a.world.anchors, anchors);
  assert.deepEqual(a.world.manual, manual);
  assert.deepEqual(decode(encode(a)).world.p2, a.world.p2);
  results.push({
    fixture: id,
    seconds: 14400,
    wallMilliseconds: elapsed,
    yields,
    highest: a.highest,
    potential: a.world.p2.potential,
    cl,
    exactParity: true,
    noAutomaticDiscoveryOrReset: true,
  });
}
fs.writeFileSync(
  "test-results/pass2a/offline.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
