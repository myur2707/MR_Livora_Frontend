import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
async function portal(page: Page) {
  let society = '10';
  let expired = false;
  const requests: string[] = [];
  const memberships = ['10', '20'].map((id) => ({
    societyId: id,
    membershipId: id + '1',
    name: 'Community ' + id,
    roles: [id === '10' ? 'RESIDENT' : 'COMMITTEE_MEMBER'],
    permissions: ['society.dashboard.read'],
  }));
  const flat = (id: string) => ({
    id,
    flatNumber: id,
    buildingCode: 'A',
    buildingName: 'Garden',
    areaSqFt: '1000.00',
    occupancies: [{ type: 'TENANT', startsOn: '2026-09-01', endsOn: null }],
  });
  const bill = {
    id: '301',
    flatId: '101',
    billNumber: 'B-301',
    buildingCode: 'A',
    flatNumber: '101',
    periodCode: 'OCT',
    startsOn: '2026-10-01',
    endsOn: '2026-10-31',
    dueOn: '2026-10-10',
    issuedAt: '2026-10-01T00:00:00Z',
    gross: '100.25',
    credits: '0.00',
    net: '100.25',
    paid: '20.00',
    outstanding: '80.25',
    settlementStatus: 'PARTIALLY_PAID',
    items: [
      {
        lineNumber: 1,
        description: 'Maintenance',
        quantity: '1.00',
        unitRate: '100.25',
        amount: '100.25',
      },
    ],
  };
  const payment = {
    id: '401',
    flatId: '101',
    method: 'CASH',
    paymentDate: '2026-10-02',
    amount: '20.00',
    reference: null,
    receiptNumber: 'R-401',
    issuedAt: '2026-10-02T00:00:00Z',
    recordedAt: '2026-10-02T00:00:00Z',
    societyName: 'Community 10',
    buildingCode: 'A',
    flatNumber: '101',
    payerName: 'My resident profile',
    status: 'RECORDED',
    refunded: '0.00',
    netAmount: '20.00',
    allocations: [{ billNumber: 'B-301', amount: '20.00', refunded: '0.00' }],
    refunds: [],
  };
  const notice = {
    id: '501',
    title: 'Water supply',
    body: '<script>unsafe()</script> is plain text',
    publishedAt: '2026-10-01T00:00:00Z',
  };
  const complaint = {
    category: 'PLUMBING',
    id: '601',
    flatId: '101',
    title: 'Water pressure',
    description: 'Please check the pipe.',
    status: 'NEW',
    createdAt: '2026-10-03T00:00:00Z',
    resolvedAt: null,
    buildingCode: 'A',
    flatNumber: '101',
  };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1/', '');
    requests.push(path + url.search);
    if (path === 'auth/csrf') return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (request.method() === 'POST')
      expect(request.headers()['x-csrf-token']).toBe('synthetic-csrf');
    if (expired) return route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED' } } });
    if (path === 'auth/session')
      return route.fulfill({
        json: {
          userId: '1',
          email: 'resident@example.invalid',
          platformAdmin: false,
          memberships,
          activeSociety: memberships.find((m) => m.societyId === society),
          expiresAt: '2099-01-01T00:00:00Z',
        },
      });
    if (path === 'auth/society-context') {
      const body: unknown = request.postDataJSON();
      expect(body).toEqual({ societyId: '20' });
      society = '20';
      return route.fulfill({ status: 204 });
    }
    const resource = path.replace('society/resident/', '');
    const list = (items: unknown[]) =>
      route.fulfill({
        json: {
          items,
          total: items.length,
          page: Number(url.searchParams.get('page') ?? 1),
          pageSize: 20,
        },
      });
    if (resource === 'dashboard')
      return route.fulfill({
        json: {
          societyName: 'Community ' + society,
          timezone: 'Asia/Kolkata',
          currentDue: society === '10' ? '80.25' : '0.00',
          overdue: '0.00',
          recentPayment: society === '10' ? payment : null,
          notices: society === '10' ? [notice] : [],
        },
      });
    if (resource === 'profile')
      return route.fulfill({
        json: {
          displayName: 'My profile ' + society,
          contactEmail: null,
          contactPhone: 'own-contact',
          loginEmail: 'resident@example.invalid',
          societyName: 'Community ' + society,
          timezone: 'Asia/Kolkata',
        },
      });
    if (resource === 'flats') return list(society === '10' ? [flat('101'), flat('102')] : []);
    if (society === '10') {
      if (resource === 'flats/101') return route.fulfill({ json: flat('101') });
      if (resource === 'bills') return list([bill]);
      if (resource === 'bills/301') return route.fulfill({ json: bill });
      if (resource === 'payments' || resource === 'receipts') return list([payment]);
      if (resource === 'payments/401/receipt') return route.fulfill({ json: payment });
      if (resource === 'notices') return list([notice]);
      if (resource === 'notices/501') return route.fulfill({ json: notice });
      if (resource === 'complaints/601') return route.fulfill({ json: complaint });
      if (resource === 'complaints/601/history')
        return list([
          {
            id: '1',
            fromStatus: null,
            toStatus: 'NEW',
            note: 'Complaint submitted',
            revision: 1,
            createdAt: '2026-10-03T00:00:00Z',
          },
        ]);
      if (resource === 'complaints') {
        if (request.method() === 'POST') {
          expect(request.postDataJSON()).toEqual({
            category: 'OTHER',
            flatId: '101',
            title: 'Water pressure',
            description: 'Please check the pipe.',
          });
          return route.fulfill({ status: 201, json: { id: '601' } });
        }
        return list([complaint]);
      }
    }
    if (
      society === '20' &&
      ['bills', 'payments', 'receipts', 'notices', 'complaints'].includes(resource)
    )
      return list([]);
    return route.fulfill({
      status: 404,
      json: { error: { code: 'NOT_FOUND', message: 'Private untrusted detail' } },
    });
  });
  return {
    requests,
    expire: () => {
      expired = true;
    },
  };
}

test('resident routes show multiple flats, exact bill totals, own payments and profile', async ({
  page,
}) => {
  await portal(page);
  for (const [route, heading] of [
    ['dashboard', 'Your community space'],
    ['flats', 'My Flats'],
    ['flats/101', 'My Flat details'],
    ['bills', 'My Bills'],
    ['bills/301', 'My Bill details'],
    ['payments', 'Payment History'],
    ['receipts', 'My Receipts'],
    ['notices', 'Notices'],
    ['profile', 'My Profile'],
  ] as const) {
    await page.goto('/society/resident/' + route);
    await expect(page.getByRole('heading', { name: heading, exact: true, level: 1 })).toBeVisible();
    if (route === 'flats') await expect(page.getByRole('link', { name: /102/ })).toBeVisible();
    if (route === 'bills/301')
      await expect(page.getByText('₹ 80.25', { exact: true })).toBeVisible();
    if (route === 'profile')
      await expect(page.getByText('own-contact', { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Societies', exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage))),
  ).toEqual([]);
});

test('society switch destroys private views, refreshes context and supports no approved flats', async ({
  page,
}) => {
  await portal(page);
  await page.goto('/society/resident/payments/401/receipt');
  await expect(page.getByRole('heading', { name: 'Receipt R-401' })).toBeVisible();
  await page.locator('#community-switch').selectOption('20');
  await expect(page).toHaveURL(/resident\/dashboard$/);
  await expect(page.getByText('Receipt R-401', { exact: true })).toHaveCount(0);
  await expect(
    page.locator('.page-heading').getByText('Community 20', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'My Flats', exact: true }).first().click();
  await expect(page.getByText(/No current authorized flats/)).toBeVisible();
  await page.goto('/society/resident/complaints');
  await expect(
    page.getByText('A current approved flat occupancy is required to submit a complaint.'),
  ).toBeVisible();
});

test('foreign identifiers display safe errors and resident cannot open committee routes', async ({
  page,
}) => {
  await portal(page);
  for (const route of ['bills/999', 'flats/999', 'payments/999/receipt', 'complaints/999']) {
    await page.goto('/society/resident/' + route);
    await expect(page.getByRole('alert')).toContainText('This record is unavailable');
    await expect(page.getByText('Private untrusted detail')).toHaveCount(0);
  }
  await page.goto('/society/billing/bills');
  await expect(page).toHaveURL(/workspace$/);
});

test('expired private request clears resident views and fails closed on refresh', async ({
  page,
}) => {
  const api = await portal(page);
  await page.goto('/society/resident/payments/401/receipt');
  await expect(page.getByRole('heading', { name: 'Receipt R-401' })).toBeVisible();
  await page.getByRole('link', { name: 'My community', exact: true }).first().click();
  await expect(page.getByText('₹ 80.25', { exact: true })).toBeVisible();
  api.expire();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByText('Receipt R-401')).toHaveCount(0);
  await expect(page.getByText('₹ 80.25', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Community access unavailable' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome home' })).toBeVisible();
});

test('complaint validation is associated with fields and submit uses authorized flat and CSRF', async ({
  page,
}) => {
  await portal(page);
  await page.goto('/society/resident/complaints');
  await page.getByRole('button', { name: 'Send complaint', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: false })).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Your flat', { exact: false }).selectOption('101');
  await page.getByLabel('Title', { exact: false }).fill('Water pressure');
  await page.getByLabel('Description', { exact: false }).fill('Please check the pipe.');
  await page.getByRole('button', { name: 'Send complaint', exact: true }).click();
  await expect(page).toHaveURL(/complaints\/601$/);
  await expect(page.getByText('Please check the pipe.', { exact: true })).toBeVisible();
  await page.goto('/society/resident/notices/501');
  await expect(
    page.getByText('<script>unsafe()</script> is plain text', { exact: true }),
  ).toBeVisible();
  expect(await page.locator('main script').count()).toBe(0);
});

test('bill filters are explicit and printable receipt excludes staff identities', async ({
  page,
}, testInfo) => {
  const api = await portal(page);
  await page.goto('/society/resident/bills?flatId=101');
  await page.getByLabel('Bill status').selectOption('OUTSTANDING');
  await page.getByRole('button', { name: 'Apply filter' }).click();
  await expect
    .poll(() =>
      api.requests.some(
        (request) => request.includes('status=OUTSTANDING') && request.includes('flatId=101'),
      ),
    )
    .toBe(true);
  const previousRequests = api.requests.length;
  await page.getByRole('link', { name: 'My Bills', exact: true }).first().click();
  await expect
    .poll(() =>
      api.requests
        .slice(previousRequests)
        .some(
          (request) =>
            request.startsWith('society/resident/bills?') && !request.includes('flatId='),
        ),
    )
    .toBe(true);
  await page.goto('/society/resident/payments/401/receipt');
  await expect(page.getByRole('button', { name: 'Print / save PDF' })).toBeVisible();
  await page.evaluate(() => {
    const original = window.print.bind(window);
    window.print = () => {
      document.documentElement.dataset['receiptPrintCalled'] = 'true';
      original();
    };
  });
  await page.getByRole('button', { name: 'Print / save PDF' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-receipt-print-called', 'true');
  const pdf = await page.pdf({
    path: testInfo.outputPath('own-receipt.pdf'),
    format: 'A4',
    tagged: true,
  });
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(5000);
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('article', { name: 'My printable receipt' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Receipt R-401' })).toBeVisible();
  await expect(page.getByText(/collected.by|recorded.by|private-contact/i)).toHaveCount(0);
});

test('resident screens remain accessible in both themes at 320px', async ({ page }) => {
  test.setTimeout(90000);
  await portal(page);
  await page.setViewportSize({ width: 320, height: 780 });
  for (const route of ['dashboard', 'bills/301', 'complaints', 'payments/401/receipt']) {
    await page.goto('/society/resident/' + route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /Loading/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const theme of ['dark', 'light']) {
      await page.getByRole('button', { name: 'Switch to ' + theme + ' theme' }).click();
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
    }
  }
});
