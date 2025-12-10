import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * IMPORTANT: All tests use REAL API calls and REAL Keycloak authentication.
 * NO MOCKING - this validates the actual customer experience.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './apps/web-console/e2e',

  /* Run tests in files in parallel */
  fullyParallel: false, // Sequential for auth state management

  /* Fail the build on CI if you accidentally left test.only */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : 1, // Sequential for database state

  /* Reporter to use */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for app under test */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video for ALL tests (for customer demo) */
    video: 'on',

    /* Maximum time each action can take */
    actionTimeout: 15000,

    /* Maximum time for navigation */
    navigationTimeout: 30000,
  },

  /* Output folder for videos and screenshots */
  outputDir: 'test-results',

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm nx dev web-console',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },

  /* Global timeout for each test */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
});
