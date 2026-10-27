import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { SocietyDetail } from '../src/app/core/onboarding';
test.use({ serviceWorkers: 'block' });
interface PostedWing {
  code: string;
  flats: { number: string }[];
}
/** Synthetic save results: everything posted is new unless listed in `existing`. */
const wingSaved = (wing: PostedWing, existing: string[] = []) => ({
  code: wing.code,
  existing: existing.length > 0,
  added: wing.flats.map((flat) => flat.number).filter((n) => !existing.includes(n)),
  skipped: wing.flats.map((flat) => flat.number).filter((n) => existing.includes(n)),
});
const housesSaved = (body: { houses: { number: string }[] }) => ({
  added: body.houses.map((house) => house.number),
  skipped: [],
});
const structureDialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Add a wing or row houses' });
async function openStructureDialog(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add wing or row houses' }).click();
  await expect(structureDialog(page)).toBeVisible();
}
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
  counts: { buildings: 1, flats: 1, rowHouses: 0, residents: 0, maintenance: 1 },
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
    if (path.endsWith('/residents'))
      return route.fulfill({
        json: {
          items: submitted
            ? [
                {
                  id: '90',
                  displayName: 'House resident',
                  flatNumber: '2',
                  occupancyType: 'OWNER',
                  startsOn: '2026-10-27',
                  endsOn: null,
                },
              ]
            : [],
          total: submitted ? 1 : 0,
          page: 1,
          pageSize: 50,
        },
      });
    if (path.endsWith('/maintenance'))
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 50 } });
    return route.fulfill({ json: setup });
  });
  await page.goto('/onboarding/societies/10');
  await page.getByRole('button', { name: /4\s*Residents/ }).click();
  await expect(page.getByRole('checkbox', { name: /Previously confirmed/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Previously confirmed/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Decision saved' })).toBeDisabled();
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
  await expect(page.getByRole('row', { name: /House resident/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Resident name (required)' })).toBeHidden();
  await page.getByRole('button', { name: 'Add another resident' }).click();
  await expect(page.getByRole('textbox', { name: 'Resident name (required)' })).toBeVisible();
});
test('committee wizard requires review and explicit activation; stale server conflicts remain visible', async ({
  page,
}) => {
  let detail = structuredClone(setup);
  detail.code = 'SOC-00007';
  detail.events = [
    {
      id: '3',
      actorUserId: '1',
      action: 'committee.invited',
      fromStatus: 'SETUP_IN_PROGRESS',
      toStatus: 'SETUP_IN_PROGRESS',
      createdAt: '2026-10-03T00:00:00Z',
      actorName: 'platform@example.invalid',
      actorEmail: 'platform@example.invalid',
      invitedName: 'Asha Committee',
      invitedEmail: 'asha@example.invalid',
      invitationStatus: 'REVOKED',
    },
    {
      id: '2',
      actorUserId: '1',
      action: 'society.status_changed',
      fromStatus: 'DRAFT',
      toStatus: 'SETUP_IN_PROGRESS',
      createdAt: '2026-10-02T00:00:00Z',
    },
    {
      id: '1',
      actorUserId: '1',
      action: 'society.created',
      fromStatus: null,
      toStatus: 'DRAFT',
      createdAt: '2026-10-01T00:00:00Z',
    },
  ];
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
    page.getByRole('heading', { name: 'Society/Flat/Township onboarding', exact: true }),
  ).toBeVisible();
  // A returning committee lands on the first unfinished step, with the rest marked done.
  await expect(page.getByText('Continue from Step 6 · Verification.')).toBeVisible();
  await expect(page.getByText('5 of 7 steps done')).toBeVisible();
  await expect(page.getByRole('button', { name: /^6\s*Verification/ })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await expect(page.getByRole('button', { name: /^3\s*Buildings.*Done$/ })).toBeVisible();
  await page.getByRole('button', { name: /^1\s*Society/ }).click();
  await page.getByRole('button', { name: 'Go to step 6' }).waitFor();
  // Type comes from the code prefix; history stays collapsed until asked for, in sentence case.
  await expect(page.locator('.setup-facts')).toContainText(/Type\s*Society/);
  const history = page.getByRole('button', { name: /Show setup history \(3\)/ });
  await expect(page.getByText('Society created', { exact: true })).toHaveCount(0);
  await history.click();
  await expect(page.getByText('Society status changed', { exact: true })).toBeVisible();
  await expect(page.getByText('Society created', { exact: true })).toBeVisible();
  // The info button opens the audit trail for one entry: who acted and whom they invited.
  const info = page.getByRole('button', { name: /Audit details: Committee invited/ });
  await expect(info).toHaveAttribute('aria-expanded', 'false');
  await info.click();
  await expect(info).toHaveAttribute('aria-expanded', 'true');
  const audit = page.locator('#setup-event-3');
  await expect(audit).toContainText('platform@example.invalid');
  await expect(audit).toContainText('Asha Committee');
  await expect(audit).toContainText('asha@example.invalid');
  await expect(audit).toContainText('Revoked');
  await info.click();
  await expect(audit).toHaveCount(0);
  await page.getByRole('button', { name: /Hide setup history/ }).click();
  await expect(page.getByText('Society created', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^5\s*Maintenance/ }).click();
  await expect(page.getByRole('row', { name: /Base/ })).toBeVisible();
  await expect(page.getByLabel('Charge code')).toBeHidden();
  await expect(page.getByRole('checkbox', { name: /Previously confirmed/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Previously confirmed/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Review saved' })).toBeDisabled();
  await page.getByRole('button', { name: 'Add another maintenance charge' }).click();
  await expect(page.getByLabel('Charge code')).toBeVisible();
  await page.getByRole('button', { name: 'Close maintenance form' }).click();
  await expect(page.getByLabel('Charge code')).toBeHidden();
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
  // Signed-out pages carry the full site footer after the form and scroll as a whole page
  // (the browser scrollbar), never an inner pane with the footer pinned over the content.
  const footer = page.locator('.public-footer');
  await expect(footer.getByText('Better communities begin with better connections.')).toBeVisible();
  expect(
    await page.locator('main').evaluate((element) => getComputedStyle(element).overflowY),
  ).toBe('visible');
  for (const [width, height] of [
    [390, 700],
    [1280, 720],
  ] as const) {
    await page.setViewportSize({ width, height });
    const confirmBox = await page.getByLabel('Confirm password').boundingBox();
    const footerBox = await footer.boundingBox();
    expect((footerBox?.y ?? 0) >= (confirmBox?.y ?? 0) + (confirmBox?.height ?? 0)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page
    .getByLabel(/^Password/)
    .first()
    .fill('Synthetic invitation password');
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

test('a used or expired invitation link explains itself on the page, not in a toast', async ({
  page,
}) => {
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/session'))
      return route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED' } } });
    if (path.endsWith('/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    return route.fulfill({ status: 400, json: { error: { code: 'INVITATION_INVALID' } } });
  });
  await page.goto('/accept-invitation#token=' + 'b'.repeat(43));
  const panel = page.locator('.invite-result');
  await expect(
    panel.getByRole('heading', { name: "This invitation link can't be used" }),
  ).toBeVisible();
  await expect(panel.getByText('unavailable or expired')).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute(
    'href',
    '/login',
  );
  // Shown once, inside the panel: no duplicate pop-up toast.
  await expect(page.getByText('unavailable or expired')).toHaveCount(1);
  await expect(page.getByText('Checking invitation')).toHaveCount(0);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});

test('a signed-in session cannot open a dead invitation or one for another account', async ({
  page,
}) => {
  let inspectResponse: { status: number; json: object } = {
    status: 400,
    json: { error: { code: 'INVITATION_INVALID' } },
  };
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
    if (path.endsWith('/inspect')) return route.fulfill(inspectResponse);
    return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 25 } });
  });
  await page.goto('/accept-invitation#token=' + 'd'.repeat(43));
  await expect(page).toHaveURL(/\/(workspace|platform\/dashboard)$/);
  await expect(page.getByText('This invitation link is no longer active.')).toBeVisible();
  await expect(page.locator('.invite-result')).toHaveCount(0);

  inspectResponse = {
    status: 200,
    json: {
      societyName: 'Synthetic onboarding',
      displayName: 'Committee',
      email: 'committee@example.invalid',
      requiresLogin: true,
      expiresAt: '2099-10-05T00:00:00Z',
    },
  };
  await page.goto('/accept-invitation#token=' + 'e'.repeat(43));
  await expect(page).toHaveURL(/\/(workspace|platform\/dashboard)$/);
  await expect(page.getByText('This invitation is for another account.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept Committee Admin invitation' })).toHaveCount(
    0,
  );
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
      const body = route.request().postDataJSON() as PostedWing;
      posts.push(body);
      return route.fulfill({ status: 201, json: wingSaved(body) });
    }
    if (path.endsWith('/structure'))
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 50 } });
    return route.fulfill({ json: { ...setup, revision: String(3 + posts.length) } });
  });
  await page.goto('/platform/societies/10');
  await expect(
    page.getByRole('heading', { name: 'Society/Flat/Township onboarding', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /3\s*Buildings/ }).click();
  await expect(page.locator('#wing-options option')).toHaveCount(4);
  for (const wing of ['A', 'B']) {
    await openStructureDialog(page);
    await page.getByLabel(/^Wing code/).fill(wing);
    await page.getByLabel(/^Flat numbers/).fill('101-103, 201-202');
    const preview = page.getByRole('region', { name: 'Flat preview' });
    await expect(preview).toContainText('5 flat numbers ready for wing ' + wing);
    await expect(preview).toContainText('101, 102, 103, 201, 202');
    expect(posts).toHaveLength(wing === 'A' ? 0 : 1);
    await page.getByRole('button', { name: 'Save wing', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Wing ' + wing + ' added with 5 flats.' }),
    ).toBeVisible();
    await expect(structureDialog(page)).toBeHidden();
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
  await openStructureDialog(page);
  await page.getByLabel(/^Wing code/).fill('EAST');
  await page.getByLabel(/^Flat numbers/).fill('1-101');
  await expect(page.getByRole('button', { name: 'Save wing', exact: true })).toBeDisabled();
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
  await page.getByRole('button', { name: 'Save wing', exact: true }).click();
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
      const body = route.request().postDataJSON() as { houses: { number: string }[] };
      posts.push(body);
      return conflict
        ? route.fulfill({ status: 409, json: { error: { code: 'CONFLICT' } } })
        : route.fulfill({ status: 201, json: housesSaved(body) });
    }
    if (path.endsWith('/structure'))
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 50 } });
    return route.fulfill({ json: setup });
  });
  await page.goto('/platform/societies/10');
  await page.getByRole('button', { name: /3\s*Buildings/ }).click();
  await openStructureDialog(page);
  await page.getByRole('radio', { name: 'Several wings at once', exact: true }).check();
  await page.getByLabel('Other wing codes').fill('a,A');
  await page.getByRole('radio', { name: 'Row houses', exact: true }).check();
  await expect(page.getByRole('group', { name: 'How many wings?' })).toHaveCount(0);
  await expect(page.getByLabel(/^Wing code/)).toHaveCount(0);
  await expect(page.getByLabel('Wing name')).toHaveCount(0);
  await expect(page.getByLabel('Other wing codes')).toHaveCount(0);
  await expect(page.getByText('Up to 200 row houses in one save.', { exact: false })).toBeVisible();
  await page.getByLabel(/^Row house numbers/).fill('1-201');
  await expect(page.getByRole('button', { name: 'Save row houses', exact: true })).toBeDisabled();
  await page.getByLabel(/^Row house numbers/).fill('1-5,5');
  await expect(
    page.getByText('A row house number appears more than once.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel(/^Row house numbers/).fill('1-5');
  await expect(page.getByRole('region', { name: 'Row house preview' })).toContainText(
    '1, 2, 3, 4, 5',
  );
  await page.getByRole('button', { name: 'Save row houses', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'setup changed or conflicts' }),
  ).toBeVisible();
  await expect(page.getByLabel(/^Row house numbers/)).toHaveValue('1-5');
  conflict = false;
  await page.getByRole('button', { name: 'Save row houses', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '5 row houses added.' })).toBeVisible();
  await expect(structureDialog(page)).toBeHidden();
  const expected = {
    revision: '3',
    houses: ['1', '2', '3', '4', '5'].map((number) => ({ number, areaSqFt: null })),
  };
  expect(posts).toEqual([expected, expected]);
  await openStructureDialog(page);
  // The chosen property type is kept between additions.
  await expect(page.getByRole('radio', { name: 'Row houses', exact: true })).toBeChecked();
  await page.getByLabel(/^Row house numbers/).fill('6-7');
  await page.getByLabel('Area per row house (sq ft)').fill('900.00');
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Save row houses', exact: true }).click();
  await expect(page.getByLabel(/^Row house numbers/)).toHaveValue('');
  expect(posts[2]).toEqual({
    revision: '3',
    houses: ['6', '7'].map((number) => ({ number, areaSqFt: '900.00' })),
  });
  await openStructureDialog(page);
  await page.getByLabel(/^Row house numbers/).fill('8-207');
  await expect(page.getByRole('region', { name: 'Row house preview' })).toContainText(
    '200 row house numbers ready to save.',
  );
  await page.getByRole('button', { name: 'Save row houses', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '200 row houses added.' })).toBeVisible();
  expect(posts[3]).toEqual({
    revision: '3',
    houses: Array.from({ length: 200 }, (_, n) => ({ number: String(n + 8), areaSqFt: null })),
  });
  await openStructureDialog(page);
  await page.getByRole('radio', { name: 'Flats in a wing', exact: true }).check();
  await expect(
    page.getByRole('radio', { name: 'Several wings at once', exact: true }),
  ).toBeVisible();
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
      const body = route.request().postDataJSON() as { buildings: PostedWing[] };
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
        : route.fulfill({
            status: 201,
            json: { wings: body.buildings.map((wing) => wingSaved(wing)) },
          });
    }
    if (path.endsWith('/structure'))
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 50 } });
    return route.fulfill({ json: setup });
  });
  await page.goto('/platform/societies/10');
  await page.getByRole('button', { name: /3\s*Buildings/ }).click();
  await openStructureDialog(page);
  await page.getByRole('radio', { name: 'Several wings at once', exact: true }).check();
  await page.getByRole('button', { name: 'Select A to D' }).click();
  await page.getByLabel(/^Flat numbers/).fill('101-103,201-202');
  const preview = page.getByRole('region', { name: 'Flat preview' });
  await expect(preview).toContainText('4 wings / 5 flats per wing / 20 flats total');
  for (const code of ['A', 'B', 'C', 'D'])
    await expect(preview.getByText('Wing ' + code, { exact: true })).toBeVisible();
  await page.getByLabel('Other wing codes').fill('a');
  await expect(page.getByText('Each wing code must be unique.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save selected wings' })).toBeDisabled();
  await page.getByLabel('Other wing codes').fill('E, F');
  await page.getByLabel(/^Flat numbers/).fill('1-100');
  await expect(page.getByRole('alert').filter({ hasText: '500 flats' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save selected wings' })).toBeDisabled();
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
  await page.getByRole('button', { name: 'Save selected wings' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'setup changed or conflicts' }),
  ).toBeVisible();
  await expect(page.getByLabel(/^Flat numbers/)).toHaveValue('101-103,201-202');
  await expect(page.getByRole('checkbox', { name: 'Wing A', exact: true })).toBeChecked();
  conflict = false;
  await page.getByRole('button', { name: 'Save selected wings' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '20 flats added across 4 wings.' }),
  ).toBeVisible();
  await expect(structureDialog(page)).toBeHidden();
  await expect(page.getByLabel(/^Flat numbers/)).toHaveValue('');
  await openStructureDialog(page);
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

test('structure list pages ten rows, searches on the server and adds through a dialog', async ({
  page,
}) => {
  const requests: URLSearchParams[] = [];
  const posts: unknown[] = [];
  await page.route('**/api/v1/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/session'))
      return route.fulfill({
        json: {
          userId: '1',
          email: 'platform@example.invalid',
          platformAdmin: true,
          memberships: [],
          activeSociety: null,
        },
      });
    if (url.pathname.endsWith('/csrf'))
      return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (route.request().method() === 'POST') {
      posts.push(route.request().postDataJSON());
      return route.fulfill({ status: 201 });
    }
    if (url.pathname.endsWith('/structure')) {
      requests.push(url.searchParams);
      const current = Number(url.searchParams.get('page'));
      const searched = url.searchParams.get('search') === '205';
      const numbers = searched ? [205] : Array.from({ length: 10 }, (_, n) => 100 * current + n);
      return route.fulfill({
        json: {
          items: numbers.map((number) => ({
            id: String(number),
            buildingCode: 'A',
            buildingName: 'Wing A',
            flatNumber: String(number),
            areaSqFt: number === 100 ? '900.00' : null,
          })),
          total: searched ? 1 : 25,
          page: current,
          pageSize: 10,
        },
      });
    }
    return route.fulfill({
      json: { ...setup, counts: { ...setup.counts, flats: 25, rowHouses: 50 } },
    });
  });
  await page.goto('/platform/societies/10');
  // Row houses are counted on their own, never as a building or as flats.
  await expect(
    page.getByText('1 wing · 25 flats · 50 row houses · No residents added yet'),
  ).toBeVisible();
  await page.getByRole('button', { name: /3\s*Buildings/ }).click();
  await expect(page.locator('.structure-count')).toHaveText('1 wing · 25 flats · 50 row houses');
  const table = page.getByRole('region', { name: 'Setup flats' });
  await expect(table.getByRole('row')).toHaveCount(11);
  await expect(table.getByRole('row', { name: /100/ })).toContainText('900.00');
  await expect(page.getByText('1–10 of 25')).toBeVisible();
  expect(requests.at(-1)?.get('pageSize')).toBe('10');
  await expect(page.getByRole('button', { name: 'First page' })).toBeDisabled();
  await page.getByRole('button', { name: 'Last page' }).click();
  await expect(table.getByRole('rowheader', { name: '300', exact: true })).toBeVisible();
  expect(requests.at(-1)?.get('page')).toBe('3');
  await expect(page.getByRole('button', { name: 'Last page' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
  await page.getByRole('button', { name: 'First page' }).click();
  await expect(table.getByRole('rowheader', { name: '100', exact: true })).toBeVisible();
  expect(requests.at(-1)?.get('page')).toBe('1');
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(table.getByRole('rowheader', { name: '200', exact: true })).toBeVisible();
  expect(requests.at(-1)?.get('page')).toBe('2');
  await page
    .getByRole('searchbox', { name: 'Search by wing, flat or row house number' })
    .fill('205');
  await expect(table.getByRole('row')).toHaveCount(2);
  expect(requests.at(-1)?.get('search')).toBe('205');
  expect(requests.at(-1)?.get('page')).toBe('1');
  await page
    .getByRole('searchbox', { name: 'Search by wing, flat or row house number' })
    .fill('none');
  await openStructureDialog(page);
  await structureDialog(page).getByRole('button', { name: 'Save wing', exact: true }).click();
  await expect(page.getByText('Enter a wing code, such as A.')).toBeVisible();
  await structureDialog(page).getByRole('button', { name: 'Cancel' }).click();
  // Reopening starts calm: earlier validation messages are not shown again before a new attempt.
  await openStructureDialog(page);
  await expect(page.getByText('Enter a wing code, such as A.')).toHaveCount(0);
  await page.getByLabel(/^Wing code/).fill('Z');
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await structureDialog(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(structureDialog(page)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Add wing or row houses' })).toBeFocused();
  expect(posts).toEqual([]);
});

test('an existing wing takes only its missing flats; a save with nothing new explains itself', async ({
  page,
}) => {
  const present = ['101', '102', '103', '104', '105'];
  const posts: PostedWing[] = [];
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
      const body = route.request().postDataJSON() as PostedWing;
      posts.push(body);
      const result = wingSaved(body, present);
      if (!result.added.length)
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: 'NOTHING_TO_ADD',
              message:
                'All of these flats already exist in wing A (101, 102, 103, 104 and 105). Nothing new to save. Enter numbers that are not added yet.',
            },
          },
        });
      present.push(...result.added);
      return route.fulfill({ status: 201, json: result });
    }
    if (path.endsWith('/structure'))
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 10 } });
    return route.fulfill({ json: setup });
  });
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/platform/societies/10');
  await page.getByRole('button', { name: /3\s*Buildings/ }).click();
  await openStructureDialog(page);
  await expect(page.getByText('enter its code again', { exact: false })).toBeVisible();
  await page.getByLabel(/^Wing code/).fill('A');
  await page.getByLabel(/^Flat numbers/).fill('101-111');
  await expect(page.getByRole('region', { name: 'Flat preview' })).toContainText(
    'only the flat numbers it does not have yet are added',
  );
  await page.getByRole('button', { name: 'Save wing', exact: true }).click();
  await expect(
    page.getByRole('status').filter({
      hasText: '6 flats added to wing A. Skipped 5 that already exist: 101, 102, 103, 104, 105.',
    }),
  ).toBeVisible();
  await expect(structureDialog(page)).toBeHidden();
  expect(posts[0]?.flats.map((flat) => flat.number)).toHaveLength(11);
  await openStructureDialog(page);
  await page.getByLabel(/^Wing code/).fill('A');
  await page.getByLabel(/^Flat numbers/).fill('101-105');
  await page.getByRole('button', { name: 'Save wing', exact: true }).click();
  const alert = structureDialog(page)
    .getByRole('alert')
    .filter({ hasText: 'All of these flats already exist in wing A' });
  await expect(alert).toBeVisible();
  await expect(alert).toBeInViewport();
  await expect(page.getByLabel(/^Flat numbers/)).toHaveValue('101-105');
  expect(posts).toHaveLength(2);
});
