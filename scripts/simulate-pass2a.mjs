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
  drainEvents,
} from "../src/systems/world.js";
import {
  regime,
  breachPlanetary,
  constructSeed,
  convergenceGain,
  converge,
  returnCoherence,
} from "../src/systems/spatial-progression.js";
import { applyArray, buyArrayTech, solveArray } from "../src/systems/array.js";
import { APPARATUS, FLOW_NODES } from "../src/data/pass1.js";
import { encode } from "../src/save.js";
export const LAYOUTS = {
  novice: [
    "inlet",
    null,
    "inlet",
    "shear",
    "stabilizer",
    "shear",
    "sink",
    "stabilizer",
    null,
  ],
  competent: [
    "inlet",
    "inlet",
    null,
    "shear",
    "stabilizer",
    "stabilizer",
    "sink",
    "sink",
    null,
  ],
  optimized: [
    "inlet",
    "inlet",
    null,
    "shear",
    "shear",
    "stabilizer",
    "sink",
    "sink",
    null,
  ],
};
const orders = {
  power: [
    "mass",
    "coupling",
    "energy",
    "spool",
    "imprint",
    "navigation",
    "surveyor",
    "recall",
    "fabricator",
    "bulk",
    "relay",
    "scheduler",
    "regulator",
  ],
  automation: [
    "relay",
    "imprint",
    "spool",
    "recall",
    "scheduler",
    "navigation",
    "surveyor",
    "energy",
    "coupling",
    "mass",
    "bulk",
    "fabricator",
    "regulator",
  ],
  deep: [
    "coupling",
    "mass",
    "energy",
    "recall",
    "surveyor",
    "spool",
    "imprint",
    "fabricator",
    "bulk",
    "relay",
    "scheduler",
    "navigation",
    "regulator",
  ],
  plausible: [
    "mass",
    "navigation",
    "spool",
    "regulator",
    "surveyor",
    "imprint",
    "coupling",
    "energy",
    "recall",
    "fabricator",
    "relay",
    "bulk",
    "scheduler",
  ],
};
export function simulatePass2a(
  policy = "power",
  { limit = 5400, capture = false, compression = "complete" } = {},
) {
  const s = fresh();
  s.world = freshWorld();
  const milestones = [],
    snapshots = {};
  let lastCl = 0,
    lastRegime = 1,
    firstPotential = false,
    lastAction = -1,
    wait = 0;
  const snap = (id) => {
    if (capture && !snapshots[id]) snapshots[id] = encode(s);
  };
  for (let k = 0; k < limit * 10; k++) {
    const w = s.world,
      p = w.p2,
      t = k / 10;
    if (
      w.modules.includes("imprint") &&
      !w.apparatus.includes("feed") &&
      s.highest >= 3 &&
      s.energy.gte(90)
    )
      snap("imprint-ready");
    if (
      w.modules.includes("recall") &&
      w.region === 0 &&
      w.apparatus.includes("tap") &&
      s.dynamics.flux.gte(155)
    )
      snap("recall-ready");
    for (const n of APPARATUS)
      if (!w.modules.includes("imprint") || !w.knownApparatus.includes(n.id))
        purchaseApparatus(s, n.id);
    enterLocation(s, "dynamics");
    for (const n of FLOW_NODES)
      if (!(
        w.modules.includes("recall") &&
        w.knownRegions.includes(0) &&
        n.region === 0
      ))
        purchaseFlow(s, n.id);
    if (
      reconstructionReady(s) &&
      (compression === "early" ||
        (s.world.flow.includes("deep") &&
          (compression !== "charged" || s.dynamics.flux.gte(80))))
    ) {
      snap("reconstruction");
      reconstructWorld(s);
      milestones.push({ type: "reconstruction", time: t });
    }
    for (const id of policy === "plausible"
      ? ["known", "residual", "region"]
      : ["region", "residual", "known"])
      spendCoherence(s, id);
    if (!w.choices.includes("region") && w.reconstructions && w.coherence < 2) {
      returnCoherence(s, "known");
      spendCoherence(s, "region");
    }
    for (const id of orders[policy]) purchaseModule(s, id);
    if (w.modules.includes("spool")) w.automation.spool = true;
    const i = unlocked(s),
      auto =
        (w.automation.spool && w.manual.includes(i)) ||
        (w.modules.includes("relay") &&
          i <=
            Math.max(-1, ...w.manual) -
              (w.modules.includes("scheduler") ? 0 : 3));
    if (i > s.highest && !s.queue.some((q) => q.matter === i) && !auto)
      buy(s, i);
    if (w.planetary === "ACTIVE") snap("planetary-active");
    if (w.planetary === "READY") {
      snap("planetary-ready");
      breachPlanetary(s);
      milestones.push({ type: "planetary", time: t });
      snap("planetary-breached");
    }
    for (const id of ["field", "flow", "link"])
      if (constructSeed(s, id)) {
        milestones.push({ type: "component", id, time: t });
        snap(
          Object.values(w.seed).every(Boolean)
            ? "seed-complete"
            : "seed-partial",
        );
      }
    const r = regime(s);
    if (r > lastRegime) {
      milestones.push({
        type: "regime",
        regime: r,
        time: t,
        anchors: w.anchors,
      });
      lastRegime = r;
      snap("regime-" + r);
    }
    if (w.modules.includes("surveyor")) snap("array-echo");
    if (p.cl && !firstPotential && p.potential >= 100) {
      milestones.push({ type: "potential", time: t });
      firstPotential = true;
      snap("potential");
    }
    if (convergenceGain(s)) {
      snap(p.cl ? "second-ready" : "first-ready");
      const gain = converge(s, fresh, freshWorld);
      milestones.push({ type: "convergence", time: t, gain });
      if (s.world.p2.cl === 2) {
        snap("second-result");
        break;
      }
      snap("first-result");
      applyArray(s, LAYOUTS.competent);
      buyArrayTech(s, "capacity");
      snap("array-active");
      lastRegime = 1;
    } else if (w.boundary === "READY" && !p.cl && regime(s) < 4) {
      const target = !w.anchors
        ? 59
        : policy === "deep"
          ? 79
          : policy === "automation"
            ? Math.min(79, 65 + w.anchors * 3)
            : Math.min(79, 65 + w.anchors * 5);
      if (
        s.highest >= target &&
        !(
          ["deep", "automation"].includes(policy) &&
          regime(s) >= 3 &&
          s.highest < 109
        )
      ) {
        snap("anchor-" + w.anchors);
        const gain = anchorWorld(s, fresh);
        milestones.push({ type: "anchor", time: t, gain, highest: target });
      }
    } else if (
      w.boundary === "READY" &&
      !p.cl &&
      regime(s) === 4 &&
      ((!w.modules.includes("fabricator") && w.residue < 8) ||
        (!w.seed.field && w.residue < 30 && s.highest >= 95))
    ) {
      anchorWorld(s, fresh);
      milestones.push({ type: "anchor", time: t });
    }
    const count = s.world.telemetry.length;
    if (count !== lastAction) {
      wait = 0;
      lastAction = count;
    } else wait += 0.1;
    tick(s, 0.1);
    drainEvents(s);
  }
  return {
    policy,
    complete: s.world.p2.cl >= 2,
    time: s.totalTime,
    milestones,
    runs: s.world.runs,
    final: {
      highest: s.highest,
      stability: s.world.stability,
      regime: regime(s),
      residue: s.world.residue,
      modules: s.world.modules,
      seed: s.world.seed,
      p2: s.world.p2,
    },
    snapshots,
  };
}
if (process.argv[1]?.endsWith("simulate-pass2a.mjs")) {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync("test-results/pass2a", { recursive: true });
  const results = [];
  for (const policy of Object.keys(orders)) {
    const r = simulatePass2a(policy, { capture: policy === "power" });
    if (policy === "power")
      writeFileSync(
        "test-results/pass2a/fixtures.json",
        JSON.stringify(r.snapshots),
      );
    delete r.snapshots;
    results.push(r);
    console.log(JSON.stringify(r));
  }
  writeFileSync(
    "test-results/pass2a/routes.json",
    JSON.stringify(results, null, 2),
  );
  for (const [name, l] of Object.entries(LAYOUTS)) {
    const m = solveArray(l);
    console.log(
      name,
      JSON.stringify({
        peak: m.peak,
        flow: m.throughput,
        flux: m.flux,
        quality: m.quality,
        seconds: 100 / (m.quality ** 2 * 0.35),
      }),
    );
  }
}
