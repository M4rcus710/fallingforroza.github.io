// The frame around every page: <head>, masthead with navigation, and the
// footer ("the roots": contact, socials, imprint, privacy, copyright).

import { html, raw } from '../lib/html.js';

const NAV = [
  { href: '/', label: 'Live', key: 'live' },
  { href: '/upcoming/', label: 'Upcoming', key: 'upcoming' },
  { href: '/music/', label: 'Music', key: 'music' },
  { href: '/shop/', label: 'Shop', key: 'shop' },
  { href: '/about/', label: 'About', key: 'about' },
];

/** The band's wordmark (the traced logo), drawn by CSS from assets/img/wordmark.svg. */
export const wordmark = (className = '') =>
  html`<span class="wordmark ${className}" role="img" aria-label="Falling For Roza"></span>`;

/** The band's stencil rose emblem. */
export const emblem = (className = '') => html`<span class="emblem ${className}" aria-hidden="true"></span>`;

function masthead({ current, upcomingDates, isHome }) {
  const items = NAV.map((item) => {
    const isCurrent = item.key === current;
    // the badge counts down by itself as shows pass (assets/js/site.js)
    const count =
      item.key === 'upcoming'
        ? html`<span class="nav__count" data-upcoming-dates="${upcomingDates.join(' ')}" ${upcomingDates.length ? '' : raw('hidden')}><span class="visually-hidden">: </span><span data-upcoming-count>${upcomingDates.length}</span><span class="visually-hidden"> announced</span></span>`
        : '';
    return html`<li><a class="nav__link" href="${item.href}" ${isCurrent ? raw('aria-current="page"') : ''}>${item.label}${count}</a></li>`;
  });
  return html`
  <header class="masthead">
    <a class="masthead__home" href="/">${emblem('masthead__emblem')}${isHome ? '' : wordmark('masthead__wordmark')}<span class="visually-hidden">Falling For Roza – home</span></a>
    <nav class="nav" aria-label="Main">
      <ul class="nav__list">${items}<li><a class="nav__link" href="#contact">Contact</a></li></ul>
    </nav>
    <button class="theme-toggle" type="button" aria-pressed="false" data-theme-toggle hidden><span class="theme-toggle__icon" aria-hidden="true"></span><span class="visually-hidden">Dark mode</span></button>
  </header>`;
}

/**
 * Roots, drawn once: faint lines that spread out from the stalk, and on the
 * homepage the stalk itself going on into the ground, fading as it goes
 * (drawn last, over the start of the roots).
 */
const rootsDrawing = raw(`<svg class="roots__drawing" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
  <defs><linearGradient id="trunk-fade" x1="0" y1="0" x2="0" y2="72" gradientUnits="userSpaceOnUse"><stop class="roots__stop" offset="0.15"/><stop class="roots__stop roots__stop--end" offset="1"/></linearGradient></defs>
  <path d="M600 0 C600 40 598 70 590 96 C578 136 520 160 452 176 C392 190 330 214 268 220"/>
  <path d="M600 0 C602 46 612 82 636 108 C672 146 744 156 812 170 C880 184 948 206 1010 220"/>
  <path d="M594 70 C560 96 470 104 400 120 C330 136 250 150 170 196"/>
  <path d="M604 60 C640 90 720 96 800 104 C880 112 980 126 1080 168"/>
  <path d="M590 96 C588 140 572 180 556 220"/>
  <path d="M452 176 C430 194 410 206 380 220"/><path d="M812 170 C836 186 852 200 870 220"/>
  <path d="M400 120 C372 140 344 172 330 220"/><path d="M800 104 C832 128 870 168 890 200"/>
  <path class="roots__trunk" d="M600 0 C600 26 599 46 595 72"/>
</svg>`);

function footer({ site, year }) {
  const socials = site.socials.map(
    (s) => html`<li><a href="${s.url}" rel="noopener" target="_blank">${s.name}<span class="visually-hidden"> (opens in a new tab)</span></a></li>`,
  );
  return html`
  <footer class="roots" id="contact">
    ${rootsDrawing}
    <div class="roots__inner">
      <p class="roots__title">Let’s fall together.</p>
      <p class="roots__mail"><a href="mailto:${site.email}">${site.email}</a></p>
      <ul class="roots__socials" aria-label="Falling For Roza elsewhere">${socials}</ul>
      <p class="roots__legal">© <span data-year>${year}</span> Falling For Roza · <a href="/imprint/">Imprint</a> · <a href="/privacy/">Privacy</a></p>
    </div>
  </footer>`;
}

// Runs before the first paint, so the page never flashes the wrong colours:
// a light or dark mode the visitor picked with the switch (assets/js/site.js).
// Without a choice, the system setting decides (site.css).
const THEME_SCRIPT = `<script>try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}</script>`;

// Runs before the first paint: the plant starts ungrown so it can grow while
// you scroll. If the main script doesn't arrive, everything is shown after all.
const GROW_SCRIPT = `<script>if(!matchMedia('(prefers-reduced-motion: reduce)').matches){var r=document.documentElement;r.classList.add('grow');setTimeout(function(){if(!r.classList.contains('grow-ready'))r.classList.remove('grow')},3000)}</script>`;

/**
 * site.js imports ./lib/rose.js and ./lib/dates.js. Browsers cache those
 * (GitHub Pages: ten minutes), so right after an update a page could get the
 * new site.js with an old rose.js. The import map loads them with the same
 * version as everything else on the page.
 */
const importMap = (version) =>
  `<script type="importmap">${JSON.stringify({
    imports: {
      '/assets/js/lib/dates.js': `/assets/js/lib/dates.js?v=${version}`,
      '/assets/js/lib/rose.js': `/assets/js/lib/rose.js?v=${version}`,
    },
  })}</script>`;

export function layout(page, ctx) {
  const { site, assetVersion, year, upcomingDates } = ctx;
  const url = new URL(page.path, site.url).href;
  const title = page.title ? `${page.title} – Falling For Roza` : 'Falling For Roza';
  const image = new URL(page.image || '/assets/img/og.jpg', site.url).href;
  const description = page.description || site.description;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${html`${title}`}</title>
  <meta name="description" content="${html`${description}`}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="${page.ogType || 'website'}">
  <meta property="og:site_name" content="Falling For Roza">
  <meta property="og:title" content="${html`${page.title || 'Falling For Roza'}`}">
  <meta property="og:description" content="${html`${description}`}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#efe8dc" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#221e1a" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/img/icon-light.png" type="image/png" media="(prefers-color-scheme: light)">
  <link rel="icon" href="/assets/img/icon-dark.png" type="image/png" media="(prefers-color-scheme: dark)">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="preload" href="/assets/fonts/ibm-plex-mono-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/ibm-plex-mono-500.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/forum-400.woff2" as="font" type="font/woff2" crossorigin>
  ${THEME_SCRIPT}
  <link rel="stylesheet" href="/assets/css/site.css?v=${assetVersion}">
  ${GROW_SCRIPT}
  ${importMap(assetVersion)}
  <link rel="modulepreload" href="/assets/js/lib/dates.js?v=${assetVersion}">
  <link rel="modulepreload" href="/assets/js/lib/rose.js?v=${assetVersion}">
  <script type="module" src="/assets/js/site.js?v=${assetVersion}"></script>${page.head ? `\n  ${page.head}` : ''}
</head>
<body class="${page.bodyClass || ''}">
  <a class="skip-link" href="#main">Skip to content</a>${masthead({ current: page.nav, upcomingDates, isHome: page.path === '/' })}
  <main id="main" tabindex="-1">${page.main}
  </main>${footer({ site, year })}
</body>
</html>
`;
}
