// Impressum, as German law requires (§ 5 DDG, § 18 Abs. 2 MStV). It is in
// German, so the content is marked lang="de". The privacy policy is its own
// page: src/pages/privacy.js.

import { html } from '../lib/html.js';

export function imprintPage({ site }) {
  const main = html`
    <header class="pagehead">
      <p class="pagehead__kicker">Imprint</p>
      <h1 class="pagehead__title">Impressum</h1>
    </header>
    <section class="legal" lang="de">
      <h2 class="legal__heading">Angaben gemäß § 5 DDG</h2>
      <address class="legal__address">
        Marcus Reiners<br>
        Augsburger Straße 43<br>
        82110 Germering<br>
        Deutschland
      </address>
      <p>E-Mail: <a href="mailto:${site.email}">${site.email}</a></p>

      <h2 class="legal__heading">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>Marcus Reiners, Anschrift wie oben.</p>

      <h2 class="legal__heading">Links zu anderen Websites</h2>
      <p>Diese Website verlinkt auf Angebote anderer Anbieter, zum Beispiel auf Instagram, Spotify, Veranstaltungsseiten und Ticketshops. Für deren Inhalte sind allein die jeweiligen Anbieter verantwortlich. Als wir die Links gesetzt haben, waren keine Rechtsverstöße erkennbar. Erfahren wir von einem, entfernen wir den Link umgehend.</p>

      <h2 class="legal__heading">Urheberrecht</h2>
      <p>Texte, Fotos, Musik und Grafiken auf dieser Website sind urheberrechtlich geschützt. Wenn Sie etwas davon über das private Ansehen hinaus verwenden möchten, fragen Sie uns bitte vorher.</p>

      <h2 class="legal__heading">Datenschutz</h2>
      <p>Wie wir mit Daten umgehen, steht in der <a href="/privacy/">Datenschutzerklärung</a>.</p>
    </section>`;

  return {
    path: '/imprint/',
    nav: null,
    bodyClass: 'page-imprint',
    title: 'Impressum',
    description: 'Impressum von Falling For Roza: Anbieter, Kontakt und Verantwortlicher.',
    main,
  };
}
