// Records the captioned demo video for judges/testers (phone-sized, ~80 s).
// Needs the app running (e.g. `pnpm dev`, or wrangler dev with a built web app).
// Usage (from e2e/): BASE_URL=http://localhost:5173 OUT_DIR=./demo-video node scripts/record-demo.mjs
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = process.env.OUT_DIR ?? "demo-video";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 780, height: 1688 },
  deviceScaleFactor: 1,
  hasTouch: true,
  recordVideo: { dir: OUT, size: { width: 780, height: 1688 } },
});
// Render the phone layout (390 CSS px wide) at 2x so the video is crisp and fills the frame.
await ctx.addInitScript(() => {
  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.style.zoom = "2";
  });
});
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);
const caption = (text) =>
  page.evaluate((text) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      Object.assign(el.style, {
        position: "fixed",
        left: "12px",
        right: "12px",
        bottom: "74px",
        zIndex: 99,
        background: "rgba(13,10,18,0.92)",
        color: "#fff3c4",
        border: "3px solid #f2c14e",
        padding: "10px 12px",
        font: "600 16px 'Pixelify Sans', sans-serif",
        textAlign: "center",
        lineHeight: "1.35",
        pointerEvents: "none",
      });
      document.body.appendChild(el);
    }
    el.textContent = text;
  }, text);
const chest = (km) => page.getByText(new RegExp(`Kilometer ${km} · \\w+ chest!`));

await page.goto(`${BASE}/`);
await wait(800);
await caption("Runhach: a running RPG. Every kilometer you run drops loot.");
await wait(3500);
await caption("Friends team up to fight bosses, but only while running.");
await wait(3000);
await page.getByRole("link", { name: "Start a run" }).click();
await wait(600);
await caption("Demo mode: a simulated 5:30/km run at 30× speed, so no running shoes needed.");
await wait(3500);
await page.getByText("Demo run (simulated)").click();
await wait(600);
await page.getByRole("button", { name: "Start run" }).click();
await caption("Live stats + a countdown: distance and time until your next loot chest.");
await chest(1).waitFor({ timeout: 30000 });
await caption("Every km the chest shakes, bursts open, and your loot pops out! 🔊 voice + 8-bit sound");
await wait(5000);
await caption("Rarity is rolled from a server-issued seed: Common → Legendary.");
await chest(2).waitFor({ timeout: 30000 });
await wait(5000);
await caption("Run faster or farther than your own usual pace → better loot odds.");
await chest(3).waitFor({ timeout: 30000 });
await wait(4500);
await page.locator(".chest-reveal").click().catch(() => {});
await wait(500);
await page.getByRole("button", { name: "Stop run" }).click();
await wait(800);
await caption("Quest complete: XP, level progress, your best find and all the loot.");
await wait(4500);
await page.mouse.wheel(0, 900);
await wait(2500);
await page.getByRole("link", { name: "Open inventory" }).click();
await wait(800);
await caption("Inventory: pixel-art gear with rarity and stats that power up boss fights.");
await wait(4500);
await page.mouse.wheel(0, 800);
await wait(2500);
await caption("Next: skill trees (Warrior, Archer, Mage) and team boss raids.");
await wait(4000);
await ctx.close();
await browser.close();
console.log(`Video saved in ${OUT}/`);
