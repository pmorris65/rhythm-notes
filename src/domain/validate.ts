import { isISODate } from './dates';
import { clamp, DEFAULT_SETTINGS, type Settings } from './settings';
import { FLOWS, MOODS, isEmptyLog, type DayLog, type Flow, type Mood } from './types';

const MAX_NOTE = 5000;
const MAX_SYMPTOMS = 50;
const MAX_SYMPTOM_LENGTH = 40;

/** Turns untrusted data (e.g. from a backup file) into a valid log, or null. */
export function sanitizeLog(raw: unknown): DayLog | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isISODate(r.date)) return null;
  const flow = FLOWS.includes(r.flow as Flow) ? (r.flow as Flow) : null;
  const mood = MOODS.includes(r.mood as Mood) ? (r.mood as Mood) : null;
  const symptoms = Array.isArray(r.symptoms)
    ? [...new Set(r.symptoms.filter((s): s is string => typeof s === 'string' && s.trim().length > 0))]
        .map((s) => s.trim().slice(0, MAX_SYMPTOM_LENGTH))
        .slice(0, MAX_SYMPTOMS)
    : [];
  const log: DayLog = {
    date: r.date,
    period: r.period === true,
    flow,
    symptoms,
    mood,
    note: typeof r.note === 'string' ? r.note.slice(0, MAX_NOTE) : '',
  };
  return isEmptyLog(log) ? null : log;
}

export function sanitizeLogs(raw: unknown): DayLog[] {
  if (!Array.isArray(raw)) return [];
  const byDate = new Map<string, DayLog>();
  for (const item of raw) {
    const log = sanitizeLog(item);
    if (log) byDate.set(log.date, log);
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(Math.round(value), min, max) : fallback;
}

function text(value: unknown, fallback: string, maxLength = 120): string {
  return typeof value === 'string' && value.trim() ? value.slice(0, maxLength) : fallback;
}

/** Turns untrusted settings (saved data or a backup file) into valid settings. */
export function sanitizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const up = (r.reminders?.upcoming ?? {}) as Record<string, unknown>;
  const daily = (r.reminders?.daily ?? {}) as Record<string, unknown>;
  return {
    onboarded: bool(r.onboarded, d.onboarded),
    vocabulary: r.vocabulary === 'explicit' ? 'explicit' : 'neutral',
    defaultCycleLength: int(r.defaultCycleLength, d.defaultCycleLength, 15, 60),
    defaultPeriodLength: int(r.defaultPeriodLength, d.defaultPeriodLength, 1, 14),
    showFertileWindow: bool(r.showFertileWindow, d.showFertileWindow),
    lockEnabled: bool(r.lockEnabled, d.lockEnabled),
    biometricsEnabled: bool(r.biometricsEnabled, d.biometricsEnabled),
    disguiseEnabled: bool(r.disguiseEnabled, d.disguiseEnabled),
    wipeAfterFailedAttempts: bool(r.wipeAfterFailedAttempts, d.wipeAfterFailedAttempts),
    periodEndedFor: isISODate(r.periodEndedFor) ? r.periodEndedFor : null,
    customSymptoms: Array.isArray(r.customSymptoms)
      ? [...new Set(r.customSymptoms.filter((s: unknown): s is string => typeof s === 'string' && !!s.trim()))]
          .map((s) => s.trim().slice(0, MAX_SYMPTOM_LENGTH))
          .slice(0, MAX_SYMPTOMS)
      : [],
    reminders: {
      upcoming: {
        enabled: bool(up.enabled, d.reminders.upcoming.enabled),
        daysBefore: int(up.daysBefore, d.reminders.upcoming.daysBefore, 0, 7),
        text: text(up.text, d.reminders.upcoming.text),
      },
      daily: {
        enabled: bool(daily.enabled, d.reminders.daily.enabled),
        hour: int(daily.hour, d.reminders.daily.hour, 0, 23),
        minute: int(daily.minute, d.reminders.daily.minute, 0, 59),
        text: text(daily.text, d.reminders.daily.text),
      },
    },
  };
}
