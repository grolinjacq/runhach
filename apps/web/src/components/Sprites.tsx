import type { CSSProperties } from "react";
import type { GearSlot, LootItem, Rarity } from "@runhach/game";
import "./sprites.css";

/*
 * 16×16 pixel-art sprites as string grids, one char per pixel ("." = transparent).
 * Symbolic colours: M/m/H/G are tinted per rarity, the rest are fixed.
 *   K outline · M main metal · m metal shade · H highlight · G gem/accent
 *   W wood · w wood shade · L leather · l leather shade · C cloth/white
 *   Y gold trim · y gold shade · S bowstring
 */
type Grid = readonly string[];

const FIXED: Record<string, string> = {
  K: "#0d0a12",
  W: "#8b5a2b",
  w: "#5e3a1a",
  L: "#a0703f",
  l: "#6e4a28",
  C: "#efe6d2",
  Y: "#f2c14e",
  y: "#b8862b",
  S: "#e8dcc0",
};

interface Tint {
  M: string;
  m: string;
  H: string;
  G: string;
}

const TINTS: Record<Rarity, Tint> = {
  common: { M: "#c8c8c8", m: "#7f7f8c", H: "#ffffff", G: "#b8d4e8" },
  uncommon: { M: "#5bd66f", m: "#2e8a42", H: "#d2ffd8", G: "#b6ff7a" },
  rare: { M: "#4ea4ff", m: "#245cb5", H: "#d6ecff", G: "#7fe3ff" },
  epic: { M: "#b169ff", m: "#6630b0", H: "#ecdcff", G: "#ff6ae6" },
  legendary: { M: "#ffa630", m: "#b8601a", H: "#fff1a8", G: "#ff4d4d" },
};

const E = "................";

const SWORD: Grid = [
  "............KKKK",
  "...........KHHMK",
  "..........KHMMmK",
  ".........KHMMmK.",
  "........KHMMmK..",
  ".......KHMMmK...",
  "..KK..KHMMmK....",
  "..KYKKHMMmK.....",
  "...KYHMMmK......",
  "....KYMmK.......",
  "...KwKYYK.......",
  "..KwwK.KYK......",
  ".KwwK...KK......",
  "KGGK............",
  "KGGK............",
  ".KK.............",
];

const BOW: Grid = [
  "....KK..........",
  "....KMKK........",
  "....S.KWK.......",
  "....S..KWK......",
  "....S...KWwK....",
  "....S....KWK....",
  "..K.S....KWK....",
  ".KCKS....KWK.KK.",
  "KCCwwwwwwwwwwMHK",
  ".KCKS....KWK.KK.",
  "..K.S....KWK....",
  "....S...KWwK....",
  "....S..KWK......",
  "....S.KWK.......",
  "....KMKK........",
  "....KK..........",
];

const STAFF: Grid = [
  "......KKKK......",
  ".H...KGHHGK.....",
  "....KGHGGGGK....",
  "....KGGGGGmK.H..",
  "....KMGGGmMK....",
  ".....KMmmMK.....",
  "......KMMK......",
  "......KWwK......",
  "......KWwK......",
  "......KMmK......",
  "......KWwK......",
  "......KWwK......",
  "......KWwK......",
  "......KWwK......",
  "......KMmK......",
  ".......KK.......",
];

const AXE: Grid = [
  "....KKK.KKK.....",
  "...KHHMKKWK.....",
  "..KHMMMmKWK.....",
  ".KHMMMMmKWK.....",
  ".KHMMGMmKWK.....",
  ".KHMMMmmKWK.....",
  ".KHMMMMmKWK.....",
  "..KHMMMmKWK.....",
  "...KHHMKKWK.....",
  "....KKK.KWK.....",
  "........KWK.....",
  "........KWK.....",
  "........KlK.....",
  "........KLK.....",
  "........KlK.....",
  "........KKK.....",
];

const DAGGER: Grid = [
  E,
  ".......KK.......",
  "......KHMK......",
  "......KHMK......",
  "......KHmK......",
  "......KHMK......",
  "......KHMK......",
  "......KHmK......",
  "....KKKKKKKK....",
  "....KYYGGYyK....",
  "....KKKKKKKK....",
  "......KLlK......",
  "......KlLK......",
  "......KLlK......",
  ".....KKGGKK.....",
  "......KKKK......",
];

const MACE: Grid = [
  ".......KK.......",
  "......KHMK......",
  "..KK.KKMMKK.KK..",
  "..KHKHHMMMmKmK..",
  "...KHMMMMMmmK...",
  ".KKHMMMGMMmmmKK.",
  "KHMHMMGHGMmmmmmK",
  ".KKHMMMGMMmmmKK.",
  "...KHMMMMmmmK...",
  "..KmKmmmmmmKmK..",
  "..KK.KKMMKK.KK..",
  "......KWwK......",
  "......KWwK......",
  "......KLlK......",
  "......KLlK......",
  "......KKKK......",
];

const TUNIC: Grid = [
  E,
  "....KKK..KKK....",
  "..KKMMMKKMMMKK..",
  ".KMMMMMHHMMMMmK.",
  "KMMMMMMMMMMMMmmK",
  "KMMKMMMMMMMMKmmK",
  "KKKKMMMMMMMMKKKK",
  "...KMMMMMMMmK...",
  "...KMMMMMMMmK...",
  "...KLLLLYLLlK...",
  "...KMMMMMMMmK...",
  "...KMMMMMMMmK...",
  "...KMMMMMMmmK...",
  "...KmMmMmMmmK...",
  "...KKKKKKKKKK...",
  E,
];

const ROBE: Grid = [
  E,
  ".....KKKKKK.....",
  "...KKMMKKMMKK...",
  "..KMMMMYYMMMmK..",
  ".KMMMMMYYMMMMmK.",
  "KMMKMMMYYMMMKmmK",
  "KMKKMMMYYMMMKKmK",
  "KK.KMMMYYMMmK.KK",
  "...KMMMYYMMmK...",
  "..KMMMMYYMMmmK..",
  "..KMMMMYYMMmmK..",
  "..KMMMMYYMMmmK..",
  ".KMMMMMYYMMMmmK.",
  ".KMMMMMYYMMMmmK.",
  ".KmMmMmYYmMmmmK.",
  ".KKKKKKKKKKKKKK.",
];

const JERKIN: Grid = [
  E,
  "....KKK..KKK....",
  "...KMLK..KLMK...",
  "..KLLLKMKLLllK..",
  "..KLLLLMLLLllK..",
  "..KLLLKMKLLllK..",
  "..KLLLLMLLLllK..",
  "..KLLLKMKLLllK..",
  "..KLLLLMLLLllK..",
  "..KMMMMYMMMmmK..",
  "..KLLLLLLLLllK..",
  "..KLLLLLLLLllK..",
  "..KLlLlLlLlllK..",
  "..KKKKKKKKKKKK..",
  E,
  E,
];

const BREASTPLATE: Grid = [
  E,
  "..KKK......KKK..",
  ".KMMHK....KMMmK.",
  ".KMHHMKKKKMMMmK.",
  "..KHMMMMMMMMmK..",
  "..KHMMMHMMMmmK..",
  "..KHMMMHMMMmmK..",
  "..KHMMGHGMMmmK..",
  "..KHMMMHMMMmmK..",
  "...KHMMHMMmmK...",
  "...KKKKKKKKKK...",
  "..KMMmKMMmKMmK..",
  "..KMmmKMmmKmmK..",
  "..KKKK.KKK.KKK..",
  E,
  E,
];

/** Chainmail: the tunic with its metal woven into a ring pattern. */
const CHAINMAIL: Grid = TUNIC.map((row, y) =>
  row.replace(/[Mm]/g, (c, x: number) => (c === "m" ? "m" : (x + y) % 2 ? "m" : "M")),
);

const TREADS: Grid = [
  E,
  "....KKKKKK......",
  "....KHMMmK......",
  "....KKKKKK......",
  "....KLCLlK......",
  "....KLLClK......",
  "....KLCLlK......",
  "....KLLClK......",
  "....KLCLlKK.....",
  "....KLLLLllKK...",
  "...KLLLLLLLllK..",
  "...KLLLLLLLLllK.",
  "...KMMLLLLLMMmK.",
  "...KKKKKKKKKKKK.",
  "...KwKwKwKwKwKK.",
  "....KKKKKKKKKK..",
];

const GREAVES: Grid = [
  "....KKKKKK......",
  "....KHMMmK......",
  "....KHMMmK......",
  "....KKKKKK......",
  "....KHMMmK......",
  "....KHGMmK......",
  "....KHMMmK......",
  "....KKKKKK......",
  "....KHMMmKK.....",
  "....KHMMMmmKK...",
  "...KKHMMMMMmmK..",
  "...KHHMMMMMMmmK.",
  "...KHMMMMMMMmmK.",
  "...KKKKKKKKKKKK.",
  "...KmmmmmmmmmmK.",
  "....KKKKKKKKKK..",
];

const SNEAKERS: Grid = [
  E,
  E,
  E,
  E,
  "......KKKK......",
  ".....KMMMMK.....",
  ".....KMCCMK.....",
  "....KMMCCMMKK...",
  "....KMMMMMMMMK..",
  "...KHMMMMHHMMMK.",
  "...KMMHHHMMMMmK.",
  "...KmmmmmmmmmmK.",
  "...KCCCCCCCCCCK.",
  "....KKKKKKKKKK..",
  E,
  E,
];

/** Striders: winged running shoes. */
const STRIDERS: Grid = [
  E,
  E,
  ".KK.............",
  "KHHK............",
  "KCHHK.KKKK......",
  ".KCHHKMMMMK.....",
  "..KCHKMCCMK.....",
  "...KKMMCCMMKK...",
  "....KMMMMMMMMK..",
  "...KHMMMMHHMMMK.",
  "...KMMHHHMMMMmK.",
  "...KmmmmmmmmmmK.",
  "...KCCCCCCCCCCK.",
  "....KKKKKKKKKK..",
  E,
  E,
];

const SANDALS: Grid = [
  E,
  "..KKKK....KKKK..",
  ".KLLLLK..KLLLLK.",
  ".KMHMMK..KMMHMK.",
  ".KLLLLK..KLLLLK.",
  ".KLMLLK..KLLMLK.",
  ".KLLLLK..KLLLLK.",
  ".KMHMMK..KMMHMK.",
  ".KMLLMK..KMLLMK.",
  ".KLLLLK..KLLLLK.",
  ".KLLLLK..KLLLLK.",
  ".KLLLlK..KlLLLK.",
  "..KLlK....KlLK..",
  "...KK......KK...",
  E,
  E,
];

const AMULET: Grid = [
  "....KKKKKKKK....",
  "..KKYYYYYYYYKK..",
  ".KYYKKKKKKKKYYK.",
  ".KYK........KYK.",
  ".KYK........KYK.",
  "..KYK......KYK..",
  "...KYK....KYK...",
  "....KYK..KYK....",
  ".....KYKKYK.....",
  "....KYYGGYYK....",
  "...KYGHGGGmYK...",
  "...KYGGGGGmYK...",
  "...KYGGGGmmYK...",
  "....KYGmmmYK....",
  ".....KYYyyK.....",
  "......KKKK......",
];

const RING: Grid = [
  E,
  E,
  "......KKKK......",
  ".....KGHGGK.....",
  ".....KGGGmK.....",
  "......KmmK......",
  "....KKKMMKKK....",
  "...KHMMKKMMMK...",
  "..KHMKK..KKMmK..",
  "..KHK......KmK..",
  "..KHK......KmK..",
  "..KHMK....KMmK..",
  "...KHMKKKKMmK...",
  "....KKMMmmKK....",
  "......KKKK......",
  E,
];

/** Charm: a lucky horseshoe. */
const CHARM: Grid = [
  E,
  E,
  "..KKKK....KKKK..",
  "..KHMK....KMmK..",
  "..KHMK....KMmK..",
  "..KHKK....KKmK..",
  "..KHMK....KMmK..",
  "..KHMK....KMmK..",
  "..KHKK....KKmK..",
  "..KHMMK..KMMmK..",
  "...KHMMKKMMmK...",
  "...KHMMGGMmmK...",
  "....KmMMMmmK....",
  ".....KKKKKK.....",
  E,
  E,
];

/** Talisman: a rune-carved disc with a glowing eye. */
const TALISMAN: Grid = [
  "......KYYK......",
  ".....KKKKKK.....",
  "...KKMMMMMMKK...",
  "..KMMHHMMMMmmK..",
  "..KMHMMGGMMMmK..",
  ".KMHMMGKKGMMMmK.",
  ".KMHMGKMMKGMMmK.",
  ".KMMMGKMMKGMMmK.",
  ".KMMMMGKKGMMmmK.",
  ".KMMMMMGGMMMmmK.",
  "..KMMMMMMMMmmK..",
  "..KmMMMMMMmmmK..",
  "...KKmmmmmmKK...",
  ".....KKKKKK.....",
  E,
  E,
];

const PENDANT: Grid = [
  ".KYK........KYK.",
  "..KYK......KYK..",
  "...KYK....KYK...",
  "....KYK..KYK....",
  ".....KYKKYK.....",
  "......KYYK......",
  "......KMMK......",
  ".....KGHGGK.....",
  "....KGHHGGGK....",
  "...KGHGGGGGmK...",
  "...KGGGGGGmmK...",
  "....KGGGGmmK....",
  ".....KGGmmK.....",
  "......KGmK......",
  ".......KK.......",
  E,
];

const BASES: Record<string, Grid> = {
  sword: SWORD,
  bow: BOW,
  staff: STAFF,
  axe: AXE,
  dagger: DAGGER,
  mace: MACE,
  tunic: TUNIC,
  chainmail: CHAINMAIL,
  robe: ROBE,
  jerkin: JERKIN,
  breastplate: BREASTPLATE,
  sandals: SANDALS,
  treads: TREADS,
  striders: STRIDERS,
  sneakers: SNEAKERS,
  greaves: GREAVES,
  amulet: AMULET,
  ring: RING,
  charm: CHARM,
  talisman: TALISMAN,
  pendant: PENDANT,
};

const SLOT_FALLBACK: Record<GearSlot, Grid> = {
  weapon: SWORD,
  armor: TUNIC,
  boots: TREADS,
  trinket: AMULET,
};

const CHEST_CLOSED: Grid = [
  E,
  E,
  E,
  "...KKKKKKKKKK...",
  "..KHWWWWWWWWwK..",
  ".KMHWWWWWWWWwMK.",
  ".KMWWWWWWWWWwmK.",
  ".KMMMMMKKMMMMmK.",
  ".KKKKKKGGKKKKKK.",
  ".KMWWWKGHKWWWmK.",
  ".KMWWWKGGKWWWmK.",
  ".KMwWWWKKWWWwmK.",
  ".KMwwWWWWWWwwmK.",
  ".KMMMMMMMMMMMmK.",
  ".KKKKKKKKKKKKKK.",
  E,
];

const CHEST_OPEN: Grid = [
  E,
  "..KKKKKKKKKKKK..",
  ".KwwwwwwwwwwwwK.",
  ".KMwWWWWWWWWwmK.",
  ".KMwWWWWWWWWwmK.",
  ".KMMMMMMMMMMMmK.",
  ".KKKKKKKKKKKKKK.",
  ".KHHGHHHHHHGHHK.",
  ".KMMMMMKKMMMMmK.",
  ".KMWWWKGHKWWWmK.",
  ".KMWWWKGGKWWWmK.",
  ".KMwWWWKKWWWwmK.",
  ".KMwwWWWWWWwwmK.",
  ".KMMMMMMMMMMMmK.",
  ".KKKKKKKKKKKKKK.",
  E,
];

interface Run {
  x: number;
  y: number;
  w: number;
  fill: string;
}

const runCache = new Map<string, Run[]>();

/** Converts a grid to horizontal same-colour runs (one <rect> each). */
function toRuns(grid: Grid, rarity: Rarity, cacheKey: string): Run[] {
  const key = `${cacheKey}:${rarity}`;
  const hit = runCache.get(key);
  if (hit) return hit;
  const tint = TINTS[rarity];
  const colour = (c: string): string | undefined =>
    c === "M" || c === "m" || c === "H" || c === "G" ? tint[c] : FIXED[c];
  const runs: Run[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < 16) {
      const fill = colour(row[x] ?? ".");
      let w = 1;
      while (x + w < 16 && colour(row[x + w] ?? ".") === fill) w++;
      if (fill) runs.push({ x, y, w, fill });
      x += w;
    }
  });
  runCache.set(key, runs);
  return runs;
}

function PixelSvg({ runs }: { runs: Run[] }) {
  return (
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {runs.map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

type Vars = CSSProperties & Record<`--${string}`, string>;

/** Pixel-art picture of a loot item, tinted by rarity, on a rarity-coloured tile. */
export function ItemSprite({
  item,
  size = 48,
}: {
  item: Pick<LootItem, "slot" | "rarity"> & { base?: string | undefined };
  size?: number;
}) {
  const base = item.base?.toLowerCase();
  const known = base !== undefined && base in BASES;
  const grid = known ? BASES[base] : SLOT_FALLBACK[item.slot];
  const runs = toRuns(grid ?? SWORD, item.rarity, known ? base : `slot-${item.slot}`);
  const style: Vars = {
    width: size,
    height: size,
    borderWidth: Math.max(2, Math.round(size / 24)),
    "--rh-c": TINTS[item.rarity].M,
  };
  return (
    <span
      className={`rh-item rh-item--${item.rarity}`}
      style={style}
      role="img"
      aria-label={`${item.rarity} ${item.base ?? item.slot}`}
    >
      <PixelSvg runs={runs} />
    </span>
  );
}

const SPARKS: readonly [string, string, string][] = [
  ["-140%", "-160%", "0s"],
  ["150%", "-170%", "0.25s"],
  ["-230%", "-60%", "0.5s"],
  ["240%", "-80%", "0.7s"],
  ["-60%", "-260%", "0.95s"],
  ["70%", "-250%", "1.15s"],
];

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
  const runs = toRuns(open ? CHEST_OPEN : CHEST_CLOSED, rarity, open ? "chest-open" : "chest");
  const style: Vars = {
    width: size,
    height: size,
    "--rh-c": TINTS[rarity].M,
    "--rh-l": TINTS[rarity].H,
  };
  return (
    <span
      className={`rh-chest rh-chest--${open ? "open" : "closed"} rh-chest--${rarity}`}
      style={style}
      role="img"
      aria-label={`${open ? "open" : "closed"} ${rarity} chest`}
    >
      {open && (
        <>
          <span className="rh-chest__glow" />
          <span className="rh-chest__rays" />
          {rarity === "legendary" && <span className="rh-chest__rays2" />}
          {SPARKS.map(([dx, dy, delay]) => (
            <span
              key={dx + dy}
              className="rh-spark"
              style={{ "--dx": dx, "--dy": dy, animationDelay: delay } as Vars}
            />
          ))}
        </>
      )}
      <PixelSvg runs={runs} />
    </span>
  );
}
