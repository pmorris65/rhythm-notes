import { DEFAULT_SETTINGS } from '../settings';
import { sanitizeLog, sanitizeLogs, sanitizeSettings } from '../validate';

describe('sanitizeLog', () => {
  it('keeps valid fields and drops invalid ones', () => {
    expect(
      sanitizeLog({
        date: '2026-01-01',
        period: true,
        flow: 'torrential',
        mood: 'good',
        symptoms: ['cramps', 'cramps', 42, '  custom  '],
        note: 7,
        extra: 'ignored',
      }),
    ).toEqual({
      date: '2026-01-01',
      period: true,
      flow: null,
      mood: 'good',
      symptoms: ['cramps', 'custom'],
      note: '',
    });
  });

  it('rejects bad dates and empty logs', () => {
    expect(sanitizeLog({ date: '2026-13-01', period: true })).toBeNull();
    expect(sanitizeLog({ date: '2026-01-01' })).toBeNull();
    expect(sanitizeLog(null)).toBeNull();
  });

  it('dedupes by date and sorts', () => {
    const logs = sanitizeLogs([
      { date: '2026-01-02', period: true },
      { date: '2026-01-01', period: true },
      { date: '2026-01-02', note: 'later wins' },
    ]);
    expect(logs.map((l) => l.date)).toEqual(['2026-01-01', '2026-01-02']);
    expect(logs[1].note).toBe('later wins');
    expect(sanitizeLogs('nope')).toEqual([]);
  });
});

describe('sanitizeSettings', () => {
  it('falls back to defaults for missing or invalid values', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    const s = sanitizeSettings({
      vocabulary: 'loud',
      defaultCycleLength: 400,
      showFertileWindow: 'yes',
      reminders: { daily: { hour: 25, text: '' } },
    });
    expect(s.vocabulary).toBe('neutral');
    expect(s.defaultCycleLength).toBe(60);
    expect(s.showFertileWindow).toBe(false);
    expect(s.reminders.daily.hour).toBe(23);
    expect(s.reminders.daily.text).toBe(DEFAULT_SETTINGS.reminders.daily.text);
    expect(s.reminders.upcoming).toEqual(DEFAULT_SETTINGS.reminders.upcoming);
  });
});
