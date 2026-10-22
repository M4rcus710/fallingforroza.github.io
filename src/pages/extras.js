// The 404 page, redirects for old addresses, sitemap and robots.txt.

import { html, raw } from '../lib/html.js';
import { roseSvg } from '../../assets/js/lib/rose.js';

export function notFoundPage() {
  // site.js swaps this bud for the rose the missing address would have grown
  const main = html`
    <section class="lost">
      <div class="lost__rose stemmed" data-rose data-lost-rose>${raw(roseSvg('nothing grew here', { className: 'rose', open: 0.1 }))}</div>
      <h1 class="lost__title">Nothing grew here.</h1>
      <p class="lost__text">This page doesn’t exist. <a href="/">Back to the shows</a></p>
    </section>`;
  return {
    path: '/404.html',
    nav: null,
    bodyClass: 'page-lost',
    title: 'Not found',
    description: 'This page doesn’t exist.',
    main,
  };
}

/** Old Framer addresses that still worked directly (…/page.html), mapped to the new pages. */
export function legacyRedirects(pastIds) {
  const map = {
    'music/page.html': '/music/',
    'imprint/page.html': '/imprint/',
    'live/page.html': '/',
    'live/index.html': '/',
  };
  for (const id of pastIds) map[`live/${id}/page.html`] = `/live/${id}/`;
  return map;
}

export function redirectPage(to, siteUrl) {
  const target = new URL(to, siteUrl).href;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Moved – Falling For Roza</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="${target}">
  <meta http-equiv="refresh" content="0; url=${to}">
</head>
<body>
  <p>This page has moved: <a href="${to}">${target}</a></p>
</body>
</html>
`;
}

export function sitemap(paths, siteUrl) {
  const urls = paths.map((p) => `  <url><loc>${new URL(p, siteUrl).href}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export const robots = (siteUrl) => `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', siteUrl).href}\n`;
