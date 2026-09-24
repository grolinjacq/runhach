import { describe, expect, it } from "vitest";
import { createRng, deriveRng, newSeed } from "./rng";

describe("createRng", () => {
  it("is deterministic for the same seed", () => {
    const a = createRng("seed-1");
    const b = createRng("seed-1");
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
  });

  it("differs between seeds", () => {
    expect(createRng("seed-1").next()).not.toEqual(createRng("seed-2").next());
  });

  it("stays in [0, 1) and is roughly uniform", () => {
    const rng = createRng("uniform");
    const buckets = new Array<number>(10).fill(0);
    const n = 100_000;
    for (let i = 0; i < n; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      buckets[Math.floor(x * 10)]!++;
    }
    for (const count of buckets) expect(count / n).toBeCloseTo(0.1, 1);
  });

  it("int() covers the inclusive range", () => {
    const rng = createRng("dice");
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(rng.int(1, 6));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(() => rng.int(3, 1)).toThrow(RangeError);
  });

  it("weightedIndex() follows the weights and never picks zero weight", () => {
    const rng = createRng("weights");
    const counts = [0, 0, 0];
    for (let i = 0; i < 30_000; i++) counts[rng.weightedIndex([1, 0, 2])]!++;
    expect(counts[1]).toBe(0);
    expect(counts[2]! / counts[0]!).toBeCloseTo(2, 0);
    expect(() => rng.weightedIndex([0, 0])).toThrow(RangeError);
  });
});

describe("deriveRng", () => {
  it("gives the same stream for the same event regardless of call order", () => {
    const km3 = deriveRng("run-seed", "km", 3).next();
    deriveRng("run-seed", "km", 1).next();
    expect(deriveRng("run-seed", "km", 3).next()).toBe(km3);
    expect(deriveRng("run-seed", "km", 4).next()).not.toBe(km3);
  });
});

describe("newSeed", () => {
  it("returns 32 hex chars and is unique", () => {
    const a = newSeed();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(newSeed()).not.toBe(a);
  });
});
