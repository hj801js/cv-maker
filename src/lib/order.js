// Normalize a saved section order against the canonical reorderable set:
// keep saved order for known keys, drop anything unknown, append any missing
// keys (so a newly added section still shows up for an old saved order).
export function normalizeOrder(rawOrder, mainKeys) {
  const raw = Array.isArray(rawOrder) ? rawOrder : [];
  const valid = raw.filter((k) => mainKeys.includes(k));
  const missing = mainKeys.filter((k) => !valid.includes(k));
  return [...valid, ...missing];
}
