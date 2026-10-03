import { test, expect } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.use({ serviceWorkers: 'block' });
const paged = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 20 });
const bill = {
  id: '31',
  billNumber: 'B-AUG',
  flatId: '11',
  buildingCode: 'A',
  flatNumber: '101',
  periodCode: 'AUG',
  status: 'ISSUED',
  outstanding: '100.25',
};
const payment = {
  id: '41',
  flatId: '11',
  payerPersonId: '21',
  collectedByUserId: '3',
  recordedByUserId: '3',
  method: 'CASH',
  paymentDate: '2026-10-02',
  amount: '100.25',
  reference: null,
  notes: 'Synthetic collection',
  receiptNumber: 'R-1-41',
  issuedAt: '2026-10-02T10:00:00Z',
  recordedAt: '2026-10-02T10:00:00Z',
  societyName: 'Synthetic society',
  currency: 'INR',
  buildingCode: 'A',
  flatNumber: '101',
  payerName: 'Synthetic payer',
  collectorName: 'Synthetic collector',
  recorderName: 'Synthetic recorder',
  legacyReceipt: 0,
  status: 'RECORDED',
  refunded: '0.00',
  netAmount: '100.25',
  allocations: [{ billId: '31', billNumber: 'B-AUG', amount: '100.25', refunded: '0.00' }],
  refunds: [],
  reversal: null,
  correctedFromPaymentId: null,
};
async function mock(
  page: Page,
  handler: (route: Route, path: string) => Promise<void>,
  role = 'COMMITTEE_ADMIN',
) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/csrf') return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (path === '/auth/session') {
      const member = {
        societyId: '1',
        membershipId: '2',
        name: 'Synthetic society',
        roles: [role],
        permissions:
          role === 'RESIDENT'
            ? ['society.dashboard.read']
            : [
                'society.dashboard.read',
                'society.finance.read',
                'society.finance.record',
                ...(role === 'COMMITTEE_ADMIN' ? ['society.finance.reverse'] : []),
              ],
      };
      return route.fulfill({
        json: {
          userId: '3',
          email: 'payments@example.invalid',
          platformAdmin: false,
          memberships: [member],
          activeSociety: member,
          expiresAt: '2099-01-01T00:00:00Z',
        },
      });
    }
    if (path === '/society/billing/flats')
      return route.fulfill({ json: paged([{ id: '11', buildingCode: 'A', flatNumber: '101' }]) });
    if (path === '/society/billing/payments/payers')
      return route.fulfill({ json: paged([{ id: '21', name: 'Synthetic payer' }]) });
    if (
      path === '/society/billing/payments/collectors' ||
      path === '/society/billing/payments/report-collectors'
    )
      return route.fulfill({ json: paged([{ id: '3', name: 'Synthetic collector' }]) });
    if (path === '/society/billing/bills')
      return route.fulfill({
        json: paged([bill, { ...bill, id: '32', billNumber: 'B-SEP', outstanding: '200.75' }]),
      });
    return handler(route, path);
  });
}
test('record a partial payment across bills with CSRF, actor validation contract and printable receipt', async ({
  page,
}) => {
  let recorded: Record<string, unknown> = {};
  await mock(page, async (route, path) => {
    if (path === '/society/billing/payments' && route.request().method() === 'POST') {
      recorded = route.request().postDataJSON() as Record<string, unknown>;
      expect(route.request().headers()['x-csrf-token']).toBe('synthetic-csrf');
      return route.fulfill({ status: 201, json: { paymentId: '41', replayed: false } });
    }
    return route.fulfill({ json: payment });
  });
  await page.goto('/society/billing/payments/new');
  await page.getByRole('button', { name: 'A / 101', exact: true }).click();
  await page.getByRole('button', { name: 'Synthetic payer', exact: true }).click();
  await page.getByRole('button', { name: 'Synthetic collector', exact: true }).click();
  await page.getByLabel('Payment date').fill('2026-10-02');
  await page.getByLabel('Amount', { exact: false }).first().fill('150.00');
  await page.getByLabel('Allocate to B-AUG').fill('100.25');
  await page.getByLabel('Allocate to B-SEP').fill('49.75');
  await expect(page.getByRole('status').filter({ hasText: 'Allocated total:' })).toHaveText(
    'Allocated total: 150.00',
  );
  await page.getByRole('checkbox', { name: /confirm this money/ }).check();
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  await expect(page).toHaveURL(/payments\/41$/);
  expect(recorded['amount']).toBe('150.00');
  expect(recorded['allocations']).toEqual([
    { billId: '31', amount: '100.25' },
    { billId: '32', amount: '49.75' },
  ]);
  expect(recorded).not.toHaveProperty('recordedByUserId');
  expect(recorded).not.toHaveProperty('societyId');
  expect(recorded['idempotencyKey']).toMatch(/^[a-f0-9-]{36}$/);
  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset['printCalled'] = 'true';
    };
  });
  await page.getByRole('button', { name: 'Print receipt' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-print-called', 'true');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.desktop-sidebar')).toBeHidden();
  await expect(page.getByRole('article', { name: 'Printable payment receipt' })).toBeVisible();
  await expect(page.getByText('R-1-41', { exact: false })).toBeVisible();
});
test('partial refund restores allocation, marks original receipt and hides correction after refund', async ({
  page,
}) => {
  let refunded = false,
    body: Record<string, unknown> = {};
  await mock(page, async (route, path) => {
    if (path.endsWith('/refund')) {
      body = route.request().postDataJSON() as Record<string, unknown>;
      refunded = true;
      return route.fulfill({ json: { paymentId: '41', refundId: '51' } });
    }
    return route.fulfill({
      json: refunded
        ? {
            ...payment,
            status: 'PARTIALLY_REFUNDED',
            refunded: '25.00',
            netAmount: '75.25',
            allocations: [{ ...payment.allocations[0], refunded: '25.00' }],
            refunds: [
              {
                id: '51',
                amount: '25.00',
                operationDate: '2026-10-02',
                method: 'CASH',
                reason: 'Physical refund recorded',
                reference: null,
              },
            ],
          }
        : payment,
    });
  });
  await page.goto('/society/billing/payments/41');
  await page.getByRole('button', { name: 'Record refund', exact: true }).click();
  await page.getByLabel('Action date').fill('2026-10-02');
  await page.getByLabel('Reason', { exact: false }).fill('Physical refund recorded');
  await page.getByLabel('Refund from B-AUG').fill('25.00');
  await page.getByRole('checkbox', { name: /money was returned/ }).check();
  await page.getByRole('button', { name: 'Confirm action' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Refund recorded;' })).toBeVisible();
  expect(body['amount']).toBe('25.00');
  expect(body['allocations']).toEqual([{ billId: '31', amount: '25.00' }]);
  await expect(page.getByRole('link', { name: 'Correct payment' })).toHaveCount(0);
  await expect(page.getByText('Receipt R-1-41 · PARTIALLY_REFUNDED')).toBeVisible();
});
test('correction sends a linked replacement while retaining the original record', async ({
  page,
}) => {
  let body: Record<string, unknown> = {};
  await mock(page, async (route, path) => {
    if (path.endsWith('/correct')) {
      body = route.request().postDataJSON() as Record<string, unknown>;
      return route.fulfill({ json: { paymentId: '41', replacementPaymentId: '42' } });
    }
    return route.fulfill({
      json: path.endsWith('/42')
        ? {
            ...payment,
            id: '42',
            receiptNumber: 'R-1-42',
            method: 'UPI',
            correctedFromPaymentId: '41',
          }
        : payment,
    });
  });
  await page.goto('/society/billing/payments/41/correct');
  await page.getByLabel('Method', { exact: false }).first().selectOption('UPI');
  await page.getByLabel('Transaction reference').fill('Synthetic transfer reference');
  await page.getByLabel('Correction date').fill('2026-10-02');
  await page.getByLabel('Correction reason').fill('Correct the payment method');
  await page.getByRole('checkbox', { name: /reviewed the replacement/ }).check();
  await page.getByRole('button', { name: 'Confirm correction' }).click();
  await expect(page).toHaveURL(/payments\/42$/);
  expect(body['replacement']).toMatchObject({ flatId: '11', method: 'UPI', amount: '100.25' });
  expect(body).not.toHaveProperty('recordedByUserId');
  await expect(page.getByRole('link', { name: 'View original' })).toBeVisible();
  await page.getByRole('link', { name: 'View original' }).click();
  await expect(page).toHaveURL(/payments\/41$/);
  await expect(page.getByText('Receipt R-1-41 · RECORDED')).toBeVisible();
});
test('collection filters encode dates, method and authorized collector and show signed reconciliation', async ({
  page,
}) => {
  let query = '';
  await mock(page, async (route) => {
    query = new URL(route.request().url()).search;
    return route.fulfill({
      json: {
        ...paged([
          {
            id: '41',
            paymentId: '41',
            kind: 'COLLECTION',
            eventDate: '2026-10-02',
            method: 'CASH',
            amount: '100.25',
            receiptNumber: 'R-1-41',
            reference: null,
          },
        ]),
        summary: {
          collections: '100.25',
          refunds: '25.00',
          reversals: '0.00',
          netRecorded: '75.25',
        },
      },
    });
  });
  await page.goto('/society/billing/payments/report');
  await page.getByLabel('From date').fill('2026-10-01');
  await page.getByLabel('To date').fill('2026-10-03');
  await page.getByLabel('Method filter').selectOption('CASH');
  await page.getByRole('button', { name: 'Synthetic collector', exact: true }).click();
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect.poll(() => query).toContain('collectorUserId=3');
  expect(query).toContain('from=2026-10-01');
  expect(query).toContain('method=CASH');
  expect(query).not.toContain('societyId');
  await expect(page.getByText('75.25', { exact: true })).toBeVisible();
});
test('accountant cannot reverse, resident cannot open finance, and mobile receipt is accessible', async ({
  page,
}) => {
  await mock(page, async (route) => route.fulfill({ json: payment }), 'ACCOUNTANT');
  await page.goto('/society/billing/payments/41');
  await expect(page.getByRole('button', { name: 'Record refund', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page.getByRole('button', { name: 'Print receipt' })).toBeVisible();
  await page.unrouteAll();
  await mock(page, async (route) => route.fulfill({ json: payment }), 'RESIDENT');
  await page.goto('/society/billing/payments/41');
  await expect(page).toHaveURL(/workspace$/);
});
test('overpayment and server failures show safe feedback and retain retry key', async ({
  page,
}) => {
  const keys: string[] = [];
  await mock(page, async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    keys.push(String(body['idempotencyKey']));
    return route.fulfill({
      status: 409,
      json: { error: { code: 'OVERPAYMENT', message: 'private SQL' } },
    });
  });
  await page.goto('/society/billing/payments/new');
  await page.getByRole('button', { name: 'A / 101', exact: true }).click();
  await page.getByRole('button', { name: 'Synthetic payer', exact: true }).click();
  await page.getByRole('button', { name: 'Synthetic collector', exact: true }).click();
  await page.getByLabel('Payment date').fill('2026-10-02');
  await page.getByLabel('Amount', { exact: false }).first().fill('1.001');
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  await expect(page.getByLabel('Amount', { exact: false }).first()).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('Amount', { exact: false }).first().fill('100.25');
  await page.getByLabel('Allocate to B-AUG').fill('100.25');
  await page.getByRole('checkbox', { name: /confirm this money/ }).check();
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('outstanding');
  await expect(page.getByRole('alert')).not.toContainText('SQL');
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  await expect.poll(() => keys.length).toBe(2);
  expect(keys[0]).toBe(keys[1]);
});
