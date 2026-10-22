// Music: every release, newest first. Spotify players only load when someone
// asks for them, so nothing connects to Spotify just by opening the page.

import { html, paragraphs } from '../lib/html.js';
import { formatShowDate } from '../../assets/js/lib/dates.js';

function release(r, i) {
  const spotifyUrl = `https://open.spotify.com/${r.spotify}`;
  const date = formatShowDate(r.released.slice(0, 7), 'long');
  return html`
      <li class="record">
        <div class="record__sleeve">
          <img class="record__cover" src="/assets/music/${r.cover}" width="${r.coverSize.width}" height="${r.coverSize.height}" alt="${r.coverAlt}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">
        </div>
        <div class="record__info">
          <p class="record__kind">${r.kind} · <time datetime="${r.released}">${date}</time></p>
          <h2 class="record__title">${r.title}</h2>
          ${r.text ? html`<div class="record__text">${paragraphs(r.text)}</div>` : ''}
          ${r.tracks ? html`<ol class="record__tracks">${r.tracks.map((t) => html`<li>${t}</li>`)}</ol>` : ''}
          <div class="actions">
            <button class="button button--strong" type="button" data-spotify="${r.spotify}" data-title="${r.title}" hidden>Play here</button>
            <a class="button" href="${spotifyUrl}" rel="noopener" target="_blank">Spotify<span class="visually-hidden">: ${r.title} (opens in a new tab)</span></a>
            ${r.apple ? html`<a class="button" href="${r.apple}" rel="noopener" target="_blank">Apple Music<span class="visually-hidden">: ${r.title} (opens in a new tab)</span></a>` : ''}
          </div>
          <div class="record__slot" data-player-slot></div>
        </div>
      </li>`;
}

export function musicPage({ site }) {
  const main = html`
    <header class="pagehead">
      <h1 class="pagehead__title">Music</h1>
      <p class="pagehead__line">Written in bedrooms, born on stage.</p>
    </header>
    <section class="records" aria-label="Releases">
      <p class="records__note">“Play here” loads Spotify’s player. Only then does your browser connect to Spotify, which may set cookies: see <a href="https://www.spotify.com/de/legal/privacy-policy/" rel="noopener" target="_blank">Spotify’s privacy policy<span class="visually-hidden"> (opens in a new tab)</span></a> and <a href="/privacy/">ours</a>.</p>
      <ol class="records__list" role="list">${site.releases.map(release)}
      </ol>
    </section>`;

  return {
    path: '/music/',
    nav: 'music',
    bodyClass: 'page-music',
    title: 'Music',
    description: `Music by ${site.name}: ${site.releases.map((r) => `${r.title} (${r.kind}, ${r.released.slice(0, 4)})`).join(', ')}.`,
    main,
  };
}
