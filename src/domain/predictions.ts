import { deriveCycles, isPlausibleCycleLength, MAX_GAP_WITHIN_PERIOD } from './cycles';
import { addDays, dateRange, diffDays, type ISODate } from './dates';
import type { DayLog, Period } from './types';

/** How many recent cycles the averages look at. */
export const HISTORY_WINDOW = 6;
/** How many future cycles to predict (about three months and a bit). */
export const CYCLES_AHEAD = 4;
/** Cycles whose lengths vary by more than this are shown as irregular. */
export const IRREGULAR_SPREAD = 7;
/** Ovulation is estimated this many days before the next period. */
export const LUTEAL_PHASE = 14;
/** A period is considered "still going" for at most this many days. */
const MAX_ONGOING_PERIOD = 10;
const MAX_VARIABILITY = 10;

export interface PredictionInput {
  periods: Period[];
  today: ISODate;
  defaultCycleLength: number;
  defaultPeriodLength: number;
  /** Start date of a period the user has marked as ended (from the home screen). */
  periodEndedFor?: ISODate | null;
  cyclesAhead?: number;
}

export interface PredictedCycle {
  /** 1 = the next period. */
  index: number;
  /** Most likely first day. */
  start: ISODate;
  /** Most likely last day. */
  end: ISODate;
  /** The range the first day will most likely fall in. */
  earliestStart: ISODate;
  latestStart: ISODate;
  ovulation: ISODate;
  fertileStart: ISODate;
  fertileEnd: ISODate;
}

export interface Prediction {
  cycleLength: number;
  periodLength: number;
  /** ± days of uncertainty for the next start date. */
  variability: number;
  /** How many of the user's own cycles the averages are based on (0 = defaults). */
  basedOnCycles: number;
  irregular: boolean;
  /** Days the next period is overdue (0 when not late). */
  lateByDays: number;
  /** The latest period, if it looks like it's still going. */
  ongoingPeriod: Period | null;
  /** Days of the ongoing period that are still expected to come. */
  ongoingRemaining: ISODate[];
  cycles: PredictedCycle[];
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

export function predict(input: PredictionInput): Prediction | null {
  const { periods, today, periodEndedFor } = input;
  const past = periods.filter((p) => p.start <= today);
  const last = past[past.length - 1];
  if (!last) return null;

  const lengths = deriveCycles(past)
    .map((c) => c.length)
    .filter((l): l is number => l !== undefined && isPlausibleCycleLength(l))
    .slice(-HISTORY_WINDOW);

  const cycleLength = lengths.length > 0 ? Math.round(mean(lengths)) : input.defaultCycleLength;

  // The latest period might still be going unless the user said it ended.
  const mayBeOngoing =
    last.start !== periodEndedFor && diffDays(last.start, today) < MAX_ONGOING_PERIOD;

  // A period that is only one day long usually means only the first day was
  // logged, so it doesn't tell us how long periods last.
  const completedPeriods = (mayBeOngoing ? past.slice(0, -1) : past)
    .filter((p) => p.length > 1)
    .slice(-HISTORY_WINDOW);
  const periodLength =
    completedPeriods.length > 0
      ? Math.round(mean(completedPeriods.map((p) => p.length)))
      : input.defaultPeriodLength;

  const variability =
    lengths.length < 2 ? 2 : Math.min(MAX_VARIABILITY, Math.round(stdDev(lengths)));
  const irregular =
    lengths.length >= 3 && Math.max(...lengths) - Math.min(...lengths) > IRREGULAR_SPREAD;

  // Ongoing if a period day was logged very recently, or we're still within
  // the usual length of a period that has started.
  const ongoing =
    mayBeOngoing &&
    (diffDays(last.end, today) <= MAX_GAP_WITHIN_PERIOD || diffDays(last.start, today) < periodLength);
  const ongoingPeriod = ongoing ? last : null;
  let ongoingRemaining: ISODate[] = [];
  if (ongoingPeriod) {
    const from = last.end >= today ? addDays(last.end, 1) : today;
    const to = addDays(last.start, periodLength - 1);
    if (from <= to) ongoingRemaining = dateRange(from, to);
  }

  let nextStart = addDays(last.start, cycleLength);
  let lateByDays = 0;
  if (nextStart < today) {
    lateByDays = diffDays(nextStart, today);
    nextStart = today;
  }

  const cycles: PredictedCycle[] = [];
  const count = input.cyclesAhead ?? CYCLES_AHEAD;
  for (let index = 1; index <= count; index++) {
    const start = addDays(nextStart, (index - 1) * cycleLength);
    const spread =
      index === 1
        ? variability
        : Math.min(MAX_VARIABILITY, Math.round(Math.sqrt(index) * Math.max(variability, 1)));
    const ovulation = addDays(start, -LUTEAL_PHASE);
    cycles.push({
      index,
      start,
      end: addDays(start, periodLength - 1),
      earliestStart: maxDate(addDays(start, -spread), today),
      latestStart: addDays(start, spread),
      ovulation,
      fertileStart: addDays(ovulation, -5),
      fertileEnd: addDays(ovulation, 1),
    });
  }
  return {
    cycleLength,
    periodLength,
    variability,
    basedOnCycles: lengths.length,
    irregular,
    lateByDays,
    ongoingPeriod,
    ongoingRemaining,
    cycles,
  };
}

export type PredictedKind = 'likely' | 'possible';

export interface CalendarMarks {
  /** Days a period is expected (most likely, or possible given the ± range). */
  predicted: Map<ISODate, PredictedKind>;
  fertile: Set<ISODate>;
  ovulation: Set<ISODate>;
}

/**
 * What to draw on the calendar for predictions. Only today and future days
 * get predicted marks, and a day that's already logged as a period is never
 * also shown as predicted.
 */
export function calendarMarks(
  prediction: Prediction | null,
  logs: Map<ISODate, DayLog>,
  today: ISODate,
  showFertile: boolean,
): CalendarMarks {
  const predicted = new Map<ISODate, PredictedKind>();
  const fertile = new Set<ISODate>();
  const ovulation = new Set<ISODate>();
  if (!prediction) return { predicted, fertile, ovulation };

  const isOpen = (date: ISODate) => date >= today && !logs.get(date)?.period;

  for (const date of prediction.ongoingRemaining) if (isOpen(date)) predicted.set(date, 'likely');

  for (const c of prediction.cycles) {
    for (const date of dateRange(c.start, c.end)) if (isOpen(date)) predicted.set(date, 'likely');
    const lastPossible = addDays(c.latestStart, prediction.periodLength - 1);
    for (const date of dateRange(c.earliestStart, lastPossible)) {
      if (isOpen(date) && !predicted.has(date)) predicted.set(date, 'possible');
    }
    if (showFertile) {
      for (const date of dateRange(c.fertileStart, c.fertileEnd)) {
        if (date >= today && !predicted.has(date) && !logs.get(date)?.period) fertile.add(date);
      }
      if (c.ovulation >= today && fertile.has(c.ovulation)) ovulation.add(c.ovulation);
    }
  }
  return { predicted, fertile, ovulation };
}
