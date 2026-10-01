import test from "node:test";
import assert from "node:assert/strict";
import { SessionClock } from "../src/ui/session-clock.js";
import { fresh, tick, offline } from "../src/engine.js";
import { freshWorld } from "../src/systems/world.js";
test("Visible stalls and hidden elapsed time reach the economy exactly once", () => {
  const clock = new SessionClock(0),
    s = fresh();
  s.world = freshWorld();
  tick(s, clock.frame(250));
  clock.hide(250);
  tick(s, clock.frame(5250));
  offline(s, clock.resume(10250));
  tick(s, clock.frame(10500));
  assert.equal(s.simulation.steps, 105);
  assert.equal(clock.resume(10500), 0);
});
test("Hidden reset presentation resumes without offline or RAF double advancement", () => {
  const clock = new SessionClock(0);
  clock.hide(100, true);
  assert.equal(clock.frame(500), 0);
  assert.equal(clock.resume(10000), 0);
  assert.equal(clock.frame(10050), 0.05);
});
