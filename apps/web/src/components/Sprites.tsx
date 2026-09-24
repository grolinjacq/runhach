import type { LootItem, Rarity } from "@runhach/game";

// TODO(sprites agent): pixel-art SVG sprites.

/** Pixel-art picture of a loot item, tinted by rarity, on a rarity-coloured tile. */
export function ItemSprite({
  item,
  size = 48,
}: {
  item: Pick<LootItem, "slot" | "rarity"> & { base?: string | undefined };
  size?: number;
}) {
  void item;
  return <span style={{ display: "inline-block", width: size, height: size }} />;
}

/** Treasure chest, closed or bursting open, coloured by rarity. */
export function ChestSprite({
  rarity,
  open,
  size = 96,
}: {
  rarity: Rarity;
  open: boolean;
  size?: number;
}) {
  void rarity;
  void open;
  return <span style={{ display: "inline-block", width: size, height: size }} />;
}
