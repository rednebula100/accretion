// Pure simulation: no DOM, no rendering. Presentation consumes `sim.events`.
import { MATTER, UPGRADES, NODES, NODE_COST, MODULES, RESONANCES, GATES, LAST, SEED_MASS, need, regimeOf, cost } from "./data.js";

export const K = 0.52; // orbital-plane vertical squash on screen
const UP = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
const MOD = Object.fromEntries(MODULES.map((u) => [u.id, u]));

export function newSave() {
  return {
    v: 4,
    run: { mass: SEED_MASS, energy: 0, flux: 0, frontier: 0, prog: 0, up: {}, dyn: {}, time: 0 },
    residue: 0,
    totalResidue: 0,
    mods: {},
    best: 0,
    seen: [],
    knownUp: {},
    breached: {},
    resonances: {},
    anchors: 0,
    ended: false,
    flags: {},
    stats: { captures: 0, bestChain: 0, releases: 0, pulses: 0, time: 0, breaks: 0 },
    settings: { volume: 0.6, music: 0.5, reduced: false, quality: "AUTO", shake: 1 },
  };
}

export class Sim {
  constructor(save, rng = Math.random) {
    this.s = save;
    this.rng = rng;
    this.bodies = [];
    this.events = [];
    this.shocks = [];
    this.chain = 0;
    this.chainT = 0;
    this.pressure = 0;
    this.idleT = 0;
    this.afterglow = 0;
    this.pulseCd = 0;
    this.injectCd = 0;
    this.resonance = 0;
    this.resExtra = 0;
    this.spawnAcc = 0;
    this.boundary = null;
    this.t = 0;
    this.rMax = 1.1;
    this.rMin = 0.26;
    this.rh = 0.06;
    this.autoT = 0;
    this.frozen = 0; // cinematic freeze (no spawn / no damage)
    this.recompute();
  }
  lv(id) {
    return this.s.run.up[id] || 0;
  }
  dl(id) {
    return this.s.run.dyn[id] || 0;
  }
  ml(id) {
    return this.s.mods[id] || 0;
  }
  recompute() {
    const lv = (id) => this.lv(id),
      ml = (id) => this.ml(id);
    const coupling = 1.6 ** ml("coupling");
    this.st = {
      force: 8 * 1.25 ** lv("grip") * 1.5 ** ml("memory"),
      lensR: 0.085 * (1 + 0.14 * lv("aperture")),
      pulseMult: 2.5 * 1.3 ** lv("coil"),
      pulseR: 0.21,
      pulseCd: 1.4 * 0.88 ** lv("capacitor"),
      energy: 1.15 ** lv("grid") * coupling,
      mass: coupling * (1 + 0.2 * lv("periapsis")),
      spawn: 2.3 * (1 + 0.18 * lv("rail")) * (1 + 0.3 * ml("spool")),
      maxBodies: 20 + 4 * lv("rail") + 5 * ml("spool"),
      fall: 1 + 0.35 * lv("periapsis"),
      breakChance: lv("tidalBreak") ? 0.05 + 0.05 * lv("tidalBreak") : 0,
      tierMult: [1, 1.5, 2.5 + 0.5 * lv("redline")],
      decay: 1 - 0.15 * lv("redline"),
      releaseMult: 4 + 2 * lv("vent"),
      afterglow: 5 + 2 * lv("vent"),
      relays: ml("relay"),
      dual: lv("dual") > 0,
      canInject: NODES.some((n) => this.dl(n.id) > 0),
    };
  }
  get tier() {
    return this.pressure >= 70 ? 2 : this.pressure >= 35 ? 1 : 0;
  }
  get cap() {
    const s = this.s;
    if (!s.anchors) return 59;
    if (!s.breached.planetary) return 79;
    if (!s.breached.stellar) return 139;
    return LAST;
  }
  get regime() {
    return regimeOf(this.s.totalResidue);
  }
  force() {
    return this.st.force * (this.resonance > 0 ? 1 + this.dl("response") : 1);
  }
  // ---------- purchases ----------
  visible(u) {
    return !u.req || Object.entries(u.req).every(([id, l]) => this.lv(id) >= l);
  }
  price(u) {
    return cost(u, this.lv(u.id));
  }
  buy(id, silent = false) {
    const u = UP[id],
      r = this.s.run;
    if (!u || this.lv(id) >= u.max || !this.visible(u)) return false;
    const c = this.price(u);
    if (r.energy < c) return false;
    r.energy -= c;
    r.up[id] = this.lv(id) + 1;
    this.s.knownUp[id] = Math.max(this.s.knownUp[id] || 0, r.up[id]);
    this.recompute();
    this.events.push({ t: "buy", id, auto: silent, level: r.up[id] });
    return true;
  }
  nodePrice(n) {
    return NODE_COST[this.dl(n.id)] * n.k;
  }
  buyNode(id) {
    const n = NODES.find((x) => x.id === id),
      r = this.s.run;
    if (!n || this.dl(id) >= 3 || !this.lv("fluxtap")) return false;
    const c = this.nodePrice(n);
    if (r.flux < c) return false;
    r.flux -= c;
    r.dyn[id] = this.dl(id) + 1;
    this.recompute();
    this.events.push({ t: "node", id, level: r.dyn[id] });
    return true;
  }
  modVisible(m) {
    return this.s.anchors > 0 && this.regime >= m.regime;
  }
  modPrice(m) {
    return Math.round(cost(m, this.ml(m.id)));
  }
  buyMod(id) {
    const m = MOD[id],
      s = this.s;
    if (!m || this.ml(id) >= m.max || !this.modVisible(m)) return false;
    const c = this.modPrice(m);
    if (s.residue < c) return false;
    s.residue -= c;
    s.mods[id] = this.ml(id) + 1;
    this.recompute();
    this.events.push({ t: "mod", id, level: s.mods[id] });
    return true;
  }
  // ---------- anchor ----------
  residueGain() {
    const f = this.s.run.frontier;
    return f < 40 ? 0 : Math.floor(3 * 1.07 ** (f - 40));
  }
  canAnchor() {
    return this.residueGain() > 0 && !this.boundary;
  }
  anchor() {
    if (!this.canAnchor()) return 0;
    const s = this.s,
      gain = this.residueGain(),
      old = s.run;
    s.residue += gain;
    s.totalResidue += gain;
    s.anchors++;
    s.best = Math.max(s.best, old.frontier);
    const start = Math.min(this.cap, Math.floor(s.best * 0.2 * this.ml("echo")));
    const keep = this.ml("recall") > 0;
    s.run = {
      mass: start ? MATTER[start].mass * 3 : SEED_MASS,
      prog: 0,
      energy: 0,
      flux: 0,
      frontier: start,
      up: keep && old.up.fluxtap ? { fluxtap: 1 } : {},
      dyn: keep ? old.dyn : {},
      time: 0,
    };
    this.bodies.length = 0;
    this.shocks.length = 0;
    this.chain = this.pressure = this.afterglow = this.resonance = 0;
    this.pulseCd = this.injectCd = 0;
    this.recompute();
    return gain;
  }
  // ---------- field ----------
  spawn(id, opts = {}) {
    const m = MATTER[id];
    const r = opts.r ?? this.rMin + (this.rMax - this.rMin) * Math.sqrt(this.rng());
    const b = {
      id,
      r,
      r0: r + 0.22,
      a: opts.a ?? this.rng() * Math.PI * 2,
      hp: m.hp * (opts.hp ?? 1),
      max: m.hp,
      state: 0,
      age: 0,
      heat: 0,
      flash: 0,
      sz: m.size,
      seed: this.rng(),
      rot: this.rng() * 6.28,
      ghost: !!opts.ghost,
      doom: -1,
      x: 0,
      y: 0,
    };
    this.place(b);
    this.bodies.push(b);
    return b;
  }
  pickId() {
    const f = this.s.run.frontier;
    if (!this.bodies.some((b) => b.state === 0 && b.id === f)) return f; // always one frontier target in the field
    let k = 0;
    while (this.rng() > 0.2 && k < 16) k++;
    return Math.max(0, f - k);
  }
  place(b) {
    const e = Math.min(1, b.age / 0.7),
      rr = b.state === 0 ? b.r0 + (b.r - b.r0) * (1 - (1 - e) ** 3) : b.r;
    b.x = Math.cos(b.a) * rr;
    b.y = Math.sin(b.a) * rr * K;
    b.rr = rr;
  }
  damage(b, d, cause) {
    if (b.state !== 0 || d <= 0) return;
    b.hp -= d;
    b.heat = Math.min(1, b.heat + 0.25);
    if (b.hp <= 0) this.capture(b, cause);
  }
  capture(b, cause, depth = 0) {
    if (b.state !== 0) return;
    const s = this.s,
      r = s.run,
      st = this.st,
      m = MATTER[b.id];
    const player = cause !== "decay" && cause !== "relay";
    const tier = this.tier;
    const broken = player && cause !== "release" && this.rng() < st.breakChance;
    if (player) {
      this.chain++;
      this.chainT = 2.5;
      s.stats.bestChain = Math.max(s.stats.bestChain, this.chain);
    }
    const chainMult = 1 + Math.min(this.chain, 50) * 0.02;
    let mult = st.energy * st.tierMult[tier] * chainMult * (b.ghost ? 0.5 : 1);
    if (broken) mult *= 4;
    if (cause === "release") mult *= st.releaseMult;
    if (!player) mult *= 0.6;
    const energy = m.energy * mult;
    r.energy += energy;
    s.stats.captures++;
    b.state = 1;
    b.fallT = 0;
    b.fallDur = (0.7 + b.rr * 0.45) / st.fall;
    b.fr = b.rr;
    b.massMult = st.mass * (broken ? 2 : 1) * (b.ghost ? 0.25 : 1);
    b.split = false;
    b.flash = 1;
    b.broken = broken;
    let flux = 0;
    if (this.lv("fluxtap") && tier > 0 && player) {
      flux = tier * 0.5 * 1.04 ** b.id;
      r.flux += flux;
      if (!s.flags.dynamics) {
        s.flags.dynamics = true;
        this.events.push({ t: "unfold", what: "dynamics" });
      }
    }
    this.events.push({ t: "capture", x: b.x, y: b.y, id: b.id, energy, broken, cause, chain: this.chain, flux, sz: b.sz, tier });
    if (broken) {
      s.stats.breaks++;
      this.shocks.push({ x: b.x, y: b.y, r: 0.16, d: this.force() * 2.5, t: 0.06, cause: "shard", depth: depth + 1 });
    }
    if (cause === "pulse" && this.lv("aftershock")) this.shocks.push({ x: b.x, y: b.y, r: 0.13, d: this.force() * st.pulseMult * 0.35 * this.lv("aftershock"), t: 0.09, cause: this.lv("aftershock") >= 3 && depth < 2 ? "pulse" : "shock", depth: depth + 1 });
    if (this.resonance > 0 && player) {
      if (this.dl("feedback") && this.resExtra < 8) {
        const add = 0.12 * this.dl("feedback");
        this.resonance += add;
        this.resExtra += add;
      }
      if (s.resonances.cascade && depth < 6) {
        let best = null,
          bd = 0.4;
        for (const o of this.bodies) {
          if (o.state !== 0 || o === b) continue;
          const d = Math.hypot(o.x - b.x, o.y - b.y);
          if (d < bd) (bd = d), (best = o);
        }
        if (best) {
          this.events.push({ t: "arc", x1: b.x, y1: b.y, x2: best.x, y2: best.y });
          best.hp -= this.force() * 1.2;
          best.heat = 1;
          if (best.hp <= 0) this.capture(best, "arc", depth + 1);
        }
      }
    }
    if (player && this.lv("loop") && !b.ghost && this.rng() < 0.06 * this.lv("loop")) this.spawn(b.id, { r: b.r, a: b.a + 0.5, hp: 0.5, ghost: true });
    if (player && cause !== "release") {
      let add = 2.3 * (b.id >= r.frontier - 3 ? 1.5 : 1);
      if (this.afterglow > 0) add *= 0.4;
      if (this.resonance > 0 && s.resonances.closed) add *= 1.5;
      this.pressure += add;
      this.idleT = 0;
      if (this.pressure >= 100) this.release();
    }
  }
  release() {
    const st = this.st;
    this.pressure = 0;
    this.afterglow = st.afterglow;
    this.s.stats.releases++;
    for (const b of this.bodies) if (b.state === 0) b.doom = 0.12 + b.rr * 0.45;
    if (this.boundary) for (const g of this.boundary.segs) if (g.hp > 0) this.hitSeg(g, g.max * 0.12);
    this.events.push({ t: "release" });
  }
  pulse(x, y) {
    if (this.pulseCd > 0 || this.frozen > 0) return false;
    const st = this.st;
    this.pulseCd = st.pulseCd;
    this.s.stats.pulses++;
    const R = st.pulseR * (this.resonance > 0 ? 1 + 0.25 * this.dl("compression") : 1);
    this.shocks.push({ x, y, r: R, d: this.force() * st.pulseMult, t: 0, cause: "pulse", depth: 0 });
    if (st.dual) this.shocks.push({ x: -x, y: -y, r: R, d: this.force() * st.pulseMult * 0.6, t: 0, cause: "pulse", depth: 0 });
    this.events.push({ t: "pulse", x, y, r: R, dual: st.dual });
    return true;
  }
  inject() {
    if (!this.st.canInject || this.injectCd > 0 || this.frozen > 0) return false;
    const s = this.s;
    this.injectCd = 25;
    this.resonance = 8;
    this.resExtra = 0;
    const found = [];
    for (const R of RESONANCES)
      if (!s.resonances[R.id] && R.need.every((n) => this.dl(n) > 0)) {
        s.resonances[R.id] = true;
        found.push(R.id);
      }
    const fl = this.dl("flow");
    for (let i = 0; i < 6 * fl; i++) this.spawn(this.pickId(), { hp: s.resonances.turbulent ? 0.5 : 1 });
    if (this.dl("compression")) {
      for (const b of this.bodies) if (b.state === 0) b.r = Math.max(this.rMin, b.r * 0.62);
      this.pulseCd = 0;
    }
    this.events.push({ t: "inject", found });
    return true;
  }
  segAt(x, y, pad) {
    const B = this.boundary;
    if (!B) return null;
    const rr = Math.hypot(x, y / K);
    if (Math.abs(rr - B.r) > pad) return null;
    let a = Math.atan2(y / K, x) - B.rot;
    a = ((a % 6.2832) + 6.2832) % 6.2832;
    const i = Math.floor(a / 2.0944),
      within = a - i * 2.0944;
    const g = B.segs[i];
    return g && g.hp > 0 && within < 1.85 ? g : null;
  }
  hitSeg(g, d) {
    if (g.hp <= 0) return;
    g.hp -= d;
    g.heat = 1;
    if (g.hp <= 0) {
      g.hp = 0;
      this.events.push({ t: "segment", i: this.boundary.segs.indexOf(g) });
      if (this.boundary.segs.every((x) => x.hp <= 0)) {
        const kind = this.boundary.kind;
        this.s.breached[kind] = true;
        this.boundary = null;
        this.events.push({ t: "breach", kind });
      }
    }
  }
  // ---------- frame ----------
  step(dt, input) {
    const s = this.s,
      r = s.run,
      st = this.st;
    this.t += dt;
    r.time += dt;
    s.stats.time += dt;
    if (this.frozen > 0) {
      this.frozen -= dt;
      for (const b of this.bodies) this.place(b);
      return;
    }
    this.pulseCd = Math.max(0, this.pulseCd - dt);
    this.injectCd = Math.max(0, this.injectCd - dt);
    if (this.resonance > 0) {
      this.resonance -= dt;
      if (this.resonance <= 0) this.events.push({ t: "resonanceEnd" });
    }
    this.afterglow = Math.max(0, this.afterglow - dt);
    if (this.chain > 0 && (this.chainT -= dt) <= 0) {
      this.events.push({ t: "chainEnd", chain: this.chain });
      this.chain = 0;
    }
    this.idleT += dt;
    if (this.idleT > 1.2) this.pressure = Math.max(0, this.pressure - dt * (this.tier === 2 ? 8 : 4) * st.decay);
    // spawn
    const rate = st.spawn * (this.afterglow > 0 ? 3 : 1) * (this.resonance > 0 ? 1 + 0.5 * this.dl("flow") : 1);
    this.spawnAcc += dt * rate;
    let alive = 0;
    for (const b of this.bodies) if (b.state === 0) alive++;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (alive < st.maxBodies) {
        this.spawn(this.pickId(), { hp: this.resonance > 0 && s.resonances.turbulent ? 0.5 : 1 });
        alive++;
      }
    }
    // input
    const force = this.force();
    if (input.pulse && input.active) this.pulse(input.x, input.y);
    if (input.inject) this.inject();
    const lenses = [];
    if (input.active) {
      lenses.push([input.x, input.y, st.lensR, force]);
      if (st.dual) lenses.push([-input.x, -input.y, st.lensR, force * 0.6]);
    }
    for (let i = 0; i < st.relays; i++) {
      const a = this.t * 0.35 + (i * 6.2832) / st.relays,
        rr = this.rMin + (this.rMax - this.rMin) * (0.35 + 0.18 * (i % 2));
      lenses.push([Math.cos(a) * rr, Math.sin(a) * rr * K, 0.075, force * 0.35, 1]);
    }
    this.lenses = lenses;
    const shear = this.resonance > 0 ? 0.25 * this.dl("shear") * force : 0;
    const bulkBelow = this.ml("bulk") ? r.frontier - 15 : -1;
    // shocks
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      const k = this.shocks[i];
      if ((k.t -= dt) > 0) continue;
      this.shocks.splice(i, 1);
      if (k.cause !== "pulse" || k.depth > 0) this.events.push({ t: "shock", x: k.x, y: k.y, r: k.r, cause: k.cause });
      for (const b of this.bodies) {
        if (b.state !== 0) continue;
        if (Math.hypot(b.x - k.x, b.y - k.y) < k.r + b.sz) {
          b.hp -= k.d;
          b.heat = 1;
          b.flash = Math.max(b.flash, 0.6);
          if (b.hp <= 0) this.capture(b, k.cause === "shard" ? "shock" : k.cause, k.depth);
        }
      }
      if (this.boundary) {
        const g = this.segAt(k.x, k.y, k.r);
        if (g) this.hitSeg(g, k.d);
      }
    }
    if (this.boundary) {
      const B = this.boundary;
      B.rot += dt * 0.12;
      B.t += dt;
      for (const g of B.segs) g.heat = Math.max(0, g.heat - dt * 3);
      for (const L of lenses) {
        const g = this.segAt(L[0], L[1], L[2]);
        if (g) this.hitSeg(g, L[3] * dt);
        if (!this.boundary) break;
      }
    }
    // bodies
    const rh = this.rh;
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i];
      b.age += dt;
      b.flash = Math.max(0, b.flash - dt * 5);
      if (b.state === 0) {
        b.a += dt * 0.2 * (0.5 / b.rr) ** 1.5;
        b.r = Math.max(this.rMin * 0.9, b.r - dt * 0.004);
        b.heat = Math.max(0, b.heat - dt * 1.6);
        this.place(b);
        let d = b.max * 0.012 * dt + shear * dt,
          cause = "decay";
        if (shear) cause = "shear";
        for (const L of lenses) {
          if (Math.hypot(b.x - L[0], b.y - L[1]) < L[2] + b.sz * 0.6) {
            if (b.id <= bulkBelow) d += b.max;
            d += L[3] * dt;
            b.heat = Math.min(1, b.heat + dt * 6);
            cause = L[4] ? (cause === "decay" ? "relay" : cause) : "lens";
          }
        }
        if (b.doom >= 0 && (b.doom -= dt) < 0) this.capture(b, "release");
        else {
          b.hp -= d;
          if (b.hp <= 0) this.capture(b, cause);
        }
      } else {
        b.fallT += dt;
        const p = Math.min(1, b.fallT / b.fallDur);
        b.rr = b.fr + (rh * 0.7 - b.fr) * p ** 2.2;
        b.a += dt * (0.6 + 9 * p * p);
        b.x = Math.cos(b.a) * b.rr;
        b.y = Math.sin(b.a) * b.rr * K;
        b.p = p;
        const m = MATTER[b.id];
        if (!b.split && p > 0.5 && (m.frags || b.broken)) {
          b.split = true;
          const n = Math.max(2, m.frags) + this.lv("recycler") + (b.broken ? 2 : 0);
          this.events.push({ t: "split", x: b.x, y: b.y, id: b.id, n, a: b.a, r: b.rr, energy: m.energy * st.energy * 0.1 * this.lv("recycler") });
          r.energy += m.energy * st.energy * 0.1 * this.lv("recycler") * n;
        }
        if (p >= 1) {
          const gain = m.mass * b.massMult;
          r.mass += gain;
          if (b.id === r.frontier && !b.ghost) r.prog++;
          const first = !s.seen[b.id];
          if (first) s.seen[b.id] = 1;
          this.events.push({ t: "absorb", id: b.id, mass: gain, first, band: first && !s.seen.some((v, j) => v && j !== b.id && Math.floor(j / 10) === m.band) });
          this.bodies.splice(i, 1);
        }
      }
    }
    // frontier / gates
    const cap = this.cap;
    while (r.frontier < cap && r.prog >= need(r.frontier)) {
      r.frontier++;
      r.prog = 0;
      s.best = Math.max(s.best, r.frontier);
      this.events.push({ t: "frontier", id: r.frontier });
    }
    if (r.frontier === cap && r.prog >= need(cap)) {
      const gate = GATES.find((g) => g.at === cap);
      if (cap === LAST) {
        if (!s.ended && s.seen[LAST]) {
          s.ended = true;
          this.events.push({ t: "ending" });
        }
      } else if (gate.kind === "binding") {
        if (!s.flags.limit) {
          s.flags.limit = true;
          this.events.push({ t: "limit" });
        }
      } else if (!this.boundary) {
        const hp = MATTER[cap].hp * 60;
        this.boundary = { kind: gate.kind, name: gate.name, r: this.rMin + 0.1, rot: 0, t: 0, segs: [0, 1, 2].map(() => ({ hp, max: hp, heat: 0 })) };
        this.events.push({ t: "boundary", kind: gate.kind, name: gate.name });
      }
    }
    // Structural Imprint: rebuy what the player has built by hand before
    if (this.ml("imprint") && (this.autoT -= dt) <= 0) {
      this.autoT = 0.4;
      let best = null;
      for (const u of UPGRADES) {
        const l = this.lv(u.id);
        if (l >= u.max || l >= (s.knownUp[u.id] || 0) || !this.visible(u)) continue;
        const c = this.price(u);
        if (c <= r.energy && (!best || c < best.c)) best = { u, c };
      }
      if (best) this.buy(best.u.id, true);
    }
  }
}
