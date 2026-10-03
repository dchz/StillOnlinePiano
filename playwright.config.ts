import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// The cloud image already provides Chromium; other machines may use Playwright's download.
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:5173",
    launchOptions: { executablePath, args: ["--no-sandbox"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
