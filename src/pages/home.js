// The homepage is one rose plant. The band's rose blooms at the top; every show
// grows on its own branch further down the stalk, newest first: a black rose
// at the end of the branch, sitting on a photo of the night, the venue
// underneath. Upcoming shows are closed buds that open the day after the
// show. Below the shows: the newest release and the next show. The footer is
// the roots.

import { html, raw } from '../lib/html.js';
import { wordmark } from '../templates/layout.js';
import { photo, rose, dateLine, where, lastDay, BUD, BLOOM } from '../templates/parts.js';
import { layoutPlant } from '../templates/plant.js';
import { roseSvg } from '../../assets/js/lib/rose.js';
import { countdown, formatShowDate } from '../../assets/js/lib/dates.js';

function show({ gig, side, style, branch, card }, isNext) {
  const until = gig.isUpcoming ? lastDay(gig) : null;
  // upcoming shows: a bud and "Next up"; site.js opens it after the show
  const upcoming = until ? raw(` data-upcoming-show="${until}"`) : '';
  return html`
        <li class="gig" data-side="${side}" data-grow id="night-${gig.id}" style="${style}"${upcoming}>
          <article class="gig__inner" aria-labelledby="title-${gig.id}">
            ${branch}
            <a class="gig__rose" href="${gig.url}" tabindex="-1" aria-hidden="true" data-rose data-cursor="open" data-bloom-to="${until ? BUD : BLOOM}">${rose(gig, { open: until ? BUD : BLOOM, transition: true })}</a>
            <div class="gig__figure${card ? ' gig__figure--text' : ''}" data-cursor="open">
              ${gig.cover ? html`<div class="gig__photo">${photo(gig.cover, { sizes: '(min-width: 64em) 64vw, 90vw' })}</div>` : ''}
              <div class="gig__caption">
                ${until ? html`<p class="gig__next"><span data-next-label>${isNext ? 'Next up' : 'Coming up'}</span> · ${dateLine(gig)}</p>` : ''}
                <h3 class="gig__venue" id="title-${gig.id}"><a href="${gig.url}">${gig.venue}</a></h3>
                ${where(gig) ? html`<p class="gig__where">${where(gig)}</p>` : ''}
              </div>
            </div>
          </article>
        </li>`;
}

/** The newest release, with links to listen. */
function newestRelease(site) {
  const r = [...(site.releases || [])].sort((a, b) => (a.released < b.released ? 1 : -1))[0];
  if (!r) return '';
  return html`
        <article class="coda__item coda__release" aria-labelledby="coda-release">
          <a class="coda__cover" href="/music/" tabindex="-1" aria-hidden="true"><img src="/assets/music/${r.cover}" width="${r.coverSize.width}" height="${r.coverSize.height}" alt="" loading="lazy" decoding="async"></a>
          <div>
            <p class="coda__label">${r.kind} · <time datetime="${r.released}">${formatShowDate(r.released.slice(0, 7), 'long')}</time></p>
            <h3 class="coda__name" id="coda-release">${r.title}</h3>
            ${r.text ? html`<p class="coda__text">${r.text}</p>` : ''}
            <div class="actions">
              <a class="button button--strong" href="https://open.spotify.com/${r.spotify}" rel="noopener" target="_blank">Spotify<span class="visually-hidden">: ${r.title} (opens in a new tab)</span></a>
              ${r.apple ? html`<a class="button" href="${r.apple}" rel="noopener" target="_blank">Apple Music<span class="visually-hidden">: ${r.title} (opens in a new tab)</span></a>` : ''}
            </div>
            <p class="coda__more"><a class="arrow-link" href="/music/">All music</a></p>
          </div>
        </article>`;
}

/** The next show (site.js hides it once it has happened, and the next one takes its place). */
function nextShow(site, upcoming, todayIso) {
  const instagram = site.socials.find((s) => s.name === 'Instagram');
  const shows = upcoming.map(
    (gig) => html`
            <li class="coda__show" data-upcoming-until="${lastDay(gig)}">
              <a class="coda__bud stemmed" href="${gig.url}" tabindex="-1" aria-hidden="true">${rose(gig, { open: BUD })}</a>
              <div>
                <p class="coda__label coda__label--next">${dateLine(gig)} · <span data-countdown="${gig.date}">${countdown(gig.date, todayIso)}</span></p>
                <h3 class="coda__name"><a href="${gig.url}">${gig.venue}</a></h3>
                ${where(gig) ? html`<p class="coda__where">${where(gig)}</p>` : ''}
                <div class="actions">
                  ${gig.tickets ? html`<a class="button button--strong" href="${gig.tickets}" rel="noopener" target="_blank">Tickets<span class="visually-hidden"> for ${gig.venue} (opens in a new tab)</span></a>` : ''}
                  <a class="button" href="${gig.url}calendar.ics" download="falling-for-roza-${gig.id}.ics">Add to calendar<span class="visually-hidden">: ${gig.venue}</span></a>
                </div>
              </div>
            </li>`,
  );
  return html`
        <div class="coda__item">
          <ul class="coda__shows" role="list">${shows}
          </ul>
          <div class="coda__show coda__show--none" data-empty-upcoming ${upcoming.length ? raw('hidden') : ''}>
            <div class="coda__bud stemmed">${raw(roseSvg('not yet', { className: 'rose', open: 0 }))}</div>
            <div>
              <h3 class="coda__name">No show announced right now.</h3>
              ${instagram ? html`<p class="coda__where">Follow us on <a href="${instagram.url}" rel="noopener" target="_blank">Instagram<span class="visually-hidden"> (opens in a new tab)</span></a> for the next one.</p>` : ''}
            </div>
          </div>
          <p class="coda__more"><a class="arrow-link" href="/upcoming/">All upcoming shows</a></p>
        </div>`;
}

export function homePage({ site, past, upcoming, todayIso }) {
  // newest first: the furthest show in the future at the very top
  const all = [...[...upcoming].reverse(), ...past];
  const plant = layoutPlant(all, { where });
  const next = upcoming[0];

  const main = html`
    <section class="crown" aria-labelledby="crown-title">
      <h1 class="crown__title" id="crown-title">${wordmark('wordmark--crown')}</h1>
      <p class="crown__tagline">All heart, all noise.</p>
      <div class="crown__rose" data-rose data-bloom-on-load>${raw(roseSvg('Falling For Roza', { className: 'rose', open: 1 }))}</div>
    </section>
    <section class="plant" id="nights" aria-labelledby="plant-title" data-plant style="--H:${Math.round(plant.height * 100) / 100}">
      <h2 class="display plant__title" id="plant-title">On Stage</h2>
      <svg class="plant__bend" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M100 0C100 55 0 45 0 100"/><path d="M100 0C100 55 0 45 0 100"/></svg>
      ${plant.stalk}
      <ol class="gigs" role="list">${plant.rows.map((row) => show(row, row.gig === next))}
      </ol>
    </section>
    <div class="coda">
      <section class="coda__col" aria-labelledby="coda-record">
        <h2 class="display" id="coda-record">On Record</h2>${newestRelease(site)}
      </section>
      <section class="coda__col" aria-labelledby="coda-next">
        <h2 class="display" id="coda-next">Up Next</h2>${nextShow(site, upcoming, todayIso)}
      </section>
    </div>`;

  return {
    path: '/',
    nav: 'live',
    bodyClass: 'page-home',
    description: `Falling For Roza is a rock band from Munich. Every show we play grows a rose on this site – ${past.length} so far${past[0] ? `, most recently ${past[0].venue}` : ''}.`,
    main,
  };
}
