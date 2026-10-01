import {
  absorbProgress,
  automaticMatter,
} from "./systems/spatial-progression.js";
import {
  D,
  MATTER,
  STRUCTURE,
  LEGACY_STRUCTURE,
  RESEARCH,
  EXPERIMENTS,
} from "./content.js";
import {
  freshDynamics,
  ownsDynamics,
  processingCapability,
  dynamicsEffects,
  advanceDynamics,
  dynamicsAbsorb,
  rebuildDynamics,
  buyDynamics as develop,
  reconstruct as reconstructTree,
  radiativeWorkQuote,
  releaseRadiativeWork,
} from "./systems/dynamics.js";
import { quotePurchase } from "./systems/purchases.js";
import { advanceFixed, simulationState } from "./systems/simulation.js";
import {
  freshTrials,
  startTrial,
  trialManual,
  trialAllows,
  effectiveSpin,
  trialAbsorb,
} from "./systems/trials.js";
import { paidCount } from "./systems/paid.js";
import {
  worldPrice,
  worldRate,
  worldUnlocked,
  worldDuration,
  updateWorld,
  record,
} from "./systems/world.js";
export const VERSION = 3;
export function fresh() {
  return {
    version: VERSION,
    simulation: simulationState(),
    progress: { hasEvaporated: false, hasRenewed: false },
    legacy: null,
    dynamics: freshDynamics(),
    trials: freshTrials(),
    mass: D("1e-13"),
    energy: D(36),
    information: D(0),
    origins: 0,
    runs: 0,
    best: 0,
    highest: -1,
    seen: [],
    everSeen: [],
    nodes: [],
    research: [],
    phenomena: ["horizon"],
    queue: [],
    nextId: 1,
    elapsed: 0,
    totalTime: 0,
    absorbed: 0,
    runAbsorbed: 0,
    spin: 0.35,
    auto: true,
    reserve: 0.2,
    autoCategory: -1,
    clock: 0,
    captureClock: 0,
    activity: 0,
    experiment: null,
    experiments: [],
    condition: "balanced",
    settings: { audio: 0.35, quality: "AUTO", reducedMotion: false },
    savedAt: Date.now(),
  };
}
const nodeById = new Map(
    [...STRUCTURE, ...LEGACY_STRUCTURE].map((n) => [n.id, n]),
  ),
  effectCache = new WeakMap();
function effects(s) {
  let c = effectCache.get(s);
  if (!c || c.array !== s.nodes || c.length !== s.nodes.length) {
    const counts = {};
    for (const id of s.nodes) {
      const e = nodeById.get(id)?.effect;
      counts[e] = (counts[e] || 0) + 1;
    }
    c = { array: s.nodes, length: s.nodes.length, counts };
    effectCache.set(s, c);
  }
  return c.counts;
}
export const has = (s, e) => (effects(s)[e] || 0) > 0;
export const learned = (s, id) => s.research.includes(id);
export const level = (s, e) => effects(s)[e] || 0;
export function limit(s) {
  return s.origins > 0 ? 199 : learned(s, "cosmic") ? 194 : 189;
}
const unlockCache = new WeakMap();
export function unlocked(s) {
  if (s.world) return worldUnlocked(s);
  const physical = s.legacy?.compatibilityRun
    ? limit(s)
    : has(s, "planetary") && processingCapability(s, "b-roche")
      ? has(s, "stellar") && processingCapability(s, "c-stellar")
        ? limit(s)
        : 139
      : 79;
  const cap = Math.min(limit(s), s.highest + 4, physical),
    cached = unlockCache.get(s);
  if (cached && cached.mass === s.mass && cached.cap === cap) return cached.max;
  let max = 0,
    upper = cap;
  while (max < upper) {
    const middle = Math.ceil((max + upper) / 2);
    if (s.mass.gte(MATTER[middle].unlock)) max = middle;
    else upper = middle - 1;
  }
  unlockCache.set(s, { mass: s.mass, cap, max });
  return max;
}
export const era = (s) => Math.floor(unlocked(s) / 10);
export function price(s, i) {
  if (s.world) return worldPrice(s, i);
  return MATTER[i].cost
    .mul(Math.pow(0.96, level(s, "discount")))
    .mul(has(s, "survey-" + MATTER[i].category) && s.seen.includes(i) ? 0.7 : 1)
    .mul(learned(s, "mastery") && s.everSeen.includes(i) ? 0.4 : 1)
    .mul(s.condition === "sparse" ? 0.8 : 1)
    .mul(
      ownsDynamics(s, "c-harmonics") && !s.dynamics.paid.includes(i) ? 0.65 : 1,
    );
}
const reservoirCache = new WeakMap();
export function reservoirs(s) {
  const cached = reservoirCache.get(s);
  if (
    cached &&
    cached.seen === s.seen &&
    cached.seenCount === s.seen.length &&
    cached.nodes === s.nodes &&
    cached.nodeCount === s.nodes.length
  )
    return cached.value;
  const counts = Array(20).fill(0);
  for (const i of s.seen) counts[MATTER[i].category]++;
  const value = counts.flatMap((n, e) =>
    n >= 6 && has(s, "synthesis-" + e) ? [e] : [],
  );
  reservoirCache.set(s, {
    seen: s.seen,
    seenCount: s.seen.length,
    nodes: s.nodes,
    nodeCount: s.nodes.length,
    value,
  });
  return value;
}
export function baseRate(s) {
  if (s.world) return worldRate(s);
  const i = Math.max(0, s.highest),
    base = MATTER[i].cost.div(
      3.2 + i * 0.07 + Math.pow(Math.max(0, i - 65), 2) * 0.09,
    );
  let boost =
    Math.pow(1.12, level(s, "energy")) *
    (has(s, "disk") ? 1.6 : 1) *
    (has(s, "spin") ? 1 + effectiveSpin(s) * 1.6 : 1) *
    (has(s, "stellar") && s.highest >= 140 ? 2 : 1) *
    (has(s, "jets") ? 1 + effectiveSpin(s) : 1);
  boost *=
    (1 + s.runs * 0.3 + s.origins * 2) * (1 + reservoirs(s).length * 0.18);
  if (learned(s, "compression") && i < s.best) boost *= 8;
  if (learned(s, "echo")) boost *= 1 + s.runs * 0.4;
  if (learned(s, "start") && i < 40) boost *= 3;
  if (has(s, "diversity")) boost *= 1 + Math.min(0.8, s.seen.length * 0.006);
  if (has(s, "flow")) boost *= 1 + Math.min(1, s.queue.length * 0.025);
  if (s.experiments.includes("spectra")) boost *= 2;
  if (s.condition === "dense") boost *= 1.8;
  return base.mul(boost);
}
export function dynamicsContext(s) {
  const frontier = unlocked(s);
  return {
    apparatus: has(s, "dynamics"),
    planetary: has(s, "planetary"),
    magnetic: has(s, "jets"),
    groups: [
      "capture",
      "disk",
      "queue",
      "thermal",
      "planetary",
      "stellar",
    ].filter((e) => has(s, e)).length,
    frontier,
    spin: effectiveSpin(s),
    frontierCost: MATTER[frontier].cost,
    paidQueue: paidCount(s.queue),
  };
}
export const beginTrial = (s, id) =>
  startTrial(s, id, { frontier: unlocked(s), spin: has(s, "spin") });
export const fluxEffects = (s) => dynamicsEffects(s, dynamicsContext(s));
export const rate = (s) =>
  s.world ? worldRate(s) : baseRate(s).mul(fluxEffects(s).energy);
export const developDynamics = (s, id, count = 1) =>
  develop(s, id, dynamicsContext(s), count);
export const reconstructDynamics = (s, serial) => reconstructTree(s, serial);
export const workQuote = (s) => radiativeWorkQuote(s, dynamicsContext(s));
export const releaseWork = (s, index) =>
  releaseRadiativeWork(s, dynamicsContext(s), index);
export function capacity(s) {
  return has(s, "queue") &&
    (s.legacy?.compatibilityRun || processingCapability(s, "b-queue"))
    ? 200
    : 100;
}
export function duration(s, i) {
  if (s.world) return worldDuration(s, i);
  let t =
    MATTER[i].duration *
    Math.pow(0.95, level(s, "speed")) *
    (has(s, "decay") ? 0.8 : 1) *
    (has(s, "spin") ? 0.75 + effectiveSpin(s) * 0.9 : 1);
  if (
    has(s, "stripping") &&
    ["gas", "star", "giant"].includes(MATTER[i].render)
  )
    t *= 0.75;
  if (s.experiments.includes("flow")) t *= 0.8;
  if (learned(s, "mastery") && s.everSeen.includes(i)) t *= 0.6;
  t *=
    (ownsDynamics(s, "a-shear") ? 0.82 : 1) *
    Math.pow(0.96, s.dynamics?.levels["d-packing"] || 0);
  if (ownsDynamics(s, "b-gas") && ["gas", "comet"].includes(MATTER[i].render))
    t *= 0.75;
  if (
    ownsDynamics(s, "c-stripping") &&
    ["gas", "star", "giant"].includes(MATTER[i].render)
  )
    t *= 0.6;
  return Math.max(1.4, t);
}
export function quote(s, i, count = 1) {
  const valid = Number.isInteger(i) && i >= 0 && i < MATTER.length;
  return quotePurchase({
    energy: s.energy,
    unitCost: valid ? price(s, i) : D(1),
    capacity: capacity(s),
    queued: s.queue.length,
    count:
      s.trials?.active?.id === "braid"
        ? count === "MAX"
          ? 1
          : Math.min(1, Number(count))
        : count,
    available: valid && i <= unlocked(s) && trialAllows(s, i),
  });
}
export function buy(
  s,
  i,
  count = 1,
  { automatic = false, spooled = false } = {},
) {
  if (s.world && automatic && !automaticMatter(s, i)) return 0;
  if (
    s.world &&
    spooled &&
    (!s.world.modules.includes("spool") || !s.world.manual.includes(i))
  )
    return 0;
  const purchase = quote(s, i, count),
    cost = purchase.unitCost,
    n = purchase.quantity;
  if (!n) return 0;
  if (s.world)
    record(s, automatic ? "relay" : spooled ? "spooled" : "matter", {
      id: i,
      quantity: n,
    });
  if (s.trials?.active?.id === "braid")
    s.trials.active.lastCategory = MATTER[i].category;
  s.energy = s.energy.sub(cost.mul(n)).max(0);
  for (let j = 0; j < n; j++) {
    let id = s.nextId++;
    s.queue.push({
      id,
      matter: i,
      age:
        j === 0
          ? 0
          : -(
              j *
              (has(s, "reservoir") || ownsDynamics(s, "b-sorting")
                ? 0.025
                : 0.065)
            ),
      duration: duration(s, i),
      seed: ((id * 16807) % 2147483647) / 2147483647,
      cost: cost.toString(),
      ...(automatic ? { automatic: true } : {}),
    });
  }
  return n;
}
// One paid operation for a contiguous, deeply mastered low-band group.
export function buyMasteredGroup(s) {
  const w = s.world;
  if (!w?.modules.includes("bulk") || !w.relay.enabled || s.queue.length)
    return 0;
  const start = s.highest + 1,
    end = Math.min(start + 5, 60, Math.max(-1, ...w.manual) - 20),
    items = [];
  let total = D(0);
  for (let i = start; i < end; i++) {
    if (!w.manual.includes(i)) break;
    const cost = worldPrice(s, i);
    if (s.energy.sub(w.automation.reserve).lt(total.add(cost))) break;
    total = total.add(cost);
    items.push({ matter: i, cost: cost.toString() });
  }
  if (items.length < 2) return 0;
  s.energy = s.energy.sub(total);
  for (const item of items) {
    const id = s.nextId++;
    s.queue.push({
      id,
      ...item,
      age: 0,
      duration: 0.15,
      seed: ((id * 16807) % 2147483647) / 2147483647,
      automatic: true,
    });
  }
  record(s, "bulk", { quantity: items.length });
  return items.length;
}
export const structureList = (s) =>
  s.legacy?.compatibilityRun ? LEGACY_STRUCTURE : STRUCTURE;
export function canBuildNode(s, id) {
  const n = structureList(s).find((n) => n.id === id);
  if (!n || s.nodes.includes(id)) return false;
  if (s.legacy?.compatibilityRun)
    return visibleNodes(s).some((n) => n.id === id);
  return (
    unlocked(s) >= n.frontier &&
    n.prereqs.every((p) => s.nodes.includes(p)) &&
    (!n.gate || processingCapability(s, n.gate))
  );
}
export function visibleNodes(s) {
  if (!s.legacy?.compatibilityRun) {
    const frontier = unlocked(s);
    return STRUCTURE.filter(
      (n) =>
        s.nodes.includes(n.id) ||
        (n.frontier <= frontier + 10 &&
          (!n.prereqs.length || n.prereqs.some((p) => s.nodes.includes(p)))),
    );
  }
  const current = era(s),
    owned = new Set(s.nodes),
    cosmic = learned(s, "cosmic");
  return LEGACY_STRUCTURE.filter(
    (n) =>
      n.era <= current &&
      (!n.parent || owned.has(n.parent)) &&
      (n.era < 19 || cosmic),
  );
}
export function buyNode(s, id) {
  const n = visibleNodes(s).find((n) => n.id === id);
  if (!n || !canBuildNode(s, id) || s.energy.lt(n.cost)) return false;
  s.energy = s.energy.sub(n.cost);
  s.nodes.push(id);
  if (
    [
      "capture",
      "disk",
      "tides",
      "spin",
      "stellar",
      "jets",
      "merger",
      "boundary",
    ].includes(n.effect)
  )
    discover(s, n.effect);
  if (n.effect === "disk") discover(s, "lensing");
  return true;
}
export function discover(s, key) {
  if (!s.phenomena.includes(key)) s.phenomena.push(key);
}
export function buyResearch(s, id) {
  const r = RESEARCH.find((r) => r.id === id);
  if (!r || learned(s, id) || s.information.lt(r.cost)) return false;
  s.information = s.information.sub(r.cost);
  s.research.push(id);
  return true;
}
export function startExperiment(s, id) {
  const ex = EXPERIMENTS.find((e) => e.id === id);
  const cost = rate(s).mul(18);
  if (
    !ex ||
    s.experiment ||
    s.trials?.active ||
    s.experiments.includes(id) ||
    s.energy.lt(cost)
  )
    return false;
  s.energy = s.energy.sub(cost);
  s.experiment = { id, progress: 0 };
  return true;
}
function absorb(s, q, events, stepEffects) {
  const item = MATTER[q.matter];
  s.mass = s.mass.add(
    item.mass.mul(s.world?.modules.includes("mass") ? 1.5 : 1),
  );
  s.highest = Math.max(s.highest, item.id);
  s.best = Math.max(s.best, item.id);
  s.absorbed++;
  s.runAbsorbed++;
  s.activity = Math.min(2, s.activity + 0.15 + item.category * 0.012);
  if (!s.seen.includes(item.id)) {
    if (has(s, "survey-" + item.category))
      s.energy = s.energy.add(D(q.cost).mul(0.5));
    s.seen.push(item.id);
    events.push({ type: "discovery", item: item.id });
  }
  if (s.world) absorbProgress(s, item.id);
  if (!s.everSeen.includes(item.id)) s.everSeen.push(item.id);
  if (s.world && !q.automatic && !s.world.manual.includes(item.id))
    s.world.manual.push(item.id);
  if (item.capture === "disruption") discover(s, "stellar");
  if (item.category >= 9) discover(s, "tides");
  if (item.render === "blackhole") discover(s, "merger");
  let refund = has(s, "thermal") ? 0.35 : 0.08;
  if (s.world && q.automatic && s.world.manual.includes(q.matter)) refund = 0.8;
  if (has(s, "tides") && item.category >= 6) refund *= 2;
  if (has(s, "merger") && item.render === "blackhole") refund += 1.5;
  if (learned(s, "lens") && ["blackhole", "cosmic"].includes(item.render))
    refund *= 2;
  s.energy = s.energy.add(D(q.cost).mul(refund));
  if (!s.world)
    dynamicsAbsorb(s, q, stepEffects, {
      thermal: has(s, "thermal"),
      tides: has(s, "tides") && item.category >= 6,
    });
  events.push({ type: "absorb", item: item.id, id: q.id });
  trialAbsorb(s, q, events);
  if (s.experiment) {
    s.experiment.progress +=
      has(s, "planetary") && ["planet", "moon"].includes(item.render) ? 2 : 1;
    const ex = EXPERIMENTS.find((e) => e.id === s.experiment.id);
    if (s.experiment.progress >= ex.goal) {
      s.experiments.push(ex.id);
      s.experiment = null;
      events.push({ type: "experiment", name: ex.name });
    }
  }
}
function step(s, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return [];
  const events = [],
    before = era(s),
    stepEffects = fluxEffects(s);
  s.elapsed += dt;
  s.totalTime += dt;
  s.activity *= Math.exp(-dt * 0.28);
  s.energy = s.energy.add(rate(s).mul(dt));
  if (s.world) updateWorld(s, dt, buy, buyMasteredGroup);
  else advanceDynamics(s, dt, stepEffects);
  const remaining = [];
  for (const q of s.queue) {
    q.previousAge = q.age;
    q.age += dt;
    if (q.age >= q.duration) absorb(s, q, events, stepEffects);
    else remaining.push(q);
  }
  s.queue = remaining;
  if (!s.world && has(s, "capture")) {
    s.captureClock += dt;
    if (s.captureClock >= 6 - 1e-9 && s.queue.length < capacity(s)) {
      // A full field misses ambient encounters; it never banks a burst of free bodies.
      s.captureClock = Math.max(
        0,
        s.captureClock - 6 * Math.floor((s.captureClock + 1e-9) / 6),
      );
      const pools = reservoirs(s),
        pool = pools[s.nextId % Math.max(1, pools.length)];
      const i = s.legacy?.compatibilityRun
        ? pool === undefined
          ? Math.max(0, Math.min(unlocked(s), s.highest - 8))
          : Math.max(...s.seen.filter((i) => MATTER[i].category === pool))
        : (s.dynamics.paid.find((i) => i <= s.highest - 12) ?? -1);
      if (i >= 0)
        s.queue.push({
          id: s.nextId++,
          matter: i,
          age: 0,
          duration: duration(s, i),
          seed: 0.61,
          cost: "0",
        });
    }
  }
  s.clock += dt;
  if (!s.world && s.clock >= 1.2 - 1e-9) {
    s.clock = Math.max(0, s.clock - 1.2);
    rebuildDynamics(s, dynamicsContext(s));
    if (learned(s, "archive"))
      for (const n of visibleNodes(s).filter(
        (n) =>
          n.kind === "core" && n.era * 10 <= s.best && !s.nodes.includes(n.id),
      )) {
        if (s.energy.gt(n.cost.mul(2))) buyNode(s, n.id);
      }
    if (
      has(s, "auto") &&
      s.auto &&
      !trialManual(s) &&
      (!s.legacy?.compatibilityRun || s.trials.policy !== "frontier")
    )
      runScheduler(s);
    if (
      has(s, "auto") &&
      s.auto &&
      !trialManual(s) &&
      s.legacy?.compatibilityRun &&
      s.trials.policy === "frontier"
    ) {
      const budget = s.energy.mul(has(s, "reserve") ? 1 - s.reserve : 1);
      for (let i = unlocked(s); i >= 0; i--) {
        if (s.autoCategory >= 0 && MATTER[i].category !== s.autoCategory)
          continue;
        if (budget.gte(price(s, i)))
          buy(
            s,
            i,
            learned(s, "bulk")
              ? Math.min(10, budget.div(price(s, i)).floor().toNumber())
              : 1,
          );
        break;
      }
    }
  }
  if (era(s) > before) events.push({ type: "era", era: era(s) });
  return events;
}
export function tick(s, dt) {
  const idle =
    !s.world &&
    !s.queue.length &&
    !has(s, "capture") &&
    !(has(s, "auto") && s.auto) &&
    !learned(s, "archive") &&
    !has(s, "dynamics") &&
    !s.dynamics?.paidActivity;
  return advanceFixed(
    s,
    dt,
    (t) => step(s, t),
    idle
      ? (t) => {
          s.energy = s.energy.add(rate(s).mul(t));
          s.elapsed += t;
          s.totalTime += t;
          s.activity *= Math.exp(-t * 0.28);
          s.clock = Math.max(0, Math.round(((s.clock + t) % 1.2) * 1e9) / 1e9);
          if (s.clock >= 1.2 - 1e-9) s.clock = 0;
        }
      : null,
  );
}
export function acquisitionReserve(s) {
  const next = structureList(s).find((n) => canBuildNode(s, n.id));
  const full =
    ownsDynamics(s, "c-scheduler") ||
    learned(s, "autostart") ||
    learned(s, "heritage");
  return (next?.cost || D(0)).max(full ? 0 : price(s, unlocked(s)));
}
function runScheduler(s) {
  const d = s.dynamics,
    full =
      ownsDynamics(s, "c-scheduler") ||
      learned(s, "autostart") ||
      learned(s, "heritage") ||
      (s.legacy?.compatibilityRun && has(s, "auto"));
  if (!d || (!full && !ownsDynamics(s, "b-target"))) return;
  d.duplex = ownsDynamics(s, "d-duplex") ? !d.duplex : false;
  const circulate =
    ownsDynamics(s, "d-duplex") && d.duplex && d.schedule === "circulate";
  const budget = s.energy
    .sub(acquisitionReserve(s))
    .max(d.schedule === "circulate" ? s.energy.mul(0.05) : 0)
    .max(0)
    .min(s.energy.mul(has(s, "reserve") ? 1 - s.reserve : 1));
  const end = unlocked(s),
    eligible = [];
  if (s.trials?.policy === "survey" && s.trials.completed.includes("census")) {
    for (let i = end; i >= Math.max(0, end - 8); i--)
      if (
        !d.paid.includes(i) &&
        !s.queue.some((q) => q.matter === i) &&
        (s.autoCategory < 0 || MATTER[i].category === s.autoCategory) &&
        budget.gte(price(s, i)) &&
        buy(s, i, 1)
      )
        return;
  }
  if (s.trials?.policy === "braid" && s.trials.completed.includes("braid")) {
    for (let offset = 1; offset <= 20; offset++) {
      const category = (s.trials.braidCategory + offset) % 20;
      if (s.autoCategory >= 0 && s.autoCategory !== category) continue;
      const i = d.paid.find(
        (i) =>
          MATTER[i].category === category &&
          i <= end &&
          budget.gte(price(s, i)),
      );
      if (i !== undefined && buy(s, i, 1)) {
        s.trials.braidCategory = category;
        return;
      }
    }
    return;
  }
  for (let i = end; i >= 0; i--) {
    if (s.autoCategory >= 0 && MATTER[i].category !== s.autoCategory) continue;
    if (full && !circulate) {
      eligible.push(i);
      break;
    }
    if (i <= end - 2 && d.paid.includes(i)) eligible.push(i);
  }
  if (circulate) eligible.sort((a, b) => a - b);
  for (const i of eligible) {
    const amount = Math.min(
      full || learned(s, "bulk") ? 10 : 1,
      budget.div(price(s, i)).floor().toNumber(),
    );
    if (amount > 0 && buy(s, i, amount)) break;
    if (full && !circulate) break;
  }
}
export function gain(s) {
  if (s.highest < 160) return D(0);
  return D(
    Math.floor(
      (3 + Math.pow((s.highest - 155) / 3, 1.25)) *
        (1 + level(s, "information") * 0.08) *
        (has(s, "memory") ? 1 + s.seen.length * 0.005 : 1) +
        (s.experiments.includes("entropy") ? 3 : 0),
    ),
  )
    .mul(fluxEffects(s).information)
    .floor();
}
export const canEvaporate = (s) => s.highest >= 160 && has(s, "evaporation");
export function evaporate(s) {
  if (!canEvaporate(s)) return false;
  const reward = gain(s);
  const n = fresh();
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
    "condition",
  ])
    n[key] = s[key];
  n.runs++;
  n.trials = { ...s.trials, active: null };
  n.progress = { ...s.progress, hasEvaporated: true };
  n.information = n.information.add(reward);
  discover(n, "evaporation");
  if (learned(n, "autostart")) n.nodes = ["st-capture", "st-scheduler"];
  if (learned(n, "heritage"))
    n.nodes = [
      ...new Set([
        ...n.nodes,
        "st-capture",
        "st-decay",
        "st-disk",
        "st-scheduler",
      ]),
    ];
  if (learned(n, "start")) n.energy = D(1000);
  Object.assign(s, n);
  return reward;
}
export const canRenew = (s) =>
  s.runs >= 3 && learned(s, "conditions") && s.highest >= 194;
export function renew(s) {
  if (!canRenew(s)) return false;
  const n = fresh();
  n.origins = s.origins + 1;
  n.progress = { hasEvaporated: true, hasRenewed: true };
  n.settings = s.settings;
  n.totalTime = s.totalTime;
  n.absorbed = s.absorbed;
  n.phenomena = [...new Set([...s.phenomena, "boundary"])];
  n.everSeen = s.everSeen;
  n.best = s.best;
  n.research = ["autostart", "heritage", "compression"];
  n.nodes = ["st-capture", "st-decay", "st-disk", "st-scheduler"];
  n.condition = s.condition;
  n.trials = { ...s.trials, active: null };
  Object.assign(s, n);
  return true;
}
export function offline(s, seconds) {
  const time = Math.min(
    Math.max(0, seconds),
    learned(s, "offline") ? 86400 : 14400,
  );
  const startMass = s.mass,
    startEnergy = s.energy,
    startCount = s.absorbed;
  tick(s, time);
  return {
    seconds: time,
    mass: s.mass.sub(startMass),
    energy: s.energy.sub(startEnergy),
    count: s.absorbed - startCount,
    uncredited: Math.max(0, seconds - time),
  };
}
/** Chunked exact reference, with durable remaining time for a reload mid-resume. */
const offlineJobs = new WeakMap();
export function offlineAsync(s, seconds, onProgress = () => {}) {
  if (offlineJobs.has(s)) return offlineJobs.get(s);
  const job = resumeOffline(s, seconds, onProgress).finally(() =>
    offlineJobs.delete(s),
  );
  offlineJobs.set(s, job);
  return job;
}
async function resumeOffline(s, seconds, onProgress) {
  const allowance = learned(s, "offline") ? 86400 : 14400;
  const accepted = Math.min(
    Math.max(0, Number.isFinite(seconds) ? seconds : 0),
    allowance,
  );
  s.simulation.pendingOffline += accepted;
  s.savedAt = Math.max(s.savedAt, Date.now());
  const total = s.simulation.pendingOffline,
    initialMass = s.mass,
    initialEnergy = s.energy,
    initialCount = s.absorbed;
  let lastYield = performance.now();
  while (s.simulation.pendingOffline > 1e-8) {
    const amount = Math.min(1, s.simulation.pendingOffline);
    tick(s, amount);
    s.simulation.pendingOffline = Math.max(
      0,
      s.simulation.pendingOffline - amount,
    );
    if (performance.now() - lastYield > 12) {
      onProgress(1 - s.simulation.pendingOffline / total);
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYield = performance.now();
    }
  }
  onProgress(1);
  return {
    seconds: total,
    mass: s.mass.sub(initialMass),
    energy: s.energy.sub(initialEnergy),
    count: s.absorbed - initialCount,
    uncredited: Math.max(0, seconds - accepted),
  };
}
export const fmt = (n, places = 2) => {
  n = D(n);
  if (n.eq(0)) return "0";
  if (!Number.isFinite(n.layer) || !Number.isFinite(n.mag)) return "—";
  const negative = n.lt(0) ? "−" : "";
  n = n.abs();
  let e = n.log10().floor().toNumber();
  if (!Number.isFinite(e)) return negative + n.toString();
  if (e >= 6 || e <= -3) {
    let mantissa = Number(n.div(D(10).pow(e)).toFixed(places));
    if (mantissa >= 10) {
      mantissa = 1;
      e++;
    }
    return `${negative}${mantissa.toFixed(places)}e${e}`;
  }
  return (
    negative +
    n.toNumber().toLocaleString("en-US", { maximumFractionDigits: places })
  );
};
export const massText = (n) =>
  D(n).gte("1e30") ? `${fmt(D(n).div("1.989e30"))} M☉` : `${fmt(n)} kg`;
