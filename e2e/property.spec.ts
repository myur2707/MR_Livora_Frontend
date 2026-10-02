import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
async function mock(
  page: Page,
  handle: (route: Route, path: string) => Promise<void>,
  role = 'COMMITTEE_ADMIN',
) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/session') {
      const member = {
        societyId: '10',
        membershipId: '20',
        name: 'Synthetic society',
        roles: [role],
        permissions:
          role === 'COMMITTEE_ADMIN'
            ? ['society.dashboard.read', 'society.members.manage']
            : ['society.dashboard.read'],
      };
      return route.fulfill({
        json: {
          userId: '1',
          email: 'committee@example.invalid',
          platformAdmin: false,
          memberships: [member],
          activeSociety: member,
        },
      });
    }
    if (path === '/auth/csrf') return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (route.request().method() !== 'GET')
      expect(route.request().headers()['x-csrf-token']).toBe('synthetic-csrf');
    return handle(route, path);
  });
}
const resource = {
  id: '1',
  version: 'a'.repeat(64),
  createdAt: '2026-01-01T00:00:00Z',
  archivedAt: null,
};
test('directory validates forms, edits with revision and shows safe server conflicts', async ({
  page,
}) => {
  let name = 'Block A';
  await mock(page, async (route, path) => {
    if (route.request().method() === 'PUT') {
      expect(route.request().postDataJSON()).toEqual({
        code: 'A',
        name: 'Updated block',
        version: resource.version,
      });
      name = 'Updated block';
      return route.fulfill({ status: 204 });
    }
    if (route.request().method() === 'POST')
      return route.fulfill({
        status: 409,
        json: { error: { code: 'CONFLICT', message: 'private SQL' } },
      });
    expect(path).toBe('/society/buildings');
    return route.fulfill({
      json: { items: [{ ...resource, code: 'A', name }], total: 1, page: 1, pageSize: 20 },
    });
  });
  await page.goto('/society/buildings');
  await expect(page.getByRole('link', { name: 'Residents', exact: true })).toBeVisible();
  await expect(page.getByRole('rowheader', { name: 'Block A' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Block A' }).click();
  await page.getByLabel(/Building name/).fill('Updated block');
  await page.getByRole('button', { name: 'Save record', exact: true }).click();
  await expect(page.getByRole('rowheader', { name: 'Updated block' })).toBeVisible();
  await page.getByRole('button', { name: 'Add building', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save record', exact: true })).toBeDisabled();
  await page.getByLabel(/Building code/).fill('A');
  await page.getByLabel(/Building name/).fill('Another');
  await page.getByRole('button', { name: 'Save record', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'already exists' })).toBeVisible();
  await expect(page.getByText('private SQL')).toHaveCount(0);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('flat detail separates current/history and preserves start dates when closing', async ({
  page,
}) => {
  const active = {
    id: '3',
    version: resource.version,
    personId: '4',
    displayName: 'Owner One',
    occupancyType: 'OWNER',
    startsOn: '2020-01-01',
    endsOn: null,
  };
  let closed = false;
  await mock(page, async (route, path) => {
    if (path.endsWith('/close')) {
      expect(route.request().postDataJSON()).toEqual({
        version: resource.version,
        endsOn: '2025-12-31',
      });
      closed = true;
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/occupancies')) {
      const filter = new URL(route.request().url()).searchParams.get('filter');
      const items =
        filter === 'history'
          ? [
              {
                ...active,
                id: '2',
                displayName: 'Prior Tenant',
                occupancyType: 'TENANT',
                endsOn: '2021-01-01',
              },
            ]
          : filter === 'current' && closed
            ? []
            : [active];
      return route.fulfill({ json: { items, total: items.length, page: 1, pageSize: 20 } });
    }
    return route.fulfill({
      json: {
        ...resource,
        buildingId: '1',
        buildingCode: 'A',
        buildingName: 'Block A',
        flatNumber: '101',
        areaSqFt: '900.00',
      },
    });
  });
  await page.goto('/society/flats/1');
  await expect(page.getByRole('heading', { name: 'Current occupants' })).toBeVisible();
  await expect(page.getByRole('rowheader', { name: 'Prior Tenant' })).toBeVisible();
  await page.getByRole('button', { name: 'End OWNER occupancy for Owner One' }).first().click();
  await page.getByLabel('Last occupancy date').fill('2025-12-31');
  await page.getByRole('button', { name: 'Confirm end date' }).click();
  await expect(page.getByText('No current occupancies.')).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});
test('CSV correction needs a new preview and confirmation is explicit', async ({ page }) => {
  let previews = 0;
  let confirms = 0;
  const batch = {
    id: '5',
    importType: 'FLATS',
    status: 'REVIEW',
    sourceHash: 'b'.repeat(64),
    reviewHash: 'c'.repeat(64),
    totalRows: 1,
    errorRows: 1,
    warningRows: 0,
    expiresAt: '2099-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    result: null,
  };
  await mock(page, async (route, path) => {
    if (path.endsWith('/preview')) {
      previews++;
      batch.errorRows = previews === 1 ? 1 : 0;
      batch.warningRows = previews === 3 ? 1 : 0;
      return route.fulfill({ json: batch });
    }
    if (path.endsWith('/confirm')) {
      confirms++;
      expect(route.request().postDataJSON()).toEqual({
        sourceHash: batch.sourceHash,
        reviewHash: batch.reviewHash,
        confirmed: true,
        acknowledgeWarnings: true,
      });
      return route.fulfill({
        json: {
          ...batch,
          status: 'CONFIRMED',
          result: { buildings: 1, flats: 1, persons: 0, occupancies: 0 },
        },
      });
    }
    if (path.endsWith('/rows'))
      return route.fulfill({
        json: {
          items: [
            {
              rowNumber: 2,
              lineNumber: 2,
              values: { building_code: 'A', flat_number: '101' },
              errors: batch.errorRows
                ? [{ field: 'area_sq_ft', code: 'INVALID_FIELD', message: 'Use two decimals' }]
                : [],
              warnings: [],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        },
      });
    return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20 } });
  });
  await page.goto('/society/imports');
  await page.getByLabel('CSV file').setInputFiles({
    name: 'flats.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('building_code,building_name,flat_number,area_sq_ft\nA,Block A,101,-1'),
  });
  await expect(page.getByLabel('CSV content')).toHaveValue(
    'building_code,building_name,flat_number,area_sq_ft\nA,Block A,101,-1',
  );
  await page.getByRole('button', { name: 'Validate & preview' }).click();
  await expect(page.getByText(/area_sq_ft: Use two decimals/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeDisabled();
  await page
    .getByLabel('CSV content')
    .fill('building_code,building_name,flat_number,area_sq_ft\nA,Block A,101,900.00');
  await page.getByRole('button', { name: 'Validate & preview' }).click();
  await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeEnabled();
  await page.getByLabel('CSV content').fill('changed');
  await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Validate & preview' }).click();
  const warning = page.getByRole('checkbox', { name: /I reviewed duplicate warnings/ });
  await expect(warning).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeDisabled();
  await warning.check();
  await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  expect(confirms).toBe(0);
  await page.getByRole('button', { name: 'Import reviewed rows' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Created 1 buildings' })).toBeVisible();
  expect(confirms).toBe(1);
  await expect(page.getByLabel('CSV content')).toHaveValue('');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});
test('resident guard redirects management routes and hides management links', async ({ page }) => {
  const requests: string[] = [];
  await mock(
    page,
    async (route, path) => {
      requests.push(path);
      return route.fulfill({ status: 404 });
    },
    'RESIDENT',
  );
  await page.goto('/society/persons');
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole('link', { name: 'Residents', exact: true })).toHaveCount(0);
  expect(requests.some((path) => path.startsWith('/society/persons'))).toBe(false);
});
