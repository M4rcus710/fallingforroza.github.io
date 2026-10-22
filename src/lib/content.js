// Loads content/*.json, checks it, and prepares it for the templates.
// Mistakes in gigs.json stop the build with a message that says what to fix.

import fs from 'node:fs';
import path from 'node:path';
import { parseShowDate, splitShows } from '../../assets/js/lib/dates.js';
import { growRose } from '../../assets/js/lib/rose.js';
import { imageSize } from './images.js';

export const GIG_FIELDS = ['id', 'placeholder', 'date', 'time', 'venue', 'city', 'event', 'story', 'info', 'tickets', 'link', 'press', 'photos'];

/** Straight apostrophes typed into the JSON become real ones: it's → it’s. */
const typeset = (text) => (typeof text === 'string' ? text.replace(/(\p{L})'(\p{L})/gu, '$1’$2') : text);

function readJson(file) {
  const text = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(text);
  } catch (error) {
    // point at the line, JSON.parse only gives a character position
    const at = Number(/position (\d+)/.exec(error.message)?.[1]);
    const line = Number.isFinite(at) ? text.slice(0, at).split('\n').length : '?';
    throw new Error(`${file} isn't valid JSON (around line ${line}): ${error.message}\n` +
      'Often a missing or extra comma, or a missing quote.');
  }
}

/**
 * A photo is either a path from the site's root ("/assets/gigs/strom/cover.webp",
 * as the editor writes it) or just a file name in the show's own folder,
 * assets/gigs/<id>/ ("cover.webp").
 */
function photoInfo(root, gigId, photo) {
  const relative = photo.file.startsWith('/')
    ? photo.file.slice(1)
    : photo.file.includes('/')
      ? photo.file
      : `assets/gigs/${gigId}/${photo.file}`;
  if (!relative.startsWith('assets/') || relative.split('/').includes('..')) {
    throw new Error(`photo ${photo.file} must be in assets/`);
  }
  if (!/\.(webp|jpe?g|png|avif)$/i.test(relative)) {
    throw new Error(`photo ${photo.file}: use a JPG, PNG or WebP (HEIC photos from iPhones don't show in most browsers; share them as JPG)`);
  }
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) throw new Error(`photo ${relative} doesn't exist`);
  const { width, height } = imageSize(file);
  const dir = path.dirname(file);
  const ext = path.extname(file);
  const smallName = `${path.basename(file, ext)}-800${ext}`;
  const small = fs.existsSync(path.join(dir, smallName)) ? smallName : null;
  const url = (name) => `/${path.posix.dirname(relative)}/${name}`;
  const smallSize = small ? imageSize(path.join(dir, small)) : null;
  return {
    src: `/${relative}`,
    alt: photo.alt,
    width,
    height,
    srcset: small ? `${url(small)} ${smallSize.width}w, /${relative} ${width}w` : null,
  };
}

export function loadContent(root, { todayIso, gigsFile = path.join(root, 'content', 'gigs.json') }) {
  const site = readJson(path.join(root, 'content', 'site.json'));
  const data = readJson(gigsFile);
  const gigsName = path.relative(root, gigsFile);
  if (!Array.isArray(data.gigs)) throw new Error(`${gigsName} needs a "gigs" list.`);

  const problems = [];
  const warnings = [];
  const seen = new Set();

  const gigs = data.gigs.map((raw, i) => {
    const label = `show ${i + 1}${raw && raw.id ? ` (${raw.id})` : ''}`;
    const fail = (msg) => problems.push(`${label}: ${msg}`);
    if (!raw || typeof raw !== 'object') {
      fail('is not an object');
      return null;
    }
    for (const key of Object.keys(raw)) {
      if (!GIG_FIELDS.includes(key)) fail(`unknown field "${key}" (allowed: ${GIG_FIELDS.join(', ')})`);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw.id || '')) fail('"id" must be lowercase letters, numbers and dashes, e.g. "feierwerk-2026"');
    else if (seen.has(raw.id)) fail(`the id "${raw.id}" is used twice`);
    seen.add(raw.id);
    if (!raw.venue || !String(raw.venue).trim()) fail('"venue" is missing');

    let date = null;
    try {
      date = parseShowDate(raw.date);
    } catch (error) {
      fail(raw.date ? error.message : '"date" is missing');
    }
    if (raw.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time)) fail(`"time" should look like 20:30, not "${raw.time}"`);
    for (const key of ['tickets', 'link', 'press']) {
      if (raw[key] && !/^https?:\/\/\S+$/.test(raw[key])) fail(`"${key}" should be a full web address starting with https://`);
    }

    let photos = [];
    if (raw.photos !== undefined && !Array.isArray(raw.photos)) fail('"photos" must be a list');
    else {
      photos = (raw.photos || []).flatMap((photo, n) => {
        if (!photo || !photo.file) {
          fail(`photo ${n + 1} needs a "file"`);
          return [];
        }
        if (!photo.alt) fail(`photo ${photo.file} needs an "alt" text (what's in the picture)`);
        try {
          return [photoInfo(root, raw.id, photo)];
        } catch (error) {
          fail(error.message);
          return [];
        }
      });
    }

    if (raw.placeholder !== undefined && typeof raw.placeholder !== 'boolean') fail('"placeholder" must be true or false');
    if (raw.placeholder) warnings.push(`${label} is a placeholder: fill it in (and remove "placeholder") before publishing.`);

    if (date && date.precision !== 'day' && date.last >= todayIso) {
      warnings.push(`${label}: upcoming shows should have an exact date (YYYY-MM-DD), "${raw.date}" is vague.`);
    }

    return {
      ...raw,
      venue: typeset(raw.venue),
      event: typeset(raw.event),
      story: typeset(raw.story),
      info: typeset(raw.info),
      parsedDate: date,
      photos,
      cover: photos[0] || null,
      url: `/live/${raw.id}/`,
      seed: [raw.id, raw.venue, raw.city, raw.date].filter(Boolean).join('|'),
      seedLabel: [raw.venue, raw.city, raw.date].filter(Boolean).join(' · '),
    };
  });

  if (problems.length) {
    throw new Error(`${gigsName} has ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  }

  // Shows are numbered in the order they happened: N° 01 is the first one.
  const { past, upcoming } = splitShows(gigs, todayIso);
  const chronological = [...past].reverse();
  chronological.forEach((gig, i) => (gig.number = i + 1));
  for (const gig of gigs) {
    gig.isUpcoming = upcoming.includes(gig);
    gig.rose = growRose(gig.seed);
  }

  for (const release of site.releases || []) {
    const file = path.join(root, 'assets', 'music', release.cover);
    if (!fs.existsSync(file)) throw new Error(`content/site.json: cover ${release.cover} is missing in assets/music/`);
    release.coverSize = imageSize(file);
  }

  return { site, gigs, past, upcoming, warnings };
}
