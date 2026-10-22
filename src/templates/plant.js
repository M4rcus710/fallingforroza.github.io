// The homepage plant, worked out at build time.
//
// Wide screens: the shows sit in a grid, two to a row, a wide photo and a
// narrow one, as on the band's first site. One stalk winds down the page,
// up the gap between the photos of each row and over to the next. Every
// show grows on its own branch: a black rose at the end, sitting on the top
// edge of a photo of the night, plain and straight, the venue written
// underneath. Shows without photos just get their name.
// Measures are in "u", one hundredth of the plant's width (--u in site.css),
// so the plant fills wide screens; text keeps its size, so its room is
// measured for the narrowest wide screen, where text takes the most space.
// Narrow screens: the stalk runs down the left edge and the shows follow
// each other in normal flow.
//
// Everything random comes from each show's seed, so the plant only changes
// where the content changes.

import { raw } from '../lib/html.js';
import { hash, randomFrom, growRose, roseShapes } from '../../assets/js/lib/rose.js';

const DEG = Math.PI / 180;
const U = 10; // SVG units per u
const r2 = (v) => Math.round(v * 100) / 100;
const s1 = (v) => (Math.round(v * 10) / 10).toString();

// The rose box: viewBox 220×190 with the base of the flower at 50% / 65.79%.
const ROSE_RATIO = 190 / 220;
const ROSE_BASE = 125 / 190;

/* ---------- drawing ---------- */

function bezier([p0, p1, p2, p3], t) {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return { x, y, angle: Math.atan2(dy, dx) / DEG };
}

/** One leaflet along +x from its base: oval, widest near the base, with a serrated edge. */
function leafletPath(length, width) {
  const steps = 12;
  const edge = [];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const half = width * Math.pow(Math.sin(Math.PI * t), 0.8) * (1 - 0.3 * t);
    const notch = i % 2 === 1; // every other point sits a little inside: the teeth
    edge.push([t * length + (notch ? length * 0.025 : 0), notch ? half * 0.84 : half]);
  }
  const upper = edge.map(([x, y]) => `L${s1(x)} ${s1(-y)}`).join('');
  const lower = [...edge].reverse().map(([x, y]) => `L${s1(x)} ${s1(y)}`).join('');
  return `M0 0${upper}L${s1(length)} 0${lower}Z`;
}

/** A rose leaf: a leaf stalk with three or five serrated leaflets, along +x. */
function compoundLeaf(rnd, size) {
  const stalk = (20 + rnd() * 10) * size;
  const terminal = (13 + rnd() * 5) * size;
  const blade = (x, angle, length) =>
    `<g transform="translate(${s1(x)} 0) rotate(${s1(angle)})">` +
    `<path class="leaf__blade" d="${leafletPath(length, length * (0.46 + rnd() * 0.1))}"/>` +
    `<path class="leaf__vein" d="M1 0L${s1(length * 0.8)} 0"/></g>`;
  let out = `<path class="leaf__stalk" d="M0 0L${s1(stalk)} 0"/>`;
  const pairs = rnd() < 0.55 ? [0.42, 0.78] : [0.7];
  for (const t of pairs) {
    const length = terminal * (0.68 + t * 0.22);
    const angle = 48 + rnd() * 18;
    out += blade(stalk * t, -angle, length) + blade(stalk * t, angle + (rnd() - 0.5) * 8, length);
  }
  return out + blade(stalk, (rnd() - 0.5) * 12, terminal);
}

/** No part of a branch is flatter than this (degrees above horizontal). */
export const MIN_SLOPE = 28;

/** A rose prickle: a wide base on the stem and a hooked point that bends back. */
const PRICKLE = 'M-3.5 0Q-2.5 -4 -5.5 -8.5Q0.5 -5 3.5 0Z';

/** A smooth path through points (quadratic curves through their midpoints). */
function pathThrough(points) {
  let d = `M${s1(points[0][0])} ${s1(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    d += `Q${s1(x)} ${s1(y)} ${s1((x + nx) / 2)} ${s1((y + ny) / 2)}`;
  }
  const last = points[points.length - 1];
  return `${d}L${s1(last[0])} ${s1(last[1])}`;
}

/**
 * A piece of stem: black, with a paper-coloured cut around it where it lies
 * over something (site.css: .strand). `w` is its width. On branches, a and b
 * say where along the branch the piece starts and ends (0 at the stalk, 1 at
 * the rose), so the pieces grow in turn.
 */
function strand(d, w, { a = 0, b = 1, grow = false, cut = true } = {}) {
  const attrs = `${grow ? ' pathLength="1"' : ''} style="--w:${s1(w)}${grow ? `;--a:${r2(a)};--b:${r2(b)}` : ''}"`;
  return (cut ? `<path class="strand strand--out"${attrs} d="${d}"/>` : '') + `<path class="strand strand--body"${attrs} d="${d}"/>`;
}

/**
 * A small bud at x y, pointing at `angle` (degrees; -90 is straight up),
 * `size` SVG units long; drawn with the show roses' model, from its own seed,
 * so no two are alike. Now and then one has started to open.
 */
function bud(rnd, x, y, angle, size) {
  const scale = size / 110; // a closed bud is about 110 units long
  const open = rnd() < 0.18 ? 0.4 + rnd() * 0.3 : rnd() * 0.22;
  // only what shows from outside: a closed bud is its outer ring or two of
  // petals; one that has started to open shows a little more, rims and all
  const closed = open < 0.3;
  const rings = closed ? 2 : 3;
  return (
    `<g class="sprig__bud" transform="translate(${s1(x)} ${s1(y)}) rotate(${s1(angle + 90)}) scale(${r2(scale)})" style="--cut:${r2(0.6 / scale)}">` +
    `${roseShapes(growRose(`bud:${Math.floor(rnd() * 1e9)}`), { open, rings, small: true, rims: !closed })}</g>`
  );
}

/**
 * A little shoot from x y (SVG units), heading at `angle` (degrees; -90 is
 * straight up), `length` long: it bends a little, tapers to a point, forks
 * into smaller shoots (`depth` times over) and often ends in a bud. Returns
 * its drawing and the points it covers, to keep it clear of everything else.
 */
function shoot(rnd, { x, y, angle, length, width, depth = 0, budChance = 0.55, leaf = false }) {
  const steps = 14;
  const bend = (rnd() - 0.5) * 56;
  const line = [{ x, y, angle }];
  for (let i = 1; i <= steps; i++) {
    const a = (angle + bend * ((i - 0.5) / steps)) * DEG;
    const last = line[i - 1];
    line.push({ x: last.x + (Math.cos(a) * length) / steps, y: last.y + (Math.sin(a) * length) / steps, angle: angle + (bend * i) / steps });
  }
  const half = (i) => (width / 2) * (1 - 0.52 * (i / steps));
  const side = (sign) =>
    line.map((p, i) => {
      const n = (p.angle + 90) * DEG;
      return [p.x + Math.cos(n) * half(i) * sign, p.y + Math.sin(n) * half(i) * sign];
    });
  const tip = line[steps];
  const point = [tip.x + Math.cos(tip.angle * DEG) * half(steps) * 1.6, tip.y + Math.sin(tip.angle * DEG) * half(steps) * 1.6];
  const right = side(-1).reverse();
  let svg =
    `<path class="sprig__stem" d="${pathThrough(side(1))}L${s1(point[0])} ${s1(point[1])}` +
    `${pathThrough(right).replace(/^M/, 'L')}Z"/>`;
  const points = line.map((p) => [p.x, p.y]);

  // a prickle or two on the longer ones
  if (length > 40) {
    for (let i = 0, n = Math.floor(rnd() * 2.4); i < n; i++) {
      const p = line[Math.round(steps * (0.2 + rnd() * 0.55))];
      const flip = rnd() < 0.5 ? 1 : -1;
      svg += `<path class="prickle" transform="translate(${s1(p.x)} ${s1(p.y)}) rotate(${s1(p.angle)}) scale(0.62 ${0.62 * flip})" d="${PRICKLE}"/>`;
    }
  }
  if (leaf) {
    const p = line[Math.round(steps * (0.35 + rnd() * 0.3))];
    const angleOff = (rnd() < 0.5 ? -1 : 1) * (40 + rnd() * 20);
    const size = 0.55 + rnd() * 0.25;
    svg += `<g transform="translate(${s1(p.x)} ${s1(p.y)}) rotate(${s1(p.angle + angleOff)})">${compoundLeaf(rnd, size)}</g>`;
    const reach = 46 * size;
    const a = (p.angle + angleOff) * DEG;
    for (const k of [0.35, 0.7, 1]) points.push([p.x + Math.cos(a) * reach * k, p.y + Math.sin(a) * reach * k]);
  }
  // smaller shoots off this one, on alternate sides
  if (depth > 0) {
    let turn = rnd() < 0.5 ? -1 : 1;
    const forks = rnd() < 0.5 ? 2 : 1;
    for (let i = 0; i < forks; i++) {
      const at = Math.round(steps * (0.3 + ((i + rnd() * 0.8) / forks) * 0.42));
      const p = line[at];
      const child = shoot(rnd, {
        x: p.x,
        y: p.y,
        angle: p.angle + turn * (26 + rnd() * 26),
        length: length * (0.36 + rnd() * 0.24),
        width: half(at) * 2 * 0.86,
        depth: depth - 1,
        budChance: budChance * 0.8,
      });
      svg += child.svg;
      points.push(...child.points);
      turn = -turn;
    }
  }
  if (rnd() < budChance) {
    const size = 20 + rnd() * 10 + width * 2;
    svg += bud(rnd, tip.x, tip.y, tip.angle, size);
    // the space it takes: its length, and its width where an opening one spreads
    const a = tip.angle * DEG;
    const n = a + Math.PI / 2;
    for (const [along, across] of [[0.4, 0], [0.8, 0], [1.05, 0], [0.55, 0.5], [0.55, -0.5], [0.85, 0.4], [0.85, -0.4]]) {
      points.push([
        tip.x + (Math.cos(a) * along + Math.cos(n) * across) * size,
        tip.y + (Math.sin(a) * along + Math.sin(n) * across) * size,
      ]);
    }
  }
  return { svg, points };
}

/**
 * The branch from the stalk (the junction, at 0 0) to the rose (at reach, -rise),
 * in SVG units. Leaves and prickles carry --at, how far along the branch they
 * sit, so they appear as the branch grows.
 */
function branchDrawing(rnd, { reach, rise, roseWidth }) {
  const end = [reach * U, -rise * U];
  const chord = Math.hypot(end[0], end[1]);
  // like on a real rose: the branch leaves the stalk at a sharp angle (18–30°
  // off it), climbs diagonally with a gentle bow outwards, and turns up to hold
  // the flower. It never runs flatter than MIN_SLOPE anywhere along the way.
  const leaving = (60 + rnd() * 12) * DEG; // above horizontal
  const arriving = (70 + rnd() * 16) * DEG;
  let d1 = chord * (0.3 + rnd() * 0.12);
  let d2 = chord * (0.26 + rnd() * 0.12);
  const make = () => [
    [0, 0],
    [Math.cos(leaving) * d1, -Math.sin(leaving) * d1],
    [end[0] - Math.cos(arriving) * d2, end[1] + Math.sin(arriving) * d2],
    end,
  ];
  let curve = make();
  const flattest = (c) => {
    let min = 90;
    for (let i = 0; i <= 40; i++) min = Math.min(min, -bezier(c, i / 40).angle);
    return min;
  };
  for (let tries = 0; tries < 12 && flattest(curve) < MIN_SLOPE; tries++) {
    d1 *= 0.85;
    d2 *= 0.85;
    curve = make();
  }
  const width = 4.6 + rnd() * 1.4;
  // a little irregular, like a real stem; the wobble fades out at both ends
  const w1 = rnd() * 6.3;
  const w2 = rnd() * 6.3;
  const wobble = 1.2 + rnd() * 1.2;
  const stemAt = (t) => {
    const p = bezier(curve, t);
    const n = (p.angle + 90) * DEG;
    const off = wobble * Math.sin(Math.PI * t) * (0.6 * Math.sin(t * 7 + w1) + 0.4 * Math.sin(t * 13 + w2));
    return { x: p.x + Math.cos(n) * off, y: p.y + Math.sin(n) * off, angle: p.angle };
  };
  const parts = [];
  const decorate = (at, x, y, angle, markup) =>
    `<g class="leaf" style="--at:${r2(at)};transform-origin:${s1(x)}px ${s1(y)}px">` +
    `<g transform="translate(${s1(x)} ${s1(y)}) rotate(${s1(angle)})">${markup}</g></g>`;

  const leafCount = 1 + Math.floor(rnd() * 2.6);
  let side = rnd() < 0.5 ? -1 : 1;
  for (let i = 0; i < leafCount; i++) {
    const at = 0.22 + ((i + 0.3 + rnd() * 0.5) / leafCount) * 0.66;
    const p = stemAt(at);
    parts.push(decorate(at, p.x, p.y, p.angle + side * (32 + rnd() * 24), compoundLeaf(rnd, 0.7 + rnd() * 0.4)));
    side = -side;
  }
  const prickles = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < prickles; i++) {
    const at = 0.12 + rnd() * 0.76;
    const p = stemAt(at);
    const flip = rnd() < 0.5 ? 1 : -1;
    parts.push(
      `<path class="prickle" style="--at:${r2(at)}" transform="translate(${s1(p.x)} ${s1(p.y)}) rotate(${s1(p.angle)}) scale(1 ${flip})" d="${PRICKLE}"/>`,
    );
  }

  // the stem tapers from the stalk to the rose, drawn in overlapping pieces
  const piece = (a, b) => {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const p = stemAt(a + ((b - a) * i) / 12);
      pts.push([p.x, p.y]);
    }
    return pathThrough(pts);
  };
  // the paper cut around the stem starts only once the branch is clear of the
  // stalk; before that, the branch simply merges into it
  const taper = [
    [0.1, 0.42, 1],
    [0.4, 0.76, 0.8],
    [0.74, 1, 0.62],
  ].map(([a, b, k]) => strand(piece(a, b), width * k, { a, b, grow: true }));
  const joint = strand(piece(0, 0.16), width * 1.08, { a: 0, b: 0.16, grow: true, cut: false });

  // a spray, like on a real rose: one or two buds on their own little stems,
  // rising beside the flower (wide screens only; site.css). They grow while
  // the rose opens (--swell, not --branch: site.css), stem first, then bud.
  const sprays = [];
  let sprayTop = 0;
  let sprayIn = reach;
  let sprayOut = 0;
  for (const sign of rnd() < 0.55 ? [-1, 1] : [rnd() < 0.5 ? -1 : 1]) {
    const at = 0.7 + rnd() * 0.12;
    const start = stemAt(at);
    // it ends clear of the rose, to one side of it, about level with its base
    const end = [(reach + sign * (roseWidth * 0.52 + 1 + rnd() * 1.2)) * U, (-rise - rnd() * 1.4) * U];
    const angle = -90 + sign * (14 + rnd() * 20); // the bud's direction
    const reachOut = Math.hypot(end[0] - start.x, end[1] - start.y) / 3;
    const leaving = (-90 + sign * (48 + rnd() * 14)) * DEG;
    const curve = [
      [start.x, start.y],
      [start.x + Math.cos(leaving) * reachOut, start.y + Math.sin(leaving) * reachOut],
      [end[0] - Math.cos(angle * DEG) * reachOut, end[1] - Math.sin(angle * DEG) * reachOut],
      end,
    ];
    const line = Array.from({ length: 11 }, (_, i) => {
      const p = bezier(curve, i / 10);
      return [p.x, p.y];
    });
    const w = width * 0.36;
    const b = 0.55;
    const [tx, ty] = line[10];
    const size = 26 + rnd() * 8;
    sprays.push(
      '<g class="spray">' +
        strand(pathThrough(line.slice(1)), w, { a: 0, b, grow: true }) +
        strand(pathThrough(line.slice(0, 4)), w * 1.1, { a: 0, b: b * 0.3, grow: true, cut: false }) +
        `<g class="sprig" style="--at:${r2(b)};transform-origin:${s1(tx)}px ${s1(ty)}px">${bud(rnd, tx, ty, angle, size)}</g></g>`,
    );
    const tip = [tx + Math.cos(angle * DEG) * size, ty + Math.sin(angle * DEG) * size];
    for (const [x, y] of [...line, tip]) {
      sprayTop = Math.min(sprayTop, y / U);
      sprayIn = Math.min(sprayIn, x / U);
      sprayOut = Math.max(sprayOut, x / U);
    }
  }

  const svg =
    `<svg class="branch" viewBox="0 ${s1(-rise * U)} ${s1(reach * U)} ${s1(rise * U)}" aria-hidden="true" focusable="false">` +
    taper.join('') +
    joint +
    sprays.join('') +
    `${parts.join('')}</svg>`;
  return { svg, curve, stemAt, arriving: arriving / DEG, sprayTop, sprayIn, sprayOut };
}

/** The steepness of a branch along its length, for tests (degrees above horizontal). */
export function slopes(curve) {
  return Array.from({ length: 41 }, (_, i) => -bezier(curve, i / 40).angle);
}

/* ---------- measuring ---------- */

/** Roughly how many lines a text takes in a column, for a font size and average glyph width (em). */
function lines(text, columnRem, fontRem, glyphEm) {
  if (!text) return 0;
  const perLine = Math.max(1, Math.floor(columnRem / (fontRem * glyphEm)));
  let count = 1;
  let used = 0;
  for (const word of String(text).split(/\s+/)) {
    const length = word.length + (used ? 1 : 0);
    if (used + length > perLine && used > 0) {
      count++;
      used = word.length;
    } else used += length;
  }
  return count;
}

// How many u one rem is on the narrowest two-sided screen (64em wide, the
// plant 3rem narrower): there, text takes the most room relative to the plant.
const REM = 100 / (64 - 3);

/** How tall the writing under a photo is, in rem: see .gig__caption in site.css. */
function captionHeight(gig, where, widthU) {
  const inner = widthU / REM; // rem across
  const small = 0.7 * 1.6; // one line of the small uppercase type
  const next = gig.isUpcoming ? lines('Coming up · Wed 30 September', inner, 0.7, 0.74) * small + 0.1 : 0;
  const venue = lines(gig.venue, inner, 1.75, 0.5) * 1.75 * 1.12;
  const place = where ? lines(where, inner, 0.7, 0.74) * small + 0.2 : 0;
  return 0.7 + next + venue + place + 0.3; // the gap above, plus a little slack
}

/* ---------- layout ---------- */

// The grid on wide screens, as on the band's first site: every row has a
// wide photo and a narrow one, the wide one on alternate sides, their edges
// lined up. The stalk runs up the gap between the two.
const NARROW = 31; // u
const GAP = 5; // u, the gap the stalk runs up
const WIDE = 100 - NARROW - GAP;
const BETWEEN = 16; // u from one row's writing to the next row's photos: the stalk crosses over here
const CLOSE = 11; // u between rows when the stalk goes straight on (room for the roses)
const FIRST = 22; // u: where the first row's photos start, below the "On Stage" heading
const TALLEST = 4 / 3; // taller photos are cropped to 3:4

/** The random choices for one show (in u). The rest comes once it has its place. */
function grow(gig, column) {
  const rnd = randomFrom(hash(`plant:${gig.seed}`));
  const rose = growRose(gig.seed);
  const width = 11.5 * rose.size; // the rose box
  // the rose sits on the photo's top edge, in from the gap: clear of the
  // stalk, and far enough inside the photo that the buds beside it are too
  const lo = GAP / 2 + width * 0.5 + 3;
  const hi = Math.min(GAP / 2 + column - width * 0.52 - 6, lo + (column > 40 ? 12 : 8));
  const reach = lo + rnd() * Math.max(0, hi - lo);
  const rise = reach * (0.75 + rnd() * 0.25) + 1.5;
  const lift = 0.8 + rnd() * 1.2; // the photo's top edge runs this far above the rose's base
  return { rnd, rose, width, reach, rise, lift, column, card: !gig.cover };
}

/** The branch, the photo and the room it all takes, once the show has its place. */
function finish(place, gig, where, inner) {
  const { rnd, rose, width, reach, rise, column } = place;
  place.branch = branchDrawing(rnd, { reach, rise, roseWidth: width });
  // the head nods the way the branch arrives, plus its own tilt
  place.roll = (90 - place.branch.arriving) * 0.75 + rose.roll;
  // narrow screens: the photo's own small shift in from the stalk
  place.narrow = { photoShift: rnd() * 1.4 };
  place.aspect = place.card ? 0 : Math.min(gig.cover.height / gig.cover.width, TALLEST);
  if (place.card) {
    // no photo, only writing: it hangs under the rose, beyond its stem, where
    // the branch never goes
    const left = reach + 0.8;
    // (less the stalk's wobble in the gap, which isn't known yet)
    const textWidth = Math.min(21, inner + column - left - 0.7);
    place.print = { left, top: -rise + width * ROSE_RATIO * (1 - ROSE_BASE) + 0.2, width: textWidth };
    place.print.height = captionHeight(gig, where, textWidth) * REM;
  } else {
    place.print = { left: inner, top: -rise - place.lift, width: column };
    place.print.height = column * place.aspect + captionHeight(gig, where, column) * REM;
  }
  place.above = Math.min(-rise - width * ROSE_RATIO * ROSE_BASE, place.print.top, place.branch.sprayTop - 0.3);
  place.below = Math.max(-rise + width * ROSE_RATIO * (1 - ROSE_BASE), place.print.top + place.print.height + 0.3, 0.5);
  place.across = Math.max(place.print.left + place.print.width, reach + width / 2, place.branch.sprayOut);
}

/** The stalk: one black stem winding down, with prickles, the odd leaf, and
 * little shoots wherever there is room between the shows. `xAt` says where
 * it is at each height, `obstacles` are the boxes (u) everything else takes.
 * Grown with a clip (site.css). */
function stalkSvg(junctions, height, obstacles, xAt) {
  const free = (yy, margin) => junctions.every((b) => Math.abs(b - yy) > margin);
  const rnd = randomFrom(hash('stalk'));
  const centre = (yy) => xAt(yy) * U;
  const points = [];
  for (let yy = 0; yy < height; yy += 0.5) points.push([centre(yy), yy * U]);
  points.push([centre(height), height * U]);

  // what is already drawn, so nothing grows into anything else (SVG units)
  const drawn = [];
  const clear = (pts) =>
    pts.every(([px, py]) => {
      const x = px / U;
      const y = py / U;
      if (Math.abs(x) > 48 || y < 1 || y > height - 2) return false;
      if (obstacles.some((o) => x > o.x0 - 0.8 && x < o.x1 + 0.8 && y > o.y0 - 0.8 && y < o.y1 + 0.8)) return false;
      return drawn.every(([dx, dy]) => Math.hypot(dx - px, dy - py) > 14);
    });

  // little shoots: up and outwards, forking, often ending in a bud. Each
  // spot has its own seed, so one that doesn't fit leaves the others alone.
  const sprigs = [];
  let spot = 0;
  for (let yy = 7 + rnd() * 3; yy < height - 4; yy += 1.6 + rnd() * 1.8, spot++) {
    if (!free(yy, 1.6)) continue;
    const pick = randomFrom(hash(`shoot:${spot}`));
    const dir = pick() < 0.5 ? -1 : 1;
    const angle = -90 + dir * (24 + pick() * 48);
    const length = 4.5 + pick() * 7;
    const leaf = pick() < 0.3;
    const x = centre(yy);
    for (const k of [1, 0.78, 0.6, 0.45]) {
      const grown = shoot(randomFrom(hash(`shoot:${spot}:growth`)), {
        x,
        y: yy * U,
        angle,
        length: length * k * U,
        width: 3.3 + k * 0.9,
        depth: length * k > 7.5 ? 2 : 1,
        leaf,
      });
      // (its base sits in the stalk; only what grows out of it is checked)
      const out = grown.points.filter(([px, py]) => Math.hypot(px - x, py - yy * U) > 6);
      if (!clear(out)) continue;
      drawn.push(...out);
      sprigs.push(`<g class="sprig" style="--y:${r2(yy)};transform-origin:${s1(x)}px ${s1(yy * U)}px">${grown.svg}</g>`);
      break;
    }
  }

  const extras = [];
  let side = 1;
  for (let yy = 6 + rnd() * 4; yy < height - 3; yy += 4 + rnd() * 5) {
    if (!free(yy, 1.4)) continue;
    side = -side;
    const x = centre(yy) + side * 3;
    extras.push(
      `<path class="prickle" style="--y:${r2(yy)}" transform="translate(${s1(x)} ${s1(yy * U)}) rotate(${side > 0 ? -90 : 90}) scale(${side > 0 ? 1 : -1} 1)" d="${PRICKLE}"/>`,
    );
  }
  for (let yy = 10 + rnd() * 8; yy < height - 6; yy += 10 + rnd() * 12) {
    if (!free(yy, 3)) continue;
    const dir = rnd() < 0.5 ? -1 : 1;
    const x = centre(yy);
    const angle = dir > 0 ? -(38 + rnd() * 24) : 180 + 38 + rnd() * 24;
    const size = 0.95 + rnd() * 0.25;
    const a = angle * DEG;
    const along = [0.4, 0.7, 1].map((k) => [x + Math.cos(a) * 46 * size * k, yy * U + Math.sin(a) * 46 * size * k]);
    if (!clear(along)) continue;
    drawn.push(...along);
    extras.push(
      `<g class="leaf" style="--y:${r2(yy)};transform-origin:${s1(x)}px ${s1(yy * U)}px">` +
        `<g transform="translate(${s1(x)} ${s1(yy * U)}) rotate(${s1(angle)})">${compoundLeaf(rnd, size)}</g></g>`,
    );
  }
  return (
    `<svg class="stalk" viewBox="-500 0 1000 ${s1(height * U)}" preserveAspectRatio="xMidYMin meet" aria-hidden="true" focusable="false">` +
    sprigs.join('') +
    strand(pathThrough(points), 6.5, { cut: false }) +
    `${extras.join('')}</svg>`
  );
}

/**
 * Places every show (newest first). Returns each show's side and CSS
 * variables, the stalk, the plant's height (in u), and the grid (for tests).
 */
export function layoutPlant(gigs, { where }) {
  // Rows of two, paired from the oldest show up: a new show at the top joins
  // the top row or starts a new one, and every older row stays as it is. The
  // wide photo swaps sides from row to row, counted from the bottom too; a
  // row of shows without photos (upcoming ones, mostly) has no wide photo,
  // so the stalk goes straight on instead of swinging over.
  const oldestFirst = [...gigs].reverse();
  const pairs = [];
  for (let i = 0; i < oldestFirst.length; i += 2) pairs.push(oldestFirst.slice(i, i + 2));
  let narrowLeft = false;
  const rowsDown = pairs
    .map((pair, k) => {
      if (k === 0 || pair.some((gig) => gig.cover)) narrowLeft = !narrowLeft;
      return { pair, narrowLeft };
    })
    .reverse();

  // the taller photo goes in the narrow column, so the two come out about as
  // tall as each other; a show without a photo is the tallest of all
  const tall = (gig) => (gig.cover ? gig.cover.height / gig.cover.width : 9);

  // the stalk, as stretches: straight up a gap (with a slight wobble), or
  // swinging over from one gap to the next between two rows
  const stretches = [{ y0: 0, y1: 2, x0: 0, x1: 0 }];
  const wobble = (y, s) => 0.6 * Math.sin(y / 4.7 + s.y0) * Math.sin((Math.PI * (y - s.y0)) / (s.y1 - s.y0));
  const stalkAt = (y) => {
    for (const s of stretches) {
      if (y > s.y1) continue;
      if (s.straight) return s.x0 + wobble(y, s);
      const t = Math.min(1, Math.max(0, (y - s.y0) / (s.y1 - s.y0)));
      return s.x0 + (s.x1 - s.x0) * t * t * (3 - 2 * t);
    }
    return 0;
  };

  const placed = [];
  const junctions = [];
  const grid = [];
  let top = FIRST;
  let from = { x: 0, y: 2 };
  for (const { pair, narrowLeft } of rowsDown) {
    const gap = narrowLeft ? -50 + NARROW + GAP / 2 : -50 + WIDE + GAP / 2;
    const sideOf = { narrow: narrowLeft ? 'left' : 'right', wide: narrowLeft ? 'right' : 'left' };
    let columns;
    if (pair.length === 2) {
      const [older, newer] = pair;
      columns = tall(newer) > tall(older) ? { narrow: newer, wide: older } : { narrow: older, wide: newer };
    } else columns = pair[0].cover ? { wide: pair[0] } : { narrow: pair[0] };

    stretches.push({ y0: from.y, y1: top - 1, x0: from.x, x1: gap });
    const members = Object.entries(columns).map(([column, gig]) => {
      const side = sideOf[column];
      const place = grow(gig, column === 'narrow' ? NARROW : WIDE);
      return { gig, side, dir: side === 'right' ? 1 : -1, place, y: top + place.lift + place.rise };
    });
    // branches leave the stalk at least 3u apart (the extra hundredth keeps
    // rounding from bringing them back within 3)
    if (members.length === 2 && Math.abs(members[0].y - members[1].y) < 3) {
      const lower = members[0].y > members[1].y ? members[0] : members[1];
      const push = 3.01 - Math.abs(members[0].y - members[1].y);
      lower.place.rise += push;
      lower.y += push;
    }
    const straight = { y0: top - 1, y1: 0, x0: gap, x1: gap, straight: true };
    stretches.push(straight);
    for (const m of members) {
      // the stalk at the junction (its wobble needs the row's end, so this is
      // worked out again below)
      m.inner = () => (m.dir > 0 ? gap + GAP / 2 - m.sx : m.sx - (gap - GAP / 2));
    }
    // the row ends below its lower photo and writing; that doesn't depend on
    // where exactly the stalk is, only on the shapes
    const ends = members.map((m) => {
      finish(m.place, m.gig, where(m.gig), GAP / 2);
      return m.y + m.place.below;
    });
    const bottom = Math.max(...ends);
    straight.y1 = bottom + 1;
    for (const m of members) {
      m.sx = stalkAt(m.y);
      m.place.print.left = m.place.card ? m.place.print.left : m.inner();
      junctions.push(m.y);
    }
    grid.push({ top, bottom, gap, narrowLeft, members: members.map((m) => m.gig.id) });
    placed.push(...members);
    from = { x: gap, y: bottom + 1 };
    const next = rowsDown[grid.length];
    top = bottom + 2 + (next && next.narrowLeft === narrowLeft ? CLOSE : BETWEEN);
  }
  // after the last row, back to the middle, where the roots start
  stretches.push({ y0: from.y, y1: from.y + BETWEEN, x0: from.x, x1: 0 });
  const height = from.y + BETWEEN + 3;

  const byGig = new Map(placed.map((m) => [m.gig, m]));
  return {
    height,
    grid,
    stalkAt,
    stalk: raw(
      stalkSvg(
        junctions,
        height,
        [
          // the band's rose at the top, and the "On Stage" heading
          { x0: -14, x1: 14, y0: -40, y1: 8 },
          { x0: -50, x1: -18, y0: -2, y1: 10 },
          ...placed.flatMap(({ dir, sx, y, place }) => {
            // a box from a to b out from the stalk, top to bottom from the junction
            const box = (a, b, t, bt) => ({ x0: dir > 0 ? sx + a : sx - b, x1: dir > 0 ? sx + b : sx - a, y0: y + t, y1: y + bt });
            const { print, reach, rise, width, branch } = place;
            return [
              // the photo and its writing (with room for the writing to grow
              // when someone zooms the text); the rose and its buds; the
              // branch and its leaves
              box(print.left, print.left + print.width, print.top, print.top + print.height + 4),
              // (a little wider all round: the rose leans, so its box does too)
              box(Math.min(reach - width / 2, branch.sprayIn) - 1.5, Math.max(reach + width / 2, branch.sprayOut) + 1.5, place.above - 1.5, -rise + width * ROSE_RATIO * (1 - ROSE_BASE)),
              box(0, reach + 1.5, -rise, 1),
            ];
          }),
        ],
        stalkAt,
      ),
    ),
    rows: gigs.map((gig) => {
      const { side, dir, sx, y, place } = byGig.get(gig);
      const vars = {
        '--y': y,
        '--sx': sx,
        '--reach': place.reach,
        '--rise': place.rise,
        '--rw': place.width,
        '--roll': place.roll,
        '--pl': place.print.left,
        '--pt': place.print.top,
        '--pw': place.print.width,
        '--npl': place.narrow.photoShift,
      };
      if (!place.card) vars['--ar'] = 1 / place.aspect;
      const style = Object.entries(vars)
        .map(([k, v]) => `${k}:${r2(v)}`)
        .join(';');
      // y/top/bottom/across/photo: where the show sits and how far it reaches (for tests)
      const edge = (d) => sx + dir * d;
      return {
        gig,
        side,
        style,
        card: place.card,
        branch: raw(place.branch.svg),
        rose: place.rose,
        y,
        top: y + place.above,
        bottom: y + place.below,
        across: Math.max(Math.abs(edge(place.print.left + place.print.width)), Math.abs(edge(place.reach + place.width / 2)), Math.abs(edge(place.branch.sprayOut))),
        photo: place.card
          ? null
          : { x0: Math.min(edge(place.print.left), edge(place.print.left + place.print.width)), x1: Math.max(edge(place.print.left), edge(place.print.left + place.print.width)), top: y + place.print.top },
        rosePoint: { x: edge(place.reach), y: y - place.rise },
        curve: place.branch.curve,
      };
    }),
  };
}
