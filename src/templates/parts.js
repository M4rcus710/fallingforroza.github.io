// Small pieces used on several pages.

import { html, raw } from '../lib/html.js';
import { roseSvg } from '../../assets/js/lib/rose.js';
import { formatShowDate, dateParts, parseShowDate } from '../../assets/js/lib/dates.js';

/** How open a show's rose is: a bud before the show, its own full bloom after it. */
export const BUD = 0.06;
export const BLOOM = 1;

/** A responsive <img> for a gig photo. */
export function photo(p, { sizes = '100vw', className = '', eager = false } = {}) {
  return html`<img ${className ? raw(`class="${className}"`) : ''} src="${p.src}" ${p.srcset ? raw(`srcset="${p.srcset}" sizes="${sizes}"`) : ''} width="${p.width}" height="${p.height}" alt="${p.alt}" ${eager ? raw('fetchpriority="high"') : raw('loading="lazy"')} decoding="async">`;
}

/**
 * The rose of a show, as inline SVG. `transition` gives it a
 * view-transition-name, so it can move from page to page.
 */
export function rose(gig, { className = 'rose', open = gig.isUpcoming ? BUD : BLOOM, transition = false } = {}) {
  const attrs = transition ? `style="view-transition-name:rose-${gig.id}"` : '';
  return raw(roseSvg(gig.seed, { className, open, attrs }));
}

/**
 * The date of a show inside its year (the year tag on the stalk says the
 * year): "Sat 14 November", "July", or nothing when only the year is known.
 */
export function dayInYear(gig) {
  const d = dateParts(gig.date);
  if (d.precision === 'year') return '';
  const text = formatShowDate(gig.date, 'long').replace(/ \d{4}$/, '');
  return html`<time datetime="${gig.date}">${text}</time>`;
}

/** <time> with a machine-readable date. */
export function showTime(gig, style = 'short') {
  return html`<time datetime="${gig.parsedDate.value}">${formatShowDate(gig.date, style)}</time>`;
}

/** Where, in one line: "Munich · Emergenza semifinal". */
export function where(gig) {
  return [gig.city, gig.event].filter(Boolean).join(' · ');
}

/** The date of an upcoming show, written out. */
export function dateLine(gig) {
  const d = dateParts(gig.date);
  if (d.precision !== 'day') return html`<time datetime="${gig.date}">${formatShowDate(gig.date, 'long')}</time>`;
  return html`<time datetime="${gig.date}${gig.time ? `T${gig.time}` : ''}">${formatShowDate(gig.date, 'long')}${gig.time ? `, ${gig.time}` : ''}</time>`;
}

/** The last day a show counts as upcoming, for the script that turns buds into roses. */
export const lastDay = (gig) => parseShowDate(gig.date).last;

/** schema.org data for a show, so search engines can list it as an event. */
export function eventJsonLd(gig, site) {
  const start = gig.time ? `${gig.date}T${gig.time}` : gig.date;
  return {
    '@type': 'MusicEvent',
    name: `Falling For Roza${gig.event ? ` – ${gig.event}` : ''} at ${gig.venue}`,
    startDate: start,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: gig.venue, address: gig.city || undefined },
    performer: { '@type': 'MusicGroup', name: 'Falling For Roza', url: site.url },
    url: new URL(gig.url, site.url).href,
    image: gig.cover ? new URL(gig.cover.src, site.url).href : undefined,
    offers: gig.tickets ? { '@type': 'Offer', url: gig.tickets } : undefined,
  };
}

export const jsonLdScript = (data) =>
  `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c')}</script>`;
