import { defineConfig, devices } from '@playwright/test';

/**
 * Browser smoke of the isolated stack (plan row A09).
 *
 * The suite drives a running web app that talks to a running API over HTTP;
 * it starts nothing itself, so the same configuration serves CI (which starts
 * API + web against a throwaway PostgreSQL) and a developer machine.
 *
 *   E2E_WEB_URL  web origin        default http://127.0.0.1:3000
 *   E2E_API_URL  API base with /api default http://127.0.0.1:3001/api
 *   E2E_DATABASE_URL  the disposable database (second company is seeded directly)
 *
 * The database must be empty of OWNERs: global-setup bootstraps the first
 * company through the API and seeds a second one directly (apps/api/test/
 * e2e-seed-company.mjs). Never point this at production.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  // A flaky smoke is a defect to fix, not to retry (quality-first rule).
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: process.env.E2E_OUTPUT_DIR ?? './test-results',
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  globalSetup: './e2e/global-setup.ts',
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // Pixel 7 runs on Chromium (no second browser download); below the lg
    // breakpoint the shell switches to the compact navigation with its Menu.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
