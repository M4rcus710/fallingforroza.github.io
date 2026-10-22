// Reads the pixel size of WebP, JPEG, PNG and AVIF files from their headers,
// so every <img> gets width/height attributes (no layout jumps while loading).

import fs from 'node:fs';

function webpSize(b) {
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') {
    return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  }
  return null;
}

function jpegSize(b) {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    const length = b.readUInt16BE(i + 2);
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}

function pngSize(b) {
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function avifSize(b) {
  const at = b.indexOf('ispe');
  if (at < 0) return null;
  return { width: b.readUInt32BE(at + 8), height: b.readUInt32BE(at + 12) };
}

export function imageSize(file) {
  const b = fs.readFileSync(file);
  let size = null;
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') size = webpSize(b);
  else if (b[0] === 0xff && b[1] === 0xd8) size = jpegSize(b);
  else if (b.toString('ascii', 1, 4) === 'PNG') size = pngSize(b);
  else if (b.toString('ascii', 4, 12).startsWith('ftypavi')) size = avifSize(b);
  if (!size || !size.width || !size.height) throw new Error(`Can't read the size of ${file}`);
  return size;
}
