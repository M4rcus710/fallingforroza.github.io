// Draws the stalk for narrow screens: one tile, 64 × 1260 px, repeated down
// the page (.plant::before in assets/css/site.css). The stem wiggles gently;
// a few shoots grow off its left side into the page margin, each different,
// some ending in a bud. Prints the CSS background image to paste there
// (--stalk-tile; with "dark", the one for dark mode):
//
//   node scripts/narrow-stalk.js
//   node scripts/narrow-stalk.js dark
const DEG = Math.PI / 180;
const f = (v) => (Math.round(v * 10) / 10).toString();
// the plant's colour and the colour of the cuts (the page behind it)
const dark = process.argv[2] === 'dark';
const INK = dark ? '#f3eee5' : '#1d1a1a';
const PAPER = dark ? '#221e1a' : '#efe8dc';
const parts = [];

// shoot: tapering filled shape along a gently bending line
function shoot(x, y, angle, length, width, bend, forks = [], bud = null) {
  const steps = 10;
  const line = [{ x, y, a: angle }];
  for (let i = 1; i <= steps; i++) {
    const a = (angle + bend * ((i - 0.5) / steps)) * DEG;
    const p = line[i - 1];
    line.push({ x: p.x + (Math.cos(a) * length) / steps, y: p.y + (Math.sin(a) * length) / steps, a: angle + (bend * i) / steps });
  }
  const half = (i) => (width / 2) * (1 - 0.55 * (i / steps));
  const side = (s) => line.map((p, i) => { const n = (p.a + 90) * DEG; return [p.x + Math.cos(n) * half(i) * s, p.y + Math.sin(n) * half(i) * s]; });
  const tip = line[steps];
  const pt = [tip.x + Math.cos(tip.a * DEG) * half(steps) * 1.6, tip.y + Math.sin(tip.a * DEG) * half(steps) * 1.6];
  const pts = [...side(1), pt, ...side(-1).reverse()];
  parts.push(`<path d='M${pts.map(([a, b]) => `${f(a)} ${f(b)}`).join('L')}Z' fill='${INK}'/>`);
  for (const [t, turn, len, childBud] of forks) {
    const i = Math.round(t * steps);
    shoot(line[i].x, line[i].y, line[i].a + turn, len, half(i) * 1.7, -turn * 0.3, [], childBud);
  }
  if (bud) budAt(tip.x, tip.y, tip.a, bud);
}

// a small closed bud with its sepals, pointing at angle; open: 0 or a little open
function budAt(x, y, angle, { size = 10, open = 0 }) {
  const k = size / 10;
  const w = 3.2 + open * 2.2;
  const body = `M0 0C${-w} -2 ${-w - 0.4} -6 ${-open * 1.6} -10C0 ${-9 + open} 0 ${-9 + open} ${open * 1.6} -10C${w + 0.4} -6 ${w} -2 0 0Z`;
  const sepal = 'M0 -0.4C-2.2 -2 -4.2 -4.4 -4.8 -7.4C-2.8 -5.4 -1.4 -3.8 0 -2.8Z';
  parts.push(
    `<g transform='translate(${f(x)} ${f(y)}) rotate(${f(angle + 90)}) scale(${k})'>` +
      `<path d='${body}' fill='${INK}' stroke='${PAPER}' stroke-width='.6' stroke-linejoin='round'/>` +
      `<path d='M${f(-1.2 - open)} -8.6C0.4 -6.6 0.8 -3.4 0 -0.8' fill='none' stroke='${PAPER}' stroke-width='.55'/>` +
      `<path d='${sepal}' fill='${INK}' stroke='${PAPER}' stroke-width='.5'/><path d='${sepal}' transform='scale(-1 1)' fill='${INK}' stroke='${PAPER}' stroke-width='.5'/>` +
      `<path d='M0 1.6C-1.4 1.4 -1.6 -0.6 0 -1C1.6 -0.6 1.4 1.4 0 1.6Z' fill='${INK}'/></g>`,
  );
}

// where the stem is at height y (the same curve as the path below)
const stemX = (y) => {
  const t = (y % 420) / 420;
  return (1 - t) ** 3 * 32 + 3 * (1 - t) ** 2 * t * 36 + 3 * (1 - t) * t * t * 28 + t ** 3 * 32;
};

// the shoots: up and out to the left, each its own shape
shoot(stemX(150), 150, -128, 29, 3, -14, [[0.48, -26, 12, null]], { size: 11.5 });
shoot(stemX(470), 470, -118, 23, 2.8, 10, [], { size: 10.5, open: 0.7 });
shoot(stemX(760), 760, -136, 30, 3.1, 12, [[0.4, 28, 11, { size: 8.5 }], [0.7, -30, 8, null]], null);
shoot(stemX(1080), 1080, -112, 19, 2.6, -18, [[0.55, -34, 9, null]], { size: 10, open: 0.3 });

// prickles, alternating sides, unevenly spaced
const prickles = [[40, -1], [118, 1], [236, 1], [330, -1], [404, 1], [552, -1], [640, 1], [700, -1], [856, 1], [948, -1], [1010, 1], [1176, 1], [1230, -1]];
const thorns = prickles.map(([y, s]) => `M${f(stemX(y) + s * 1.6)} ${y}l${8 * s} -7 ${-4 * s} 11z`).join('');

const svg =
  `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='1260'>` +
  parts.join('') +
  `<path d='M32 0C36 105 28 315 32 420S28 735 32 840S28 1155 32 1260' fill='none' stroke='${INK}' stroke-width='5.5'/>` +
  `<path d='${thorns}' fill='${INK}'/></svg>`;
const encoded = svg.replace(/%/g, '%25').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23');
console.log(`url("data:image/svg+xml,${encoded}")`);
