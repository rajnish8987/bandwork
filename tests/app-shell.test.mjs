import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

test('every app file is stored for offline use', () => {
  const sw = readFileSync(join(PUBLIC, 'sw.js'), 'utf8');
  const missing = walk(PUBLIC)
    .map((f) => relative(PUBLIC, f).replaceAll('\\', '/'))
    .filter((f) => f !== 'sw.js' && !f.endsWith('.txt') && !f.startsWith('vendor/'))
    .filter((f) => !sw.includes(`'./${f}'`));
  assert.deepEqual(missing, []);
});

test('the offline list names only files that exist', () => {
  const sw = readFileSync(join(PUBLIC, 'sw.js'), 'utf8');
  const listed = [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]);
  assert.ok(listed.length > 10);
  const present = new Set(walk(PUBLIC).map((f) => relative(PUBLIC, f).replaceAll('\\', '/')));
  assert.deepEqual(listed.filter((f) => !present.has(f)), []);
});

test('the security policy allows only the YouTube player from outside the app', () => {
  const html = readFileSync(join(PUBLIC, 'index.html'), 'utf8');
  const policy = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /frame-src https:\/\/www\.youtube-nocookie\.com;/);
  assert.doesNotMatch(policy, /connect-src/, 'the pose library must stay unable to send usage data');
  assert.equal((policy.match(/https?:/g) ?? []).length, 1);
});

test('every app script is valid, including ones loaded only on demand', () => {
  const scripts = walk(join(PUBLIC, 'js')).filter((f) => f.endsWith('.js'));
  assert.ok(scripts.length > 20);
  for (const script of [...scripts, join(PUBLIC, 'sw.js')]) {
    execFileSync(process.execPath, ['--check', script], { stdio: 'pipe' });
  }
});

test('every guide picture exists', async () => {
  const source = readFileSync(join(PUBLIC, 'js/ui/extra-screens.js'), 'utf8');
  const named = [...source.matchAll(/'([a-z-]+\.(?:gif|jpg))'/g)].map((m) => m[1]);
  assert.ok(named.length >= 10);
  const present = new Set(readdirSync(join(PUBLIC, 'guide')));
  assert.deepEqual(named.filter((name) => !present.has(name)), []);
  // A moving picture needs a still one for people who turn off animation.
  for (const name of named.filter((n) => n.endsWith('.gif'))) assert.ok(present.has(name.replace('.gif', '.jpg')), name);
});

test('the manifest offers installable icons', () => {
  const m = JSON.parse(readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.display, 'standalone');
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  assert.equal(m.start_url, './');
});

let server;
let base;
before(async () => {
  server = createAppServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('the server serves the app with correct types', async () => {
  const html = await fetch(`${base}/`);
  assert.equal(html.status, 200);
  assert.match(html.headers.get('content-type'), /text\/html/);
  const js = await fetch(`${base}/js/app.js`);
  assert.match(js.headers.get('content-type'), /javascript/);
  const manifest = await fetch(`${base}/manifest.webmanifest`);
  assert.match(manifest.headers.get('content-type'), /manifest\+json/);
  assert.equal((await fetch(`${base}/guide/setup.jpg`)).headers.get('content-type'), 'image/jpeg');
  assert.equal((await fetch(`${base}/guide/camera.gif`)).headers.get('content-type'), 'image/gif');
});

test('the server refuses paths outside the app folder', async () => {
  for (const path of ['/../package.json', '/..%2fpackage.json', '/%2e%2e/%2e%2e/package.json', '/js/..%5c..%5cpackage.json']) {
    const res = await fetch(`${base}${path}`);
    assert.notEqual(res.status, 200, path);
  }
});

test('the server returns 404 for missing files', async () => {
  assert.equal((await fetch(`${base}/nope.js`)).status, 404);
});

test('the server rejects malformed paths without crashing', async () => {
  assert.equal((await fetch(`${base}/%E0%A4%A`)).status, 400);
  assert.equal((await fetch(`${base}/`)).status, 200);
});
