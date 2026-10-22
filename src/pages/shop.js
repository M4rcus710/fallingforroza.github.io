// The shop isn't open yet: a closed bud, like a show that hasn't happened.

import { html, raw } from '../lib/html.js';
import { roseSvg } from '../../assets/js/lib/rose.js';

export function shopPage({ site }) {
  const instagram = site.socials.find((s) => s.name === 'Instagram');
  const main = html`
    <header class="pagehead">
      <h1 class="pagehead__title">Shop</h1>
    </header>
    <section class="dormant" aria-label="Shop">
      <div class="dormant__bud stemmed">${raw(roseSvg('shop', { className: 'rose', open: 0 }))}</div>
      <p class="dormant__text">The shop is in the making.</p>
      <p class="dormant__more">Check back soon${instagram ? html` · <a href="${instagram.url}" rel="noopener" target="_blank">Instagram<span class="visually-hidden"> (opens in a new tab)</span></a>` : ''}</p>
    </section>`;

  return {
    path: '/shop/',
    nav: 'shop',
    bodyClass: 'page-shop',
    title: 'Shop',
    description: 'The Falling For Roza shop is in the making. Check back soon.',
    main,
  };
}
