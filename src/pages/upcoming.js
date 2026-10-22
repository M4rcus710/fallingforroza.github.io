// Upcoming shows: buds that haven't opened yet. Each one disappears from here
// (and blooms into the archive) the day after the show, even without a rebuild.

import { html, raw } from '../lib/html.js';
import { rose, dateLine, where, lastDay, eventJsonLd, jsonLdScript, BUD } from '../templates/parts.js';
import { roseSvg } from '../../assets/js/lib/rose.js';
import { countdown } from '../../assets/js/lib/dates.js';

function show(gig, todayIso) {
  return html`
      <li class="show" data-upcoming-until="${lastDay(gig)}">
        <a class="show__rose stemmed" href="${gig.url}" tabindex="-1" aria-hidden="true">${rose(gig, { open: BUD, transition: true })}</a>
        <div class="show__body">
          <p class="show__when">${dateLine(gig)} · <span data-countdown="${gig.date}">${countdown(gig.date, todayIso)}</span></p>
          <h2 class="show__venue"><a href="${gig.url}">${gig.venue}</a></h2>
          ${where(gig) ? html`<p class="show__where">${where(gig)}</p>` : ''}
          ${gig.info ? html`<p class="show__info">${gig.info}</p>` : ''}
          <div class="actions">
            ${gig.tickets ? html`<a class="button button--strong" href="${gig.tickets}" rel="noopener" target="_blank">Tickets<span class="visually-hidden"> for ${gig.venue} (opens in a new tab)</span></a>` : ''}
            ${gig.link ? html`<a class="button" href="${gig.link}" rel="noopener" target="_blank">Event page<span class="visually-hidden"> (opens in a new tab)</span></a>` : ''}
            <a class="button" href="${gig.url}calendar.ics" download="falling-for-roza-${gig.id}.ics">Add to calendar<span class="visually-hidden">: ${gig.venue}</span></a>
          </div>
        </div>
      </li>`;
}

export function upcomingPage({ site, upcoming, todayIso }) {
  const instagram = site.socials.find((s) => s.name === 'Instagram');
  const main = html`
    <header class="pagehead">
      <h1 class="pagehead__title">Upcoming</h1>
    </header>
    <section class="shows" aria-label="Upcoming shows">
      <ol class="shows__list" role="list">${upcoming.map((gig) => show(gig, todayIso))}
      </ol>
      <div class="dormant" data-empty-upcoming ${upcoming.length ? raw('hidden') : ''}>
        <div class="dormant__bud stemmed">${raw(roseSvg('not yet', { className: 'rose', open: 0 }))}</div>
        <p class="dormant__text">No shows announced right now.</p>
        <p class="dormant__more">${instagram ? html`<a href="${instagram.url}" rel="noopener" target="_blank">Instagram</a> · ` : ''}<a href="/">Past shows</a></p>
      </div>
    </section>`;

  const events = upcoming.map((gig) => eventJsonLd(gig, site));
  return {
    path: '/upcoming/',
    nav: 'upcoming',
    bodyClass: 'page-upcoming',
    title: 'Upcoming shows',
    description: upcoming.length
      ? `Next Falling For Roza show: ${upcoming[0].venue}${upcoming[0].city ? `, ${upcoming[0].city}` : ''}, ${upcoming[0].date}. Dates, venues and tickets.`
      : 'Upcoming Falling For Roza shows: dates, venues and tickets.',
    head: events.length ? jsonLdScript({ '@graph': events }) : '',
    main,
  };
}
