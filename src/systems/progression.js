/** A recorded reset, not a high frontier, establishes permanent system visibility. */
export function hasEvaporated(s) {
  return !!s.progress?.hasEvaporated || s.runs > 0 || s.origins > 0 || s.phenomena.includes("evaporation") || s.phenomena.includes("boundary");
}
export function hasRenewed(s) { return !!s.progress?.hasRenewed || s.origins > 0 || s.phenomena.includes("boundary"); }
