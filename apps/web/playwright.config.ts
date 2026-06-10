import { defineConfig, devices } from "@playwright/test";

const port = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "61737", 10);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  webServer: {
    command: `node ./node_modules/astro/bin/astro.mjs dev --host 127.0.0.1 --port ${port}`,
    url: `${baseURL}/manifest.webmanifest`,
    timeout: 120_000,
    reuseExistingServer: false
  },
  use: {
    baseURL
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Pixel 5"],
        locale: "pt-BR",
        viewport: { width: 360, height: 640 }
      }
    }
  ]
});
