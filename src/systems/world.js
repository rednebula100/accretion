import {
  freshProgress,
  decodeProgress,
  regime,
  updateProgress,
  automaticMatter,
  finishRun,
} from "./spatial-progression.js";
import { solveArray } from "./array.js";
import { D, MATTER } from "../content.js";
import { APPARATUS, FLOW_NODES, COHERENCE, MODULES } from "../data/pass1.js";
export function freshWorld() {
  return {
    version: 1,
    ...freshProgress(),
    apparatus: [],
    flow: [],
    coherence: 0,
    choices: [],
    region: 0,
    reconstructions: 0,
    residue: 0,
    anchors: 0,
    modules: [],
    relay: { enabled: true, clock: 0 },
    manual: [],
    knownRegions: [],
    resolved: [],
    achievements: [],
    conversionCooldown: 0,
    locations: {
      matter: "ACTIVE",
      structure: "ACTIVE",
      dynamics: "HIDDEN",
      anchor: "HIDDEN",
      converter: "HIDDEN",
    },
    boundary: "HIDDEN",
    events: [],
    telemetry: [],
    camera: null,
  };
}
export function emit(s, type, data = {}) {
  s.world.events.push({ type, at: s.totalTime, ...data });
  if (s.world.events.length > 64) s.world.events.shift();
}
export function drainEvents(s) {
  return s.world ? s.world.events.splice(0) : [];
}
export function record(s, type, data = {}) {
  const a = s.world.runActions;
  if (a) {
    if (Object.hasOwn(a, type)) a[type]++;
    else if (
      [
        "relay",
        "imprint",
        "recall",
        "auto-convert",
        "spooled",
        "bulk",
      ].includes(type)
    )
      a.automation++;
    else if (
      [
        "module",
        "coherence",
        "coherence-return",
        "convert",
        "reconstruction",
        "planetary",
        "seed-component",
        "array-apply",
        "array-tech",
        "spool-rule",
        "converter-rule",
      ].includes(type)
    )
      a.decisions++;
  }
  s.world.telemetry.push({
    type,
    time: s.totalTime,
    run: s.world.anchors,
    ...data,
  });
  if (s.world.telemetry.length > 1500) s.world.telemetry.shift();
}
function achievement(s, id, label) {
  if (s.world.achievements.includes(id)) return;
  s.world.achievements.push(id);
  emit(s, "ACHIEVEMENT", { id, label });
}
export const owns = (s, id) => s.world.apparatus.includes(id);
export const flowOwns = (s, id) => s.world.flow.includes(id);
const prices = [D(24)];
export function worldPrice(s, i) {
  for (let j = prices.length; j <= i; j++)
    prices.push(prices[j - 1].mul(j < 20 ? 1.185 : j < 40 ? 1.195 : 1.205));
  return prices[i];
}
export function worldRate(s) {
  const w = s.world,
    i = Math.max(0, s.highest),
    eta = i < 19 ? 5 : i < 39 ? 8 : 14;
  let boost =
    (owns(s, "field") ? 1.35 : 1) *
    (flowOwns(s, "inflow") ? 1.15 : 1) *
    (flowOwns(s, "deep") ? 1.2 : 1) *
    (flowOwns(s, "counter") ? 1.3 : 1) *
    (flowOwns(s, "shear") ? 1.4 : 1);
  if (w.anchors) boost *= 1.8; // Persistent field formed by the first Anchor; displayed at its Core.
  if (w.modules.includes("mass")) boost *= 1.8;
  if (w.modules.includes("coupling")) boost *= 1.7;
  if (w.modules.includes("energy")) boost *= 1.6;
  if (w.p2.cl)
    boost *= 1 + solveArray(w.p2.layout, w.p2.tech).energy * w.p2.live;
  if (w.p2.tech.includes("afterimage") && w.manual.includes(i)) boost *= 2;
  return worldPrice(s, i + 1)
    .div(eta * 1.85)
    .mul(boost);
}
export function worldUnlocked(s) {
  return Math.max(
    0,
    Math.min(
      s.highest + 1,
      Math.max(
        s.world.compatibilityFrontier ?? -1,
        s.world.capabilities.includes("CAP_PLANETARY_BINDING")
          ? 109
          : s.world.anchors || s.world.p2.cl
            ? 79
            : 59,
      ),
    ),
  );
}
export function worldDuration(s, i) {
  if (
    s.world.modules.includes("bulk") &&
    i < 60 &&
    i < Math.max(...s.world.manual) - 20 &&
    s.world.manual.includes(i)
  )
    return 0.12;
  return Math.max(
    0.65,
    2.6 *
      (owns(s, "feed") ? 0.8 : 1) *
      (flowOwns(s, "reservoir") ? 0.85 : 1) *
      (s.world.anchors ? 0.7 : 1) *
      (s.world.choices.includes("known") && s.world.manual.includes(i)
        ? 0.55
        : 1),
  );
}
export function purchaseApparatus(s, id, { automatic = false } = {}) {
  if (automatic && !s.world.knownApparatus.includes(id)) return false;
  const n = APPARATUS.find((n) => n.id === id);
  if (!n || owns(s, id) || s.highest < n.at || s.energy.lt(n.cost))
    return false;
  s.energy = s.energy.sub(n.cost);
  s.world.apparatus.push(id);
  if (!automatic && !s.world.knownApparatus.includes(id))
    s.world.knownApparatus.push(id);
  record(s, automatic ? "imprint" : "structure", { id });
  emit(s, "NODE_PURCHASE", { id });
  return true;
}
export function purchaseFlow(s, id) {
  const w = s.world,
    n = FLOW_NODES.find((n) => n.id === id);
  if (
    !n ||
    w.locations.dynamics !== "ACTIVE" ||
    n.region !== w.region ||
    (n.region === 1 && !w.choices.includes("region")) ||
    flowOwns(s, id) ||
    !n.parents.every((p) => flowOwns(s, p)) ||
    s.dynamics.flux.lt(n.cost)
  )
    return false;
  s.dynamics.flux = s.dynamics.flux.sub(n.cost);
  w.flow.push(id);
  if (!w.knownFlow.includes(id)) w.knownFlow.push(id);
  record(s, "dynamics", { id });
  emit(s, "NODE_PURCHASE", { id });
  return true;
}
export const reconstructionReady = (s) =>
  s.world.region === 0 &&
  (flowOwns(s, "deep") ||
    ["density", "reservoir"].every((id) => flowOwns(s, id)));
export function reconstructionGain(s) {
  if (!reconstructionReady(s)) return 0;
  const network = Math.min(
    2,
    Math.floor(
      s.world.flow.filter((id) =>
        FLOW_NODES.some((n) => n.id === id && n.region === 0),
      ).length / 2,
    ),
  );
  // Charge bonuses are finite milestones, not an uncapped reward for waiting.
  const charge = s.dynamics.flux.gte(240) ? 2 : s.dynamics.flux.gte(80) ? 1 : 0;
  return 2 + network + charge;
}
export function reconstructWorld(s, { automatic = false } = {}) {
  const w = s.world;
  if (!reconstructionReady(s) || (automatic && !w.knownRegions.includes(0)))
    return false;
  const gain = reconstructionGain(s);
  w.flow = [];
  w.region = 1;
  w.reconstructions++;
  w.coherence += gain;
  w.knownRegions = [...new Set([...w.knownRegions, 0])];
  s.dynamics.flux = s.dynamics.flux.mul(0.25);
  record(s, automatic ? "recall" : "reconstruction", {
    flux: s.dynamics.flux.toString(),
  });
  emit(s, "RECONSTRUCTION", { gain });
  achievement(s, "reconstruction", "A coherent memory");
  return true;
}
export function spendCoherence(s, id) {
  const n = COHERENCE.find((n) => n.id === id),
    w = s.world;
  if (!n || w.choices.includes(id) || w.coherence < n.cost) return false;
  w.coherence -= n.cost;
  w.choices.push(id);
  record(s, "coherence", { id });
  emit(s, "NODE_PURCHASE", { id });
  return true;
}
export function bindingChannels(s) {
  return [
    owns(s, "binding") ? 1 : Math.min(1, s.highest / 48) * 0.7,
    s.world.reconstructions ? 1 : Math.min(1, s.world.flow.length / 4) * 0.7,
    Math.max(0, Math.min(1, (s.highest - 39) / 20)),
  ];
}
export function updateWorld(s, dt, buy, bulk) {
  const w = s.world;
  w.conversionCooldown = Math.max(0, w.conversionCooldown - dt);
  if (w.conversionCooldown < 1e-8) w.conversionCooldown = 0;
  if (owns(s, "tap"))
    s.dynamics.flux = s.dynamics.flux.add(
      dt *
        (flowOwns(s, "density") ? 1.3 : 1) *
        (flowOwns(s, "phase") ? 1.5 : 1) *
        (w.choices.includes("residual") ? 2 : 1) *
        (w.modules.includes("coupling") ? 1.5 : 1),
    );
  const stage = owns(s, "grid")
    ? "DETECTED"
    : s.highest >= 15
      ? "ECHO"
      : "HIDDEN";
  if (
    ["HIDDEN", "ECHO"].includes(w.locations.dynamics) &&
    stage !== w.locations.dynamics
  ) {
    w.locations.dynamics = stage;
    emit(s, "LOCATION_DETECTED", { location: "dynamics", stage });
    record(s, "dynamics-" + stage);
  }
  if (owns(s, "tap") && w.locations.converter === "HIDDEN") {
    w.locations.converter = "DETECTED";
    emit(s, "LOCATION_DETECTED", { location: "converter" });
  }
  const ch = bindingChannels(s),
    b = ch.every((n) => n >= 1)
      ? "READY"
      : s.highest >= 48
        ? "ACTIVE"
        : s.highest >= 44
          ? "DETECTED"
          : s.highest >= 39
            ? "ECHO"
            : "HIDDEN";
  if (b !== w.boundary) {
    w.boundary = b;
    if (b === "READY") {
      emit(s, "BOUNDARY_READY");
      record(s, "binding-ready");
    }
  }
  updateProgress(s, dt, buy);
  if (w.modules.includes("relay") && w.relay.enabled) {
    w.relay.clock += dt;
    if (w.relay.clock >= 0.5 - 1e-9) {
      w.relay.clock = 0;
      if (w.modules.includes("bulk") && bulk?.(s)) return;
      const i = worldUnlocked(s);
      if (
        automaticMatter(s, i) &&
        s.energy.sub(w.automation.reserve).gte(worldPrice(s, i)) &&
        !s.queue.some((q) => q.matter === i)
      )
        buy(s, i, 1, { automatic: true });
    }
  }
}
export function enterLocation(s, id) {
  const w = s.world;
  if (
    !w ||
    !Object.hasOwn(w.locations, id) ||
    ["HIDDEN", "ECHO"].includes(w.locations[id])
  )
    return false;
  if (w.locations[id] === "DETECTED") {
    w.locations[id] = "ACTIVE";
    emit(s, "LOCATION_UNLOCKED", { location: id });
    record(s, "visit", { id });
  }
  return true;
}
export function anchorGain(s) {
  return s.world.boundary === "READY"
    ? Math.floor(
        8 *
          Math.pow(1.045, Math.max(0, s.highest - 59)) *
          (1 +
            Math.min(0.3, Math.max(0, s.mass.add(1).log10().toNumber()) / 100)),
      )
    : 0;
}
export function anchorWorld(s, fresh, { automatic = false } = {}) {
  const gain = anchorGain(s),
    w = s.world;
  if (!gain || (automatic && !w.resolved.includes("binding"))) return false;
  finishRun(s, "anchor", gain);
  const n = fresh(),
    next = freshWorld();
  for (const key of [
    "manual",
    "knownRegions",
    "resolved",
    "achievements",
    "modules",
    "telemetry",
    "knownApparatus",
    "knownFlow",
    "stabilitySeen",
    "runs",
  ])
    next[key] = [...w[key]];
  next.runFrontierStart = Math.max(-1, ...w.manual);
  next.stability = w.stability;
  next.runStability = w.stability;
  next.runStart = s.totalTime;
  next.p2 = structuredClone(w.p2);
  next.p2.live = 0;
  next.seed = { ...w.seed };
  next.automation = structuredClone(w.automation);
  next.residue = w.residue + gain;
  next.anchors = w.anchors + 1;
  next.locations = {
    ...w.locations,
    dynamics: w.locations.dynamics === "HIDDEN" ? "HIDDEN" : "DETECTED",
    converter: "HIDDEN",
    anchor: "DETECTED",
  };
  next.resolved = [...new Set([...next.resolved, "binding"])];
  next.compatibilityFrontier = w.compatibilityFrontier;
  next.relay.enabled = w.relay.enabled;
  if (w.anchors) next.locations.anchor = w.locations.anchor;
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
  n.world = next;
  Object.assign(s, n);
  record(s, "anchor", { gain });
  emit(s, "BOUNDARY_BREACHED", { id: "binding" });
  emit(s, "ANCHOR", { gain });
  achievement(
    s,
    next.anchors === 1 ? "anchor" : "second-run",
    next.anchors === 1 ? "Something remained" : "A faster beginning",
  );
  if (next.anchors === 1) emit(s, "LOCATION_DETECTED", { location: "anchor" });
  return gain;
}
export function purchaseModule(s, id) {
  const n = MODULES.find((n) => n.id === id),
    w = s.world;
  if (
    !n ||
    (!w.anchors && !w.p2.cl) ||
    regime(s) < n.regime ||
    w.modules.includes(id) ||
    w.residue < n.cost
  )
    return false;
  w.residue -= n.cost;
  w.modules.push(id);
  record(s, "module", { id });
  emit(s, "NODE_PURCHASE", { id });
  return true;
}
export function convertFlux(s, { automatic = false } = {}) {
  if (
    !owns(s, "tap") ||
    s.dynamics.flux.lt(20) ||
    s.world.conversionCooldown > 0
  )
    return false;
  s.world.conversionCooldown = 15;
  s.dynamics.flux = s.dynamics.flux.sub(20);
  s.energy = s.energy.add(worldRate(s).mul(10));
  record(s, automatic ? "auto-convert" : "convert");
  emit(s, "NODE_PURCHASE", { id: "converter" });
  return true;
}
export function decodeWorld(raw) {
  if (!raw) return null;
  const w = freshWorld();
  if (raw.version !== 1) throw Error("Unsupported spatial save.");
  for (const key of [
    "coherence",
    "region",
    "reconstructions",
    "residue",
    "anchors",
  ]) {
    if (!Number.isSafeInteger(raw[key]) || raw[key] < 0 || raw[key] > 1e9)
      throw Error("Invalid spatial balance.");
    w[key] = raw[key];
  }
  if (w.region > 1) throw Error("Invalid spatial region.");
  const lists = {
    apparatus: APPARATUS.map((n) => n.id),
    flow: FLOW_NODES.map((n) => n.id),
    choices: COHERENCE.map((n) => n.id),
    modules: MODULES.map((n) => n.id),
    manual: Array.from({ length: 200 }, (_, i) => i),
    knownRegions: [0, 1],
    resolved: ["binding", "planetary"],
    achievements: ["reconstruction", "anchor", "second-run"],
  };
  for (const [key, allowed] of Object.entries(lists)) {
    if (!Array.isArray(raw[key]) || raw[key].some((x) => !allowed.includes(x)))
      throw Error("Invalid spatial ownership.");
    w[key] = [...new Set(raw[key])];
  }
  for (const key of Object.keys(w.locations)) {
    const v = raw.locations?.[key];
    if (!["HIDDEN", "ECHO", "DETECTED", "ACTIVE", "MASTERED"].includes(v))
      throw Error("Invalid location.");
    w.locations[key] = v;
  }
  w.relay.enabled = raw.relay?.enabled !== false;
  w.relay.clock = Math.max(0, Math.min(0.5, Number(raw.relay?.clock) || 0));
  w.conversionCooldown = Math.max(
    0,
    Math.min(15, Number(raw.conversionCooldown) || 0),
  );
  if (
    ["HIDDEN", "ECHO", "DETECTED", "ACTIVE", "READY", "COMPLETE"].includes(
      raw.boundary,
    )
  )
    w.boundary = raw.boundary;
  w.compatibilityFrontier = Number.isInteger(raw.compatibilityFrontier)
    ? Math.max(-1, Math.min(199, raw.compatibilityFrontier))
    : -1;
  w.telemetry = Array.isArray(raw.telemetry) ? raw.telemetry.slice(-1500) : [];
  Object.assign(w, decodeProgress(raw));
  return w;
}
