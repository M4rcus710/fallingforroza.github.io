import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutPlant, slopes, MIN_SLOPE } from '../src/templates/plant.js';

// A long archive with awkward names and photos of every shape.
const names = ['Strom', 'Augsburger Sommernächte', 'Backstage Halle', 'Q', 'Feierwerk Hansa 39', 'Kranhalle', 'Zehner', 'Muffatwerk Ampere – Late Show'];
const shapes = [
  { width: 1200, height: 1600 },
  { width: 1600, height: 1067 },
  { width: 1600, height: 1600 },
  { width: 900, height: 1600 },
];
const makeGigs = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: `show-${i}`,
    venue: names[i % names.length],
    city: i % 3 ? 'Munich' : 'Garmisch-Partenkirchen',
    event: i % 4 ? '' : 'Emergenza Bavarian semifinal',
    isUpcoming: i < 2,
    seed: `show-${i}|${names[i % names.length]}|Munich|${2024 - Math.floor(i / 12)}`,
    cover: i % 5 === 4 ? null : shapes[i % shapes.length],
  }));
const gigs = makeGigs(41); // an odd number: the top row has one show
const where = (gig) => [gig.city, gig.event].filter(Boolean).join(' · ');
const plant = layoutPlant(gigs, { where });
const byId = new Map(plant.rows.map((r) => [r.gig.id, r]));

test('every show gets a place, two to a row, newest at the top', () => {
  assert.equal(plant.rows.length, gigs.length);
  assert.equal(plant.grid.length, Math.ceil(gigs.length / 2));
  assert.equal(plant.grid[0].members.length, 1);
  for (const row of plant.grid.slice(1)) assert.equal(row.members.length, 2);
  // read row by row, the shows come newest first
  const position = (id) => gigs.findIndex((g) => g.id === id);
  const order = plant.grid.flatMap((row) => [...row.members].sort((a, b) => position(a) - position(b)));
  assert.deepEqual(order, gigs.map((g) => g.id));
});

test('the photos line up like a grid: a wide and a narrow column, swapping sides row by row', () => {
  for (const [i, row] of plant.grid.entries()) {
    // the sides swap, unless a row has no photos at all
    const photos = (r) => r.members.some((id) => byId.get(id).photo);
    if (i > 0 && photos(plant.grid[i - 1])) assert.notEqual(row.narrowLeft, plant.grid[i - 1].narrowLeft, `row ${i} keeps its sides`);
    for (const id of row.members) {
      const p = byId.get(id).photo;
      if (!p) continue;
      assert.ok(Math.abs(p.top - row.top) < 0.01, 'photos in a row start at the same height');
      const width = p.x1 - p.x0;
      assert.ok(Math.abs(width - 31) < 0.01 || Math.abs(width - 64) < 0.01, `a photo ${width.toFixed(2)}u wide`);
      // the outer edge on the plant's edge, the inner edge on the gap
      assert.ok(Math.abs(p.x0 + 50) < 0.01 || Math.abs(p.x1 - 50) < 0.01, `${id} doesn't reach the edge of the plant`);
      assert.ok(Math.abs(p.x0 - (row.gap + 2.5)) < 0.01 || Math.abs(p.x1 - (row.gap - 2.5)) < 0.01, `${id}'s inner edge isn't on the gap`);
    }
  }
});

test('the stalk runs up the gap between the photos', () => {
  for (const row of plant.grid) {
    for (let y = row.top; y <= row.bottom; y += 0.5) {
      assert.ok(Math.abs(plant.stalkAt(y) - row.gap) < 1.2, `at ${y} the stalk is at ${plant.stalkAt(y).toFixed(2)}, the gap at ${row.gap}`);
    }
  }
  // it starts under the band's rose and ends in the middle, where the roots are
  assert.equal(plant.stalkAt(0), 0);
  assert.ok(Math.abs(plant.stalkAt(plant.height)) < 0.01);
});

test('every rose sits on its photo, and nothing reaches past the edge of the plant', () => {
  for (const row of plant.rows) {
    assert.ok(row.across <= 50.01, `${row.gig.id} reaches ${row.across}`);
    if (!row.photo) continue;
    assert.ok(row.rosePoint.x > row.photo.x0 && row.rosePoint.x < row.photo.x1, `${row.gig.id}'s rose isn't over its photo`);
    assert.ok(row.rosePoint.y > row.photo.top && row.rosePoint.y < row.photo.top + 2.1, `${row.gig.id}'s rose isn't on the photo's top edge`);
  }
});

test('rows never overlap, and leave room between them', () => {
  for (let i = 1; i < plant.grid.length; i++) {
    const above = plant.grid[i - 1];
    const row = plant.grid[i];
    assert.ok(row.top - above.bottom >= (row.gap === above.gap ? 10 : 15), `rows ${i - 1} and ${i} are ${(row.top - above.bottom).toFixed(1)}u apart`);
    for (const id of row.members) assert.ok(byId.get(id).top > above.bottom, `${id} reaches into the row above`);
  }
});

test('branches leave the stalk apart from each other', () => {
  const ys = plant.rows.map((r) => r.y).sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] >= 2.99);
});

test('the plant is tall enough for everything on it, and the first row clears the heading', () => {
  for (const row of plant.rows) assert.ok(row.bottom < plant.height);
  for (const row of plant.rows) assert.ok(row.top >= 10, `${row.gig.id} starts at ${row.top}`);
});

test('a new show at the top leaves every older row as it is', () => {
  const newest = { id: 'brand-new', venue: 'Brand New Club', city: 'Munich', seed: 'brand-new|Brand New Club|Munich|2025-01-10', cover: { width: 1600, height: 1067 } };
  const grown = layoutPlant([newest, ...gigs], { where });
  const before = new Map(plant.rows.map((r) => [r.gig.id, r]));
  // the show that was alone at the top now shares its row with the new one;
  // everything older keeps its side and its column
  for (const row of grown.rows) {
    if (row.gig.id === 'brand-new' || row.gig.id === gigs[0].id) continue;
    const old = before.get(row.gig.id);
    assert.equal(row.side, old.side, row.gig.id);
    assert.ok(Math.abs((row.photo?.x0 ?? 0) - (old.photo?.x0 ?? 0)) < 0.01, row.gig.id);
  }
});

test('a single show, two or three still make a plant', () => {
  for (const count of [1, 2, 3]) {
    const small = layoutPlant(makeGigs(count), { where });
    assert.equal(small.rows.length, count);
    assert.ok(small.height > 30);
  }
});

test('branches climb all the way: they never run flat, and leave the stalk at a sharp angle', () => {
  for (const row of plant.rows) {
    const s = slopes(row.curve);
    assert.ok(Math.min(...s) >= MIN_SLOPE - 0.5, `${row.gig.id} flattens to ${Math.min(...s).toFixed(1)}°`);
    assert.ok(s[0] >= 55, `${row.gig.id} leaves the stalk at ${s[0].toFixed(1)}°`);
  }
});

test('the rose branches out: a bud or two beside every rose, and shoots off the stalk', () => {
  for (const row of plant.rows) {
    const sprays = String(row.branch).split('class="spray"').length - 1;
    assert.ok(sprays >= 1 && sprays <= 2, `${row.gig.id} has ${sprays} buds beside its rose`);
  }
  const shoots = String(plant.stalk).split('class="sprig"').length - 1;
  assert.ok(shoots >= 10, `${shoots} shoots off the stalk`);
});
