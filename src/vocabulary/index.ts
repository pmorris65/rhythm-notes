import type { Vocabulary } from '../domain/settings';
import type { Flow, Mood } from '../domain/types';
import type { Phase } from '../domain/insights';

/**
 * All user-facing words that could reveal what the app tracks. The neutral set
 * is on by default so that someone glancing at the screen sees a notes app.
 */
export interface Labels {
  period: string;
  periodLower: string;
  periods: string;
  cycle: string;
  cycleLower: string;
  flow: string;
  fertileWindow: string;
  ovulation: string;
  started: string;
  ended: string;
  stillGoing: string;
  expected: string;
  predicted: string;
  possible: string;
  late: (days: number) => string;
  dayOfCycle: (day: number) => string;
  dayOfPeriod: (day: number) => string;
  nextIn: (days: number) => string;
  flows: Record<Flow, string>;
  symptoms: Record<string, string>;
  moods: Record<Mood, string>;
  phases: Record<Phase, string>;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "1 day", "3 days" */
export const days = (n: number) => plural(n, 'day');

const shared = {
  moods: {
    great: 'Great',
    good: 'Good',
    okay: 'Okay',
    low: 'Low',
    irritable: 'Irritable',
    anxious: 'Anxious',
  } satisfies Record<Mood, string>,
};

const neutral: Labels = {
  period: 'Entry',
  periodLower: 'entry',
  periods: 'Entries',
  cycle: 'Rhythm',
  cycleLower: 'rhythm',
  flow: 'Intensity',
  fertileWindow: 'Focus days',
  ovulation: 'Peak day',
  started: 'Started today',
  ended: 'Ended today',
  stillGoing: 'Still going',
  expected: 'Expected',
  predicted: 'Expected entry',
  possible: 'Possible entry',
  late: (d) => `${plural(d, 'day')} later than expected`,
  dayOfCycle: (d) => `Day ${d} of your rhythm`,
  dayOfPeriod: (d) => `Entry day ${d}`,
  nextIn: (d) => (d === 0 ? 'Next entry expected today' : `Next entry in ${plural(d, 'day')}`),
  flows: { spotting: 'Trace', light: 'Light', medium: 'Medium', heavy: 'Strong' },
  symptoms: {
    cramps: 'Aches',
    headache: 'Headache',
    bloating: 'Bloated',
    acne: 'Skin',
    tender: 'Tenderness',
    fatigue: 'Tired',
    backache: 'Back ache',
    nausea: 'Queasy',
    cravings: 'Cravings',
  },
  moods: shared.moods,
  phases: { during: 'During entries', after: 'After entries', before: 'Week before' },
};

const explicit: Labels = {
  period: 'Period',
  periodLower: 'period',
  periods: 'Periods',
  cycle: 'Cycle',
  cycleLower: 'cycle',
  flow: 'Flow',
  fertileWindow: 'Fertile window',
  ovulation: 'Ovulation',
  started: 'Period started',
  ended: 'Period ended',
  stillGoing: 'Still going',
  expected: 'Expected',
  predicted: 'Predicted period',
  possible: 'Possible period',
  late: (d) => `Period ${plural(d, 'day')} late`,
  dayOfCycle: (d) => `Cycle day ${d}`,
  dayOfPeriod: (d) => `Period day ${d}`,
  nextIn: (d) => (d === 0 ? 'Period expected today' : `Period in ${plural(d, 'day')}`),
  flows: { spotting: 'Spotting', light: 'Light', medium: 'Medium', heavy: 'Heavy' },
  symptoms: {
    cramps: 'Cramps',
    headache: 'Headache',
    bloating: 'Bloating',
    acne: 'Acne',
    tender: 'Tender breasts',
    fatigue: 'Fatigue',
    backache: 'Back pain',
    nausea: 'Nausea',
    cravings: 'Cravings',
  },
  moods: shared.moods,
  phases: { during: 'During period', after: 'After period', before: 'Week before period' },
};

export function labelsFor(vocabulary: Vocabulary): Labels {
  return vocabulary === 'explicit' ? explicit : neutral;
}

/** Display name for a built-in or custom symptom. */
export function symptomLabel(labels: Labels, symptom: string): string {
  return labels.symptoms[symptom] ?? symptom;
}
