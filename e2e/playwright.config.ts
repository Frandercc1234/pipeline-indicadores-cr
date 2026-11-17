import { defineConfig } from "@playwright/test";

// URL_WEB: el sitio a probar (local o producción). Por defecto, el web local.
const URL_WEB = process.env.URL_WEB ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  // Hasta 120 s por prueba, para tolerar que Render tarde en despertar.
  timeout: 120_000,
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: URL_WEB,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "movil",
      use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
    },
    {
      name: "escritorio",
      use: { viewport: { width: 1280, height: 800 } },
    },
  ],
});
