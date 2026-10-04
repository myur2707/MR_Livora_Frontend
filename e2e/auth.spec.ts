import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({ serviceWorkers: 'block' });
test('compact login fits laptop and mobile screens with visible validation and sign-in errors', async ({
  page,
}) => {
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    return route.fulfill({
      status: 401,
      json: { error: { code: path.endsWith('/login') ? 'INVALID_CREDENTIALS' : 'AUTH_REQUIRED' } },
    });
  });
  const assertFits = async () => {
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const name of ['Email address', 'Password']) {
      const bounds = await page.getByLabel(name, { exact: false }).boundingBox();
      expect(bounds).not.toBeNull();
      if (bounds)
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0);
    }
    await expect(
      page.getByRole('link', { name: 'Forgot password?', exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole('link', { name: 'Create a resident account', exact: true }),
    ).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeInViewport();
  };
  for (const [width, height] of [
    [1366, 768],
    [1366, 600],
    [1280, 600],
    [1093, 614],
    [1024, 576],
    [320, 640],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const theme of ['light', 'dark']) {
      await page.goto('/login');
      await page.evaluate((theme) => {
        document.documentElement.dataset['theme'] = theme;
      }, theme);
      await page.locator('.brand-logo').evaluate((image: HTMLImageElement) => image.decode());
      const logo = await page.locator('.auth-header .brand-logo').boundingBox();
      expect(logo?.height).toBeLessThanOrEqual(68);
      await assertFits();
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(page.locator('#auth-email-description')).toHaveText('Enter email address.');
      await expect(page.locator('#auth-password-description')).toHaveText('Enter password.');
      await assertFits();
      await page.getByLabel('Email address').fill('synthetic@example.invalid');
      await page.getByLabel('Password', { exact: false }).fill('Invalid synthetic password');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(
        page.getByRole('alert').filter({ hasText: 'Email or password is incorrect.' }),
      ).toBeVisible();
      await assertFits();
    }
  }
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});
test('login validation, generic failures, workspace selection and logout', async ({ page }) => {
  let signedIn = false;
  let active = false;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST')
      expect(request.headers()['x-csrf-token']).toBe('synthetic-csrf');
    if (path.endsWith('/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (path.endsWith('/login')) {
      const body: unknown = request.postDataJSON();
      const password =
        typeof body === 'object' && body !== null && 'password' in body ? body.password : '';
      if (password !== 'Synthetic browser password')
        return route.fulfill({
          status: 401,
          json: {
            error: { code: 'INVALID_CREDENTIALS', message: 'unsafe detail must be ignored' },
          },
        });
      signedIn = true;
      return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    }
    if (path.endsWith('/logout')) {
      signedIn = false;
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/society-context')) {
      active = true;
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/session')) {
      if (!signedIn)
        return route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED' } } });
      const membership = {
        societyId: '10',
        membershipId: '20',
        name: 'Synthetic community',
        roles: ['RESIDENT'],
        permissions: ['society.dashboard.read'],
      };
      return route.fulfill({
        json: {
          userId: '1',
          email: 'synthetic@example.invalid',
          platformAdmin: false,
          memberships: [membership],
          activeSociety: active ? membership : null,
          expiresAt: '2099-01-01T00:00:00Z',
        },
      });
    }
    return route.fulfill({ status: 404 });
  });
  await page.goto('/society/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome home' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('#auth-email-description')).toHaveText('Enter email address.');
  await page.getByLabel('Email address').fill('synthetic@example.invalid');
  await page.getByLabel('Password', { exact: false }).fill('wrong');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Email or password is incorrect.' }),
  ).toBeVisible();
  await expect(page.getByText('unsafe detail must be ignored')).toHaveCount(0);
  await page.getByLabel('Password', { exact: false }).fill('Synthetic browser password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose your workspace' })).toBeVisible();
  await page.getByLabel('Community', { exact: false }).selectOption('10');
  await page.getByRole('button', { name: 'Open community workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Your community space' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Societies', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome home' })).toBeVisible();
});

test('forgot/reset forms keep responses generic and remove the reset token from history', async ({
  page,
}) => {
  const resetToken = 'a'.repeat(43);
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/csrf')) return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (path.endsWith('/forgot-password'))
      return route.fulfill({
        status: 202,
        json: { message: 'If this account is eligible, a reset link will be sent.' },
      });
    if (path.endsWith('/reset-password')) {
      const payload: unknown = route.request().postDataJSON();
      expect(payload).toEqual({ token: resetToken, password: 'New synthetic password' });
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED' } } });
  });
  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill('unknown@example.invalid');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'If this account is eligible' }),
  ).toBeVisible();
  await page.goto('/reset-password#token=' + resetToken);
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel(/^Password/).fill('New synthetic password');
  await page.getByLabel('Confirm password', { exact: false }).fill('Different synthetic password');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Passwords must match' })).toBeVisible();
  await page.getByLabel('Confirm password', { exact: false }).fill('New synthetic password');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Password updated' })).toBeVisible();
  expect(
    await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage)),
  ).not.toContain(resetToken);
});

test('platform roles do not bypass society guards, and expired/offline sessions fail closed', async ({
  page,
}) => {
  let expired = false;
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({
      status: expired ? 401 : 200,
      json: expired
        ? { error: { code: 'AUTH_REQUIRED' } }
        : {
            userId: '1',
            email: 'synthetic@example.invalid',
            platformAdmin: true,
            memberships: [],
            activeSociety: null,
          },
    }),
  );
  await page.goto('/society/dashboard');
  await expect(page.getByRole('heading', { name: 'Choose your workspace' })).toBeVisible();
  await page.goto('/platform/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome to MR Livora' })).toBeVisible();
  expired = true;
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome home' })).toBeVisible();
  await page.unroute('**/api/v1/auth/session');
  await page.route('**/api/v1/auth/session', (route) => route.abort());
  await page.goto('/platform/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome home' })).toBeVisible();
});
