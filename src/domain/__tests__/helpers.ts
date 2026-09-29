import { addDays, dateRange, type ISODate } from '../dates';
import { derivePeriods } from '../cycles';
import { emptyLog, type DayLog, type Period } from '../types';

/** Period days for periods starting on each date, each `length` days long. */
export function periodDays(starts: ISODate[], length = 5): ISODate[] {
  return starts.flatMap((s) => dateRange(s, addDays(s, length - 1)));
}

export function periodsFrom(starts: ISODate[], length = 5): Period[] {
  return derivePeriods(periodDays(starts, length));
}

export function logsFor(dates: ISODate[], extra: Partial<DayLog> = {}): DayLog[] {
  return dates.map((date) => ({ ...emptyLog(date), period: true, ...extra }));
}

/** Starts spaced by the given cycle lengths. */
export function startsWithLengths(first: ISODate, lengths: number[]): ISODate[] {
  const starts = [first];
  for (const l of lengths) starts.push(addDays(starts[starts.length - 1], l));
  return starts;
}
