import type { Vocabulary } from '../domain/settings';
import type { Flow, Mood } from '../domain/types';
import type { Phase } from '../domain/insights';

/**
 * All user-facing words that could reveal what the app tracks. The neutral set
 * is on by default so that someone glancing at the screen sees a notes app. In
 * neutral mode the word for "period" is the user's own choice.
 */
export interface Labels {
  /** The word for "period", capitalised for titles and buttons: "Wave". */
  period: string;
  /** For use mid-sentence: "your next wave". */
  periodLower: string;
  /** With "a"/"an" for use mid-sentence: "a wave", "an entry". */
  aPeriod: string;
  periods: string;
  periodsLower: string;
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

/** Suggestions shown when choosing a word; the first one is the default. */
export const PERIOD_WORD_SUGGESTIONS = ['Wave', 'Break', 'Tide', 'Moon'] as const;
export const DEFAULT_PERIOD_WORD: string = PERIOD_WORD_SUGGESTIONS[0];
export const MAX_PERIOD_WORD_LENGTH = 20;

/** "Wave" → "wave", but a word with other capitals ("Aunt Flo", "TOM") is left as typed. */
export function lowerFirst(word: string): string {
  const rest = word.slice(1);
  return rest === rest.toLowerCase() ? word.charAt(0).toLowerCase() + rest : word;
}

export function upperFirst(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Simple English plural: wave → waves, beach → beaches, story → stories, "red days" stays. */
export function pluralize(word: string): string {
  if (/s$/i.test(word)) return word;
  if (/(x|z|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/** "a wave", "an entry" */
export function withArticle(word: string): string {
  return `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;
}

/** Cleans up a user-typed word, falling back to the default when it's empty. */
export function normalizePeriodWord(raw: unknown): string {
  const word =
    typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, MAX_PERIOD_WORD_LENGTH).trim() : '';
  return word ? upperFirst(word) : DEFAULT_PERIOD_WORD;
}

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

function neutralLabels(periodWord: string): Labels {
  const word = normalizePeriodWord(periodWord);
  const lower = lowerFirst(word);
  const words = pluralize(word);
  const wordsLower = lowerFirst(words);
  return {
    period: word,
    periodLower: lower,
    aPeriod: withArticle(lower),
    periods: words,
    periodsLower: wordsLower,
    cycle: 'Rhythm',
    cycleLower: 'rhythm',
    flow: 'Intensity',
    fertileWindow: 'Focus days',
    ovulation: 'Peak day',
    started: 'Started today',
    ended: 'Ended today',
    stillGoing: 'Still going',
    expected: 'Expected',
    predicted: `Expected ${lower}`,
    possible: `Possible ${lower}`,
    late: (d) => `${days(d)} later than expected`,
    dayOfCycle: (d) => `Day ${d} of your rhythm`,
    dayOfPeriod: (d) => `${word} day ${d}`,
    nextIn: (d) => (d === 0 ? `Next ${lower} expected today` : `Next ${lower} in ${days(d)}`),
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
    phases: { during: `During ${wordsLower}`, after: `After ${wordsLower}`, before: 'Week before' },
  };
}

const explicit: Labels = {
  period: 'Period',
  periodLower: 'period',
  aPeriod: 'a period',
  periods: 'Periods',
  periodsLower: 'periods',
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
  late: (d) => `Period ${days(d)} late`,
  dayOfCycle: (d) => `Cycle day ${d}`,
  dayOfPeriod: (d) => `Period day ${d}`,
  nextIn: (d) => (d === 0 ? 'Period expected today' : `Period in ${days(d)}`),
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

/** Labels for the chosen wording. `periodWord` is the user's own word, used in neutral mode. */
export function labelsFor(vocabulary: Vocabulary, periodWord: string = DEFAULT_PERIOD_WORD): Labels {
  return vocabulary === 'explicit' ? explicit : neutralLabels(periodWord);
}

/** Display name for a built-in or custom symptom. */
export function symptomLabel(labels: Labels, symptom: string): string {
  return labels.symptoms[symptom] ?? symptom;
}
