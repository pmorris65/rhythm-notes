import type { ISODate } from './dates';

export type Flow = 'spotting' | 'light' | 'medium' | 'heavy';
export const FLOWS: Flow[] = ['spotting', 'light', 'medium', 'heavy'];

export type Mood = 'great' | 'good' | 'okay' | 'low' | 'irritable' | 'anxious';
export const MOODS: Mood[] = ['great', 'good', 'okay', 'low', 'irritable', 'anxious'];

/** Built-in symptom ids. Users can add their own (stored as free text). */
export const BUILT_IN_SYMPTOMS = [
  'cramps',
  'headache',
  'bloating',
  'acne',
  'tender',
  'fatigue',
  'backache',
  'nausea',
  'cravings',
] as const;
export type BuiltInSymptom = (typeof BUILT_IN_SYMPTOMS)[number];

export interface DayLog {
  date: ISODate;
  /** True when this day counts as a period day. */
  period: boolean;
  flow: Flow | null;
  symptoms: string[];
  mood: Mood | null;
  note: string;
}

export function emptyLog(date: ISODate): DayLog {
  return { date, period: false, flow: null, symptoms: [], mood: null, note: '' };
}

/** A log with nothing in it is deleted rather than stored. */
export function isEmptyLog(log: DayLog): boolean {
  return !log.period && !log.flow && log.symptoms.length === 0 && !log.mood && !log.note.trim();
}

/** A run of consecutive period days. */
export interface Period {
  start: ISODate;
  end: ISODate;
  length: number;
}

/** From one period start to the day before the next (the last one is ongoing). */
export interface Cycle {
  start: ISODate;
  /** Undefined for the current, ongoing cycle. */
  end?: ISODate;
  /** Days from this start to the next start. Undefined while ongoing. */
  length?: number;
  periodLength: number;
}
