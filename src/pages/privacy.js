// Datenschutzerklärung (privacy policy), in German like the Impressum. It
// describes what the site really does; test/build.test.js checks the parts
// that could quietly stop being true (no cookies, nothing loaded from other
// servers, "theme" the only thing stored in the browser). If the site starts
// using another service, this page has to say so.

import { html } from '../lib/html.js';

export function privacyPage({ site }) {
  const main = html`
    <header class="pagehead">
      <p class="pagehead__kicker">Privacy</p>
      <h1 class="pagehead__title">Datenschutz</h1>
    </header>
    <section class="legal" lang="de">
      <h2 class="legal__heading">Das Wichtigste in Kürze</h2>
      <p>Diese Website setzt keine Cookies und verwendet keine Analyse- oder Trackingdienste. Beim Aufruf lädt sie nichts von fremden Servern: Schriften und Bilder liegen auf der Website selbst. Daten fallen nur an, weil die Website irgendwo gehostet werden muss, wenn Sie den Spotify-Player starten und wenn Sie uns schreiben.</p>

      <h2 class="legal__heading">Verantwortlicher</h2>
      <address class="legal__address">
        Marcus Reiners<br>
        Augsburger Straße 43<br>
        82110 Germering<br>
        Deutschland<br>
        <a href="mailto:${site.email}">${site.email}</a>
      </address>

      <h2 class="legal__heading">Hosting</h2>
      <p>Diese Website liegt bei GitHub Pages, einem Dienst der GitHub, Inc., 88 Colin P. Kelly Jr. St., San Francisco, CA 94107, USA. Wenn Sie die Website aufrufen, überträgt Ihr Browser dabei technisch notwendige Daten an die Server von GitHub, insbesondere Ihre IP-Adresse. Nach eigenen Angaben protokolliert und speichert GitHub die IP-Adressen der Besucher von GitHub-Pages-Seiten aus Sicherheitsgründen. Wir selbst bekommen diese Daten nicht zu sehen.</p>
      <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO: Wir haben ein berechtigtes Interesse daran, die Website sicher und zuverlässig bereitzustellen. GitHub verarbeitet Daten auch in den USA und ist nach dem EU-US Data Privacy Framework zertifiziert, für das die EU-Kommission ein angemessenes Datenschutzniveau festgestellt hat (Art. 45 DSGVO). Mehr dazu, auch wie lange GitHub Daten speichert, steht in der <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement">Datenschutzerklärung von GitHub</a>.</p>

      <h2 class="legal__heading">Hell- und Dunkelmodus</h2>
      <p>Die Website richtet sich nach der Hell- oder Dunkel-Einstellung Ihres Geräts. Wählen Sie mit dem Schalter oben auf der Seite selbst eine Darstellung, wird diese Wahl im Speicher Ihres Browsers abgelegt (localStorage, Eintrag „theme“), damit sie auf den anderen Seiten erhalten bleibt. Der Eintrag bleibt auf Ihrem Gerät und wird nicht an uns oder andere übertragen. Wechseln Sie zurück zur Darstellung Ihres Geräts, löscht die Website ihn wieder; Sie können ihn auch in den Einstellungen Ihres Browsers löschen.</p>
      <p>Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG: Das Speichern ist unbedingt erforderlich, damit die von Ihnen ausdrücklich gewählte Darstellung funktioniert.</p>

      <h2 class="legal__heading">Spotify-Player auf der Musikseite</h2>
      <p>Auf der <a href="/music/">Musikseite</a> können Sie unsere Songs direkt abspielen. Der Player von Spotify wird erst geladen, wenn Sie auf „Play here“ klicken; vorher besteht keine Verbindung zu Spotify. Mit dem Klick verbindet sich Ihr Browser mit Servern von Spotify. Spotify erhält dabei unter anderem Ihre IP-Adresse und die Information, auf welcher Website der Player geladen wurde, kann Cookies setzen und Daten auch außerhalb der EU verarbeiten. Sind Sie bei Spotify angemeldet, kann Spotify den Aufruf Ihrem Konto zuordnen.</p>
      <p>Anbieter ist die Spotify AB, Regeringsgatan 19, 111 53 Stockholm, Schweden. Rechtsgrundlage ist Ihre Einwilligung, die Sie mit dem Klick geben (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Sie können sie jederzeit widerrufen: Laden Sie die Seite neu, ist der Player wieder weg; von Spotify gesetzte Cookies können Sie in Ihrem Browser löschen. Mehr steht in der <a href="https://www.spotify.com/de/legal/privacy-policy/">Datenschutzerklärung von Spotify</a>.</p>

      <h2 class="legal__heading">Links zu anderen Websites</h2>
      <p>Links zu Instagram, TikTok, YouTube, Spotify, Apple Music, Ticketshops, Veranstaltern oder Zeitungsartikeln sind einfache Links. Solange Sie keinen anklicken, wird nichts an diese Anbieter übertragen. Klicken Sie einen an, verlassen Sie unsere Website, und es gelten die Datenschutzbestimmungen des jeweiligen Anbieters.</p>

      <h2 class="legal__heading">Kontakt per E-Mail</h2>
      <p>Wenn Sie uns schreiben, verarbeiten wir Ihre E-Mail-Adresse und Ihre Nachricht, um Ihnen zu antworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, wenn es um eine Anfrage wie eine Buchung geht, sonst Art. 6 Abs. 1 lit. f DSGVO (unser Interesse, Nachrichten zu beantworten). Unsere E-Mails liegen bei der Zoho Corporation B.V., Beneluxlaan 4B, 3527 HT Utrecht, Niederlande, in Rechenzentren in der EU. Wir löschen Ihre Nachricht, sobald wir sie nicht mehr brauchen, es sei denn, wir müssen sie aus gesetzlichen Gründen aufbewahren.</p>

      <h2 class="legal__heading">Ihre Rechte</h2>
      <p>Sie haben das Recht auf</p>
      <ul class="legal__list">
        <li>Auskunft über Ihre Daten, die wir verarbeiten (Art. 15 DSGVO),</li>
        <li>Berichtigung (Art. 16 DSGVO) und Löschung (Art. 17 DSGVO),</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO),</li>
        <li>Widerspruch gegen eine Verarbeitung, die auf unserem berechtigten Interesse beruht (Art. 21 DSGVO),</li>
        <li>Widerruf einer Einwilligung, mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO).</li>
      </ul>
      <p>Schreiben Sie uns dafür einfach eine E-Mail. Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), zum Beispiel beim Bayerischen Landesamt für Datenschutzaufsicht, Promenade 18, 91522 Ansbach, <a href="https://www.lda.bayern.de">www.lda.bayern.de</a>.</p>

      <p class="legal__source">Stand: Oktober 2026</p>
    </section>`;

  return {
    path: '/privacy/',
    nav: null,
    bodyClass: 'page-privacy',
    title: 'Datenschutz',
    description: 'Datenschutzerklärung von Falling For Roza: keine Cookies, kein Tracking, was beim Hosting, beim Spotify-Player und bei E-Mails passiert.',
    main,
  };
}
