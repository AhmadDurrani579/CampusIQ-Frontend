import { chromium } from '@playwright/test';
import { isDepartmentStaff, roleLabels } from '../src/utils/roles.js';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

// A temporary owned server keeps visual QA away from the user's dev port.
const origin = 'http://127.0.0.1:5177';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5177', '--strictPort'], {
  cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, VITE_APP_MODE: 'mock', CAMPUSIQ_TEST_SERVER: 'visual' },
});
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const errors = [], requests = [], failures = [], inspected = [];
let browser, page, activeLabel = 'server startup';
const staffQueries = {};
const roles = {
  ADMIN: ['dashboard', 'queries', 'queries/1', 'reports', 'approvals', 'users', 'departments', 'routing', 'staff-assignments', 'announcements', 'audit-logs', 'notifications', 'profile'],
  STUDENT: ['dashboard', 'queries', 'queries/1', 'queries/new', 'announcements', 'notifications', 'profile'],
  INSTRUCTOR: ['dashboard', 'queries', 'queries/1', 'leave', 'reports', 'notifications', 'profile'],
  HOD: ['dashboard', 'queries', 'queries/1', 'escalations', 'reports', 'notifications', 'profile'],
  EXAM_STAFF: ['dashboard', 'queries', 'detail', 'reports', 'notifications', 'profile'],
  FINANCE_STAFF: ['dashboard', 'queries', 'detail', 'reports', 'notifications', 'profile'],
  IT_STAFF: ['dashboard', 'queries', 'detail', 'reports', 'notifications', 'profile'],
};
try {
  const deadline = Date.now() + 45000;
  while (true) {
    if (server.exitCode !== null) throw new Error(`Visual server failed: ${serverOutput}`);
    try { if ((await fetch(origin)).ok) break; } catch {}
    if (Date.now() > deadline) throw new Error(`Visual server timeout: ${serverOutput}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  await mkdir('artifacts', { recursive: true });
  browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.on('pageerror', error => errors.push({ url: page.url(), message: error.message }));
  page.on('request', request => { if (request.url().includes('/api/v1')) requests.push(request.url()); });
  const navigate = async path => {
    await page.evaluate(pathname => { history.pushState({}, '', pathname); dispatchEvent(new PopStateEvent('popstate')); }, path);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.locator('.main-content h1').waitFor();
    await page.waitForFunction(() => !document.querySelector('.main-content .skeleton'));
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const check = async label => {
    inspected.push(label);
    if (await page.getByRole('heading', { name: 'This view couldn’t be opened' }).count()) failures.push(`${label}: error boundary`);
    if (await page.locator('.main-content [role="alert"]').count()) failures.push(`${label}: unexpected alert`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) failures.push(`${label}: horizontal overflow`);
  };
  for (const [role, pages] of Object.entries(roles)) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${origin}/login`);
    await page.getByRole('button', { name: isDepartmentStaff(role) ? roleLabels[role] : role, exact: true }).click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(`**/${role.toLowerCase()}/dashboard`);
    if (await page.getByRole('button', { name: 'Switch to light mode' }).count()) await page.getByRole('button', { name: 'Switch to light mode' }).click();
    for (const viewport of ['desktop', 'mobile']) {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 1000 } : { width: 390, height: 844 });
      for (const module of pages) {
        activeLabel = `${role}/${module}/${viewport}`;
        const modulePath = module === 'detail' ? `queries/${staffQueries[role]}` : module;
        const path = ['profile', 'notifications'].includes(module) ? `/${module}` : `/${role.toLowerCase()}/${modulePath}`;
        await navigate(path);
        await check(`${role}/${module}/${viewport}`);
        if (module === 'dashboard' || module === 'detail' || (role === 'ADMIN' && ['users', 'queries/1'].includes(module))) {
          await page.screenshot({ path: `artifacts/mock-${role.toLowerCase()}-${module.replaceAll('/', '-')}-${viewport}.png`, fullPage: true, animations: 'disabled' });
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await navigate(`/${role.toLowerCase()}/dashboard`);
    if (role === 'ADMIN') {
      await page.getByRole('button', { name: 'Switch to dark mode' }).click();
      await page.screenshot({ path: 'artifacts/mock-admin-dark.png', fullPage: true, animations: 'disabled' });
      await page.getByRole('button', { name: 'Switch to light mode' }).click();
    }
    if (role === 'STUDENT') {
      Object.assign(staffQueries, await page.evaluate(async () => {
        const { default: queries } = await import('/src/api/queriesApi.js');
        const created = {};
        for (const [staffRole, subject] of [['EXAM_STAFF', 'Exam result and transcript'], ['FINANCE_STAFF', 'Tuition fee payment'], ['IT_STAFF', 'University portal password']]) {
          const query = await queries.createQuery({ subject, description: `Please help with my ${subject.toLowerCase()}.`, channel: 'Web', attachments: [] });
          created[staffRole] = query.id;
        }
        return created;
      }));
    }
    await page.getByRole('button', { name: 'Open profile menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
    await page.waitForURL('**/login');
  }
  for (const viewport of ['desktop', 'mobile']) {
    await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 1000 } : { width: 390, height: 844 });
    for (const path of ['login', 'signup']) {
      activeLabel = `${path}/${viewport}`;
      await page.goto(`${origin}/${path}`);
      await page.locator('.auth-form-content h2').waitFor();
      await check(`${path}/${viewport}`);
      await page.screenshot({ path: `artifacts/mock-${path}-${viewport}.png`, fullPage: true, animations: 'disabled' });
    }
  }
  const report = { inspectedPages: inspected.length, inspected, failures, errors, liveApiRequests: requests.length };
  await writeFile('artifacts/department-roles-visual-check.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (failures.length || errors.length || requests.length) process.exitCode = 1;
} catch (error) {
  console.error(`Visual check interrupted at ${activeLabel}: ${page?.url() || origin}`);
  if (page) await page.screenshot({ path: 'artifacts/department-roles-visual-interruption.png', fullPage: true }).catch(() => {});
  await writeFile('artifacts/department-roles-visual-check.json', JSON.stringify({ inspectedPages: inspected.length, inspected, failures: [...failures, `${activeLabel}: ${error.message}`], errors, liveApiRequests: requests.length }, null, 2));
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
