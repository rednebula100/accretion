import { APPARATUS, FLOW_NODES } from "../data/pass1.js";

// Revealed means actionable in this run, never a preview of a distant gate.
export const revealedApparatus = (s) =>
  APPARATUS.filter(
    (n) => s.world.apparatus.includes(n.id) || s.highest >= n.at,
  );
export const revealedFlow = (s) =>
  FLOW_NODES.filter(
    (n) =>
      n.region === s.world.region &&
      (n.region === 0 || s.world.choices.includes("region")) &&
      (s.world.flow.includes(n.id) ||
        n.parents.every((id) => s.world.flow.includes(id))),
  );

// Edge signals replace objects only after nearly all of their footprint is gone.
export function visibilityState(rect, viewport, previous = "VISIBLE") {
  const width = Math.max(
    0,
    Math.min(rect.right, viewport.right) - Math.max(rect.left, viewport.left),
  );
  const height = Math.max(
    0,
    Math.min(rect.bottom, viewport.bottom) - Math.max(rect.top, viewport.top),
  );
  const ratio =
    (width * height) /
    Math.max(1, (rect.right - rect.left) * (rect.bottom - rect.top));
  if (ratio >= 0.98) return "VISIBLE";
  if (ratio < (previous === "OFFSCREEN" ? 0.14 : 0.06)) return "OFFSCREEN";
  return "PARTIAL";
}

// A finite 100 ms interpolation of already-earned Flux, with immediate spending.
// It cannot overshoot or accrue on its own, even while paused or hidden.
export class ResourcePresentation {
  constructor(value) {
    this.reset(value);
  }
  reset(value) {
    this.value = this.from = this.target = value;
    this.age = 0.1;
  }
  update(value, dt) {
    if (!value.eq(this.target)) {
      if (value.lt(this.target)) this.reset(value);
      else {
        this.from = this.value;
        this.target = value;
        this.age = 0;
      }
    }
    this.age = Math.min(0.1, this.age + dt);
    this.value =
      this.age === 0.1
        ? this.target
        : this.from.add(this.target.sub(this.from).mul(this.age / 0.1));
    return this.value;
  }
}

export function bindingPresentation(s, channels) {
  if (s.world.boundary === "HIDDEN") return [0, 0, 0];
  const unfolding = Math.max(0, Math.min(1, (s.highest - 39) / 9));
  return channels.map((n) => n * unfolding);
}

const shapes = {
  feed: '<path d="M8 17 H150 M8 37 H150 M20 27 H132 M124 21 L134 27 124 33"/>',
  field:
    '<path d="M20 42 V28 Q80 -16 140 28 V42 M30 42 V30 Q80 0 130 30 V42"/><circle cx="80" cy="30" r="7"/>',
  grid: '<path d="M20 8 H140 V46 H20 Z M60 8 V46 M100 8 V46 M20 27 H140"/>',
  tap: '<path d="M10 27 H80 L105 8 H150 M80 27 L105 46 H150"/><circle cx="80" cy="27" r="5"/>',
  binding:
    '<path d="M18 8 V46 H55 M142 8 V46 H105 M38 8 L55 27 38 46 M122 8 L105 27 122 46"/>',
  planetary:
    '<path d="M25 8 Q25 55 80 46 Q135 55 135 8 M35 8 Q35 40 80 36 Q125 40 125 8"/><circle cx="80" cy="18" r="12"/>',
  link: '<path d="M10 27 H55 M105 27 H150 M55 8 H105 V46 H55 Z M68 18 H92 V36 H68 Z"/>',
};
export function apparatusHardware(s) {
  return `<svg class="capture-scaffold" viewBox="0 0 500 120" aria-label="Capture scaffold"><path class="scaffold-bus" d="M15 60 H485"/>${revealedApparatus(
    s,
  )
    .map(
      (n, i) =>
        `<g data-hardware="${n.id}" class="${s.world.apparatus.includes(n.id) ? "powered" : "dormant"}" transform="translate(${12 + (i % 4) * 120} ${Math.floor(i / 4) * 58}) scale(.7)">${shapes[n.id] || shapes.link}</g>`,
    )
    .join("")}</svg>`;
}
