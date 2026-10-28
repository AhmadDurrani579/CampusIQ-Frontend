import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const failures = [];
const errors = [];
const liveRequests = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => { if (request.url().includes('/api/v1/')) liveRequests.push(request.url()); });
await mkdir('artifacts', { recursive: true });
const roles = { ADMIN: ['dashboard', 'queries', 'routing', 'reports', 'approvals', 'users', 'departments', 'staff-assignments', 'announcements', 'audit-logs', 'notifications', 'profile'], STUDENT: ['dashboard', 'queries', 'submit', 'announcements', 'notifications', 'profile'], INSTRUCTOR: ['dashboard', 'queries', 'leave', 'reports', 'notifications', 'profile'], HOD: ['dashboard', 'queries', 'escalations', 'reports', 'notifications', 'profile'] };
for (const [role, pages] of Object.entries(roles)) {
  for (const module of pages) {
    await page.goto(`http://127.0.0.1:5173/preview?role=${role}&page=${module}`);
    await page.locator('main h1').waitFor();
    if (await page.locator('h1').filter({ hasText: 'This view couldn’t be opened' }).count()) failures.push(`${role}/${module}: error boundary`);
    if (module === 'dashboard') {
      await page.locator('.recharts-surface').first().waitFor();
      await page.screenshot({ path: `artifacts/${role.toLowerCase()}-desktop.png`, fullPage: true, animations: 'disabled' });
    }
  }
}
await page.setViewportSize({ width: 390, height: 844 });
for (const [role, pages] of Object.entries(roles)) {
  for (const module of pages) {
    await page.goto(`http://127.0.0.1:5173/preview?role=${role}&page=${module}`);
    await page.locator('main h1').waitFor();
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) failures.push(`${role}/${module}: mobile overflow`);
    if (role === 'ADMIN' && module === 'dashboard') await page.screenshot({ path: 'artifacts/admin-mobile.png', fullPage: true, animations: 'disabled' });
  }
}
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto('http://127.0.0.1:5173/login');
await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
await page.screenshot({ path: 'artifacts/login-desktop.png', fullPage: true, animations: 'disabled' });
await page.goto('http://127.0.0.1:5173/signup');
await page.getByLabel('Full name').waitFor();
await page.screenshot({ path: 'artifacts/signup-desktop.png', fullPage: true, animations: 'disabled' });
const report = { inspectedPages: Object.values(roles).reduce((sum, entries) => sum + entries.length, 0) * 2 + 2, failures, errors, liveApiRequestsFromPreview: liveRequests.length };
await writeFile('artifacts/visual-check.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
await browser.close();
if (failures.length || errors.length || liveRequests.length) process.exitCode = 1;
