import { addDays, diffDays, type ISODate } from './dates';
import type { Cycle, DayLog, Period } from './types';

/**
 * Period days separated by at most this many days are treated as one period,
 * so forgetting to log a single day in the middle doesn't split it in two.
 */
export const MAX_GAP_WITHIN_PERIOD = 2;

/** Cycle lengths outside this range are almost always missed logs, not real cycles. */
export const MIN_PLAUSIBLE_CYCLE = 15;
export const MAX_PLAUSIBLE_CYCLE = 60;

export function periodDates(logs: Iterable<DayLog>): ISODate[] {
  const dates: ISODate[] = [];
  for (const log of logs) if (log.period) dates.push(log.date);
  return dates.sort();
}

/** Groups period days into periods, oldest first. */
export function derivePeriods(dates: ISODate[]): Period[] {
  const sorted = [...new Set(dates)].sort();
  const periods: Period[] = [];
  for (const date of sorted) {
    const last = periods[periods.length - 1];
    if (last && diffDays(last.end, date) <= MAX_GAP_WITHIN_PERIOD) {
      last.end = date;
      last.length = diffDays(last.start, date) + 1;
    } else {
      periods.push({ start: date, end: date, length: 1 });
    }
  }
  return periods;
}

/** Turns periods into cycles, oldest first. The last cycle is the ongoing one. */
export function deriveCycles(periods: Period[]): Cycle[] {
  return periods.map((period, i) => {
    const next = periods[i + 1];
    if (!next) return { start: period.start, periodLength: period.length };
    return {
      start: period.start,
      end: addDays(next.start, -1),
      length: diffDays(period.start, next.start),
      periodLength: period.length,
    };
  });
}

export function isPlausibleCycleLength(length: number): boolean {
  return length >= MIN_PLAUSIBLE_CYCLE && length <= MAX_PLAUSIBLE_CYCLE;
}

/** Day of the cycle (1 = first day of the latest period), or null if nothing is logged. */
export function cycleDay(periods: Period[], today: ISODate): number | null {
  const latest = [...periods].reverse().find((p) => p.start <= today);
  if (!latest) return null;
  return diffDays(latest.start, today) + 1;
}
