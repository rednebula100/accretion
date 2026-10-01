import {
  ARRAY_TYPES,
  ARRAY_TECH,
  SOCKETS,
  inventory,
  validLayout,
  solveArray,
  applyArray,
  buyArrayTech,
} from "../systems/array.js";
import {
  regime,
  planetaryChannels,
  breachPlanetary,
  seedChannels,
  constructSeed,
  convergenceGain,
} from "../systems/spatial-progression.js";
import { record } from "../systems/world.js";
export function mountArrayView(
  world,
  getState,
  travel,
  reset,
  blocked,
  detail = () => {},
) {
  world.insertAdjacentHTML(
    "beforeend",
    `<section id="planetary" class="planetary" hidden><svg viewBox="0 0 700 700"><circle cx="350" cy="350" r="330"/>${[0, 1, 2].map((i) => `<circle class="planet-channel" data-pc="${i}" cx="350" cy="350" r="318" transform="rotate(${i * 120 - 90} 350 350)"/>`).join("")}</svg><div class="planet-console"><small id="planet-stage"></small><h2>Planetary Boundary</h2><p>The field bends. Worlds demand a stronger embrace.</p><div><button data-travel="anchor">Field stability</button><button data-travel="structure">Structural handling</button><button data-travel="dynamics">Dynamic coupling</button></div><button id="breach">BREACH</button></div></section>
  <section id="array-machine" class="array-machine" hidden><svg id="array-wires" viewBox="-360 -360 720 720"></svg><div id="array-sockets"></div><div id="seed-components"></div><div class="array-console" data-gesture><small id="array-stage"></small><h2><button class="array-title" data-travel="array">Accretion Array ↗</button></h2><p id="array-summary"></p><div id="array-toolbar"><button id="array-plan">Plan configuration</button><button id="array-apply" hidden>APPLY CONFIGURATION</button><button id="array-cancel" hidden>Discard plan</button></div><div id="array-palette"></div><output id="array-preview"></output><button id="converge">CONVERGE</button><div id="array-tech"></div></div></section>`,
  );
  const $ = (id) => document.getElementById(id);
  let draft = null,
    selected = null,
    from = null,
    signature = "",
    gesture = null,
    suppressClick = false;
  function place(destination) {
    if (!draft || blocked()) return;
    const next = [...draft];
    if (from !== null) {
      if (destination === null) next[from] = null;
      else [next[from], next[destination]] = [next[destination], next[from]];
    } else if (destination !== null) next[destination] = selected;
    if (validLayout(next, getState().world.p2.tech)) draft = next;
    selected = null;
    from = null;
    signature = "";
    render();
  }
  $("array-plan").onclick = () => {
    if (blocked()) return;
    draft = [...getState().world.p2.layout];
    signature = "";
    render();
    detail(2);
  };
  $("array-cancel").onclick = () => {
    draft = null;
    selected = null;
    from = null;
    signature = "";
    render();
    detail(1);
  };
  $("array-apply").onclick = () => {
    if (blocked() || !draft) return;
    if (applyArray(getState(), draft)) {
      record(getState(), "array-apply");
      draft = null;
      signature = "";
      render();
      detail(1);
    }
  };
  $("breach").onclick = () => {
    if (!blocked()) reset("planetary");
  };
  $("converge").onclick = () => {
    if (!blocked()) reset("convergence");
  };
  $("array-machine").addEventListener("click", (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (blocked()) return;
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.tech) {
      if (buyArrayTech(getState(), b.dataset.tech))
        record(getState(), "array-tech", { id: b.dataset.tech });
      signature = "";
      render();
    }
    if (b.dataset.segment) {
      const id = b.dataset.segment;
      if (!constructSeed(getState(), id))
        travel({ field: "anchor", flow: "dynamics", link: "structure" }[id]);
      signature = "";
      render();
    }
    if (b.dataset.module) {
      selected = b.dataset.module;
      from = null;
      signature = "";
      render();
    }
    if (b.dataset.socket !== undefined && draft) {
      const i = Number(b.dataset.socket);
      if (selected !== null || from !== null) place(i);
      else if (draft[i]) {
        from = i;
        selected = draft[i];
        signature = "";
        render();
      }
    }
    if (b.id === "array-remove") place(null);
  });
  // Pointer-owned drag, with the exact same click/tap placement as fallback.
  $("array-machine").addEventListener("pointerdown", (e) => {
    const b = e.target.closest("[data-module],[data-socket]");
    if (!b || !draft || blocked() || e.button !== 0) return;
    const i = b.dataset.socket === undefined ? null : Number(b.dataset.socket),
      m = i === null ? b.dataset.module : draft[i];
    if (!m) return;
    e.preventDefault();
    gesture = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      from: i,
      module: m,
      moved: false,
    };
    $("array-machine").setPointerCapture(e.pointerId);
  });
  $("array-machine").addEventListener("pointermove", (e) => {
    if (
      gesture &&
      e.pointerId === gesture.id &&
      Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 5
    ) {
      gesture.moved = true;
      $("array-machine").classList.add("module-drag");
    }
  });
  const end = (e) => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const g = gesture;
    gesture = null;
    $("array-machine").classList.remove("module-drag");
    if ($("array-machine").hasPointerCapture(e.pointerId))
      $("array-machine").releasePointerCapture(e.pointerId);
    if (e.type === "pointerup") {
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
      if (g.moved) {
        const target = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest("[data-socket]");
        if (target) {
          selected = g.module;
          from = g.from;
          place(Number(target.dataset.socket));
        }
      } else if (g.from !== null && (selected !== null || from !== null)) {
        place(g.from);
      } else {
        selected = g.module;
        from = g.from;
        signature = "";
        render();
      }
    }
  };
  for (const t of ["pointerup", "pointercancel", "lostpointercapture"])
    $("array-machine").addEventListener(t, end);
  function render() {
    const s = getState(),
      w = s.world,
      p = w.p2,
      visible = p.cl || w.modules.includes("surveyor");
    $("planetary").hidden =
      w.planetary === "HIDDEN" ||
      w.capabilities.includes("CAP_PLANETARY_BINDING") ||
      !!p.cl;
    $("planetary").dataset.stage = w.planetary;
    $("planet-stage").textContent = w.planetary;
    $("breach").disabled = w.planetary !== "READY";
    planetaryChannels(s).forEach(
      (v, i) =>
        (world.querySelector(`[data-pc="${i}"]`).style.strokeDasharray =
          `${v * 625} 2100`),
    );
    for (let r = 0; r < 3; r++)
      $("array-machine").style.setProperty(
        "--ring-" + r,
        Math.max(0, Math.min(1, p.live * 3 - r)),
      );
    $("array-machine").style.setProperty("--array-power", p.live);
    $("array-machine").dataset.live = p.live > 0.05 ? "true" : "false";
    $("array-machine").hidden = !visible;
    if (!visible) return;
    $("array-machine").classList.toggle(
      "echo",
      !p.cl && !w.modules.includes("fabricator"),
    );
    $("array-machine").classList.toggle("planning", !!draft);
    const layout = draft || p.layout,
      metrics = solveArray(layout, p.tech),
      live = solveArray(p.layout, p.tech);
    $("array-stage").textContent = p.cl
      ? `CL ${p.cl} · ${p.alignment} ALIGNMENT · ${p.live < 1 ? "REPOWERING" : "ONLINE"}`
      : regime(s) < 4
        ? "RADIAL ECHO"
        : "ARRAY SEED";
    $("array-summary").textContent = p.cl
      ? `FLOW ${live.throughput.toFixed(2)} · STRESS ${(live.peak * 100).toFixed(0)}% · OUTPUT ${(live.flux * p.live * 2).toFixed(2)} F/s`
      : "Anchor, Dynamics and Structure are converging on one geometry.";
    $("array-preview").textContent = draft
      ? `Flow Δ ${(metrics.throughput - live.throughput).toFixed(2)} · Flux Δ ${((metrics.flux - live.flux) * 2).toFixed(2)}/s · Energy Δ ${((metrics.energy - live.energy) * 100).toFixed(0)}% · Stress ${(metrics.peak * 100).toFixed(0)}% (${((metrics.peak - live.peak) * 100).toFixed(0)}) · Potential at full power Δ ${((metrics.quality ** 2 - live.quality ** 2) * 21 * (0.8 + 0.2 * Math.min(1, Math.max(0, s.highest) / 79)) * (p.tech.includes("compression") ? 1.25 : 1)).toFixed(1)}%/min`
      : p.cl
        ? `CONVERGENCE POTENTIAL ${p.potential.toFixed(1)}% · ${p.live < 1 ? "Outer → mid → inner reactivation" : "Flow × frontier × efficiency"}`
        : "";
    $("converge").hidden = !p.seedBuilt;
    $("converge").disabled = !convergenceGain(s);
    $("converge").textContent = `CONVERGE · +${convergenceGain(s)} ALIGNMENT`;
    $("array-toolbar").hidden = !p.cl;
    $("array-plan").hidden = !!draft;
    $("array-apply").hidden = !draft;
    $("array-cancel").hidden = !draft;
    const key = JSON.stringify([
      p.cl,
      p.tech,
      p.alignment,
      layout,
      selected,
      from,
      !!draft,
      w.seed,
      w.modules,
      p.cl ? null : seedChannels(s),
    ]);
    if (key === signature) return;
    signature = key;
    $("array-wires").innerHTML = p.cl
      ? metrics.edges
          .map((e) => {
            const a = SOCKETS[e.a],
              b = SOCKETS[e.b];
            return `<path class="array-edge" d="M${a.x} ${a.y} L${b.x} ${b.y}" style="stroke-width:${1 + Math.abs(e.q) * 7};opacity:calc(.2 + ${Math.min(1, Math.abs(e.q) * 2) * 0.8} * var(--ring-${b.ring},0));--direction:${e.q >= 0 ? -1 : 1}"/>`;
          })
          .join("") +
        SOCKETS.filter(
          (n) => n.ring === 2 && (n.id !== 8 || p.tech.includes("radial")),
        )
          .map((n) => `<path class="array-edge" d="M${n.x} ${n.y} L0 0"/>`)
          .join("")
      : `<circle class="seed-ring" cx="0" cy="0" r="260" stroke-dasharray="${p.seedBuilt ? "2000" : "130 410"}"/>`;
    $("array-sockets").innerHTML = p.cl
      ? SOCKETS.filter((n) => n.id !== 8 || p.tech.includes("radial"))
          .map(
            (n) =>
              `<button class="array-socket ${from === n.id ? "selected" : ""}" data-gesture data-socket="${n.id}" style="left:${n.x}px;top:${n.y}px;opacity:calc(.4 + var(--ring-${n.ring},0)*.6);--heat:${metrics.stress[n.id] > 1.25 ? "#de7a69" : metrics.stress[n.id] > 1 ? "#edbb72" : "#79c7c7"}"><small>${["OUTER", "MID", "INNER"][n.ring]} ${n.spoke + 1}</small><strong>${ARRAY_TYPES[layout[n.id]]?.name || "Empty"}</strong><span>${(metrics.stress[n.id] * 100).toFixed(0)}% stress</span></button>`,
          )
          .join("")
      : "";
    const channels = seedChannels(s);
    $("seed-components").innerHTML = p.cl
      ? ""
      : ["field", "flow", "link"]
          .map(
            (id, i) =>
              `<button class="seed-part ${w.seed[id] ? "built" : ""}" data-segment="${id}" style="left:${SOCKETS[i].x}px;top:${SOCKETS[i].y}px" ${!w.modules.includes("fabricator") ? "disabled" : ""}><strong>${["Field Segment", "Flow Coupler", "Central Link"][i]}</strong><meter min="0" max="1" value="${w.seed[id] || channels[id]}"></meter><span>${w.seed[id] ? "INTEGRATED" : channels[id] >= 1 ? "ASSEMBLE" : `TRACE ${["FIELD", "FLOW", "LOAD"][i]}`}</span></button>`,
          )
          .join("");
    $("array-palette").innerHTML = draft
      ? Object.entries(ARRAY_TYPES)
          .map(
            ([id, m]) =>
              `<button data-module="${id}" class="${selected === id ? "selected" : ""}" title="${m.help}">${m.name} · ${inventory(p.tech)[id] - draft.filter((v) => v === id).length}</button>`,
          )
          .join("") +
        '<button id="array-remove">Return selected module</button><small>Tap module, then socket. Or drag. Inlet: outer · Sink: inner. Moving is free.</small>'
      : "";
    $("array-tech").innerHTML = p.cl
      ? ARRAY_TECH.map(
          (n) =>
            `<button data-tech="${n.id}" ${p.tech.includes(n.id) || p.alignment < n.cost ? "disabled" : ""}><strong>${n.name}</strong><span>${n.effect}</span><b>${p.tech.includes(n.id) ? "OWNED" : n.cost + " A"}</b></button>`,
        ).join("")
      : "";
  }
  return {
    get dragging() {
      return !!gesture;
    },
    get planning() {
      return !!draft;
    },
    render,
    clear: () => {
      draft = null;
      selected = null;
      from = null;
      signature = "";
    },
  };
}
