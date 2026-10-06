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
test('committee resident choice filters pages and clears the previous property before submission', async ({
  page,
}) => {
  let submitted = false;
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/session'))
      return route.fulfill({
        json: {
          userId: '1',
          email: 'committee@example.invalid',
          platformAdmin: false,
          memberships: [],
          activeSociety: null,
          setupSocieties: [{ societyId: '10', name: setup.name }],
        },
      });
    if (path.endsWith('/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toMatchObject({
        flatId: '80',
        propertyType: 'ROW_HOUSE',
        displayName: 'House resident',
      });
      submitted = true;
      return route.fulfill({ status: 201 });
    }
    if (path.endsWith('/structure')) {
      const house = url.searchParams.get('propertyType') === 'ROW_HOUSE';
      const current = Number(url.searchParams.get('page') ?? '1');
      const searched = url.searchParams.get('search') === '2';
      return route.fulfill({
        json: {
          items: [
            {
              id: house ? (current === 1 && !searched ? '70' : '80') : '20',
              buildingCode: house ? 'ROW_HOUSES' : 'A',
              buildingName: house ? 'Row houses' : 'Wing A',
              flatNumber: house ? String(searched ? 2 : current) : '101',
              areaSqFt: null,
            },
          ],
          total: house && !searched ? 51 : 1,
          page: current,
          pageSize: 50,
        },
      });
    }
    if (path.endsWith('/residents') || path.endsWith('/maintenance'))
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 50 } });
    return route.fulfill({ json: setup });
  });
  await page.goto('/onboarding/societies/10');
  await page.getByRole('button', { name: /4\s*Residents/ }).click();
  await expect(page.locator('.resident-form > :first-child')).toContainText('Resident name');
  await expect(
    page.getByRole('group', { name: 'What type of property does this resident live in?' }),
  ).toBeVisible();
  const picker = page.locator('.resident-property-picker details');
  await picker.locator('summary').click();
  await picker.getByRole('button', { name: 'A / 101' }).click();
  await expect(picker.locator('summary')).toContainText('A / 101');
  await page.getByRole('radio', { name: 'Row houses', exact: true }).check();
  await expect(picker.locator('summary')).toContainText('Choose a row house');
  await picker.locator('summary').click();
  await picker.getByRole('button', { name: '1', exact: true }).click();
  await expect(picker.locator('summary')).toContainText('1');
  await picker.locator('summary').click();
  await expect(picker.getByText('Scroll to load more. 1 of 51 loaded.')).toBeVisible();
  await expect(picker.getByRole('button', { name: 'Next page' })).toHaveCount(0);
  const results = picker.getByRole('list', { name: 'Matching properties' });
  await results.evaluate((list) => {
    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 200 },
      scrollTop: { configurable: true, value: 100 },
    });
    list.dispatchEvent(new Event('scroll'));
  });
  await expect(results.getByRole('button', { name: '2', exact: true })).toBeVisible();
  await expect.poll(() => results.evaluate((list) => list.scrollTop)).toBe(100);
  await picker.getByRole('searchbox', { name: 'Search by row house number' }).fill('2');
  await expect(picker.getByText('1 match found.')).toBeVisible();
  await picker.getByRole('button', { name: '2', exact: true }).click();
  await expect(picker.locator('summary')).toContainText('2');
  await page
    .getByRole('textbox', { name: 'Resident name (required)', exact: true })
    .fill('House resident');
  await page.getByRole('button', { name: 'Add initial resident' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Resident added' })).toBeVisible();
  expect(submitted).toBe(true);
});
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
    page.getByRole('heading', { name: 'Society or Flat or Township onboarding', exact: true }),
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

test('wing range preview creates separate flat lists and rejects invalid plans', async ({
  page,
}) => {
  const posts: unknown[] = [];
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
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
    if (path.endsWith('/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (path.endsWith('/buildings') && route.request().method() === 'POST') {
      const body: unknown = route.request().postDataJSON();
      posts.push(body);
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/structure'))
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 50 } });
    return route.fulfill({ json: { ...setup, revision: String(3 + posts.length) } });
  });
  await page.goto('/platform/societies/10');
  await expect(
    page.getByRole('heading', { name: 'Society or Flat or Township onboarding', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /3\s*Buildings/ }).click();
  await expect(page.locator('#wing-options option')).toHaveCount(4);
  for (const wing of ['A', 'B']) {
    await page.getByLabel(/^Wing code/).fill(wing);
    await page.getByLabel(/^Flat numbers/).fill('101-103, 201-202');
    const preview = page.getByRole('region', { name: 'Flat preview' });
    await expect(preview).toContainText('5 flats will be added to wing ' + wing);
    await expect(preview).toContainText('101, 102, 103, 201, 202');
    expect(posts).toHaveLength(wing === 'A' ? 0 : 1);
    await page.getByRole('button', { name: 'Add wing and flats', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Wing and flats added.' }),
    ).toBeVisible();
    await expect(page.getByLabel(/^Flat numbers/)).toHaveValue('');
  }
  expect(posts).toEqual(
    ['A', 'B'].map((wing, index) => ({
      revision: String(3 + index),
      code: wing,
      name: 'Wing ' + wing,
      flats: ['101', '102', '103', '201', '202'].map((number) => ({ number, areaSqFt: null })),
    })),
  );
  await page.getByLabel(/^Wing code/).fill('EAST');
  await page.getByLabel(/^Flat numbers/).fill('1-101');
  await expect(
    page.getByRole('button', { name: 'Add wing and flats', exact: true }),
  ).toBeDisabled();
  await expect(page.getByText('Use an ascending numeric range', { exact: false })).toBeVisible();
  await page.getByLabel(/^Flat numbers/).fill('101-103,103');
  await expect(
    page.getByText('A flat number appears more than once.', { exact: false }),
  ).toBeVisible();
  expect(posts).toHaveLength(2);
  await page.getByLabel(/^Flat numbers/).fill('001-003');
  await expect(page.getByRole('region', { name: 'Flat preview' })).toContainText('001, 002, 003');
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Add wing and flats', exact: true }).click();
  await expect(page.getByLabel(/^Flat numbers/)).toHaveValue('');
  expect(posts).toHaveLength(3);
  expect(posts[2]).toEqual({
    revision: '5',
    code: 'EAST',
    name: 'Wing EAST',
    flats: ['001', '002', '003'].map((number) => ({ number, areaSqFt: null })),
  });
});

test('row house ranges hide wing options, retain conflicts and allow later ranges', async ({
  page,
}) => {
  const posts: unknown[] = [];
  let conflict = true;
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
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
    if (path.endsWith('/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (path.endsWith('/row-houses')) {
      posts.push(route.request().postDataJSON());
      return conflict
        ? route.fulfill({ status: 409, json: { error: { code: 'CONFLICT' } } })
        : route.fulfill({ status: 201 });
    }
    if (path.endsWith('/structure'))
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 50 } });
    return route.fulfill({ json: setup });
  });
  await page.goto('/platform/societies/10');
  await page.getByRole('button', { name: /3\s*Buildings/ }).click();
  await page.getByRole('radio', { name: 'Add multiple wings', exact: true }).check();
  await page.getByLabel('Other wing codes').fill('a,A');
  await page.getByRole('radio', { name: 'Row houses', exact: true }).check();
  await expect(page.getByRole('group', { name: 'How would you like to add wings?' })).toHaveCount(
    0,
  );
  await expect(page.getByLabel(/^Wing code/)).toHaveCount(0);
  await expect(page.getByLabel('Wing name')).toHaveCount(0);
  await expect(page.getByLabel('Other wing codes')).toHaveCount(0);
  await expect(page.getByText('Maximum 200 row houses per batch.', { exact: false })).toBeVisible();
  await page.getByLabel(/^Row house numbers/).fill('1-201');
  await expect(page.getByRole('button', { name: 'Add row houses', exact: true })).toBeDisabled();
  await page.getByLabel(/^Row house numbers/).fill('1-5,5');
  await expect(
    page.getByText('A row house number appears more than once.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel(/^Row house numbers/).fill('1-5');
  await expect(page.getByRole('region', { name: 'Row house preview' })).toContainText(
    '1, 2, 3, 4, 5',
  );
  await page.getByRole('button', { name: 'Add row houses', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'setup changed or conflicts' }),
  ).toBeVisible();
  await expect(page.getByLabel(/^Row house numbers/)).toHaveValue('1-5');
  conflict = false;
  await page.getByRole('button', { name: 'Add row houses', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '5 row houses added.' })).toBeVisible();
  const expected = {
    revision: '3',
    houses: ['1', '2', '3', '4', '5'].map((number) => ({ number, areaSqFt: null })),
  };
  expect(posts).toEqual([expected, expected]);
  await page.getByLabel(/^Row house numbers/).fill('6-7');
  await page.getByLabel('Area per row house (sq ft)').fill('900.00');
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Add row houses', exact: true }).click();
  await expect(page.getByLabel(/^Row house numbers/)).toHaveValue('');
  expect(posts[2]).toEqual({
    revision: '3',
    houses: ['6', '7'].map((number) => ({ number, areaSqFt: '900.00' })),
  });
  await page.getByLabel(/^Row house numbers/).fill('8-207');
  await expect(page.getByRole('region', { name: 'Row house preview' })).toContainText(
    '200 row houses will be added.',
  );
  await page.getByRole('button', { name: 'Add row houses', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '200 row houses added.' })).toBeVisible();
  expect(posts[3]).toEqual({
    revision: '3',
    houses: Array.from({ length: 200 }, (_, n) => ({ number: String(n + 8), areaSqFt: null })),
  });
  await page.getByRole('radio', { name: 'Flats', exact: true }).check();
  await expect(page.getByRole('radio', { name: 'Add multiple wings', exact: true })).toBeVisible();
});

test('multiple wings share ranges, preview counts and send one atomic batch; conflicts preserve the draft', async ({
  page,
}) => {
  const posts: unknown[] = [];
  let conflict = true;
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
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
    if (path.endsWith('/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (path.endsWith('/buildings/batch')) {
      const body: unknown = route.request().postDataJSON();
      posts.push(body);
      return conflict
        ? route.fulfill({
            status: 409,
            json: {
              error: {
                code: 'CONFLICT',
                message: 'A wing already exists. Check the codes and try again.',
              },
            },
          })
        : route.fulfill({ status: 201 });
    }
    if (path.endsWith('/structure'))
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 50 } });
    return route.fulfill({ json: setup });
  });
  await page.goto('/platform/societies/10');
  await page.getByRole('button', { name: /3\s*Buildings/ }).click();
  await page.getByRole('radio', { name: 'Add multiple wings', exact: true }).check();
  await page.getByRole('button', { name: 'Select all A-D' }).click();
  await page.getByLabel(/^Flat numbers/).fill('101-103,201-202');
  const preview = page.getByRole('region', { name: 'Flat preview' });
  await expect(preview).toContainText('4 wings / 5 flats per wing / 20 flats total');
  for (const code of ['A', 'B', 'C', 'D'])
    await expect(preview.getByText('Wing ' + code, { exact: true })).toBeVisible();
  await page.getByLabel('Other wing codes').fill('a');
  await expect(page.getByText('Each wing code must be unique.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add selected wings and flats' })).toBeDisabled();
  await page.getByLabel('Other wing codes').fill('E, F');
  await page.getByLabel(/^Flat numbers/).fill('1-100');
  await expect(page.getByRole('alert').filter({ hasText: '500 flats' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add selected wings and flats' })).toBeDisabled();
  await page.getByLabel('Other wing codes').fill('');
  await page.getByLabel(/^Flat numbers/).fill('101-103,201-202');
  expect(posts).toHaveLength(0);
  await page.setViewportSize({ width: 320, height: 800 });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => {
      document.documentElement.dataset['theme'] = theme;
    }, theme);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Add selected wings and flats' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'setup changed or conflicts' }),
  ).toBeVisible();
  await expect(page.getByLabel(/^Flat numbers/)).toHaveValue('101-103,201-202');
  await expect(page.getByRole('checkbox', { name: 'Wing A', exact: true })).toBeChecked();
  conflict = false;
  await page.getByRole('button', { name: 'Add selected wings and flats' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '4 wings and 20 flats added.' }),
  ).toBeVisible();
  await expect(page.getByLabel(/^Flat numbers/)).toHaveValue('');
  await expect(page.getByRole('checkbox', { name: 'Wing A', exact: true })).not.toBeChecked();
  const expected = {
    revision: '3',
    buildings: ['A', 'B', 'C', 'D'].map((code) => ({
      code,
      name: 'Wing ' + code,
      flats: ['101', '102', '103', '201', '202'].map((number) => ({ number, areaSqFt: null })),
    })),
  };
  expect(posts).toEqual([expected, expected]);
});
