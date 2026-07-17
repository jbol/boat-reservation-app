import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * E2E runs against a real server + seeded MySQL. Locally the default web-server
 * command is `npm run start` (build first); set E2E_WEBSERVER_CMD=`npm run dev`
 * to iterate without building. In CI the server is started here too.
 *
 * Workers is 1 and files run serially: the admin spec mutates shared sailing
 * state (cancel → restore), so parallel runs could race.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.E2E_WEBSERVER_CMD ?? "npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? "mysql://root:tabarca@localhost:3307/tabarca",
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "tabarca-admin",
      ADMIN_COOKIE_SECRET: process.env.ADMIN_COOKIE_SECRET ?? "e2e-secret",
      APP_BASE_URL: baseURL,
    },
  },
});
