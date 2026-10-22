import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from '../src/lib/content.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ffr-content-'));

function load(gigs, todayIso = '2026-10-14') {
  const file = path.join(tmp, `gigs-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, typeof gigs === 'string' ? gigs : JSON.stringify({ gigs }));
  return loadContent(root, { todayIso, gigsFile: file });
}

test('the real content/gigs.json is valid', () => {
  const content = loadContent(root, { todayIso: '2026-10-14' });
  assert.ok(content.gigs.length > 0);
  for (const gig of content.gigs) {
    for (const photo of gig.photos) {
      assert.ok(photo.width > 0 && photo.height > 0, `${gig.id}: ${photo.src} has a size`);
      assert.ok(photo.alt, `${gig.id}: ${photo.src} has alt text`);
    }
  }
});

test('a minimal show only needs id, date and venue', () => {
  const { gigs, upcoming } = load([{ id: 'feierwerk', date: '2026-11-14', venue: 'Feierwerk' }]);
  assert.equal(gigs[0].url, '/live/feierwerk/');
  assert.equal(gigs[0].cover, null);
  assert.equal(upcoming.length, 1);
});

test('past shows are numbered in the order they happened', () => {
  const { past } = load([
    { id: 'one', date: '2025', venue: 'A' },
    { id: 'two', date: '2025', venue: 'B' },
    { id: 'three', date: '2026-02-01', venue: 'C' },
    { id: 'soon', date: '2026-12-01', venue: 'D' },
  ]);
  assert.deepEqual(
    past.map((g) => [g.id, g.number]),
    [['three', 3], ['two', 2], ['one', 1]],
  );
});

test('mistakes are reported all at once, in plain words', () => {
  assert.throws(
    () =>
      load([
        { id: 'Bad Id', date: '2026-11-14', venue: 'X' },
        { id: 'dup', date: '2026-02-30', venue: 'X' },
        { id: 'dup', date: '2026-11-14' },
        { id: 'typo', date: '2026-11-14', venue: 'X', ticket: 'https://example.com' },
        { id: 'pics', date: '2025', venue: 'X', photos: [{ file: 'nope.webp', alt: 'x' }] },
        { id: 'url', date: '2026-11-14', venue: 'X', tickets: 'example.com' },
        { id: 'article', date: '2025', venue: 'X', press: 'merkur.de/article' },
        { id: 'clock', date: '2026-11-14', venue: 'X', time: '8pm' },
      ]),
    (error) => {
      assert.match(error.message, /9 problem\(s\)/);
      assert.match(error.message, /"press" should be a full web address/);
      assert.match(error.message, /"id" must be lowercase letters/);
      assert.match(error.message, /February 2026 has 28 days/);
      assert.match(error.message, /the id "dup" is used twice/);
      assert.match(error.message, /"venue" is missing/);
      assert.match(error.message, /unknown field "ticket"/);
      assert.match(error.message, /assets\/gigs\/pics\/nope.webp doesn't exist/);
      assert.match(error.message, /should be a full web address/);
      assert.match(error.message, /should look like 20:30/);
      return true;
    },
  );
});

test('broken JSON says roughly where', () => {
  assert.throws(() => load('{ "gigs": [ { "id": "x", } ] }'), /isn't valid JSON \(around line 1\)/);
});

test('a vague date on an upcoming show gives a warning, not an error', () => {
  const { warnings } = load([{ id: 'vague', date: '2026-12', venue: 'X' }]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /should have an exact date/);
});

test('the editor (.pages.yml) knows every field of a show, so saving there loses nothing', async () => {
  const { GIG_FIELDS } = await import('../src/lib/content.js');
  const config = fs.readFileSync(new URL('../.pages.yml', import.meta.url), 'utf8');
  const names = new Set([...config.matchAll(/^\s*- name: ([\w-]+)/gm)].map((m) => m[1]));
  // placeholders are for hand-made stand-ins; the editor never makes them
  for (const field of GIG_FIELDS.filter((f) => f !== 'placeholder')) assert.ok(names.has(field), `.pages.yml has no field "${field}"`);
  for (const field of ['file', 'alt']) assert.ok(names.has(field), `.pages.yml has no photo field "${field}"`);
  // and the file itself holds nothing else
  const data = JSON.parse(fs.readFileSync(new URL('../content/gigs.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(data), ['gigs'], 'gigs.json may only hold "gigs" (the editor drops anything else)');
});

test('a photo can be a full path (as the editor writes it) or a file name in the show’s folder', () => {
  const { gigs } = load([
    { id: 'full', date: '2025', venue: 'X', photos: [{ file: '/assets/gigs/strom/cover.webp', alt: 'x' }] },
    { id: 'strom', date: '2025', venue: 'Y', photos: [{ file: 'cover.webp', alt: 'y' }] },
  ]);
  for (const gig of gigs) {
    assert.equal(gig.cover.src, '/assets/gigs/strom/cover.webp');
    assert.match(gig.cover.srcset, /^\/assets\/gigs\/strom\/cover-800\.webp \d+w, \/assets\/gigs\/strom\/cover\.webp \d+w$/);
  }
});

test('photos must be in assets/ and in a format browsers can show', () => {
  assert.throws(
    () =>
      load([
        { id: 'heic', date: '2025', venue: 'X', photos: [{ file: '/assets/gigs/IMG_1.HEIC', alt: 'x' }] },
        { id: 'outside', date: '2025', venue: 'X', photos: [{ file: '/content/gigs.json', alt: 'x' }] },
        { id: 'climb', date: '2025', venue: 'X', photos: [{ file: '/assets/../package.json', alt: 'x' }] },
      ]),
    (error) => {
      assert.match(error.message, /3 problem\(s\)/);
      assert.match(error.message, /IMG_1\.HEIC: use a JPG, PNG or WebP/);
      assert.match(error.message, /\/content\/gigs\.json must be in assets\//);
      assert.match(error.message, /\/assets\/\.\.\/package\.json must be in assets\//);
      return true;
    },
  );
});
