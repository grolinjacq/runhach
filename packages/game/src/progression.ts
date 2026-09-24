import { BALANCE, RARITIES, type Rarity } from "./balance";
import type { Rng } from "./rng";

/** XP needed to advance from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  const { base, scale, exponent } = BALANCE.levels;
  return Math.round(base + scale * level ** exponent);
}

/** Converts lifetime XP into a level plus progress towards the next one. */
export function levelFromTotalXp(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (level < BALANCE.levels.maxLevel && remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level++;
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: xpToNextLevel(level) };
}

/** Rarity weights after applying luck (see PRODUCT_SPEC §7). */
export function rarityWeights(luck: number): number[] {
  const safeLuck = Math.max(1, luck);
  const { baseWeights, luckExponentPerTier } = BALANCE.loot;
  return baseWeights.map((w, tier) => w * safeLuck ** (tier * luckExponentPerTier));
}

/** Rarity odds as fractions summing to 1. */
export function rarityOdds(luck: number): Record<Rarity, number> {
  const weights = rarityWeights(luck);
  const total = weights.reduce((a, b) => a + b, 0);
  return Object.fromEntries(RARITIES.map((r, i) => [r, (weights[i] as number) / total])) as Record<
    Rarity,
    number
  >;
}

export function rollRarity(rng: Rng, luck: number): Rarity {
  return RARITIES[rng.weightedIndex(rarityWeights(luck))] as Rarity;
}
