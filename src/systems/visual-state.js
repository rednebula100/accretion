import { has } from "../engine.js";
import { effectiveSpin } from "./trials.js";
const clamp = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
/** Bounded visual aggregates, never inputs to the economy. No discrete era radius. */
export function visualState(s) {
  const mass = clamp((s.mass.max("1e-13").log10().toNumber() + 13) / 43);
  const processed = clamp(Math.log1p(s.runAbsorbed) / Math.log(2001));
  const groups =
    ["capture", "disk", "queue", "thermal", "planetary", "stellar"].filter(
      (e) => has(s, e),
    ).length / 6;
  const maturity = smooth(mass * 0.7 + processed * 0.2 + groups * 0.1);
  const paidQueue = s.queue.reduce(
    (n, q) => n + (Number(q.cost) > 0 ? 1 : 0),
    0,
  );
  const traffic = 1 - Math.exp(-paidQueue / 18),
    recent = 1 - Math.exp(-(s.dynamics?.paidActivity || 0) / 8);
  const activity = clamp(0.58 * recent + 0.42 * traffic);
  const diversity = clamp((s.dynamics?.paid.length || 0) / 160);
  const spin = has(s, "spin") ? effectiveSpin(s) : 0;
  const organization = clamp(
    groups * 0.45 +
      diversity * 0.25 +
      Math.min(1, (s.dynamics?.coherence?.add(1).log10().toNumber() || 0) / 2) *
        0.3,
  );
  const magnetism = clamp(
    (has(s, "jets") ? 0.4 : 0) +
      (has(s, "stellar") ? 0.2 : 0) +
      (has(s, "tides") ? 0.15 : 0) +
      organization * 0.25,
  );
  return {
    maturity,
    activity,
    organization,
    traffic,
    radius: 0.08 + 0.43 * maturity,
    disk:
      has(s, "disk") || s.world?.apparatus.includes("field")
        ? clamp(0.2 + 0.35 * maturity + 0.45 * activity)
        : 0,
    spin,
    temperature: 0.23 + 0.16 * maturity + 0.13 * activity,
    jets: clamp((spin - 0.3) / 0.68) ** 2 * magnetism * activity,
    turbulence: clamp(
      activity * (0.4 + 0.6 * traffic) * (1 - 0.35 * organization),
    ),
    environment: clamp(0.65 * mass + 0.2 * diversity + 0.15 * processed),
    distance: 9.7 + 2.8 * clamp(0.7 * mass + 0.3 * diversity),
  };
}
