import { defineConfig, devices } from '@playwright/test';

// Get the target spec file from the environment variable, if set
const targetSpecFile = process.env.TARGET_SPEC_FILE;

// Function to escape a string for use in a regex
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|\\[\\]\\\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */

const baseTestIgnore = [/.*\.performance\.spec\.ts/, /.*competitor-performance\.spec\.ts/];

export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    // Performance tests project - runs sequentially and only in Chromium
    {
      name: 'performance',
      testMatch: /.*\.performance\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      fullyParallel: false,  // Run tests sequentially
      workers: 1,  // Use only one worker
    },

    // Competitor performance tests project - runs sequentially and only in Chromium
    {
      name: 'competitor-performance',
      testMatch: /.*competitor-performance\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      fullyParallel: false,  // Run tests sequentially
      workers: 1,  // Use only one worker
    },

    // Regular test projects - run in parallel across all browsers
    {
      name: 'chromium',
      testMatch: targetSpecFile ? new RegExp('^' + escapeRegex(targetSpecFile) + '$') : /.*\.spec\.ts$/,
      testIgnore: baseTestIgnore,
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      testIgnore: targetSpecFile ? [...baseTestIgnore, /.*\.spec\.ts$/] : baseTestIgnore,
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      testIgnore: targetSpecFile ? [...baseTestIgnore, /.*\.spec\.ts$/] : baseTestIgnore,
      use: { ...devices['Desktop Safari'] },
    },

    {
      name: 'Mobile Chrome',
      testIgnore: targetSpecFile ? [...baseTestIgnore, /.*\.spec\.ts$/] : baseTestIgnore,
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      testIgnore: targetSpecFile ? [...baseTestIgnore, /.*\.spec\.ts$/] : baseTestIgnore,
      use: { ...devices['iPhone 12'] },
    },

    {
      name: 'Microsoft Edge',
      testIgnore: targetSpecFile ? [...baseTestIgnore, /.*\.spec\.ts$/] : baseTestIgnore,
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    {
      name: 'Google Chrome',
      testIgnore: targetSpecFile ? [...baseTestIgnore, /.*\.spec\.ts$/] : baseTestIgnore,
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
