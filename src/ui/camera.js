import { LOCATIONS } from "../data/pass1.js";
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export class CameraDirector {
  constructor() {
    Object.assign(this, {
      x: 0,
      y: 0,
      zoom: 1,
      depth: 0,
      bounds: { left: -1000, right: 650, top: -700, bottom: 350 },
      velocity: { x: 0, y: 0 },
      mode: "manual",
      targetLocation: "universe",
      inputLock: 0,
      travel: null,
      time: 0,
      visited: new Set(),
      reducedMotion: false,
      manualEpoch: 0,
      contextAttached: true,
    });
  }
  expand(id) {
    if (this.resolveLocation) return; // Spatial composition owns derived bounds.
    if (id === "dynamics" || id === "converter") this.bounds.bottom = 1050;
    if (id === "anchor") this.bounds.right = 1300;
  }
  go(id, depth = id === "universe" ? 0 : 1) {
    if (this.resolveLocation) {
      this.targetLocation = id;
      this.depth = depth;
      this.contextAttached = true;
      this.prepareLayout();
      const p = this.resolveLocation(id);
      if (!p) {
        this.targetLocation = "universe";
        this.depth = 0;
        this.prepareLayout();
        return;
      }
      const first = !this.visited.has(id);
      this.visited.add(id);
      this.reframe(
        p,
        this.reducedMotion
          ? 0.2
          : this.fast && !first
            ? 0.35
            : first
              ? 0.9
              : 0.5,
      );
      this.inputLock = 0.12;
      return;
    }
    const p = LOCATIONS[id];
    if (!p) return;
    const first = !this.visited.has(id);
    this.visited.add(id);
    this.targetLocation = id;
    this.depth = depth;
    this.mode = "travel";
    this.velocity = { x: 0, y: 0 };
    this.travel = {
      from: { x: this.x, y: this.y, zoom: this.zoom },
      to: p,
      age: 0,
      duration: this.reducedMotion
        ? 0.2
        : this.fast && !first
          ? 0.25
          : first
            ? 0.9
            : 0.5,
    };
    this.inputLock = 0.12;
  }
  interrupt() {
    if (this.inputLock > 0) return false;
    this.travel = null;
    this.mode = "manual";
    this.manualEpoch++;
    this.contextAttached = false;
    return true;
  }
  pan(dx, dy) {
    if (!this.interrupt()) return;
    this.x = clamp(
      this.x - dx / this.zoom,
      this.bounds.left,
      this.bounds.right,
    );
    this.y = clamp(
      this.y - dy / this.zoom,
      this.bounds.top,
      this.bounds.bottom,
    );
  }
  wheel(delta) {
    if (this.interrupt()) {
      this.zoom = clamp(this.zoom * Math.exp(-delta * 0.001), 0.45, 1.5);
      if (this.targetLocation !== "universe")
        this.depth = this.zoom > 1.15 ? 2 : 1;
    }
  }
  back() {
    if (this.depth === 2) this.go(this.targetLocation, 1);
    else this.go("universe", 0);
  }
  reframe(p, duration = 0.55) {
    this.mode = "travel";
    this.velocity = { x: 0, y: 0 };
    this.travel = {
      from: { x: this.x, y: this.y, zoom: this.zoom },
      to: p,
      age: 0,
      duration,
    };
  }
  update(dt) {
    this.time += dt;
    this.inputLock = Math.max(0, this.inputLock - dt);
    if (!this.travel) return;
    const t = this.travel;
    t.age += dt;
    const p = Math.min(1, t.age / t.duration),
      k = p * p * (3 - 2 * p);
    for (const key of ["x", "y", "zoom"])
      this[key] = t.from[key] + (t.to[key] - t.from[key]) * k;
    if (p === 1) {
      this.travel = null;
      this.mode = "manual";
    }
  }
  transform(width, height, impulse = 0) {
    return `translate(${width / 2}px,${height / 2}px) scale(${this.zoom * (1 + impulse)}) translate(${-this.x}px,${-this.y}px)`;
  }
}
