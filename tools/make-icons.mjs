// Draws the app icons (a stretched loop band on band yellow) with no image
// libraries. Run with: npm run icons

import { writeFileSync } from 'node:fs';
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

function encodePng(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = pixel(x, y);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      offset += 3;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const YELLOW = [0xf5, 0xc5, 0x18];
const INK = [0x10, 0x14, 0x1f];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** Distance to the outline of a capsule: a loop band pulled sideways. */
function ringDistance(px, py, halfLength, radius) {
  const dx = Math.max(Math.abs(px) - halfLength, 0);
  return Math.abs(Math.hypot(dx, py) - radius);
}

function drawIcon(size, scale) {
  const half = size / 2;
  return encodePng(size, (x, y) => {
    const px = ((x + 0.5 - half) / half) / scale;
    const py = ((y + 0.5 - half) / half) / scale;
    const distance = ringDistance(px, py, 0.34, 0.3) - 0.11;
    const edge = (1 / half) / scale;
    const coverage = Math.min(1, Math.max(0, 0.5 - distance / edge));
    return mix(YELLOW, INK, coverage);
  });
}

const out = new URL('../public/icons/', import.meta.url);
writeFileSync(new URL('icon-192.png', out), drawIcon(192, 1));
writeFileSync(new URL('icon-512.png', out), drawIcon(512, 1));
// Android may crop a maskable icon to a circle, so keep the band in the safe centre.
writeFileSync(new URL('icon-maskable-512.png', out), drawIcon(512, 0.74));
console.log('Icons written to public/icons');
