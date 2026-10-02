import { test, expect } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.use({ serviceWorkers: 'block' });
const pending = {
  id: '31',
  societyName: 'Synthetic society',
  displayName: 'Synthetic Applicant',
  email: 'applicant@example.invalid',
  contactPhone: null,
  note: 'Committee must verify offline',
  flatId: '11',
  buildingCode: 'A',
  flatNumber: '101',
  occupancyType: 'TENANT',
  status: 'PENDING',
  decisionNote: null,
  reviewedAt: null,
  resolvedPersonId: null,
  membershipId: null,
  occupancyId: null,
};
const invitation = {
  id: '41',
  personId: '21',
  flatId: '11',
  displayName: 'Synthetic Resident',
  email: 'resident@example.invalid',
  status: 'PENDING',
  deliveryStatus: 'SENT',
  expiresAt: '2026-10-06T10:00:00Z',
};
const paged = (items: unknown[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
  today: '2026-10-03',
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
          memberships: role === 'PENDING' ? [] : [member],
          activeSociety: role === 'PENDING' ? null : member,
        },
      });
    }
    if (route.request().method() !== 'GET')
      expect(route.request().headers()['x-csrf-token']).toBe('synthetic-csrf');
    if (path === '/society/persons')
      return route.fulfill({
        json: paged([
          {
            id: '21',
            displayName: 'Synthetic Resident',
            reference: 'PERSON_01',
            contactEmail: 'resident@example.invalid',
            archivedAt: null,
          },
        ]),
      });
    if (path === '/society/flats')
      return route.fulfill({
        json: paged([{ id: '11', buildingCode: 'A', flatNumber: '101', archivedAt: null }]),
      });
    return handler(route, path);
  });
}
test('signup shows associated validation and generic email instructions without storing passwords', async ({
  page,
}) => {
  let submissions = 0;
  await mock(
    page,
    async (route, path) => {
      expect(path).toBe('/resident-access/account/start');
      submissions++;
      return route.fulfill({
        status: 202,
        json: { message: 'If eligible, instructions will be sent.' },
      });
    },
    'PENDING',
  );
  await page.goto('/register');
  await page.getByLabel('Your name').fill('New Resident');
  await page.getByLabel('Email address').fill('invalid');
  await page.getByLabel(/^Password/).fill('short');
  await page.getByLabel('Your name').focus();
  await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  expect(submissions).toBe(0);
  await page.getByLabel('Email address').fill('new@example.invalid');
  await page.getByLabel(/^Password/).fill('Synthetic password length');
  await page.getByLabel('Confirm password').fill('Synthetic password length');
  await page.getByRole('button', { name: 'Send verification email' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'If eligible' })).toBeVisible();
  expect(submissions).toBe(1);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});
test('pending user can request another society and cancel; committee routes remain unavailable', async ({
  page,
}) => {
  let rows: (typeof pending)[] = [];
  await mock(
    page,
    async (route, path) => {
      if (path === '/resident-access/requests') {
        if (route.request().method() === 'POST') {
          const body: unknown = route.request().postDataJSON();
          expect(body).toMatchObject({
            societyCode: 'COMMUNITY',
            buildingCode: 'A',
            flatNumber: '101',
          });
          rows = [pending];
          return route.fulfill({ status: 201, json: { id: '31', status: 'PENDING' } });
        }
        return route.fulfill({ json: paged(rows) });
      }
      if (path.endsWith('/cancel')) {
        rows = [{ ...pending, status: 'CANCELLED' }];
        return route.fulfill({ status: 204 });
      }
      throw new Error('Unexpected API ' + path);
    },
    'PENDING',
  );
  await page.goto('/join-society');
  await page.getByLabel('Your name').fill('Applicant');
  await page.getByLabel('Society code').fill('COMMUNITY');
  await page.getByLabel('Building code').fill('A');
  await page.getByLabel('Flat number').fill('101');
  await page.getByRole('button', { name: 'Submit join request' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'No society or flat access' }),
  ).toBeVisible();
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel request' }).click();
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.getByText('CANCELLED', { exact: true })).toBeVisible();
  await page.goto('/society/resident-access');
  await expect(page).toHaveURL(/\/workspace$/);
});
test('committee approval requires an explicit identity review', async ({ page }) => {
  let approved = false;
  await mock(page, async (route, path) => {
    if (path === '/society/registration-requests')
      return route.fulfill({ json: paged(approved ? [] : [pending]) });
    if (path.endsWith('/approve')) {
      const body: unknown = route.request().postDataJSON();
      expect(body).toMatchObject({
        confirmed: true,
        personId: null,
        flatId: '11',
        existingOccupancyId: null,
      });
      approved = true;
      return route.fulfill({ status: 204 });
    }
    throw new Error('Unexpected API ' + path);
  });
  await page.goto('/society/resident-access');
  await page.getByRole('button', { name: 'Review request for Synthetic Applicant' }).click();
  await page
    .getByLabel('Verification note')
    .fill('Checked identity and tenancy against committee records');
  await page.getByRole('button', { name: 'Verify & approve membership' }).click();
  expect(approved).toBe(false);
  await page
    .getByLabel('I verified the identity, person link, flat and current occupancy.')
    .check();
  await page.getByRole('button', { name: 'Verify & approve membership' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Request approved' })).toBeVisible();
  expect(approved).toBe(true);
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('committee invites an existing person and confirms resend/revoke', async ({ page }) => {
  let rows: (typeof invitation)[] = [];
  await mock(page, async (route, path) => {
    if (path === '/society/registration-requests') return route.fulfill({ json: paged([]) });
    if (path === '/society/resident-invitations') {
      if (route.request().method() === 'POST') {
        expect(route.request().postDataJSON()).toEqual({
          personId: '21',
          flatId: '11',
          confirmed: true,
        });
        rows = [invitation];
        return route.fulfill({ status: 201, json: { id: '41' } });
      }
      return route.fulfill({ json: paged(rows) });
    }
    if (path.endsWith('/resend')) {
      rows = [{ ...invitation, id: '42' }];
      return route.fulfill({ status: 201, json: { id: '42' } });
    }
    if (path.endsWith('/revoke')) {
      rows = [];
      return route.fulfill({ status: 204 });
    }
    throw new Error('Unexpected API ' + path);
  });
  await page.goto('/society/resident-access');
  await page.getByRole('button', { name: 'Invitations', exact: true }).click();
  await page.getByRole('button', { name: 'Invite existing resident' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/^Resident/).selectOption('21');
  await dialog.getByLabel(/^Verified flat/).selectOption('11');
  await dialog
    .getByLabel("I verified this person's identity, contact email and current residency.")
    .check();
  await dialog.getByRole('button', { name: 'Send resident invitation' }).click();
  await expect(
    page.getByRole('rowheader', { name: 'Synthetic Resident resident@example.invalid' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Resend to Synthetic Resident' }).click();
  await page.getByLabel('Decision note').fill('Delivery failed; verified address');
  await page.getByRole('button', { name: 'Confirm resend' }).click();
  await page.getByRole('button', { name: 'Revoke invitation for Synthetic Resident' }).click();
  await page.getByLabel('Decision note').fill('Committee withdrew invitation');
  await page.getByRole('button', { name: 'Confirm revoke' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Invitation revoked' })).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});
test('email links stay in memory; action-specific errors are safe and signed-in invitation has no password field', async ({
  page,
}) => {
  await mock(page, async (route, path) => {
    if (path.endsWith('/inspect'))
      return route.fulfill({
        json: {
          societyName: 'Synthetic society',
          displayName: 'Committee Person',
          email: 'committee@example.invalid',
          expiresAt: '2026-10-06T10:00:00Z',
          action: 'RESIDENT_JOIN',
        },
      });
    if (path.endsWith('/accept')) {
      expect(route.request().postDataJSON()).toEqual({ token: 't'.repeat(43) });
      return route.fulfill({
        status: 400,
        json: { error: { code: 'RESIDENT_LINK_INVALID', message: 'SQL private' } },
      });
    }
    throw new Error('Unexpected API ' + path);
  });
  await page.goto('/resident-invitation#token=' + 't'.repeat(43));
  await expect(page.getByRole('button', { name: 'Accept resident invitation' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  await expect(page.getByLabel('Create password')).toHaveCount(0);
  await page.getByRole('button', { name: 'Accept resident invitation' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'intended email' })).toBeVisible();
  await expect(page.getByText('SQL private')).toHaveCount(0);
  expect(await page.evaluate(() => Object.values(localStorage).join(''))).not.toContain(
    't'.repeat(43),
  );
});
