import { createServer, request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist/society-ease/browser');
const port = Number(process.env.PORT ?? 4173);
const fixtures = process.env.PWA_TEST_FIXTURES === '1';
const apiOrigin = process.env.PREVIEW_API_ORIGIN;
let api;
if (apiOrigin) {
  api = new URL(apiOrigin);
  if (
    fixtures ||
    api.origin !== apiOrigin ||
    api.protocol !== 'http:' ||
    api.hostname !== '127.0.0.1' ||
    api.username ||
    api.password
  )
    throw new Error('Preview API requires an exact loopback HTTP origin without test fixtures.');
}
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};
const server = createServer((request, response) => {
  void serve(request, response);
});

async function serve(request, response) {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    if (api && /^\/api(\/|$)/.test(pathname)) {
      proxyApi(request, response);
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
      response.writeHead(405).end();
      return;
    }
    if (/^\/(api|uploads|bills|payments|receipts|residents)(\/|$)/.test(pathname)) {
      // Synthetic response fixtures exist only in the local browser-test server.
      response.writeHead(fixtures ? 200 : 404, {
        'Content-Type': 'application/json',
        'Cache-Control': fixtures ? 'max-age=600' : 'no-store',
      });
      response.end(
        JSON.stringify(
          fixtures
            ? { marker: 'synthetic-private-data', path: pathname }
            : { message: 'No API is available in this preview.' },
        ),
      );
      return;
    }
    const file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const target = extname(file) ? file : resolve(root, 'index.html');
    const contents = await readFile(target);
    response.writeHead(200, {
      'Content-Type': mime[extname(target)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch (error) {
    const missing =
      error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
    response.writeHead(missing ? 404 : 500, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store',
    });
    response.end(missing ? 'Not found' : 'Preview request failed');
  }
}
function proxyApi(request, response) {
  const headers = { ...request.headers };
  for (const name of [
    'connection',
    'keep-alive',
    'proxy-authorization',
    'proxy-authenticate',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'forwarded',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    ...(request.headers.connection ?? '').split(',').map((name) => name.trim().toLowerCase()),
  ])
    delete headers[name];
  headers.host = api.host;
  const upstream = httpRequest(
    {
      hostname: api.hostname,
      port: api.port,
      path: request.url,
      method: request.method,
      headers,
    },
    (incoming) => {
      const outgoing = { ...incoming.headers, 'cache-control': 'no-store' };
      delete outgoing.connection;
      delete outgoing['transfer-encoding'];
      response.writeHead(incoming.statusCode ?? 502, outgoing);
      incoming.on('error', () => response.destroy());
      incoming.pipe(response);
    },
  );
  upstream.setTimeout(15000, () => upstream.destroy());
  upstream.on('error', () => {
    if (response.headersSent) response.destroy();
    else
      response
        .writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
        .end(
          JSON.stringify({ error: { code: 'API_UNAVAILABLE', message: 'Local API unavailable.' } }),
        );
  });
  request.on('aborted', () => upstream.destroy());
  request.pipe(upstream);
}
server.listen(port, '127.0.0.1', () => console.info('Static preview: http://127.0.0.1:' + port));
