// Gets the photos in content/gigs.json ready for the web, in place: turned
// the right way up, at most 1600 px on their longest side, colours in sRGB,
// camera and location data removed, and a copy at 800 px next to each one
// (cover.jpg → cover-800.jpg; the build picks it up for small screens).
// Photos that are already prepared (by this script or optimize-image.sh) are
// left alone.
//
// The publishing workflow (.github/workflows/deploy.yml) runs it before every
// build, so photos uploaded straight from a phone work. It needs sharp, which
// isn't otherwise part of the site:
//
//   npm install --no-save --no-package-lock sharp@0.34.3
//   node scripts/prepare-photos.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LARGE = 1600;
const SMALL = 800;

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('prepare-photos needs sharp: npm install --no-save --no-package-lock sharp@0.34.3');
  process.exit(1);
}

/** Where a photo is, the same way src/lib/content.js reads it. */
function photoPath(gigId, file) {
  const relative = file.startsWith('/') ? file.slice(1) : file.includes('/') ? file : `assets/gigs/${gigId}/${file}`;
  return path.join(root, relative);
}

function encode(image, ext) {
  if (ext === '.png') return image.png({ compressionLevel: 9 });
  if (ext === '.webp') return image.webp({ quality: 80 });
  if (ext === '.avif') return image.avif({ quality: 60 });
  return image.jpeg({ quality: 82, mozjpeg: true });
}

const { gigs } = JSON.parse(fs.readFileSync(path.join(root, 'content', 'gigs.json'), 'utf8'));
let prepared = 0;
for (const gig of gigs) {
  for (const photo of gig.photos || []) {
    const file = photoPath(gig.id, photo.file);
    const ext = path.extname(file).toLowerCase();
    // missing files and formats browsers can't show are reported by the build
    if (!fs.existsSync(file) || !['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext)) continue;
    const small = path.join(path.dirname(file), `${path.basename(file, path.extname(file))}-800${path.extname(file)}`);

    const source = fs.readFileSync(file);
    const meta = await sharp(source).metadata();
    const turned = (meta.orientation || 1) > 4; // 5–8: stored sideways
    const longest = Math.max(meta.width, meta.height);
    const done = fs.existsSync(small) && longest <= LARGE && (meta.orientation || 1) === 1 && !meta.exif;
    if (done) continue;

    // .rotate() with no angle turns it the way the camera meant; metadata is
    // left out of the output unless asked for
    const resized = (size) => sharp(source).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }).toColorspace('srgb');
    const large = await encode(resized(LARGE), ext).toBuffer();
    fs.writeFileSync(small, await encode(resized(SMALL), ext).toBuffer());
    fs.writeFileSync(file, large);
    const out = await sharp(large).metadata();
    console.log(`prepared ${path.relative(root, file)}: ${meta.width}×${meta.height}${turned ? ' (turned upright)' : ''} → ${out.width}×${out.height}, and an 800 px copy`);
    prepared++;
  }
}
console.log(prepared ? `${prepared} photo(s) prepared.` : 'All photos were ready.');
