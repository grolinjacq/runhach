import { defineConfig, devices } from "@playwright/test";

const PORT = 8788;
// Fresh local database for every run, separate from `pnpm dev`.
const STATE = ".wrangler/e2e-state";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1, // tests share one database; the first sign-up bootstraps the admin
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...devices["Pixel 7"],
  },
  projects: [{ name: "chromium" }],
  webServer: {
    cwd: "../apps/worker",
    command: [
      "pnpm --filter @runhach/web build",
      `rm -rf ${STATE}`,
      `pnpm exec wrangler d1 migrations apply DB --local --persist-to ${STATE}`,
      `pnpm exec wrangler dev --port ${PORT} --persist-to ${STATE} --var APP_ENV:development --var BUILD_VERSION:e2e`,
    ].join(" && "),
    env: { VITE_DEV_TOOLS: "true", WRANGLER_SEND_METRICS: "false", CI: process.env.CI ?? "" },
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
