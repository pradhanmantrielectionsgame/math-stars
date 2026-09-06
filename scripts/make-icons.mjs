/**
 * Writes icons/icon-192.png and icon-512.png as a flat colour.
 *   node scripts/make-icons.mjs [#rrggbb]
 *
 * ponytail: a flat tile placeholder, ~30 lines of zlib, no image dependency.
 * Drop real artwork over these files the moment the game has an identity —
 * nothing reads the colour back.
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

function png(size, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;                      // 8-bit, truecolour RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({length: size}, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({length: size}, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(join(ROOT, 'icons'), {recursive: true});
for (const size of [192, 512]) {
  writeFileSync(join(ROOT, 'icons', `icon-${size}.png`), png(size, rgb));
}
console.log(`icons written in ${hex}`);
