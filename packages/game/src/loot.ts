import type { Rarity } from "./balance";

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
  stats: GearStats;
  /** 1-based kilometer the chest dropped at. */
  foundAtKm: number;
}

/**
 * Rolls the chest for one completed kilometer. Deterministic for
 * (seed, kmIndex, luck): uses deriveRng(seed, "km", kmIndex) and rollRarity.
 */
export function rollChest(seed: string, kmIndex: number, luck: number): LootItem {
  void seed;
  void kmIndex;
  void luck;
  throw new Error("TODO(agent A): implement rollChest");
}
