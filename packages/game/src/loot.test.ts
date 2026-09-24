import { describe, expect, it } from "vitest";
import { rollChest, type GearStats } from "./loot";

const total = (s: GearStats) => s.strength + s.dexterity + s.intellect + s.luck;

describe("rollChest", () => {
  it("is deterministic for the same seed, km and luck", () => {
    expect(rollChest("abc", 3, 1)).toEqual(rollChest("abc", 3, 1));
  });

  it("uses `${seed}:${kmIndex}` as id and records the km", () => {
    const item = rollChest("seed-x", 7, 1);
    expect(item.id).toBe("seed-x:7");
    expect(item.foundAtKm).toBe(7);
    expect(item.name.length).toBeGreaterThan(0);
  });

  it("gives legendary items more stat points than common ones", () => {
    let common: GearStats | undefined;
    let legendary: GearStats | undefined;
    for (let i = 1; i < 5000 && (!common || !legendary); i++) {
      const item = rollChest("stats", i, 50);
      if (item.rarity === "common") common ??= item.stats;
      if (item.rarity === "legendary") legendary ??= item.stats;
    }
    expect(common).toBeDefined();
    expect(legendary).toBeDefined();
    expect(total(legendary as GearStats)).toBeGreaterThan(total(common as GearStats));
  });

  it("reaches every slot within 200 rolls", () => {
    const slots = new Set(Array.from({ length: 200 }, (_, i) => rollChest("slots", i + 1, 1).slot));
    expect([...slots].sort()).toEqual(["armor", "boots", "trinket", "weapon"]);
  });
});
