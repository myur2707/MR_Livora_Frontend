import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/api/v1/platform/dashboard', (route) =>
    route.fulfill({ json: { statuses: [{ status: 'DRAFT', total: 1 }] } }),
  );
  await context.route('**/api/v1/platform/societies?**', (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20 } }),
  );
  // Mock current server authorization, preserving the real production route guards.
  const access = {
    societyId: '1',
    membershipId: '2',
    name: 'Synthetic community',
    roles: ['COMMITTEE_ADMIN'],
    permissions: ['society.dashboard.read'],
  };
  await context.route('**/api/v1/auth/session', (route) =>
    route.fulfill({
      json: {
        userId: '3',
        email: 'synthetic@example.invalid',
        platformAdmin: true,
        memberships: [access],
        activeSociety: access,
        expiresAt: '2099-01-01T00:00:00Z',
      },
    }),
  );
});

test('all lazy placeholders and the unknown route render without accessibility violations', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const routes = [
    ['/platform/dashboard', 'Welcome to SocietyEase'],
    ['/platform/societies', 'Your societies'],
    ['/society/dashboard', 'Your community space'],
    ['/login', 'Welcome home'],
    ['/forgot-password', 'A fresh start'],
    ['/reset-password', 'Set a new password'],
    ['/workspace', 'Choose your workspace'],
    ['/ui', 'Good design, in the details'],
    ['/missing-page', 'Page not found'],
  ] as const;
  for (const [route, title] of routes) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
  }
});

test('sidebar collapse and dark theme remain usable and survive refresh', async ({ page }) => {
  await page.goto('/platform/dashboard');
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
  await page.getByRole('link', { name: 'Societies', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your societies', level: 1 })).toBeFocused();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});

test('invalid fields, server feedback and table pagination behave consistently', async ({
  page,
}) => {
  await page.goto('/ui');
  await page.getByRole('button', { name: 'Validate example' }).click();
  await expect(page.getByLabel('Name', { exact: false })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#example-name-description')).toHaveText('Enter name.');
  await page.getByLabel('Name', { exact: false }).fill('Synthetic');
  await page.getByLabel('Email address', { exact: false }).fill('synthetic@example.invalid');
  await page.getByRole('button', { name: 'Validate example' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Nothing was submitted' })).toBeVisible();
  await page.getByRole('button', { name: 'Show server error' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'sample server error' })).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
});

test('modal and drawer trap focus, close on Escape and restore focus', async ({ page }) => {
  await page.goto('/ui');
  for (const label of ['Open dialog', 'Open drawer']) {
    const opener = page.getByRole('button', { name: label, exact: true });
    await opener.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (let n = 0; n < 5; n++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      );
    }
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  }
});

test('mobile navigation works by keyboard and does not overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/platform/dashboard');
  const opener = page.getByRole('button', { name: 'Open navigation' });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Navigation' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('link', { name: 'Societies', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Your societies', level: 1 })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await opener.click();
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(dialog).toBeHidden();
});

test('static shell works offline while authenticated/private responses never enter caches', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const privatePaths = [
    '/api/v1/bills',
    '/api/v1/payments',
    '/api/v1/receipts',
    '/api/v1/residents',
    '/uploads/private.pdf',
    '/api/v1/data.js',
  ];
  for (const path of privatePaths) {
    const result: unknown = await page.evaluate(async (path) => {
      const response = await fetch(path, {
        cache: 'no-store',
        headers: { Authorization: 'Bearer synthetic-browser-fixture' },
        credentials: 'include',
      });
      return response.json() as Promise<unknown>;
    }, path);
    expect(result).toMatchObject({ marker: 'synthetic-private-data' });
  }
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      urls.push(...(await cache.keys()).map((request) => new URL(request.url).pathname));
    }
    return urls;
  });
  for (const path of privatePaths) expect(cached).not.toContain(path);
  await context.setOffline(true);
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome home', level: 1 })).toBeVisible();
  for (const path of privatePaths) {
    const result = await page.evaluate(async (path) => {
      try {
        const response = await fetch(path, { cache: 'no-store' });
        const body = await response.text();
        return response.ok || body.includes('synthetic-private-data')
          ? 'unexpected success'
          : 'network unavailable';
      } catch {
        return 'network unavailable';
      }
    }, path);
    expect(result).toBe('network unavailable');
  }
  await context.setOffline(false);
});

test('manifest satisfies Chromium installability checks', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const session = await context.newCDPSession(page);
  const result: unknown = await session.send('Page.getInstallabilityErrors');
  expect(result).toMatchObject({ installabilityErrors: [] });
  await session.detach();
});
