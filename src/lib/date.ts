const IST_TIMEZONE = 'Asia/Kolkata';

/** Returns YYYY-MM-DD in India Standard Time so clinic tokens roll over at midnight IST. */
export function getIstDayString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function getIstDayBounds(dayString: string = getIstDayString()): {
  start: Date;
  end: Date;
} {
  const start = new Date(`${dayString}T00:00:00.000+05:30`);
  const end = new Date(`${dayString}T23:59:59.999+05:30`);
  return { start, end };
}

export function formatIstDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatIstDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/* Deterministic IST formatters — identical output on server and browser (no ICU differences). */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const IST_OFFSET_MS = 330 * 60 * 1000;

function istParts(value: Date | string) {
  const d = new Date(typeof value === 'string' ? value : value.getTime());
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** "Wednesday, 11 November" for a YYYY-MM-DD IST day string. */
export function formatIstLongDay(day: string): string {
  const p = istParts(`${day}T12:00:00+05:30`);
  return `${WEEKDAYS[p.weekday]}, ${p.day} ${MONTHS[p.month]}`;
}

/** "5:30 PM" in IST. */
export function formatIstTime(value: Date | string): string {
  const p = istParts(value);
  const h = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${h}:${String(p.minute).padStart(2, '0')} ${p.hour < 12 ? 'AM' : 'PM'}`;
}

/** "17:30" 24h format in IST. */
export function getIstHhmm(value: Date | string): string {
  const p = istParts(value);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** "5:30 PM" from a 24h "HH:MM" string. */
export function formatClockTime(hhmm: string): string {
  const [hs, ms] = hhmm.split(':');
  const hNum = Number(hs);
  const h = hNum % 12 === 0 ? 12 : hNum % 12;
  return `${h}:${ms} ${hNum < 12 ? 'AM' : 'PM'}`;
}

/** { mon: "Nov", day: 11, year: 2026 } in IST. */
export function istDateBadge(value: Date | string) {
  const p = istParts(value);
  return { mon: MONTHS[p.month].slice(0, 3), day: p.day, year: p.year };
}

/** Hour of day (0–23) in IST. */
export function istHour(date: Date = new Date()): number {
  return istParts(date).hour;
}
