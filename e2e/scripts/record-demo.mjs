// Records the captioned demo video for judges/testers (phone-sized, ~100 s):
// a friend's invite pairs you into her party, then a demo run with loot drops.
// Needs the app running on a FRESH database (the friend becomes the first account).
// Usage (from e2e/): BASE_URL=http://localhost:8787 OUT_DIR=./demo-video node scripts/record-demo.mjs
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = process.env.OUT_DIR ?? "demo-video";

async function addPasskeyAuthenticator(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

const browser = await chromium.launch();

// ---- Setup (not recorded): Mira signs up, has run, and shares an invite ----
const friendCtx = await browser.newContext();
const friend = await friendCtx.newPage();
await addPasskeyAuthenticator(friend);
await friend.goto(`${BASE}/signup`);
await friend.getByLabel("Adventurer name").fill("Mira");
await friend.getByLabel("Email").fill("mira@example.com");
await friend.getByRole("button", { name: "Create passkey & join" }).click();
await friend.getByRole("heading", { name: "Hail, Mira!" }).waitFor();
const inviteCode = await friend.evaluate(async () => {
  const post = (path, body) =>
    fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => r.json());
  await post("/party/runs", {
    distanceMeters: 5210,
    durationSeconds: 1690,
    xp: 571,
    bestItem: {
      name: "Mythic Staff of Second Wind",
      rarity: "legendary",
      slot: "weapon",
      base: "staff",
    },
  });
  return (await post("/invites")).code;
});
await friendCtx.close();

// ---- Recorded: you join through Mira's invite and go for a run ----
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
await addPasskeyAuthenticator(page);
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
const closeReveal = () =>
  page
    .locator(".chest-reveal")
    .click({ timeout: 1000 })
    .catch(() => {});

await page.goto(`${BASE}/`);
await wait(800);
await caption("Runhach: a running RPG. Every kilometer you run drops loot.");
await wait(3500);
await page.goto(`${BASE}/signup?invite=${inviteCode}`);
await wait(600);
await caption("Your friend Mira sent you an invite link. Her code is already filled in.");
await wait(3000);
await page.getByLabel("Adventurer name").fill("Michael");
await wait(400);
await page.getByLabel("Email").fill("michael@example.com");
await wait(600);
await caption("Sign up with a passkey (Face ID / fingerprint). No password.");
await wait(1500);
await page.getByRole("button", { name: "Create passkey & join" }).click();
await page.getByText(/adventuring with Mira/).waitFor({ timeout: 15000 });
await wait(600);
await caption("You're paired! Mira is in your party, and you see her runs and loot.");
await wait(5000);
await page.mouse.wheel(0, 500);
await wait(2000);
await page.getByRole("link", { name: "Start a run" }).first().click();
await wait(600);
await caption("Demo mode: a simulated run at 30× speed, so no running shoes needed.");
await wait(3000);
await page.getByText("Demo run (simulated)").click();
await wait(500);
await page.getByRole("button", { name: "Start run" }).click();
await caption("Your pace buddy changes with your speed, from granny stroll to supersonic!");
await wait(5500);
await caption("Always know what's next: distance and time until the next loot chest.");
await chest(1).waitFor({ timeout: 30000 });
await caption("Every km the chest bursts open with your loot! 🔊 voice + 8-bit sound");
await wait(3500);
await closeReveal();
await caption("Run faster or farther than your own usual pace → better loot odds.");
await chest(2).waitFor({ timeout: 30000 });
await wait(3500);
await closeReveal();
await caption("Rarity is rolled from a server-issued seed: Common → Legendary.");
await chest(3).waitFor({ timeout: 30000 });
await wait(3500);
await closeReveal();
await wait(1500);
await page.getByRole("button", { name: "Stop run" }).click();
await wait(800);
await caption("Quest complete: XP, level progress, your best find and all the loot.");
await wait(4000);
await page.mouse.wheel(0, 900);
await wait(2000);
await page.goto(`${BASE}/`);
await page.getByText(/adventuring with Mira/).waitFor({ timeout: 15000 });
await wait(500);
await caption("Your run now shows up in the party feed next to Mira's.");
await page.mouse.wheel(0, 350);
await wait(4500);
await page.goto(`${BASE}/inventory`);
await wait(600);
await caption("Inventory: pixel-art gear with rarity and stats that power up boss fights.");
await wait(4000);
await page.mouse.wheel(0, 800);
await wait(2500);
await caption("Next: skill trees (Warrior, Archer, Mage) and team boss raids.");
await wait(4000);
await ctx.close();
await browser.close();
console.log(`Video saved in ${OUT}/`);
