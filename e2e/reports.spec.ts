import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test.use({ serviceWorkers: 'block' });

async function reports(page: Page, role = 'COMMITTEE_ADMIN', exports = true) {
  let expired = false,
    society = '10',
    denied = false;
  let hold: (() => void) | undefined;
  let waiting = false;
  let completed = false;
  const queries: URLSearchParams[] = [];
  const csv = '\uFEFF"Resident","Contact"\r\n"\'=SUM(1,2)","\'+123"\r\n';
  const memberships = ['10', '20'].map((id) => ({
    societyId: id,
    membershipId: id + '1',
    name: 'Community ' + id,
    roles: [role],
    permissions: [
      'society.dashboard.read',
      ...(role === 'RESIDENT' ? [] : ['society.dashboard.manage']),
      ...(['COMMITTEE_ADMIN', 'ACCOUNTANT'].includes(role) ? ['society.finance.read'] : []),
      ...(role === 'COMMITTEE_ADMIN' ? ['society.members.manage'] : []),
      ...(exports && ['COMMITTEE_ADMIN', 'ACCOUNTANT'].includes(role)
        ? ['society.reports.export']
        : []),
    ],
  }));
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname.replace('/api/v1/', '');
    if (path === 'auth/csrf')
      return route.fulfill({ json: { csrfToken: 'synthetic-reports-csrf' } });
    if (expired) return route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED' } } });
    if (path === 'auth/session')
      return route.fulfill({
        json: {
          userId: '1',
          email: 'reports@example.invalid',
          platformAdmin: false,
          memberships,
          activeSociety: memberships.find((item) => item.societyId === society),
          expiresAt: '2099-01-01T00:00:00Z',
        },
      });
    if (path === 'auth/society-context') {
      expect(route.request().headers()['x-csrf-token']).toBe('synthetic-reports-csrf');
      const body: unknown = route.request().postDataJSON();
      expect(body).toEqual({ societyId: '20' });
      society = '20';
      return route.fulfill({ status: 204 });
    }
    if (path === 'society/dashboard')
      return route.fulfill({
        json: {
          timezone: 'Asia/Kolkata',
          asOf: '2026-10-05',
          flats: society === '10' ? 2 : 3,
          occupancy: {
            occupiedFlats: 1,
            occupancies: 2,
            persons: 2,
            types: [
              { type: 'OWNER', total: 1 },
              { type: 'TENANT', total: 1 },
            ],
          },
          pendingComplaints: 1,
          recentNotices: [
            {
              id: '501',
              title: 'Water <script>literal</script>',
              publishedAt: '2026-10-03T01:00:00Z',
            },
          ],
          finance:
            role === 'COMMITTEE_MEMBER'
              ? null
              : {
                  billing: { outstanding: '190.00' },
                  billingStatuses: [{ status: 'OVERDUE', total: 2 }],
                  collections: { collections: '150.40', netRecorded: '110.35' },
                  cash: { collections: '120.30', netRecorded: '80.25' },
                  from: '2026-10-01',
                  to: '2026-10-05',
                },
        },
      });
    if (path.startsWith('society/reports/')) {
      if (path.endsWith('/export')) {
        waiting = true;
        if (hold)
          await new Promise<void>((resolve) => {
            hold = resolve;
          });
        if (denied)
          return route.fulfill({ status: 422, json: { error: { code: 'EXPORT_TOO_LARGE' } } });
        await route.fulfill({
          contentType: 'text/csv; charset=utf-8',
          headers: { 'cache-control': 'no-store' },
          body: csv,
        });
        completed = true;
        return;
      }
      queries.push(url.searchParams);
      const kind = path.split('/').at(-1),
        pageNumber = Number(url.searchParams.get('page') ?? 1);
      return route.fulfill({
        json: {
          kind,
          columns: [
            { key: 'name', label: 'Record', type: 'text' },
            { key: 'amount', label: 'Amount', type: 'money' },
          ],
          items: [
            { id: String(pageNumber), name: 'Private report row ' + pageNumber, amount: '100.25' },
          ],
          total: 21,
          page: pageNumber,
          pageSize: 20,
          summary:
            kind === 'residents' || kind === 'flat-occupancy'
              ? {}
              : { outstanding: '190.00', paid: '110.35' },
          timezone: 'Asia/Kolkata',
          asOf: '2026-10-05',
          range: { from: null, to: null },
        },
      });
    }
    return route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND' } } });
  });
  return {
    queries,
    csv,
    expire: () => {
      expired = true;
    },
    deny: () => {
      denied = true;
    },
    delayExport: () => {
      hold = () => {};
    },
    exportWaiting: () => waiting,
    exportCompleted: () => completed,
    releaseExport: () => {
      hold?.();
      hold = undefined;
    },
  };
}

test('reports preserve full-filter totals across pages and validate associated dates', async ({
  page,
}) => {
  const fixture = await reports(page);
  await page.goto('/society/reports/outstanding');
  await expect(
    page.getByRole('heading', { name: 'Outstanding report', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Report totals')).toContainText('₹ 190.00');
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByText('Private report row 2', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Report totals')).toContainText('₹ 190.00');
  expect(fixture.queries.at(-1)?.get('page')).toBe('2');
  const before = fixture.queries.length;
  await page.getByLabel('From date', { exact: false }).fill('2026-10-03');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page.getByLabel('From date', { exact: false })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByText('Choose both dates or leave both blank.')).toHaveCount(2);
  expect(fixture.queries.length).toBe(before);
  await page.getByLabel('Through date', { exact: false }).fill('2026-10-04');
  await page.getByLabel('Search report', { exact: true }).fill('A-101');
  await page.getByLabel('Status', { exact: true }).selectOption('OVERDUE');
  await page.getByLabel('Sort by', { exact: true }).selectOption('outstanding');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page.getByText('Private report row 1', { exact: true })).toBeVisible();
  const filter = fixture.queries.at(-1);
  expect(Object.fromEntries(filter?.entries() ?? [])).toMatchObject({
    from: '2026-10-03',
    to: '2026-10-04',
    q: 'A-101',
    status: 'OVERDUE',
    sort: 'outstanding',
    page: '1',
  });
  expect(filter?.has('societyId')).toBe(false);
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect.poll(() => fixture.queries.at(-1)?.has('from')).toBe(false);
});

test('CSV download preserves safe content and oversized exports show a clear outcome', async ({
  page,
}) => {
  const fixture = await reports(page);
  await page.goto('/society/reports/residents');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const artifact = await download,
    path = await artifact.path();
  expect(artifact.suggestedFilename()).toBe('livora-residents.csv');
  expect(path).not.toBeNull();
  if (path) expect(await readFile(path, 'utf8')).toBe(fixture.csv);
  fixture.deny();
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Narrow the filters to export at most 5000 records.',
  );
  expect(
    await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage))),
  ).toEqual([]);
});

test('nonfinancial reports omit empty totals and remain accessible in both themes', async ({
  page,
}) => {
  await reports(page);
  await page.setViewportSize({ width: 320, height: 760 });
  for (const kind of ['residents', 'flat-occupancy']) {
    await page.goto('/society/reports/' + kind);
    await expect(page.getByText('Private report row 1', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Report totals', { exact: true })).toHaveCount(0);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(
        (value) => document.documentElement.setAttribute('data-theme', value),
        theme,
      );
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  }
});

test('society switch discards an in-flight private export and loads the new dashboard', async ({
  page,
}) => {
  const fixture = await reports(page);
  await page.goto('/society/reports/payments');
  fixture.delayExport();
  const downloads: string[] = [];
  page.on('download', (download) => downloads.push(download.suggestedFilename()));
  await page.evaluate(() => {
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (value) => {
      document.documentElement.dataset['reportBlob'] = 'created';
      return create(value);
    };
  });
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await expect.poll(() => fixture.exportWaiting()).toBe(true);
  await page.locator('#community-switch').selectOption('20');
  await expect(page).toHaveURL(/society\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: 'Committee dashboard', exact: true }),
  ).toBeVisible();
  fixture.releaseExport();
  await expect.poll(() => fixture.exportCompleted()).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.getByLabel('Community totals')).toContainText('Active flats3');
  await expect(page.getByText('Private report row 1', { exact: true })).toHaveCount(0);
  await expect.poll(() => downloads.length).toBe(0);
  expect(await page.evaluate(() => document.documentElement.dataset['reportBlob'])).toBeUndefined();
});

test('role-specific dashboards and report guards preserve financial and resident privacy', async ({
  browser,
}) => {
  for (const role of ['COMMITTEE_MEMBER', 'ACCOUNTANT', 'RESIDENT']) {
    const context = await browser.newContext({ serviceWorkers: 'block' }),
      page = await context.newPage();
    await reports(page, role, false);
    if (role === 'COMMITTEE_MEMBER') {
      await page.goto('/society/dashboard');
      await expect(page.getByRole('heading', { name: 'Committee dashboard' })).toBeVisible();
      await expect(page.getByText('Maintenance and collections', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Water <script>literal</script>', { exact: true })).toBeVisible();
      await expect(page.locator('se-committee-dashboard script')).toHaveCount(0);
    }
    await page.goto('/society/reports/' + (role === 'ACCOUNTANT' ? 'payments' : 'billing'));
    if (role === 'ACCOUNTANT') {
      await expect(
        page.getByRole('heading', { name: 'Payments report', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Residents', exact: true })).toHaveCount(0);
      await page.goto('/society/reports/residents');
    }
    await expect(page).toHaveURL(/workspace$/);
    await expect(page.getByText('Private report row 1', { exact: true })).toHaveCount(0);
    await context.close();
  }
});

test('mobile reports remain keyboard accessible in both themes and clear on session expiry', async ({
  page,
}) => {
  const fixture = await reports(page);
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/society/reports/payments');
  await expect(page.getByText('Private report row 1', { exact: true })).toBeVisible();
  const table = page.getByRole('region', { name: 'Payments report table', exact: true });
  await table.focus();
  await expect(table).toBeFocused();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  fixture.expire();
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page.getByText('Private report row 1', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toHaveCount(0);
});
