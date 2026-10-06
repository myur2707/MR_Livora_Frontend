import AxeBuilder from '@axe-core/playwright';
test('production CSP blocks inline scripts while application styles and navigation load', async ({
  page,
}) => {
  const response = await page.goto('/login');
  await expect(page).toHaveTitle('Sign in · MR Livora');
  await expect(page.getByRole('link', { name: 'MR Livora home', exact: true })).toBeVisible();
  await expect(page.locator('.auth-footer')).toHaveText('Live in a Better Aura');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
  await expect(page.getByRole('heading', { name: 'Welcome home' })).toBeVisible();
  expect(
    await page
      .getByRole('button', { name: 'Switch to dark theme' })
      .evaluate((node) => node.getBoundingClientRect().width),
  ).toBeGreaterThan(30);
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = "document.documentElement.dataset['inlineExecuted'] = 'yes'";
    document.body.append(script);
  });
  expect(
    await page.evaluate(() => document.documentElement.dataset['inlineExecuted']),
  ).toBeUndefined();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/api/v1/society/resident/dashboard', (route) =>
    route.fulfill({
      json: {
        societyName: 'Synthetic community',
        timezone: 'Asia/Kolkata',
        currentDue: '0.00',
        overdue: '0.00',
        recentPayment: null,
        notices: [],
      },
    }),
  );
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
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const routes = [
    ['/platform/dashboard', 'Welcome to MR Livora'],
    ['/platform/societies', 'Your societies or flats or townships'],
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
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto('/platform/dashboard');
  await expect(page.locator('.desktop-sidebar .brand-logo')).toHaveAttribute(
    'src',
    '/assets/brand/logo.png',
  );
  await expect(page.locator('.desktop-sidebar .brand')).toHaveCSS('align-items', 'center');
  await expect(page.locator('.desktop-sidebar .brand-subtitle')).toHaveCSS('text-align', 'center');
  await expect(
    page.getByRole('button', { name: 'Collapse sidebar' }).locator('path'),
  ).toHaveAttribute('d', 'M3 3h18v18H3zM8 3v18m8-13-4 4 4 4');
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.locator('.desktop-sidebar .brand-mark')).toHaveAttribute(
    'src',
    '/assets/brand/monogram.png',
  );
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Expand sidebar' }).locator('path'),
  ).toHaveAttribute('d', 'M3 3h18v18H3zM16 3v18M8 8l4 4-4 4');
  await page.getByRole('link', { name: 'Societies or Flats or Townships', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your societies or flats or townships', level: 1 }),
  ).toBeFocused();
  await expect(page.getByRole('button', { name: 'Add society' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Refresh societies/i })).toHaveCount(0);
  expect(
    await page.locator('main').evaluate((main) => main.scrollHeight <= main.clientHeight),
  ).toBe(true);
  await page.getByRole('button', { name: 'Add society' }).click();
  const createDialog = page.getByRole('dialog', { name: 'New society or flat or township' });
  await expect(createDialog).toBeVisible();
  await expect(createDialog.getByLabel('Society or Flat or Township code')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(createDialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Add society' })).toBeFocused();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const pageHeading = page.getByRole('heading', {
    name: 'Your societies or flats or townships',
    level: 1,
  });
  await expect(pageHeading).toBeFocused();
  expect(await pageHeading.evaluate((heading) => getComputedStyle(heading).outlineStyle)).toBe(
    'none',
  );
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
  await dialog.getByRole('link', { name: 'Societies or Flats or Townships', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Your societies or flats or townships', level: 1 }),
  ).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await opener.click();
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(dialog).toBeHidden();
});

test('populated tables scroll within their container on narrow screens', async ({
  page,
  context,
}) => {
  await context.route('**/api/v1/platform/societies?**', (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: '1',
            code: 'SYNTHETIC_COMMUNITY_WITH_A_LONG_CODE',
            name: 'Synthetic community with a long name',
            status: 'SETUP_IN_PROGRESS',
            revision: 1,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    }),
  );
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/platform/societies');
  const table = page.getByRole('table', { name: 'Society or Flat or Township directory' });
  await expect(table).toBeVisible();
  const scroll = page.getByRole('region', { name: 'Society or Flat or Township directory' });
  expect(await scroll.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await scroll.focus();
  await expect(scroll).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.keyboard.press('Tab');
  await table.getByRole('link', { name: /View setup/ }).focus();
  await expect(table.getByRole('link', { name: /View setup/ })).toBeFocused();
  expect(await scroll.evaluate((element) => element.scrollLeft > 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});

test('static shell works offline while authenticated/private responses never enter caches', async ({
  page,
  context,
}) => {
  // Cache checks must fetch the preview server's cacheable sentinel, without an API mock.
  await context.unroute('**/api/v1/society/resident/dashboard');
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
    '/api/v1/society/persons',
    '/api/v1/society/imports/1/rows',
    '/api/v1/society/flats/1/occupancies',
    '/api/v1/society/billing/bills',
    '/api/v1/society/billing/outstanding',
    '/api/v1/society/billing/payments',
    '/api/v1/society/billing/payments/1/receipt',
    '/api/v1/society/billing/payments/report',
    '/api/v1/society/resident/dashboard',
    '/api/v1/society/resident/flats',
    '/api/v1/society/resident/bills/1',
    '/api/v1/society/resident/payments/1/receipt',
    '/api/v1/society/resident/receipts',
    '/api/v1/society/resident/notices',
    '/api/v1/society/resident/complaints',
    '/api/v1/society/resident/profile',
    '/api/v1/society/dashboard',
    ...[
      'outstanding',
      'collection',
      'cash-collection',
      'payments',
      'residents',
      'flat-occupancy',
      'billing',
    ].flatMap((kind) => [
      '/api/v1/society/reports/' + kind,
      '/api/v1/society/reports/' + kind + '/export',
    ]),
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
  expect(cached).toContain('/assets/brand/logo.png');
  expect(cached).toContain('/assets/brand/monogram.png');
  await context.setOffline(true);
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome home', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'MR Livora home' })).toBeVisible();
  expect(
    await page.locator('.brand-logo').evaluate(async (image: HTMLImageElement) => {
      await image.decode();
      return image.naturalWidth > 0;
    }),
  ).toBe(true);
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
