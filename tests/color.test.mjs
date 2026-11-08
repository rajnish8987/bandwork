import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAND_COLORS, onColor, contrast, INK } from '../public/js/core/color.js';

test('text on yellow is dark and text on black is white', () => {
  assert.equal(onColor('#F5C518'), INK);
  assert.equal(onColor('#17181C'), '#FFFFFF');
});

test('every band colour keeps text readable at 4.5:1 or better', () => {
  for (const { name, hex } of BAND_COLORS) {
    assert.ok(contrast(hex, onColor(hex)) >= 4.5, `${name} ${hex}: ${contrast(hex, onColor(hex)).toFixed(2)}`);
  }
});

test('contrast of black on white is 21:1', () => {
  assert.equal(Math.round(contrast('#000000', '#FFFFFF')), 21);
});
