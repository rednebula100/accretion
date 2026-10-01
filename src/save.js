import { fresh, VERSION } from "./engine.js";
import { D, STRUCTURE, LEGACY_STRUCTURE, RESEARCH } from "./content.js";
import { decodeDynamics } from "./systems/dynamics.js";
import { decodeTrials } from "./systems/trials.js";
import { hasEvaporated, hasRenewed } from "./systems/progression.js";
import { decodeWorld } from "./systems/world.js";
export const SAVE_KEY = "accretion.save.v3";
export const LEGACY_SAVE_KEY = "accretion.save.v2";
const blockedStates = new WeakSet();
const decimalKeys = ["mass", "energy", "information"];
export function encode(s) {
  return JSON.stringify({
    ...s,
    version: VERSION,
    savedAt: Math.max(s.savedAt || 0, Date.now()),
  });
}
export function decode(text) {
  if (typeof text !== "string" || text.length > 2000000)
    throw Error("Save is empty or too large.");
  const raw = JSON.parse(text);
  if (!raw || ![1, 2, 3].includes(raw.version))
    throw Error("Unsupported save version.");
  const s = fresh();
  for (const key of decimalKeys) {
    const n = D(raw[key]);
    if (
      !Object.hasOwn(raw, key) ||
      !Number.isFinite(n.layer) ||
      !Number.isFinite(n.mag) ||
      n.lt(0)
    )
      throw Error(`Invalid ${key}.`);
    s[key] = n;
  }
  for (const key of [
    "origins",
    "runs",
    "best",
    "highest",
    "nextId",
    "elapsed",
    "totalTime",
    "absorbed",
    "runAbsorbed",
    "clock",
    "captureClock",
    "activity",
    "savedAt",
  ]) {
    if (raw[key] !== undefined) {
      if (
        !Number.isFinite(raw[key]) ||
        raw[key] < (key === "highest" ? -1 : 0) ||
        raw[key] > 1e15
      )
        throw Error(`Invalid ${key}.`);
      s[key] = raw[key];
    }
  }
  if (!Number.isInteger(s.highest) || s.highest > 199 || s.best > 199)
    throw Error("Invalid matter progression.");
  for (const key of [
    "origins",
    "runs",
    "best",
    "nextId",
    "absorbed",
    "runAbsorbed",
  ])
    if (!Number.isSafeInteger(s[key])) throw Error(`Invalid ${key}.`);
  for (const key of ["seen", "everSeen"]) {
    if (
      !Array.isArray(raw[key]) ||
      raw[key].some((i) => !Number.isInteger(i) || i < 0 || i >= 200)
    )
      throw Error("Invalid discoveries.");
    s[key] = [...new Set(raw[key])];
  }
  for (const [key, allowed] of [
    [
      "nodes",
      [...LEGACY_STRUCTURE, ...(raw.version === 3 ? STRUCTURE : [])].map(
        (n) => n.id,
      ),
    ],
    ["research", RESEARCH.map((r) => r.id)],
    [
      "phenomena",
      [
        "horizon",
        "capture",
        "disk",
        "lensing",
        "tides",
        "spin",
        "stellar",
        "jets",
        "merger",
        "evaporation",
        "boundary",
      ],
    ],
    ["experiments", ["spectra", "flow", "entropy"]],
  ]) {
    if (raw[key] !== undefined) {
      if (
        !Array.isArray(raw[key]) ||
        raw[key].some((i) => !allowed.includes(i))
      )
        throw Error(`Invalid ${key}.`);
      s[key] = [...new Set(raw[key])];
    }
  }
  s.spin = Math.max(0, Math.min(0.98, Number(raw.spin) || 0));
  s.reserve = Math.max(0, Math.min(0.9, Number(raw.reserve) || 0));
  s.auto = raw.auto !== false;
  s.autoCategory =
    Number.isInteger(raw.autoCategory) &&
    raw.autoCategory >= -1 &&
    raw.autoCategory < 20
      ? raw.autoCategory
      : -1;
  s.condition = ["balanced", "dense", "sparse"].includes(raw.condition)
    ? raw.condition
    : "balanced";
  if (raw.settings) {
    s.settings.audio = Math.max(
      0,
      Math.min(1, Number(raw.settings.audio) || 0),
    );
    s.settings.reducedMotion = raw.settings.reducedMotion === true;
    s.settings.quality = [
      "AUTO",
      "ULTRA",
      "HIGH",
      "BALANCED",
      "MOBILE",
    ].includes(raw.settings.quality)
      ? raw.settings.quality
      : "AUTO";
  }
  if (
    raw.experiment &&
    ["spectra", "flow", "entropy"].includes(raw.experiment.id) &&
    Number.isFinite(raw.experiment.progress) &&
    raw.experiment.progress >= 0
  )
    s.experiment = { id: raw.experiment.id, progress: raw.experiment.progress };
  if (raw.queue !== undefined) {
    if (!Array.isArray(raw.queue) || raw.queue.length > 200)
      throw Error("Invalid feeding queue.");
    s.queue = raw.queue.map((q) => {
      if (
        !Number.isInteger(q.id) ||
        q.id < 1 ||
        !Number.isInteger(q.matter) ||
        q.matter < 0 ||
        q.matter >= 200 ||
        !Number.isFinite(q.age) ||
        q.age < -20 ||
        !Number.isFinite(q.duration) ||
        q.duration <= 0 ||
        q.duration > 60 ||
        !Number.isFinite(q.seed)
      )
        throw Error("Invalid queued matter.");
      const cost = D(q.cost);
      if (
        !Number.isFinite(cost.mag) ||
        !Number.isFinite(cost.layer) ||
        cost.lt(0)
      )
        throw Error("Invalid queued cost.");
      return {
        id: q.id,
        matter: q.matter,
        age: q.age,
        duration: q.duration,
        seed: q.seed,
        cost: cost.toString(),
        ...(q.automatic === true ? { automatic: true } : {}),
      };
    });
    if (new Set(s.queue.map((q) => q.id)).size !== s.queue.length)
      throw Error("Duplicate queued matter.");
    s.nextId = Math.max(s.nextId, 1, ...s.queue.map((q) => q.id + 1));
  }
  s.progress = { hasEvaporated: hasEvaporated(s), hasRenewed: hasRenewed(s) };
  if (raw.version === 3) {
    if (raw.progress) {
      for (const key of ["hasEvaporated", "hasRenewed"])
        if (typeof raw.progress[key] !== "boolean")
          throw Error("Invalid progression history.");
      s.progress.hasEvaporated ||= raw.progress.hasEvaporated;
      s.progress.hasRenewed ||= raw.progress.hasRenewed;
    }
    if (raw.simulation) {
      const v = raw.simulation;
      if (
        !Number.isFinite(v.carry) ||
        v.carry < 0 ||
        v.carry >= 0.1 ||
        !Number.isSafeInteger(v.steps) ||
        v.steps < 0 ||
        !Number.isFinite(v.pendingOffline) ||
        v.pendingOffline < 0 ||
        v.pendingOffline > 172800
      )
        throw Error("Invalid simulation clock.");
      s.simulation = {
        carry: v.carry,
        steps: v.steps,
        pendingOffline: v.pendingOffline,
      };
    }
    if (raw.legacy) {
      const ids = raw.legacy.v2NodeIds;
      if (
        raw.legacy.compatibilityRun !== true ||
        !Array.isArray(ids) ||
        ids.some((id) => !LEGACY_STRUCTURE.some((n) => n.id === id))
      )
        throw Error("Invalid legacy ledger.");
      s.legacy = { compatibilityRun: true, v2NodeIds: [...new Set(ids)] };
    }
  } else {
    // The original100-node rules remain for this compatibility universe only.
    // Effects read nodes once; v2NodeIds is provenance, never a second multiplier.
    s.legacy = { compatibilityRun: true, v2NodeIds: [...s.nodes] };
  }
  if (raw.version === 3 && raw.dynamics) {
    s.dynamics = decodeDynamics(raw.dynamics);
    if (s.dynamics.paid.some((i) => !s.seen.includes(i)))
      throw Error("Invalid paid discovery history.");
  } else if (raw.version === 3) {
    // Recover development foundation saves that predate the new graph as well.
    if (s.nodes.some((id) => !LEGACY_STRUCTURE.some((n) => n.id === id)))
      throw Error("Invalid pre-Dynamics graph.");
    s.legacy = { compatibilityRun: true, v2NodeIds: [...s.nodes] };
  }
  if (
    !s.legacy &&
    s.nodes.some((id) => LEGACY_STRUCTURE.some((n) => n.id === id))
  )
    throw Error("Legacy nodes require a compatibility run.");
  s.trials = decodeTrials(raw.version === 3 ? raw.trials : undefined);
  if (
    s.trials.active &&
    (s.experiment ||
      s.trials.active.startId > s.nextId ||
      s.trials.active.identities.some((i) => !s.seen.includes(i)))
  )
    throw Error("Invalid Research continuity.");
  s.version = VERSION;
  s.world = decodeWorld(raw.world);
  return s;
}
export function save(s) {
  if (blockedStates.has(s)) return false;
  try {
    const text = encode(s);
    localStorage.setItem(SAVE_KEY, text);
    s.savedAt = JSON.parse(text).savedAt;
    return true;
  } catch {
    return false;
  }
}
export function load() {
  try {
    const current = localStorage.getItem(SAVE_KEY);
    const text = current ?? localStorage.getItem(LEGACY_SAVE_KEY);
    if (!text) return { state: fresh() };
    try {
      const state = decode(text);
      if (
        !state.world &&
        current !== null &&
        !localStorage.getItem(SAVE_KEY + ".pre-spatial")
      )
        localStorage.setItem(SAVE_KEY + ".pre-spatial", text);
      // Validate the actual encoded representation before ever persisting migration.
      decode(encode(state));
      return { state, migrated: current === null };
    } catch {
      try {
        localStorage.setItem(
          (current === null ? LEGACY_SAVE_KEY : SAVE_KEY) + ".recovery",
          text,
        );
      } catch {
        /* Original remains untouched even if quota is full. */
      }
      const state = fresh();
      blockedStates.add(state);
      return {
        state,
        error:
          "The save could not be read. The original is untouched; saving is paused. Import a valid backup in Settings or export this temporary run.",
      };
    }
  } catch {
    return {
      state: fresh(),
      error: "Storage is unavailable. Export your save before leaving.",
    };
  }
}
