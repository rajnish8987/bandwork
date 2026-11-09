import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { removeOldCopies } from '../public/js/core/old-address.js';

function worker(scope) {
  const entry = {
    scope,
    removed: false,
    unregister: async () => {
      entry.removed = true;
      return true;
    },
  };
  return entry;
}

const OLD = 'https://rajnish8987.github.io/bandwork/';
const NEW = 'https://rajnish8987.github.io/tensile/';

test('the offline copy left at the old address is removed', async () => {
  const old = worker(OLD);
  await removeOldCopies({ getRegistrations: async () => [old, worker(NEW)] });
  assert.equal(old.removed, true);
});

test('the offline copy at the new address stays', async () => {
  const current = worker(NEW);
  await removeOldCopies({ getRegistrations: async () => [worker(OLD), current] });
  assert.equal(current.removed, false);
});

test('only the exact old address counts', async () => {
  const similar = worker('https://rajnish8987.github.io/bandwork-notes/');
  const nested = worker('https://rajnish8987.github.io/tensile/bandwork/');
  await removeOldCopies({ getRegistrations: async () => [similar, nested] });
  assert.equal(similar.removed, false);
  assert.equal(nested.removed, false);
});

test('a browser that refuses does not stop the app starting', async () => {
  await assert.doesNotReject(removeOldCopies({ getRegistrations: async () => { throw new Error('refused'); } }));
  const stuck = worker(OLD);
  stuck.unregister = async () => { throw new Error('refused'); };
  await assert.doesNotReject(removeOldCopies({ getRegistrations: async () => [stuck] }));
});

test('the web app removes the old copy each time it starts, and the Android app does not', () => {
  const app = readFileSync(new URL('../public/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /if \('serviceWorker' in navigator && window\.isSecureContext && !isNative\(\)\) \{\s*navigator\.serviceWorker\.register\('\.\/sw\.js'\)\.catch\(\(\) => \{\}\);\s*removeOldCopies\(navigator\.serviceWorker\);\s*\}/);
});
