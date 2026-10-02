import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist/society-ease/browser');
const port = Number(process.env.PORT ?? 4173);
const fixtures = process.env.PWA_TEST_FIXTURES === '1';
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
server.listen(port, '127.0.0.1', () => console.info('Static preview: http://127.0.0.1:' + port));
