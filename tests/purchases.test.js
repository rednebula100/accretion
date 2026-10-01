import test from "node:test";
import assert from "node:assert/strict";
import { fresh, quote, buy, fmt } from "../src/engine.js";
import { D } from "../src/content.js";
test("bulk quote and commit agree across affordability and room boundaries", () => {
  for (const affordable of [0, 1, 5, 500]) for (const room of [0, 3, 100, 200]) for (const count of [1, 10, 100, "MAX"]) {
    const s = fresh(); s.nodes = ["st-parallel"]; s.dynamics.capabilities=['b-queue']; s.energy = D(12).mul(affordable);
    s.queue = Array.from({ length: 200 - room }, (_, id) => ({ id,cost:'0' }));
    const before = s.energy, q = quote(s, 0, count), n = buy(s, 0, count);
    assert.equal(n, Math.min(affordable, room, count === "MAX" ? 100 : count));
    assert.equal(n, q.quantity); assert.ok(before.sub(s.energy).eq(q.total));
    assert.ok(s.energy.gte(0)); assert.ok(s.queue.length <= 200);
  }
});
test("purchase obtains a fresh quote when the balance changes", () => {
  const s = fresh(); const earlier = quote(s, 0, 10); s.energy = D(12);
  assert.equal(earlier.quantity, 3); assert.equal(buy(s, 0, 10), 1);
  assert.equal(buy(s, 199, 1), 0);
});
test("scientific notation normalizes rounded mantissas and layered exponents", () => {
  assert.equal(fmt("9.99999e20"), "1.00e21");
  assert.equal(fmt("0.000999999"), "1.00e-3");
  assert.equal(fmt("-9.99999e20"), "−1.00e21");
  assert.equal(fmt("1e10000"), "1.00e10000");
  assert.ok(!/NaN|Infinity|0e/.test(fmt("ee400")));
});
