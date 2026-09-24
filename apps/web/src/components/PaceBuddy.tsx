import { useTranslation } from "react-i18next";
import "./pace-buddy.css";

export type PaceTier = "granny" | "jogger" | "runner" | "sprinter" | "speedster";

/** Tier for a pace in seconds per km (null = not moving / unknown). */
export function paceTier(paceSecondsPerKm: number | null): PaceTier | null {
  if (paceSecondsPerKm === null || !Number.isFinite(paceSecondsPerKm)) return null;
  if (paceSecondsPerKm > 540) return "granny";
  if (paceSecondsPerKm >= 420) return "jogger";
  if (paceSecondsPerKm >= 300) return "runner";
  if (paceSecondsPerKm >= 240) return "sprinter";
  return "speedster";
}

// One char per pixel, "." is transparent.
const PALETTE: Record<string, string> = {
  K: "#0d0a12", // outline
  G: "#f2c14e", // gold
  g: "#b8862b", // dark gold
  S: "#f5c49a", // skin
  s: "#c98a5e", // skin shade
  H: "#d9d6e3", // grey hair
  h: "#8d8a99", // grey hair shade
  P: "#9b6bc4", // shawl
  p: "#65408c", // shawl shade
  D: "#4a3f66", // dark cloth
  N: "#a0703a", // wooden stick
  n: "#5e3a1a", // brown hair
  R: "#e8423f", // red
  T: "#2ec4b6", // teal shirt
  O: "#ff8c42", // orange shirt
  W: "#fff3c4", // white
  B: "#3a7bff", // blue
  b: "#1f47b8", // dark blue
  Y: "#ffe14d", // bolt yellow
  L: "#7fd6ff", // speed line
};

type Grid = readonly string[];
type Frames = readonly [Grid, Grid];
type SpriteKey = PaceTier | "idle";

const SPRITES: Record<SpriteKey, Frames> = {
  granny: [
    [
      "................",
      "....KKK.........",
      "...KHHHK........",
      "..KHHhHHKKK.....",
      "..KHhHHHHHHK....",
      "...KHHHSSSSK....",
      "..KPKHSSKSSK....",
      ".KPPPKSSSSsK....",
      ".KPPPPKKKKK.NN..",
      "KPpPPPPPPKSSKN..",
      "KPppPPPPPKKK.N..",
      ".KppDDDDDK...N..",
      "..KDDDDDDK...N..",
      "..KDDDDDDK...N..",
      "...KSK.KSK...N..",
      "..KRRK.KRRK..N..",
    ],
    [
      "................",
      "................",
      "....KKK.........",
      "...KHHHK........",
      "..KHHhHHKKK.....",
      "..KHhHHHHHHK....",
      "...KHHHSSSSK....",
      "..KPKHSSKSSK.NN.",
      ".KPPPKSSSSsK..N.",
      "KPpPPPKKKKKSSKN.",
      "KPppPPPPPPKKK.N.",
      ".KppDDDDDK....N.",
      "..KDDDDDDK....N.",
      "..KDDDDDDK....N.",
      "....KSKKSK....N.",
      "...KRRKRRK....N.",
    ],
  ],
  jogger: [
    [
      "................",
      ".....KKKKK......",
      "....KnnnnnK.....",
      "....KRRRRRRK....",
      "..RRKSSSKSSK....",
      ".R..KSSSSSSK....",
      ".....KSSSsK.....",
      "....KTTTTTK.....",
      "...KTTWTTTTK....",
      "..KSKTTTTTKSK...",
      "..KSKTTTTTKK....",
      "....KDDDDDK.....",
      "....KDDKDDK.....",
      "...KDDK.KDDK....",
      "...KSK...KSK....",
      "..KWWK...KWWK...",
    ],
    [
      "................",
      "................",
      ".....KKKKK......",
      "....KnnnnnK.....",
      "....KRRRRRRK....",
      ".RRRKSSSKSSK....",
      ".....KSSSSSK....",
      ".....KSSSsK.....",
      "....KTTTTTK.....",
      "...KTTWTTTTK....",
      "...KSTTTTTSK....",
      "....KDDDDDK.....",
      "....KDDKDDK.....",
      "....KDK.KDK.....",
      "....KSK.KSK.....",
      "...KWWK.KWWK....",
    ],
  ],
  runner: [
    [
      "................",
      "......KKKKK.....",
      ".....KnnnnnK....",
      ".....KnnSSSSK...",
      ".....KnSSSKSK...",
      "......KSSSSsK...",
      ".......KSSSK....",
      "....KKKOOOOK....",
      "...KSSKOGGOKSK..",
      "..KSK.KOOOOKSSK.",
      "..KK..KBBBBK.KK.",
      "......KBBKBBK...",
      ".....KBBK.KBBK..",
      "....KSSK...KSSK.",
      "...KWWWK...KWWK.",
      "....KKK.....KK..",
    ],
    [
      "................",
      "................",
      "......KKKKK.....",
      ".....KnnnnnK....",
      ".....KnnSSSSK...",
      ".....KnSSSKSK...",
      "......KSSSSsK...",
      ".......KSSSK....",
      "......KOOOOK....",
      ".....KOGGOSSK...",
      ".....KOOOOKSK...",
      "......KBBBBKK...",
      "......KBBKBBK...",
      ".....KSSKKSSK...",
      "....KWWK.KWWK...",
      ".....KK...KK....",
    ],
  ],
  sprinter: [
    [
      "................",
      ".........KKKK...",
      "........KnnnnK..",
      ".......KnnSSSSK.",
      ".......KnSSKSSK.",
      "L.......KSSSSsK.",
      "......KKKSSSK...",
      "LLL..KRRRRKSSK..",
      "....KRRWRRKSSK..",
      "...KSKRRRRK.KK..",
      "LL.KSKRRRRK.....",
      "...KKKDDDDK.....",
      "....KDDKKDDK....",
      "LLLKDDK..KDDK...",
      "..KSSK....KSSK..",
      ".KWWK......KWWK.",
    ],
    [
      "................",
      ".........KKKK...",
      "........KnnnnK..",
      ".......KnnSSSSK.",
      ".......KnSSKSSK.",
      "........KSSSSsK.",
      "LL......KSSSK...",
      ".....KRRRRK.....",
      "..KKKRRWRRK.....",
      ".KSSKRRRRRKSK...",
      "LKKKKRRRRKSSK...",
      ".....KDDDDKK....",
      "LLL..KDDDDK.....",
      ".....KDDKDDK....",
      "L...KSSKKSSK....",
      "...KWWK.KWWK....",
    ],
  ],
  speedster: [
    [
      "................",
      "....KK..KKK.....",
      "...KBBKKBBBK....",
      ".KKBBBBBBBBBK...",
      "KBBBBBBBBBBBBK..",
      ".KKBBBBBSSSSSK..",
      "..KBBBBGGGWGGK..",
      "KBBBBBBKSSSSsK..",
      "..KKBBBKKSSSK...",
      "....KbWWWWbKSK..",
      "...KSKWYYWWKSSK.",
      "...KKKWWYWWK.KK.",
      "......KbbbbK....",
      ".....KbbKKbbK...",
      "....KbbK..KbbK..",
      "...KRRWRK.KRRWRK",
    ],
    [
      "................",
      ".....KK.KKK.....",
      "..KKKBBKBBBK....",
      "KKBBBBBBBBBBK...",
      ".KBBBBBBBBBBBK..",
      "KKKBBBBBSSSSSK..",
      "..KBBBBGGGWGGK..",
      ".KBBBBBKSSSSsK..",
      "KBBKBBBKKSSSK...",
      "....KbWWWWbKSK..",
      "...KSKWYYWWKSSK.",
      "...KKKWWYWWK.KK.",
      "......KbbbbK....",
      "....KRRbbbbRRK..",
      "...KRRWKKKKWRRK.",
      "....KKK....KKK..",
    ],
  ],
  idle: [
    [
      "................",
      "................",
      "......KKKKK.....",
      ".....KnnnnnK....",
      ".....KnnSSSSK...",
      ".....KnSSSKSK...",
      "......KSSSSsK...",
      ".......KSSSK....",
      "......KOOOOK....",
      ".....KOOGGOOK...",
      ".....KSKOOKSK...",
      ".....KSKBBKSK...",
      "......KBBBBK....",
      "......KBKKBK....",
      "......KSKKSK....",
      ".....KWWKKWWK...",
    ],
    [
      "................",
      "................",
      "......KKKKK.....",
      ".....KnnnnnK....",
      ".....KnnSSSSK...",
      ".....KnSSSSSK...",
      "......KSSSSsK...",
      ".......KSSSK....",
      "......KOOOOK....",
      ".....KOOGGOOK...",
      ".....KSKOOKSK...",
      ".....KSKBBKSK...",
      "......KBBBBK....",
      "......KBKKBK....",
      "......KSKKSK....",
      ".....KWWKKWWK...",
    ],
  ],
};

const BOLT: Grid = [
  "....KKK.",
  "...KYYK.",
  "..KYYK..",
  ".KYYKKK.",
  "KYYYYYK.",
  "KKKYYK..",
  "..KYK...",
  ".KYK....",
  ".KK.....",
];

type Rect = { x: number; y: number; w: number; fill: string };

/** Turns a string grid into rects, merging horizontal runs of the same colour. */
function toRects(grid: Grid): Rect[] {
  const rects: Rect[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x] ?? ".";
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      const fill = PALETTE[ch];
      if (ch !== "." && fill) rects.push({ x, y, w: end - x, fill });
      x = end;
    }
  });
  return rects;
}

const RECTS = Object.fromEntries(
  (Object.keys(SPRITES) as SpriteKey[]).map((k) => [
    k,
    [toRects(SPRITES[k][0]), toRects(SPRITES[k][1])],
  ]),
) as Record<SpriteKey, [Rect[], Rect[]]>;
const BOLT_RECTS = toRects(BOLT);

function Pixels({ rects }: { rects: Rect[] }) {
  return rects.map((r) => (
    <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
  ));
}

function Character({ sprite, className }: { sprite: SpriteKey; className?: string }) {
  const [a, b] = RECTS[sprite];
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width={64}
      height={64}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <g className="pb-frame pb-frame--a">
        <Pixels rects={a} />
      </g>
      <g className="pb-frame pb-frame--b">
        <Pixels rects={b} />
      </g>
    </svg>
  );
}

const DEFAULT_LABELS: Record<SpriteKey, string> = {
  granny: "👵 Granny stroll",
  jogger: "🙂 Easy jogger",
  runner: "🏃 Runner",
  sprinter: "💨 Sprinter",
  speedster: "⚡ Supersonic!",
  idle: "Warming up…",
};

/** Animated pixel character for the runner's current pace, with a fun label. */
export function PaceBuddy({ paceSecondsPerKm }: { paceSecondsPerKm: number | null }) {
  const { t } = useTranslation();
  const tier = paceTier(paceSecondsPerKm);
  const key: SpriteKey = tier ?? "idle";
  const label = t(`paceBuddy.${key}`, { defaultValue: DEFAULT_LABELS[key] });

  return (
    <div className={`pb pb--${key}`} data-testid="pace-buddy" data-tier={key}>
      <div className="pb-strip" aria-hidden="true">
        <div className="pb-sky" />
        <div className="pb-ground" />
        {key === "speedster" && (
          <>
            <div className="pb-streaks" />
            <svg
              className="pb-bolt pb-bolt--1"
              viewBox="0 0 8 9"
              width={24}
              height={27}
              shapeRendering="crispEdges"
            >
              <Pixels rects={BOLT_RECTS} />
            </svg>
            <svg
              className="pb-bolt pb-bolt--2"
              viewBox="0 0 8 9"
              width={16}
              height={18}
              shapeRendering="crispEdges"
            >
              <Pixels rects={BOLT_RECTS} />
            </svg>
          </>
        )}
        <div key={key} className="pb-char">
          {key === "speedster" && (
            <>
              <Character sprite={key} className="pb-ghost pb-ghost--2" />
              <Character sprite={key} className="pb-ghost pb-ghost--1" />
            </>
          )}
          <Character sprite={key} className="pb-sprite" />
          <span className="pb-shadow" />
        </div>
      </div>
      <p key={key} className="pb-label" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
