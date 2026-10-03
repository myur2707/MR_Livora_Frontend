import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
async function community(page: Page, role = 'COMMITTEE_MEMBER') {
  const permissions =
    role === 'RESIDENT'
      ? ['society.dashboard.read']
      : ['society.dashboard.read', 'society.notices.manage', 'society.complaints.manage'];
  const membership = {
    societyId: '10',
    membershipId: '11',
    name: 'Garden community',
    roles: [role],
    permissions,
  };
  const notice = {
    authorName: 'Committee member',
    id: '501',
    title: 'Water supply',
    body: '<img src=x onerror="document.body.dataset.xss=1">',
    status: 'DRAFT',
    authorMembershipId: '11',
    createdAt: '2026-10-03T00:00:00Z',
    publishedAt: null as string | null,
    updatedAt: null,
    revision: 1,
  };
  const complaint = {
    id: '601',
    flatId: '101',
    title: 'Pipe leak',
    description: 'Literal <script>alert(1)</script>',
    category: 'PLUMBING',
    status: 'NEW',
    revision: 1,
    assigneeMembershipId: null as string | null,
    createdAt: '2026-10-03T00:00:00Z',
    resolvedAt: null as string | null,
    flatNumber: '101',
    buildingCode: 'A',
  };
  const history: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string;
    revision: number;
    createdAt: string;
  }[] = [
    {
      id: '1',
      fromStatus: null,
      toStatus: 'NEW',
      note: 'Complaint submitted',
      revision: 1,
      createdAt: complaint.createdAt,
    },
  ];
  const actions: Record<string, unknown>[] = [];
  let expired = false;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace('/api/v1/', '');
    if (path === 'auth/csrf')
      return route.fulfill({ json: { csrfToken: 'synthetic-community-csrf' } });
    if (expired) return route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED' } } });
    if (path === 'auth/session')
      return route.fulfill({
        json: {
          userId: '1',
          email: 'community@example.invalid',
          platformAdmin: false,
          memberships: [membership],
          activeSociety: membership,
          expiresAt: '2099-01-01T00:00:00Z',
        },
      });
    const resource = path.replace('society/community/', '');
    const list = (items: object[]) =>
      route.fulfill({
        json: {
          items,
          total: items.length,
          page: Number(url.searchParams.get('page') ?? 1),
          pageSize: 20,
        },
      });
    if (!path.startsWith('society/community/'))
      return route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND' } } });
    if (role === 'RESIDENT')
      return route.fulfill({ status: 403, json: { error: { code: 'ACCESS_DENIED' } } });
    if (request.method() === 'POST') {
      expect(request.headers()['x-csrf-token']).toBe('synthetic-community-csrf');
      const body: unknown = request.postDataJSON();
      expect(body).toBeTruthy();
      const fields = body as Record<string, unknown>;
      actions.push(fields);
      expect(fields).not.toHaveProperty('societyId');
      expect(fields).not.toHaveProperty('actorMembershipId');
      if (resource === 'notices') {
        notice.title = String(fields['title']);
        notice.body = String(fields['body']);
        return route.fulfill({ status: 201, json: { id: notice.id, revision: 1 } });
      }
      if (resource === 'notices/501/edit') {
        expect(fields['revision']).toBe(notice.revision);
        notice.title = String(fields['title']);
        notice.body = String(fields['body']);
        notice.revision++;
      }
      if (resource === 'notices/501/action') {
        expect(fields['revision']).toBe(notice.revision);
        notice.status = fields['action'] === 'PUBLISH' ? 'PUBLISHED' : 'ARCHIVED';
        if (notice.status === 'PUBLISHED') notice.publishedAt = '2026-10-03T01:00:00Z';
        notice.revision++;
      }
      if (resource === 'complaints/601/status') {
        expect(fields['revision']).toBe(complaint.revision);
        const from = complaint.status;
        complaint.status = String(fields['status']);
        complaint.revision++;
        if (typeof fields['assigneeMembershipId'] === 'string')
          complaint.assigneeMembershipId = fields['assigneeMembershipId'];
        if (complaint.status === 'RESOLVED') complaint.resolvedAt = '2026-10-03T02:00:00Z';
        history.unshift({
          id: String(complaint.revision),
          fromStatus: from,
          toStatus: complaint.status,
          note: String(fields['note']),
          revision: complaint.revision,
          createdAt: '2026-10-03T02:00:00Z',
        });
      }
      return route.fulfill({
        json: { id: resource.startsWith('notices') ? notice.id : complaint.id },
      });
    }
    if (resource === 'notices') return list([notice]);
    if (resource === 'notices/501') return route.fulfill({ json: notice });
    if (resource === 'complaints') return list([complaint]);
    if (resource === 'complaints/601') return route.fulfill({ json: complaint });
    if (resource === 'complaints/601/history') return list(history);
    if (resource === 'complaints/assignees')
      return list([{ id: '11', displayName: 'Committee member' }]);
    return route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND' } } });
  });
  return {
    actions,
    expire: () => {
      expired = true;
    },
  };
}
test('committee creates validated draft, safely renders text, publishes and archives', async ({
  page,
}) => {
  await community(page);
  await page.goto('/society/community/notices/new');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: false })).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Title', { exact: false }).fill('Water supply');
  await page
    .getByLabel('Notice text', { exact: false })
    .fill('<img src=x onerror="document.body.dataset.xss=1">');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page).toHaveURL(/notices\/501$/);
  await expect(page.locator('.resident-text')).toHaveText(
    '<img src=x onerror="document.body.dataset.xss=1">',
  );
  expect(await page.locator('main img').count()).toBe(0);
  expect(await page.locator('body').getAttribute('data-xss')).toBeNull();
  await page.getByRole('button', { name: 'Publish notice' }).click();
  await expect(page.getByText(/PUBLISHED · By Committee member/)).toBeVisible();
  await page.getByRole('button', { name: 'Archive notice' }).click();
  await expect(page.getByText(/ARCHIVED · By Committee member/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
});
test('committee assigns, progresses, resolves and closes with visible immutable history', async ({
  page,
}) => {
  const api = await community(page);
  await page.goto('/society/community/complaints/601');
  await page.getByRole('button', { name: 'Save status update' }).click();
  await expect(page.getByLabel('Update for resident', { exact: false })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('Committee assignee', { exact: false }).selectOption('11');
  for (const status of ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) {
    await page.getByLabel('Next status', { exact: false }).selectOption(status);
    await page.getByLabel('Update for resident', { exact: false }).fill('Update ' + status);
    await page.getByRole('button', { name: 'Save status update' }).click();
    await expect(page.getByRole('heading', { name: new RegExp('→ ' + status) })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Save status update' })).toHaveCount(0);
  expect(api.actions.map((item) => item['status'])).toEqual([
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED',
  ]);
  await expect(page.locator('main script')).toHaveCount(0);
});
test('resident cannot type committee routes and expired session removes private content', async ({
  page,
}) => {
  const api = await community(page, 'RESIDENT');
  for (const path of ['notices', 'complaints/601']) {
    await page.goto('/society/community/' + path);
    await expect(page).toHaveURL(/workspace$/);
  }
  api.expire();
  await page.goto('/society/community/notices');
  await expect(page).toHaveURL(/login$/);
  await expect(page.getByText('Pipe leak', { exact: true })).toHaveCount(0);
});
test('committee community screens fit 320px in both themes and remain accessible', async ({
  page,
}) => {
  await community(page);
  await page.setViewportSize({ width: 320, height: 780 });
  for (const path of ['notices', 'notices/501', 'complaints', 'complaints/601']) {
    await page.goto('/society/community/' + path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Loading' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
  }
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});
