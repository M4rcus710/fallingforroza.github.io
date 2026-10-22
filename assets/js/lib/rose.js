// Every show gets its own rose, grown from a seed (id, venue, city, date).
// Same seed, same rose – at build time in Node and in the browser.
//
// The rose is a small 3D model: rings of cupped petals around the stem axis,
// plus sepals and the hip below them. `open` runs from 0 (a closed bud) to 1
// (as open as this particular rose gets); petals tilt outwards and roll back
// as it grows. Each frame is projected to 2D, drawn back to front, and shaded
// by whether we see the outside or the inside of a petal. Colours come from
// CSS (.rose-petal, .rose-rim, .rose-sepal, .rose-hip): black, stencil-cut.
//
// No two roses are built alike: the number of rings and petals, how cupped or
// flat they open, how far the outer petals roll back, round or pointed petal
// tips, how wide open the rose ends up and the angle we see it from all come
// from the seed.

const DEG = Math.PI / 180;

/** FNV-1a: turns any string into a 32-bit number. */
export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small, fast, seedable random number generator. */
export function randomFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const clamp = (v) => Math.min(1, Math.max(0, v));

/** Everything random about a rose, worked out once from its seed. */
export function growRose(seedText) {
  const rnd = randomFrom(hash(seedText));
  const j = (amount) => (rnd() - 0.5) * 2 * amount;
  const pick = (lo, hi) => lo + rnd() * (hi - lo);

  const rings = 4 + Math.floor(rnd() * 3); // 4–6 rings of petals
  const cup = rnd(); // 0: opens flat and wide … 1: stays a deep cup
  const curl = pick(0.5, 1.4); // how far the outer petals roll back
  const tip = rnd() < 0.4 ? 'pointed' : rnd() < 0.5 ? 'notched' : 'round';
  const fullness = pick(0.85, 1.25); // petal width
  const rose = {
    seed: seedText,
    bloom: pick(0.6, 1), // how open it is in full bloom
    elevation: pick(6, 40) * DEG, // seen from the side … from above
    roll: j(12), // head tilt in degrees, for the page to apply
    size: pick(0.8, 1.22), // relative size, for the page to apply
    turn: rnd() * Math.PI * 2,
    tip,
    petals: [],
    sepals: [],
  };

  let offset = rnd() * 360;
  for (let ring = 0; ring < rings; ring++) {
    const t = ring / (rings - 1);
    const count = Math.max(3, Math.round(3 + t * 2.6 + j(0.7)));
    offset += 137.5 + j(18);
    for (let i = 0; i < count; i++) {
      rose.petals.push({
        kind: 'petal',
        ring: ring / (rings - 1), // 0 innermost … 1 outermost
        phi: (offset + (i * 360) / count + j(10)) * DEG,
        width: (Math.PI / count) * (1.75 - 0.5 * t) * fullness * (1 + j(0.1)),
        length: (0.42 + 0.58 * t) * (1 + j(0.07)),
        budTilt: (10 + 20 * t) * DEG,
        budBend: -(26 + 32 * t) * DEG,
        tilt: (lerp(6, 62, Math.pow(t, 1.15)) * (1 - 0.4 * cup) + j(6)) * DEG,
        bend: (lerp(-16, 70, Math.pow(t, 1.4)) * curl * (1 - 0.3 * cup) + j(10)) * DEG,
        lean: j(0.12), // a slightly crooked petal
      });
    }
  }

  const sepalCount = rnd() < 0.3 ? 4 : 5;
  const sepalOffset = rnd() * 360;
  for (let i = 0; i < sepalCount; i++) {
    rose.sepals.push({
      kind: 'sepal',
      ring: -1,
      phi: (sepalOffset + (i * 360) / sepalCount + j(10)) * DEG,
      width: 0.3 + j(0.06),
      length: 0.48 + j(0.12),
      budTilt: 30 * DEG,
      budBend: -20 * DEG,
      tilt: (96 + j(18)) * DEG,
      bend: (50 + j(25)) * DEG,
      lean: j(0.2),
    });
  }
  rose.petalCount = rose.petals.length;
  return rose;
}

// The outline across the top of a petal, for u from -1 to 1 (0 is the middle).
function tipProfile(kind, u) {
  const round = Math.sqrt(Math.max(0, 1 - u * u));
  if (kind === 'pointed') return round * 0.35 + (1 - Math.pow(Math.abs(u), 1.15)) * 0.65;
  if (kind === 'notched') return round - 0.22 * Math.exp(-((u / 0.2) ** 2));
  return round;
}

// A point on a petal's surface: u runs across it (-1..1), v from base to tip (0..1).
function surfacePoint(p, u, v, open, turn) {
  const t = ease(open);
  const tilt = lerp(p.budTilt, p.tilt, t);
  const bend = lerp(p.budBend, p.bend, t);
  const steps = 8;
  let rho = 0.04;
  let z = 0;
  const ds = (p.length * v) / steps;
  for (let s = 0; s < steps; s++) {
    const along = ((s + 0.5) / steps) * v;
    const angle = tilt + bend * Math.pow(along, 1.5);
    rho += Math.sin(angle) * ds;
    z += Math.cos(angle) * ds;
  }
  const profile =
    p.kind === 'sepal'
      ? Math.sin(Math.min(v / 0.3, 1) * (Math.PI / 2)) * Math.pow(1 - v, 0.8)
      : 0.32 + 0.68 * Math.sin(Math.min(v / 0.8, 1) * (Math.PI / 2));
  const phi = p.phi + (u * profile + p.lean * v) * p.width + turn;
  return { x: rho * Math.sin(phi), d: rho * Math.cos(phi), z };
}

const SCALE = 100;
function projector(elevation) {
  const c = Math.cos(elevation);
  const s = Math.sin(elevation);
  return (q) => [q.x * SCALE, (-q.z * c + q.d * s) * SCALE, q.d * c + q.z * s];
}

const fine = (v) => (Math.round(v * 10) / 10).toString();
const whole = (v) => Math.round(v).toString();

/** A smooth closed path through the points (Catmull-Rom as cubic Béziers). */
function smoothPath(points, f = fine) {
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    d +=
      `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

/** The shapes of a rose at a given openness, in drawing order (back to front). */
function shapes(rose, open, turnBy, rings, f = fine) {
  const turn = rose.turn + turnBy;
  const project = projector(rose.elevation);
  const P = (p, u, v) => project(surfacePoint(p, u, v, open, turn));
  // only the outermost rings, if asked: in a bud the inner ones are hidden anyway
  const ringValues = [...new Set(rose.petals.map((p) => p.ring))].sort((a, b) => b - a);
  const innermost = rings ? ringValues[Math.min(rings, ringValues.length) - 1] : 0;
  const petals = rose.petals.filter((p) => p.ring >= innermost);
  const all = [...rose.sepals, ...petals].map((p) => {
    const cap = p.kind === 'sepal' ? 1 : 0.84; // where the top edge starts
    const left = [];
    const right = [];
    for (let i = 0; i <= 5; i++) {
      left.push(P(p, -1, (cap * i) / 5));
      right.push(P(p, 1, (cap * (5 - i)) / 5));
    }
    const top = [];
    if (p.kind === 'sepal') top.push(P(p, 0, 1));
    else {
      for (let i = 1; i < 6; i++) {
        const u = -Math.cos((i / 6) * Math.PI);
        top.push(P(p, u, cap + (1 - cap) * tipProfile(rose.tip, u)));
      }
    }
    const outline = smoothPath([...left, ...top, ...right], f);
    let rim = '';
    if (p.kind === 'petal') {
      // the rolled-over edge: a band along the top of the petal
      const inner = [];
      for (let i = 6; i >= 0; i--) {
        const u = -Math.cos((i / 6) * Math.PI) * 0.86;
        inner.push(P(p, u, cap - 0.06 + (1 - cap) * 0.8 * tipProfile(rose.tip, u)));
      }
      rim = smoothPath([P(p, -1, cap), ...top, P(p, 1, cap), ...inner], f);
    }
    const centre = P(p, 0, 0.55);
    return { p, outline, rim, depth: centre[2], facing: Math.cos(p.phi + turn) };
  });
  return all.sort((a, b) => a.depth - b.depth);
}

/**
 * The inside of a rose's <svg>, for redrawing it while it opens. For small
 * buds: `rings` draws only that many of the outermost rings of petals, `small`
 * rounds to whole units (a unit is well under a pixel there), and `rims: false`
 * leaves out the rolled edges (they only show once a bud starts to open).
 */
export function roseShapes(rose, { open = 1, turnBy = 0, rings = 0, small = false, rims = true } = {}) {
  const hip = '<path class="rose-hip" d="M0 -4C9 -4 10 6 6 13C4 17 2 19 0 19C-2 19 -4 17 -6 13C-10 6 -9 -4 0 -4Z"/>';
  return (
    hip +
    shapes(rose, clamp(open), turnBy, rings, small ? whole : fine)
      .map((s) => {
        if (s.p.kind === 'sepal') return `<path class="rose-sepal" d="${s.outline}"/>`;
        const side = s.facing < -0.15 ? 'in' : 'out';
        const tone = Math.max(0, Math.min(4, Math.round((s.facing + 1) * 2)));
        const core = s.p.ring < 0.3 ? ' core' : '';
        const petal = `<path class="rose-petal ${side} t${tone}${core}" d="${s.outline}"/>`;
        return rims ? `${petal}<path class="rose-rim ${side}" d="${s.rim}"/>` : petal;
      })
      .join('')
  );
}

export const ROSE_VIEWBOX = '-110 -125 220 190';

/**
 * A rose as inline SVG. `open` 0 is a bud; 1 is as open as this rose gets
 * (its own `bloom`), so roses don't all end up looking the same.
 * Pass a label to make it an image for screen readers; otherwise it's decoration.
 */
export function roseSvg(seedText, { className = 'rose', open = 1, turnBy = 0, label = '', attrs = '' } = {}) {
  const rose = growRose(seedText);
  const a11y = label
    ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"`
    : 'aria-hidden="true" focusable="false"';
  return (
    `<svg class="${className}" viewBox="${ROSE_VIEWBOX}" ${a11y} data-seed="${seedText.replace(/"/g, '&quot;')}" data-open="${open}"${attrs ? ` ${attrs}` : ''}>` +
    roseShapes(rose, { open: open * rose.bloom, turnBy }) +
    `</svg>`
  );
}
