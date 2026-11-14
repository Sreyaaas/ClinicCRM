import test from 'node:test';
import assert from 'node:assert';
import {
  getIstDayString,
  getIstDayBounds,
  formatIstDate,
  formatIstTime,
  formatClockTime,
  istHour,
} from '../src/lib/date';

test('IST day string matches YYYY-MM-DD in India time zone', () => {
  const d = new Date('2026-11-14T20:00:00.000Z');
  const istDay = getIstDayString(d);
  assert.strictEqual(istDay, '2026-11-15');
});

test('IST day bounds span midnight to 23:59:59.999 IST', () => {
  const { start, end } = getIstDayBounds('2026-11-15');
  assert.strictEqual(start.toISOString(), '2026-11-14T18:30:00.000Z');
  assert.strictEqual(end.toISOString(), '2026-11-15T18:29:59.999Z');
});

test('Deterministic date and time formatting', () => {
  const iso = '2026-11-15T09:30:00.000+05:30';
  const formattedDate = formatIstDate(iso);
  assert.ok(formattedDate.includes('15') && formattedDate.includes('Nov'));

  const formattedTime = formatIstTime(iso);
  assert.ok(formattedTime.includes('09:30') || formattedTime.includes('9:30'));

  const clockTime = formatClockTime(iso);
  assert.ok(typeof clockTime === 'string');

  const hour = istHour();
  assert.ok(hour >= 0 && hour <= 23);
});
