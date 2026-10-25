import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

/** Records every API call; public pages must not need any. */
async function trackApi(page: Page): Promise<string[]> {
  const calls: string[] = [];
  await page.route('**/api/v1/**', (route) => {
    calls.push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED' } } });
  });
  return calls;
}

const axe = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations;

test('home, about and contact load publicly with titles, descriptions and no API calls', async ({
  page,
}) => {
  const calls = await trackApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const pages = [
    ['/', 'Mr. Livora · Smart society management', /Your community/],
    ['/about', 'About us · Mr. Livora', /Live in a Better Aura/],
    ['/contact', 'Contact us · Mr. Livora', /Let's talk about/],
  ] as const;
  for (const [path, title, heading] of pages) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Mr\. Livora/,
    );
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(0);
  }
  expect(calls).toEqual([]);
});

test('header links, feature anchor and account actions navigate correctly', async ({ page }) => {
  await trackApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1366, height: 800 });
  await page.goto('/');
  const header = page.locator('.public-header');
  const nav = page.getByRole('navigation', { name: 'Site navigation' });
  await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Features' }).click();
  await expect(page).toHaveURL(/\/#features$/);
  const featuresHeading = page.getByRole('heading', {
    name: 'One workspace for the whole society',
  });
  await expect(featuresHeading).toBeInViewport();
  // The section is highlighted in the menu and its heading clears the floating header.
  await expect(nav.getByRole('link', { name: 'Features' })).toHaveAttribute(
    'aria-current',
    'location',
  );
  await expect(nav.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  const headerBox = await header.boundingBox();
  const headerBottom = (headerBox?.y ?? 0) + (headerBox?.height ?? 0);
  expect((await featuresHeading.boundingBox())?.y ?? 0).toBeGreaterThan(headerBottom);
  // Repeat clicks on an unchanged URL still scroll.
  await nav.getByRole('link', { name: 'Home' }).click();
  await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await nav.getByRole('link', { name: 'Features' }).click();
  await expect(nav.getByRole('link', { name: 'Features' })).toHaveAttribute(
    'aria-current',
    'location',
  );
  await nav.getByRole('link', { name: 'About Us' }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(nav.getByRole('link', { name: 'About Us' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Contact Us' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Let's talk about/ })).toBeFocused();
  await header.getByRole('link', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.goto('/');
  await header.getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('link', { name: 'Mr. Livora home', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Your community/ })).toBeVisible();
});

test('mobile menu works by keyboard and public pages never overflow at 320px', async ({ page }) => {
  await trackApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 720 });
  for (const path of ['/', '/about', '/contact']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Site navigation' })).toBeHidden();
  const opener = page.getByRole('button', { name: 'Open menu' });
  await opener.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await menu.getByRole('link', { name: 'About Us' }).click();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/\/about$/);
});

test('public pages pass accessibility checks in both themes', async ({ page }) => {
  test.setTimeout(90000);
  await trackApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [
    [1366, 800],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const path of ['/', '/about', '/contact']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await axe(page)).toEqual([]);
      await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      expect(await axe(page)).toEqual([]);
      await page.getByRole('button', { name: 'Switch to light theme' }).click();
    }
  }
});

test('contact form validates and opens a prefilled email without sending anything', async ({
  page,
}) => {
  const calls = await trackApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/contact');
  // Capture the mailto link instead of leaving the page for a mail client.
  await page.evaluate(() => {
    window.open = (url?: string | URL) => {
      document.documentElement.dataset['mailto'] = String(url ?? '');
      return null;
    };
  });
  const submit = page.getByRole('button', { name: 'Open email app' });
  await submit.click();
  await expect(page.getByLabel('Your name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('textbox', { name: /^Message/ })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('Phone number')).not.toHaveAttribute('aria-invalid', 'true');
  expect(await page.evaluate(() => document.documentElement.dataset['mailto'])).toBeUndefined();

  await page.getByLabel('Your name').fill('Synthetic Visitor');
  await page.getByLabel('Email address').fill('not-an-email');
  await page.getByLabel('Phone number').fill('abc');
  await page.getByRole('textbox', { name: /^Message/ }).fill('Short');
  await submit.click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Enter a valid phone number.')).toBeVisible();
  await expect(page.getByText('Write at least 10 characters.')).toBeVisible();

  await page.getByLabel('Email address').fill('visitor@example.invalid');
  await page.getByLabel('Phone number').fill('+91 90000 00000');
  await page.getByLabel('Society name').fill('Synthetic Residency');
  await page
    .getByRole('textbox', { name: /^Message/ })
    .fill('We would like to learn more about Mr. Livora.');
  await submit.click();
  await expect(page.getByRole('status')).toContainText('Your email app should now be open');
  const mailto = await page.evaluate(() => document.documentElement.dataset['mailto'] ?? '');
  const url = new URL(mailto);
  expect(url.protocol).toBe('mailto:');
  expect(url.pathname).toBe('mrlivora.official@gmail.com');
  expect(url.searchParams.get('subject')).toBe('Mr. Livora enquiry from Synthetic Visitor');
  expect(url.searchParams.get('body')).toBe(
    'We would like to learn more about Mr. Livora.\n\n' +
      'Name: Synthetic Visitor\nEmail: visitor@example.invalid\n' +
      'Phone: +91 90000 00000\nSociety: Synthetic Residency',
  );
  expect(calls).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test('signed-in visitors see a workspace shortcut instead of account actions', async ({ page }) => {
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
          email: 'synthetic@example.invalid',
          platformAdmin: false,
          memberships: [access],
          activeSociety: access,
          expiresAt: '2099-01-01T00:00:00Z',
        },
      });
    return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20 } });
  });
  await page.setViewportSize({ width: 1366, height: 800 });
  await page.goto('/workspace');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Navigate client-side so the in-memory session survives, as it would for an in-app link.
  await page.evaluate(() => {
    history.pushState({}, '', '/');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { level: 1, name: /Your community/ })).toBeVisible();
  const header = page.locator('.public-header');
  await expect(header.getByRole('link', { name: /Open workspace/ })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
});

test('header hides while scrolling down and returns on scroll up', async ({ page }) => {
  await trackApi(page);
  await page.setViewportSize({ width: 1366, height: 800 });
  await page.goto('/');
  const host = page.locator('se-public-header');
  await expect(host).not.toHaveClass(/is-hidden/);
  await page.mouse.wheel(0, 1400);
  await expect(host).toHaveClass(/is-hidden/);
  await page.mouse.wheel(0, -300);
  await expect(host).not.toHaveClass(/is-hidden/);
  // Keyboard users always see the header when focus moves into it.
  await page.mouse.wheel(0, 900);
  await expect(host).toHaveClass(/is-hidden/);
  await page.getByRole('link', { name: 'Mr. Livora home' }).focus();
  await expect(page.locator('.public-header')).toBeInViewport();
});
