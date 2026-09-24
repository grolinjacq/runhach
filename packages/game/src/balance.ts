/**
 * Every tunable game number lives here. Values are the starting values from
 * docs/PRODUCT_SPEC.md and get tuned between test batches — bump
 * BALANCE_VERSION whenever a value changes so runs record which rules they used.
 */

export const BALANCE_VERSION = 1;

export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

export const BALANCE = {
  xp: {
    perKm: 100,
    /** XP is awarded per this many meters (pro-rated km). */
    awardStepMeters: 100,
    runCompletionBonus: 50,
    runCompletionMinMeters: 1000,
    /** Effort multiplier applied to XP is capped lower than for loot. */
    maxEffortMultiplier: 1.5,
  },

  levels: {
    /** XP needed to go from level L to L+1 = base + scale * L^exponent. */
    base: 400,
    scale: 100,
    exponent: 1.4,
    maxLevel: 50,
    skillPointsPerLevel: 1,
  },

  effort: {
    calibrationRuns: 3,
    calibrationMultiplier: 1.2,
    baselineRunCount: 10,
    baselineMaxAgeDays: 60,
    baselineMinMeters: 1000,
    pace: { factor: 4, max: 0.4 },
    distance: { factor: 0.5, max: 0.4 },
    consistency: { maxSplitVariation: 0.05, bonus: 0.1 },
    negativeSplit: { bonus: 0.1 },
    streak: { perWeek: 0.05, max: 0.25 },
    floor: 0.9,
    cap: 2.0,
  },

  loot: {
    chestEveryMeters: 1000,
    pouchMinMeters: 500,
    /** Base odds in percent, indexed like RARITIES. */
    baseWeights: [60, 25, 10, 4, 1],
    /** Each tier's weight is multiplied by luck^(tier * luckExponentPerTier). */
    luckExponentPerTier: 0.5,
    /** Guarantee a Rare+ chest after this many chests below Rare. */
    badLuckProtectionChests: 10,
  },

  antiCheat: {
    /** Sustained speed above this is treated as cycling/driving. */
    maxSpeedKmh: 25,
    maxSpeedSustainSeconds: 30,
    /** Fixes with worse reported accuracy than this are dropped. */
    maxAccuracyMeters: 30,
  },

  raids: {
    defaultWindowDays: 7,
    synergyPerTeammate: 0.1,
    synergyMax: 0.3,
    maxTeamSize: 4,
  },
} as const;
