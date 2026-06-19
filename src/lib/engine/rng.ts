/** Small, fast, seedable PRNG utilities for the simulation. */

/** mulberry32 — deterministic uniform [0,1) generator from a 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box–Muller gaussian with mean 0 and the given standard deviation. */
export function gaussian(rand: () => number, stddev: number): number {
  if (stddev === 0) return 0
  let u = 0
  let v = 0
  // avoid log(0)
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  const mag = Math.sqrt(-2.0 * Math.log(u))
  return mag * Math.cos(2.0 * Math.PI * v) * stddev
}

/** Uniform float in [min, max). */
export function range(rand: () => number, min: number, max: number): number {
  return min + (max - min) * rand()
}

/** Random integer in [min, max] inclusive. */
export function intRange(rand: () => number, min: number, max: number): number {
  return Math.floor(range(rand, min, max + 1))
}
