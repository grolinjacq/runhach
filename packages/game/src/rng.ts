/**
 * Deterministic, seedable random numbers.
 *
 * The server hands out a seed when a run starts. The phone and the server both
 * derive every roll from that seed, so the phone can announce loot live (even
 * offline) and the server can re-derive and verify the exact same result.
 */

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** Uniformly picks one element. Throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /** Picks an index with probability proportional to its weight. */
  weightedIndex(weights: readonly number[]): number;
}

/** cyrb128: hashes a string into four 32-bit seeds. */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** sfc32: small, fast PRNG with a 128-bit state. */
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const next = sfc32(...cyrb128(seed));
  // Discard the first outputs; sfc32 needs a few rounds to mix a fresh state.
  for (let i = 0; i < 12; i++) next();

  return {
    next,
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new RangeError(`Invalid int range [${min}, ${max}]`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      if (items.length === 0) throw new RangeError("Cannot pick from an empty array");
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    weightedIndex(weights) {
      let total = 0;
      for (const w of weights) {
        if (!(w >= 0) || !Number.isFinite(w)) throw new RangeError(`Invalid weight ${w}`);
        total += w;
      }
      if (total <= 0) throw new RangeError("Weights must sum to more than 0");
      let roll = next() * total;
      for (let i = 0; i < weights.length; i++) {
        roll -= weights[i] as number;
        if (roll < 0) return i;
      }
      return weights.length - 1;
    },
  };
}

/**
 * Derives an independent stream for one named event, e.g. `deriveRng(seed, "km", 3)`.
 * Rolls stay stable no matter in which order events are evaluated.
 */
export function deriveRng(seed: string, ...parts: Array<string | number>): Rng {
  return createRng([seed, ...parts].join(":"));
}

// Web Crypto is global in browsers, Workers and Node 20+. Declared locally so this
// package doesn't need DOM or Node type definitions.
declare const crypto: { getRandomValues<T extends Uint8Array>(array: T): T };

/** Random seed for a new run (server side). Uses the platform CSPRNG. */
export function newSeed(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
