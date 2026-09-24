import { expect, test } from "@playwright/test";

test("demo run drops a chest per km, saves XP and fills the inventory", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.getByRole("link", { name: "Start a run" }).click();
  await page.getByText("Demo run (simulated)").click();
  await page.getByRole("button", { name: "Start run" }).click();

  // ×30 speed at 5:30/km: the first chest drops after ~11 seconds.
  await expect(page.getByText(/Kilometer 1 · \w+ chest!/)).toBeVisible({ timeout: 25_000 });
  await page.getByRole("button", { name: "Stop run" }).click();

  await expect(page.getByRole("heading", { name: "Quest complete!" })).toBeVisible();
  await expect(page.getByText("XP earned")).toBeVisible();

  await page.getByRole("link", { name: "Open inventory" }).click();
  await expect(page.getByText("Found at km 1")).toBeVisible();

  // Progress survives a reload (saved on the device).
  await page.reload();
  await expect(page.getByText("Found at km 1")).toBeVisible();
});
