/**
 * Writes icons/icon-192.png and icon-512.png: the four operators in white on
 * the game's colour.
 *   node scripts/make-icons.mjs [#rrggbb]
 *
 * ponytail: hand-rolled zlib PNG and a per-pixel painter, no image dependency
 * and no build step. Shapes are predicates, not paths — fine for four glyphs
 * made of bars and dots. Anything with a curve wants real artwork instead.
 */
import {deflateSync} from 'node:zlib';
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const hex = process.argv[2]
  || JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8')).theme_color
  || '#007aff';
const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

const crcTable = Array.from({length: 256}, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/**
 * Is (x, y) inside one of the four operator glyphs? Coordinates are 0..1 over
 * the whole tile, so the same predicate serves every size.
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function inGlyph(x, y) {
  const L = .105, T = .032, GAP = .062, DOT = .036;   // arm length, bar thickness
  const bar = (dx, dy) => Math.abs(dx) <= L && Math.abs(dy) <= T;
  const dot = (dx, dy) => Math.hypot(dx, dy) <= DOT;
  const SQ = Math.SQRT1_2;

  for (const [cx, cy, op] of [[.29, .29, '+'], [.71, .29, '-'], [.29, .71, '*'], [.71, .71, '/']]) {
    const dx = x - cx, dy = y - cy;
    if (Math.abs(dx) > .2 || Math.abs(dy) > .2) continue;
    if (op === '+' && (bar(dx, dy) || bar(dy, dx))) return true;
    if (op === '-' && bar(dx, dy)) return true;
    if (op === '*') {                                 // the same cross, turned 45°
      const u = (dx + dy) * SQ, v = (dx - dy) * SQ;
      if (bar(u, v) || bar(v, u)) return true;
    }
    if (op === '/' && (bar(dx, dy) || dot(dx, dy - GAP) || dot(dx, dy + GAP))) return true;
  }
  return false;
}

const SAMPLES = 3;                                    // per axis, so 9 per pixel

function png(size, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;                      // 8-bit, truecolour RGB

  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(size * 3 + 1);      // leading 0 = no per-row filter
    // A little vertical shading, so the tile isn't a dead flat square.
    const shade = 1 - .16 * (py / size);
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy++)
        for (let sx = 0; sx < SAMPLES; sx++)
          if (inGlyph((px + (sx + .5) / SAMPLES) / size, (py + (sy + .5) / SAMPLES) / size)) hits++;
      const ink = hits / (SAMPLES * SAMPLES);    // coverage, for a soft edge
      const at = 1 + px * 3;
      row[at]     = Math.round(r * shade * (1 - ink) + 255 * ink);
      row[at + 1] = Math.round(g * shade * (1 - ink) + 255 * ink);
      row[at + 2] = Math.round(b * shade * (1 - ink) + 255 * ink);
    }
    rows.push(row);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(join(ROOT, 'icons'), {recursive: true});
for (const size of [192, 512]) {
  writeFileSync(join(ROOT, 'icons', `icon-${size}.png`), png(size, rgb));
}
console.log(`icons written in ${hex}`);
