// One page per show: /live/<id>/. Past shows open up into their photos;
// upcoming shows are still buds, with tickets and a calendar file.

import fs from 'node:fs';
import path from 'node:path';
import { html, paragraphs } from '../lib/html.js';
import { photo, rose, showTime, where, dateLine, lastDay, eventJsonLd, jsonLdScript, BUD, BLOOM } from '../templates/parts.js';
import { countdown } from '../../assets/js/lib/dates.js';

function gallery(gig) {
  if (!gig.photos.length) return '';
  const items = gig.photos.map(
    (p, i) => html`
        <li class="gallery__item${p.height >= p.width ? ' gallery__item--portrait' : ''}">
          <a class="gallery__link" href="${p.src}" data-lightbox="${i}" data-cursor="zoom">
            ${photo(p, { sizes: '(min-width: 900px) 50vw, 100vw', eager: i === 0 })}
          </a>
        </li>`,
  );
  return html`
    <section class="gallery" aria-labelledby="photos-title">
      <h2 class="visually-hidden" id="photos-title">Photos</h2>
      <ul class="gallery__grid" role="list">${items}
      </ul>
    </section>`;
}

function pager(gig, { past }) {
  if (gig.isUpcoming) {
    return html`
    <nav class="pager" aria-label="More shows">
      <a class="pager__link" href="/upcoming/"><span class="pager__hint">←</span> Upcoming shows</a>
      <a class="pager__link pager__link--end" href="/">All nights <span class="pager__hint">→</span></a>
    </nav>`;
  }
  const i = past.indexOf(gig);
  const newer = past[i - 1];
  const older = past[i + 1];
  return html`
    <nav class="pager" aria-label="More nights">
      ${older ? html`<a class="pager__link" rel="prev" href="${older.url}"><span class="pager__hint">← Before</span> ${older.venue}</a>` : html`<span></span>`}
      ${newer ? html`<a class="pager__link pager__link--end" rel="next" href="${newer.url}"><span class="pager__hint">After →</span> ${newer.venue}</a>` : html`<a class="pager__link pager__link--end" href="/#night-${gig.id}"><span class="pager__hint">Back to</span> All nights</a>`}
    </nav>`;
}

function upcomingActions(gig) {
  return html`
      <div class="actions" data-upcoming-until="${lastDay(gig)}">
        ${gig.tickets ? html`<a class="button button--strong" href="${gig.tickets}" rel="noopener" target="_blank">Tickets<span class="visually-hidden"> (opens in a new tab)</span></a>` : ''}
        ${gig.link ? html`<a class="button" href="${gig.link}" rel="noopener" target="_blank">Event page<span class="visually-hidden"> (opens in a new tab)</span></a>` : ''}
        <a class="button" href="${gig.url}calendar.ics" download="falling-for-roza-${gig.id}.ics">Add to calendar</a>
      </div>`;
}

export function nightPage(gig, ctx) {
  const { site, past, todayIso, root } = ctx;
  const story = paragraphs(gig.story);
  const until = lastDay(gig);

  // Upcoming shows start as a bud; site.js opens it the day after the show.
  const flower = gig.isUpcoming
    ? html`<div class="night__rose stemmed" data-rose data-bloom-to="${BUD}" data-bloom-after="${until}" data-bloom-later="${BLOOM}">${rose(gig, { open: BUD, transition: true })}</div>`
    : html`<div class="night__rose stemmed" data-rose data-bloom-on-load data-bloom-to="${BLOOM}">${rose(gig, { open: BLOOM, transition: true })}</div>`;

  const when = gig.isUpcoming
    ? html`<p class="night__when" data-upcoming-until="${until}">${dateLine(gig)} · <span data-countdown="${gig.date}">${countdown(gig.date, todayIso)}</span></p>
        <p class="night__when" hidden data-past-after="${until}">${showTime(gig, 'long')}</p>`
    : html`<p class="night__when">${showTime(gig, 'long')}</p>`;

  const main = html`
    <article class="night" aria-labelledby="night-title">
      <header class="night__head">
        ${flower}
        <div class="night__intro">
          ${when}
          <h1 class="night__title" id="night-title">${gig.venue}</h1>
          ${where(gig) ? html`<p class="night__where">${where(gig)}</p>` : ''}
          ${gig.info ? html`<p class="night__info">${gig.info}</p>` : ''}
          ${gig.isUpcoming ? upcomingActions(gig) : ''}
          ${!gig.isUpcoming && gig.link ? html`<p class="night__link"><a href="${gig.link}" rel="noopener" target="_blank">Event page<span class="visually-hidden"> (opens in a new tab)</span> ↗</a></p>` : ''}
          ${!gig.isUpcoming && gig.press ? html`<p class="night__link"><a href="${gig.press}" rel="noopener" target="_blank">In the press: ${new URL(gig.press).hostname.replace(/^www\./, '')}<span class="visually-hidden"> (opens in a new tab)</span> ↗</a></p>` : ''}
          ${story.length ? html`<div class="night__story">${story}</div>` : ''}
        </div>
      </header>
      ${gallery(gig)}
      ${pager(gig, { past })}
    </article>`;

  const ogFile = path.join(root, 'assets', 'gigs', gig.id, 'og.jpg');
  const image = fs.existsSync(ogFile) ? `/assets/gigs/${gig.id}/og.jpg` : undefined;
  const whenWhere = [gig.isUpcoming ? `on ${gig.date}` : `in ${gig.parsedDate.year}`, gig.city && `in ${gig.city}`]
    .filter(Boolean)
    .join(' ');

  return {
    path: gig.url,
    nav: gig.isUpcoming ? 'upcoming' : 'live',
    bodyClass: 'page-night',
    title: gig.venue,
    description: gig.story
      ? gig.story.split(/\n\s*\n/)[0].slice(0, 180)
      : `Falling For Roza live at ${gig.venue} ${whenWhere}.`,
    image,
    ogType: 'article',
    head: gig.isUpcoming ? jsonLdScript(eventJsonLd(gig, site)) : '',
    main,
  };
}

/** A calendar file for an upcoming show (all-day if there's no time). */
export function calendarFile(gig, site, todayIso) {
  const stamp = `${todayIso.replace(/-/g, '')}T000000Z`;
  const day = gig.date.replace(/-/g, '');
  const esc = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const nextDay = () =>
    new Date(Date.UTC(+gig.date.slice(0, 4), +gig.date.slice(5, 7) - 1, +gig.date.slice(8, 10) + 1))
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');
  let when;
  if (gig.time) {
    const [h, m] = gig.time.split(':').map(Number);
    const endH = String((h + 3) % 24).padStart(2, '0');
    const endDay = h + 3 >= 24 ? nextDay() : day;
    when = [
      `DTSTART;TZID=Europe/Berlin:${day}T${gig.time.replace(':', '')}00`,
      `DTEND;TZID=Europe/Berlin:${endDay}T${endH}${String(m).padStart(2, '0')}00`,
    ];
  } else {
    when = [`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${nextDay()}`];
  }
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Falling For Roza//fallingforroza.com//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Berlin',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${gig.id}@fallingforroza.com`,
    `DTSTAMP:${stamp}`,
    ...when,
    `SUMMARY:${esc(`Falling For Roza at ${gig.venue}`)}`,
    `LOCATION:${esc([gig.venue, gig.city].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${esc([gig.event, gig.info, gig.tickets && `Tickets: ${gig.tickets}`].filter(Boolean).join('\n'))}`,
    `URL:${new URL(gig.url, site.url).href}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
