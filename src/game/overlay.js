// Canvas2D layer for crisp world-attached instruments: binding/pressure ring, boundary shell, lens, integrity arcs, numbers.
import { K } from "./sim.js";

export const C = { amber: "#ffb347", hot: "#ff7a2a", red: "#ff4a5e", cyan: "#5fe6d8", violet: "#b594ff", white: "#f3efe6", dim: "rgba(243,239,230,.16)" };
const TIER_COL = [C.amber, C.hot, C.red];
const TAU = Math.PI * 2;

export class Overlay {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.floaters = [];
    this.rings = [];
    this.arcs = [];
    this.t = 0;
    this.v = { ox: 0, oy: 0, zoom: 1 };
    this.resize();
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.dpr = dpr;
    this.w = this.cv.clientWidth;
    this.h = this.cv.clientHeight;
    this.cv.width = Math.round(this.w * dpr);
    this.cv.height = Math.round(this.h * dpr);
  }
  setView(v) {
    this.v = v;
    this.U = (this.h / 2) * v.zoom;
  }
  px(x) {
    return this.w / 2 + (x * this.v.zoom + this.v.ox) * (this.h / 2);
  }
  py(y) {
    return this.h / 2 - (y * this.v.zoom + this.v.oy) * (this.h / 2);
  }
  /** screen px -> world */
  unproject(sx, sy) {
    return [((sx - this.w / 2) / (this.h / 2) - this.v.ox) / this.v.zoom, (-(sy - this.h / 2) / (this.h / 2) - this.v.oy) / this.v.zoom];
  }
  float(x, y, text, color = C.white, size = 15, life = 0.9) {
    if (this.floaters.length > 70) this.floaters.shift();
    this.floaters.push({ x, y, text, color, size, life, max: life, dx: (Math.random() - 0.5) * 0.03 });
  }
  ring(x, y, r0, r1, life, color, width = 2, flat = false) {
    this.rings.push({ x, y, r0, r1, life, max: life, color, width, flat });
  }
  arc(x1, y1, x2, y2) {
    this.arcs.push({ x1, y1, x2, y2, life: 0.22, seed: Math.random() * 99 });
  }
  orbitArc(r, a0, a1) {
    const c = this.ctx,
      n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.05));
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n,
        X = this.px(Math.cos(a) * r),
        Y = this.py(Math.sin(a) * r * K);
      i ? c.lineTo(X, Y) : c.moveTo(X, Y);
    }
  }
  draw(dt, sim, cur, o) {
    const c = this.ctx,
      U = this.U;
    this.t += dt;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    if (o.hidden) return;
    c.lineCap = "butt";
    const tier = sim.tier,
      tcol = TIER_COL[tier];
    // ---- binding ring = pressure gauge (3 broken segments, one per tier) ----
    const R = sim.rMin * 0.84,
      rot = this.t * 0.06 + (tier === 2 ? Math.sin(this.t * 38) * 0.004 : 0),
      seg = TAU / 3,
      span = seg * 0.86,
      bounds = [0, 35, 70, 100];
    c.globalAlpha = o.ringAlpha;
    for (let i = 0; i < 3; i++) {
      const a0 = rot + i * seg,
        fill = Math.max(0, Math.min(1, (sim.pressure - bounds[i]) / (bounds[i + 1] - bounds[i])));
      c.strokeStyle = "rgba(243,239,230,.2)";
      c.lineWidth = 1.5;
      c.beginPath();
      this.orbitArc(R, a0, a0 + span);
      c.stroke();
      c.strokeStyle = "rgba(243,239,230,.1)";
      c.lineWidth = 1;
      c.setLineDash([2, 5]);
      c.beginPath();
      this.orbitArc(R * 1.07, a0, a0 + span);
      c.stroke();
      c.setLineDash([]);
      // sensor pips + terminals follow the curvature
      for (let k = 0; k <= 8; k++) {
        const a = a0 + (span * k) / 8,
          end = k === 0 || k === 8,
          r1 = R * (end ? 0.955 : 0.985),
          r2 = R * (end ? 1.045 : 1.015);
        c.strokeStyle = fill * 8 >= k && fill > 0 ? TIER_COL[i] : "rgba(243,239,230,.34)";
        c.lineWidth = end ? 3 : 1.5;
        c.beginPath();
        c.moveTo(this.px(Math.cos(a) * r1), this.py(Math.sin(a) * r1 * K));
        c.lineTo(this.px(Math.cos(a) * r2), this.py(Math.sin(a) * r2 * K));
        c.stroke();
      }
      if (fill > 0) {
        c.strokeStyle = TIER_COL[i];
        c.lineWidth = 3.5;
        c.shadowColor = TIER_COL[i];
        c.shadowBlur = 12;
        c.beginPath();
        this.orbitArc(R, a0, a0 + span * fill);
        c.stroke();
        c.shadowBlur = 0;
      }
    }
    c.globalAlpha = 1;
    // ---- boundary shell ----
    const B = sim.boundary;
    if (B) {
      const appear = Math.min(1, B.t / 1.2);
      for (let i = 0; i < 3; i++) {
        const g = B.segs[i],
          a0 = B.rot + i * 2.0944;
        if (g.hp <= 0) continue;
        const f = g.hp / g.max;
        c.globalAlpha = appear;
        c.strokeStyle = g.heat > 0.3 ? C.white : C.violet;
        c.shadowColor = C.violet;
        c.shadowBlur = 18;
        c.lineWidth = 7 + Math.sin(this.t * 3 + i) * 1;
        c.beginPath();
        this.orbitArc(B.r, a0, a0 + 1.85);
        c.stroke();
        c.shadowBlur = 0;
        c.strokeStyle = "rgba(10,8,20,.85)";
        c.lineWidth = 3;
        c.beginPath();
        this.orbitArc(B.r, a0 + 1.85 * f, a0 + 1.85);
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    // ---- bodies: frontier reticle + integrity ----
    const F = sim.s.run.frontier;
    for (const b of sim.bodies) {
      if (b.state !== 0) continue;
      const X = this.px(b.x),
        Y = this.py(b.y),
        r = Math.max(7, b.sz * U * 0.72);
      if (b.id === F && !b.ghost) {
        const q = r + 5 + Math.sin(this.t * 4 + b.seed * 9) * 1.5,
          l = 5;
        c.strokeStyle = C.amber;
        c.lineWidth = 1.5;
        c.globalAlpha = Math.min(1, b.age * 2);
        c.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          c.moveTo(X + sx * q, Y + sy * (q - l));
          c.lineTo(X + sx * q, Y + sy * q);
          c.lineTo(X + sx * (q - l), Y + sy * q);
        }
        c.stroke();
        c.globalAlpha = 1;
      }
      if (b.heat > 0.02 || b.hp < b.max * 0.5) {
        const f = Math.max(0, b.hp / b.max);
        c.strokeStyle = "rgba(0,0,0,.55)";
        c.lineWidth = 4;
        c.beginPath();
        c.arc(X, Y, r + 1, 0, TAU);
        c.stroke();
        c.strokeStyle = f > 0.5 ? C.amber : f > 0.25 ? C.hot : C.red;
        c.lineWidth = 2.2;
        c.beginPath();
        c.arc(X, Y, r + 1, -Math.PI / 2, -Math.PI / 2 + TAU * f);
        c.stroke();
      }
    }
    // ---- relays ----
    for (const L of sim.lenses || []) {
      if (!L[4]) continue;
      const X = this.px(L[0]),
        Y = this.py(L[1]);
      c.strokeStyle = "rgba(181,148,255,.5)";
      c.lineWidth = 1;
      c.setLineDash([3, 4]);
      c.beginPath();
      c.arc(X, Y, L[2] * U, this.t, this.t + TAU);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = C.violet;
      c.save();
      c.translate(X, Y);
      c.rotate(this.t * 1.5);
      c.fillRect(-3.5, -3.5, 7, 7);
      c.restore();
    }
    // ---- shock rings ----
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      if ((r.life -= dt) <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      const k = 1 - r.life / r.max,
        e = 1 - (1 - k) ** 3,
        rad = (r.r0 + (r.r1 - r.r0) * e) * U;
      c.globalAlpha = (1 - k) ** 1.5;
      c.strokeStyle = r.color;
      c.lineWidth = r.width * (1 - k * 0.6);
      c.beginPath();
      if (r.flat) c.ellipse(this.px(r.x), this.py(r.y), rad, rad * K, 0, 0, TAU);
      else c.arc(this.px(r.x), this.py(r.y), rad, 0, TAU);
      c.stroke();
    }
    c.globalAlpha = 1;
    // ---- tidal arcs ----
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i];
      if ((a.life -= dt) <= 0) {
        this.arcs.splice(i, 1);
        continue;
      }
      const x1 = this.px(a.x1), y1 = this.py(a.y1), x2 = this.px(a.x2), y2 = this.py(a.y2);
      c.globalAlpha = a.life / 0.22;
      c.strokeStyle = C.cyan;
      c.shadowColor = C.cyan;
      c.shadowBlur = 10;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x1, y1);
      for (let k = 1; k < 6; k++) {
        const t = k / 6,
          j = Math.sin(a.seed + k * 12.9 + this.t * 60) * 9;
        c.lineTo(x1 + (x2 - x1) * t - ((y2 - y1) / 60) * j, y1 + (y2 - y1) * t + ((x2 - x1) / 60) * j);
      }
      c.lineTo(x2, y2);
      c.stroke();
      c.shadowBlur = 0;
    }
    c.globalAlpha = 1;
    // ---- lens ----
    if (cur.active) {
      const draw = (x, y, a, main) => {
        const X = this.px(x), Y = this.py(y), r = sim.st.lensR * U;
        c.globalAlpha = a;
        c.strokeStyle = sim.resonance > 0 ? C.cyan : tcol;
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(X, Y, r, 0, TAU);
        c.stroke();
        c.lineWidth = 2.5;
        for (let k = 0; k < 4; k++) {
          const an = this.t * 0.9 + (k * TAU) / 4;
          c.beginPath();
          c.arc(X, Y, r + 4, an, an + 0.34);
          c.stroke();
        }
        if (main) {
          const ready = 1 - sim.pulseCd / sim.st.pulseCd;
          c.strokeStyle = ready >= 1 ? C.white : "rgba(243,239,230,.45)";
          c.lineWidth = ready >= 1 ? 2 : 3;
          c.beginPath();
          c.arc(X, Y, r * 0.42, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, ready));
          c.stroke();
          c.fillStyle = C.white;
          c.fillRect(X - 1, Y - 1, 2, 2);
          if (sim.chain > 1) {
            c.font = `700 ${Math.min(26, 13 + sim.chain * 0.25)}px "Chakra Petch"`;
            c.textAlign = "center";
            c.fillStyle = tcol;
            c.globalAlpha = Math.min(1, sim.chainT / 0.6);
            c.fillText(`×${sim.chain}`, X, Y + r + 24);
          }
        }
      };
      draw(cur.x, cur.y, 0.95, true);
      if (sim.st.dual) draw(-cur.x, -cur.y, 0.55, false);
      c.globalAlpha = 1;
    }
    // ---- numbers ----
    c.textAlign = "center";
    c.lineJoin = "round";
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      if ((f.life -= dt) <= 0) {
        this.floaters.splice(i, 1);
        continue;
      }
      const k = 1 - f.life / f.max,
        pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.55 : 1.15 - Math.min(0.15, (k - 0.12) * 0.6);
      f.y += dt * 0.09 * (1 - k);
      f.x += f.dx * dt;
      c.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
      c.font = `700 ${Math.round(f.size * pop)}px "Chakra Petch"`;
      c.lineWidth = 4;
      c.strokeStyle = "rgba(4,5,8,.8)";
      const X = this.px(f.x), Y = this.py(f.y);
      c.strokeText(f.text, X, Y);
      c.fillStyle = f.color;
      c.fillText(f.text, X, Y);
    }
    c.globalAlpha = 1;
  }
}
