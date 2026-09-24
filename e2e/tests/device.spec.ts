import { expect, test } from "@playwright/test";
import { loadGpxFixture, replayTrack } from "./support";

test.use({
  permissions: ["geolocation"],
  geolocation: { latitude: 49.4521, longitude: 11.0767, accuracy: 5 },
});

test("device check reports GPS, storage and the live connection", async ({ page }) => {
  await page.goto("/device-check");
  await page.getByRole("button", { name: "Run all checks" }).click();

  const row = (id: string) => page.locator(`[data-check="${id}"]`);
  await expect(row("live")).not.toHaveAttribute("data-status", /idle|pending/, { timeout: 30_000 });

  await expect(row("secure")).toHaveAttribute("data-status", "pass");
  await expect(row("gps")).toHaveAttribute("data-status", "pass");
  await expect(row("gps")).toContainText("Accuracy 5 m");
  await expect(row("storage")).toHaveAttribute("data-status", "pass");
  await expect(row("live")).toHaveAttribute("data-status", "pass");
  await expect(row("live")).toContainText(/\d+ ms round trip/);

  await page.getByRole("button", { name: "Send results to the team" }).click();
  await expect(page.getByText("Results sent. Thanks!")).toBeVisible();
});

test("GPS lab measures a replayed 1 km GPX track through the device GPS path", async ({
  page,
  context,
}) => {
  const [first, ...rest] = loadGpxFixture("park-loop-1km.gpx");
  await context.setGeolocation({ latitude: first!.lat, longitude: first!.lon, accuracy: 5 });
  await page.goto("/dev/gps");
  await page.getByLabel("Source").selectOption("device");
  await page.getByRole("button", { name: "Start" }).click();

  // The watch reports the starting position first, then each replayed fix.
  const fixes = page.getByTestId("lab-fixes");
  await expect(fixes).toHaveText("1");
  await replayTrack(context, rest, async (i) => {
    // Wait for each fix to arrive so none are coalesced.
    await expect(fixes).toHaveText(String(i + 2));
  });

  await expect(page.getByTestId("lab-distance")).toHaveText("1.00 km");
  await page.getByRole("button", { name: "Stop" }).click();
});

test("GPS lab runs a simulated run", async ({ page }) => {
  await page.goto("/dev/gps");
  await page.getByLabel("Source").selectOption("sim");
  await page.getByLabel("Replay speed").selectOption("60");
  await page.getByRole("button", { name: "Start" }).click();
  // ×60: 2 seconds ≈ 2 simulated minutes ≈ 360 m at 5:30/km.
  await expect(page.getByTestId("lab-distance")).not.toHaveText("0.00 km");
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Stop" }).click();
  const km = parseFloat((await page.getByTestId("lab-distance").textContent()) ?? "0");
  expect(km).toBeGreaterThan(0.2);
});
