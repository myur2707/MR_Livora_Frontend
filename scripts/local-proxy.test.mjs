import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
void test('static hosting applies browser security headers even to missing assets', async () => {
  const local = await preview('');
  await local.ready;
  try {
    const response = await fetch('http://127.0.0.1:' + local.port + '/missing-security-test.js');
    assert.equal(response.status, 404);
    const policy = response.headers.get('Content-Security-Policy');
    assert.ok(policy.includes("script-src 'self'"));
    assert.ok(policy.includes("frame-ancestors 'none'"));
    assert.ok(policy.includes("object-src 'none'"));
    assert.ok(!policy.includes('unsafe-eval'));
    assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  } finally {
    await stop(local.child);
  }
});
async function preview(api, fixtures = '') {
  const port = await freePort();
  const child = spawn(process.execPath, ['scripts/serve-preview.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      PREVIEW_API_ORIGIN: api,
      PWA_TEST_FIXTURES: fixtures,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', () => resolve());
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error('Preview exited with ' + code)));
  });
  return { child, port, ready };
}
async function stop(child) {
  if (child.exitCode !== null) return;
  const ended = once(child, 'exit');
  child.kill();
  await ended;
}

await test('local API proxy preserves cookies, CSRF, origin and body while preventing caching', async (t) => {
  const backend = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    response.writeHead(202, {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=600',
      'Set-Cookie': 'fixture=value; HttpOnly; SameSite=Lax',
    });
    response.end(
      JSON.stringify({ method: request.method, url: request.url, headers: request.headers, body }),
    );
  });
  backend.listen(0, '127.0.0.1');
  await once(backend, 'listening');
  t.after(() => new Promise((resolve) => backend.close(resolve)));
  const server = await preview('http://127.0.0.1:' + backend.address().port);
  t.after(() => stop(server.child));
  await server.ready;
  const response = await fetch('http://127.0.0.1:' + server.port + '/api/v1/auth/login?fixture=1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://127.0.0.1:4200',
      Cookie: 'fixture=value',
      'X-CSRF-Token': 'csrf-fixture',
      'X-Forwarded-For': '203.0.113.5',
    },
    body: '{"fixture":true}',
  });
  assert.equal(response.status, 202);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  const received = await response.json();
  assert.equal(received.method, 'POST');
  assert.equal(received.url, '/api/v1/auth/login?fixture=1');
  assert.equal(received.body, '{"fixture":true}');
  assert.equal(received.headers.origin, 'http://127.0.0.1:4200');
  assert.equal(received.headers.cookie, 'fixture=value');
  assert.equal(received.headers['x-csrf-token'], 'csrf-fixture');
  assert.equal(received.headers['x-forwarded-for'], undefined);
});
await test('unavailable local API returns a safe uncached gateway response', async (t) => {
  const server = await preview('http://127.0.0.1:' + (await freePort()));
  t.after(() => stop(server.child));
  await server.ready;
  const response = await fetch('http://127.0.0.1:' + server.port + '/api/v1/auth/session');
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    error: { code: 'API_UNAVAILABLE', message: 'Local API unavailable.' },
  });
});
await test('preview rejects remote endpoints, credentials, paths and mixed fixtures', async () => {
  for (const [origin, fixtures] of [
    ['http://example.invalid:3000', ''],
    ['http://user:pass@127.0.0.1:3000', ''],
    ['http://127.0.0.1:3000/path', ''],
    ['http://127.0.0.1:3000', '1'],
  ]) {
    const server = await preview(origin, fixtures);
    // ready can reject before the exit assertion completes.
    void server.ready.catch(() => {});
    const exit = once(server.child, 'exit');
    const result = await Promise.race([
      exit,
      delay(5000).then(() => {
        server.child.kill();
        throw new Error('Invalid preview did not exit.');
      }),
    ]);
    assert.notEqual(result[0], 0);
  }
});
