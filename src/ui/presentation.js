export class PresentationEventBus {
  constructor() {
    this.listeners = new Set();
    this.history = [];
  }
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit(event) {
    this.history.push(event);
    if (this.history.length > 200) this.history.shift();
    for (const fn of this.listeners) fn(event);
  }
}
export const RECIPES = {
  REGIME: { duration: 900, level: 3 },
  IMPRINT: { duration: 300, level: 1 },
  RECALL: { duration: 500, level: 2 },
  PLANETARY_STATE: { duration: 800, level: 2 },
  PLANETARY_BREACH: { duration: 1600, level: 4 },
  SEED_COMPONENT: { duration: 700, level: 3 },
  SEED_COMPLETE: { duration: 1200, level: 4 },
  CONVERGENCE: { duration: 2200, level: 4 },
  LOCATION_DETECTED: { duration: 900, level: 2 },
  LOCATION_UNLOCKED: { duration: 900, level: 3 },
  NODE_PURCHASE: { duration: 260, level: 1 },
  FEED_LAUNCH: { duration: 220, level: 1 },
  RESET_BEGIN: { duration: 1500, level: 4 },
  RECONSTRUCTION: { duration: 1400, level: 3 },
  BOUNDARY_READY: { duration: 900, level: 3 },
  BOUNDARY_BREACHED: { duration: 1500, level: 4 },
  ANCHOR: { duration: 1500, level: 4 },
  ACHIEVEMENT: { duration: 3000, level: 2 },
};
export class FXDirector {
  constructor(bus, root, toast) {
    this.root = root;
    this.toast = toast;
    this.active = [];
    this.history = [];
    this.messages = [];
    this.message = null;
    this.reduced = false;
    this.impulse = 0;
    this.particleCursor = 0;
    this.particles = Array.from({ length: 18 }, () => {
      const el = document.createElement("i");
      el.className = "action-particle";
      root.append(el);
      return el;
    });
    bus.on((e) => this.receive(e));
  }
  burst(el, color, count = 4) {
    if (!el || this.reduced) return;
    const r = el.getBoundingClientRect();
    if (
      r.right < 0 ||
      r.left > innerWidth ||
      r.bottom < 0 ||
      r.top > innerHeight
    )
      return;
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor++ % this.particles.length];
      p.getAnimations().forEach((a) => a.cancel());
      p.style.left = `${r.left + r.width / 2}px`;
      p.style.top = `${r.top + r.height / 2}px`;
      p.style.background = color;
      const a = (i * Math.PI * 2) / count;
      this.animate(
        p,
        [
          { opacity: 0.85, transform: "translate(0,0) scale(1)" },
          {
            opacity: 0,
            transform: `translate(${Math.cos(a) * 32}px,${Math.sin(a) * 24}px) scale(.3)`,
          },
        ],
        { duration: 360 },
      );
    }
  }
  animate(el, frames, options = {}) {
    const timing = {
      duration: 500,
      easing: "cubic-bezier(.2,.7,.2,1)",
      ...options,
    };
    if (this.reduced) {
      timing.duration = Math.min(160, timing.duration);
      timing.delay = 0;
      frames = frames.map((f) => ({ opacity: f.opacity ?? 1 }));
    }
    return el?.animate(frames, timing);
  }
  receive(e) {
    const recipe = RECIPES[e.type];
    if (!recipe) return;
    this.history.push({ ...e, ...recipe });
    if (this.history.length > 200) this.history.shift();
    this.active.push({ event: e, remaining: recipe.duration / 1000 });
    this.root.dataset.event = e.type;
    const q = (s) => this.root.querySelector(s),
      all = (s) => this.root.querySelectorAll(s);
    if (e.type === "FEED_LAUNCH") {
      const el =
        q(`[data-action="matter"][data-id="${e.id}"]:not(:disabled)`) ||
        q("#matter .frontier");
      this.animate(el, [{ opacity: 0.55 }, { opacity: 1 }], { duration: 180 });
      this.burst(el, "#b9dce0", 3);
    }
    if (
      !this.reduced &&
      [
        "LOCATION_UNLOCKED",
        "RECONSTRUCTION",
        "BOUNDARY_READY",
        "PLANETARY_BREACH",
        "ANCHOR",
        "CONVERGENCE",
      ].includes(e.type)
    )
      this.impulse = Math.max(
        this.impulse,
        e.type === "LOCATION_UNLOCKED" ? 0.006 : recipe.level * 0.004,
      );
    if (e.type === "NODE_PURCHASE") {
      if (e.id === "region")
        this.animate(
          q("#flow-graph"),
          [
            { opacity: 0.2, scale: ".96" },
            { opacity: 1, scale: "1" },
          ],
          { duration: 650 },
        );
      const el = q(`[data-id="${e.id}"]`);
      this.burst(el, q(`[data-hardware="${e.id}"]`) ? "#e5c58c" : "#a3e2e3");
      this.animate(
        q(`[data-hardware="${e.id}"]`),
        [
          { opacity: 0.25, filter: "brightness(2.2)" },
          { opacity: 1, filter: "brightness(1)" },
        ],
        { duration: 420 },
      );
      if (e.id === "converter") {
        const device = q("#convert");
        this.animate(
          device,
          [
            { filter: "brightness(1)", scale: "1" },
            { filter: "brightness(2)", scale: ".97", offset: 0.35 },
            { filter: "brightness(1)", scale: "1" },
          ],
          { duration: 420 },
        );
        this.animate(q("#energy"), [{ opacity: 0.3 }, { opacity: 1 }], {
          duration: 400,
          delay: 200,
        });
        this.burst(device, "#91e1de", 5);
      }
      this.animate(
        el,
        [
          { filter: "brightness(1.8)", scale: ".97" },
          { opacity: 1, scale: "1" },
        ],
        { duration: 260 },
      );
      all(".flow-edges path").forEach((path) =>
        this.animate(
          path,
          [
            { strokeDashoffset: 24, opacity: 1 },
            { strokeDashoffset: 0, opacity: 0.65 },
          ],
          { duration: 350 },
        ),
      );
    }
    if (e.type === "LOCATION_DETECTED")
      this.animate(
        q(`[data-travel="${e.location}"]`),
        [{ filter: "brightness(2)" }, { filter: "brightness(1)" }],
        { duration: 900 },
      );
    if (e.type === "LOCATION_UNLOCKED") {
      if (e.location === "dynamics") {
        this.animate(
          q(".flow-edges"),
          [
            { opacity: 0, clipPath: "inset(0 100% 0 0)" },
            { opacity: 1, scale: "1" },
          ],
          { duration: 450 },
        );
        all("#flow-graph .node").forEach((n, i) =>
          this.animate(
            n,
            [
              { opacity: 0, scale: ".92" },
              { opacity: 1, scale: "1" },
            ],
            { delay: this.reduced ? 0 : 250 + i * 65, fill: "backwards" },
          ),
        );
      } else
        this.animate(
          q(`#${e.location}`),
          [
            { opacity: 0, scale: ".92" },
            { opacity: 1, scale: "1" },
          ],
          { duration: this.reduced ? 160 : 800 },
        );
    }
    if (e.type === "RESET_BEGIN") {
      this.message = null;
      this.messages = [];
    }
    if (e.type === "RESET_BEGIN" && e.kind === "reconstruct") {
      all(".flow-edges path").forEach((p) =>
        this.animate(
          p,
          [
            { strokeDashoffset: 0, opacity: 0.65 },
            { strokeDashoffset: -100, opacity: 1 },
            { strokeDashoffset: -150, opacity: 0 },
          ],
          { duration: this.reduced ? 160 : 700, fill: "forwards" },
        ),
      );
      all("#flow-graph .node:not(.reconstruct)").forEach((n) => {
        const pos = n.style.transform;
        this.animate(
          n,
          [
            { transform: pos, opacity: 1 },
            { transform: "translate(600px,0px) scale(.03)", opacity: 0 },
          ],
          {
            delay: this.reduced ? 0 : 180,
            duration: this.reduced ? 160 : 520,
            fill: "forwards",
          },
        );
      });
    }
    if (e.type === "RECONSTRUCTION") {
      this.animate(
        q("#flow-graph"),
        [
          { opacity: 0.2, scale: ".96" },
          { opacity: 1, scale: "1" },
        ],
        { duration: this.reduced ? 160 : 650 },
      );
      this.animate(q("#coherence-wrap"), [
        { opacity: 0.4, scale: "1.12" },
        { opacity: 1, scale: "1" },
      ]);
    }
    if (e.type === "ANCHOR")
      this.animate(
        q("#cosmos"),
        [{ filter: "brightness(2)" }, { filter: "brightness(1)" }],
        { duration: this.reduced ? 160 : 750 },
      );
    if (e.type === "REGIME")
      this.animate(
        q("#anchor"),
        [
          { opacity: 0.5, scale: ".96" },
          { opacity: 1, scale: "1" },
        ],
        { duration: 900 },
      );
    if (e.type === "IMPRINT")
      this.animate(
        q(`[data-id="${e.id}"]`),
        [
          { opacity: 0.3, scale: ".85" },
          { opacity: 1, scale: "1" },
        ],
        { duration: 300 },
      );
    if (e.type === "RECALL")
      this.animate(q("#flow-graph"), [{ opacity: 0.2 }, { opacity: 1 }], {
        duration: 400,
      });
    if (
      e.type === "SEED_COMPONENT" ||
      e.type === "SEED_COMPLETE" ||
      e.type === "CONVERGENCE"
    )
      this.animate(
        q("#array-wires"),
        [
          { opacity: 0.15, rotate: "-12deg", scale: ".85" },
          { opacity: 1, rotate: "0deg", scale: "1" },
        ],
        { duration: e.type === "CONVERGENCE" ? 1800 : 700 },
      );
    if (e.type === "RESET_BEGIN" && e.kind === "convergence")
      this.animate(
        q("#array-wires"),
        [
          { rotate: "0deg", scale: "1" },
          { rotate: "35deg", scale: ".25" },
        ],
        { duration: 1100 },
      );
    let text = "";
    if (e.type === "REGIME")
      text = `BINDING REGIME ${e.regime} · New Anchor arms take shape.`;
    if (e.type === "RECALL") text = "REGION A RECALLED · A known root.";
    if (e.type === "PLANETARY_BREACH")
      text = "WORLDS · The field holds a new scale.";
    if (e.type === "SEED_COMPLETE")
      text = "ARRAY SEED COMPLETE · Convergence detected.";
    if (e.type === "CONVERGENCE")
      text = `+${e.gain} ALIGNMENT · The Array remains.`;
    if (e.type === "ANCHOR") text = `+${e.gain} RESIDUE · SOMETHING REMAINED.`;
    if (e.type === "RECONSTRUCTION")
      text = `+${e.gain} COHERENCE · A new root.`;
    if (e.type === "BOUNDARY_READY")
      text = "The field can hold a memory. Return to the Binding Limit.";
    if (e.type === "ACHIEVEMENT") text = `◇ ${e.label}`;
    if (e.type === "LOCATION_DETECTED" && e.stage !== "ECHO")
      text =
        e.location === "dynamics"
          ? "A coherent response is forming below the horizon."
          : `A signal to the ${e.location === "anchor" ? "east" : "southeast"}.`;
    if (text) {
      this.messages.push({
        text,
        level: recipe.level,
        remaining: Math.max(3, recipe.duration / 1000),
      });
      this.messages.sort((a, b) => b.level - a.level);
    }
  }
  update(dt) {
    this.impulse = this.reduced ? 0 : Math.max(0, this.impulse - dt * 0.055);
    this.active = this.active.filter((e) => (e.remaining -= dt) > 0);
    if (!this.active.length) delete this.root.dataset.event;
    if (this.message && (this.message.remaining -= dt) <= 0)
      this.message = null;
    if (
      this.messages.length &&
      (!this.message || this.messages[0].level > this.message.level)
    )
      this.message = this.messages.shift();
    this.toast.textContent = this.message?.text || "";
  }
}
export function interpolatedAge(q, alpha) {
  return (
    (q.previousAge ?? q.age) +
    (q.age - (q.previousAge ?? q.age)) * Math.max(0, Math.min(1, alpha))
  );
}
