import { test } from 'node:test';
import assert from 'node:assert/strict';
import { growRose, roseSvg, roseShapes } from '../assets/js/lib/rose.js';

test('the same show always grows the same rose', () => {
  const seed = 'strom|Strom|Munich|2025';
  assert.equal(roseSvg(seed), roseSvg(seed));
  assert.equal(roseSvg(seed, { open: 0.06 }), roseSvg(seed, { open: 0.06 }));
});

test('different shows grow different roses', () => {
  assert.notEqual(roseSvg('strom|Strom|Munich|2025'), roseSvg('quax|Quax|Munich|2025'));
});

test('a bud is not the open rose, and opening it changes the drawing', () => {
  const rose = growRose('seed');
  assert.notEqual(roseShapes(rose, { open: 0 }), roseShapes(rose, { open: 1 }));
  assert.notEqual(roseShapes(rose, { open: 0.5 }), roseShapes(rose, { open: 0.51 }));
});

test('every rose is well-formed at every stage, whatever the seed', () => {
  for (let i = 0; i < 120; i++) {
    const rose = growRose(`seed-${i}`);
    assert.ok(rose.petals.length >= 12 && rose.petals.length <= 36, `${rose.petals.length} petals`);
    assert.ok(rose.sepals.length === 4 || rose.sepals.length === 5);
    assert.ok(rose.bloom >= 0.6 && rose.bloom <= 1);
    for (const open of [0, 0.25, 0.5, 0.75, 1]) {
      const shapes = roseShapes(rose, { open, turnBy: i / 10 });
      assert.doesNotMatch(shapes, /NaN|undefined|Infinity/);
      assert.equal((shapes.match(/class="rose-petal /g) || []).length, rose.petals.length);
      assert.equal((shapes.match(/class="rose-sepal"/g) || []).length, rose.sepals.length);
      assert.equal((shapes.match(/class="rose-hip"/g) || []).length, 1);
    }
  }
});

test('roses really differ from each other, not just a little', () => {
  const roses = Array.from({ length: 60 }, (_, i) => growRose(`variety-${i}`));
  const distinct = (key) => new Set(roses.map((r) => r[key])).size;
  assert.ok(distinct('petalCount') >= 8, 'petal counts vary');
  assert.equal(distinct('tip'), 3, 'round, pointed and notched petals all occur');
  const spread = (key) => Math.max(...roses.map((r) => r[key])) - Math.min(...roses.map((r) => r[key]));
  assert.ok(spread('bloom') > 0.3, 'some open wide, some stay half-open');
  assert.ok(spread('elevation') > 0.45, 'seen from the side and from above');
  assert.ok(spread('size') > 0.3, 'big and small');
});

test('the SVG remembers its seed and openness, so the browser can keep growing it', () => {
  const svg = roseSvg('Quax "live"', { open: 0.3 });
  assert.match(svg, /data-seed="Quax &quot;live&quot;"/);
  assert.match(svg, /data-open="0.3"/);
});

test('a rose can be labelled for screen readers, otherwise it is hidden from them', () => {
  assert.match(roseSvg('x'), /aria-hidden="true"/);
  assert.match(roseSvg('x', { label: 'Rose for "Strom"' }), /role="img" aria-label="Rose for &quot;Strom&quot;"/);
});
