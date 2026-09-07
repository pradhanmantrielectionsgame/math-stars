/**
 * Writes icons/icon-192.png and icon-512.png: a gold star with a plus knocked
 * out of it, on the game's blue.
 *   node scripts/make-icons.mjs
 *
 * A grid of + - x / reads as a calculator at a glance, which this isn't. One
 * bold silhouette carries further at home-screen size anyway, and the plus is
 * there to say the star is a maths star.
 *
 * ponytail: hand-rolled zlib PNG and a per-pixel painter, no image dependency
 * and no build step. Shapes are predicates and one polygon test. Anything
 * fancier wants real artwork dropped over these files instead.
 */
import {deflateSync} from 'node:zlib';
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

// The palette the game already uses: answer-button blue behind, star gold.
const TOP = rgb('#3f9bff'), BOTTOM = rgb('#0057c8'), STAR = rgb('#ffcc00');

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
 * Ten points of a five-pointed star, outer and inner radius alternating.
 * The outer radius stays inside the maskable safe zone (a centred circle of
 * radius .4), so Android's round crop doesn't lop the points off.
 */
const STAR_POINTS = Array.from({length: 10}, (_, i) => {
  const r = i % 2 ? .41 * .382 : .41;                  // .382 gives the classic star
  const a = -Math.PI / 2 + (i * Math.PI) / 5;          // start at the top point
  return [.5 + r * Math.cos(a), .5 + r * Math.sin(a)];
});

/**
 * Ray-cast point-in-polygon. Coordinates are 0..1 over the tile, so one
 * predicate serves every size.
 * @param {number} x
 * @param {number} y
 * @param {[number, number][]} poly
 */
function inside(x, y, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/**
 * The plus cut out of the star, nudged a touch below centre — a five-pointed
 * star carries its visual mass low, so a geometrically centred plus reads high.
 */
const inPlus = (x, y) => {
  const dx = x - .5, dy = y - .515, L = .098, T = .036;
  return (Math.abs(dx) <= L && Math.abs(dy) <= T) || (Math.abs(dy) <= L && Math.abs(dx) <= T);
};

const isStar = (x, y) => inside(x, y, STAR_POINTS) && !inPlus(x, y);

const SAMPLES = 3;                                    // per axis, so 9 per pixel

function png(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;                      // 8-bit, truecolour RGB

  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(size * 3 + 1);      // leading 0 = no per-row filter
    const t = py / size;                         // vertical gradient on the ground
    const bg = TOP.map((c, i) => c + (BOTTOM[i] - c) * t);
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy++)
        for (let sx = 0; sx < SAMPLES; sx++)
          if (isStar((px + (sx + .5) / SAMPLES) / size, (py + (sy + .5) / SAMPLES) / size)) hits++;
      const ink = hits / (SAMPLES * SAMPLES);    // coverage, for a soft edge
      const at = 1 + px * 3;
      for (let c = 0; c < 3; c++) row[at + c] = Math.round(bg[c] * (1 - ink) + STAR[c] * ink);
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
  writeFileSync(join(ROOT, 'icons', `icon-${size}.png`), png(size));
}
console.log('icons written');
