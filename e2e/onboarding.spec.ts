import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import type { SocietyDetail } from '../src/app/core/onboarding';
test.use({ serviceWorkers: 'block' });
const setup: SocietyDetail = {
  id: '10',
  code: 'SYNTHETIC',
  name: 'Synthetic onboarding',
  timezone: 'Asia/Kolkata',
  status: 'SETUP_IN_PROGRESS',
  revision: '3',
  verifiedAt: null,
  verifierMembershipId: null,
  reviewed: false,
  reviewedAt: null,
  counts: { buildings: 1, flats: 1, residents: 0, maintenance: 1 },
  requirements: {
    committee: true,
    buildings: true,
    flats: true,
    residents: true,
    maintenance: true,
  },
  invitation: {
    id: '1',
    email: 'committee@example.invalid',
    displayName: 'Committee',
    status: 'ACCEPTED',
    deliveryStatus: 'SENT',
    expiresAt: '2026-10-05T00:00:00Z',
  },
  events: [],
};
test('committee wizard requires review and explicit activation; stale server conflicts remain visible', async ({
  page,
}) => {
  let detail = structuredClone(setup);
  let posts = 0;
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/session'))
      return route.fulfill({
        json: {
          userId: '1',
          email: 'committee@example.invalid',
          platformAdmin: false,
          memberships: [],
          activeSociety: null,
          setupSocieties: [{ societyId: '10', name: 'Synthetic onboarding' }],
        },
      });
    if (path.endsWith('/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (route.request().method() === 'POST') {
      expect(route.request().headers()['x-csrf-token']).toBe('synthetic-csrf');
      expect(route.request().postDataJSON()).toEqual({ revision: '3', confirmed: true });
      posts++;
      if (path.endsWith('/review/confirm')) {
        detail = {
          ...detail,
          status: 'PENDING_VERIFICATION',
          reviewed: true,
          reviewedAt: '2026-10-02T00:00:00Z',
        };
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({
        status: 409,
        json: { error: { code: 'REVISION_CONFLICT', message: 'unsafe internal detail' } },
      });
    }
    if (path.endsWith('/structure'))
      return route.fulfill({
        json: {
          items: [
            {
              id: '20',
              buildingName: 'Building A',
              buildingCode: 'A',
              flatNumber: '101',
              areaSqFt: '900.00',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
        },
      });
    if (path.endsWith('/residents'))
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20 } });
    if (path.endsWith('/maintenance'))
      return route.fulfill({
        json: {
          items: [
            {
              id: '30',
              name: 'Base',
              method: 'FLAT_RATE',
              rate: '100.00',
              effectiveFrom: '2026-10-01',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        },
      });
    return route.fulfill({ json: detail });
  });
  await page.goto('/onboarding/societies/10');
  await expect(
    page.getByRole('heading', { name: 'Society onboarding', exact: true }),
  ).toBeVisible();
  for (const button of await page.locator('.wizard-steps button').all()) {
    await button.click();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    ).toEqual([]);
  }
  await page.getByRole('button', { name: /7\s*Activate/ }).click();
  await expect(page.getByRole('button', { name: 'Verify & Activate', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: /6\s*Verification/ }).click();
  await expect(page.getByRole('button', { name: 'Record committee review' })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'I reviewed the buildings' }).check();
  await page.getByRole('button', { name: 'Record committee review' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Setup reviewed' })).toBeVisible();
  await page.getByRole('button', { name: /7\s*Activate/ }).click();
  await page.getByRole('button', { name: 'Verify & Activate', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(posts).toBe(1);
  await page.getByRole('button', { name: 'Confirm Verify & Activate' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Refresh and try again' })).toBeVisible();
  expect(posts).toBe(2);
  await expect(page.getByText('unsafe internal detail')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});
test('platform wizard exposes metadata and progress without private reads or activation controls', async ({
  page,
}) => {
  const paths: string[] = [];
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    paths.push(path);
    if (path.endsWith('/session'))
      return route.fulfill({
        json: {
          userId: '1',
          email: 'platform@example.invalid',
          platformAdmin: true,
          memberships: [],
          activeSociety: null,
        },
      });
    if (path.endsWith('/structure')) {
      const current = Number(new URL(route.request().url()).searchParams.get('page') ?? '1');
      return route.fulfill({
        json: {
          items: Array.from({ length: current === 1 ? 50 : 10 }, (_, index) => ({
            id: String((current - 1) * 50 + index + 1),
            buildingName: 'Building A',
            buildingCode: 'A',
            flatNumber: String(100 + (current - 1) * 50 + index),
            areaSqFt: null,
          })),
          total: 60,
          page: current,
          pageSize: 50,
        },
      });
    }
    return route.fulfill({ json: setup });
  });
  await page.goto('/platform/societies/10');
  await page.getByRole('button', { name: /3\s*Buildings/ }).click();
  await expect(page.getByRole('rowheader', { name: '100', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByRole('rowheader', { name: '150', exact: true })).toBeVisible();
  await expect(page.getByRole('rowheader', { name: '100', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /4\s*Residents/ }).click();
  await expect(page.getByText('Private resident details')).toBeVisible();
  await expect(page.getByLabel('Resident name')).toHaveCount(0);
  await page.getByRole('button', { name: /7\s*Activate/ }).click();
  await expect(page.getByRole('button', { name: 'Verify & Activate', exact: true })).toHaveCount(0);
  expect(paths.some((path) => path.endsWith('/residents') || path.endsWith('/maintenance'))).toBe(
    false,
  );
});
test('invitation token stays in memory and new account acceptance validates matching passwords', async ({
  page,
}) => {
  const token = 'a'.repeat(43);
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/session'))
      return route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED' } } });
    if (path.endsWith('/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (path.endsWith('/inspect'))
      return route.fulfill({
        json: {
          societyName: 'Synthetic onboarding',
          displayName: 'Committee',
          email: 'committee@example.invalid',
          requiresLogin: false,
          expiresAt: '2026-10-05T00:00:00Z',
        },
      });
    expect(route.request().postDataJSON()).toEqual({
      token,
      password: 'Synthetic invitation password',
    });
    return route.fulfill({ status: 204 });
  });
  await page.goto('/accept-invitation#token=' + token);
  await expect(page).toHaveURL(/\/accept-invitation$/);
  await page.getByLabel('Password', { exact: false }).first().fill('Synthetic invitation password');
  await page.getByLabel('Confirm password').fill('Different invitation password');
  await page.getByRole('button', { name: 'Accept Committee Admin invitation' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'matching passwords' })).toBeVisible();
  await page.getByLabel('Confirm password').fill('Synthetic invitation password');
  await page.getByRole('button', { name: 'Accept Committee Admin invitation' }).click();
  await expect(page.getByRole('heading', { name: 'Invitation accepted' })).toBeVisible();
  expect(
    await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage)),
  ).not.toContain(token);
});
