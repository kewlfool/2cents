import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: false,
  testDir: "./tests/e2e-pwa",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run preview:pages:e2e",
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:3100/2cents/",
  },
  projects: [
    {
      name: "chromium-preview",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
