# Adding and editing shows

Every show lives in one file: [`gigs.json`](gigs.json). The homepage, the Upcoming
page, the show pages, the calendar files and the sitemap are all built from it. You
never touch any HTML.

There are two ways to edit it. Either way, the site is published by GitHub a minute or
two after the change (see "Publishing" in the [main README](../README.md)).

## In the browser (easiest)

1. Go to [app.pagescms.org](https://app.pagescms.org), sign in with GitHub and open
   `fallingforroza.github.io`.
2. Open **Shows**. Every show is in the list; click one to edit it, or **Add an item**
   at the bottom of the list for a new one.
3. Fill in the form. Only the web address, the date and the venue are required; each
   field says what goes in it. Write dates like `2026-11-14`.
4. **Photos:** **Add an item** for each photo, upload it (or pick one that's already there) and write
   one sentence about what's in it. The first photo is the cover.
5. Click **Save**. That's it.

If the site doesn't change after a few minutes, something in the show stopped the
build: open the repository on github.com, then **Actions**, then the run with the red
cross. It says what's wrong (e.g. two shows with the same web address). Fix it in the
editor and save again; until then the site stays as it was.

## By hand

Add an entry to the `gigs` list in `gigs.json` (the order doesn't matter, the site
sorts by date):

```json
{
  "id": "feierwerk-2026",
  "date": "2026-11-14",
  "time": "20:30",
  "venue": "Feierwerk",
  "city": "Munich",
  "event": "Release show",
  "tickets": "https://…",
  "photos": [
    { "file": "/assets/gigs/feierwerk-2026/cover.webp", "alt": "The whole band on stage under red light" }
  ]
}
```

Only `id`, `date` and `venue` are required. Remember the comma between entries. Then
`npm run build` and `npm run check`, and commit and push.

## Upcoming shows

An upcoming show appears on the Upcoming page (with a countdown and an "Add to
calendar" button), under "Up Next" at the bottom of the homepage, and as a closed bud
at the top of the plant.

## After the show

Nothing to do. The day after the show (Munich time), the site moves it into the
archive by itself: the bud opens into its rose and the ticket button disappears. When
you have photos and a few words about the night, add them to the show (`story` and
`photos`). You can leave the ticket link in: it only shows before the show.

## Photos

The **first photo is the cover**: on the homepage it sits under the show's rose, with
the venue underneath. Every photo needs a description (`alt`): one sentence saying
what's in the picture, for people who can't see it.

JPG, PNG and WebP work. **HEIC doesn't** (most browsers can't show it): on an iPhone,
share the photo as JPG, or set Settings → Camera → Formats → Most Compatible.

Photos straight from a phone are fine. Before every publish, GitHub turns them the right
way up, makes them at most 1600 px, adds an 800 px copy for small screens and removes
camera and location data (`scripts/prepare-photos.js`). The published site only has
those copies. **But the photo you upload is kept in the repository as it is, and the
repository is public.** If it has the location in it, turn that off when you share it
(iPhone: Share → Options → Location off), or use a photo from Instagram or WhatsApp,
which drop it anyway.

On a Mac you can also prepare photos yourself before adding them (needs
`brew install webp` once):

```sh
scripts/optimize-image.sh ~/Downloads/IMG_4711.jpg assets/gigs/feierwerk-2026/cover
```

It writes `cover.webp` and `cover-800.webp` in the show's folder.

A show without photos is fine: it just shows its name under the rose.

## The fields

| Field     | Required | What it is |
|-----------|----------|------------|
| `id`      | yes | The web address: `/live/<id>/`. Lowercase, numbers, dashes. Don't change it once the show is online. |
| `date`    | yes | `YYYY-MM-DD`. For old shows where the day is unknown, `2025-07` or `2025` works. Upcoming shows need the exact day. |
| `venue`   | yes | Where we play. |
| `city`    |     | e.g. `Munich`. |
| `event`   |     | Festival, contest, tour, stage. |
| `time`    |     | `20:30`. Used for the calendar file. |
| `tickets` |     | Ticket link. Only shown before the show. |
| `link`    |     | Event page (venue, festival, Facebook…). |
| `press`   |     | An article about the show (newspaper, blog). Shown once the show has happened. |
| `info`    |     | One short extra line, e.g. doors, support, "free entry". |
| `story`   |     | A few lines about the night. |
| `photos`  |     | List of `{ "file": …, "alt": … }`. `file` is the path, e.g. `/assets/gigs/strom/cover.webp`. First one is the cover. |
| `placeholder` | | `true` marks a stand-in show with made-up details (by hand only; the editor doesn't keep it). `npm run check` fails while any are left, so none goes online by accident. |

VS Code checks the file as you type (through `gigs.schema.json`, set up in
`.vscode/settings.json`) and explains each field when you hover over it. If something
is wrong anyway, the build stops and says what and where.

## How the rose is made

Each show's rose and its branch are grown from its id, venue, city and date. Same
data, same rose. If you fix a typo in a venue name, the rose and its branch change too,
which is fine. On wide screens the shows sit two to a row, paired from the oldest up: a
new show joins the top row or starts a new one, and every older row stays as it is.

## Other content

- Releases, socials and the email address: [`site.json`](site.json)
- The About text: `src/pages/about.js`
- The Shop page ("in the making" for now): `src/pages/shop.js`
- The band's own rose at the top of the homepage grows from the seed "Falling For Roza"
  (`src/pages/home.js`)
- The Impressum: `src/pages/imprint.js`
