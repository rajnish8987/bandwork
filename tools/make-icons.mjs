// Draws the Tensile logo with no image libraries: a letter T whose crossbar is a band
// under tension, thinner in the middle where it stretches. Writes the web icons and
// every Android launcher, notification and splash image. Run with: npm run icons

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < width; x += 1) {
      const rgba = pixel(x, y);
      for (let i = 0; i < 4; i += 1) raw[offset + i] = rgba[i];
      offset += 4;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour with alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const YELLOW = [0xf5, 0xc5, 0x18];
const INK = [0x10, 0x14, 0x1f];
const WHITE = [0xf7, 0xf8, 0xf9];

/* ---------- The shape, in a square from -1 to 1 ---------- */

const BAR_Y = -0.42;
const BAR_END = 0.66;

/** Inside the crossbar: a band pulled from both ends, narrowest in the middle, with round ends. */
function inBar(x, y) {
  const along = Math.abs(x);
  if (along > BAR_END + 0.19) return false;
  const stretch = Math.min(1, along / BAR_END);
  const halfThickness = 0.085 + 0.095 * stretch * stretch;
  if (along <= BAR_END) return Math.abs(y - BAR_Y) <= halfThickness;
  return Math.hypot(along - BAR_END, y - BAR_Y) <= 0.18;
}

/** Inside the stem, with a round foot. */
function inStem(x, y) {
  const HALF = 0.165;
  const FOOT = 0.66;
  if (Math.abs(x) > HALF) return false;
  if (y > FOOT) return Math.hypot(x, y - FOOT) <= HALF;
  return y >= BAR_Y;
}

/** The colour at a point, or null for the background. The band crosses in front of the stem. */
function logoColour(x, y) {
  if (inBar(x, y)) return YELLOW;
  return inStem(x, y) ? WHITE : null;
}

/* ---------- Drawing, with smoothed edges ---------- */

const SAMPLES = 4;

/** Averages several points within a pixel. `at` gives the [r, g, b, a] at a point in pixels. */
function smooth(at) {
  return (px, py) => {
    const total = [0, 0, 0, 0];
    for (let i = 0; i < SAMPLES; i += 1) {
      for (let j = 0; j < SAMPLES; j += 1) {
        const [r, g, b, a] = at(px + (i + 0.5) / SAMPLES, py + (j + 0.5) / SAMPLES);
        total[0] += r * a;
        total[1] += g * a;
        total[2] += b * a;
        total[3] += a;
      }
    }
    if (!total[3]) return [0, 0, 0, 0];
    return [total[0] / total[3], total[1] / total[3], total[2] / total[3], total[3] / (SAMPLES * SAMPLES)].map(Math.round);
  };
}

/** A logo on the dark background. `scale` shrinks it, `round` clips the corners to a circle. */
function drawLogo(width, height, scale, { round = false } = {}) {
  const half = Math.min(width, height) / 2;
  const at = (px, py) => {
    const x = (px - width / 2) / half;
    const y = (py - height / 2) / half;
    if (round && Math.hypot(x, y) > 1) return [0, 0, 0, 0];
    return [...(logoColour(x / scale, y / scale) ?? INK), 255];
  };
  return encodePng(width, height, smooth(at));
}

/** A white T on nothing, which is what Android requires for a notification icon. */
function drawNotificationIcon(size) {
  const half = size / 2;
  const at = (px, py) => {
    const x = (px - half) / half / 0.9;
    const y = (py - half) / half / 0.9;
    return [255, 255, 255, inBar(x, y) || inStem(x, y) ? 255 : 0];
  };
  return encodePng(size, size, smooth(at));
}

/* ---------- Files ---------- */

const web = new URL('../public/icons/', import.meta.url);
const res = new URL('../android/app/src/main/res/', import.meta.url);
const write = (base, path, data) => writeFileSync(new URL(path, base), data);

write(web, 'icon-192.png', drawLogo(192, 192, 0.86));
write(web, 'icon-512.png', drawLogo(512, 512, 0.86));
// Android may crop a maskable icon to a circle, so keep the logo in the safe centre.
write(web, 'icon-maskable-512.png', drawLogo(512, 512, 0.74));

const DENSITIES = [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]];
for (const [density, factor] of DENSITIES) {
  const launcher = 48 * factor;
  write(res, `mipmap-${density}/ic_launcher.png`, drawLogo(launcher, launcher, 0.86));
  write(res, `mipmap-${density}/ic_launcher_round.png`, drawLogo(launcher, launcher, 0.72, { round: true }));
  const adaptive = 108 * factor; // Android shows only the middle 66 of these 108 units for certain
  write(res, `mipmap-${density}/ic_launcher_foreground.png`, drawLogo(adaptive, adaptive, 0.62));
}
for (const [density, factor] of DENSITIES) {
  write(new URL(`drawable-${density}/`, res), 'ic_stat_tensile.png', drawNotificationIcon(24 * factor));
}

// Splash images keep the sizes Android already has for them.
for (const folder of readdirSync(res).filter((name) => name.startsWith('drawable'))) {
  const path = new URL(`${folder}/splash.png`, res);
  let png;
  try {
    png = readFileSync(path);
  } catch {
    continue;
  }
  write(new URL(`${folder}/`, res), 'splash.png', drawLogo(png.readUInt32BE(16), png.readUInt32BE(20), 0.4));
}
console.log('Icons written to public/icons and android/app/src/main/res');
