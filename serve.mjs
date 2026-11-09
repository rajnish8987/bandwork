// Small static server for running Tensile on this laptop and on a phone on the
// same Wi-Fi. It only ever serves files inside public/.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PUBLIC = resolve(fileURLToPath(new URL('./public', import.meta.url)));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function reply(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}

async function handle(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return reply(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });

  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return reply(res, 400, 'Bad request');
  }
  if (path.includes('\0')) return reply(res, 400, 'Bad request');
  if (path === '/') path = '/index.html';

  const file = resolve(join(PUBLIC, path));
  if (!file.startsWith(PUBLIC + sep)) return reply(res, 403, 'Forbidden');

  try {
    if (!(await stat(file)).isFile()) return reply(res, 404, 'Not found');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    return reply(res, 404, 'Not found');
  }
}

export function createAppServer() {
  return createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) reply(res, 500, 'Server error');
      else res.end();
    });
  });
}

function networkAddresses() {
  return Object.entries(networkInterfaces())
    .filter(([name]) => !/vethernet|wsl|virtual|vmware|docker/i.test(name))
    .flatMap(([, addresses]) => addresses ?? [])
    .filter((a) => a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'))
    .map((a) => a.address);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 5173;
  const server = createAppServer();
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`Port ${port} is already in use. Close the other copy, or run with another port: set PORT=5174`);
    else console.error(err.message);
    process.exit(1);
  });
  server.listen(port, '0.0.0.0', () => {
    console.log('Tensile is running.\n');
    console.log(`  This laptop:   http://localhost:${port}`);
    for (const address of networkAddresses()) console.log(`  Phone (same Wi-Fi): http://${address}:${port}`);
    console.log('\nPress Ctrl+C to stop.');
  });
}
