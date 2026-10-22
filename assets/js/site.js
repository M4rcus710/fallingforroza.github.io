// Everything here is an extra: the pages work without it.
//   1. dates     keeps past/upcoming right between builds (buds open the day after a show)
//   2. growing   the plant grows while you scroll: branches, leaves, blooming roses
//   3. petals    touching a rose makes it drop a petal
//   4. viewer    photos of a night open full screen
//   5. spotify   players load only when asked for
//   6. 404       an address that doesn't exist still grows the rose it would have had
//   7. old links /#about from the old site lands on About
//   8. cursor    with a mouse, a dot follows the pointer; over a night it becomes a disc
//   9. dark mode the switch in the masthead; a choice is remembered on this device

import { today, countdown } from './lib/dates.js';
import { growRose, roseShapes, roseSvg } from './lib/rose.js';

const root = document.documentElement;
const growing = root.classList.contains('grow'); // set in <head> unless motion is reduced
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const todayIso = today();

const clamp = (v) => Math.min(1, Math.max(0, v));
const easeInOut = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/* ---------- roses ---------- */

const roseState = new WeakMap();

/**
 * Redraws a rose at a given openness: 0 is a bud, 1 this rose's own full
 * bloom. While opening it turns into its final pose.
 */
function drawRose(svg, open, target) {
  let state = roseState.get(svg);
  if (!state) {
    state = { model: growRose(svg.dataset.seed), open: Number(svg.dataset.open) };
    roseState.set(svg, state);
  }
  if (Math.abs(state.open - open) < 0.004) return;
  state.open = open;
  svg.innerHTML = roseShapes(state.model, { open: open * (state.model.bloom ?? 1), turnBy: (open - target) * 1.3 });
}

/** Opens a rose over time, e.g. when a page has just loaded. */
function bloom(host, from, to, duration) {
  const svg = host.querySelector('svg.rose');
  host.dataset.ready = '';
  if (!svg || !growing) return;
  const start = performance.now();
  drawRose(svg, from, to);
  const step = (now) => {
    const t = clamp((now - start) / duration);
    drawRose(svg, from + (to - from) * easeOut(t), to);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- 1. dates ---------- */

function applyDates() {
  for (const el of document.querySelectorAll('[data-upcoming-until]')) {
    if (el.dataset.upcomingUntil < todayIso) el.hidden = true;
  }
  for (const el of document.querySelectorAll('[data-past-after]')) {
    if (el.dataset.pastAfter < todayIso) el.hidden = false;
  }
  // on the homepage, a show that has happened since the last build opens in place
  const coming = [];
  for (const row of document.querySelectorAll('[data-upcoming-show]')) {
    if (row.dataset.upcomingShow < todayIso) {
      delete row.dataset.upcomingShow;
      row.querySelector('.gig__next')?.remove();
      const host = row.querySelector('[data-bloom-to]');
      if (host) host.dataset.bloomTo = '1';
    } else coming.push(row);
  }
  // the soonest one is next up (the plant lists the furthest future first)
  coming.forEach((row, i) => {
    const label = row.querySelector('[data-next-label]');
    if (label) label.textContent = i === coming.length - 1 ? 'Next up' : 'Coming up';
  });
  for (const el of document.querySelectorAll('[data-countdown]')) {
    el.textContent = countdown(el.dataset.countdown, todayIso);
  }

  const stillUpcoming = document.querySelectorAll('li[data-upcoming-until]:not([hidden])').length;
  for (const el of document.querySelectorAll('[data-empty-upcoming]')) el.hidden = stillUpcoming > 0;

  for (const badge of document.querySelectorAll('[data-upcoming-dates]')) {
    const count = badge.dataset.upcomingDates.split(' ').filter((d) => d && d >= todayIso).length;
    badge.hidden = count === 0;
    const number = badge.querySelector('[data-upcoming-count]');
    if (number) number.textContent = count;
  }

  const year = todayIso.slice(0, 4);
  for (const el of document.querySelectorAll('[data-year]')) el.textContent = year;
}

/* ---------- 2. growing ---------- */

function setUpGrowth() {
  // roses that open when the page loads (the band's rose, a night's rose)
  for (const host of document.querySelectorAll('[data-bloom-on-load]')) {
    const svg = host.querySelector('svg.rose');
    const to = Number(host.dataset.bloomTo || svg?.dataset.open || 1);
    bloom(host, host.classList.contains('crown__rose') ? 0 : 0.35, to, host.classList.contains('crown__rose') ? 2400 : 1600);
  }
  // an upcoming show's page, visited after the show: the bud opens
  for (const host of document.querySelectorAll('[data-bloom-after]')) {
    if (host.dataset.bloomAfter < todayIso) {
      host.dataset.bloomTo = host.dataset.bloomLater;
      if (growing) bloom(host, Number(host.dataset.bloomTo) * 0.1, Number(host.dataset.bloomLater), 1800);
      else drawRose(host.querySelector('svg.rose'), Number(host.dataset.bloomLater), Number(host.dataset.bloomLater));
    }
  }

  const plant = document.querySelector('[data-plant]');
  const rows = [...document.querySelectorAll('[data-grow]')];
  if (!growing || !plant) return;

  const progress = new Map();
  let stalk = 0;
  let queued = false;

  const update = () => {
    queued = false;
    const vh = window.innerHeight;
    const box = plant.getBoundingClientRect();
    const s = clamp((vh * 0.92 - box.top) / box.height);
    if (s > stalk) {
      stalk = s;
      plant.style.setProperty('--grown', s.toFixed(4));
    }
    for (const row of rows) {
      // a show starts growing as soon as its photo comes into view (on wide
      // screens the photo starts well above the branch's foot)
      const figure = row.querySelector('.gig__figure');
      const top = Math.min(row.getBoundingClientRect().top, figure ? figure.getBoundingClientRect().top : Infinity);
      const p = clamp((vh * 0.96 - top) / (vh * 0.5));
      if (p <= (progress.get(row) || 0)) continue; // things only grow
      progress.set(row, p);
      row.style.setProperty('--p', p.toFixed(3));
      const host = row.querySelector('[data-bloom-to]');
      const target = Number(host.dataset.bloomTo);
      drawRose(host.querySelector('svg.rose'), target * easeInOut(clamp((p - 0.35) / 0.6)), target);
    }
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
}

/* ---------- 3. petals ---------- */

const lastDrop = new WeakMap();

function dropPetal(svg) {
  if (reducedMotion.matches) return;
  const state = roseState.get(svg);
  const open = state ? state.open : Number(svg.dataset.open);
  if (open < 0.5) return; // buds don't lose petals
  const now = performance.now();
  if (lastDrop.has(svg) && now - lastDrop.get(svg) < 1200) return;
  lastDrop.set(svg, now);

  const petals = [...svg.querySelectorAll('.rose-petal.out:not(.core)')];
  const petal = petals[Math.floor(Math.random() * petals.length)];
  if (!petal) return;

  // a copy of the whole rose box that only shows this one petal (and its rim),
  // so it starts exactly where the petal is
  const rect = svg.getBoundingClientRect();
  const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ghost.setAttribute('class', 'rose falling-petal');
  ghost.setAttribute('viewBox', svg.getAttribute('viewBox'));
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
  ghost.append(petal.cloneNode(), petal.nextElementSibling ? petal.nextElementSibling.cloneNode() : '');
  document.body.append(ghost);

  const box = petal.getBBox();
  const vb = svg.viewBox.baseVal;
  const scale = rect.width / vb.width;
  ghost.style.transformOrigin = `${(box.x + box.width / 2 - vb.x) * scale}px ${(box.y + box.height / 2 - vb.y) * scale}px`;

  petal.animate([{ opacity: 1 }, { opacity: 0, offset: 0.04 }, { opacity: 0, offset: 0.75 }, { opacity: 1 }], { duration: 4000 });
  if (petal.nextElementSibling) {
    petal.nextElementSibling.animate([{ opacity: 1 }, { opacity: 0, offset: 0.04 }, { opacity: 0, offset: 0.75 }, { opacity: 1 }], { duration: 4000 });
  }

  // down to the bottom of the screen, swaying like paper
  const distance = window.innerHeight - rect.top + 40;
  const drift = (Math.random() - 0.5) * 140;
  const spin = (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 200);
  const frames = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const sway = Math.sin(t * Math.PI * 3) * 30 * (1 - t * 0.4);
    frames.push({
      transform: `translate(${drift * t + sway}px, ${distance * (t * t * 0.6 + t * 0.4)}px) rotate(${spin * t}deg)`,
      opacity: t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15,
    });
  }
  ghost.animate(frames, { duration: 2800 + Math.random() * 900, easing: 'linear' }).finished.then(() => ghost.remove());
}

function setUpPetals() {
  for (const host of document.querySelectorAll('[data-rose]')) {
    host.addEventListener('pointerenter', (event) => {
      const svg = host.querySelector('svg.rose');
      if (event.pointerType === 'mouse' && svg) dropPetal(svg);
    });
    // where the rose isn't a link, tapping it works on phones too
    if (host.tagName !== 'A') {
      host.addEventListener('click', () => {
        const svg = host.querySelector('svg.rose');
        if (svg) dropPetal(svg);
      });
    }
  }
}

/* ---------- 4. photo viewer ---------- */

function setUpViewer() {
  const links = [...document.querySelectorAll('[data-lightbox]')];
  if (!links.length || typeof HTMLDialogElement !== 'function') return;

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', 'Photos');
  dialog.innerHTML = `
    <div class="lightbox__bar">
      <span class="lightbox__count" aria-live="polite"></span>
      <div class="lightbox__nav">
        <button class="button" type="button" data-step="-1" aria-label="Previous photo">←</button>
        <button class="button" type="button" data-step="1" aria-label="Next photo">→</button>
        <button class="button" type="button" data-close>Close</button>
      </div>
    </div>
    <div class="lightbox__stage"><img alt=""></div>
    <p class="lightbox__caption"></p>`;
  document.body.append(dialog);

  const img = dialog.querySelector('img');
  const count = dialog.querySelector('.lightbox__count');
  const caption = dialog.querySelector('.lightbox__caption');
  let index = 0;

  const show = (i) => {
    index = (i + links.length) % links.length;
    const source = links[index].querySelector('img');
    img.src = links[index].href;
    img.alt = source.alt;
    caption.textContent = source.alt;
    count.textContent = `${index + 1} / ${links.length}`;
  };

  links.forEach((link, i) =>
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      show(i);
      dialog.showModal();
    }),
  );
  dialog.addEventListener('click', (event) => {
    const step = event.target.closest('[data-step]');
    if (step) show(index + Number(step.dataset.step));
    else if (event.target.closest('[data-close]') || event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') show(index + 1);
    if (event.key === 'ArrowLeft') show(index - 1);
  });
  let startX = null;
  dialog.addEventListener('pointerdown', (event) => (startX = event.clientX));
  dialog.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
}

/* ---------- 5. spotify ---------- */

function setUpSpotify() {
  for (const button of document.querySelectorAll('[data-spotify]')) {
    button.hidden = false;
    button.addEventListener('click', () => {
      const slot = button.closest('.record').querySelector('[data-player-slot]');
      const frame = document.createElement('iframe');
      frame.src = `https://open.spotify.com/embed/${button.dataset.spotify}?theme=0`;
      frame.height = '152';
      frame.loading = 'lazy';
      frame.title = `Spotify player: ${button.dataset.title}`;
      frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      slot.replaceChildren(frame);
      button.textContent = 'Player loaded';
      button.disabled = true;
    });
  }
}

/* ---------- 6. 404 ---------- */

function growLostRose() {
  const host = document.querySelector('[data-lost-rose]');
  if (!host) return;
  host.innerHTML = roseSvg(`lost:${decodeURIComponent(location.pathname)}`, { className: 'rose', open: 0.86 });
  if (growing) bloom(host, 0, 0.86, 2000);
}

/* ---------- 7. old links ---------- */

if (location.pathname === '/' && location.hash === '#about') location.replace('/about/');

/* ---------- 8. cursor ---------- */

function setUpCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  const icon = (name, d) => `<svg class="cursor__${name}" viewBox="0 0 24 24"><path d="${d}"/></svg>`;
  cursor.innerHTML =
    '<div class="cursor__dot"></div><div class="cursor__disc">' +
    icon('open', 'M6.5 17.5L17.5 6.5M8.5 6.5h9v9') +
    icon('zoom', 'M12 4.5v15M4.5 12h15') +
    '</div>';
  document.body.append(cursor);
  root.classList.add('has-cursor');
  const disc = cursor.querySelector('.cursor__disc');

  const instant = reducedMotion.matches;
  let x = 0;
  let y = 0;
  let cx = 0;
  let cy = 0;
  let size = 0;
  let target = 0;
  let pointer = false;
  let running = false;

  const show = (element) => {
    const closest = (selector) => element && element.closest && element.closest(selector);
    const host = closest('[data-cursor]');
    target = host ? 1 : 0;
    if (host) cursor.dataset.mode = host.dataset.cursor;
    cursor.classList.toggle('is-on', Boolean(host));
    // over any other link or button the dot opens into a ring
    cursor.classList.toggle('is-link', !host && Boolean(closest('a, button, summary, label')));
  };
  // a little dot follows the pointer with a spring; over a night it grows
  // into a disc that says what a click does
  const frame = () => {
    cx += (x - cx) * (instant ? 1 : 0.24);
    cy += (y - cy) * (instant ? 1 : 0.24);
    size += (target - size) * (instant ? 1 : 0.2);
    cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    disc.style.transform = `scale(${(0.2 + 0.8 * size).toFixed(3)})`;
    if (Math.abs(x - cx) + Math.abs(y - cy) > 0.2 || Math.abs(target - size) > 0.005) requestAnimationFrame(frame);
    else running = false;
  };
  const kick = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  };

  addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      x = event.clientX;
      y = event.clientY;
      if (!pointer) {
        cx = x;
        cy = y;
        pointer = true;
        cursor.classList.add('is-in');
      }
      // the photo viewer is a modal dialog, drawn above everything else on
      // the page: while it's open, the cursor lives inside it
      const layer = document.querySelector('dialog[open]') || document.body;
      if (cursor.parentNode !== layer) layer.append(cursor);
      show(event.target);
      kick();
    },
    { passive: true },
  );
  // scrolling moves things under a resting pointer
  addEventListener(
    'scroll',
    () => {
      if (!pointer) return;
      show(document.elementFromPoint(x, y));
      kick();
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => {
    pointer = false;
    cursor.classList.remove('is-in');
    show(null);
    kick();
  });
}

/* ---------- 9. dark mode ---------- */

function setUpTheme() {
  const button = document.querySelector('[data-theme-toggle]');
  if (!button) return;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const current = () => root.dataset.theme || (system.matches ? 'dark' : 'light');
  const paint = () => {
    const dark = current() === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = dark ? '#221e1a' : '#efe8dc';
  };
  button.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    // picking what the system says anyway goes back to following the system
    const follow = next === (system.matches ? 'dark' : 'light');
    if (follow) delete root.dataset.theme;
    else root.dataset.theme = next;
    try {
      if (follow) localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
    } catch {
      // private browsing: the choice lasts for this page only
    }
    paint();
  });
  system.addEventListener('change', paint);
  button.hidden = false;
  paint();
}

applyDates();
growLostRose();
setUpGrowth();
setUpPetals();
setUpViewer();
setUpSpotify();
setUpCursor();
setUpTheme();
root.classList.add('grow-ready');
