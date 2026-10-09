/** A seeded source of pseudo-random numbers in `[0, 1)`. */
export type Random = () => number;

/**
 * mulberry32: tiny, fast, good-enough PRNG for fixtures (not for cryptography).
 * Same seed => same sequence on every runtime, which keeps mock data deterministic.
 */
export const createRandom = (seed: number): Random => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const chance = (random: Random, probability: number): boolean => random() < probability;

export const between = (random: Random, min: number, max: number): number =>
  min + random() * (max - min);

/** Picks an entry with probability proportional to its weight. */
export const pickWeighted = <T>(random: Random, entries: readonly (readonly [T, number])[]): T => {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let threshold = random() * total;
  for (const [value, weight] of entries) {
    threshold -= weight;
    if (threshold < 0) return value;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error("pickWeighted needs at least one entry");
  return last[0];
};
