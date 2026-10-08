import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './offline-tests',
  outputDir: 'offline-test-results',
  workers: 1,
  timeout: 60000,
  reporter: 'list',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
})
