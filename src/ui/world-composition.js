import { compositionState, deriveLayout } from "./spatial-layout.js";
import { APPARATUS, MODULES } from "../data/pass1.js";
import { MATTER } from "../content.js";
import { unlocked, price, fmt } from "../engine.js";

const names = {
  matter: "Matter Feed",
  structure: "Structure",
  dynamics: "Dynamics",
  converter: "Converter",
  anchor: "Field Anchor",
  array: "Accretion Array",
  planetary: "Planetary Boundary",
  erasure: "Erasure Well",
};
const icons = {
  matter: "⋈",
  structure: "⌑",
  dynamics: "⌁",
  converter: "ϟ",
  anchor: "◉",
};
const smooth = (t) => t * t * (3 - 2 * t);
const ease = {
  structure: (t) => 1 - (1 - t) ** 3,
  dynamics: smooth,
  anchor: (t) => t * t * (3 - 2 * t),
  converter: (t) => 1 - (1 - t) ** 4,
};
export class WorldComposition {
  constructor(root, camera, getState, busy) {
    Object.assign(this, {
      root,
      camera,
      getState,
      busy,
      key: "",
      layout: null,
      current: {},
      motion: null,
      remote: false,
      solves: 0,
      solveMS: [],
      pending: false,
      expanded: new Set(),
    });
    this.elements = {};
    for (const id of Object.keys(names))
      this.elements[id] = root.querySelector(
        "#" + (id === "array" ? "array-machine" : id),
      );
    for (const id of [
      "matter",
      "structure",
      "dynamics",
      "converter",
      "anchor",
    ]) {
      const el = this.elements[id],
        body = document.createElement("div");
      body.className = "location-body";
      for (const child of [...el.children])
        if (child.tagName !== "HEADER") body.append(child);
      el.append(body);
      el.insertAdjacentHTML(
        "beforeend",
        `<div class="facility-summary"><button class="facility-mark" data-travel="${id}" aria-label="Open ${names[id]}"><span>${icons[id]}</span><svg viewBox="0 0 200 40" aria-hidden="true"><path d="M10 20 H60 L75 8 H125 L140 20 H190 M60 20 L75 32 H125 L140 20"/></svg></button><p class="facility-status"></p><p class="facility-next"></p><div class="facility-action"></div></div>`,
      );
    }
    for (const id of ["array", "planetary"]) {
      this.elements[id].insertAdjacentHTML(
        "beforeend",
        `<button class="center-beacon" data-travel="${id}"><small></small><strong>${names[id]} ↗</strong><span></span></button>`,
      );
    }
    camera.prepareLayout = () => {
      if (camera.targetLocation !== "universe")
        this.expanded.add(camera.targetLocation);
      this.sync(true);
    };
    camera.resolveLocation = (id) => this.target(id);
  }
  toggle(id) {
    if (
      !this.layout?.points[id] ||
      this.getState().world.locations[id] === "ECHO"
    )
      return;
    if (this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);
    this.sync(true);
  }
  target(id) {
    if (id === "universe") {
      if (this.layout?.stage === "FRESH") {
        const selected = ["matter", "structure", "dynamics"]
          .map((id) => this.layout.points[id])
          .filter(Boolean);
        const left = Math.min(
          -210,
          ...selected.map((p) => p.x - p.footprint[0] / 2),
        );
        const right = 240;
        const top = Math.min(
          -210,
          ...selected.map((p) => p.y - p.footprint[1] / 2),
        );
        const bottom = Math.max(
          210,
          ...selected.map((p) => p.y + p.footprint[1] / 2),
        );
        const zoom = Math.min(
          0.85,
          (innerWidth - 140) / (right - left),
          (innerHeight - 220) / (bottom - top),
        );
        return {
          x: (left + right) / 2,
          y: (top + bottom) / 2 - 10 / zoom,
          zoom,
        };
      }
      const p = this.layout?.universe || { x: 0, y: 0, zoom: 1 };
      const zoom = Math.min(
        p.zoom,
        ((globalThis.innerWidth ?? 1440) - 80) / 1000,
      );
      return {
        ...p,
        y:
          this.layout?.stage === "FRESH"
            ? -100 -
              Math.max(0, 900 - (globalThis.innerHeight ?? 900)) / 2 / zoom
            : 0,
        zoom,
      };
    }
    const p = this.layout?.points[id];
    if (!p) return null;
    const width = globalThis.innerWidth ?? 1440,
      height = globalThis.innerHeight ?? 900;
    if (p.sector === "CENTER")
      return {
        x: 0,
        y: 0,
        zoom: Math.min(
          0.85,
          (width - 120) / (p.footprint[0] + Math.abs(p.x) * 2),
          (height - 240) / (p.footprint[1] + Math.abs(p.y) * 2),
        ),
      };
    const zoom = Math.min(
      1,
      (width - 100) / p.footprint[0],
      (height - 230) / p.footprint[1],
    );
    return { x: p.x, y: p.y - 10 / zoom, zoom };
  }
  sync(navigation = false) {
    this.root.dataset.depth = this.camera.depth;
    const c = compositionState(
      this.getState(),
      this.camera.targetLocation,
      this.camera.depth,
      this.remote,
      [...this.expanded].sort(),
    );
    const key = JSON.stringify(c);
    if (key === this.key) {
      this.pending = false;
      return;
    }
    if (this.busy()) {
      this.pending = true;
      return;
    }
    this.pending = false;
    const start = performance.now(),
      next = deriveLayout(c),
      old = this.layout;
    this.solveMS.push(performance.now() - start);
    if (this.solveMS.length > 300) this.solveMS.shift();
    this.solves++;
    this.key = key;
    this.layout = next;
    this.root.dataset.composition = next.stage;
    this.root.dataset.depth = this.camera.depth;
    for (const [id, el] of Object.entries(this.elements)) {
      const p = next.points[id];
      el.hidden = !p;
      if (!p) continue;
      el.dataset.presentation = p.presentationState;
      el.dataset.mastery = p.mastery;
      el.dataset.focused = String(c.focus === id);
      if (id === "dynamics") {
        const echo = c.locations.dynamics === "ECHO";
        el.querySelector("header").inert = echo;
        const mark = el.querySelector(".facility-mark");
        mark.disabled = echo;
        mark.setAttribute(
          "aria-label",
          echo ? "Unresolved signal" : "Focus Dynamics",
        );
      }
      el.querySelector(".location-title")?.setAttribute(
        "aria-expanded",
        String(p.full),
      );
      el.classList.toggle("peripheral", c.depth > 0 && c.focus !== id);
      if (el.classList.contains("location")) {
        el.style.setProperty("--facility-w", p.footprint[0] + "px");
        el.style.setProperty("--facility-h", p.footprint[1] + "px");
        // Full -> compact focus must not remain in an invisible child.
        if (
          !p.full &&
          el.querySelector(".location-body")?.contains(document.activeElement)
        )
          el.querySelector(".location-title").focus({ preventScroll: true });
      }
    }
    const duration = this.camera.reducedMotion
      ? 0.18
      : old?.stage !== next.stage
        ? 0.85
        : 0.55;
    const from = {};
    for (const [id, p] of Object.entries(next.points))
      from[id] = this.current[id] || p.origin || p;
    this.motion = {
      age: 0,
      duration,
      from,
      compensate:
        !navigation &&
        !!old &&
        c.focus !== "universe" &&
        this.camera.contextAttached,
      focus: c.focus,
      epoch: this.camera.manualEpoch,
      fromZoom: this.camera.zoom,
      toZoom:
        !navigation && old && c.focus !== "universe"
          ? Math.min(this.camera.zoom, this.target(c.focus)?.zoom || 1)
          : this.camera.zoom,
    };
    this.camera.bounds = old
      ? {
          left: Math.min(old.bounds.left, next.bounds.left),
          right: Math.max(old.bounds.right, next.bounds.right),
          top: Math.min(old.bounds.top, next.bounds.top),
          bottom: Math.max(old.bounds.bottom, next.bounds.bottom),
        }
      : { ...next.bounds };
    if (
      !navigation &&
      old &&
      c.focus !== "universe" &&
      this.camera.contextAttached &&
      this.camera.travel
    ) {
      this.camera.reframe(this.target(c.focus), duration);
      this.motion.compensate = false;
    }
    if (
      !navigation &&
      old &&
      c.focus === "universe" &&
      this.camera.contextAttached &&
      old.stage !== next.stage
    )
      this.camera.reframe(this.target("universe"), duration);
    if (!old) this.update(duration);
    this.updateSummaries();
  }
  update(dt) {
    if (this.pending && !this.busy()) this.sync();
    if (!this.motion || this.busy()) return;
    const m = this.motion;
    m.age += dt;
    const t = Math.min(1, m.age / m.duration);
    for (const [id, p] of Object.entries(this.layout.points)) {
      const goal = p.origin || p,
        f = m.from[id],
        k = (ease[id] || smooth)(t);
      const v = { x: f.x + (goal.x - f.x) * k, y: f.y + (goal.y - f.y) * k };
      const prev = this.current[id] || f;
      if (
        m.compensate &&
        id === m.focus &&
        this.camera.manualEpoch === m.epoch &&
        !this.camera.travel
      ) {
        this.camera.x += v.x - prev.x;
        this.camera.y += v.y - prev.y;
        this.camera.zoom = m.fromZoom + (m.toZoom - m.fromZoom) * smooth(t);
      }
      this.current[id] = v;
      if (p.sector !== "CENTER")
        this.elements[id].style.transform =
          `translate(${v.x}px,${v.y}px) translate(-50%,-50%)`;
    }
    this.connectors();
    if (t === 1) {
      this.camera.bounds = { ...this.layout.bounds };
      this.motion = null;
    }
  }
  connectors() {
    const paths = [];
    // Spokes stop at the center reservation and never cross the central arena.
    for (const [id, p] of Object.entries(this.layout.points)) {
      if (
        p.sector === "CENTER" ||
        id === "erasure" ||
        this.getState().world.locations[id] === "ECHO"
      )
        continue;
      const v = this.current[id],
        r = Math.hypot(v.x, v.y),
        ux = v.x / r,
        uy = v.y / r;
      const edge = Math.min(
        Math.abs(ux) > 0.01 ? p.footprint[0] / 2 / Math.abs(ux) : Infinity,
        Math.abs(uy) > 0.01 ? p.footprint[1] / 2 / Math.abs(uy) : Infinity,
      );
      const a = this.layout.center * 0.88,
        b = r - edge - 12;
      paths.push(
        `<path d="M${ux * a} ${uy * a} Q${(ux * (a + b)) / 2 - uy * 35} ${(uy * (a + b)) / 2 + ux * 35} ${ux * b} ${uy * b}"/>`,
      );
    }
    this.root.querySelector(".world-links").innerHTML = paths.join("");
  }
  updateSummaries() {
    const s = this.getState(),
      w = s.world,
      u = unlocked(s),
      has = (id) => w.modules.includes(id);
    const next = APPARATUS.filter(
      (n) => !w.apparatus.includes(n.id) && s.highest >= n.at,
    );
    const available = MODULES.filter(
      (n) => n.regime <= compositionState(s).regime && !has(n.id),
    );
    const values = {
      matter: [
        `${has("bulk") ? "BULK FEED" : has("relay") ? (w.relay.enabled ? "RELAY ACTIVE" : "RELAY PAUSED") : "MANUAL CAPTURE"} · ${s.queue.length} in transit`,
        `${String(u + 1).padStart(3, "0")} / ${MATTER[u].name}`,
      ],
      structure: [
        `${w.apparatus.length} established${has("imprint") ? " · Imprint online" : ""}`,
        next.length
          ? `New work · ${next[0].name}${next.length > 1 ? ` +${next.length - 1}` : ""}`
          : "Schematic stable · open to inspect",
      ],
      dynamics: [
        w.locations.dynamics === "ECHO"
          ? "Unresolved southern signal"
          : `Region ${w.region ? "B" : "A"} · ${fmt(s.dynamics.flux)} Flux`,
        has("recall") && w.region === 0
          ? "Known root recalling · new branches remain manual"
          : `${w.flow.length} nodes · ${w.coherence} Coherence · open flow`,
      ],
      converter: [
        `${fmt(s.dynamics.flux)} Flux · ${has("regulator") ? (w.automation.regulator.enabled ? "RULE ACTIVE" : "RULE PAUSED") : "MANUAL"}`,
        "Redirect flow → Energy",
      ],
      anchor: [
        `Regime ${["I", "II", "III", "IV"][compositionState(s).regime - 1]} · ${w.residue} Residue`,
        available.length
          ? `${available.length} unbuilt · ${available[0].name}`
          : "All current modules established",
      ],
    };
    for (const [id, [status, notice]] of Object.entries(values)) {
      const el = this.elements[id];
      const text = (q, v) => {
        const node = el.querySelector(q);
        if (node.textContent !== v) node.textContent = v;
      };
      text(".facility-status", status);
      text(".facility-next", notice);
      el.classList.toggle(
        "has-new",
        id === "structure"
          ? next.length > 0
          : id === "anchor"
            ? available.length > 0
            : false,
      );
      const action = el.querySelector(".facility-action");
      if (id === "matter") {
        let button = action.querySelector("button");
        if (!button) {
          button = document.createElement("button");
          button.dataset.action = "matter";
          action.append(button);
        }
        button.dataset.id = String(u);
        button.disabled = s.energy.lt(price(s, u));
        const label = `Feed frontier · ${fmt(price(s, u))} E`;
        if (button.textContent !== label) button.textContent = label;
      }
    }
    const a = this.elements.array.querySelector(".center-beacon");
    a.querySelector("small").textContent = w.p2.cl
      ? `CL ${w.p2.cl} · ${w.p2.alignment} ALIGNMENT`
      : "CONSTRUCTION SIGNAL";
    a.querySelector("span").textContent = w.p2.cl
      ? `${w.p2.live < 1 ? "Repowering" : "Flow online"} · Potential ${w.p2.potential.toFixed(1)}%`
      : `${Object.values(w.seed).filter(Boolean).length} / 3 segments · approach to assemble`;
    const p = this.elements.planetary.querySelector(".center-beacon");
    p.querySelector("small").textContent = w.planetary;
    p.querySelector("span").textContent =
      w.planetary === "READY"
        ? "Ready to breach · approach the shell"
        : "Field · handling · coupling";
  }
}
