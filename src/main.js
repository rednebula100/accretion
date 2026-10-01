import { mountArrayView } from "./ui/array-view.js";
import { mountErasure } from "./ui/erasure-well.js";
import {
  regime,
  returnCoherence,
  converge,
  convergenceGain,
  breachPlanetary,
} from "./systems/spatial-progression.js";
import { record } from "./systems/world.js";
import "./style.css";
import "./ui/composition.css";
import "./ui/interaction.css";
import { MATTER } from "./content.js";
import {
  fresh,
  tick,
  buy,
  unlocked,
  price,
  rate,
  fmt,
  massText,
  offlineAsync,
} from "./engine.js";
import { load, save, encode, decode } from "./save.js";
import { Universe } from "./renderer.js";
import { Soundscape } from "./audio.js";
import { APPARATUS, FLOW_NODES, COHERENCE, MODULES } from "./data/pass1.js";
import {
  freshWorld,
  drainEvents,
  purchaseApparatus,
  purchaseFlow,
  reconstructWorld,
  reconstructionReady,
  spendCoherence,
  bindingChannels,
  anchorGain,
  anchorWorld,
  purchaseModule,
  convertFlux,
  enterLocation,
} from "./systems/world.js";
import { bindWorldPointer } from "./ui/world-pointer.js";
import { SessionClock } from "./ui/session-clock.js";
import { CameraDirector } from "./ui/camera.js";
import { WorldComposition } from "./ui/world-composition.js";
import {
  revealedApparatus,
  revealedFlow,
  visibilityState,
  ResourcePresentation,
  bindingPresentation,
  apparatusHardware,
} from "./ui/interaction-state.js";
import { reconstructionGain } from "./systems/world.js";
import { PresentationEventBus, FXDirector } from "./ui/presentation.js";
const root = document.querySelector("#game");
const location = (id, number, title, copy, body) =>
  `<section id="${id}" class="location ${id}"><header><small>${number}</small><button class="location-title" data-toggle="${id}" aria-expanded="false">${title} <span>⌄</span></button><button class="facility-focus" data-travel="${id}" aria-label="Focus ${title}">Focus ↗</button><p>${copy}</p></header>${body}</section>`;
root.innerHTML = `<canvas id="cosmos"></canvas><div id="viewport"><div id="world"><svg class="world-links" viewBox="-1600 -1000 3200 2400"><path d="M-440 0 Q-650-200-450-440 M-450-440 Q0-300 0 0 M0 0 Q-180 360 0 660 M0 0 Q450-200 880 0 M0 660 Q350 750 570 520"/></svg>
 ${location("matter", "01 / CAPTURE", "Matter Feed", "Everything that falls in becomes part of you.", '<div id="matter-cards"></div><div id="relay-device" hidden><b>⋈ CATALOG RELAY</b><span>KNOWN RANGE · NEW FRONTIER HELD FOR YOU</span><button id="relay-toggle">Pause relay</button></div><footer id="transit"></footer>')}
 ${location("structure", "02 / APPARATUS", "Structure", "Give the field a shape.", '<div id="scaffold"></div><div id="apparatus"></div>')}
 ${location("dynamics", "FLOW / COHERENT RESPONSE", "Dynamics", "A response is forming below the horizon.", '<div id="flow-graph"></div><div id="coherence-choices"></div>')}
 ${location("anchor", "04 / PERSISTENT FIELD", "Field Anchor", "What remains becomes your beginning.", '<div class="anchor-core">◉<strong>STABLE CORE</strong><span>Energy ×1.8 across every Seed</span><b id="residue"></b></div><div id="modules"></div>')}
 ${location("converter", "03 / EXCHANGE", "Converter", "Redirect flow. Choose its purpose.", '<div id="regulator-controls"></div><button id="convert" class="device"><b>ϟ → ◆</b><strong>Radiative conversion</strong><span>20 Flux → 10 seconds of Energy</span><small>Spend flow here or develop Dynamics.</small></button>')}
 <section id="binding" hidden><svg viewBox="0 0 320 320" aria-label="Binding field stability"><circle class="shell" cx="160" cy="160" r="148"/>${[0, 1, 2].map((i) => `<circle class="sector" data-channel="${i}" cx="160" cy="160" r="140" transform="rotate(${i * 120 - 90} 160 160)"/>`).join("")}</svg><div><small id="boundary-stage"></small><h2>Binding Limit</h2><p id="binding-message"></p><button id="anchor-action">Anchor</button><div class="channel-links"><button data-travel="structure">Field</button><button data-travel="dynamics">Response</button><button data-travel="matter">Accretion</button></div></div></section></div></div>
 <header id="hud"><button id="home" aria-label="Return to universe">◉ <b>ACCRETION</b></button><div class="resource"><small>MASS</small><strong id="mass"></strong></div><div class="resource energy"><small>ENERGY</small><strong id="energy"></strong><span id="income"></span></div><div class="resource flux" id="flux-wrap" hidden><small>FLUX</small><strong id="flux"></strong></div><div class="resource coherence" id="coherence-wrap" hidden><small>COHERENCE</small><strong id="coherence"></strong></div><button id="settings-open" aria-label="Calibration settings">Calibration [O]</button></header>
 <div id="signals"></div><footer id="compass"><button id="back">↖ Universe</button><span id="coordinate">SEED / OBSERVATION FIELD</span><small>Drag empty space · Scroll to zoom · Esc to return</small></footer><div id="toast" role="status" aria-live="polite"></div><div id="moment" aria-live="polite"></div>
 <dialog id="settings"><h2>Calibration Terminal</h2><label>Quality <select id="quality"><option>AUTO</option><option>BALANCED</option><option>MOBILE</option><option>ULTRA</option></select></label><label><input type="checkbox" id="motion"> Reduced motion</label><label>Audio <input type="range" id="volume" min="0" max="1" step=".05"></label><button id="export">Export save</button><button id="locate-well">Locate Erasure Well</button><label>Import save<input type="file" id="import" accept=".json,application/json"></label><p id="save-message"></p><button id="settings-close">Return to the field</button></dialog>`;
const $ = (id) => document.getElementById(id),
  loaded = load();
let state = loaded.state;
function adopt(s) {
  if (s.world) return;
  s.world = freshWorld();
  s.world.manual = [...s.everSeen];
  s.world.compatibilityFrontier = s.highest;
  const map = {
    feed: ["st-decay", "core-1"],
    field: ["st-disk", "core-2"],
    grid: ["st-apparatus"],
    tap: ["st-apparatus"],
    binding: ["st-planetary", "core-9"],
  };
  for (const [id, old] of Object.entries(map))
    if (old.some((n) => s.nodes.includes(n))) s.world.apparatus.push(id);
  if (s.dynamics.unlocked) s.world.locations.dynamics = "DETECTED";
}
adopt(state);
const camera = new CameraDirector(),
  bus = new PresentationEventBus(),
  fx = new FXDirector(bus, root, $("toast")),
  audio = new Soundscape();
$("world").insertAdjacentHTML(
  "beforeend",
  '<button id="calibration-terminal" class="calibration-terminal"><svg viewBox="0 0 100 60" aria-hidden="true"><path d="M15 50 V10 H85 V50 Z M25 20 H75 V36 H25 Z M35 50 V57 M65 50 V57 M45 27 H55"/></svg><strong>CALIBRATION</strong><span>Observer console · [O]</span></button>',
);
$("calibration-terminal").onclick = () => $("settings-open").click();
const fluxPresentation = new ResourcePresentation(state.dynamics.flux);
let renderer;
try {
  renderer = new Universe($("cosmos"));
  renderer.setQuality(state.settings.quality);
} catch (e) {
  $("toast").textContent = "WebGL unavailable. The field remains playable.";
  console.error(e);
}
camera.reducedMotion =
  state.settings.reducedMotion ||
  matchMedia("(prefers-reduced-motion: reduce)").matches;
const clock = new SessionClock(performance.now());
let lastUI = -1,
  stamp = "",
  catchingUp = false,
  paused = false,
  transaction = null,
  displayEnergy = state.energy,
  displayMass = state.mass;
const telemetry = {
  frames: [],
  inputLatency: [],
  scenes: [],
  timeline: [],
  errors: [],
};
const arrayView = mountArrayView(
  $("world"),
  () => state,
  travel,
  beginReset,
  () => !!transaction || catchingUp,
  (depth) => camera.go("array", depth),
);
const well = mountErasure(
  $("world"),
  () => state,
  () => {
    state = fresh();
    composition.expanded.clear();
    composition.remote = false;
    adopt(state);
    arrayView.clear();
    renderer?.resetFromState(state);
    camera.go("universe");
    stamp = "";
    displayEnergy = state.energy;
    displayMass = state.mass;
    save(state);
    renderUI();
  },
  () => !!transaction || catchingUp,
);
const activePointers = new Set();
root.addEventListener(
  "pointerdown",
  (e) => activePointers.add(e.pointerId),
  true,
);
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
  window.addEventListener(
    type,
    (e) => activePointers.delete(e.pointerId),
    true,
  );
window.addEventListener("blur", () => activePointers.clear());
const composition = new WorldComposition(
  root,
  camera,
  () => state,
  () => activePointers.size > 0 || arrayView.dragging || well.holding,
);
root
  .querySelector(".anchor-core")
  .insertAdjacentHTML(
    "beforeend",
    '<button id="anchor-from-core">Anchor</button>',
  );
$("anchor-from-core").onclick = () => beginReset("anchor");
$("locate-well").onclick = () => {
  $("settings").close();
  composition.remote = true;
  camera.go("erasure");
};
function markup(id, html) {
  const el = $(id);
  if (el.dataset.markup !== html) {
    el.innerHTML = html;
    el.dataset.markup = html;
  }
}
const card = (n, kind, owned, disabled, currency) =>
  `<button class="game-card ${owned ? "owned" : ""}" data-action="${kind}" data-id="${n.id}" ${disabled ? "disabled" : ""}><i>${n.icon || "⌁"}</i><strong>${n.name}</strong><span>${n.effect}</span><b>${owned ? "ESTABLISHED" : (disabled ? "Requires " : "") + fmt(n.cost) + " " + currency}</b></button>`;
function graph() {
  const w = state.world;
  if (
    w.modules.includes("recall") &&
    w.knownRegions.includes(0) &&
    w.region === 0
  )
    return `<div class="recalled-root"><i>⟲</i><strong>Region A · remembered root</strong><p>Recall is gathering the known 155 Flux schematic.</p></div>`;
  if (w.locations.dynamics !== "ACTIVE")
    return '<button class="signal-orb" data-travel="dynamics">⌁<span>Approach the signal</span></button>';
  const nodes = revealedFlow(state),
    edges = [];
  for (const n of nodes)
    for (const p of n.parents) {
      const a = nodes.find((n) => n.id === p);
      if (a)
        edges.push(
          `<path d="M${a.x + 144} ${a.y + 42} C${a.x + 174} ${a.y + 42},${n.x - 30} ${n.y + 42},${n.x} ${n.y + 42}"/>`,
        );
    }
  if (w.region === 1)
    for (const n of nodes.filter((n) => !n.parents.length))
      edges.push(
        `<path d="M144 42 C174 42,170 ${n.y + 42},${n.x} ${n.y + 42}"/>`,
      );
  if (w.region === 0 && reconstructionReady(state) && !w.flow.includes("deep"))
    edges.push(
      '<path d="M344 -43 C530 -43,570 10,600 42 M344 127 C530 127,570 75,600 42"/>',
    );
  if (w.region === 0 && w.flow.includes("deep"))
    edges.push('<path d="M544 42 C570 42,570 42,600 42"/>');
  return `<svg class="flow-edges" viewBox="-20 -110 800 330">${edges.join("")}</svg>${nodes.map((n) => `<div class="node" style="transform:translate(${n.x}px,${n.y}px)">${card(n, "flow", w.flow.includes(n.id), w.flow.includes(n.id) || !n.parents.every((p) => w.flow.includes(p)) || state.dynamics.flux.lt(n.cost), "F")}</div>`).join("")}${w.region === 0 && !reconstructionReady(state) ? "" : `<button class="reconstruct node game-card" style="transform:translate(${w.region === 0 ? 600 : 0}px,0px)" data-action="reconstruct" data-id="reconstruct" ${reconstructionReady(state) ? "" : "disabled"}><i>⟲</i><strong>${w.region === 0 ? "Reconstruction I" : "Coherent root"}</strong><span>${w.region === 0 ? "Compress this region" : "The old region remains as knowledge"}</span><b>${w.region === 0 ? `+${reconstructionGain(state)} Coherence` : "REGION B"}</b></button>`}${reconstructionReady(state) ? `<p class="coherence-rule">Yield = 2 + floor(connected nodes / 2) + charge (0 / 1 / 2 at 0 / 80 / 240 Flux).<br>Compress now, complete the remaining branch, or store charge. Retains 25% Flux.</p>` : ""}`;
}
function renderUI() {
  if (root.querySelector("button:active")) return;
  const w = state.world,
    u = unlocked(state),
    signature = JSON.stringify([
      u,
      w.apparatus,
      w.flow,
      w.region,
      w.choices,
      w.modules,
      w.locations,
      w.boundary,
      w.residue,
      w.coherence,
      reconstructionGain(state),
      state.highest,
      regime(state),
      w.p2.cl,
      APPARATUS.map((n) => state.energy.gte(n.cost)),
      FLOW_NODES.map((n) => state.dynamics.flux.gte(n.cost)),
      [0, 1, 2].map((n) => state.energy.gte(price(state, Math.max(0, u - n)))),
      state.queue.map((q) => q.matter),
    ]);
  $("transit").textContent =
    `${state.queue.length} IN TRANSIT · ${state.seen.length} OBSERVED THIS RUN`;
  $("income").textContent = `+${fmt(rate(state))} / s`;

  $("coherence").textContent = w.coherence;
  $("residue").textContent = `${w.residue} RESIDUE`;
  $("anchor-from-core").disabled = !anchorGain(state);
  $("anchor-from-core").textContent = `Anchor · +${anchorGain(state)} Residue`;
  $("anchor").querySelector(".anchor-core span").textContent = w.anchors
    ? "Energy ×1.8 across every Seed"
    : "Dormant field · Anchor to restore";
  $("convert").disabled =
    state.dynamics.flux.lt(20) || w.conversionCooldown > 0;
  $("convert").querySelector("small").textContent =
    w.conversionCooldown > 0
      ? `Field cooling · ${Math.ceil(w.conversionCooldown)}s`
      : "Spend flow here or develop Dynamics.";
  $("flux-wrap").hidden = !w.apparatus.includes("tap");
  $("coherence-wrap").hidden = !w.reconstructions;
  arrayView.render();
  composition.sync();
  composition.updateSummaries();
  root.dataset.centerOwner = w.p2.cl
    ? "array"
    : w.planetary !== "HIDDEN" &&
        !w.capabilities.includes("CAP_PLANETARY_BINDING")
      ? "planetary"
      : "binding";
  if (signature === stamp) return;
  stamp = signature;
  const focus = document.activeElement?.dataset,
    focusKey = focus?.id && `${focus.action}:${focus.id}`;
  const start = Math.max(0, u - 2);
  markup(
    "matter-cards",
    Array.from({ length: u - start + 1 }, (_, j) => j + start)
      .map(
        (i) =>
          `<button class="matter-card ${i === u ? "frontier" : ""}" data-action="matter" data-id="${i}" ${state.energy.lt(price(state, i)) ? "disabled" : ""}><span class="specimen" style="background-position:${((i % 16) / 15) * 100}% ${(Math.floor(i / 16) / 15) * 100}%"></span><span><small>${String(i + 1).padStart(3, "0")} / ${state.everSeen.includes(i) ? "OBSERVED" : "NEW MATTER"}</small><strong>${MATTER[i].name}</strong><b>${fmt(price(state, i))} E <em>↘ Feed</em></b></span></button>`,
      )
      .join(""),
  );
  markup(
    "apparatus",
    revealedApparatus(state)
      .map((n) =>
        card(
          n,
          "apparatus",
          w.apparatus.includes(n.id),
          w.apparatus.includes(n.id) ||
            state.highest < n.at ||
            state.energy.lt(n.cost),
          "E",
        ),
      )
      .join("") ||
      "<p>Feed the Seed. The first apparatus will take shape here.</p>",
  );
  markup("scaffold", apparatusHardware(state));
  $("dynamics").hidden = w.locations.dynamics === "HIDDEN";
  $("dynamics").dataset.stage = w.locations.dynamics;
  const priorFlow = new Set(
    [...$("flow-graph").querySelectorAll("[data-id]")].map(
      (el) => el.dataset.id,
    ),
  );
  markup(
    "flow-graph",
    w.locations.dynamics === "ECHO" ? '<div class="echo">⌁</div>' : graph(),
  );
  $("flow-graph")
    .querySelectorAll("[data-id]")
    .forEach((el) => {
      if (!priorFlow.has(el.dataset.id))
        el.closest(".node")?.classList.add("revealing");
    });
  markup(
    "coherence-choices",
    w.reconstructions
      ? COHERENCE.map((n) =>
          card(
            n,
            "coherence",
            w.choices.includes(n.id),
            w.choices.includes(n.id) || w.coherence < n.cost,
            "C",
          ),
        ).join("") +
          w.choices
            .filter((id) => id !== "region")
            .map(
              (id) =>
                `<button data-action="return-coherence" data-id="${id}">Return ${id} · +2 C</button>`,
            )
            .join("")
      : "",
  );
  $("anchor").hidden = !w.anchors && !w.p2.cl;
  $("anchor").dataset.regime = regime(state);
  $("anchor").querySelector("header small").textContent =
    `PERSISTENT FIELD · BINDING REGIME ${["I", "II", "III", "IV"][regime(state) - 1]}`;
  markup(
    "modules",
    [1, 2, 3, 4]
      .filter((r) => r <= regime(state))
      .map(
        (r) =>
          `<div class="anchor-arm arm-${r}"><span class="arm-joint">${["CORE SOCKETS", "UTILITY ARM", "SURVEY / REGULATION", "FABRICATION"][r - 1]}</span>${MODULES.filter(
            (n) => n.regime === r,
          )
            .map((n) =>
              card(
                n,
                "module",
                w.modules.includes(n.id),
                w.modules.includes(n.id) || w.residue < n.cost,
                "R",
              ),
            )
            .join("")}</div>`,
      )
      .join(""),
  );
  markup(
    "regulator-controls",
    w.modules.includes("regulator")
      ? `<form id="regulator-form" data-gesture><strong>CONVERTER REGULATOR</strong><label><input name="enabled" type="checkbox" ${w.automation.regulator.enabled ? "checked" : ""}> Rule enabled</label>${["reserve", "overflow", "ratio", "cap"].map((key, i) => `<label>${["Keep Energy at least", "Convert Flux above", "Energy / Flux target ratio", "Energy cap"][i]}<input name="${key}" type="number" min="0" max="1000000000000" value="${w.automation.regulator[key]}" data-copyable></label>`).join("")}<button type="submit">Set rule</button></form>`
      : "",
  );
  const form = $("regulator-form");
  if (form)
    form.onsubmit = (e) => {
      e.preventDefault();
      if (transaction || catchingUp) return;
      const data = new FormData(form),
        r = state.world.automation.regulator;
      for (const k of ["reserve", "overflow", "ratio", "cap"])
        r[k] = Math.max(0, Math.min(1e12, Number(data.get(k)) || 0));
      r.enabled = data.has("enabled");
      record(state, "converter-rule");
      stamp = "";
    };
  let spool = $("spool-toggle");
  if (!spool && w.modules.includes("spool")) {
    $("relay-device").insertAdjacentHTML(
      "beforeend",
      '<button id="spool-toggle">Queue known recovery</button>',
    );
    spool = $("spool-toggle");
    spool.onclick = () => {
      if (transaction || catchingUp) return;
      state.world.automation.spool = !state.world.automation.spool;
      record(state, "spool-rule");
      stamp = "";
    };
  }
  if (spool) {
    spool.hidden = !w.modules.includes("spool");
    spool.textContent = w.automation.spool
      ? "Stop recovery queue"
      : "Queue known recovery";
  }
  $("converter").hidden = w.locations.converter === "HIDDEN";
  $("relay-device").hidden =
    !w.modules.includes("relay") && !w.modules.includes("spool");
  $("relay-toggle").textContent = w.relay.enabled
    ? "Pause relay"
    : "Activate relay";
  $("binding").hidden = w.boundary === "HIDDEN";
  $("binding").dataset.stage = w.boundary;
  $("boundary-stage").textContent = w.boundary;
  $("binding-message").textContent =
    w.boundary === "READY"
      ? "Compress this field. Keep its memory."
      : "The outer field is learning to hold together.";
  $("anchor-action").disabled = w.boundary !== "READY";
  $("anchor-action").textContent =
    w.boundary === "READY"
      ? `ANCHOR · +${anchorGain(state)} RESIDUE`
      : "FIELD STABILIZING";
  bindingPresentation(state, bindingChannels(state)).forEach(
    (n, i) =>
      (root.querySelector(`[data-channel="${i}"]`).style.strokeDasharray =
        `${n * 270} 880`),
  );
  for (const id of ["dynamics", "converter", "anchor"])
    if (!["HIDDEN", "ECHO"].includes(w.locations[id])) camera.expand(id);
  if (focusKey) {
    const [action, id] = focusKey.split(":");
    root
      .querySelector(`[data-action="${action}"][data-id="${id}"]`)
      ?.focus({ preventScroll: true });
  }
}
function signalUI() {
  const points = composition.layout?.points || {};
  const signals = [];
  for (const [id, p] of Object.entries(points)) {
    if (
      id === "erasure" ||
      state.world.locations[id] === "ECHO" ||
      (id === "array" &&
        !state.world.p2.cl &&
        !state.world.modules.includes("fabricator")) ||
      (id === "planetary" && state.world.planetary === "ECHO")
    )
      continue;
    const v = composition.current[id] || p;
    const dx = v.x - camera.x,
      dy = v.y - camera.y;
    const px = innerWidth / 2 + dx * camera.zoom,
      py = innerHeight / 2 + dy * camera.zoom;
    const hw = (p.footprint[0] * camera.zoom) / 2,
      hh = (p.footprint[1] * camera.zoom) / 2;
    const el = composition.elements[id];
    const visibility = visibilityState(
      { left: px - hw, right: px + hw, top: py - hh, bottom: py + hh },
      { left: 24, right: innerWidth - 24, top: 100, bottom: innerHeight - 72 },
      el.dataset.visibility,
    );
    el.dataset.visibility = visibility;
    el.classList.remove("outside-safe-view");
    if (visibility !== "OFFSCREEN") continue;
    if (camera.depth && camera.targetLocation === id) continue;
    const r = Math.min(
      (innerWidth / 2 - 92) / Math.max(1, Math.abs(dx)),
      (innerHeight / 2 - 130) / Math.max(1, Math.abs(dy)),
    );
    signals.push({
      id,
      x: innerWidth / 2 + dx * r,
      y: innerHeight / 2 + dy * r,
    });
  }
  // Keep edge labels from sitting on one another in crowded directions.
  for (let i = 0; i < signals.length; i++)
    for (let j = 0; j < i; j++) {
      if (
        Math.abs(signals[i].x - signals[j].x) < 150 &&
        Math.abs(signals[i].y - signals[j].y) < 38
      )
        signals[i].y = Math.min(innerHeight - 90, signals[j].y + 40);
    }
  const html = signals
    .map(
      (p) =>
        `<button class="edge-signal" style="left:${p.x}px;top:${p.y}px" data-travel="${p.id}"><span>◇</span>${p.id === "anchor" ? "Field Anchor" : p.id}</button>`,
    )
    .join("");
  if ($("signals").dataset.html !== html) {
    $("signals").innerHTML = html;
    $("signals").dataset.html = html;
  }
}
function travel(id) {
  if (transaction) return;
  if (
    ["dynamics", "converter", "anchor"].includes(id) &&
    !enterLocation(state, id)
  )
    return;
  camera.fast =
    state.world.modules.includes("navigation") ||
    state.world.p2.tech.includes("afterimage");
  if (
    id === "array" &&
    !state.world.p2.cl &&
    !state.world.modules.includes("surveyor")
  )
    return;
  camera.go(id);
  record(state, "travel", { id });
  state.world.runActions.travelTime += camera.travel?.duration || 0;
  stamp = "";
}
function beginReset(kind) {
  if (
    catchingUp ||
    transaction ||
    !(kind === "anchor"
      ? anchorGain(state)
      : kind === "convergence"
        ? convergenceGain(state)
        : kind === "planetary"
          ? state.world.planetary === "READY"
          : reconstructionReady(state))
  )
    return;
  transaction = {
    kind,
    age: 0,
    committed: false,
    duration: kind === "convergence" ? 2.2 : 1.5,
  };
  bus.emit({ type: "RESET_BEGIN", kind });
  camera.inputLock = transaction.duration;
  root.dataset.cinematic = kind;
  audio.tone(kind === "anchor" ? 110 : 260, 30, 1.3, 0.13);
  $("moment").textContent =
    kind === "anchor"
      ? `THE FIELD REMEMBERS · +${anchorGain(state)} RESIDUE`
      : kind === "convergence"
        ? `CONVERGENCE · +${convergenceGain(state)} ALIGNMENT`
        : kind === "planetary"
          ? "THE FIELD OPENS TO WORLDS"
          : "RECONSTRUCTING";
}
function transact(dt) {
  if (!transaction) return;
  const t = transaction;
  t.age += dt;
  root.style.setProperty(
    "--collapse",
    Math.sin(Math.min(1, t.age / t.duration) * Math.PI),
  );
  if (t.age >= t.duration / 2 && !t.committed) {
    t.committed = true;
    if (t.kind === "anchor") {
      anchorWorld(state, fresh);
      composition.expanded.clear();
      renderer?.resetFromState(state);
      camera.go("universe");
      displayEnergy = state.energy;
      displayMass = state.mass;
    } else if (t.kind === "convergence") {
      converge(state, fresh, freshWorld);
      composition.expanded.clear();
      arrayView.clear();
      renderer?.resetFromState(state);
      camera.go("array");
      displayEnergy = state.energy;
      displayMass = state.mass;
    } else if (t.kind === "planetary") {
      breachPlanetary(state);
      camera.go("universe");
    } else {
      reconstructWorld(state);
      if (camera.targetLocation !== "dynamics") camera.go("dynamics");
    }
    stamp = "";
    renderUI();
    save(state);
  }
  if (t.age >= t.duration) {
    delete root.dataset.cinematic;
    root.style.setProperty("--collapse", 0);
    $("moment").textContent = "";
    transaction = null;
    camera.inputLock = 0;
  }
}
root.addEventListener("click", (e) => {
  audio.start();
  audio.setVolume(state.settings.audio);
  const el = e.target.closest("button");
  if (!el) return;
  if (el.dataset.toggle) {
    if (!transaction) {
      if (["dynamics", "converter", "anchor"].includes(el.dataset.toggle))
        enterLocation(state, el.dataset.toggle);
      composition.toggle(el.dataset.toggle);
      stamp = "";
      renderUI();
    }
    return;
  }
  if (el.dataset.travel) {
    travel(el.dataset.travel);
    return;
  }
  if (transaction || catchingUp) return;
  const { action, id } = el.dataset;
  let ok = false;
  if (action === "matter") ok = buy(state, Number(id));
  if (action === "apparatus") ok = purchaseApparatus(state, id);
  if (action === "flow") ok = purchaseFlow(state, id);
  if (action === "return-coherence") ok = returnCoherence(state, id);
  if (action === "coherence") ok = spendCoherence(state, id);
  if (action === "module") ok = purchaseModule(state, id);
  if (action === "reconstruct") beginReset("reconstruct");
  if (ok) {
    audio.click();
    if (action === "matter") bus.emit({ type: "FEED_LAUNCH", id });
    fluxPresentation.reset(state.dynamics.flux);
    stamp = "";
    renderUI();
  }
});
$("anchor-action").onclick = () => beginReset("anchor");
$("convert").onclick = () => {
  if (transaction || catchingUp) return;
  if (convertFlux(state)) {
    audio.tone(180, 540, 0.3, 0.06);
    fluxPresentation.reset(state.dynamics.flux);
    fx.animate($("energy"), [{ opacity: 0.35 }, { opacity: 1 }], {
      duration: 450,
      delay: 180,
    });
  }
  stamp = "";
  renderUI();
};
$("home").onclick = () => {
  if (!transaction) camera.go("universe");
};
$("back").onclick = () => {
  if (!transaction) camera.back();
};
$("relay-toggle").onclick = () => {
  if (transaction) return;
  state.world.relay.enabled = !state.world.relay.enabled;
  stamp = "";
};
let pendingInput = null;
root.addEventListener(
  "pointerdown",
  () => {
    pendingInput = performance.now();
  },
  { capture: true },
);
bindWorldPointer(
  root,
  camera,
  () => !!transaction || catchingUp,
  (t) => (pendingInput = t),
);
root.addEventListener(
  "wheel",
  (e) => {
    if (
      e.target.closest("dialog, .location-body, .array-console, [data-gesture]")
    )
      return;
    e.preventDefault();
    if (!transaction) {
      pendingInput = e.timeStamp;
      camera.wheel(e.deltaY);
    }
  },
  { passive: false },
);
window.addEventListener("keydown", (e) => {
  if (
    e.key.toLowerCase() === "o" &&
    !e.target.closest("input,select,textarea,dialog")
  )
    $("settings-open").click();
  if (e.key === "Escape" && !$("settings").open && !transaction) camera.back();
});
$("settings-open").onclick = () => {
  if (transaction || catchingUp) return;
  $("quality").value = state.settings.quality;
  $("motion").checked = camera.reducedMotion;
  $("volume").value = state.settings.audio;
  $("settings").showModal();
};
$("settings-close").onclick = () => $("settings").close();
$("quality").onchange = (e) => {
  state.settings.quality = e.target.value;
  renderer?.setQuality(e.target.value);
};
$("motion").onchange = (e) => {
  camera.reducedMotion = state.settings.reducedMotion = e.target.checked;
  root.classList.toggle("reduced", e.target.checked);
};
$("volume").oninput = (e) => {
  state.settings.audio = +e.target.value;
  audio.setVolume(+e.target.value);
};
$("export").onclick = () => {
  const a = document.createElement("a"),
    url = URL.createObjectURL(
      new Blob([encode(state)], { type: "application/json" }),
    );
  a.href = url;
  a.download = "accretion-save.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("import").onchange = async (e) => {
  if (transaction || catchingUp) return;
  try {
    const imported = decode(await e.target.files[0].text());
    composition.expanded.clear();
    adopt(imported);
    state = imported;
    composition.key = "";
    composition.sync(true);
    camera.go(state.world.p2.cl ? "array" : "universe");
    arrayView.clear();
    well.seal();
    renderer?.resetFromState(state);
    renderer?.setQuality(state.settings.quality);
    camera.reducedMotion = state.settings.reducedMotion;
    root.classList.toggle("reduced", camera.reducedMotion);
    audio.setVolume(state.settings.audio);
    displayEnergy = state.energy;
    displayMass = state.mass;
    stamp = "";
    save(state);
    $("save-message").textContent = "Save restored.";
  } catch (err) {
    $("save-message").textContent = err.message;
  }
  e.target.value = "";
};
async function catchup(seconds) {
  catchingUp = true;
  $("moment").textContent = "RECALLING THE FIELD";
  try {
    await offlineAsync(state, seconds, (p) => {
      $("moment").textContent = `RECALLING THE FIELD · ${Math.round(p * 100)}%`;
    });
    state.world.events = [];
  } finally {
    catchingUp = false;
    $("moment").textContent = "";
    clock.last = performance.now();
    stamp = "";
  }
}
document.addEventListener("visibilitychange", () => {
  const now = performance.now();
  if (document.hidden) {
    clock.hide(now, !!transaction);
    save(state);
    audio.ctx?.suspend();
  } else {
    const seconds = clock.resume(now);
    if (seconds > 0) catchup(seconds);
    audio.ctx?.resume();
  }
});
setInterval(() => {
  if (!document.hidden && !transaction && !catchingUp) save(state);
}, 5000);
window.addEventListener("pagehide", () => {
  if (!document.hidden) save(state);
});
function frame(now) {
  const rawDT = clock.frame(now),
    dt = Math.min(0.1, rawDT),
    wasTransaction = !!transaction;
  if (!document.hidden) {
    camera.update(dt);
    composition.update(dt);
    fx.reduced = camera.reducedMotion;
    fx.update(dt);
    transact(dt);
    if (!paused && !catchingUp && !transaction && !wasTransaction) {
      for (const e of tick(state, rawDT))
        if (e.type === "absorb") audio.feed(MATTER[e.item].category);
    }
    const events = drainEvents(state);
    if (events.length) renderUI();
    for (const e of events) bus.emit(e);
    const compression =
      ["anchor", "convergence"].includes(transaction?.kind) &&
      !camera.reducedMotion
        ? 1 -
          0.8 *
            Math.sin(
              Math.min(1, transaction.age / transaction.duration) * Math.PI,
            )
        : 1;
    $("world").style.transform =
      camera.transform(innerWidth, innerHeight, fx.impulse) +
      ` scale(${compression})`;
    const renderStarted = performance.now();
    const fieldPulse =
      !camera.reducedMotion &&
      ["planetary", "convergence"].includes(transaction?.kind)
        ? Math.sin(
            Math.min(1, transaction.age / transaction.duration) * Math.PI,
          )
        : 0;
    renderer?.render(
      state,
      dt,
      -1,
      fx.impulse
        ? { x: camera.x, y: camera.y, zoom: camera.zoom * (1 + fx.impulse) }
        : camera,
      fieldPulse,
    );
    const renderCPU = performance.now() - renderStarted;
    displayEnergy = displayEnergy.add(
      state.energy.sub(displayEnergy).mul(Math.min(1, dt * 14)),
    );
    displayMass = displayMass.add(
      state.mass.sub(displayMass).mul(Math.min(1, dt * 14)),
    );
    const flux = fluxPresentation.update(state.dynamics.flux, dt);
    $("flux").textContent = flux.lt(1000)
      ? flux.toNumber().toFixed(1)
      : fmt(flux);
    $("energy").textContent = fmt(displayEnergy);
    $("mass").textContent = massText(displayMass);
    if (now - lastUI > 150) {
      renderUI();
      signalUI();
      lastUI = now;
      $("coordinate").textContent =
        `${camera.targetLocation.toUpperCase()} / ${state.world.anchors ? "ANCHORED FIELD" : "SEED"}`;
    }
    if (pendingInput !== null) {
      telemetry.inputLatency.push(
        Math.max(0, performance.now() - pendingInput),
      );
      pendingInput = null;
      if (telemetry.inputLatency.length > 300) telemetry.inputLatency.shift();
    }
    if (import.meta.env.DEV)
      telemetry.timeline.push({
        renderCPU,
        ms: rawDT * 1000,
        matter: state.queue.length,
        particles: renderer?.pg.drawRange.count || 0,
        animatedDOM: document.getAnimations().length,
      });
    if (telemetry.timeline.length > 3600) telemetry.timeline.shift();
    telemetry.frames.push(rawDT * 1000);
    if (telemetry.frames.length > 3600) telemetry.frames.shift();
  }
  requestAnimationFrame(frame);
}
if (import.meta.env.DEV)
  window.__accretion = {
    get state() {
      return state;
    },
    camera,
    composition,
    bus,
    telemetry,
    renderer,
    pause: (v) => (paused = v),
    replace: (s) => {
      state = s;
      composition.expanded.clear();
      fluxPresentation.reset(s.dynamics.flux);
      arrayView.clear();
      well.seal();
      adopt(state);
      stamp = "";
      renderer?.resetFromState(state);
      renderUI();
    },
    step: (seconds) => {
      tick(state, seconds);
      stamp = "";
    },
    snapshot: () => JSON.parse(encode(state)),
  };
root.classList.toggle("reduced", camera.reducedMotion);
if (loaded.error) {
  $("save-message").textContent = loaded.error;
  fx.messages.push({ text: loaded.error, level: 5, remaining: 15 });
}
if (document.hidden) clock.hide(performance.now());
renderUI();
camera.go(state.world.p2.cl ? "array" : "universe");
window.addEventListener("resize", () => {
  if (camera.contextAttached && !activePointers.size && !transaction)
    camera.reframe(composition.target(camera.targetLocation), 0.25);
});
if (state.simulation.pendingOffline > 0 || Date.now() - state.savedAt > 2000)
  catchup(Math.max(0, (Date.now() - state.savedAt) / 1000));
requestAnimationFrame(frame);
