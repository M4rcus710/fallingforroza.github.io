import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../src/build.js';
import { isUpcoming } from '../assets/js/lib/dates.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ffr-build-'));
const gigsFile = path.join(out, 'gigs.json');

const real = JSON.parse(fs.readFileSync(path.join(root, 'content', 'gigs.json'), 'utf8')).gigs;
fs.writeFileSync(
  gigsFile,
  JSON.stringify({
    gigs: [
      ...real,
      { id: 'next-show', date: '2026-11-14', time: '20:30', venue: 'Next Venue', city: 'Munich', tickets: 'https://example.com/t' },
      { id: 'old-show', date: '2024-05', venue: 'Old Venue', press: 'https://www.example.com/article' },
    ],
  }),
);

const todayIso = '2026-10-14';
const result = build({ root, gigsFile, out, todayIso });
const read = (file) => fs.readFileSync(path.join(out, file), 'utf8');

test('every page is written', () => {
  for (const file of ['index.html', 'upcoming/index.html', 'about/index.html', 'music/index.html', 'shop/index.html', 'imprint/index.html', 'privacy/index.html', '404.html', 'sitemap.xml', 'robots.txt']) {
    assert.ok(fs.existsSync(path.join(out, file)), file);
  }
  for (const gig of real) assert.ok(fs.existsSync(path.join(out, 'live', gig.id, 'index.html')), gig.id);
  // whatever is in the real content, plus the two shows added above
  const realUpcoming = real.filter((g) => isUpcoming(g.date, todayIso)).length;
  assert.equal(result.past, real.length - realUpcoming + 1);
  assert.equal(result.upcoming, realUpcoming + 1);
});

test('an upcoming show is on the upcoming page, with tickets and a calendar file', () => {
  const page = read('upcoming/index.html');
  assert.match(page, /Next Venue/);
  assert.match(page, /href="https:\/\/example.com\/t"/);
  assert.match(page, /data-upcoming-until="2026-11-14"/);
  assert.match(read('live/next-show/calendar.ics'), /DTSTART;TZID=Europe\/Berlin:20261114T203000/);
  // the 'nothing announced' note is there for later, but hidden
  assert.match(page, /<div class="dormant" data-empty-upcoming hidden>/);
});

test('an upcoming show is a closed bud at the top of the plant, marked to open after its day', () => {
  const home = read('index.html');
  assert.match(home, /<li class="gig" data-side="(left|right)" data-grow id="night-next-show" style="[^"]*" data-upcoming-show="2026-11-14">/);
  const row = home.slice(home.indexOf('id="night-next-show"'));
  assert.match(row, /data-bloom-to="0.06"/);
  assert.match(row, /<span data-next-label>Next up<\/span>/);
  // it is the first show on the plant: the furthest in the future comes first
  assert.ok(home.indexOf('id="night-next-show"') < home.indexOf('id="night-sommernaechte"'));
});

test('every show on the plant has its place worked out', () => {
  const home = read('index.html');
  const rows = [...home.matchAll(/<li class="gig" data-side="(left|right)" data-grow id="night-([^"]+)" style="([^"]*)"/g)];
  assert.equal(rows.length, real.length + 2);
  for (const [, , id, style] of rows) {
    for (const v of ['--y', '--sx', '--reach', '--rise', '--rw', '--roll', '--pl', '--pt', '--pw']) {
      assert.match(style, new RegExp(`${v}:-?[0-9.]+(;|$)`), `${id} has ${v}`);
    }
  }
  // no years on the plant any more
  assert.doesNotMatch(home, /year__tag/);
});

test('every show is a plain photo with its venue underneath; shows without photos just get their name', () => {
  const home = read('index.html');
  const strom = home.slice(home.indexOf('id="night-strom"'), home.indexOf('</li>', home.indexOf('id="night-strom"')));
  assert.match(strom, /<div class="gig__figure" data-cursor="open">\s*<div class="gig__photo"><img/);
  assert.match(strom, /<div class="gig__caption">[\s\S]*<h3 class="gig__venue" id="title-strom"><a href="\/live\/strom\/">Strom<\/a><\/h3>/);
  // straight, no frames: nothing in the markup turns a photo
  assert.doesNotMatch(home, /--pr:|--npr:/);
  const next = home.slice(home.indexOf('id="night-next-show"'), home.indexOf('</li>', home.indexOf('id="night-next-show"')));
  assert.match(next, /<div class="gig__figure gig__figure--text" data-cursor="open">/);
});

test('an article about a past show is linked from its page', () => {
  assert.match(read('live/old-show/index.html'), /<a href="https:\/\/www\.example\.com\/article"[^>]*>In the press: example\.com/);
});

test('past shows are in the archive and link to their pages', () => {
  const home = read('index.html');
  for (const gig of real) assert.match(home, new RegExp(`href="/live/${gig.id}/"`));
});

test('the old Framer addresses redirect to the new pages', () => {
  assert.match(read('music/page.html'), /url=\/music\//);
  assert.match(read('live/strom/page.html'), /url=\/live\/strom\//);
});

test('nothing refers to Framer any more', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(html|css|js|xml|txt)$/.test(entry.name)) files.push(full);
    }
  };
  walk(out);
  for (const file of files) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /framer/i, file);
});

test('no id is used twice, also while a show is both a bud and waiting in the archive', () => {
  for (const file of ['index.html', 'upcoming/index.html', 'live/next-show/index.html']) {
    const ids = [...read(file).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const duplicate = ids.find((id, i) => ids.indexOf(id) !== i);
    assert.equal(duplicate, undefined, `${file}: duplicate id "${duplicate}"`);
  }
});

test('what the privacy policy says stays true: no cookies, nothing from other servers, only "theme" stored', () => {
  // code that runs in the browser: the site's scripts and the inline ones in the pages
  const scripts = fs.readdirSync(path.join(root, 'assets/js'), { recursive: true }).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(root, 'assets/js', f), 'utf8'));
  const pages = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) pages.push(fs.readFileSync(full, 'utf8'));
    }
  };
  walk(out);
  const browserCode = [...scripts, ...pages.flatMap((p) => [...p.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]))].join('\n');
  assert.doesNotMatch(browserCode, /document\.cookie|sessionStorage|indexedDB/);
  const keys = [...browserCode.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(\s*'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(keys)], ['theme']);

  // nothing a page loads by itself comes from another server (links are fine)
  const css = fs.readFileSync(path.join(root, 'assets/css/site.css'), 'utf8');
  assert.doesNotMatch(css, /url\(\s*['"]?(https?:)?\/\/|@import/);
  for (const page of pages) {
    const loads = [...page.matchAll(/<(?:img|script|iframe|source|video|audio|embed)\b[^>]*\s(?:src|srcset)="([^"]+)"|<link\b[^>]*\shref="([^"]+)"[^>]*>/g)]
      .filter((m) => !/rel="canonical"|rel="alternate"/.test(m[0]))
      .map((m) => m[1] || m[2]);
    for (const url of loads) assert.ok(!/^(https?:)?\/\//.test(url), `a page loads ${url}`);
  }
});
