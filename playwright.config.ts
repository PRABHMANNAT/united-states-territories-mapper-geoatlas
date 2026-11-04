import { defineConfig, devices } from "@playwright/test";

const port = 3199;
const url = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  workers: 2,
  use: { baseURL: url, trace: "retain-on-failure", channel: process.env.STATEATLAS_E2E_CHANNEL || undefined },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm ${process.env.STATEATLAS_E2E_PRODUCTION ? "start" : "dev"} --hostname 127.0.0.1 --port ${port}`,
    url,
    reuseExistingServer: !process.env.CI,
    timeout: 150_000,
  },
});
