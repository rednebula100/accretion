// CL1 reduction of the canonical nodal-conductance prototype. No layout search in runtime.
export const ARRAY_TYPES = {
  inlet: {
    name: "Inlet",
    c: 1.25,
    stress: 0.45,
    help: "Outer source · feeds the network",
  },
  shear: {
    name: "Shear",
    c: 0.95,
    stress: 1.55,
    help: "Flow becomes Flux · strongest in mid ring",
  },
  stabilizer: {
    name: "Stabilizer",
    c: 0.9,
    stress: 0.25,
    help: "Supports this socket and connected neighbors",
  },
  sink: {
    name: "Sink",
    c: 1.15,
    stress: 0.55,
    help: "Inner coupling · drains flow into the black hole",
  },
};
export const ARRAY_TECH = [
  {
    id: "capacity",
    name: "Frame Capacity I",
    cost: 3,
    effect: "Local capacity +18%",
  },
  {
    id: "radial",
    name: "Radial Extension I",
    cost: 5,
    effect: "Open ninth socket and a radial path",
  },
  {
    id: "shear",
    name: "Shear Template II",
    cost: 4,
    effect: "One extra Shear copy",
  },
  {
    id: "afterimage",
    name: "Anchor Afterimage I",
    cost: 6,
    effect: "12 dormant Residue · known recovery ×2",
  },
  {
    id: "compression",
    name: "Potential Compression I",
    cost: 7,
    effect: "Potential gain +25%",
  },
];
export const SOCKETS = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  ring: Math.floor(i / 3),
  spoke: i % 3,
  x:
    Math.cos(((i % 3) * Math.PI * 2) / 3 - Math.PI / 2) *
    [350, 210, 70][Math.floor(i / 3)],
  y:
    Math.sin(((i % 3) * Math.PI * 2) / 3 - Math.PI / 2) *
    [350, 210, 70][Math.floor(i / 3)],
}));
export function inventory(tech = []) {
  return {
    inlet: 2,
    shear: tech.includes("shear") ? 3 : 2,
    stabilizer: 2,
    sink: 2,
  };
}
export function validLayout(layout, tech = []) {
  if (!Array.isArray(layout) || layout.length !== 9) return false;
  const left = inventory(tech);
  return layout.every((m, i) => {
    if (m === null) return true;
    if (
      !ARRAY_TYPES[m] ||
      (i === 8 && !tech.includes("radial")) ||
      --left[m] < 0
    )
      return false;
    return !(m === "inlet" && i > 2) && !(m === "sink" && i < 6);
  });
}
const cache = new Map();
export function solveArray(layout, tech = []) {
  if (!validLayout(layout, tech)) throw Error("Invalid Array configuration");
  const key = JSON.stringify([layout, [...tech].sort()]);
  if (cache.has(key)) return cache.get(key);
  const active = SOCKETS.filter((n) => n.id !== 8 || tech.includes("radial"));
  const edges = [];
  const mod = (i) => ARRAY_TYPES[layout[i]] || { c: 0.18, stress: 0.2 };
  const add = (a, b, base) =>
    edges.push({ a, b, g: base * Math.sqrt(mod(a).c * mod(b).c) });
  for (const n of active) {
    if (active.some((x) => x.id === n.id + 3)) add(n.id, n.id + 3, 1);
    // Circumferential paths limited to processing ring. Outer/inner keep identity.
    if (n.ring === 1) add(n.id, 3 + ((n.spoke + 1) % 3), 0.38);
  }
  const source = (i) => layout[i] === "inlet";
  const unknown = active.filter((n) => !source(n.id)).map((n) => n.id);
  const A = unknown.map(() => Array(unknown.length + 1).fill(0));
  const coupling = (i) => (i >= 6 ? (layout[i] === "sink" ? 1.65 : 0.2) : 0);
  unknown.forEach((id, row) => {
    A[row][row] += coupling(id) + 1e-9;
    for (const e of edges) {
      if (e.a !== id && e.b !== id) continue;
      const j = e.a === id ? e.b : e.a;
      A[row][row] += e.g;
      if (source(j)) A[row][unknown.length] += e.g;
      else A[row][unknown.indexOf(j)] -= e.g;
    }
  });
  for (let col = 0; col < unknown.length; col++) {
    let pivot = col;
    for (let r = col + 1; r < unknown.length; r++)
      if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    [A[col], A[pivot]] = [A[pivot], A[col]];
    const div = A[col][col];
    for (let j = col; j <= unknown.length; j++) A[col][j] /= div;
    for (let r = 0; r < unknown.length; r++)
      if (r !== col) {
        const f = A[r][col];
        for (let j = col; j <= unknown.length; j++) A[r][j] -= f * A[col][j];
      }
  }
  const potential = Array(9).fill(0);
  for (const n of active)
    potential[n.id] = source(n.id)
      ? 1
      : A[unknown.indexOf(n.id)][unknown.length];
  const flow = Array(9).fill(0),
    balance = Array(9).fill(0);
  for (const e of edges) {
    e.q = e.g * (potential[e.a] - potential[e.b]);
    flow[e.a] += Math.abs(e.q);
    flow[e.b] += Math.abs(e.q);
    balance[e.a] += e.q;
    balance[e.b] -= e.q;
  }
  let rawThroughput = 0;
  for (const n of active) {
    const sink = coupling(n.id) * potential[n.id];
    rawThroughput += sink;
    flow[n.id] = (flow[n.id] + sink) * 0.5;
    balance[n.id] += sink;
  }
  const stress = flow.map((f, i) => {
    let cap = 0.62 * (tech.includes("capacity") ? 1.18 : 1);
    if (layout[i] === "stabilizer") cap += 0.75;
    for (const e of edges)
      if (
        (e.a === i && layout[e.b] === "stabilizer") ||
        (e.b === i && layout[e.a] === "stabilizer")
      )
        cap += 0.34;
    return (1.65 * f * mod(i).stress) / cap;
  });
  const peak = Math.max(...stress);
  const efficiency =
    peak <= 1
      ? 1
      : peak <= 1.25
        ? 1 + (0.18 * (peak - 1)) / 0.25
        : 1.18 * Math.max(0.08, Math.exp(-3.2 * (peak - 1.25)));
  const throughput = rawThroughput * efficiency;
  const flux =
    flow.reduce(
      (a, f, i) =>
        a +
        (layout[i] === "shear" ? f * [0.82, 1.16, 1][Math.floor(i / 3)] : 0),
      0,
    ) * efficiency;
  const energy = throughput * 0.45;
  const quality =
    throughput ** 0.52 * (1 + flux) ** 0.18 * (1 + energy) ** 0.12;
  const result = {
    potential,
    flow,
    stress,
    peak,
    edges,
    balance,
    rawThroughput,
    throughput,
    flux,
    energy,
    quality,
    efficiency,
  };
  if (cache.size > 512) cache.clear();
  cache.set(key, result);
  return result;
}
export function applyArray(s, layout) {
  const a = s.world.p2;
  if (!a.cl || !validLayout(layout, a.tech)) return false;
  a.blueprint = [...layout];
  a.layout = [...layout];
  a.revision++;
  return true;
}
export function buyArrayTech(s, id) {
  const p = s.world.p2,
    n = ARRAY_TECH.find((n) => n.id === id);
  if (!p.cl || !n || p.tech.includes(id) || p.alignment < n.cost) return false;
  p.alignment -= n.cost;
  p.tech.push(id);
  p.revision++;
  return true;
}
