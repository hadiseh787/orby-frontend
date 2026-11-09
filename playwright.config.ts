import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const systemBrowser = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL||"http://127.0.0.1:4200",
    headless: true,
    launchOptions: systemBrowser ? { executablePath: systemBrowser } : {},
    screenshot: "only-on-failure",
    video: process.env.ORBY_RECORD_DEMO==='1' ? 'on' : 'off',
  },
  reporter: "list",
});
