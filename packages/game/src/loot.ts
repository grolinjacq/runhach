import type { Rarity } from "./balance";
import { rollRarity } from "./progression";
import { deriveRng, type Rng } from "./rng";

export type GearSlot = "weapon" | "armor" | "boots" | "trinket";

export interface GearStats {
  strength: number;
  dexterity: number;
  intellect: number;
  luck: number;
}

export interface LootItem {
  /** Stable id: `${seed}:${kmIndex}` */
  id: string;
  name: string;
  rarity: Rarity;
  slot: GearSlot;
  /** Item type, lowercase (e.g. "sword", "sandals"); picks the pixel-art sprite. */
  base?: string;
  stats: GearStats;
  /** 1-based kilometer the chest dropped at. */
  foundAtKm: number;
}

export const GEAR_SLOTS: readonly GearSlot[] = ["weapon", "armor", "boots", "trinket"];

export const BASE_NAMES: Record<GearSlot, readonly string[]> = {
  weapon: ["Sword", "Bow", "Staff", "Axe", "Dagger", "Mace"],
  armor: ["Tunic", "Chainmail", "Robe", "Jerkin", "Breastplate"],
  boots: ["Sandals", "Treads", "Striders", "Sneakers", "Greaves"],
  trinket: ["Amulet", "Ring", "Charm", "Talisman", "Pendant"],
};

const PREFIXES: Record<Rarity, readonly string[]> = {
  common: ["Worn", "Plain", "Dusty", "Humble"],
  uncommon: ["Sturdy", "Trusty", "Polished", "Swift"],
  rare: ["Gleaming", "Enchanted", "Moonlit", "Runed"],
  epic: ["Stormforged", "Dragonbone", "Starlit", "Phoenix"],
  legendary: ["Mythic", "Eternal", "Godspeed", "Marathoner's"],
};

const SUFFIXES = [
  "of the Swift Stride",
  "of Second Wind",
  "of the Long Road",
  "of Negative Splits",
  "of the Early Bird",
  "of the Hill Sprint",
  "of the Final Kick",
] as const;

/** Chance of a running-themed suffix, indexed by rarity tier. */
const SUFFIX_CHANCE: Record<Rarity, number> = {
  common: 0.1,
  uncommon: 0.25,
  rare: 0.5,
  epic: 0.8,
  legendary: 1,
};

/** Total stat points per rarity. */
export const STAT_POINTS: Record<Rarity, number> = {
  common: 2,
  uncommon: 4,
  rare: 7,
  epic: 11,
  legendary: 16,
};

const STAT_KEYS = ["strength", "dexterity", "intellect", "luck"] as const;

/** Relative weight each stat gets per slot (order: STR, DEX, INT, LUCK). */
const SLOT_BIAS: Record<GearSlot, readonly number[]> = {
  weapon: [4, 3, 1, 1],
  armor: [5, 1, 1, 1],
  boots: [1, 5, 1, 1],
  trinket: [1, 1, 3, 4],
};

function rollStats(rng: Rng, slot: GearSlot, rarity: Rarity): GearStats {
  const stats: GearStats = { strength: 0, dexterity: 0, intellect: 0, luck: 0 };
  const bias = SLOT_BIAS[slot];
  for (let i = 0; i < STAT_POINTS[rarity]; i++) {
    const key = STAT_KEYS[rng.weightedIndex(bias)] as (typeof STAT_KEYS)[number];
    stats[key]++;
  }
  return stats;
}

/**
 * Rolls the chest for one completed kilometer. Deterministic for
 * (seed, kmIndex, luck): uses deriveRng(seed, "km", kmIndex) and rollRarity.
 */
export function rollChest(seed: string, kmIndex: number, luck: number): LootItem {
  const rng = deriveRng(seed, "km", kmIndex);
  const rarity = rollRarity(rng, luck);
  const slot = rng.pick(GEAR_SLOTS);
  const base = rng.pick(BASE_NAMES[slot]);
  const prefix = rng.pick(PREFIXES[rarity]);
  const suffix = rng.next() < SUFFIX_CHANCE[rarity] ? ` ${rng.pick(SUFFIXES)}` : "";
  const stats = rollStats(rng, slot, rarity);
  return {
    id: `${seed}:${kmIndex}`,
    name: `${prefix} ${base}${suffix}`,
    rarity,
    slot,
    base: base.toLowerCase(),
    stats,
    foundAtKm: kmIndex,
  };
}
