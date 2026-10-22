import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Pixel 5'] } },
    { name: 'webkit', use: { ...devices['iPhone 12'] } },
    { name: 'firefox', use: { ...devices['Pixel 5'], ...devices['Desktop Firefox'] } },
  ],
})
