import { D } from "../content.js";
import { APPARATUS, FLOW_NODES } from "../data/pass1.js";
import {
  emit,
  record,
  purchaseApparatus,
  purchaseFlow,
  reconstructWorld,
  convertFlux,
  worldRate,
  worldPrice,
} from "./world.js";
import { solveArray, validLayout, ARRAY_TECH } from "./array.js";
export const REGIMES = [0, 24, 58, 105];
export const regime = (s) =>
  1 + REGIMES.slice(1).filter((x) => s.world.stability >= x).length;
export function freshProgress() {
  return {
    runFrontierStart: -1,
    stability: 0,
    stabilitySeen: [],
    knownApparatus: [],
    knownFlow: [],
    runAbsorbed: [],
    capabilities: [],
    planetary: "HIDDEN",
    seed: { field: 0, flow: 0, link: 0 },
    automation: {
      reserve: 0,
      spool: false,
      regulator: {
        enabled: false,
        reserve: 0,
        overflow: 120,
        ratio: 10,
        cap: 300,
      },
      clock: 0,
    },
    p2: {
      cl: 0,
      alignment: 0,
      tech: [],
      blueprint: Array(9).fill(null),
      layout: Array(9).fill(null),
      revision: 0,
      seedBuilt: false,
      potential: 0,
      live: 0,
    },
    runStart: 0,
    runStability: 0,
    runActions: {
      matter: 0,
      structure: 0,
      dynamics: 0,
      travel: 0,
      travelTime: 0,
      automation: 0,
      decisions: 0,
    },
    runs: [],
  };
}
export function addStability(s, n) {
  const before = regime(s);
  s.world.stability += n;
  const after = regime(s);
  if (after > before) {
    emit(s, "REGIME", { regime: after });
    record(s, "regime", { regime: after });
  }
}
export function absorbProgress(s, id) {
  const w = s.world;
  if (w.runAbsorbed.includes(id)) return;
  w.runAbsorbed.push(id);
  if (!w.anchors && !w.p2.cl) return;
  // Frontier extends once per P1 lifecycle. Known first absorption pays once/run;
  // zero-value repeated purchases cannot farm this ledger.
  if (!w.stabilitySeen.includes(id) && id >= 60) {
    w.stabilitySeen.push(id);
    addStability(s, 1.6);
  } else addStability(s, id >= 40 ? 0.35 : 0.1);
}
export function automaticMatter(s, i) {
  const w = s.world;
  return (
    w.modules.includes("relay") &&
    w.manual.includes(i) &&
    i <= Math.max(-1, ...w.manual) - (w.modules.includes("scheduler") ? 0 : 3)
  );
}
export function planetaryChannels(s) {
  const w = s.world;
  return [
    Math.min(1, w.stability / 58),
    w.apparatus.includes("planetary")
      ? 1
      : Math.max(0, (s.highest - 59) / 20) * 0.7,
    w.flow.includes("shear") ? 1 : Math.min(1, w.flow.length / 3) * 0.6,
  ];
}
export function breachPlanetary(s, { automatic = false } = {}) {
  const w = s.world;
  if (
    w.planetary !== "READY" ||
    (automatic && !w.resolved.includes("planetary"))
  )
    return false;
  w.capabilities.push("CAP_PLANETARY_BINDING");
  w.planetary = "COMPLETE";
  if (!w.resolved.includes("planetary")) {
    w.resolved.push("planetary");
    addStability(s, 8);
  }
  emit(s, "PLANETARY_BREACH");
  record(s, "planetary");
  return true;
}
export const seedChannels = (s) => {
  const w = s.world;
  return {
    field: Math.min(1, w.residue / 30),
    flow: Math.min(1, s.dynamics.flux.toNumber() / 420),
    link: w.apparatus.includes("link")
      ? Math.min(1, Math.max(0, (s.highest - 79) / 16))
      : 0,
  };
};
export function constructSeed(s, id) {
  const w = s.world;
  if (
    w.p2.seedBuilt ||
    !w.modules.includes("fabricator") ||
    !w.capabilities.includes("CAP_PLANETARY_BINDING") ||
    !Object.hasOwn(w.seed, id) ||
    w.seed[id] ||
    seedChannels(s)[id] < 1
  )
    return false;
  if (id === "field") w.residue -= 30;
  if (id === "flow") s.dynamics.flux = s.dynamics.flux.sub(420);
  w.seed[id] = 1;
  addStability(s, 4);
  record(s, "seed-component", { id });
  emit(s, "SEED_COMPONENT", { id });
  if (Object.values(w.seed).every(Boolean)) {
    w.p2.seedBuilt = true;
    record(s, "seed-complete");
    emit(s, "SEED_COMPLETE");
  }
  return true;
}
export function convergenceGain(s) {
  const p = s.world.p2;
  return (p.cl ? p.potential >= 100 : p.seedBuilt)
    ? Math.floor(
        8 *
          Math.pow((p.cl ? p.potential : 100) / 100, 0.55) *
          (1 + 0.006 * Math.max(0, s.highest - 99)),
      )
    : 0;
}
export function finishRun(s, kind, gain) {
  const w = s.world;
  w.runs.push({
    kind,
    at: s.totalTime,
    duration: s.totalTime - w.runStart,
    frontier: s.highest,
    extension: Math.max(0, s.highest - w.runFrontierStart),
    stability: w.stability - w.runStability,
    gain,
    ...w.runActions,
    decisions: w.runActions.decisions + 1,
    meaningful:
      w.runActions.matter +
      w.runActions.structure +
      w.runActions.dynamics +
      w.runActions.travel +
      w.runActions.decisions +
      1,
  });
  if (w.runs.length > 100) w.runs.shift();
}
export function converge(s, fresh, freshWorld) {
  const gain = convergenceGain(s),
    w = s.world;
  if (!gain) return false;
  finishRun(s, "convergence", gain);
  const n = fresh(),
    next = freshWorld();
  for (const key of [
    "information",
    "origins",
    "runs",
    "best",
    "everSeen",
    "research",
    "phenomena",
    "absorbed",
    "totalTime",
    "settings",
    "progress",
    "trials",
  ])
    n[key] = s[key];
  n.trials = { ...n.trials, active: null };
  for (const key of [
    "manual",
    "knownRegions",
    "knownApparatus",
    "knownFlow",
    "resolved",
    "achievements",
    "telemetry",
    "runs",
  ])
    next[key] = structuredClone(w[key]);
  next.p2 = {
    ...structuredClone(w.p2),
    cl: w.p2.cl + 1,
    alignment: w.p2.alignment + gain,
    potential: 0,
    live: 0,
    seedBuilt: true,
  };
  next.runStart = s.totalTime;
  next.runFrontierStart = Math.max(-1, ...w.manual);
  if (next.p2.tech.includes("afterimage")) next.residue = 12;
  // Place remains known; lower layer ownership itself resets.
  next.locations.anchor = "DETECTED";
  next.locations.dynamics = "DETECTED";
  n.world = next;
  Object.assign(s, n);
  record(s, "convergence", { gain, cl: next.p2.cl });
  emit(s, "CONVERGENCE", { gain, cl: next.p2.cl });
  return gain;
}
export function returnCoherence(s, id) {
  const w = s.world;
  if (id === "region" || !w.choices.includes(id)) return false;
  w.choices = w.choices.filter((x) => x !== id);
  w.coherence += 2;
  record(s, "coherence-return", { id });
  return true;
}
export function updateProgress(s, dt, buy) {
  const w = s.world,
    p = w.p2;
  if (w.anchors || p.cl) {
    const b = w.capabilities.includes("CAP_PLANETARY_BINDING")
      ? w.planetary === "COMPLETE"
        ? "KNOWN"
        : w.planetary
      : s.highest >= 79 && planetaryChannels(s).every((n) => n >= 1)
        ? "READY"
        : s.highest >= 74
          ? "ACTIVE"
          : s.highest >= 69
            ? "DETECTED"
            : s.highest >= 64
              ? "ECHO"
              : "HIDDEN";
    if (b !== w.planetary) {
      w.planetary = b;
      emit(s, "PLANETARY_STATE", { stage: b });
    }
    if (b === "READY" && w.resolved.includes("planetary"))
      breachPlanetary(s, { automatic: true });
  }
  const a = w.automation;
  a.clock += dt;
  if (a.clock >= 0.5 - 1e-9) {
    a.clock = 0;
    if (w.modules.includes("imprint"))
      for (const id of w.knownApparatus) {
        if (purchaseApparatus(s, id, { automatic: true })) {
          emit(s, "IMPRINT", { id });
          break;
        }
      }
    if (
      w.modules.includes("recall") &&
      w.knownRegions.includes(0) &&
      w.region === 0 &&
      w.apparatus.includes("tap")
    ) {
      w.locations.dynamics = "ACTIVE";
      // Pay the same known schematic's Flux; collapse into root, no new branches.
      if (s.dynamics.flux.gte(155)) {
        s.dynamics.flux = s.dynamics.flux.sub(155);
        w.flow = ["inflow", "density", "reservoir", "deep"];
        reconstructWorld(s, { automatic: true });
        emit(s, "RECALL");
      }
    }
    const r = a.regulator;
    if (
      w.modules.includes("regulator") &&
      r.enabled &&
      s.dynamics.flux.gte(r.overflow + 20) &&
      s.energy.lt(r.cap) &&
      s.energy.lt(s.dynamics.flux.mul(r.ratio).max(r.reserve))
    ) {
      convertFlux(s, { automatic: true });
    }
    // Explicit spool instruction only schedules conquered identities, never new IDs.
    if (a.spool && w.modules.includes("spool")) {
      const i = s.highest + 1;
      if (
        w.manual.includes(i) &&
        s.queue.length < 3 &&
        !s.queue.some((q) => q.matter === i) &&
        s.energy.sub(a.reserve).gte(worldPrice(s, i))
      )
        buy(s, i, 1, { spooled: true });
    }
  }
  if (p.cl) {
    const powered = s.highest >= 0 && s.energy.gt(0);
    p.live = Math.max(0, Math.min(1, p.live + (powered ? dt / 12 : -dt / 3)));
    const solved = solveArray(p.layout, p.tech),
      frontier = 0.8 + 0.2 * Math.min(1, Math.max(0, s.highest) / 79);
    const output = p.live * solved.quality ** 2;
    p.potential +=
      dt *
      output *
      frontier *
      (p.tech.includes("compression") ? 1.25 : 1) *
      0.35;
    s.dynamics.flux = s.dynamics.flux.add(dt * solved.flux * p.live * 2);
  }
}
export function decodeProgress(raw) {
  const out = freshProgress();
  if (raw.stability === undefined) {
    out.knownApparatus = APPARATUS.filter((n) =>
      raw.apparatus?.includes(n.id),
    ).map((n) => n.id);
    out.knownFlow = FLOW_NODES.filter((n) => raw.flow?.includes(n.id)).map(
      (n) => n.id,
    );
    return out;
  } // Pass1 -> Pass2A: no free advancement.
  const number = (v, max = 1e12) => {
    if (!Number.isFinite(v) || v < 0 || v > max)
      throw Error("Invalid progression balance");
    return v;
  };
  out.stability = number(raw.stability);
  const list = (v, allowed) => {
    if (!Array.isArray(v) || v.some((x) => !allowed.includes(x)))
      throw Error("Invalid progression ownership");
    return [...new Set(v)];
  };
  for (const key of ["stabilitySeen", "runAbsorbed"])
    out[key] = list(
      raw[key],
      Array.from({ length: 200 }, (_, i) => i),
    );
  out.knownApparatus = list(
    raw.knownApparatus,
    APPARATUS.map((n) => n.id),
  );
  out.knownFlow = list(
    raw.knownFlow,
    FLOW_NODES.map((n) => n.id),
  );
  out.capabilities = list(raw.capabilities, ["CAP_PLANETARY_BINDING"]);
  if (
    ![
      "HIDDEN",
      "ECHO",
      "DETECTED",
      "ACTIVE",
      "READY",
      "COMPLETE",
      "KNOWN",
    ].includes(raw.planetary)
  )
    throw Error("Invalid boundary");
  out.planetary = raw.planetary;
  for (const k of Object.keys(out.seed)) {
    if (![0, 1].includes(raw.seed?.[k])) throw Error("Invalid Seed");
    out.seed[k] = raw.seed[k];
  }
  const p = raw.p2;
  if (!p) throw Error("Missing Array record");
  for (const k of ["cl", "alignment", "revision"]) {
    out.p2[k] = number(p[k], 1e9);
    if (!Number.isInteger(p[k])) throw Error("Invalid Array integer");
  }
  out.p2.tech = list(
    p.tech,
    ARRAY_TECH.map((n) => n.id),
  );
  for (const k of ["blueprint", "layout"]) {
    if (!validLayout(p[k], out.p2.tech)) throw Error("Invalid Array layout");
    out.p2[k] = [...p[k]];
  }
  if (typeof p.seedBuilt !== "boolean" || (p.cl && !p.seedBuilt))
    throw Error("Invalid Array continuity");
  out.p2.seedBuilt = p.seedBuilt;
  out.p2.potential = number(p.potential);
  out.p2.live = number(p.live, 1);
  const a = raw.automation;
  if (
    !a ||
    typeof a.spool !== "boolean" ||
    typeof a.regulator?.enabled !== "boolean"
  )
    throw Error("Invalid automation");
  out.automation.reserve = number(a.reserve);
  out.automation.spool = a.spool;
  out.automation.clock = number(a.clock, 0.5);
  for (const k of ["reserve", "overflow", "ratio", "cap"])
    out.automation.regulator[k] = number(a.regulator[k]);
  out.automation.regulator.enabled = a.regulator.enabled;
  out.runFrontierStart = Number.isInteger(raw.runFrontierStart)
    ? Math.max(-1, Math.min(199, raw.runFrontierStart))
    : -1;
  out.runStart = number(raw.runStart);
  out.runStability = number(raw.runStability);
  for (const k of Object.keys(out.runActions))
    out.runActions[k] = number(raw.runActions?.[k]);
  out.runs = Array.isArray(raw.runs) ? raw.runs.slice(-100) : [];
  return out;
}
