// Generates the app icons from a 16×16 pixel-art sprite (a loot chest).
// Run with `pnpm --filter @runhach/web icons`; outputs are committed to public/.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const PALETTE = {
  ".": [0x1a, 0x14, 0x23],
  K: [0x0d, 0x0a, 0x12],
  B: [0x8b, 0x5a, 0x2b],
  b: [0x5e, 0x3a, 0x1a],
  G: [0xf2, 0xc1, 0x4e],
  g: [0xb8, 0x86, 0x2b],
  W: [0xff, 0xf3, 0xc4],
};

const SPRITE = [
  "................",
  ".W............W.",
  "...KKKKKKKKKK...",
  "..KBBBBBBBBBBK..",
  "..KBbbbbbbbbBK..",
  "..KBBBBBBBBBBK..",
  "..KGGGGGGGGGGK..",
  "..KggggWWggggK..",
  "..KBBBBGGBBBBK..",
  "..KBBBBgGBBBBK..",
  "..KBbbbbbbbbBK..",
  "..KGGGGGGGGGGK..",
  "..KBBBBBBBBBBK..",
  "..KKKKKKKKKKKK..",
  "...W............",
  "................",
];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** Renders the sprite at `scale`, centred on a `size`×`size` background. */
function png(size, scale) {
  const offset = Math.floor((size - SPRITE.length * scale) / 2);
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const sy = Math.floor((y - offset) / scale);
      const sx = Math.floor((x - offset) / scale);
      const key = SPRITE[sy]?.[sx] ?? ".";
      const [r, g, b] = PALETTE[key];
      raw.set([r, g, b], row + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function svg() {
  const rects = [];
  SPRITE.forEach((line, y) =>
    [...line].forEach((key, x) => {
      if (key === ".") return;
      const [r, g, b] = PALETTE[key];
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="rgb(${r},${g},${b})"/>`);
    }),
  );
  const [r, g, b] = PALETTE["."];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" rx="2" fill="rgb(${r},${g},${b})"/>${rects.join("")}</svg>\n`;
}

const out = new URL("../public/", import.meta.url);
writeFileSync(new URL("icon-192.png", out), png(192, 12));
writeFileSync(new URL("icon-512.png", out), png(512, 32));
// Maskable icons are cropped to a circle: keep the sprite inside the safe zone.
writeFileSync(new URL("icon-maskable-512.png", out), png(512, 22));
writeFileSync(new URL("apple-touch-icon.png", out), png(180, 10));
writeFileSync(new URL("favicon.svg", out), svg());
console.log("icons written to public/");
