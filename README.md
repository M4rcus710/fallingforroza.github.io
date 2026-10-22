# fallingforroza.com

The website of Falling For Roza. Plain HTML, CSS and a little JavaScript, built from two
JSON files and served by GitHub Pages from this repository's `main` branch.

**The idea:** every show we play grows a black rose of its own, generated from the
show's venue, city and date. The homepage is one black rose plant on paper: the band's
rose blooms at the top, and the shows sit in a grid of big photos, the stalk winding
between them; each show's branch ends in its rose on the photo's top edge, with the
venue underneath. Upcoming shows are closed buds; the day after a show, its bud opens
where it is. Below the shows: the newest release and the next show. The footer is the
roots. With a mouse, a dot follows the pointer and grows into a disc over the nights
(↗ to open one, + to enlarge a photo), as on the band's old site.

## Working on it

Needs Node 20 or newer. There are no dependencies to install (only the photo step on
GitHub installs one, sharp).

```sh
npm run dev      # build, then serve at http://localhost:8080
npm test         # unit and build tests
npm run check    # links, images, titles, alt texts in the built site
```

**Adding a show:** in the browser at [app.pagescms.org](https://app.pagescms.org), or
by hand in `content/gigs.json`. Step by step, with photos:
[content/README.md](content/README.md).

## Publishing

GitHub checks and publishes the site: `.github/workflows/deploy.yml` runs on every
change to `main` (also the ones made in the editor) and once a night, so shows that
have happened move into the archive in the HTML as well. It prepares new photos
(`scripts/prepare-photos.js`), runs the tests, builds the site into `_site/`, checks it
and publishes it. If any step fails, nothing is published and the site stays as it
was; the run's page under **Actions** on GitHub says why.

On a pull request the same checks run, without publishing, and the result shows up
on the pull request before you merge.

This needs **Settings → Pages → Build and deployment → Source: GitHub Actions** in the
repository. The custom domain stays set there too.

The editor at [app.pagescms.org](https://app.pagescms.org) is configured in
`.pages.yml`: a form for the shows in `content/gigs.json`. It only writes back the
fields listed there, so a new field for shows has to be added to `.pages.yml` too (a
test checks this). Dates are plain text fields on purpose: a date picker can't hold
`2025` or `2026-03`.

`npm run build` still writes the site into this folder for working on it locally
(`npm run dev`).

## How it's put together

```
content/        what the site says
  gigs.json       every show, past and upcoming (the only place shows live)
  site.json       email, socials, releases
src/            how it's built (no framework, just template functions)
  build.js        writes the HTML into this folder
  pages/          one file per page type
  templates/      the frame around every page, shared pieces
    plant.js        the homepage plant: where every show, branch, leaf and photo goes
assets/
  css/site.css    all styles: paper, type, the plant, motion
  js/site.js      small extras in the browser (dates, growing, petals, photo viewer, Spotify)
  js/lib/         code used both by the build and the browser:
    rose.js         the rose generator (a small 3D model, drawn as SVG)
    dates.js        past/upcoming, in Munich time
  gigs/<id>/      photos per show
  fonts/          self-hosted fonts (SIL Open Font License)
scripts/        dev server, site check, photo helpers, the narrow-screen stalk
.github/        the workflow that publishes the site
.pages.yml      the editor's form for the shows
test/           node --test
```

The generated HTML (`index.html`, `about/`, `live/`, …) is committed, just like the
Framer export was, so GitHub Pages publishes it as it is (`.nojekyll`). Don't edit those
files by hand: they're overwritten on every build.

### Dates

Show dates are plain `YYYY-MM-DD` strings, compared with "today" in Munich. A show is
upcoming for the whole day it happens on. The build sorts shows into past and upcoming,
and `assets/js/site.js` checks again in the browser, so a show moves into the archive the
day after it happened even if nobody rebuilt the site.

### Roses and motion

Each rose is a small 3D model: four to six rings of cupped petals, sepals and the hip
below them. The seed decides how many petals, round or pointed or notched tips, how
cupped or flat it opens, how far the outer petals roll back, how wide open it ends up
and the angle we see it from. One number, from 0 (closed bud) to 1 (its own full bloom),
decides how far it has opened; the rose is projected and drawn as SVG at that stage.
Everything on the plant is black and cut like the band's stencil emblem: dark shapes
separated by paper-coloured hairlines. Branches leave the stalk at a sharp upward
angle, the way rose shoots do, and climb diagonally to their rose, tapering as they
go; no part of a branch is ever flatter than 28° (a test checks this). The rose
proliferates like a real one: every show's rose has a bud or two beside it on their own
little stems, and wherever there is room between the shows, small shoots grow off the
stalk, fork and end in buds, some just opening. They're drawn with the same rose model
from their own seeds, so no two are alike, and they're checked against everything else
on the plant so they never grow into a photo, its writing or a rose.

On wide screens the shows sit in a grid, as on the band's first site: under a big
"On Stage" heading, every row has a wide photo and a narrow one, the wide one on
alternate sides, their edges lined up across the page. The stalk runs up the gap
between the two and swings over to the next gap between rows; each show's branch
leaves it there and its rose sits on the photo's top edge, so the branch crosses the
photo's upper part. Rows are paired from the oldest show up, so a new show only ever
changes the top row. A row of shows without photos (usually upcoming ones) keeps the
stalk going straight; their writing hangs under the rose, clear of the branch. Photos
taller than 3:4 are cropped to 3:4. On phones the stalk runs down the left edge and
the shows follow each other. Below the shows, "On Record" shows the newest release
and "Up Next" the next show, and the stalk runs on between them to the roots in the
footer.

The plant is laid out at build time (`src/templates/plant.js`): the grid, the stalk's
path, the curve of every branch and where its leaves, prickles and buds go. On wide
screens it's measured in hundredths of its own width, so it fills the screen. A test
lays out a 41-show archive to make sure the grid lines up and nothing overlaps.

While you scroll down the homepage, the stalk grows with you, a branch grows out of it
for each show, its leaves unfold and the bud at the end opens into that show's rose.
Touching a rose makes a petal fall; pages fall into each other where browsers support
view transitions. Nothing moves for people who prefer reduced motion, and if the script
doesn't load, the plant is simply there, fully grown.

### Dark mode

Dark mode is the contrary of the paper: a white plant cut out of dark paper, with the
same grain. It follows the system setting; the half-filled circle in the masthead
switches it, and the choice is remembered on that device (in `localStorage`, no
cookie). All colours are tokens at the top of `assets/css/site.css`, with the dark ones
right below. The narrow-screen stalk has a dark version too (`scripts/narrow-stalk.js dark`).

### Privacy

No cookies, no analytics, no external fonts or scripts. The only third party is Spotify,
and only after someone presses "Play here" on the music page. The one thing stored in a
visitor's browser is "theme", and only once they pick light or dark themselves. Without
anything to consent to, the site needs no cookie banner.

The Impressum (`src/pages/imprint.js`) and the privacy policy (`src/pages/privacy.js`,
in German) describe exactly this: GitHub Pages as host, Spotify on click, the theme
setting, and email at Zoho (EU). A test checks that the site still sets no cookies,
loads nothing from other servers and stores nothing but "theme"; if the site ever starts
using another service, the privacy policy has to say so.

## Fonts

Forum (Denis Masharov) and IBM Plex Mono (IBM), both under the SIL Open Font License,
see `assets/fonts/`.
The wordmark and the emblem are the band's own logo, traced from the original files.
