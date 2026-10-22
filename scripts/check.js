// Checks the built site before it goes online:
//   - every link and image inside the site points to something that exists
//   - every page has a language, a title, a description, one <h1>, alt texts
//   - nothing refers to Framer any more
//   - no show in content/gigs.json is still a placeholder
//
//   npm run check            checks this folder (run `npm run build` first)
//   node scripts/check.js <dir>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const SKIP = new Set(['node_modules', '.git', 'src', 'test', 'scripts', 'content', 'originals']);
const problems = [];
const problem = (file, msg) => problems.push(`${path.relative(root, file)}: ${msg}`);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

/** Does an address inside the site exist, the way GitHub Pages would resolve it? */
function exists(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const target = path.join(root, clean);
  if (!target.startsWith(root)) return false;
  if (clean.endsWith('/')) return fs.existsSync(path.join(target, 'index.html'));
  if (fs.existsSync(target)) return fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.html'));
  return false;
}

const files = walk(root);
const pages = files.filter((f) => f.endsWith('.html'));

for (const file of files) {
  if (!/\.(html|css|js|svg|xml|txt|json|ics)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (/framer/i.test(text)) problem(file, 'still mentions Framer');
}

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const isRedirect = /http-equiv="refresh"/.test(html);

  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(https?:|mailto:|tel:|data:|#)/.test(url)) continue;
    const absolute = url.startsWith('/') ? url : path.posix.join('/', path.relative(root, path.dirname(file)), url);
    if (!exists(absolute)) problem(file, `broken link or file: ${url}`);
  }
  for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (!exists(url)) problem(file, `broken srcset entry: ${url}`);
    }
  }
  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    if (match[1] !== 'main' && match[1] !== 'contact' && !html.includes(`id="${match[1]}"`)) problem(file, `link to missing #${match[1]}`);
  }

  if (isRedirect) continue;
  if (!/<html lang="[a-z]{2}">/.test(html)) problem(file, 'no lang on <html>');
  if (!/<title>[^<]+<\/title>/.test(html)) problem(file, 'no <title>');
  if (!/<meta name="description" content="[^"]{20,}">/.test(html)) problem(file, 'no useful meta description');
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) problem(file, `${h1s} <h1> elements (should be exactly one)`);
  for (const img of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(img[0])) problem(file, `image without alt: ${img[0].slice(0, 80)}`);
    if (!/\swidth="\d+"/.test(img[0]) || !/\sheight="\d+"/.test(img[0])) problem(file, `image without width/height: ${img[0].slice(0, 80)}`);
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const duplicate = ids.find((id, i) => ids.indexOf(id) !== i);
  if (duplicate) problem(file, `duplicate id "${duplicate}"`);
}

const sitemap = fs.existsSync(path.join(root, 'sitemap.xml')) ? fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8') : '';
for (const match of sitemap.matchAll(/<loc>https:\/\/[^/]+(\/[^<]*)<\/loc>/g)) {
  if (!exists(match[1])) problem(path.join(root, 'sitemap.xml'), `lists a page that doesn't exist: ${match[1]}`);
}

// (the content, not the built site: that may be checked in another folder)
const gigsFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content', 'gigs.json');
if (fs.existsSync(gigsFile)) {
  for (const gig of JSON.parse(fs.readFileSync(gigsFile, 'utf8')).gigs || []) {
    if (gig.placeholder) problem(gigsFile, `"${gig.id}" is still a placeholder: fill in the real show and remove "placeholder": true, or delete it`);
  }
}

if (problems.length) {
  console.error(`${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`Checked ${pages.length} pages and ${files.length} files: all good.`);
