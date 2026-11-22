// Deterministic seeded RNG (mulberry32). State is a single uint32 stored in the game state.

export function nextRandom(seedHolder: { rng: number }): number {
  let t = (seedHolder.rng = (seedHolder.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(h: { rng: number }, min: number, maxInclusive: number): number {
  return min + Math.floor(nextRandom(h) * (maxInclusive - min + 1));
}

export function pick<T>(h: { rng: number }, arr: readonly T[]): T {
  return arr[Math.floor(nextRandom(h) * arr.length)];
}
