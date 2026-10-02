/** Parses pack labels like "250g", "1 kg", "1.25 kg". Returns null for labels that are not a weight. */
export function parseGrams(label: string): number | null {
  const match = label.toLowerCase().match(/([\d.]+)\s*(kg|g)\b/);
  if (!match) return null;
  const grams = Number(match[1]) * (match[2] === "kg" ? 1000 : 1);
  return Number.isFinite(grams) && grams > 0 ? Math.round(grams) : null;
}

export function formatGrams(grams: number): string {
  if (grams < 1000) return `${grams}g`;
  const kg = grams / 1000;
  return `${Number.isInteger(kg) ? kg : Number(kg.toFixed(2))} kg`;
}

export const MAX_ORDER_GRAMS = 5000;

export type Pack = { id: string; grams: number; price: number; mrp: number; max: number };
export type PackPlan = { grams: number; price: number; mrp: number; counts: Record<string, number> };

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Every total weight (up to `maxGrams`) that the given packs can make, each with the cheapest
 * combination of packs. Ties go to the combination with fewer packs.
 */
export function planWeights(packs: Pack[], maxGrams = MAX_ORDER_GRAMS): PackPlan[] {
  const usable = packs.filter((pack) => pack.grams > 0 && pack.max > 0 && pack.grams <= maxGrams);
  if (!usable.length) return [];
  const unit = usable.reduce((acc, pack) => gcd(acc, pack.grams), usable[0].grams);
  const limit = Math.floor(maxGrams / unit);

  type Cell = { price: number; mrp: number; packs: number; counts: Record<string, number> } | null;
  let table: Cell[] = Array.from({ length: limit + 1 }, () => null);
  table[0] = { price: 0, mrp: 0, packs: 0, counts: {} };

  for (const pack of usable) {
    const size = pack.grams / unit;
    const next = table.slice();
    for (let t = 0; t <= limit; t += 1) {
      const base = table[t];
      if (!base) continue;
      for (let k = 1; k <= pack.max && t + k * size <= limit; k += 1) {
        const target = t + k * size;
        const candidate = {
          price: base.price + k * pack.price,
          mrp: base.mrp + k * pack.mrp,
          packs: base.packs + k,
          counts: { ...base.counts, [pack.id]: k },
        };
        const current = next[target];
        if (!current || candidate.price < current.price || (candidate.price === current.price && candidate.packs < current.packs)) {
          next[target] = candidate;
        }
      }
    }
    table = next;
  }

  const plans: PackPlan[] = [];
  table.forEach((cell, index) => {
    if (cell && index > 0) plans.push({ grams: index * unit, price: cell.price, mrp: cell.mrp, counts: cell.counts });
  });
  return plans;
}
