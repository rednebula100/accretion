export const STEP = 0.1;
export const simulationState = () => ({
  carry: 0,
  steps: 0,
  pendingOffline: 0,
});
/** Caller time only enters this accumulator. Rules always run on the same 100ms lattice. */
export function advanceFixed(s, seconds, step, idle = null) {
  if (!Number.isFinite(seconds) || seconds <= 0) return [];
  const sim = (s.simulation ||= simulationState());
  const total = sim.carry + seconds;
  const count = Math.floor((total + 1e-9) / STEP);
  sim.carry = Math.max(0, Math.round((total - count * STEP) * 1e12) / 1e12);
  if (!count) return [];
  if (idle) {
    idle(count * STEP);
    sim.steps += count;
    return [];
  }
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push(...step(STEP));
    sim.steps++;
  }
  return events;
}
