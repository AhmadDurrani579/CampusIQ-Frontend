import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['json', { outputFile: 'artifacts/test-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:5175', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', testMatch: /^(?!.*mock).*\.spec\.js$/, use: { ...devices['Desktop Chrome'], channel: 'msedge', launchOptions: { args: ['--disable-gpu'] },baseURL:'http://127.0.0.1:5175' } },
    { name: 'mock', testMatch: /mock.*\.spec\.js$/, use: { ...devices['Desktop Chrome'], channel: 'msedge', launchOptions: { args: ['--disable-gpu'] },baseURL:'http://127.0.0.1:5176' } },
  ],
  webServer: [{
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    env: { CAMPUSIQ_TEST_SERVER: 'api', VITE_APP_MODE:'api' },
    reuseExistingServer: false,
    timeout: 45000,
  },{
    command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5176 --strictPort',
    url:'http://127.0.0.1:5176',
    env:{CAMPUSIQ_TEST_SERVER:'mock',VITE_APP_MODE:'mock'},
    reuseExistingServer:false,
    timeout:45000,
  }],
});
