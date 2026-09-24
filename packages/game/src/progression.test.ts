import { describe, expect, it } from "vitest";
import { levelFromTotalXp, rarityOdds, rollRarity, xpToNextLevel } from "./progression";
import { createRng } from "./rng";

describe("level curve", () => {
  it("matches the spec's rough km-per-level targets (100 XP per km)", () => {
    expect(xpToNextLevel(1) / 100).toBeCloseTo(5, 0);
    expect(xpToNextLevel(10) / 100).toBeCloseTo(29, 0);
    expect(xpToNextLevel(20) / 100).toBeCloseTo(70, 0);
  });

  it("converts total XP into level and progress", () => {
    expect(levelFromTotalXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 500 });
    expect(levelFromTotalXp(499).level).toBe(1);
    const l2 = levelFromTotalXp(500);
    expect(l2.level).toBe(2);
    expect(l2.xpIntoLevel).toBe(0);
    expect(levelFromTotalXp(-50).level).toBe(1);
  });
});

describe("rarity odds", () => {
  it("uses the base odds at luck 1", () => {
    const odds = rarityOdds(1);
    expect(odds.common).toBeCloseTo(0.6);
    expect(odds.legendary).toBeCloseTo(0.01);
  });

  it("matches the spec example at luck 2 (~46/27/15/9/3%)", () => {
    const odds = rarityOdds(2);
    expect(Math.round(odds.common * 100)).toBe(46);
    expect(Math.round(odds.uncommon * 100)).toBe(27);
    expect(Math.round(odds.rare * 100)).toBe(15);
    expect(Math.round(odds.epic * 100)).toBe(9);
    expect(Math.round(odds.legendary * 100)).toBe(3);
  });

  it("never makes luck below 1 worse than base odds", () => {
    expect(rarityOdds(0.5)).toEqual(rarityOdds(1));
  });

  it("rolls rarities deterministically from a seed", () => {
    const a = Array.from(
      { length: 10 },
      (
        (rng) => () =>
          rollRarity(rng, 1.5)
      )(createRng("s")),
    );
    const b = Array.from(
      { length: 10 },
      (
        (rng) => () =>
          rollRarity(rng, 1.5)
      )(createRng("s")),
    );
    expect(a).toEqual(b);
  });
});
