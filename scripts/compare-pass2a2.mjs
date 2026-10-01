import fs from "node:fs";
import { simulatePass2a } from "./simulate-pass2a.mjs";
const base = JSON.parse(
  fs.readFileSync("test-results/pass2a2/baseline-routes.json", "utf8"),
);
const results = [];
for (const compression of ["complete", "early", "charged"])
  for (const policy of ["power", "automation", "deep", "plausible"]) {
    const r = simulatePass2a(policy, { compression });
    const milestone = (r, type) =>
      r.milestones.find((m) => m.type === type)?.time;
    const original = base.find((r) => r.policy === policy);
    results.push({
      policy,
      compression,
      complete: r.complete,
      reconstruction: milestone(r, "reconstruction"),
      anchor: milestone(r, "anchor"),
      convergence: milestone(r, "convergence"),
      anchorDelta: milestone(r, "anchor") - milestone(original, "anchor"),
      convergenceDelta:
        milestone(r, "convergence") - milestone(original, "convergence"),
    });
  }
fs.writeFileSync(
  "test-results/pass2a2/route-comparison.json",
  JSON.stringify(results, null, 2),
);
console.table(results);
