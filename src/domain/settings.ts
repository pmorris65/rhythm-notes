import { DEFAULT_PERIOD_WORD } from '../vocabulary';
import type { ISODate } from './dates';

export type Vocabulary = 'neutral' | 'explicit';

export interface ReminderSettings {
  upcoming: { enabled: boolean; daysBefore: number; text: string };
  daily: { enabled: boolean; hour: number; minute: number; text: string };
}

export interface Settings {
  onboarded: boolean;
  vocabulary: Vocabulary;
  /** The user's own word for "period", used with neutral wording. */
  periodWord: string;
  defaultCycleLength: number;
  defaultPeriodLength: number;
  showFertileWindow: boolean;
  /** Lock with a PIN (and optionally biometrics) when opening the app. */
  lockEnabled: boolean;
  biometricsEnabled: boolean;
  /** When locked, show a plain notes screen; long-press the title to unlock. */
  disguiseEnabled: boolean;
  /** Erase everything after this many wrong PINs in a row. */
  wipeAfterFailedAttempts: boolean;
  /** Start date of a period the user marked as ended from the home screen. */
  periodEndedFor: ISODate | null;
  customSymptoms: string[];
  reminders: ReminderSettings;
}

export const MAX_FAILED_ATTEMPTS = 10;

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  vocabulary: 'neutral',
  periodWord: DEFAULT_PERIOD_WORD,
  defaultCycleLength: 28,
  defaultPeriodLength: 5,
  showFertileWindow: false,
  lockEnabled: false,
  biometricsEnabled: false,
  disguiseEnabled: false,
  wipeAfterFailedAttempts: false,
  periodEndedFor: null,
  customSymptoms: [],
  reminders: {
    upcoming: { enabled: false, daysBefore: 2, text: 'Time to review your notes' },
    daily: { enabled: false, hour: 20, minute: 0, text: 'Anything to jot down today?' },
  },
};

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
