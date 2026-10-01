import test from "node:test";
import assert from "node:assert/strict";
import { D, MATTER, STRUCTURE } from "../src/content.js";
import {
  fresh,
  buy,
  tick,
  unlocked,
  buyNode,
  visibleNodes,
  evaporate,
  canEvaporate,
  renew,
  offline,
  rate,
  reservoirs,
  price,
  duration,
} from "../src/engine.js";
import { encode, decode } from "../src/save.js";
test("category observation activates reservoirs and remembered discounts", () => {
  const s = fresh();
  s.nodes = ["branch-0-2", "branch-0-3"];
  s.seen = [0, 1, 2, 3, 4];
  assert.deepEqual(reservoirs(s), []);
  const before = rate(s);
  s.seen.push(5);
  assert.deepEqual(reservoirs(s), [0]);
  assert.ok(rate(s).gt(before));
  assert.ok(price(s, 0).lt(MATTER[0].cost));
});
test("spin offers an energy versus delivery-time tradeoff", () => {
  const low = fresh(), high = fresh();
  low.nodes = ["core-6"]; high.nodes = ["core-6"];
  low.spin = 0; high.spin = .98;
  assert.ok(rate(high).gt(rate(low)));
  assert.ok(duration(high, 100) > duration(low, 100));
});
test("200 unique data-driven matter forms with physical properties", () => {
  assert.equal(MATTER.length, 200);
  assert.equal(new Set(MATTER.map((m) => m.name)).size, 200);
  for (const m of MATTER) {
    assert.ok(m.mass.gt(0) && m.cost.gt(0) && m.radius > 0);
    assert.ok(m.duration > 0 && m.capture);
  }
});
test("purchase spends energy, delays all mass until physical absorption", () => {
  const s = fresh(),
    mass = s.mass;
  s.energy = D(1000);
  assert.equal(buy(s, 0, 10), 10);
  assert.ok(s.mass.eq(mass));
  assert.equal(s.queue.length, 10);
  tick(s, 1);
  assert.ok(s.mass.eq(mass));
  tick(s, 5);
  assert.equal(s.queue.length, 0);
  assert.ok(s.mass.eq(mass.add(MATTER[0].mass.mul(10))));
});
test("bulk delivery is bounded and every object conserves purchased mass", () => {
  const s = fresh();
  s.energy = D("1e10");
  assert.equal(buy(s, 0, 100), 100);
  assert.equal(buy(s, 0, 100), 0);
  tick(s, 20);
  assert.equal(s.absorbed, 100);
  assert.ok(
    s.mass
      .div(D("1e-13").add(MATTER[0].mass.mul(100)))
      .sub(1)
      .abs()
      .lt("1e-12"),
  );
});
test("future matter and nonadjacent structure are invisible", () => {
  const s = fresh();
  assert.equal(unlocked(s), 0);
  assert.equal(visibleNodes(s).length, 1);
  assert.equal(buy(s, 190), 0);
  assert.equal(buyNode(s, "core-10"), false);
  assert.equal(STRUCTURE.length, 21);
});
test("node purchases never reduce black hole mass", () => {
  const s = fresh(),
    m = s.mass;
  assert.equal(buyNode(s, "st-capture"), true);
  assert.ok(s.mass.eq(m));
  assert.ok(visibleNodes(s).some((n) => n.parent === "st-capture"));
});
test("evaporation resets the hole and queue while preserving permanent knowledge", () => {
  const s = fresh();
  s.highest = 170;
  s.mass = D("1e33");
  s.energy = D("1e70");
  s.nodes = ["core-16"];
  s.research = ["heritage"];
  s.queue = [{ id: 1 }];
  s.everSeen = [1, 2];
  assert.ok(canEvaporate(s));
  assert.ok(evaporate(s).gt(0));
  assert.ok(s.mass.eq("1e-13"));
  assert.equal(s.queue.length, 0);
  assert.equal(s.highest, -1);
  assert.equal(s.runs, 1);
  assert.deepEqual(s.everSeen, [1, 2]);
  assert.ok(s.nodes.includes("st-scheduler"));
});
test("cosmic renewal is genuinely late and resets permanent studies", () => {
  const s = fresh();
  assert.equal(renew(s), false);
  s.runs = 3;
  s.highest = 194;
  s.research = ["conditions"];
  s.information = D(100);
  assert.ok(renew(s));
  assert.equal(s.origins, 1);
  assert.equal(s.runs, 0);
  assert.ok(s.information.eq(0));
  assert.ok(s.research.includes("compression"));
});
test("round trip preserves decimal values and in-transit objects", () => {
  const s = fresh();
  s.energy = D("1e500");
  buy(s, 0, 10);
  const restored = decode(encode(s));
  assert.ok(restored.energy.eq(s.energy));
  assert.deepEqual(restored.queue, s.queue);
  tick(restored, 20);
  assert.equal(restored.absorbed, 10);
});
test("invalid and future save data is rejected without mutating live state", () => {
  const s = fresh();
  for (const text of [
    "{}",
    "{",
    "null",
    JSON.stringify({ ...s, version: 100 }),
    JSON.stringify({ ...s, mass: "NaN" }),
    JSON.stringify({ ...s, queue: [{ matter: 900 }] }),
    JSON.stringify({ ...s, nodes: ["invented"] }),
  ])
    assert.throws(() => decode(text));
  assert.ok(s.mass.eq("1e-13"));
});
test("offline resource production is capped and reports real results", () => {
  const s = fresh();
  const initial = s.energy;
  const r = offline(s, 100000);
  assert.equal(r.seconds, 14400);
  assert.ok(s.energy.eq(initial.add(rate(s).mul(14400))));
  assert.equal(s.absorbed, 0);
});
test("visual quality does not alter simulation", () => {
  const a = fresh(),
    b = fresh();
  a.settings.quality = "ULTRA";
  b.settings.quality = "MOBILE";
  buy(a, 0);
  buy(b, 0);
  for (let t = 0; t < 100; t++) {
    tick(a, 0.5);
    tick(b, 0.5);
  }
  assert.ok(a.mass.eq(b.mass) && a.energy.eq(b.energy));
});
