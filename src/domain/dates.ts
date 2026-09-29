/**
 * Calendar-date helpers.
 *
 * Dates are stored as ISO strings ("YYYY-MM-DD") with no time or timezone, so a
 * log made on the 3rd is always the 3rd, whatever timezone the phone is in.
 * All arithmetic goes through UTC day numbers to avoid daylight-saving bugs.
 */

export type ISODate = string;

const MS_PER_DAY = 86_400_000;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** The local calendar date of a JS Date. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function parts(iso: ISODate): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

/** Days since 1970-01-01 for the given calendar date. */
export function dayNumber(iso: ISODate): number {
  const { year, month, day } = parts(iso);
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

export function fromDayNumber(n: number): ISODate {
  const dt = new Date(n * MS_PER_DAY);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromDayNumber(dayNumber(iso) + days);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  return dayNumber(b) - dayNumber(a);
}

/** Inclusive list of dates from start to end. */
export function dateRange(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let n = dayNumber(start); n <= dayNumber(end); n++) out.push(fromDayNumber(n));
  return out;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Sunday. */
export function weekday(iso: ISODate): number {
  // 1970-01-01 was a Thursday.
  return (((dayNumber(iso) + 4) % 7) + 7) % 7;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12 + 12) % 12 + 1 };
}

/**
 * The dates shown in a month grid: whole weeks (Sunday first), padded with
 * `null` before the 1st and after the last day.
 */
export function monthGrid(year: number, month: number): (ISODate | null)[][] {
  const first = `${year}-${pad(month)}-01`;
  const lead = weekday(first);
  const count = daysInMonth(year, month);
  const cells: (ISODate | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= count; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (ISODate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "Mar 4" */
export function formatShort(iso: ISODate): string {
  const { month, day } = parts(iso);
  return `${MONTH_NAMES[month - 1].slice(0, 3)} ${day}`;
}

/** "Tuesday, March 4" */
export function formatLong(iso: ISODate): string {
  const { month, day } = parts(iso);
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${names[weekday(iso)]}, ${MONTH_NAMES[month - 1]} ${day}`;
}

/** "Mar 4 – 8" or "Mar 30 – Apr 3" */
export function formatRange(start: ISODate, end: ISODate): string {
  if (start === end) return formatShort(start);
  const a = parts(start);
  const b = parts(end);
  if (a.month === b.month && a.year === b.year) return `${formatShort(start)} – ${b.day}`;
  return `${formatShort(start)} – ${formatShort(end)}`;
}
