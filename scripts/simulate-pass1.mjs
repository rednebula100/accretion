import { fresh, tick, buy, unlocked } from "../src/engine.js";
import {
  freshWorld,
  purchaseApparatus,
  purchaseFlow,
  enterLocation,
  reconstructionReady,
  reconstructWorld,
  spendCoherence,
  anchorWorld,
  purchaseModule,
} from "../src/systems/world.js";
import { APPARATUS, FLOW_NODES } from "../src/data/pass1.js";
export function simulate(policy = "power") {
  const s = fresh();
  s.world = freshWorld();
  const milestones = [];
  let lastAction = 0,
    maxWait = 0,
    previousActions = 0;
  for (let t = 0; t < 2400; t += 0.1) {
    const w = s.world;
    for (const n of APPARATUS) purchaseApparatus(s, n.id);
    enterLocation(s, "dynamics");
    for (const n of FLOW_NODES)
      if (n.region === 0 || w.choices.includes("region")) purchaseFlow(s, n.id);
    if (reconstructionReady(s) && s.world.flow.includes("deep")) {
      reconstructWorld(s);
      milestones.push({ type: "reconstruction", t });
    }
    for (const id of ["region", "residual", "known"]) spendCoherence(s, id);
    const i = unlocked(s);
    if (
      i > s.highest &&
      !s.queue.some((q) => q.matter === i) &&
      !(w.modules.includes("relay") && i <= Math.max(...w.manual) - 3)
    )
      buy(s, i);
    tick(s, 0.1);
    if (w.telemetry.length > previousActions) {
      maxWait = Math.max(maxWait, t - lastAction);
      lastAction = t;
      previousActions = w.telemetry.length;
    }
    if (w.boundary === "READY") {
      milestones.push({
        type: "anchor",
        t,
        actions: w.telemetry.filter(
          (e) => e.run === w.anchors && !["relay", "visit"].includes(e.type),
        ).length,
      });
      if (w.anchors) break;
      anchorWorld(s, fresh);
      for (const id of policy === "relay" ? ["relay"] : ["mass", "coupling"])
        purchaseModule(s, id);
    }
  }
  return {
    policy,
    milestones,
    maxWait,
    highest: s.highest,
    energy: s.energy.toString(),
    apparatus: s.world.apparatus,
    telemetry: s.world.telemetry,
  };
}
if (process.argv[1]?.endsWith("simulate-pass1.mjs"))
  for (const p of ["power", "relay"]) {
    const r = simulate(p);
    console.log(JSON.stringify({ ...r, telemetry: undefined }));
  }
