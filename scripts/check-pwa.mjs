import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('dist/mr-livora/browser');
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const config = await json('ngsw-config.json');
const manifest = await json(resolve(root, 'manifest.webmanifest'));
const built = await json(resolve(root, 'ngsw.json'));
const index = await readFile(resolve(root, 'index.html'), 'utf8');
assert.doesNotMatch(index, /<script\b(?![^>]*\bsrc=)[^>]*>/i, 'CSP requires external scripts');
assert.doesNotMatch(index, /\son[a-z]+\s*=/i, 'CSP forbids inline event handlers');
assert.deepEqual(config.dataGroups, [], 'No private/data response caching is allowed');
assert.deepEqual(built.dataGroups, []);
assert.equal(built.assetGroups.length, 1);
assert.equal(built.assetGroups[0].patterns.length, 0, 'No runtime URL asset patterns');
const allowed =
  /^\/(?:index\.html|[a-zA-Z0-9_-]+\.js|[a-zA-Z0-9_-]+\.css|manifest\.webmanifest|favicon\.svg|assets\/brand\/[a-zA-Z0-9_-]+\.svg|icons\/[a-zA-Z0-9_-]+\.png)$/;
for (const url of built.assetGroups[0].urls) {
  assert.match(url, allowed, 'Only allowlisted static files may be cached');
  assert.ok(built.hashTable[url], 'Every cached asset must be versioned by content hash');
}
assert.ok(built.assetGroups[0].urls.includes('/index.html'));
assert.equal(built.navigationRequestStrategy, 'performance');
function navigation(path) {
  return (
    built.navigationUrls.some((rule) => rule.positive && new RegExp(rule.regex).test(path)) &&
    !built.navigationUrls.some((rule) => !rule.positive && new RegExp(rule.regex).test(path))
  );
}
for (const path of [
  '/',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/workspace',
  '/register',
  '/verify-resident-email',
  '/resident-invitation',
  '/join-society',
  '/society/resident-access',
  '/platform/dashboard',
  '/platform/societies',
  '/platform/societies/1',
  '/onboarding/societies/1',
  '/accept-invitation',
  '/society/dashboard',
  ...[
    'outstanding',
    'collection',
    'cash-collection',
    'payments',
    'residents',
    'flat-occupancy',
    'billing',
  ].map((kind) => '/society/reports/' + kind),
  '/society/buildings',
  '/society/flats',
  '/society/flats/1',
  '/society/persons',
  '/society/imports',
  '/society/billing/configuration',
  '/society/billing/periods',
  '/society/billing/generate',
  '/society/billing/bills',
  '/society/billing/bills/1',
  '/society/billing/outstanding',
  '/society/billing/payments',
  '/society/billing/payments/new',
  '/society/billing/payments/report',
  '/society/billing/payments/1',
  '/society/billing/payments/1/receipt',
  '/society/billing/payments/1/correct',
  '/society/resident/dashboard',
  '/society/resident/flats',
  '/society/resident/flats/1',
  '/society/resident/bills',
  '/society/resident/bills/1',
  '/society/resident/payments',
  '/society/resident/payments/1/receipt',
  '/society/resident/receipts',
  '/society/resident/notices',
  '/society/resident/notices/1',
  '/society/resident/complaints',
  '/society/resident/complaints/1',
  '/society/resident/profile',
  '/ui',
])
  assert.ok(navigation(path), path);
for (const path of [
  '/api',
  '/api/v1/bills',
  '/api/v1/data.js',
  '/api/v1/society/persons',
  '/api/v1/society/imports/1/rows',
  '/api/v1/receipts/1',
  '/api/v1/resident-access/requests',
  '/api/v1/society/resident-invitations',
  '/api/v1/society/registration-requests',
  '/payments/1',
  '/bills/1',
  '/receipts/1',
  '/residents/1',
  '/uploads/private.pdf',
  '/api/v1/society/billing/bills',
  '/api/v1/society/billing/bills/1',
  '/api/v1/society/billing/outstanding',
  '/api/v1/society/billing/payments',
  '/api/v1/society/billing/payments/1/receipt',
  '/api/v1/society/billing/payments/report',
  '/api/v1/society/resident/dashboard',
  '/api/v1/society/resident/flats/1',
  '/api/v1/society/resident/bills/1',
  '/api/v1/society/resident/payments/1/receipt',
  '/api/v1/society/resident/receipts',
  '/api/v1/society/resident/notices',
  '/api/v1/society/resident/complaints',
  '/api/v1/society/resident/profile',
  '/api/v1/society/dashboard',
  ...[
    'outstanding',
    'collection',
    'cash-collection',
    'payments',
    'residents',
    'flat-occupancy',
    'billing',
  ].flatMap((kind) => [
    '/api/v1/society/reports/' + kind,
    '/api/v1/society/reports/' + kind + '/export',
  ]),
  '/private',
  '/login/private',
])
  assert.equal(navigation(path), false, path + ' must bypass shell navigation');
assert.equal(manifest.name, 'MR Livora');
assert.equal(manifest.short_name, 'MR Livora');
assert.equal(manifest.description, 'A smarter way to live together.');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');
assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
for (const icon of manifest.icons) {
  assert.ok(icon.src.startsWith('/icons/'));
  const png = await readFile(resolve(root, '.' + icon.src));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(icon.sizes, png.readUInt32BE(16) + 'x' + png.readUInt32BE(20));
}
await access(resolve(root, 'ngsw-worker.js'));
console.info(
  'PWA checks passed: manifest/icons, hashed static assets, empty data groups, private URL bypass.',
);
