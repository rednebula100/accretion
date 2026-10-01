/** Shared up-to quote. The transaction must obtain a fresh quote at commit time. */
export function quotePurchase({ energy, unitCost, capacity, queued, count, available = true }) {
  const room = Math.max(0, capacity - queued);
  const requested = count === "MAX" ? 100 : Math.max(0, Math.min(100, Math.floor(Number(count) || 0)));
  const affordable = energy.div(unitCost).max(0).min(100).floor().toNumber();
  const quantity = available ? Math.min(requested, room, affordable) : 0;
  return { requested, quantity, unitCost, total: unitCost.mul(quantity), room,
    reason: !available ? "unavailable" : !room ? "capacity" : affordable < requested ? "energy" : room < requested ? "capacity" : null };
}
