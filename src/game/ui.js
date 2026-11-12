// DOM HUD: resource plates, frontier card, hotbar, docked drawer (Structure / Dynamics / Anchor / Catalog), title, modal.
import gsap from "gsap";
import { createElement, Magnet, Aperture, ArrowDownToDot, FlipHorizontal2, Sparkles, Zap, BatteryCharging, Radio, Gauge, Flame, Cpu, Orbit, Recycle, Waves, Repeat, Activity, Wind, Tornado, RefreshCw, Shrink, Link, FastForward, Satellite, BrainCircuit, Stamp, Layers, History, Boxes, Settings, Anchor, BookOpen, Network, Wrench, X, Atom, Crosshair, Syringe, Gem, Lock } from "lucide";
import atlasUrl from "../assets/matter-atlas.png";
import { MATTER, UPGRADES, ARMS, NODES, RESONANCES, MODULES, REGIMES, TIERS, GATES, need, fmt, fmtMass } from "./data.js";

const ICONS = { magnet: Magnet, aperture: Aperture, "arrow-down-to-dot": ArrowDownToDot, "flip-horizontal-2": FlipHorizontal2, sparkles: Sparkles, zap: Zap, "battery-charging": BatteryCharging, radio: Radio, gauge: Gauge, flame: Flame, cpu: Cpu, orbit: Orbit, recycle: Recycle, waves: Waves, repeat: Repeat, activity: Activity, wind: Wind, tornado: Tornado, "refresh-cw": RefreshCw, shrink: Shrink, link: Link, "fast-forward": FastForward, satellite: Satellite, "brain-circuit": BrainCircuit, stamp: Stamp, layers: Layers, history: History, boxes: Boxes, settings: Settings, anchor: Anchor, book: BookOpen, network: Network, wrench: Wrench, x: X, atom: Atom, crosshair: Crosshair, syringe: Syringe, gem: Gem, lock: Lock };
const $ = (s, r = document) => r.querySelector(s);
function html(str) {
  const t = document.createElement("template");
  t.innerHTML = str.trim();
  for (const i of t.content.querySelectorAll("[data-i]")) {
    const svg = createElement(ICONS[i.dataset.i] || Atom);
    svg.classList.add("lucide");
    i.replaceWith(svg);
  }
  return t.content;
}
const sprite = (id) => `<div class="sprite" style="background-position:${((id % 16) / 15) * 100}% ${(Math.floor(id / 16) / 15) * 100}%"></div>`;
const ROMAN = ["", "I", "II", "III", "IV"];
const TABS = [
  { name: "STRUCTURE", icon: "wrench", sub: "APPARATUS", title: "Structure", p: "Energy로 포획 장치를 조립한다." },
  { name: "DYNAMICS", icon: "network", sub: "RESONANCE NETWORK", title: "Dynamics", p: "Flux로 노드를 열고 INJECT로 공명시킨다." },
  { name: "ANCHOR", icon: "anchor", sub: "FIELD ANCHOR", title: "Anchor", p: "우주를 접어 Residue로 남긴다." },
  { name: "CATALOG", icon: "book", sub: "MATTER INDEX", title: "Catalog", p: "지금까지 삼킨 것들." },
];

export class UI {
  constructor(game) {
    this.g = game;
    this.cache = {};
    this.tab = -1;
    this.lastTab = 0;
    this.sig = "";
    this.goal = -1;
    document.documentElement.style.setProperty("--atlas", `url(${atlasUrl})`);
    document.body.append(
      html(`
<div id="hud">
  <div class="top">
    <button class="brand plate" id="brand"><i></i>ACCRETION</button>
    <div class="res mass plate"><i data-i="atom"></i><label>MASS</label><b id="r-mass"></b></div>
    <div class="res energy plate"><i data-i="zap"></i><label>ENERGY</label><b id="r-energy"></b></div>
    <div class="res flux plate hide" id="p-flux"><i data-i="waves"></i><label>FLUX</label><b id="r-flux"></b></div>
    <div class="res residue plate hide" id="p-res"><i data-i="gem"></i><label>RESIDUE</label><b id="r-res"></b></div>
  </div>
  <div class="frontier plate" id="frontier"><div class="tile"></div><div><small id="f-label"></small><h3 id="f-name"></h3><div class="pips" id="f-pips"></div></div></div>
  <div class="toasts" id="toasts"></div>
  <div class="directive plate" id="directive"><small><span>DIRECTIVE</span><span id="d-n"></span></small><p id="d-text"></p></div>
  <div class="hotbar" id="hotbar">
    <div class="slot plate" id="s-pulse"><kbd>CLICK</kbd><i data-i="crosshair"></i><span>PULSE</span><div class="cd"></div></div>
    <div class="slot inject plate hide" id="s-inject"><kbd>SPACE</kbd><i data-i="syringe"></i><span>INJECT</span><div class="cd"></div></div>
    <div class="pressure plate" id="pressure" data-t="0"><header><span class="tier" id="p-tier"></span><span class="mult" id="p-mult"></span></header><div class="bar"><i id="p-bar"></i></div><small id="p-sub"></small></div>
    <button class="anchorbtn plate hide" id="anchorbtn">ANCHOR<small id="a-gain"></small></button>
  </div>
  <button class="menubtn plate" id="menubtn"><i data-i="settings"></i></button>
  <nav class="tabs" id="tabs">${TABS.map((t, i) => `<button class="tab plate${i ? " hide" : ""}" data-tab="${i}"><i data-i="${t.icon}"></i><span>${t.name}</span><kbd>${i + 1}</kbd></button>`).join("")}</nav>
  <section class="drawer" id="drawer"><header><small id="dr-sub"></small><h2 id="dr-title"></h2><p id="dr-p"></p><button class="x" id="dr-x"><i data-i="x"></i></button></header><div class="body" id="dr-body"></div><div class="detail" id="detail"></div></section>
  <div class="banner" id="banner"></div>
</div>
<div id="title"><h1 id="logo">${[..."ACCRETION"].map((c) => `<span>${c}</span>`).join("")}</h1><div class="sub">FEED THE SINGULARITY</div><div class="menu" id="menu"></div><footer>v2.0 · HTML PROJECT BUILD · 마우스 + 키보드 권장</footer></div>
<div id="modal"></div><div id="veil"></div>`),
    );
    this.hud = $("#hud");
    $("#tabs").addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".tab");
      if (b) this.toggle(+b.dataset.tab);
    });
    $("#dr-x").onclick = () => this.toggle(this.tab);
    $("#menubtn").onclick = () => this.settings();
    $("#brand").onclick = () => this.settings();
    $("#anchorbtn").onclick = () => this.open(2);
    const body = $("#dr-body");
    body.addEventListener("pointerdown", (e) => {
      const n = e.target.closest("[data-buy]");
      if (n) this.g.buy(n.dataset.kind, n.dataset.buy, n);
    });
    body.addEventListener("pointerover", (e) => {
      const n = e.target.closest("[data-buy]");
      if (n && this.hover !== n.dataset.buy) {
        this.hover = n.dataset.buy;
        this.hoverKind = n.dataset.kind;
        this.g.audio.play("hover", { gap: 0.04 });
        this.detail();
      }
    });
  }
  set(id, v) {
    if (this.cache[id] === v) return false;
    this.cache[id] = v;
    $("#" + id).textContent = v;
    return true;
  }
  // ---------- title ----------
  showTitle(hasSave) {
    const m = $("#menu");
    m.replaceChildren(html(`${hasSave ? `<button class="btn plate pri" data-a="continue">계속하기</button>` : ""}<button class="btn plate${hasSave ? "" : " pri"}" data-a="new">새 게임</button><button class="btn plate" data-a="settings">설정</button>`));
    m.onclick = (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (a === "settings") this.settings();
      else if (a) this.g.start(a === "new");
    };
    gsap.to("#veil", { opacity: 0, duration: 1.6, ease: "power2.out" });
    gsap.from("#logo span", { opacity: 0, y: 26, filter: "blur(12px)", duration: 1.1, stagger: 0.07, ease: "power3.out", delay: 0.3 });
    gsap.from("#title .sub, #menu .btn, #title footer", { opacity: 0, y: 10, duration: 0.7, stagger: 0.09, delay: 1.2 });
  }
  hideTitle() {
    gsap.to("#title", { opacity: 0, duration: 0.7, onComplete: () => $("#title").remove() });
    gsap.to(this.hud, { opacity: 1, duration: 0.8, delay: 0.9 });
    gsap.from(".top > *, .frontier, .directive, .hotbar > *, .tab:not(.hide), .menubtn", { y: (i, el) => (el.closest(".hotbar,.directive") ? 30 : -30), opacity: 0, duration: 0.6, stagger: 0.05, delay: 0.95, ease: "power3.out", clearProps: "transform,opacity" });
  }
  // ---------- drawer ----------
  toggle(i) {
    if (this.tab === i) {
      this.tab = -1;
      this.hud.classList.remove("open");
      this.g.audio.play("open", { rate: 0.8 });
    } else this.open(i);
    this.g.onDrawer(this.tab >= 0);
  }
  open(i) {
    if ($(`.tab[data-tab="${i}"]`).classList.contains("hide")) return;
    this.tab = this.lastTab = i;
    this.hud.classList.add("open");
    for (const t of document.querySelectorAll(".tab")) t.classList.toggle("on", +t.dataset.tab === i);
    const T = TABS[i],
      d = $("#drawer");
    d.dataset.tab = i;
    $("#dr-sub").textContent = T.sub;
    $("#dr-title").textContent = T.title;
    $("#dr-p").textContent = T.p;
    this.sig = "";
    this.hover = null;
    this.detail();
    this.g.audio.play("open");
    this.g.onDrawer(true);
    this.refresh(true);
  }
  reveal(i) {
    const t = $(`.tab[data-tab="${i}"]`);
    if (!t.classList.contains("hide")) return;
    t.classList.remove("hide");
    t.classList.add("fresh");
  }
  nodeHtml(u, kind) {
    return `<button class="node plate${u.key ? " key" : ""}" data-kind="${kind}" data-buy="${u.id}"><i data-i="${u.icon}"></i><b>${u.name}</b><i class="lv"></i><u></u></button>`;
  }
  lockHtml(u) {
    if (!u) return "";
    const [id, l] = Object.entries(u.req).find(([id, l]) => this.g.sim.lv(id) < l);
    return `<div class="node plate lock"><i data-i="lock"></i><b>???</b><u>${UPGRADES.find((x) => x.id === id).name} Lv ${l}</u></div>`;
  }
  build() {
    const sim = this.g.sim,
      s = sim.s,
      body = $("#dr-body");
    let h = "";
    if (this.tab === 0) {
      h = `<div class="arms">${ARMS.map((a, i) => `<div class="arm"><h5>${a}</h5>${UPGRADES.filter((u) => u.arm === i && sim.visible(u)).map((u) => this.nodeHtml(u, "up")).join("")}${this.lockHtml(UPGRADES.find((u) => u.arm === i && !sim.visible(u)))}</div>`).join("")}</div>`;
    } else if (this.tab === 1) {
      const pos = NODES.map((_, i) => [50 + 37 * Math.sin((i * 6.2832) / 5), 50 - 37 * Math.cos((i * 6.2832) / 5)]);
      h = `<div class="net"><svg class="wires">${pos.map((p, i) => `<line data-w="${NODES[i].id}" x1="50%" y1="50%" x2="${p[0]}%" y2="${p[1]}%"/>`).join("")}</svg><div class="core" id="core">INJECT</div>${NODES.map((n, i) => this.nodeHtml(n, "node").replace('class="node', `style="left:${pos[i][0]}%;top:${pos[i][1]}%" class="node`)).join("")}</div>
      <div class="reso"><h5>HIDDEN RESONANCE</h5>${RESONANCES.map((r) => (s.resonances[r.id] ? `<div><b>${r.name}</b>${r.desc}</div>` : `<div class="unk">UNDISCOVERED</div>`)).join("")}</div>`;
    } else if (this.tab === 2) {
      const reg = sim.regime,
        nx = REGIMES[reg];
      h = s.anchors
        ? `<div class="regime">REGIME ${ROMAN[reg]}<i><b style="transform:scaleX(${nx ? Math.min(1, (s.totalResidue - REGIMES[reg - 1]) / (nx - REGIMES[reg - 1])) : 1})"></b></i>${nx ? `${s.totalResidue} / ${nx}` : "MAX"}</div><div class="mods">${MODULES.filter((m) => sim.modVisible(m)).map((m) => `<button class="mod plate" data-kind="mod" data-buy="${m.id}"><i data-i="${m.icon}"></i><b>${m.name}</b><u></u></button>`).join("")}</div>`
        : `<div class="empty">아직 아무것도 고정되지 않았다.<br>첫 Anchor가 이 장소를 드러낸다.</div>`;
      h += `<div class="ritual plate"><h4>ANCHOR</h4><p id="rit-p"></p><button class="hold" id="hold"><i></i><span style="position:relative">HOLD TO ANCHOR</span></button></div>`;
    } else if (this.tab === 3) {
      const maxBand = Math.floor(s.best / 10);
      h = `<div class="cat">`;
      for (let b = 0; b <= maxBand; b++) {
        const ids = MATTER.filter((m) => m.band === b);
        h += `<h5><span>${ids[0].className.toUpperCase()}</span><span>${ids.filter((m) => s.seen[m.id]).length} / 10</span></h5><div class="grid">${ids.map((m) => (s.seen[m.id] ? sprite(m.id).replace('class="sprite"', `class="sprite" data-buy="${m.id}" data-kind="cat"`) : `<div class="unk"></div>`)).join("")}</div>`;
      }
      h += `</div>`;
    }
    body.replaceChildren(html(h));
    const hold = $("#hold");
    if (hold) {
      let raf, t0;
      const bar = hold.firstChild,
        stop = () => {
          cancelAnimationFrame(raf);
          bar.style.transform = "scaleX(0)";
        },
        tick = () => {
          const k = (performance.now() - t0) / 900;
          bar.style.transform = `scaleX(${Math.min(1, k)})`;
          if (k >= 1) {
            stop();
            this.g.anchor();
          } else raf = requestAnimationFrame(tick);
        };
      hold.onpointerdown = () => {
        if (hold.disabled) return;
        t0 = performance.now();
        this.g.audio.play("riser", { rate: 1.6, vol: 0.5 });
        tick();
      };
      hold.onpointerup = hold.onpointerleave = stop;
    }
  }
  detail() {
    const sim = this.g.sim,
      el = $("#detail"),
      id = this.hover,
      k = this.hoverKind;
    let h = `<p class="hint">항목 위에 커서를 올리면 상세 정보가 표시된다. 클릭으로 구매.</p>`;
    if (id != null) {
      if (k === "up") {
        const u = UPGRADES.find((x) => x.id === id),
          l = sim.lv(id);
        h = `<h4>${u.name}<em>${u.max === Infinity ? `Lv ${l}` : `${l} / ${u.max}`}</em></h4><div class="fx">${u.fx}</div><p>${u.desc}</p>`;
      } else if (k === "node") {
        const n = NODES.find((x) => x.id === id),
          l = sim.dl(id);
        h = `<h4>${n.name}<em>${l} / 3</em></h4><div class="fx">${n.fx(Math.min(3, l + 1))}</div><p>${n.desc}</p>`;
      } else if (k === "mod") {
        const m = MODULES.find((x) => x.id === id),
          l = sim.ml(id);
        h = `<h4>${m.name}<em>${l} / ${m.max}</em></h4><div class="fx">${m.fx}</div><p>${m.desc}</p>`;
      } else if (k === "cat") {
        const m = MATTER[id];
        h = `<h4>${m.name}<em>#${String(m.id + 1).padStart(3, "0")}</em></h4><div class="fx">${fmtMass(m.mass)}</div><p>${m.className}</p>`;
      }
    }
    el.innerHTML = h;
  }
  refresh(force) {
    if (this.tab < 0) return;
    const sim = this.g.sim,
      s = sim.s,
      r = s.run;
    const sig = this.tab + "|" + (this.tab === 0 ? UPGRADES.filter((u) => sim.visible(u)).length + "/" + s.anchors : this.tab === 1 ? Object.keys(s.resonances).length : this.tab === 2 ? s.anchors + "/" + sim.regime + "/" + s.totalResidue : s.seen.filter(Boolean).length + "/" + s.best);
    if (force || sig !== this.sig) {
      this.sig = sig;
      this.build();
    }
    for (const el of document.querySelectorAll("#dr-body [data-buy]")) {
      const id = el.dataset.buy,
        k = el.dataset.kind;
      if (k === "cat") continue;
      let l, max, price, have, unit;
      if (k === "up") {
        const u = UPGRADES.find((x) => x.id === id);
        (l = sim.lv(id)), (max = u.max), (price = sim.price(u)), (have = r.energy), (unit = "E");
      } else if (k === "node") {
        const n = NODES.find((x) => x.id === id);
        (l = sim.dl(id)), (max = 3), (price = l < 3 ? sim.nodePrice(n) : 0), (have = r.flux), (unit = "F");
        document.querySelector(`[data-w="${id}"]`)?.classList.toggle("on", l > 0);
      } else {
        const m = MODULES.find((x) => x.id === id);
        (l = sim.ml(id)), (max = m.max), (price = sim.modPrice(m)), (have = s.residue), (unit = "R");
      }
      const isMax = l >= max;
      el.classList.toggle("own", l > 0);
      el.classList.toggle("max", isMax);
      el.classList.toggle("can", !isMax && have >= price);
      const lv = el.querySelector(".lv"),
        u = el.querySelector("u");
      if (lv) lv.textContent = max === Infinity ? `Lv ${l}` : max === 1 ? (l ? "ONLINE" : "") : `${l}/${max}`;
      const txt = isMax ? "MAX" : `${fmt(price)} ${unit}`;
      if (u.textContent !== txt) u.textContent = txt;
      if (k !== "up" && k !== "node") el.querySelector("b").dataset.l = l;
    }
    const core = $("#core");
    if (core) core.classList.toggle("ready", sim.st.canInject && sim.injectCd <= 0);
    const hold = $("#hold");
    if (hold) {
      const g = sim.residueGain(),
        ok = sim.canAnchor();
      hold.disabled = !ok;
      $("#rit-p").innerHTML = ok ? `지금 접으면 <b style="color:var(--violet)">+${g} Residue</b>. Mass · Energy · Structure · Frontier는 사라진다.` : sim.boundary ? "Boundary가 열려 있는 동안에는 접을 수 없다." : `Frontier 40부터 가능하다. (현재 ${r.frontier})`;
    }
  }
  flash(el, ok) {
    if (!el) return;
    el.classList.remove("flash", "shake");
    void el.offsetWidth;
    el.classList.add(ok ? "flash" : "shake");
  }
  // ---------- per-frame HUD ----------
  update(sim) {
    const s = sim.s,
      r = s.run,
      st = sim.st;
    this.set("r-mass", fmtMass(r.mass));
    this.set("r-energy", fmt(r.energy));
    if (s.flags.dynamics) {
      $("#p-flux").classList.remove("hide");
      $("#s-inject").classList.toggle("hide", !st.canInject);
      this.set("r-flux", fmt(r.flux));
    }
    if (s.anchors) {
      $("#p-res").classList.remove("hide");
      this.set("r-res", fmt(s.residue));
    }
    // frontier
    const F = r.frontier,
      m = MATTER[F],
      n = need(F),
      atGate = F === sim.cap && r.prog >= n;
    if (this.cache.fid !== F) {
      this.cache.fid = F;
      $("#frontier .tile").innerHTML = sprite(F);
      $("#f-name").textContent = m.name;
      $("#f-label").textContent = `FRONTIER ${String(F + 1).padStart(3, "0")} · ${fmtMass(m.mass)}`;
      const el = $("#frontier");
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
      this.cache.pips = "";
    }
    const pk = n + ":" + Math.min(n, r.prog) + ":" + atGate + ":" + !!sim.boundary;
    if (this.cache.pips !== pk) {
      this.cache.pips = pk;
      const gate = GATES.find((g) => g.at === F);
      $("#f-pips").innerHTML = atGate && gate ? `<div class="gate">${gate.name}${gate.kind === "binding" ? " — ANCHOR 필요" : " — 분절을 부숴라"}</div>` : Array.from({ length: n }, (_, i) => `<i class="${i < r.prog ? "on" : ""}"></i>`).join("");
    }
    // hotbar
    const pc = st.pulseCd ? sim.pulseCd / st.pulseCd : 0;
    $("#s-pulse .cd").style.transform = `scaleY(${pc})`;
    $("#s-pulse").classList.toggle("ready", pc <= 0);
    if (st.canInject) {
      $("#s-inject .cd").style.transform = `scaleY(${sim.injectCd / 25})`;
      $("#s-inject").classList.toggle("ready", sim.injectCd <= 0);
      $("#s-inject").classList.toggle("live", sim.resonance > 0);
    }
    const t = sim.tier,
      P = $("#pressure");
    if (P.dataset.t !== String(t)) P.dataset.t = t;
    this.set("p-tier", sim.afterglow > 0 ? "AFTERGLOW" : TIERS[t]);
    this.set("p-mult", `YIELD ×${st.tierMult[t].toFixed(1)}`);
    $("#p-bar").style.clipPath = `inset(0 ${100 - sim.pressure}% 0 0)`;
    this.set("p-sub", sim.resonance > 0 ? `RESONANCE ${sim.resonance.toFixed(1)}s` : sim.afterglow > 0 ? `유입 ×3 · ${sim.afterglow.toFixed(1)}s` : "100%에서 FIELD RELEASE");
    const ab = $("#anchorbtn"),
      canA = sim.canAnchor();
    ab.classList.toggle("hide", !canA);
    if (canA) {
      this.set("a-gain", `+${sim.residueGain()} RESIDUE`);
      ab.classList.toggle("must", atGate && F === 59);
      this.reveal(2);
    }
    if (s.anchors) this.reveal(2);
    if (s.flags.dynamics) this.reveal(1);
    if (s.seen.length > 2) this.reveal(3);
    // affordability pips on tabs
    if (((this.tk = (this.tk || 0) + 1) & 15) === 0) {
      $('.tab[data-tab="0"]').classList.toggle("can", UPGRADES.some((u) => sim.visible(u) && sim.lv(u.id) < u.max && sim.price(u) <= r.energy));
      $('.tab[data-tab="1"]').classList.toggle("can", NODES.some((x) => sim.dl(x.id) < 3 && sim.nodePrice(x) <= r.flux));
      $('.tab[data-tab="2"]').classList.toggle("can", MODULES.some((x) => sim.modVisible(x) && sim.ml(x.id) < x.max && sim.modPrice(x) <= s.residue));
      this.refresh();
    }
  }
  directive(i, total, text, progress) {
    if (this.goal !== i) {
      if (this.goal >= 0) {
        const d = $("#directive");
        d.classList.remove("done");
        void d.offsetWidth;
        d.classList.add("done");
        this.g.audio.play("buy", { rate: 1.5, vol: 0.6 });
      }
      this.goal = i;
      $("#d-text").innerHTML = text;
    }
    this.set("d-n", progress || `${i + 1} / ${total}`);
  }
  toast(id) {
    const m = MATTER[id],
      box = $("#toasts");
    const el = html(`<div class="toast plate">${sprite(id)}<div><small>NEW MATTER · #${String(id + 1).padStart(3, "0")}</small><b>${m.name}</b><em>${fmtMass(m.mass)}</em></div></div>`).firstChild;
    box.prepend(el);
    while (box.children.length > 3) box.lastChild.remove();
    gsap.from(el, { x: -40, opacity: 0, duration: 0.35, ease: "power3.out" });
    gsap.to(el, { opacity: 0, x: -20, duration: 0.4, delay: 3.2, onComplete: () => el.remove() });
  }
  banner(title, sub, color = "var(--text)", small = "", hold = 1.6) {
    const b = $("#banner");
    gsap.killTweensOf(b.children);
    b.style.setProperty("--k", color);
    b.replaceChildren(html(`${small ? `<small>${small}</small>` : ""}<h1>${title}</h1><div class="rule"></div>${sub ? `<p>${sub}</p>` : ""}`));
    const tl = gsap.timeline();
    tl.fromTo(b.querySelector("h1"), { opacity: 0, letterSpacing: "1.2em", filter: "blur(10px)" }, { opacity: 1, letterSpacing: ".34em", filter: "blur(0px)", duration: 0.45, ease: "power3.out" })
      .fromTo(b.querySelector(".rule"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power2.out" }, 0.05)
      .fromTo(b.querySelectorAll("p,small"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 }, 0.2)
      .to(b.children, { opacity: 0, duration: 0.5, delay: hold });
  }
  // ---------- modal ----------
  closeModal() {
    $("#modal").classList.remove("on");
    this.g.paused = false;
  }
  settings() {
    const g = this.g,
      set = g.sim.s.settings,
      st = g.sim.s.stats,
      M = $("#modal");
    g.paused = g.state === "play";
    M.replaceChildren(
      html(`<div class="dialog plate"><h2>SETTINGS</h2>
      <div class="row"><label>효과음</label><input type="range" min="0" max="1" step="0.05" value="${set.volume}" data-k="volume"></div>
      <div class="row"><label>앰비언트</label><input type="range" min="0" max="1" step="0.05" value="${set.music}" data-k="music"></div>
      <div class="row"><label>화면 흔들림</label><input type="range" min="0" max="1.5" step="0.1" value="${set.shake}" data-k="shake"></div>
      <div class="row"><label>렌더 품질</label><select data-k="quality">${["AUTO", "ULTRA", "HIGH", "BALANCED", "MOBILE"].map((q) => `<option${q === set.quality ? " selected" : ""}>${q}</option>`).join("")}</select></div>
      <div class="row"><label>모션 줄이기</label><button class="mini" data-a="reduced">${set.reduced ? "ON" : "OFF"}</button></div>
      <div class="row"><label>전체 화면</label><button class="mini" data-a="full">TOGGLE</button></div>
      <div class="row"><label>세이브</label><span><button class="mini" data-a="export">내보내기</button> <button class="mini" data-a="import">가져오기</button></span></div>
      <div class="stats"><div><small>PLAY TIME</small><b>${Math.floor(st.time / 60)}m ${Math.floor(st.time % 60)}s</b></div><div><small>CAPTURES</small><b>${fmt(st.captures)}</b></div><div><small>BEST CHAIN</small><b>×${st.bestChain}</b></div><div><small>FIELD RELEASE</small><b>${st.releases}</b></div></div>
      <div class="acts"><button class="btn plate pri" data-a="close">돌아가기</button><button class="btn plate danger" data-a="wipe">세이브 삭제</button></div>
      <p class="credits">Black hole shader adapted from hasnain7abbas/gargantua-blackhole (MIT) · simplex noise © Ashima Arts / Stefan Gustavson (MIT) · Three.js (MIT) · GSAP (Standard License) · ZzFX (MIT) · Lucide (ISC) · Chakra Petch, Pretendard (OFL). 모든 사운드와 Matter 아트는 절차적으로 생성되었다.</p></div>`),
    );
    M.classList.add("on");
    M.oninput = (e) => {
      const k = e.target.dataset.k;
      if (!k) return;
      set[k] = k === "quality" ? e.target.value : +e.target.value;
      g.applySettings();
      if (k === "volume") g.audio.play("buy");
    };
    M.onclick = (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (a === "close" || e.target === M) this.closeModal();
      else if (a === "reduced") {
        set.reduced = !set.reduced;
        e.target.textContent = set.reduced ? "ON" : "OFF";
      } else if (a === "full") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
      else if (a === "export") {
        const str = g.exportSave();
        navigator.clipboard?.writeText(str).then(() => (e.target.textContent = "복사됨"), () => prompt("세이브 코드", str));
      } else if (a === "import") {
        const str = prompt("세이브 코드를 붙여넣으세요");
        if (str && g.importSave(str)) location.reload();
      } else if (a === "wipe") {
        if (e.target.dataset.sure) {
          g.wipe();
          location.reload();
        } else {
          e.target.dataset.sure = 1;
          e.target.textContent = "한 번 더 누르면 삭제";
        }
      }
    };
  }
  ending() {
    const g = this.g,
      st = g.sim.s.stats,
      M = $("#modal");
    g.paused = true;
    M.replaceChildren(
      html(`<div class="dialog plate"><h2 style="color:var(--amber)">EVENT HORIZON</h2><p>더 이상 삼킬 이름이 남지 않았다. 먼지 한 톨에서 시작한 특이점이 은하단까지 접어 넣었다.</p>
      <div class="stats"><div><small>PLAY TIME</small><b>${Math.floor(st.time / 60)}m</b></div><div><small>CAPTURES</small><b>${fmt(st.captures)}</b></div><div><small>BEST CHAIN</small><b>×${st.bestChain}</b></div><div><small>ANCHORS</small><b>${g.sim.s.anchors}</b></div></div>
      <p>플레이해 주셔서 감사합니다. 계속해서 자유롭게 플레이할 수 있습니다.</p><div class="acts"><button class="btn plate pri" data-a="close">계속 플레이</button></div></div>`),
    );
    M.classList.add("on");
    M.onclick = (e) => e.target.closest("[data-a]") && this.closeModal();
  }
}
