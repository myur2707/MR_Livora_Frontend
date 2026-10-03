import { test, expect } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.use({ serviceWorkers: 'block' });
const flat = { id: '11', buildingId: '7', buildingCode: 'A', flatNumber: '101', areaSqFt: '12.50' };
const period = {
  id: '21',
  code: 'NOVEMBER',
  kind: 'MONTHLY',
  startsOn: '2026-11-01',
  endsOn: '2026-11-30',
  dueOn: '2026-11-10',
};
const line = {
  configurationId: '31',
  description: 'Maintenance snapshot',
  quantity: '1.00',
  unitRate: '100.25',
  amount: '100.25',
};
const preview = {
  period,
  flats: [
    {
      flatId: '11',
      buildingCode: 'A',
      flatNumber: '101',
      status: 'READY',
      existingBillId: null,
      items: [line],
      exclusions: [],
      gross: '100.25',
      discount: '10.03',
      net: '90.22',
      previousOutstanding: '25.00',
    },
  ],
  gross: '100.25',
  discount: '10.03',
  net: '90.22',
  previewHash: 'a'.repeat(64),
};
const bill = {
  id: '41',
  billNumber: 'B-21-11',
  flatId: '11',
  buildingCode: 'A',
  flatNumber: '101',
  periodCode: 'NOVEMBER',
  startsOn: period.startsOn,
  endsOn: period.endsOn,
  dueOn: period.dueOn,
  status: 'ISSUED',
  gross: '100.25',
  credits: '10.03',
  net: '90.22',
  paid: '0.00',
  outstanding: '90.22',
  creditBalance: '0.00',
  settlementStatus: 'UNPAID',
  previousOutstanding: '25.00',
  items: [line],
  adjustments: [{ id: '51', direction: 'CREDIT', amount: '10.03', reason: 'Approved discount' }],
};
const paged = (items: unknown[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
  summary: { outstanding: '90.22', creditBalance: '0.00' },
});
test('session loss during an unrelated request removes already visible private bill details', async ({
  page,
}) => {
  await mock(page, (route) => route.fulfill({ json: bill }));
  await page.goto('/society/billing/bills/41');
  await expect(page.getByRole('table', { name: 'Issued bill items' })).toContainText(
    'Maintenance snapshot',
  );
  await page.route('**/api/v1/auth/csrf', (route) =>
    route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED' } } }),
  );
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('table', { name: 'Issued bill items' })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Maintenance snapshot');
});
async function mock(
  page: Page,
  handler: (route: Route, path: string) => Promise<void>,
  role = 'COMMITTEE_ADMIN',
) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/csrf') return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (path === '/auth/session') {
      const permissions =
        role === 'RESIDENT'
          ? ['society.dashboard.read']
          : [
              'society.dashboard.read',
              'society.finance.read',
              'society.finance.generate',
              ...(role === 'COMMITTEE_ADMIN'
                ? ['society.finance.configure', 'society.finance.discount']
                : []),
            ];
      const member = {
        societyId: '1',
        membershipId: '2',
        name: 'Synthetic society',
        roles: [role],
        permissions,
      };
      return route.fulfill({
        json: {
          userId: '3',
          email: 'billing@example.invalid',
          platformAdmin: false,
          memberships: [member],
          activeSociety: member,
          expiresAt: '2099-01-01T00:00:00Z',
        },
      });
    }
    return handler(route, path);
  });
}
test('preview, explicit confirmation, audited discount request and issued snapshot details', async ({
  page,
}) => {
  let request: Record<string, unknown> | null = null;
  await mock(page, async (route, path) => {
    if (path === '/society/billing/periods') return route.fulfill({ json: paged([period]) });
    if (path === '/society/billing/flats') return route.fulfill({ json: paged([flat]) });
    if (path === '/society/billing/preview') return route.fulfill({ json: preview });
    if (path === '/society/billing/generate') {
      request = route.request().postDataJSON() as Record<string, unknown>;
      return route.fulfill({
        json: { runId: '61', billIds: ['41'], billCount: 1, replayed: false },
      });
    }
    if (path === '/society/billing/bills/41') return route.fulfill({ json: bill });
    return route.fulfill({ json: paged([]) });
  });
  await page.goto('/society/billing/generate');
  await page.getByRole('button', { name: 'NOVEMBER · MONTHLY', exact: true }).click();
  await page.getByRole('checkbox', { name: 'A / 101', exact: true }).check();
  await page.getByText('Authorize a discount', { exact: true }).click();
  await page.getByLabel('Selected flat').selectOption('11');
  await page.getByLabel('Discount type', { exact: true }).selectOption('PERCENT');
  await page.getByLabel('Discount value').fill('10.00');
  await page.getByLabel('Audited reason').fill('Approved discount');
  await page.getByRole('button', { name: 'Apply discount to preview' }).click();
  await page.getByRole('button', { name: 'Preview bills', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Issue reviewed bills' })).toBeDisabled();
  await expect(
    page.getByText('Previous outstanding is informational. It is not added to these bills.'),
  ).toBeVisible();
  await page.getByRole('checkbox', { name: /I reviewed charges/ }).check();
  await page.getByRole('button', { name: 'Issue reviewed bills' }).click();
  await expect(page.getByRole('heading', { name: '1 bills issued' })).toBeVisible();
  expect(request).toMatchObject({
    periodId: '21',
    flatIds: ['11'],
    discounts: [{ flatId: '11', kind: 'PERCENT', value: '10.00', reason: 'Approved discount' }],
    previewHash: 'a'.repeat(64),
  });
  expect(request).not.toHaveProperty('societyId');
  expect(request).not.toHaveProperty('gross');
  await page.getByRole('link', { name: 'View bill 41', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Issued bill items' })).toContainText(
    'Maintenance snapshot',
  );
  await expect(page.getByText('CREDIT 10.03 — Approved discount', { exact: true })).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});
test('stale generation preview reports a safe conflict and requires another review', async ({
  page,
}) => {
  await mock(page, async (route, path) =>
    route.fulfill(
      path.endsWith('/generate')
        ? {
            status: 409,
            json: { error: { code: 'PREVIEW_CHANGED', message: 'internal SQL must not render' } },
          }
        : {
            json: path.endsWith('/periods')
              ? paged([period])
              : path.endsWith('/flats')
                ? paged([flat])
                : preview,
          },
    ),
  );
  await page.goto('/society/billing/generate');
  await page.getByRole('button', { name: 'NOVEMBER · MONTHLY', exact: true }).click();
  await page.getByRole('checkbox', { name: 'A / 101' }).check();
  await page.getByRole('button', { name: 'Preview bills', exact: true }).click();
  await page.getByRole('checkbox', { name: /I reviewed charges/ }).check();
  await page.getByRole('button', { name: 'Issue reviewed bills' }).click();
  await expect(page.getByRole('alert')).toContainText('Review a new preview');
  await expect(page.locator('body')).not.toContainText('internal SQL');
});
test('configuration form validates amounts and appends a scoped version with exact strings', async ({
  page,
}) => {
  let saved: unknown = null;
  await mock(page, async (route, path) => {
    if (path.endsWith('/charge-types'))
      return route.fulfill({
        json: paged([{ id: '31', code: 'MAINTENANCE', name: 'Maintenance', frequency: 'MONTHLY' }]),
      });
    if (route.request().method() === 'POST') {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: { id: '32', version: 2 } });
    }
    return route.fulfill({ json: paged([]) });
  });
  await page.goto('/society/billing/configuration');
  await page.getByRole('button', { name: 'Add configuration version' }).click();
  await page.getByRole('button', { name: 'MAINTENANCE · Maintenance', exact: true }).click();
  await page.getByLabel('Amount / rate').fill('12.345');
  await page.getByLabel('Effective from').fill('2026-11-01');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByLabel('Amount / rate')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Amount / rate').fill('12.34');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  expect(saved).toMatchObject({
    chargeTypeId: '31',
    scope: 'SOCIETY',
    rate: '12.34',
    effectiveFrom: '2026-11-01',
    effectiveUntil: null,
    enabled: true,
  });
});
test('Accountant has finance navigation and cannot configure or authorize discounts', async ({
  page,
}) => {
  await mock(page, async (route) => route.fulfill({ json: paged([]) }), 'ACCOUNTANT');
  await page.goto('/society/billing/configuration');
  await expect(
    page.getByRole('heading', { name: 'Charge configuration', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add configuration version' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Bills', exact: true })).toBeVisible();
  await page.goto('/society/billing/generate');
  await expect(page.getByText('Authorize a discount', { exact: true })).toHaveCount(0);
});
test('resident finance guard returns to workspace without requesting bill data', async ({
  page,
}) => {
  let financeRequests = 0;
  await mock(
    page,
    async (route) => {
      financeRequests++;
      await route.fulfill({ json: paged([]) });
    },
    'RESIDENT',
  );
  await page.goto('/society/billing/bills');
  await expect(page).toHaveURL(/\/workspace$/);
  expect(financeRequests).toBe(0);
});
test('mobile outstanding table, keyboard scroll and dark theme remain accessible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mock(page, async (route) => route.fulfill({ json: paged([bill]) }));
  await page.goto('/society/billing/outstanding');
  await expect(page.getByRole('table', { name: 'Outstanding issued bills' })).toBeVisible();
  const region = page.getByRole('region', { name: 'Society bills' });
  await region.focus();
  await expect(region).toBeFocused();
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});
