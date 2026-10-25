import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

/** Signed-in account with no society yet, plus the profile the join form prefills from. */
async function account(page: Page, platformAdmin: boolean) {
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/session'))
      return route.fulfill({
        json: {
          userId: '3',
          email: 'resident@example.invalid',
          platformAdmin,
          memberships: [],
          activeSociety: null,
          expiresAt: '2099-01-01T00:00:00Z',
        },
      });
    if (path.endsWith('/auth/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic' } });
    if (path.endsWith('/auth/profile'))
      return route.fulfill({
        json: {
          email: 'resident@example.invalid',
          displayName: 'Synthetic Resident',
          contactPhone: '+91 90000 00000',
        },
      });
    if (path.includes('/resident-access/requests'))
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20 } });
    return route.fulfill({ json: { items: [{ code: 'SYNTHETIC', name: 'Synthetic community' }] } });
  });
}

test('the UI library menu is only offered to platform administrators', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 800 });
  await account(page, false);
  await page.goto('/join-society');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const sidebar = page.locator('.desktop-sidebar');
  await expect(sidebar.getByRole('link', { name: 'My profile' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'UI library' })).toHaveCount(0);

  await page.unroute('**/api/v1/**');
  await account(page, true);
  await page.goto('/platform/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'UI library' })).toBeVisible();
});

test('membership requests start with the profile name and phone and explain the process', async ({
  page,
}) => {
  await account(page, false);
  await page.goto('/join-society');
  await page.getByRole('button', { name: 'Add request' }).click();
  const dialog = page.getByRole('dialog', { name: 'Request membership' });
  await expect(dialog.getByRole('list', { name: 'How membership works' })).toContainText(
    'Committee review',
  );
  await expect(dialog.getByLabel('Your name')).toHaveValue('Synthetic Resident');
  await expect(dialog.getByLabel('Contact phone')).toHaveValue('+91 90000 00000');
  await expect(dialog.getByText(/^From your profile\. Edit it/)).toBeVisible();
  // Prefilled values stay editable.
  await dialog.getByLabel('Your name').fill('Edited Name');
  await expect(dialog.getByLabel('Your name')).toHaveValue('Edited Name');
  await expect(page.locator('se-dialog[title]')).toHaveCount(0);
});

test('applicants can reach the committee from pending requests only', async ({ page }) => {
  const request = (id: string, status: string) => ({
    id,
    societyName: 'Synthetic community',
    displayName: 'Synthetic Resident',
    email: 'resident@example.invalid',
    contactPhone: null,
    note: null,
    flatId: id,
    buildingCode: 'A',
    flatNumber: id,
    occupancyType: 'OWNER',
    status,
    decisionNote: null,
    reviewedAt: null,
    resolvedPersonId: null,
    membershipId: null,
    occupancyId: null,
    committeeContact:
      status === 'PENDING'
        ? { contactPhone: '+91 90000 00000', contactEmail: 'committee@example.invalid' }
        : null,
  });
  await account(page, false);
  await page.route('**/api/v1/resident-access/requests?**', (route) =>
    route.fulfill({
      json: {
        items: [request('102', 'PENDING'), request('101', 'APPROVED')],
        total: 2,
        page: 1,
        pageSize: 20,
      },
    }),
  );
  await page.goto('/join-society');
  const call = page.getByRole('link', { name: /^Call committee/ });
  const email = page.getByRole('link', { name: /^Email committee/ });
  await expect(call).toHaveCount(1);
  await expect(call).toHaveAttribute('href', 'tel:+91 90000 00000');
  await expect(email).toHaveAttribute('href', 'mailto:committee@example.invalid');
});

test('the committee publishes the applicant contact with themed validation', async ({ page }) => {
  const access = {
    societyId: '1',
    membershipId: '2',
    name: 'Synthetic community',
    roles: ['COMMITTEE_ADMIN'],
    permissions: ['society.dashboard.read', 'society.members.manage'],
  };
  let saved: unknown = null;
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/session'))
      return route.fulfill({
        json: {
          userId: '3',
          email: 'committee@example.invalid',
          platformAdmin: false,
          memberships: [access],
          activeSociety: access,
          expiresAt: '2099-01-01T00:00:00Z',
        },
      });
    if (path.endsWith('/auth/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic' } });
    if (path.endsWith('/society/applicant-contact')) {
      if (route.request().method() === 'POST') {
        saved = route.request().postDataJSON();
        return route.fulfill({ json: saved });
      }
      return route.fulfill({ json: { contactPhone: null, contactEmail: null } });
    }
    return route.fulfill({
      json: { items: [], total: 0, page: 1, pageSize: 20, today: '2026-10-24' },
    });
  });
  await page.goto('/society/resident-access');
  const phone = page.getByLabel('Committee phone');
  await phone.fill('call me');
  await page.getByRole('button', { name: 'Save contact' }).click();
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(/^Enter a phone number using digits/)).toBeVisible();
  expect(saved).toBeNull();
  await phone.fill('+91 90000 00000');
  await page.getByLabel('Committee email').fill('Committee@Example.invalid');
  await page.getByRole('button', { name: 'Save contact' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Applicants can now see' }),
  ).toBeVisible();
  expect(saved).toEqual({
    contactPhone: '+91 90000 00000',
    contactEmail: 'Committee@Example.invalid',
  });
});

test('choosing a workspace shows a themed message instead of the browser bubble', async ({
  page,
}) => {
  const access = {
    societyId: '1',
    membershipId: '2',
    name: 'Synthetic community',
    roles: ['RESIDENT'],
    permissions: ['society.dashboard.read'],
  };
  await page.route('**/api/v1/**', (route) =>
    new URL(route.request().url()).pathname.endsWith('/auth/session')
      ? route.fulfill({
          json: {
            userId: '3',
            email: 'resident@example.invalid',
            platformAdmin: false,
            memberships: [access],
            activeSociety: null,
            expiresAt: '2099-01-01T00:00:00Z',
          },
        })
      : route.fulfill({ json: { csrfToken: 'synthetic' } }),
  );
  await page.goto('/workspace');
  await expect(page.locator('form.workspace-form')).toHaveAttribute('novalidate', '');
  await page.getByRole('button', { name: 'Open community workspace' }).click();
  const community = page.getByLabel('Community');
  await expect(community).toHaveAttribute('aria-invalid', 'true');
  await expect(community).toBeFocused();
  await expect(page.getByRole('alert')).toHaveText('Choose the community you want to open.');
  await community.selectOption('1');
  await expect(community).not.toHaveAttribute('aria-invalid', 'true');
});

test('existing residents get clear guidance when requesting another home', async ({ page }) => {
  await account(page, false);
  await page.route('**/api/v1/resident-access/join-options/properties?**', (route) =>
    route.fulfill({
      json: {
        items: [
          { buildingCode: 'A', buildingName: 'Wing A', flatNumber: '101', propertyType: 'FLAT' },
          { buildingCode: 'A', buildingName: 'Wing A', flatNumber: '102', propertyType: 'FLAT' },
        ],
      },
    }),
  );
  let submitted = 0;
  await page.route('**/api/v1/resident-access/requests', (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    submitted++;
    return route.fulfill({
      status: 409,
      json: {
        error: {
          code: submitted === 1 ? 'RESIDENT_HOME_ALREADY_LINKED' : 'RESIDENT_REQUEST_PENDING',
          message: 'server detail',
        },
      },
    });
  });
  await page.goto('/join-society');
  await page.getByRole('button', { name: 'Add request' }).click();
  const dialog = page.getByRole('dialog', { name: 'Request membership' });
  await expect(dialog).toContainText('request another flat or row house');
  await dialog
    .getByRole('combobox', { name: /^Community/ })
    .selectOption({ label: 'Synthetic community' });
  await dialog.getByRole('combobox', { name: /^Flat or row house/ }).selectOption({ index: 1 });
  await dialog.getByRole('button', { name: 'Submit join request' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'You already have access to this home.' }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Submit join request' }).click();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'You already have a pending request in this community.' }),
  ).toBeVisible();
  await expect(page.getByText('server detail')).toHaveCount(0);
  expect(submitted).toBe(2);
});

test('the signed-in phone header shows the brand, a notices bell and keeps navigation', async ({
  page,
}) => {
  const access = {
    societyId: '1',
    membershipId: '2',
    name: 'Synthetic community',
    roles: ['RESIDENT'],
    permissions: ['society.dashboard.read'],
  };
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/session'))
      return route.fulfill({
        json: {
          userId: '3',
          email: 'resident@example.invalid',
          platformAdmin: false,
          memberships: [access],
          activeSociety: access,
          expiresAt: '2099-01-01T00:00:00Z',
        },
      });
    if (path.endsWith('/auth/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic' } });
    return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20 } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/profile');
  const header = page.locator('.app-header');
  await expect(header.getByRole('link', { name: 'Mr. Livora home' })).toBeVisible();
  await expect(header.getByText('Live in a Better Aura')).toBeVisible();
  // Sign out moves to the menu drawer on phones; the header keeps brand, bell, theme and menu.
  await expect(header.getByRole('button', { name: 'Sign out' })).toBeHidden();
  await header.getByRole('link', { name: 'Notices' }).click();
  await expect(page).toHaveURL(/\/society\/resident\/notices$/);
  await expect(header.getByRole('link', { name: 'Notices' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await header.getByRole('button', { name: 'Open navigation' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Navigation' }).getByRole('button', { name: /Logout/ }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the committee sees when an applicant already owns or lives in other homes here', async ({
  page,
}) => {
  const access = {
    societyId: '1',
    membershipId: '2',
    name: 'Synthetic community',
    roles: ['COMMITTEE_ADMIN'],
    permissions: ['society.dashboard.read', 'society.members.manage'],
  };
  const pending = (id: string, name: string, existingMember: unknown) => ({
    id,
    societyName: 'Synthetic community',
    displayName: name,
    email: id + '@example.invalid',
    contactPhone: null,
    note: null,
    flatId: id,
    buildingCode: 'ROW_HOUSES',
    flatNumber: '14',
    occupancyType: 'OWNER',
    status: 'PENDING',
    decisionNote: null,
    reviewedAt: null,
    resolvedPersonId: null,
    membershipId: null,
    occupancyId: null,
    existingMember,
  });
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/session'))
      return route.fulfill({
        json: {
          userId: '3',
          email: 'committee@example.invalid',
          platformAdmin: false,
          memberships: [access],
          activeSociety: access,
          expiresAt: '2099-01-01T00:00:00Z',
        },
      });
    if (path.endsWith('/auth/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic' } });
    if (path.endsWith('/society/applicant-contact'))
      return route.fulfill({ json: { contactPhone: null, contactEmail: null } });
    if (path.endsWith('/society/registration-requests'))
      return route.fulfill({
        json: {
          items: [
            pending('41', 'Returning Resident', {
              status: 'ACTIVE',
              homes: [
                {
                  buildingCode: 'A',
                  buildingName: 'Wing A',
                  flatNumber: '102',
                  occupancyType: 'OWNER',
                  startsOn: '2026-01-01',
                  endsOn: null,
                  state: 'CURRENT',
                },
                {
                  buildingCode: 'ROW_HOUSES',
                  buildingName: 'Row houses',
                  flatNumber: '1',
                  occupancyType: 'OWNER',
                  startsOn: '2026-10-24',
                  endsOn: '2026-10-24',
                  state: 'ENDED',
                },
              ],
            }),
            pending('42', 'New Applicant', null),
          ],
          total: 2,
          page: 1,
          pageSize: 20,
          today: '2026-10-25',
        },
      });
    return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20 } });
  });
  await page.goto('/society/resident-access');
  await expect(page.getByText('Existing member · 1 current · 1 ended')).toHaveCount(1);

  await page.getByRole('button', { name: 'Review request for Returning Resident' }).click();
  const dialog = page.getByRole('dialog', { name: 'Review membership request' });
  const member = dialog.getByRole('region', { name: /Already a member of this community/ });
  await expect(member).toContainText('additional home');
  await member.getByText('View homes (1 current · 1 ended)').click();
  // Ended homes are listed as history, never hidden.
  await expect(member.getByRole('listitem')).toHaveText([
    /Wing A · 102\s*Owner · 2026-01-01 – present\s*Current/,
    /Row houses · 1\s*Owner · 2026-10-24 – 2026-10-24\s*Ended/,
  ]);
  await expect(dialog.getByLabel('Link a verified existing person')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Close dialog' }).click();

  await page.getByRole('button', { name: 'Review request for New Applicant' }).click();
  await expect(dialog.getByRole('region', { name: /Already a member/ })).toHaveCount(0);
  await expect(dialog.getByLabel('Link a verified existing person')).toBeVisible();
});
