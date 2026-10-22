// Show dates, shared by the build (Node) and the browser.
//
// Dates are plain strings: "2026-11-14", or "2025-07" / "2025" for old shows
// where we don't know the exact day. They are never turned into Date objects
// at midnight UTC (that is how shows end up on the wrong day). Instead,
// "today" is worked out as a YYYY-MM-DD string in Munich time, and strings
// are compared with each other.
//
// A show counts as upcoming for the whole day it happens on. A show with only
// a month or year counts as upcoming until that month or year is over.

export const TIME_ZONE = 'Europe/Berlin';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Today's date in Munich as "YYYY-MM-DD". */
export function today(now = new Date(), timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Reads "YYYY", "YYYY-MM" or "YYYY-MM-DD".
 * Returns the first and last day the date could mean, or throws if it's not a real date.
 */
export function parseShowDate(value) {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(String(value).trim());
  if (!match) throw new Error(`"${value}" is not a date. Use YYYY-MM-DD, e.g. 2026-11-14.`);
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const day = match[3] ? Number(match[3]) : null;
  if (month !== null && (month < 1 || month > 12)) throw new Error(`"${value}" has no month ${month}.`);
  if (day !== null && (day < 1 || day > daysInMonth(year, month))) {
    throw new Error(`"${value}" doesn't exist (${MONTHS_LONG[month - 1]} ${year} has ${daysInMonth(year, month)} days).`);
  }

  if (day !== null) {
    const iso = `${year}-${pad(month)}-${pad(day)}`;
    return { value, precision: 'day', year, month, day, first: iso, last: iso };
  }
  if (month !== null) {
    return {
      value, precision: 'month', year, month, day: null,
      first: `${year}-${pad(month)}-01`,
      last: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`,
    };
  }
  return { value, precision: 'year', year, month: null, day: null, first: `${year}-01-01`, last: `${year}-12-31` };
}

/** True while a show hasn't happened yet (including the day itself). */
export function isUpcoming(value, todayIso) {
  return parseShowDate(value).last >= todayIso;
}

/** Whole days from `todayIso` until the show (0 = tonight). */
export function daysUntil(value, todayIso) {
  const toUtc = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(parseShowDate(value).first) - toUtc(todayIso)) / 86400000);
}

/** "in 12 days", "tomorrow", "tonight". */
export function countdown(value, todayIso) {
  const days = daysUntil(value, todayIso);
  if (days <= 0) return 'tonight';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/**
 * Human dates.
 *   long:  "Fri 14 November 2026" · "July 2025" · "2025"
 *   short: "14 Nov 2026" · "Jul 2025" · "2025"
 */
export function formatShowDate(value, style = 'short') {
  const d = parseShowDate(value);
  if (d.precision === 'year') return String(d.year);
  if (d.precision === 'month') return `${style === 'long' ? MONTHS_LONG[d.month - 1] : MONTHS[d.month - 1]} ${d.year}`;
  if (style === 'long') {
    const weekday = WEEKDAYS[new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()];
    return `${weekday} ${d.day} ${MONTHS_LONG[d.month - 1]} ${d.year}`;
  }
  return `${d.day} ${MONTHS[d.month - 1]} ${d.year}`;
}

/** The parts a date block needs: weekday, day, month, year (missing parts are null). */
export function dateParts(value) {
  const d = parseShowDate(value);
  return {
    precision: d.precision,
    year: d.year,
    month: d.month ? MONTHS[d.month - 1] : null,
    day: d.day,
    weekday: d.day ? WEEKDAYS[new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()] : null,
  };
}

/**
 * Splits shows into past (newest first) and upcoming (soonest first).
 * Shows on the same (or an equally vague) date keep the order of the list,
 * which is oldest first.
 */
export function splitShows(gigs, todayIso) {
  const withOrder = gigs.map((gig, order) => ({ gig, order, date: parseShowDate(gig.date) }));
  const chronological = (a, b) =>
    a.date.first < b.date.first ? -1 : a.date.first > b.date.first ? 1 : a.order - b.order;
  const upcoming = withOrder.filter((x) => x.date.last >= todayIso).sort(chronological);
  const past = withOrder.filter((x) => x.date.last < todayIso).sort(chronological).reverse();
  return { past: past.map((x) => x.gig), upcoming: upcoming.map((x) => x.gig) };
}
