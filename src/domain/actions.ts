import { dateRange, type ISODate } from './dates';
import { emptyLog, type DayLog, type Flow } from './types';

type LogLookup = (date: ISODate) => DayLog | undefined;

/** Marks one day as a period day (keeping anything else already logged). */
export function withPeriod(existing: DayLog | undefined, date: ISODate, period: boolean): DayLog {
  const log = existing ?? emptyLog(date);
  // Spotting on its own doesn't count as a period day, so clear it when the
  // day stops being a period day but keep it otherwise.
  const flow = period ? log.flow : log.flow === 'spotting' ? 'spotting' : null;
  return { ...log, period, flow };
}

/** Logs the days from `start` to `end` as period days (used for "Ended today"). */
export function fillPeriod(lookup: LogLookup, start: ISODate, end: ISODate): DayLog[] {
  return dateRange(start, end)
    .filter((date) => !lookup(date)?.period)
    .map((date) => withPeriod(lookup(date), date, true));
}

/** Choosing a flow also decides whether the day counts as a period day. */
export function withFlow(log: DayLog, flow: Flow | null): DayLog {
  if (flow === null) return { ...log, flow: null };
  return { ...log, flow, period: flow !== 'spotting' };
}
