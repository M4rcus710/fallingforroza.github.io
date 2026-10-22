import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  today,
  parseShowDate,
  isUpcoming,
  splitShows,
  countdown,
  daysUntil,
  formatShowDate,
} from '../assets/js/lib/dates.js';

test('today is the date in Munich, not UTC or the visitor’s time zone', () => {
  // 23:30 UTC on the 14th is already 00:30 on the 15th in Munich (winter time)
  assert.equal(today(new Date('2026-11-14T23:30:00Z')), '2026-11-15');
  // 21:30 UTC in summer is 23:30 in Munich, still the same day
  assert.equal(today(new Date('2026-07-03T21:30:00Z')), '2026-07-03');
  // the nights the clocks change
  assert.equal(today(new Date('2026-03-29T00:30:00Z')), '2026-03-29');
  assert.equal(today(new Date('2026-10-24T22:30:00Z')), '2026-10-25');
});

test('dates can be exact, a month, or a year', () => {
  assert.deepEqual(
    [parseShowDate('2026-11-14').first, parseShowDate('2026-11-14').last],
    ['2026-11-14', '2026-11-14'],
  );
  assert.deepEqual([parseShowDate('2025-07').first, parseShowDate('2025-07').last], ['2025-07-01', '2025-07-31']);
  assert.equal(parseShowDate('2024-02').last, '2024-02-29'); // leap year
  assert.deepEqual([parseShowDate('2025').first, parseShowDate('2025').last], ['2025-01-01', '2025-12-31']);
});

test('impossible or badly written dates are rejected with a clear message', () => {
  assert.throws(() => parseShowDate('2026-02-30'), /February 2026 has 28 days/);
  assert.throws(() => parseShowDate('2026-13-01'), /no month 13/);
  assert.throws(() => parseShowDate('14.11.2026'), /Use YYYY-MM-DD/);
  assert.throws(() => parseShowDate('next friday'), /not a date/);
});

test('a show is upcoming through the whole day it happens on', () => {
  assert.equal(isUpcoming('2026-11-14', '2026-11-13'), true);
  assert.equal(isUpcoming('2026-11-14', '2026-11-14'), true);
  assert.equal(isUpcoming('2026-11-14', '2026-11-15'), false);
});

test('a vague date counts as upcoming until its month or year is over', () => {
  assert.equal(isUpcoming('2026-11', '2026-11-30'), true);
  assert.equal(isUpcoming('2026-11', '2026-12-01'), false);
  assert.equal(isUpcoming('2025', '2026-01-01'), false);
});

test('countdown wording', () => {
  assert.equal(countdown('2026-11-14', '2026-11-14'), 'tonight');
  assert.equal(countdown('2026-11-14', '2026-11-13'), 'tomorrow');
  assert.equal(countdown('2026-11-14', '2026-10-14'), 'in 31 days');
  // across the switch back to winter time there are still whole days
  assert.equal(daysUntil('2026-10-26', '2026-10-24'), 2);
});

test('dates are written for people', () => {
  assert.equal(formatShowDate('2026-11-14', 'long'), 'Sat 14 November 2026');
  assert.equal(formatShowDate('2026-11-14'), '14 Nov 2026');
  assert.equal(formatShowDate('2025-07', 'long'), 'July 2025');
  assert.equal(formatShowDate('2025'), '2025');
});

test('past shows come newest first, upcoming ones soonest first', () => {
  const gigs = [
    { id: 'first', date: '2025' },
    { id: 'second', date: '2025' },
    { id: 'march', date: '2026-03-01' },
    { id: 'next', date: '2026-11-14' },
    { id: 'later', date: '2026-12-05' },
    { id: 'tonight', date: '2026-10-14' },
  ];
  const { past, upcoming } = splitShows(gigs, '2026-10-14');
  // shows with the same vague date keep the order of the list (oldest first)
  assert.deepEqual(past.map((g) => g.id), ['march', 'second', 'first']);
  assert.deepEqual(upcoming.map((g) => g.id), ['tonight', 'next', 'later']);
});
