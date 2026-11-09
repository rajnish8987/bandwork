import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { parseRoute } from '../public/js/core/route.js';
import { defaultState, MAX_BACKUP_BYTES, parseBackup } from '../public/js/core/store.js';

const project = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/* ---------- Links ---------- */

test('a normal address is read as before', () => {
  assert.deepEqual(parseRoute('#/exercises/squat'), { name: 'exercises', arg: 'squat', extra: undefined });
  assert.deepEqual(parseRoute('#/routine/cooldown/w%201'), { name: 'routine', arg: 'cooldown', extra: 'w 1' });
  assert.equal(parseRoute('').name, 'today');
  assert.equal(parseRoute('#/').name, 'today');
});

test('a malformed address cannot crash the app', () => {
  for (const hash of ['#/exercises/%E0%A4%A', '#/%', '#%', '#/bands/%', '#/routine/warmup/%']) {
    assert.doesNotThrow(() => parseRoute(hash), hash);
  }
  assert.equal(parseRoute('#/exercises/%').arg, '%', 'kept as plain text, which matches nothing');
});

/* ---------- The offline worker ---------- */

const CACHE = project('public/sw.js').match(/const CACHE = '([^']+)'/)[1];

function runWorker({ network, stored = {}, otherCaches = [], pages = [] }) {
  const listeners = {};
  const fetched = [];
  const fetchOptions = [];
  const puts = [];
  const deleted = [];
  const installed = [];
  const reopened = [];
  const open = () => ({
    addAll: async (list) => { installed.push(...list); },
    match: async (key) => stored[typeof key === 'string' ? key : key.url],
    put: async (key, response) => { puts.push({ key: typeof key === 'string' ? key : key.url, response }); },
  });
  const worker = {
    self: {
      location: new URL('https://example.test/tensile/sw.js'),
      addEventListener: (name, fn) => { listeners[name] = fn; },
      skipWaiting: async () => {},
      clients: {
        claim: async () => {},
        matchAll: async () => pages.map((url) => ({ url, navigate: async (to) => { reopened.push(to); } })),
      },
    },
    caches: {
      open: async () => open(),
      keys: async () => [CACHE, ...otherCaches],
      delete: async (name) => { deleted.push(name); return true; },
    },
    fetch: async (request, options) => {
      const url = typeof request === 'string' ? request : request.url;
      fetched.push(url);
      fetchOptions.push(options);
      return network(url);
    },
    Request: class { constructor(url, options) { this.url = url; this.cache = options?.cache; } },
    URL,
    Promise,
  };
  vm.runInNewContext(project('public/sw.js'), worker);
  return { listeners, fetched, fetchOptions, puts, deleted, installed, reopened };
}

async function fetchEvent(listeners, request) {
  const waits = [];
  let answer;
  listeners.fetch({ request, respondWith: (p) => { answer = p; }, waitUntil: (p) => waits.push(p) });
  if (!answer) return 'left to the browser';
  const response = await answer;
  await Promise.all(waits);
  await new Promise((resolve) => setImmediate(resolve));
  return response;
}

const pageResponse = { ok: true, type: 'basic', name: 'the app', clone() { return this; } };
const imageResponse = { ok: true, type: 'basic', name: 'a picture', clone() { return this; } };

test('opening a file by its address shows that file, and never touches the stored app', async () => {
  const { listeners, fetched, puts } = runWorker({
    network: (url) => (url === './index.html' ? pageResponse : imageResponse),
    stored: { './index.html': pageResponse },
  });
  for (const file of ['guide/setup.jpg', 'js/core/version.js', 'nope']) {
    const shown = await fetchEvent(listeners, { method: 'GET', mode: 'navigate', url: `https://example.test/tensile/${file}` });
    assert.equal(shown, 'left to the browser', file);
  }
  assert.deepEqual(fetched, []);
  assert.deepEqual(puts, []);
});

test('the app opens from its own addresses, and refreshes as the app', async () => {
  for (const address of ['', 'index.html', '?from=home', 'index.html?x=1']) {
    const { listeners, fetched, puts } = runWorker({ network: () => pageResponse, stored: { './index.html': pageResponse } });
    const shown = await fetchEvent(listeners, { method: 'GET', mode: 'navigate', url: `https://example.test/tensile/${address}` });
    assert.equal(shown, pageResponse, address);
    assert.deepEqual(fetched, ['./index.html'], address);
    assert.deepEqual(puts.map((p) => p.response.name), ['the app'], address);
  }
});

test('a new version stores fresh files, not what the browser kept from the old one', async () => {
  const { listeners, installed } = runWorker({ network: () => pageResponse });
  let done;
  listeners.install({ waitUntil: (p) => { done = p; } });
  await done;
  assert.ok(installed.length > 20, 'the list of files');
  assert.deepEqual(installed.filter((request) => request.cache !== 'reload').map((r) => r.url ?? r), []);
});

test('a background refresh asks the server, not the browser cache', async () => {
  const { listeners, fetchOptions } = runWorker({ network: () => imageResponse });
  await fetchEvent(listeners, { method: 'GET', mode: 'no-cors', url: 'https://example.test/tensile/guide/setup.jpg' });
  assert.deepEqual(fetchOptions.map((o) => o?.cache), ['no-cache']);
});

async function activate(listeners) {
  let done;
  listeners.activate({ waitUntil: (p) => { done = p; } });
  await done;
  await new Promise((resolve) => setImmediate(resolve));
}

test('an update reopens pages still running the old version', async () => {
  const pages = ['https://example.test/tensile/', 'https://example.test/tensile/#/workout'];
  const { listeners, reopened } = runWorker({ network: () => pageResponse, otherCaches: ['tensile-v1'], pages });
  await activate(listeners);
  // No address fragment: going to the same address with one would not reload the page.
  assert.deepEqual(reopened, ['https://example.test/tensile/', 'https://example.test/tensile/']);
});

test('reopening pages is not part of activating, or each would wait for the other', async () => {
  const pages = ['https://example.test/tensile/'];
  const { listeners, reopened } = runWorker({ network: () => pageResponse, otherCaches: ['tensile-v1'], pages });
  let done;
  listeners.activate({ waitUntil: (p) => { done = p; } });
  await done;
  assert.deepEqual(reopened, [], 'activation finished before any page was reopened');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(reopened.length, 1);
});

test('a first install leaves the page alone', async () => {
  const { listeners, reopened } = runWorker({ network: () => pageResponse, pages: ['https://example.test/tensile/'] });
  await activate(listeners);
  assert.deepEqual(reopened, []);
});

test('a file is still refreshed under its own name', async () => {
  const { listeners, puts } = runWorker({ network: () => imageResponse });
  const request = { method: 'GET', mode: 'no-cors', url: 'https://example.test/tensile/guide/setup.jpg' };
  await fetchEvent(listeners, request);
  assert.deepEqual(puts.map((p) => p.key), [request.url]);
});

test('only a good response from this site is ever stored', async () => {
  const request = { method: 'GET', mode: 'no-cors', url: 'https://example.test/tensile/x.js' };
  for (const bad of [{ ok: false, type: 'basic' }, { ok: true, type: 'opaque' }, { ok: true, type: 'cors' }]) {
    const { listeners, puts } = runWorker({ network: () => ({ ...bad, clone() { return this; } }) });
    await fetchEvent(listeners, request);
    assert.deepEqual(puts, [], JSON.stringify(bad));
  }
});

test('updating clears old copies of this app and leaves other sites on the address alone', async () => {
  const { listeners, deleted } = runWorker({ network: () => pageResponse, otherCaches: ['tensile-v1', 'bandwork-v3', 'another-site-v1', 'tensile', 'my-tensile-v1'] });
  let done;
  listeners.activate({ waitUntil: (p) => { done = p; } });
  await done;
  assert.deepEqual(deleted.sort(), ['bandwork-v3', 'tensile-v1']);
});

/* ---------- What the browser is told to refuse ---------- */

const csp = project('public/index.html').match(/Content-Security-Policy" content="([^"]+)"/)[1];
const policy = Object.fromEntries(csp.split(';').map((rule) => {
  const [name, ...values] = rule.trim().split(/\s+/);
  return [name, values];
}));

test('the page allows only its own code, and nothing that runs text as code', () => {
  assert.deepEqual(policy['default-src'], ["'self'"]);
  assert.deepEqual(policy['script-src'], ["'self'", "'wasm-unsafe-eval'"], 'the pose model needs WebAssembly, and nothing else is added');
  assert.deepEqual(policy['object-src'], ["'none'"]);
  assert.deepEqual(policy['base-uri'], ["'none'"]);
  assert.deepEqual(policy['frame-src'], ['https://www.youtube-nocookie.com']);
  assert.ok(!csp.includes('*'), 'no wildcards');
  assert.ok(!csp.includes('unsafe-eval\' ') && !/'unsafe-eval'/.test(csp));
});

test('forms cannot send anything anywhere', () => {
  assert.deepEqual(policy['form-action'], ["'none'"]);
});

test('injected style sheets are refused, while style attributes keep working', () => {
  assert.deepEqual(policy['style-src'], ["'self'"]);
  assert.deepEqual(policy['style-src-attr'], ["'unsafe-inline'"]);
});

test('the app refuses to run inside another site', () => {
  assert.match(project('public/js/app.js'), /window\.top !== window\.self/);
});

test('the video player is boxed in', () => {
  const app = project('public/js/app.js');
  const allowed = app.match(/setAttribute\('sandbox', '([^']+)'\)/)?.[1].split(' ') ?? [];
  assert.ok(allowed.length, 'it has a sandbox');
  assert.ok(!allowed.includes('allow-top-navigation'), 'it cannot move this page elsewhere');
  assert.ok(!allowed.includes('allow-forms'));
  assert.doesNotMatch(app.match(/frame\.allow = '([^']+)'/)[1], /camera|microphone|geolocation/);
});

/* ---------- Backups ---------- */

const backup = (profile) => JSON.stringify({ app: 'bandwork', version: 1, profile: { ...defaultState().profile, ...profile }, workouts: [] });

test('a backup cannot smuggle in object internals', () => {
  const text = backup({}).replace('"onboarded":false', '"onboarded":true,"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted":1}},"prototype":{"polluted":1}');
  const { profile } = parseBackup(text);
  assert.equal(profile.onboarded, true);
  for (const key of ['__proto__', 'constructor', 'prototype']) assert.equal(Object.hasOwn(profile, key), false, key);
  assert.equal(({}).polluted, undefined);
  const nested = backup({}).replace('"swaps":{}', '"swaps":{"__proto__":{"polluted":1},"squat":"curl"}');
  assert.deepEqual(Object.keys(parseBackup(nested).profile.swaps), ['squat']);
});

test('swaps in a backup must name real exercises', () => {
  const { swaps } = parseBackup(backup({ swaps: { squat: 'curl', curl: '"><img src=x>', evil: 'squat', 'wrap-press': 7 } })).profile;
  assert.deepEqual(swaps, { squat: 'curl' });
});

test('a huge file is refused before it is read', () => {
  assert.ok(MAX_BACKUP_BYTES >= 10 * 1024 * 1024, 'years of real workouts still fit');
  assert.match(project('public/js/app.js'), /file\.size > MAX_BACKUP_BYTES/);
  assert.throws(() => parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1)), /not a Tensile backup/);
});

/* ---------- Speech ---------- */

test('nothing goes on talking after leaving: every way out cuts speech off', () => {
  const app = project('public/js/app.js');
  assert.match(app, /addEventListener\('pagehide', stopSpeaking\)/);
  assert.match(app, /function stopTempo\(\) \{\s*if \(!tempo\) return;\s*clearInterval\(tempo\.timer\);\s*tempo = null;\s*stopSpeaking\(\);/);
});

/* ---------- Publishing ---------- */

const workflows = ['pages', 'check-videos'].map((name) => [name, project(`.github/workflows/${name}.yml`)]);

test('every outside action is pinned to one exact version', () => {
  for (const [name, text] of workflows) {
    for (const [, action] of text.matchAll(/uses:\s*(\S+)/g)) assert.match(action, /@[0-9a-f]{40}$/, `${name}: ${action}`);
  }
});

test('publishing rights are given only to the step that publishes', () => {
  const pages = workflows[0][1];
  const [top, jobs] = pages.split(/^jobs:/m);
  assert.doesNotMatch(top, /pages: write|id-token: write/, 'not for the whole workflow');
  const [test, publish] = jobs.split(/^ {2}publish:/m);
  assert.match(test, /npm test/);
  assert.doesNotMatch(test, /pages: write|id-token: write/, 'tests run without publishing rights');
  assert.match(publish, /needs: test/, 'nothing publishes unless the tests pass');
  assert.match(publish, /pages: write/);
  assert.doesNotMatch(publish, /npm /, 'no project code runs with publishing rights');
});

test('nobody outside can make the workflows run', () => {
  for (const [name, text] of workflows) assert.doesNotMatch(text, /pull_request_target|pull_request:|issue_comment/, name);
  assert.match(workflows[0][1], /persist-credentials: false/);
});

test('key files can never be committed by accident', () => {
  const ignored = project('.gitignore');
  for (const pattern of ['*.jks', '*.keystore', '.env']) assert.ok(ignored.includes(pattern), pattern);
});
