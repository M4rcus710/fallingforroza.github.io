// About: who we are, in a few lines, next to a photo of us.

import { html } from '../lib/html.js';

export function aboutPage({ site }) {
  const main = html`
    <header class="pagehead">
      <h1 class="pagehead__title">About</h1>
    </header>
    <div class="about">
      <figure class="about__photo">
        <img src="/assets/img/band.webp" srcset="/assets/img/band-800.webp 800w, /assets/img/band.webp 1198w" sizes="(min-width: 900px) 55vw, 100vw" width="1198" height="798" alt="The band, shot from below with a fisheye lens, one of us mid hair-flip" fetchpriority="high" decoding="async">
      </figure>
      <div class="about__text">
        <p class="about__lead">We’re Falling For Roza, a rock band from Munich.</p>
        <p>In 2024, we released our debut EP, Red Shirt, a five-track release written, recorded, and distributed entirely by ourselves. Taking the DIY route comes with its challenges, but it gives us the freedom to shape our music on our own terms. It’s an approach we’re proud of and intend to stick with.</p>
        <p>Winning the semifinals of Munich’s Emergenza Battle of the Bands was one of the highlights of our journey so far. Playing the 3M Stage at Augsburger Sommernächte was another. Both experiences reminded us why we started this band in the first place: for the energy of live music, the connection with the crowd, and the drive to keep pushing forward.</p>
        <p>Beyond our own shows, we’ve also been happy to lend our sound to a good cause. When our friends in Metamorphine invited us to play a benefit concert, we were glad to be part of an event that brought people together and raised donations for the children’s hospice being built in Polling. For us, being part of the music scene means more than just playing on stage. It also means showing up for the community around us.</p>
        <p class="about__links"><a class="arrow-link" href="/music/">Music</a> <a class="arrow-link" href="/">Shows</a></p>
      </div>
    </div>`;

  return {
    path: '/about/',
    nav: 'about',
    bodyClass: 'page-about',
    title: 'About',
    description: `${site.name} is a rock band from Munich. Our debut EP, Red Shirt, was written, recorded and released entirely by ourselves.`,
    main,
  };
}
