import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "./style.css";
import gsap from "gsap";
import { Sim, newSave, K } from "./game/sim.js";
import { Gfx, SHADOW_K } from "./game/gfx.js";
import { Overlay, C } from "./game/overlay.js";
import { Audio } from "./game/audio.js";
import { UI } from "./game/ui.js";
import { MATTER, UPGRADES, NODES, fmt, fmtMass } from "./game/data.js";

gsap.ticker.lagSmoothing(0); // animations stay time-true even when a frame is slow
const KEY = "accretion.save.v4";
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const WARM = [1.6, 0.85, 0.35],
  WHITE = [1.5, 1.4, 1.2],
  CYAN = [0.4, 1.5, 1.4],
  VIOLET = [1.0, 0.7, 1.7];

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw?.v === 4) {
      const d = newSave();
      return { ...d, ...raw, run: { ...d.run, ...raw.run }, stats: { ...d.stats, ...raw.stats }, settings: { ...d.settings, ...raw.settings }, flags: raw.flags || {}, seen: raw.seen || [] };
    }
  } catch {}
  return null;
}

const GOALS = [
  ["커서를 천체 위에 올려 <b>조석 렌즈</b>로 궤도에서 끌어내려라.", (s) => s.s.stats.captures >= 6, (s) => `${Math.min(6, s.s.stats.captures)} / 6`],
  ["<kbd>CLICK</kbd> <b>FIELD PULSE</b> — 천체가 몰린 곳에 충격파를 쏴라.", (s) => s.s.stats.pulses >= 3, (s) => `${Math.min(3, s.s.stats.pulses)} / 3`],
  ["<kbd>1</kbd> 또는 오른쪽 탭으로 <b>STRUCTURE</b>를 열고 Energy로 <b>Tidal Grip</b>을 설치하라.", (s) => s.lv("grip") >= 1 || s.s.anchors > 0],
  ["<b>금색 조준선</b>이 붙은 천체가 Frontier다. 흡수하면 더 큰 Matter가 열린다.", (s) => s.s.best >= 4, (s) => `FRONTIER ${s.s.run.frontier + 1}`],
  ["쉬지 않고 포획해 <b>압력 100%</b> — FIELD RELEASE를 터뜨려라.", (s) => s.s.stats.releases >= 1, (s) => `${Math.floor(s.pressure)}%`],
  ["각 arm의 다음 노드는 선행 노드를 올리면 드러난다. <b>Frontier 20</b>까지.", (s) => s.s.best >= 20, (s) => `${s.s.run.frontier + 1} / 21`],
  ["PROCESSING arm 끝의 <b>Flux Tap</b>을 설치하라. 압력 속에서 무언가 새어 나온다.", (s) => s.lv("fluxtap") >= 1 || s.s.anchors > 0],
  ["Flux로 <b>DYNAMICS</b> 노드를 열고 <kbd>SPACE</kbd> <b>INJECT</b>.", (s) => s.s.flags.injected || s.s.anchors > 0],
  ["<b>Binding Limit</b> — Frontier 60까지 밀어붙여라.", (s) => s.s.best >= 59, (s) => `${s.s.run.frontier + 1} / 60`],
  ["장이 한계에 닿았다. <b>ANCHOR</b>로 이 우주를 접어라.", (s) => s.s.anchors >= 1],
  ["<b>FIELD ANCHOR</b> 모듈을 설치하라. 자동화는 여기서만 나온다.", (s) => Object.keys(s.s.mods).length > 0],
  ["<b>Planetary Boundary</b> — Frontier 80의 껍질 세 분절을 부숴라.", (s) => s.s.breached.planetary, (s) => `${s.s.run.frontier + 1} / 80`],
  ["<b>Stellar Boundary</b> — Frontier 140. 별을 삼킬 차례다.", (s) => s.s.breached.stellar, (s) => `${s.s.run.frontier + 1} / 140`],
  ["남은 이름을 전부 삼켜라.", (s) => s.s.ended, (s) => `${s.s.run.frontier + 1} / 200`],
  ["자유 플레이. 더 깊이 Anchor하라.", () => false, () => "∞"],
];

class Game {
  constructor() {
    document.body.insertAdjacentHTML("afterbegin", `<div id="stage"><canvas id="gl"></canvas><canvas id="ov"></canvas></div>`);
    this.gl = document.getElementById("gl");
    this.gfx = new Gfx(this.gl);
    this.ov = new Overlay(document.getElementById("ov"));
    this.audio = new Audio();
    this.saved = load();
    this.sim = new Sim(this.saved || newSave());
    this.ui = new UI(this);
    this.state = "title";
    this.paused = false;
    this.cur = { x: 0.5, y: 0.2, active: false, pulse: false, inject: false };
    this.view = { ox: 0, oxT: 0, zoom: 1.55, recoil: 1 };
    this.trauma = 0;
    this.stop = 0;
    this.ts = 1;
    this.act = 0;
    this.gulp = 0;
    this.jets = 0;
    this.bhR = 0.105;
    this.wave = { x: 0, y: 0, r: 0, s: 0, v: 0 };
    this.cine = null;
    this.c = { dark: 1, collapse: 0, scale: 1, ring: 1 };
    this.heartT = 0;
    this.applySettings();
    this.bind();
    this.ui.showTitle(!!this.saved);
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
    setInterval(() => this.save(), 5000);
    addEventListener("visibilitychange", () => document.hidden && this.save());
    addEventListener("resize", () => this.ov.resize());
  }
  applySettings() {
    const s = this.sim.s.settings;
    this.audio.setVolumes(s.volume, s.music);
    this.gfx.setQuality(s.quality);
  }
  save() {
    if (this.state !== "play" || this.wiped) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.sim.s));
    } catch {}
  }
  exportSave() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(this.sim.s))));
  }
  importSave(str) {
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
      if (o.v !== 4) return false;
      this.wiped = true;
      localStorage.setItem(KEY, JSON.stringify(o));
      return true;
    } catch {
      return false;
    }
  }
  wipe() {
    this.wiped = true;
    localStorage.removeItem(KEY);
  }
  start(fresh) {
    if (this.state !== "title") return;
    this.audio.start();
    this.applySettings();
    if (fresh) {
      const keep = this.sim.s.settings;
      this.sim = new Sim(newSave());
      this.sim.s.settings = keep;
    }
    this.state = "play";
    this.audio.play("key");
    this.ui.hideTitle();
    gsap.to(this.view, { zoom: 1, duration: 1.8, ease: "power3.inOut" });
    this.sim.pressure = 0;
    for (let i = 0; i < 9; i++) this.sim.spawn(this.sim.pickId());
  }
  bind() {
    const map = (e) => {
      const [x, y] = this.ov.unproject(e.clientX, e.clientY);
      this.cur.x = x;
      this.cur.y = y;
      this.cur.active = e.target === this.gl && this.state === "play";
    };
    addEventListener("pointermove", map);
    this.gl.addEventListener("pointerdown", (e) => {
      map(e);
      if (this.state !== "play") return;
      this.audio.start();
      if (e.button === 2) this.cur.inject = true;
      else this.cur.pulse = true;
    });
    this.gl.addEventListener("pointerleave", () => (this.cur.active = false));
    addEventListener("contextmenu", (e) => e.preventDefault());
    addEventListener("keydown", (e) => {
      if (this.state !== "play" || e.repeat) return;
      if (e.code === "Space") (this.cur.inject = true), e.preventDefault();
      else if (e.key >= "1" && e.key <= "4") this.ui.toggle(+e.key - 1);
      else if (e.key === "e" || e.key === "E" || e.key === "Tab") (this.ui.toggle(this.ui.tab >= 0 ? this.ui.tab : this.ui.lastTab), e.preventDefault());
      else if (e.key === "Escape") document.getElementById("modal").classList.contains("on") ? this.ui.closeModal() : this.ui.tab >= 0 ? this.ui.toggle(this.ui.tab) : this.ui.settings();
    });
  }
  onDrawer(open) {
    const w = open ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--drawer")) : 0;
    this.view.oxT = -w / innerHeight;
    const cx = `calc(50% - ${w / 2}px)`;
    document.getElementById("hotbar").style.left = cx;
    document.getElementById("banner").style.left = cx;
  }
  buy(kind, id, el) {
    const sim = this.sim;
    if (kind === "cat") return;
    const ok = kind === "up" ? sim.buy(id) : kind === "node" ? sim.buyNode(id) : sim.buyMod(id);
    this.ui.flash(el, ok);
    if (!ok) this.audio.play("deny");
    this.ui.detail();
    this.ui.refresh();
  }
  shake(a) {
    this.trauma = Math.min(1.2, this.trauma + a);
  }
  kick(x, y, s, v = 2.2) {
    Object.assign(this.wave, { x, y, r: 0.02, s, v });
  }
  // ---------- ANCHOR cinematic: LOCK → COMPRESSION → COLLAPSE → WAVE → REBIRTH ----------
  anchor() {
    const sim = this.sim;
    if (this.cine || !sim.canAnchor()) return;
    const first = !sim.s.anchors,
      k = first ? 1 : 0.55,
      c = this.c;
    if (this.ui.tab >= 0) this.ui.toggle(this.ui.tab);
    sim.frozen = 99;
    this.cine = "lock";
    this.audio.play("collapse", { rate: first ? 1 : 1.5 });
    const tl = gsap.timeline();
    tl.to(sim, { pressure: 100, duration: 0.6 * k, ease: "power2.in" })
      .call(() => ((this.cine = "compress"), this.shake(0.3)))
      .to(this.view, { recoil: 1.08, duration: 1.2 * k, ease: "power2.in" }, ">")
      .to(this, { act: 5, duration: 1.2 * k }, "<")
      .call(() => (this.cine = "collapse"))
      .to(c, { collapse: 1, scale: 0.06, dark: 0.04, ring: 0, duration: 0.7 * k, ease: "power3.in" })
      .call(() => {
        const gain = sim.anchor();
        sim.frozen = 99;
        this.gfx.P.n = 0;
        this.cine = "wave";
        this.audio.play("wave");
        this.gfx.fx.flash = sim.s.settings.reduced ? 0.25 : 1.1;
        this.shake(1.2);
        this.kick(0, 0, 2.2, 1.6);
        this.act = 0;
        this.ov.float(0, 0.16, `+${gain} RESIDUE`, C.violet, 34, 2.2);
        for (let i = 0; i < 140; i++) {
          const a = Math.random() * 6.283,
            v = 0.5 + Math.random() * 1.4;
          this.gfx.emit(0, 0, Math.cos(a) * v, Math.sin(a) * v * K, 1 + Math.random(), 3 + Math.random() * 3, ...VIOLET, 0, 1.2);
        }
        this.ui.banner("ANCHOR", `Residue +${gain}`, "var(--violet)", first ? "FIRST COLLAPSE" : `COLLAPSE ${sim.s.anchors}`, 1.4);
      }, null, "+=" + 0.25 * k)
      .to(this.view, { recoil: 0.9, duration: 0.12 })
      .to(this.view, { recoil: 1, duration: 1.4, ease: "elastic.out(1,0.5)" })
      .to(c, { collapse: 0, dark: 1, scale: 1, ring: 1, duration: 1.5 * k + 0.4, ease: "power2.out" }, "<")
      .call(() => {
        this.cine = null;
        sim.frozen = 0;
        for (let i = 0; i < 8; i++) sim.spawn(sim.pickId());
        this.save();
        if (first) {
          this.ui.banner("FIELD ANCHOR DETECTED", "이전 우주의 잔류장이 새 장소를 드러냈다", "var(--violet)", "NEW LOCATION", 2);
          this.audio.play("discover", { rate: 0.75 });
        }
        this.ui.reveal(2);
        this.ui.open(2);
      });
  }
  // ---------- events → feel ----------
  handle(ev) {
    const g = this.gfx,
      ov = this.ov,
      au = this.audio,
      sim = this.sim,
      red = sim.s.settings.reduced;
    let pulseKills = 0,
      shown = 0;
    for (const e of ev) {
      const pan = e.x != null ? clamp(e.x / 1.2, -1, 1) * 0.7 : 0;
      switch (e.t) {
        case "capture": {
          const big = e.id >= sim.s.run.frontier - 1;
          g.burst(e.x, e.y, big ? 16 : 7, 0.5, 0.5, big ? 4.5 : 3, e.broken ? WHITE : WARM, 0.5);
          g.burst(e.x, e.y, 3, 0.15, 0.9, 2.5, WHITE, 1.4);
          if (shown++ < 6 || big) ov.float(e.x, e.y + e.sz, "+" + fmt(e.energy), e.broken ? C.white : e.tier === 2 ? C.red : C.amber, e.broken ? 22 : big ? 18 : 13);
          if (e.flux && Math.random() < 0.3) ov.float(e.x, e.y - e.sz * 1.5, "+" + fmt(e.flux) + " FLUX", C.cyan, 12);
          au.capture(e.chain, pan, big);
          this.act = Math.min(4, this.act + (big ? 0.35 : 0.12));
          if (e.cause === "pulse" || e.cause === "shock") pulseKills++;
          if (e.broken) {
            ov.float(e.x, e.y + e.sz * 2.4, "TIDAL BREAK", C.white, 15, 1.1);
            ov.ring(e.x, e.y, 0.02, 0.16, 0.35, C.white, 3);
            au.play("breakk", { pan, gap: 0.05 });
            this.stop = Math.max(this.stop, 0.035);
            this.shake(0.22);
          }
          break;
        }
        case "split": {
          const dir = e.a + Math.PI / 2;
          g.burst(e.x, e.y, e.n * 5, 0.35, 0.8, 3.5, WARM, 1.6, 1.2, dir);
          if (e.energy) ov.float(e.x, e.y, `+${fmt(e.energy * e.n)}`, C.hot, 12);
          au.play("shock", { rate: 1.6, vol: 0.35, pan, gap: 0.06 });
          break;
        }
        case "absorb": {
          const m = MATTER[e.id],
            front = e.id >= sim.s.run.frontier - 1;
          this.gulp = Math.min(0.16, this.gulp + (front ? 0.05 : 0.012));
          this.act = Math.min(4, this.act + 0.08);
          au.play("absorb", { rate: front ? 0.8 : 1.3 + Math.random() * 0.4, vol: front ? 1 : 0.4, gap: 0.045 });
          if (front && performance.now() - (this.lastMassT || 0) > 450) {
            this.lastMassT = performance.now();
            ov.float((Math.random() - 0.5) * 0.1, sim.rh * 1.5 + 0.03, "+" + fmtMass(e.mass), C.white, 14, 1.1);
            ov.ring(0, 0, sim.rh, sim.rh * 2.6, 0.5, C.amber, 2, true);
          }
          if (e.first) {
            this.ui.toast(e.id);
            au.play("discover", { rate: 1 + (e.id % 5) * 0.06, vol: 0.5, gap: 0.2 });
          }
          if (e.band && e.id > 0) {
            this.ui.banner(m.className.toUpperCase(), `새로운 분류의 Matter가 장에 들어왔다`, "var(--amber)", "NEW CLASS", 1.6);
            gsap.fromTo(this.view, { recoil: 0.95 }, { recoil: 1, duration: 1.6, ease: "power2.out" });
            this.kick(0, 0, 0.7, 1.4);
          }
          break;
        }
        case "pulse":
          ov.ring(e.x, e.y, 0.01, e.r, 0.3, C.white, 3);
          ov.ring(e.x, e.y, 0.01, e.r * 1.25, 0.45, C.amber, 1.5);
          if (e.dual) ov.ring(-e.x, -e.y, 0.01, e.r, 0.3, C.amber, 2);
          this.kick(e.x, e.y, 0.9, 1.4);
          g.burst(e.x, e.y, 14, 0.9, 0.35, 3, WHITE, 0);
          au.play("pulse", { pan, rate: 0.95 + Math.random() * 0.1 });
          this.shake(0.12);
          break;
        case "shock":
          ov.ring(e.x, e.y, 0.01, e.r, 0.28, e.cause === "shard" ? C.white : C.hot, 2);
          au.play("shock", { pan, gap: 0.04, vol: 0.6 });
          break;
        case "arc":
          ov.arc(e.x1, e.y1, e.x2, e.y2);
          au.play("tick", { rate: 0.7 + Math.random() * 0.6, gap: 0.03 });
          break;
        case "release":
          this.ui.banner("FIELD RELEASE", `수율 ×${sim.st.releaseMult} · 유입 폭주`, "var(--red)", "", 1.1);
          au.play("release");
          this.ts = 0.2;
          gsap.to(this, { ts: 1, duration: 0.9, ease: "power2.in" });
          this.kick(0, 0, 2, 1.5);
          g.fx.flash = red ? 0.1 : 0.4;
          this.shake(0.9);
          this.jets = 1;
          this.act = 4;
          gsap.fromTo(this.view, { recoil: 0.92 }, { recoil: 1, duration: 1.3, ease: "elastic.out(1,0.45)" });
          ov.ring(0, 0, sim.rh, 1.6, 0.9, C.red, 5, true);
          ov.ring(0, 0, sim.rh, 1.2, 0.7, C.white, 2, true);
          break;
        case "frontier":
          au.play("key", { rate: 1.2, vol: 0.45 });
          break;
        case "buy": {
          const u = UPGRADES.find((x) => x.id === e.id);
          if (e.auto) break;
          au.play(u.key ? "key" : "buy", { rate: u.key ? 1 : 1 + Math.min(12, e.level) * 0.03 });
          this.act = Math.min(4, this.act + 0.5);
          ov.ring(0, 0, sim.rMin * 0.84, sim.rMin * 1.05, 0.5, C.amber, 2, true);
          if (u.key) this.ui.banner(u.name.toUpperCase(), u.fx, "var(--amber)", "APPARATUS ONLINE", 1.2);
          break;
        }
        case "node":
          au.play("key", { rate: 1.5 });
          ov.ring(0, 0, sim.rMin * 0.84, sim.rMin * 1.2, 0.6, C.cyan, 2, true);
          break;
        case "mod":
          au.play("key", { rate: 0.8 });
          this.ui.sig = "";
          break;
        case "unfold":
          this.ui.banner("DYNAMICS", "압력 속에서 응답하는 무언가가 감지되었다", "var(--cyan)", "SIGNAL DETECTED", 2);
          au.play("discover", { rate: 0.8 });
          break;
        case "inject":
          sim.s.flags.injected = true;
          au.play("inject");
          this.kick(0, 0, 1.3, 1.8);
          ov.ring(0, 0, sim.rh, 1.4, 0.8, C.cyan, 4, true);
          for (let i = 0; i < 60; i++) {
            const a = Math.random() * 6.283;
            g.emit(Math.cos(a) * 0.1, Math.sin(a) * 0.1 * K, Math.cos(a) * 1.2, Math.sin(a) * 1.2 * K, 0.8, 3, ...CYAN, 0, 2);
          }
          if (e.found.length) {
            const R = e.found[e.found.length - 1].toUpperCase();
            this.ui.banner({ TURBULENT: "TURBULENT FEED", CLOSED: "CLOSED LOOP", CASCADE: "ACCRETION CASCADE" }[R], "숨겨진 공명 조합을 발견했다", "var(--cyan)", "RESONANCE DISCOVERED", 2);
            au.play("discover", { rate: 1.3 });
            this.ui.sig = "";
          }
          break;
        case "limit":
          this.ui.banner("BINDING LIMIT", "장이 더 큰 천체를 묶지 못한다 — ANCHOR", "var(--violet)", "FIELD SATURATED", 2.4);
          au.play("riser");
          this.shake(0.4);
          break;
        case "boundary":
          this.ui.banner(e.name, "세 분절을 모두 부숴라 · FIELD RELEASE가 균열을 낸다", "var(--violet)", "GATE", 2.4);
          au.play("riser", { rate: 0.8 });
          this.shake(0.5);
          break;
        case "segment":
          au.play("segment");
          this.shake(0.7);
          this.stop = 0.07;
          g.fx.flash = red ? 0.05 : 0.2;
          for (let i = 0; i < 70; i++) {
            const a = Math.random() * 6.283,
              r = sim.rMin + 0.1;
            g.emit(Math.cos(a) * r, Math.sin(a) * r * K, Math.cos(a) * 0.5, Math.sin(a) * 0.5 * K, 0.9, 4, ...VIOLET, 0.6);
          }
          break;
        case "breach":
          this.ui.banner("BREACH", e.kind === "planetary" ? "세계급 천체가 장에 들어온다" : "별이 장에 들어온다", "var(--text)", e.kind.toUpperCase() + " BOUNDARY", 2.4);
          au.play("wave");
          au.play("release", { rate: 0.7 });
          this.ts = 0.15;
          gsap.to(this, { ts: 1, duration: 1.4, ease: "power2.in" });
          this.kick(0, 0, 2.4, 1.3);
          g.fx.flash = red ? 0.2 : 0.8;
          this.shake(1.2);
          this.jets = 1;
          gsap.fromTo(this.view, { recoil: 0.86 }, { recoil: 1, duration: 2.2, ease: "power3.out" });
          break;
        case "ending":
          setTimeout(() => this.ui.ending(), 1500);
          break;
      }
    }
    if (pulseKills) {
      this.stop = Math.max(this.stop, Math.min(0.07, 0.03 + pulseKills * 0.008));
      this.shake(Math.min(0.5, 0.1 + pulseKills * 0.06));
    }
    ev.length = 0;
  }
  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const real = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const sim = this.sim,
      g = this.gfx,
      v = this.view,
      c = this.c,
      set = sim.s.settings,
      play = this.state === "play" && !this.paused;
    let dt = real * this.ts;
    if (this.stop > 0) (this.stop -= real), (dt = 0);
    // geometry
    const F = sim.s.run.frontier;
    this.bhR += (0.105 + 0.11 * (F / 199) ** 0.7 - this.bhR) * Math.min(1, real * 1.2);
    sim.rh = SHADOW_K * this.bhR;
    sim.rMin = 1.7 * this.bhR + 0.07;
    sim.rMax = clamp(g.aspect * 0.64, 0.72, 1.18);
    if (play) {
      sim.step(dt, this.cur);
      this.cur.pulse = this.cur.inject = false;
      if (this.cine === "compress" || this.cine === "collapse") for (const b of sim.bodies) (b.r *= 1 - real * 2.2), (b.r0 = b.r), (b.heat = 1);
      if (this.cine === "collapse") sim.bodies.length = 0;
      this.handle(sim.events);
      let i = 0;
      while (i < GOALS.length - 1 && GOALS[i][1](sim)) i++;
      this.ui.directive(i, GOALS.length - 1, GOALS[i][0], GOALS[i][2]?.(sim));
      this.ui.update(sim);
    } else this.cur.pulse = this.cur.inject = false;
    // view
    v.ox += (v.oxT - v.ox) * Math.min(1, real * 7);
    const zoom = v.zoom * v.recoil;
    g.view.ox = v.ox;
    g.view.zoom = zoom;
    // black hole state: every system shows up here
    const p = sim.pressure / 100,
      res = sim.resonance > 0;
    this.act *= Math.exp(-real * 1.3);
    this.gulp *= Math.exp(-real * 7);
    this.jets *= Math.exp(-real * 0.9);
    const b = g.bh;
    b.radius = this.bhR * (1 + this.gulp) * c.scale;
    b.disk = clamp(0.38 + 0.62 * Math.min(1, F / 28) + p * 0.15, 0, 1.2);
    b.activity = this.act + p * 1.4 + (res ? 1 : 0);
    b.temp = 0.3 + 0.2 * Math.min(1, F / 120) + p * 0.22 + (res ? 0.3 : 0);
    b.turb = clamp(p + this.act * 0.15, 0, 1);
    b.jets = this.jets + (res ? 0.35 : 0);
    b.spin = 0.25 + 0.6 * Math.min(1, F / 160);
    b.era = 3 + F / 12;
    b.collapse = c.collapse;
    b.collapseT = c.collapse * 6;
    // post fx
    const fx = g.fx,
      m = set.reduced ? 0.2 : 1;
    this.trauma = Math.max(0, this.trauma - real * 1.6);
    const sh = this.trauma * this.trauma * 0.012 * set.shake * m,
      tt = now / 1000;
    fx.sx = sh * (Math.sin(tt * 97) + Math.sin(tt * 61) * 0.5);
    fx.sy = sh * (Math.cos(tt * 83) + Math.sin(tt * 47) * 0.5);
    fx.flash *= Math.exp(-real * 6);
    fx.dark = c.dark;
    fx.ab += ((sim.tier === 2 ? 0.0035 : 0) + (res ? 0.002 : 0) + this.trauma * 0.012 * m + c.collapse * 0.02 - fx.ab) * Math.min(1, real * 8);
    fx.red += ((sim.tier === 2 ? 0.55 + 0.25 * Math.sin(tt * 9) : 0) - fx.red) * Math.min(1, real * 5);
    const w = this.wave;
    w.r += w.v * real;
    w.s *= Math.exp(-real * 3.2);
    fx.wave[0] = w.x; fx.wave[1] = w.y; fx.wave[2] = w.r; fx.wave[3] = w.s * m;
    // bodies
    g.begin();
    const t = sim.t;
    for (const o of sim.bodies) {
      const a = Math.min(1, o.age * 3) * (o.ghost ? 0.5 : 1),
        d = o.sz * 2;
      if (o.state === 0) {
        const j = o.heat * 0.004,
          pop = 1 + Math.max(0, 0.25 - o.age) * 1.2 + o.heat * 0.06;
        g.body(o.x + (Math.random() - 0.5) * j, o.y + (Math.random() - 0.5) * j, d * pop, d * pop, o.rot + t * (o.seed - 0.5) * 0.9, o.id, o.heat * 0.8, o.flash, a);
        if (o.heat > 0.5 && Math.random() < real * 14) g.emit(o.x, o.y, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, 0.5, 2.2, ...WARM, 0.9);
      } else {
        const q = o.p || 0,
          sh2 = 1 - q ** 5 * 0.75;
        g.body(o.x, o.y, d * (1 + 2.4 * q * q) * sh2, d * (1 - 0.6 * q * q) * sh2, Math.atan2(Math.cos(o.a) * K, -Math.sin(o.a)), o.id, Math.max(o.heat, 0.3 + q * 0.7), o.flash, a * (o.split ? 0.75 : 1));
        if (Math.random() < real * 50) g.emit(o.x, o.y, 0, 0, 0.45, o.split ? 3.2 : 2.4, 1.5, 0.75 - q * 0.3, 0.3, 0.8);
      }
    }
    if (res && Math.random() < real * 40) {
      const a = Math.random() * 6.283,
        r = sim.rMin + Math.random() * 0.5;
      g.emit(Math.cos(a) * r, Math.sin(a) * r * K, 0, 0, 0.7, 2.5, ...CYAN, 1.2);
    }
    g.render(real);
    this.ov.setView({ ox: v.ox, oy: 0, zoom });
    this.ov.draw(real, sim, this.cur, { hidden: this.state !== "play", ringAlpha: c.ring });
    // audio mood
    this.audio.mood(p, res);
    if (play && sim.tier === 2 && (this.heartT -= real) <= 0) {
      this.heartT = 0.42;
      this.audio.play("heart", { vol: 0.8 });
    }
  }
}
window.game = new Game();
