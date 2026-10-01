import { FLOW_NODES } from "../src/data/pass1.js";
export function checkGraph() {
  const errors = [];
  for (const region of [0, 1]) {
    const nodes = FLOW_NODES.filter((n) => n.region === region).map((n) => ({
        ...n,
        parents:
          region === 1 && !n.parents.length ? ["reconstruct"] : n.parents,
      })),
      edges = [];
    nodes.push({
      id: "reconstruct",
      x: region === 0 ? 600 : 0,
      y: 0,
      parents: region === 0 ? ["deep"] : [],
    });
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i],
          b = nodes[j];
        if (Math.abs(a.x - b.x) < 144 && Math.abs(a.y - b.y) < 86)
          errors.push(`node overlap: ${a.id}/${b.id}`);
      }
    for (const n of nodes)
      for (const parent of n.parents) {
        const a = nodes.find((x) => x.id === parent);
        const points = [];
        for (let j = 0; j <= 100; j++) {
          const t = j / 100,
            u = 1 - t,
            x =
              u ** 3 * (a.x + 144) +
              3 * u * u * t * (a.x + 174) +
              3 * u * t * t * (n.x - 30) +
              t ** 3 * n.x,
            y =
              (u ** 3 + 3 * u * u * t) * (a.y + 42) +
              (3 * u * t * t + t ** 3) * (n.y + 42);
          points.push({ x, y });
          for (const other of nodes)
            if (
              other !== a &&
              other !== n &&
              x > other.x - 3 &&
              x < other.x + 147 &&
              y > other.y - 3 &&
              y < other.y + 89
            )
              errors.push(`edge ${a.id}/${n.id} crosses ${other.id}`);
        }
        edges.push({ name: `${a.id}/${n.id}`, points });
      }
    for (let i = 0; i < edges.length; i++)
      for (let j = i + 1; j < edges.length; j++) {
        const overlap = edges[i].points.filter((p) =>
          edges[j].points.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 3),
        );
        if (overlap.length > 25)
          errors.push(`long edge overlap ${edges[i].name}/${edges[j].name}`);
      }
  }
  return [...new Set(errors)];
}
if (process.argv[1]?.endsWith("check-world-graph.mjs")) {
  const errors = checkGraph();
  console.log(
    JSON.stringify({
      nodeNode: true,
      edgeNode: true,
      longEdgeOverlap: true,
      errors,
    }),
  );
  if (errors.length) process.exitCode = 1;
}
