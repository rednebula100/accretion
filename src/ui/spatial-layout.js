// Pure presentation derivation. No coordinates enter the simulation or save.
import { regime } from "../systems/spatial-progression.js";

export const STAGES = {
  FRESH: { center: 210, radius: 1, zoom: 0.85, padding: 180 },
  ANCHORED: { center: 280, radius: 1.18, zoom: 0.82, padding: 220 },
  PLANETARY: { center: 440, radius: 1.45, zoom: 0.68, padding: 260 },
  ARRAY_ECHO: { center: 420, radius: 1.4, zoom: 0.7, padding: 260 },
  ARRAY_ACTIVE: { center: 460, radius: 1.52, zoom: 0.67, padding: 300 },
};
export const SPATIAL = {
  matter: {
    preferredPosition: [-440, 20],
    preferredSector: "WEST",
    full: [320, 480],
    compact: [260, 235],
    mastered: [230, 215],
    layoutPriority: 5,
    mobility: "ELASTIC_RADIAL",
    minSeparation: 75,
  },
  structure: {
    preferredPosition: [-370, -370],
    preferredSector: "NORTH_WEST",
    full: [570, 610],
    compact: [270, 210],
    mastered: [250, 200],
    layoutPriority: 4,
    mobility: "SECTOR_ELASTIC",
    minSeparation: 85,
  },
  dynamics: {
    preferredPosition: [0, 470],
    preferredSector: "SOUTH",
    full: [820, 640],
    compact: [270, 205],
    mastered: [250, 185],
    layoutPriority: 3,
    mobility: "ELASTIC_RADIAL",
    minSeparation: 85,
  },
  converter: {
    preferredPosition: [390, 360],
    preferredSector: "SOUTH_EAST",
    full: [360, 590],
    compact: [250, 190],
    mastered: [240, 180],
    layoutPriority: 2,
    mobility: "SECTOR_ELASTIC",
    minSeparation: 85,
  },
  anchor: {
    preferredPosition: [520, -20],
    preferredSector: "EAST",
    full: [900, 950],
    compact: [300, 230],
    mastered: [280, 220],
    layoutPriority: 6,
    mobility: "ELASTIC_RADIAL",
    minSeparation: 95,
  },
  array: {
    preferredPosition: [0, 0],
    preferredSector: "CENTER",
    full: [1180, 900],
    compact: [740, 850],
    layoutPriority: 10,
    mobility: "FIXED",
    minSeparation: 0,
  },
  planetary: {
    preferredPosition: [0, 0],
    preferredSector: "CENTER",
    full: [1100, 760],
    compact: [700, 850],
    layoutPriority: 10,
    mobility: "CENTER_OVERLAY",
    minSeparation: 0,
  },
  erasure: {
    preferredPosition: [-2100, 1550],
    preferredSector: "REMOTE",
    full: [420, 650],
    compact: [260, 200],
    layoutPriority: 0,
    mobility: "REMOTE",
    minSeparation: 180,
  },
};
export function compositionState(
  s,
  focus = "universe",
  depth = 0,
  remote = false,
  expanded = null,
) {
  const w = s.world,
    has = (id) => w.modules.includes(id);
  const planetary =
    w.planetary !== "HIDDEN" &&
    !w.capabilities.includes("CAP_PLANETARY_BINDING") &&
    !w.p2.cl;
  const stage = w.p2.cl
    ? "ARRAY_ACTIVE"
    : planetary
      ? "PLANETARY"
      : has("surveyor")
        ? "ARRAY_ECHO"
        : w.anchors
          ? "ANCHORED"
          : "FRESH";
  const visible = ["matter", "structure"];
  for (const id of ["dynamics", "converter"])
    if (w.locations[id] !== "HIDDEN") visible.push(id);
  if (w.anchors || w.p2.cl) visible.push("anchor");
  if (planetary) visible.push("planetary");
  if (w.p2.cl || has("surveyor")) visible.push("array");
  if (remote) visible.push("erasure");
  const mastery = {
    matter: has("bulk") ? "mastered" : has("relay") ? "automated" : "manual",
    structure: has("imprint") ? "automated" : "manual",
    dynamics:
      has("recall") && w.knownRegions.includes(0) && w.region === 0
        ? "mastered"
        : "manual",
    converter: has("regulator") ? "automated" : "manual",
    anchor: regime(s) >= 3 ? "established" : "manual",
  };
  // Counts/prices/ordinary purchases deliberately do not enter the layout key.
  return {
    stage,
    visible,
    mastery,
    regime: regime(s),
    boundary: w.boundary,
    planetary: w.planetary,
    locations: w.locations,
    seed: Object.values(w.seed).filter(Boolean).length,
    region: w.region,
    focus: depth ? focus : "universe",
    depth: Math.min(1, depth),
    remote,
    expanded,
  };
}
export function box(p) {
  return {
    left: p.x - p.footprint[0] / 2,
    right: p.x + p.footprint[0] / 2,
    top: p.y - p.footprint[1] / 2,
    bottom: p.y + p.footprint[1] / 2,
  };
}
export function overlaps(a, b, gap = 0) {
  const x = box(a),
    y = box(b);
  return (
    x.left < y.right + gap &&
    x.right + gap > y.left &&
    x.top < y.bottom + gap &&
    x.bottom + gap > y.top
  );
}
export function centerDistance(p) {
  const b = box(p);
  return Math.hypot(
    Math.max(b.left, 0, -b.right),
    Math.max(b.top, 0, -b.bottom),
  );
}
export function deriveLayout(c) {
  const stage = STAGES[c.stage],
    points = {};
  const center = Math.max(
    stage.center,
    ["array", "planetary"].some(
      (id) =>
        c.visible.includes(id) &&
        (c.expanded ? c.expanded.includes(id) : c.focus === id),
    )
      ? 810
      : 0,
    c.boundary === "READY" ? 300 : 0,
  );
  const ids = [...c.visible].sort(
    (a, b) =>
      SPATIAL[b].layoutPriority - SPATIAL[a].layoutPriority ||
      a.localeCompare(b),
  );
  for (const id of ids) {
    const m = SPATIAL[id],
      full = c.expanded ? c.expanded.includes(id) : c.focus === id,
      mastered = c.mastery[id] && c.mastery[id] !== "manual";
    const footprint = [
      ...(full ? m.full : mastered && m.mastered ? m.mastered : m.compact),
    ];
    if (id === "anchor") {
      if (full && c.regime < 3) {
        footprint[0] = 700;
        footprint[1] = c.regime === 1 ? 540 : 720;
      }
      if (!full) footprint[1] += (c.regime - 1) * 10;
    }
    const [lx, ly] = m.preferredPosition;
    let x = lx * stage.radius,
      y = ly * stage.radius;
    if (id === "anchor") x += (c.regime - 1) * 65;
    if (m.mobility === "REMOTE") {
      x = lx;
      y = ly;
    }
    const p = {
      id,
      x,
      y,
      logicalPosition: { x: lx, y: ly },
      preferredPosition: { x, y },
      footprint,
      full,
      presentationState: full ? "full" : mastered ? "mastered" : "compact",
      mastery: c.mastery[id] || "manual",
      sector: m.preferredSector,
      centerClearance: center,
      minSeparation: m.minSeparation + (full ? 65 : 0),
    };
    if (m.preferredSector === "CENTER") {
      // Console is on the east rim at D1; framing/extent center differs from BH origin.
      p.x = full ? 170 : 0;
      p.y = full ? 20 : 40;
      p.origin = { x: 0, y: 0 };
      points[id] = p;
      continue;
    }
    const radius = Math.hypot(x, y),
      angle = Math.atan2(y, x);
    const others = Object.values(points).filter((q) => q.sector !== "CENTER");
    // Bounded outward search; only a small sector shift if a radial corridor is crowded.
    let found = false;
    for (let step = 0; step < 100 && !found; step++) {
      for (const shift of step < 12 || m.mobility !== "SECTOR_ELASTIC"
        ? [0]
        : [0, 0.045, -0.045, 0.09, -0.09]) {
        p.x = Math.cos(angle + shift) * (radius + step * 28);
        p.y = Math.sin(angle + shift) * (radius + step * 28);
        if (
          centerDistance(p) >= center &&
          !others.some((q) =>
            overlaps(p, q, Math.max(p.minSeparation, q.minSeparation)),
          )
        ) {
          found = true;
          break;
        }
      }
    }
    p.collisionAvoidanceOffset = { x: p.x - x, y: p.y - y };
    points[id] = p;
  }
  const extents = Object.values(points).map(box),
    pad = stage.padding;
  const bounds = {
    left: Math.min(-center, ...extents.map((b) => b.left)) - pad,
    right: Math.max(center, ...extents.map((b) => b.right)) + pad,
    top: Math.min(-center, ...extents.map((b) => b.top)) - pad,
    bottom: Math.max(center, ...extents.map((b) => b.bottom)) + pad,
  };
  return {
    stage: c.stage,
    center,
    points,
    bounds,
    padding: pad,
    universe: { x: 0, y: 0, zoom: stage.zoom },
  };
}
